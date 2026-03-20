import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const EXTRACT_PROMPT = `Extract all lab markers from this bloodwork document.
Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "markers": [
    {"name": "string", "value": "string", "unit": "string", "reference_range": "string", "status": "normal"|"low"|"high"}
  ],
  "test_date": "YYYY-MM-DD or null if not found in the document",
  "lab_name": "string or null if not found"
}

Important: test_date must be the actual date printed on the lab report.
If no date is visible in the document, return null — never guess or use today's date.`;

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

  // Call Claude to extract markers
  let parsed: { markers: unknown[]; test_date: string | null; lab_name: string | null } = {
    markers: [],
    test_date: null,
    lab_name: null,
  };

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

    parsed = {
      markers: extracted.markers ?? [],
      // Treat empty string as null — never fall back to today
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

  // Return extracted data + filePath — the client saves to DB after user confirms date
  return NextResponse.json({
    markers: parsed.markers,
    test_date: parsed.test_date,   // null if not found in document
    lab_name: parsed.lab_name,
    file_path: filePath,
  });
}
