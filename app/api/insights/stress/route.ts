import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { getUserMemoryContext } from "@/lib/userMemory";
import fs from "fs";
import path from "path";

const philippContext = fs.readFileSync(
  path.join(process.cwd(), "prompts/philipp.md"),
  "utf-8"
);
const memoryContext = fs.readFileSync(
  path.join(process.cwd(), "prompts/memory.md"),
  "utf-8"
);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const [{ data: checkins }, { data: whoopData }] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("date, stress_level, top_stressor, mood, creative_energy, financial_stress, financial_stressor")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: true }),
    supabase
      .from("whoop_daily_data")
      .select("date, recovery_score, hrv, sleep_hours, sleep_quality")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: true }),
  ]);

  // Need at least 14 check-ins
  if (!checkins || checkins.length < 14) {
    return NextResponse.json({
      patterns: [],
      peak_stress_days: [],
      stress_recovery_correlation: null,
      insufficient_data: true,
      checkins_count: checkins?.length ?? 0,
      checkins_needed: 14,
    });
  }

  // Compute financial stress correlation if enough data
  const fsCheckins = (checkins ?? []).filter(
    (c: { financial_stress: number | null }) => c.financial_stress != null
  );
  let financialCorrelationContext = "";
  if (fsCheckins.length >= 14 && whoopData && whoopData.length >= 7) {
    // Find days with high financial stress (>=7) and next-day HRV
    const highFsDates = fsCheckins
      .filter((c: { financial_stress: number }) => c.financial_stress >= 7)
      .map((c: { date: string }) => c.date);
    const normalFsDates = fsCheckins
      .filter((c: { financial_stress: number }) => c.financial_stress < 7)
      .map((c: { date: string }) => c.date);

    const getNextDayHrv = (dateStr: string) => {
      const next = new Date(dateStr + "T12:00:00");
      next.setDate(next.getDate() + 1);
      const nextStr = next.toISOString().split("T")[0];
      return (whoopData as { date: string; hrv: number | null }[]).find((w) => w.date === nextStr)?.hrv ?? null;
    };

    const highFsHrvs = highFsDates.map(getNextDayHrv).filter((v: number | null) => v != null) as number[];
    const normalFsHrvs = normalFsDates.map(getNextDayHrv).filter((v: number | null) => v != null) as number[];

    if (highFsHrvs.length >= 3 && normalFsHrvs.length >= 3) {
      const avgHighHrv = highFsHrvs.reduce((a: number, b: number) => a + b, 0) / highFsHrvs.length;
      const avgNormalHrv = normalFsHrvs.reduce((a: number, b: number) => a + b, 0) / normalFsHrvs.length;
      const diff = avgNormalHrv - avgHighHrv;
      financialCorrelationContext = `\nFinancial stress correlation (pre-computed): On high financial stress days (≥7/10), next-day HRV averages ${avgHighHrv.toFixed(0)}ms vs ${avgNormalHrv.toFixed(0)}ms on normal days — a ${diff > 0 ? diff.toFixed(0) + "ms reduction" : "no significant difference"} when financial stress is elevated. Include this specific finding in your analysis.`;
    }
  }

  const prompt = `Analyze stress patterns and their impact on recovery for this person.

Daily check-ins (date, stress_level 1-10, top_stressor, mood, creative_energy, financial_stress 1-10, financial_stressor):
${JSON.stringify(checkins)}

Daily Whoop recovery data (date, recovery_score 0-100, hrv ms, sleep_hours, sleep_quality %):
${JSON.stringify(whoopData ?? [])}
${financialCorrelationContext}

Analyze:
1. Recurring stressors and their frequency (include financial stressors separately)
2. Which days of the week have highest stress
3. How stress impacts next-day recovery/HRV (include financial stress specifically)
4. Financial stress vs general stress comparison if data available
5. Coping suggestions based on patterns

Return JSON only:
{"patterns": [{"trigger": "stressor name", "frequency": number, "impact_on_recovery": "description with numbers", "suggestion": "actionable coping strategy"}], "peak_stress_days": ["Monday", "Tuesday"], "stress_recovery_correlation": "summary of how stress impacts recovery with specific numbers", "financial_stress_insight": "specific finding about financial stress impact on HRV/recovery, or null if insufficient data"}

Be specific with data. Only include real patterns. Respond with ONLY valid JSON. No markdown.`;

  try {
    const dbMemoryContext = await getUserMemoryContext(session.user.email);
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are MAYA, a personal health intelligence system."
        + "\n\n---\n## Who you are talking to:\n" + philippContext
        + "\n\n## Long-term memory:\n" + memoryContext
        + dbMemoryContext,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const result = JSON.parse(text);

    return NextResponse.json({
      ...result,
      insufficient_data: false,
      checkins_count: checkins.length,
    });
  } catch (err) {
    console.error("[insights/stress] Claude API error:", err);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}
