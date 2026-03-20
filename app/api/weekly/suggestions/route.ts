import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

// POST — get AI suggestions for handling stressors
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stress_level, stressors } = await req.json();

  if (!stressors || !Array.isArray(stressors) || stressors.length === 0) {
    return NextResponse.json(
      { error: "At least one stressor is required" },
      { status: 400 }
    );
  }

  const prompt = `Philipp is a 3/5 Generator (Human Design) with Sacral authority. His strategy is Responding — never initiating.
Last week his overall stress level was ${stress_level}/10.
His top stressors were:
${stressors.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}

For EACH stressor, give exactly one short, practical suggestion for how to handle it better next week.
Frame suggestions as things to RESPOND to (not initiate). Use his Generator design:
- If it's a workload issue → suggest protecting energy, not pushing harder
- If it's relational → suggest checking if the emotion is actually his (undefined Solar Plexus)
- If it's decision-related → suggest gut-check, not analysis
- Setbacks are experiments (3-line profile)

Return JSON array:
[{"stressor": "exact stressor text", "suggestion": "one practical suggestion"}]
Return ONLY valid JSON. No markdown, no explanation.`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const suggestions = JSON.parse(text);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[weekly/suggestions] error:", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
