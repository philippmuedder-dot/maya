import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { fetchCalendarEvents, getTodayEvents, getBerlinDateStr } from "@/lib/googleCalendar";
import { getValidWhoopToken, fetchWhoopData } from "@/lib/whoop";
import Anthropic from "@anthropic-ai/sdk";
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

const BRIEFING_SYSTEM_PROMPT = `You are MAYA, Philipp's personal operating system coach.
You know his Human Design: 3/5 Generator, Sacral authority,
Responding strategy, Right Angle Cross of Maya 3 (32/42).
Not-self: Frustration. Alignment: Satisfaction.
Guiding principle: Longevity first.
Rules:
- Never tell him to initiate — frame as responding
- Procrastination = misalignment, not laziness
- Frustration = warning signal, investigate not override
- Setbacks = 3-line experiments
- Goals = directional not hyper-specific
- Deep work needs cave-like environment
- Decisions = gut yes/no not pros/cons
- Meet him where he is: Survival/Building/Thriving mode

You are also aware that Philipp has been through the end of a 13-year marriage over
the past 9–12 months. This has created emotional heaviness and over-rationalization.
Your role includes supporting his re-emergence — noticing when his creative/building
energy is coming back and amplifying it, flagging negative rational loops, and
redirecting to gut-led (Sacral) responses. Never toxic positivity. Never pushing.
Always meeting him where he is.`;

