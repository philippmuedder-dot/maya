import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources";

export const maxDuration = 120;

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

function makeRemainingPrompt(alreadyExtracted: string[]): string {
  return `Some markers from this bloodwork document have already been extracted.

Already extracted — do NOT repeat these:
${alreadyExtracted.join(", ")}

Extract all REMAINING lab markers NOT in the list above.

Return ONLY valid JSON (no markdown, no explanation):
{
  "markers": [
    {
      "name": "string",
      "value": "string",
      "unit": "string",
      "reference_range": "string",
      "reference_min": number or null,
      "reference_max": number or null,
      "status": "optimal" | "suboptimal" | "low" | "high"
    }
  ]
}

Rules:
- reference_min/reference_max: extract numeric bounds from the printed reference range
- status: "optimal" if within range, "low" if below, "high" if above`;
}

interface ExtractedMarker {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  reference_min: number | null;
  reference_max: number | null;
  status: string;
}

/** Walk the raw string character-by-character to find all complete JSON objects
 *  at brace-depth 1 within the markers array, handling quoted strings safely.
 *  Returns the salvaged markers array as a JSON string. */
function salvageMarkersFromRaw(raw: string): ExtractedMarker[] {
  const arrayMatch = raw.match(/"markers"\s*:\s*\[/);
  if (!arrayMatch || arrayMatch.index == null) return [];

  const content = raw.slice(arrayMatch.index + arrayMatch[0].length);
  let depth = 0;
  let objStart = -1;
  const completeObjects: string[] = [];
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    // Skip over JSON strings to avoid counting braces inside them
    if (ch === '"') {
      i++;
      while (i < content.length) {
        if (content[i] === "\\") { i += 2; continue; }
        if (content[i] === '"') break;
        i++;
      }
      i++;
      continue;
    }

    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        completeObjects.push(content.slice(objStart, i + 1));
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      // Reached end of array
      break;
    }
    i++;
  }

  if (completeObjects.length === 0) return [];

  try {
    return JSON.parse(`[${completeObjects.join(",")}]`) as ExtractedMarker[];
  } catch {
    return [];
  }
}

function normalizeMarkers(raw: ExtractedMarker[]): ExtractedMarker[] {
  return raw.map((m) => ({
    name: m.name ?? "",
    value: m.value ?? "",
    unit: m.unit ?? "",
    reference_range: m.reference_range ?? "",
    reference_min: typeof m.reference_min === "number" ? m.reference_min : null,
    reference_max: typeof m.reference_max === "number" ? m.reference_max : null,
    status:
      m.status === "optimal" || m.status === "normal" ? "normal"
      : m.status === "low" ? "low"
      : m.status === "high" ? "high"
      : "normal",
  }));
}

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
  }

  const fileBlock: ContentBlockParam = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } };

  let allMarkers: ExtractedMarker[] = [];
  let test_date: string | null = null;
  let lab_name: string | null = null;

  // ── First pass ────────────────────────────────────────────────────────────
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: [fileBlock, { type: "text", text: EXTRACT_PROMPT }] }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let firstPassMarkers: ExtractedMarker[] = [];
    let truncated = message.stop_reason === "max_tokens";

    try {
      const extracted = JSON.parse(jsonStr);
      firstPassMarkers = extracted.markers ?? [];
      test_date = extracted.test_date?.trim() || null;
      lab_name = extracted.lab_name?.trim() || null;
      console.log(`[bloodwork/upload] first pass: ${firstPassMarkers.length} markers (complete JSON)`);
    } catch {
      // JSON was cut off — salvage whatever complete objects we can
      firstPassMarkers = salvageMarkersFromRaw(raw);
      truncated = true;
      console.warn(`[bloodwork/upload] first pass: JSON truncated — salvaged ${firstPassMarkers.length} markers`);
    }

    allMarkers = firstPassMarkers;

    // ── Second pass (if truncated) ──────────────────────────────────────────
    if (truncated && firstPassMarkers.length > 0) {
      const alreadyNames = firstPassMarkers.map((m) => m.name).filter(Boolean);
      console.log(`[bloodwork/upload] second pass: requesting remaining markers (already have ${alreadyNames.length})`);

      try {
        const message2 = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [{
            role: "user",
            content: [fileBlock, { type: "text", text: makeRemainingPrompt(alreadyNames) }],
          }],
        });

        const raw2 = message2.content[0].type === "text" ? message2.content[0].text : "";
        const jsonStr2 = raw2.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

        let secondPassMarkers: ExtractedMarker[] = [];
        try {
          const extracted2 = JSON.parse(jsonStr2);
          secondPassMarkers = extracted2.markers ?? [];
        } catch {
          secondPassMarkers = salvageMarkersFromRaw(raw2);
          console.warn(`[bloodwork/upload] second pass: also truncated — salvaged ${secondPassMarkers.length} additional markers`);
        }

        // Deduplicate by name (first pass wins on conflict)
        const seen = new Set(allMarkers.map((m) => m.name.toLowerCase().trim()));
        const newMarkers = secondPassMarkers.filter(
          (m) => m.name && !seen.has(m.name.toLowerCase().trim())
        );
        allMarkers = [...allMarkers, ...newMarkers];
        console.log(`[bloodwork/upload] second pass added ${newMarkers.length} markers — total: ${allMarkers.length}`);
      } catch (err) {
        console.error("[bloodwork/upload] second pass error:", err);
        // Non-fatal — continue with first-pass markers
      }
    }
  } catch (err) {
    console.error("[bloodwork/upload] Claude extraction error:", err);
    return NextResponse.json({ error: "Failed to extract markers from file." }, { status: 500 });
  }

  const normalizedMarkers = normalizeMarkers(allMarkers);

  // Upsert extracted reference ranges (fire-and-forget)
  const rangesToUpsert = normalizedMarkers
    .filter((m) => m.reference_min != null || m.reference_max != null)
    .map((m) => ({
      user_id: session.user?.email ?? "",
      marker_name: m.name.toLowerCase().trim(),
      optimal_min: m.reference_min ?? null,
      optimal_max: m.reference_max ?? null,
      unit: m.unit || null,
      source: lab_name || "Lab Upload",
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
    markers: normalizedMarkers,
    test_date,
    lab_name,
    file_path: filePath,
  });
}
