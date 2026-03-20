import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const PARSE_PROMPT = `Extract all supplements from this input.
Return ONLY valid JSON array (no markdown, no explanation):
[
  {"name": "string", "dose": number_or_null, "unit": "mg"|"g"|"mcg"|"IU"|"ml"|"other"|null, "timing": "morning"|"afternoon"|"evening"|"night"|null, "purpose": "string or null"}
]

Rules:
- name: the supplement name, clean and properly capitalized
- dose: numeric value only (e.g. 400 not "400mg")
- unit: extract from dose string (e.g. "mg", "mcg", "IU", "g", "ml") or null if unknown
- timing: infer from context if mentioned (morning, afternoon, evening, night) — null if not specified
- purpose: brief purpose/benefit if mentioned, otherwise null
- Include every supplement mentioned, even if dose is unknown`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") ?? "";

  let parsedSupplements: unknown[] = [];

  try {
    if (contentType.includes("application/json")) {
      // Text input
      const { text } = await req.json();
      if (!text?.trim()) {
        return NextResponse.json({ error: "No text provided." }, { status: 400 });
      }

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `${text}\n\n${PARSE_PROMPT}`,
          },
        ],
      });

      const raw = message.content[0].type === "text" ? message.content[0].text : "";
      const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      parsedSupplements = JSON.parse(jsonStr);
    } else {
      // Image/file input
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = file.type;

      if (!mimeType.startsWith("image/")) {
        return NextResponse.json({ error: "Only image files supported for upload parsing." }, { status: 400 });
      }

      const fileBlock: ContentBlockParam = {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: base64,
        },
      };

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [fileBlock, { type: "text", text: PARSE_PROMPT }],
          },
        ],
      });

      const raw = message.content[0].type === "text" ? message.content[0].text : "";
      const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      parsedSupplements = JSON.parse(jsonStr);
    }
  } catch (err) {
    console.error("[supplements/parse] error:", err);
    return NextResponse.json({ error: "Failed to parse supplements." }, { status: 500 });
  }

  return NextResponse.json({ supplements: parsedSupplements });
}
