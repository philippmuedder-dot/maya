import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { getUserMemoryContext } from "@/lib/userMemory";
import { getGeneticContext } from "@/lib/genetics";
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

  // Fetch workouts from Supabase (workout_logs table)
  // and whoop_daily_data for recovery correlation
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const cutoff = sixtyDaysAgo.toISOString().split("T")[0];

  const [{ data: whoopData }, { data: workouts }] = await Promise.all([
    supabase
      .from("whoop_daily_data")
      .select("date, recovery_score, hrv, sleep_hours, sleep_quality, strain")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: true }),
    supabase
      .from("workout_logs")
      .select("date, workout_type, duration_mins, time_of_day, strain, notes")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: true }),
  ]);

  // Need at least 10 workouts
  if (!workouts || workouts.length < 10) {
    return NextResponse.json({
      patterns: [],
      insufficient_data: true,
      workouts_logged: workouts?.length ?? 0,
      workouts_needed: 10,
    });
  }

  if (!whoopData || whoopData.length < 10) {
    return NextResponse.json({
      patterns: [],
      insufficient_data: true,
      days_collected: whoopData?.length ?? 0,
      days_needed: 10,
      message: "Need more Whoop recovery data",
    });
  }

  // Call Claude for pattern analysis
  const prompt = `Analyze workout patterns and their impact on recovery for this person.

Workout log (date, type, duration_mins, time_of_day, strain, notes):
${JSON.stringify(workouts)}

Daily Whoop recovery data (date, recovery_score 0-100, hrv ms, sleep_hours, sleep_quality %, strain 0-21):
${JSON.stringify(whoopData)}

For each workout type, look at next-day recovery scores. Also analyze time-of-day effects.
Return JSON only:
{"patterns": [{"workout_type": "string", "avg_next_day_recovery": number, "insight": "specific finding", "recommendation": "actionable advice"}], "best_time": "morning|afternoon|evening based on data", "best_time_reason": "why"}

Be specific with numbers. Only include patterns with enough data points. Respond with ONLY valid JSON. No markdown.`;

  try {
    const [dbMemoryContext, geneticContext] = await Promise.all([
      getUserMemoryContext(session.user.email),
      getGeneticContext(session.user.email),
    ]);
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are MAYA, a personal health intelligence system."
        + "\n\n---\n## Who you are talking to:\n" + philippContext
        + "\n\n## Long-term memory:\n" + memoryContext
        + dbMemoryContext
        + geneticContext,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const result = JSON.parse(text);

    return NextResponse.json({
      ...result,
      insufficient_data: false,
      workouts_logged: workouts.length,
    });
  } catch (err) {
    console.error("[insights/workouts] Claude API error:", err);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}
