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

  // Fetch last 30 days of whoop data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const [{ data: whoopData }, { data: supplements }] = await Promise.all([
    supabase
      .from("whoop_daily_data")
      .select("date, recovery_score, hrv, sleep_hours, sleep_quality, strain")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: true }),
    supabase
      .from("supplements")
      .select("name, dose, unit, timing, active")
      .eq("user_id", session.user.email),
  ]);

  // Need at least 14 days of whoop data
  if (!whoopData || whoopData.length < 14) {
    return NextResponse.json({
      insights: [],
      insufficient_data: true,
      days_collected: whoopData?.length ?? 0,
      days_needed: 14,
    });
  }

  if (!supplements || supplements.length === 0) {
    return NextResponse.json({ insights: [], no_supplements: true });
  }

  // Call Claude for correlation analysis
  const prompt = `Given this supplement stack and daily recovery data, analyze correlations.

Supplements: ${JSON.stringify(supplements)}

Daily recovery data (date, recovery_score 0-100, hrv ms, sleep_hours, sleep_quality %, strain 0-21):
${JSON.stringify(whoopData)}

What correlations do you notice between supplement timing/usage and recovery metrics?
Return JSON only:
{"insights": [{"supplement": "name", "correlation": "description of correlation found", "confidence": "low"|"medium"|"high", "suggestion": "continue"|"stop"|"adjust"|"restart", "reason": "why this suggestion"}]}

Be specific and data-driven. Only include insights where you see actual patterns. If no clear correlations, return empty insights array.
Respond with ONLY valid JSON. No markdown.`;

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
      days_collected: whoopData.length,
    });
  } catch (err) {
    console.error("[insights/supplements] Claude API error:", err);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}
