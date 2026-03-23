import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — 30-day trend: energy scores + stress + mood from daily_checkins
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const [logsResult, checkinsResult] = await Promise.all([
    supabase
      .from("energy_logs")
      .select("date, feeling")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: true }),
    supabase
      .from("daily_checkins")
      .select("date, stress_level, mood")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: true }),
  ]);

  // Build 30-day array
  const days: {
    date: string;
    energyScore: number | null;
    stressLevel: number | null;
    mood: string | null;
  }[] = [];

  // Map energy logs by date (average multiple per day)
  const energyByDate = new Map<string, number[]>();
  for (const log of logsResult.data ?? []) {
    const score = log.feeling === "energized" ? 2 : log.feeling === "neutral" ? 1 : 0;
    if (!energyByDate.has(log.date)) energyByDate.set(log.date, []);
    energyByDate.get(log.date)!.push(score);
  }

  // Map checkins by date
  const checkinByDate = new Map<string, { stress_level: number | null; mood: string | null }>();
  for (const c of checkinsResult.data ?? []) {
    checkinByDate.set(c.date, { stress_level: c.stress_level, mood: c.mood });
  }

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    const energyNums = energyByDate.get(dateStr);
    const energyScore = energyNums
      ? energyNums.reduce((a, b) => a + b, 0) / energyNums.length
      : null;

    const checkin = checkinByDate.get(dateStr);

    days.push({
      date: dateStr,
      energyScore,
      stressLevel: checkin?.stress_level ?? null,
      mood: checkin?.mood ?? null,
    });
  }

  return NextResponse.json({ days });
}
