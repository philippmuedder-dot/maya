import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MEAL_ANALYSIS_PROMPT = `Analyze this meal photo and return ONLY valid JSON with no markdown, no preamble, no explanation.

Schema:
{
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "foods_identified": string[],
  "tags": string[],
  "rough_macros": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number
  },
  "ai_summary": string
}

Rules:
- meal_type: infer from visual cues and typical meal composition
- foods_identified: list every distinct food item visible
- tags: only use tags from this exact list: ["inflammatory","high-glycemic","high-protein","processed","whole-food","high-fat","high-fiber","alcohol"]
- rough_macros: reasonable estimates based on typical portion sizes — use whole numbers
- ai_summary: 1–2 sentence friendly description of the meal and its nutritional character`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "imageBase64 and mimeType are required" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            { type: "text", text: MEAL_ANALYSIS_PROMPT },
          ],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const analysis = JSON.parse(jsonStr);

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("[meals/analyze] error:", err);
    return NextResponse.json({ error: "Failed to analyze meal photo." }, { status: 500 });
  }
}
