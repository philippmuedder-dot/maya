import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const EXTRACT_PROMPT = `Extract all lab markers AND their reference ranges from this bloodwork document.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "markers": [
    {
      "name": "string",
      "value": "string",
      "unit": "string",
      "reference_range": "string (e.g. '30-100')",
      "reference_min": number or null,
      "reference_max": number or null,
      "status": "optimal" | "suboptimal" | "low" | "high"
    }
  ],
  "test_date": "YYYY-MM-DD or null if not found in the document",
  "lab_name": "string or null if not found"
}

Rules:
- test_date must be the actual date printed on the lab report. If not visible, return null — never guess.
- reference_min and reference_max: extract the numeric lower and upper bounds from the printed reference range. Return null for a bound that doesn't exist (e.g. for ">60" reference_min=60, reference_max=null).
- status: use "optimal" if value is within the printed reference range, "low" if below, "high" if above. Use "suboptimal" only if the document explicitly marks it as borderline or sub-optimal.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = buffer.toString("base64");
  const mimeType = file.type as string;

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  if (!isImage && !isPdf) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF or image." },
      { status: 400 }
    );
  }

  // Upload to Supabase Storage
  const supabase = createServiceClient();
  const filePath = `${session.user.email}/${Date.now()}-${file.name}`;
  const { error: storageError } = await supabase.storage
    .from("bloodwork")
    .upload(filePath, buffer, { contentType: mimeType, upsert: false });

  if (storageError) {
    console.error("[bloodwork/upload] storage error:", storageError);
    // Non-fatal — continue with extraction even if storage fails
  }

  // Call Claude to extract markers + reference ranges
  interface ExtractedMarker {
    name: string;
    value: string;
    unit: string;
    reference_range: string;
    reference_min: number | null;
    reference_max: number | null;
    status: string;
  }

  let parsed: {
    markers: ExtractedMarker[];
    test_date: string | null;
    lab_name: string | null;
  } = { markers: [], test_date: null, lab_name: null };

  try {
    const fileBlock: ContentBlockParam = isPdf
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: base64,
          },
        };

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: EXTRACT_PROMPT }],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const extracted = JSON.parse(jsonStr);

    // Normalize markers: map "optimal" status → "normal" for DB compat
    const markers: ExtractedMarker[] = (extracted.markers ?? []).map((m: ExtractedMarker) => ({
      name: m.name ?? "",
      value: m.value ?? "",
      unit: m.unit ?? "",
      reference_range: m.reference_range ?? "",
      reference_min: typeof m.reference_min === "number" ? m.reference_min : null,
      reference_max: typeof m.reference_max === "number" ? m.reference_max : null,
      // Store "normal" in DB — sub-optimal is recomputed client-side against stored/FH ranges
      status: m.status === "optimal" || m.status === "normal" ? "normal"
        : m.status === "low" ? "low"
        : m.status === "high" ? "high"
        : "normal",
    }));

    parsed = {
      markers,
      test_date: extracted.test_date?.trim() || null,
      lab_name: extracted.lab_name?.trim() || null,
    };
  } catch (err) {
    console.error("[bloodwork/upload] Claude extraction error:", err);
    return NextResponse.json(
      { error: "Failed to extract markers from file." },
      { status: 500 }
    );
  }

  // Upsert extracted reference ranges to reference_ranges table (fire-and-forget)
  const rangesToUpsert = parsed.markers
    .filter((m) => m.reference_min != null || m.reference_max != null)
    .map((m) => ({
      user_id: session.user?.email ?? "",
      marker_name: m.name.toLowerCase().trim(),
      optimal_min: m.reference_min ?? null,
      optimal_max: m.reference_max ?? null,
      unit: m.unit || null,
      source: parsed.lab_name || "Lab Upload",
      created_at: new Date().toISOString(),
    }));

  if (rangesToUpsert.length > 0) {
    supabase
      .from("reference_ranges")
      .upsert(rangesToUpsert, { onConflict: "user_id,marker_name" })
      .then(({ error }) => {
        if (error) console.error("[bloodwork/upload] reference_ranges upsert:", error);
        else console.log(`[bloodwork/upload] upserted ${rangesToUpsert.length} reference ranges`);
      });
  }

  return NextResponse.json({
    markers: parsed.markers,
    test_date: parsed.test_date,
    lab_name: parsed.lab_name,
    file_path: filePath,
  });
}
