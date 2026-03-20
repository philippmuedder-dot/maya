import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: decisions } = await supabase
    .from("decisions")
    .select("*")
    .eq("user_id", session.user.email)
    .order("date", { ascending: true });

  // Need at least 8 decisions with outcomes
  const withOutcomes = (decisions ?? []).filter(
    (d: { outcome_satisfaction: number | null }) => d.outcome_satisfaction !== null
  );

  if (withOutcomes.length < 8) {
    return NextResponse.json({
      insufficient_data: true,
      decisions_with_outcomes: withOutcomes.length,
      decisions_needed: 8,
      total_decisions: decisions?.length ?? 0,
    });
  }

  // Calculate stats locally first
  const byType: Record<string, { total: number; satisfactionSum: number; count: number }> = {};
  for (const d of withOutcomes) {
    const type = d.decision_type || "unknown";
    if (!byType[type]) byType[type] = { total: 0, satisfactionSum: 0, count: 0 };
    byType[type].total++;
    byType[type].satisfactionSum += d.outcome_satisfaction;
    byType[type].count++;
  }

  // Call Claude for deeper analysis
  const prompt = `Analyze these decisions and their outcomes for a person with Human Design Sacral authority (gut-led decisions are their natural decision-making style).

Decisions with outcomes:
${JSON.stringify(withOutcomes.map((d: { description: string; decision_type: string; confidence: number | null; expected_outcome: string | null; actual_outcome: string | null; outcome_satisfaction: number | null; date: string }) => ({
    description: d.description,
    decision_type: d.decision_type,
    confidence: d.confidence,
    expected_outcome: d.expected_outcome,
    actual_outcome: d.actual_outcome,
    outcome_satisfaction: d.outcome_satisfaction,
    date: d.date,
  })))}

Calculate satisfaction rates and analyze patterns. This person's Human Design says they should trust their gut (Sacral) over rational analysis. Fear-led decisions are almost always misaligned.

Return JSON only:
{"gut_satisfaction_rate": number (0-100), "rational_satisfaction_rate": number (0-100), "fear_satisfaction_rate": number (0-100), "mixed_satisfaction_rate": number (0-100), "confidence_correlation": "description of how confidence relates to actual satisfaction", "insight": "key insight about their decision patterns, referencing Sacral authority", "recommendation": "actionable advice for improving decision quality"}

If a type has no data, use null for its rate. Be specific with numbers. Respond with ONLY valid JSON. No markdown.`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const result = JSON.parse(text);

    return NextResponse.json({
      ...result,
      insufficient_data: false,
      decisions_with_outcomes: withOutcomes.length,
      total_decisions: decisions?.length ?? 0,
    });
  } catch (err) {
    console.error("[insights/decisions] Claude API error:", err);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}
