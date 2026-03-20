import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

// GET — generate AI weekly summary
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get current week boundaries
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const weekStart = monday.toISOString().split("T")[0];

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekEnd = sunday.toISOString().split("T")[0];

  // Fetch week data in parallel
  const [planResult, checkinsResult] = await Promise.all([
    supabase
      .from("weekly_plans")
      .select("*")
      .eq("user_id", session.user.email)
      .eq("week_start", weekStart)
      .single(),
    supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", session.user.email)
      .gte("date", weekStart)
      .lte("date", weekEnd)
      .order("date", { ascending: true }),
  ]);

  const plan = planResult.data;
  const checkins = checkinsResult.data ?? [];

  if (!plan && checkins.length === 0) {
    return NextResponse.json({
      summary: null,
      message: "Not enough data for a weekly summary yet.",
    });
  }

  // Build context
  const contextParts: string[] = [];

  if (checkins.length > 0) {
    const avgStress =
      checkins.reduce(
        (sum: number, c: { stress_level: number | null }) =>
          sum + (c.stress_level ?? 0),
        0
      ) / checkins.length;
    const moods = checkins
      .map((c: { mood: string | null }) => c.mood)
      .filter(Boolean);
    contextParts.push(
      `Check-ins this week: ${checkins.length} days logged. Avg stress: ${avgStress.toFixed(1)}/10. Moods: ${moods.join(", ")}`
    );
  }

  if (plan) {
    const schedule = (plan.schedule as Array<{ task: string; completed?: boolean }>) ?? [];
    const completed = schedule.filter((s) => s.completed).length;
    const total = schedule.length;
    contextParts.push(
      `Tasks: ${completed}/${total} completed`
    );

    if (plan.intention) {
      contextParts.push(`Weekly intention: "${plan.intention}"`);
    }

    if (plan.stressors && Array.isArray(plan.stressors)) {
      contextParts.push(
        `Stressors identified Sunday: ${(plan.stressors as string[]).join(", ")}`
      );
    }
  }

  const prompt = `You are MAYA, Philipp's personal operating system coach (3/5 Generator, Sacral authority).

Here is this week's data (${weekStart} to ${weekEnd}):
${contextParts.join("\n")}

Write a short (3-4 sentences) weekly pattern summary. Focus on:
- What patterns showed up this week (stress, energy, completion)
- Whether his intention was lived or drifted
- One gentle observation about alignment/misalignment
- Frame setbacks as 3-line experiments, not failures

Be direct, warm, specific. No fluff. No toxic positivity.
Return ONLY the summary text, no JSON, no markdown formatting.`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const summary =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[weekly/summary] error:", err);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