// GET — fetch or generate today's briefing
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = getBerlinDateStr();

  // Check for cached briefing
  const { data: cached } = await supabase
    .from("daily_briefings")
    .select("*")
    .eq("user_id", session.user.email)
    .eq("date", today)
    .single();

  if (cached) {
    return NextResponse.json({ briefing: cached.briefing, cached: true });
  }

  // Need check-in first
  const { data: checkin } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", session.user.email)
    .eq("date", today)
    .single();

  if (!checkin) {
    return NextResponse.json({ needsCheckin: true });
  }

  // Gather all context data in parallel
  const [calendarData, whoopData, supplementsData] = await Promise.all([
    // Calendar
    session.accessToken
      ? fetchCalendarEvents(session.accessToken).catch(() => null)
      : Promise.resolve(null),
    // Whoop
    getValidWhoopToken(session.user.email)
      .then((token) => (token ? fetchWhoopData(token) : null))
      .catch(() => null),
    // Supplements
    supabase
      .from("supplements")
      .select("name, dose, unit, timing")
      .eq("user_id", session.user.email)
      .eq("active", true)
      .then(({ data }) => data ?? []),
  ]);

  // Gather learning engine context (simple queries, non-blocking)
  let insightContext = "";
  try {
    const [{ data: whoopHistory }, { data: recentCheckins }, { data: decisionsWithOutcomes }] = await Promise.all([
      supabase
        .from("whoop_daily_data")
        .select("date, recovery_score, hrv")
        .eq("user_id", session.user.email)
        .order("date", { ascending: false })
        .limit(14),
      supabase
        .from("daily_checkins")
        .select("date, stress_level, top_stressor")
        .eq("user_id", session.user.email)
        .order("date", { ascending: false })
        .limit(7),
      supabase
        .from("decisions")
        .select("decision_type, outcome_satisfaction")
        .eq("user_id", session.user.email)
        .not("outcome_satisfaction", "is", null),
    ]);

    const contextParts: string[] = [];

    // Whoop trend
    if (whoopHistory && whoopHistory.length >= 7) {
      const avgRecovery = whoopHistory.reduce((sum: number, d: { recovery_score: number | null }) => sum + (d.recovery_score ?? 0), 0) / whoopHistory.length;
      const avgHrv = whoopHistory.reduce((sum: number, d: { hrv: number | null }) => sum + (d.hrv ?? 0), 0) / whoopHistory.length;
      contextParts.push(`14-day avg recovery: ${avgRecovery.toFixed(0)}%, avg HRV: ${avgHrv.toFixed(0)}ms`);
    }

    // Stress trend
    if (recentCheckins && recentCheckins.length >= 3) {
      const avgStress = recentCheckins.reduce((sum: number, d: { stress_level: number | null }) => sum + (d.stress_level ?? 0), 0) / recentCheckins.length;
      const stressors = recentCheckins
        .filter((d: { top_stressor: string | null }) => d.top_stressor)
        .map((d: { top_stressor: string | null }) => d.top_stressor)
        .slice(0, 3);
      contextParts.push(`Recent avg stress: ${avgStress.toFixed(1)}/10. Common stressors: ${stressors.join(", ") || "none"}`);
    }

    // Decision patterns
    if (decisionsWithOutcomes && decisionsWithOutcomes.length >= 5) {
      const gutDecisions = decisionsWithOutcomes.filter((d: { decision_type: string }) => d.decision_type === "gut");
      const fearDecisions = decisionsWithOutcomes.filter((d: { decision_type: string }) => d.decision_type === "fear");
      if (gutDecisions.length > 0) {
        const gutAvg = gutDecisions.reduce((sum: number, d: { outcome_satisfaction: number }) => sum + d.outcome_satisfaction, 0) / gutDecisions.length;
        contextParts.push(`Gut-led decision satisfaction: ${gutAvg.toFixed(1)}/10 (${gutDecisions.length} decisions)`);
      }
      if (fearDecisions.length > 0) {
        const fearAvg = fearDecisions.reduce((sum: number, d: { outcome_satisfaction: number }) => sum + d.outcome_satisfaction, 0) / fearDecisions.length;
        contextParts.push(`Fear-led decision satisfaction: ${fearAvg.toFixed(1)}/10 (${fearDecisions.length} decisions)`);
      }
    }

    if (contextParts.length > 0) {
      insightContext = `\nLearning engine insights:\n${contextParts.join("\n")}`;
    }
  } catch (err) {
    console.error("[briefing] insights gathering error (non-critical):", err);
  }

  // Build context
  const todayEvents = calendarData ? getTodayEvents(calendarData.events) : [];
  const eventCount = todayEvents.length;
  const eventTitles = todayEvents.map((e) => e.summary).join(", ") || "none";

  const recoveryScore = whoopData?.recovery?.score?.recovery_score ?? "unknown";
  const hrv = whoopData?.recovery?.score?.hrv_rmssd_milli ?? "unknown";

  let sleepHours = "unknown";
  if (whoopData?.sleep?.start && whoopData?.sleep?.end) {
    const ms =
      new Date(whoopData.sleep.end).getTime() -
      new Date(whoopData.sleep.start).getTime();
    sleepHours = (ms / 3_600_000).toFixed(1);
  }

  const supplementList =
    supplementsData
      .map((s: { name: string; dose: number | null; unit: string | null }) =>
        `${s.name}${s.dose ? ` ${s.dose}${s.unit || ""}` : ""}`
      )
      .join(", ") || "none";

  const userPrompt = `Today is ${today}.
Recovery: ${recoveryScore}%, HRV: ${hrv}ms, Sleep: ${sleepHours}hrs
Calendar load today: ${eventCount} events: ${eventTitles}
Stress yesterday: ${checkin.stress_level}/10. Top stressor: ${checkin.top_stressor || "none"}
Mood: ${checkin.mood}. Creative energy: ${checkin.creative_energy}
Active supplements: ${supplementList}${insightContext}
Generate morning briefing with exactly these sections as JSON:
{
  "day_type": "Focus"|"Maintenance"|"Recovery",
  "training": "Hard"|"Moderate"|"Recovery only",
  "avoid_heavy_decisions": boolean,
  "decision_reason": "string",
  "top_priorities": ["string", "string", "string"],
  "supplement_focus": "string",
  "what_to_pause": "string",
  "phase": "Survival"|"Building"|"Thriving",
  "phase_message": "string",
  "sacral_prompts": ["string", "string", "string"]
}
Rules for sacral_prompts: exactly 3 short statements that can be answered yes or no with the gut.
Format each as a present-tense action phrase, e.g.:
- "Working on [specific task] today"
- "Connecting with [person or thing]"
- "Starting [specific thing] this morning"
NOT open questions like "What should I..." or "Which task..." or "How do I..."
NOT full sentences with "Does" or "Is".
The UI displays them as: "Does [your statement] feel like a yes?"
Respond with ONLY valid JSON. No markdown, no explanation.`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: BRIEFING_SYSTEM_PROMPT
        + "\n\n---\n## Who you are talking to:\n" + philippContext
        + "\n\n## Long-term memory:\n" + memoryContext,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const briefing = JSON.parse(text);

    // Cache in database
    await supabase.from("daily_briefings").upsert(
      {
        user_id: session.user.email,
        date: today,
        briefing,
      },
      { onConflict: "user_id,date" }
    );

    return NextResponse.json({ briefing, cached: false });
  } catch (err) {
    console.error("[briefing] Claude API error:", err);
    return NextResponse.json(
      { error: "Failed to generate briefing" },
      { status: 500 }
    );
  }
}
