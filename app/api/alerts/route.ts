import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { fetchCalendarEvents, getTodayEvents } from "@/lib/googleCalendar";
import { getValidWhoopToken, fetchWhoopData } from "@/lib/whoop";

interface Alert {
  type: "sleep_debt" | "low_recovery" | "high_stress" | "heavy_day_low_tank";
  message: string;
  severity: "warning" | "critical";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts: Alert[] = [];
  const supabase = createServiceClient();

  // Fetch check-in history + whoop + calendar in parallel
  const [checkinResult, whoopData, calendarData] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select("date, stress_level")
      .eq("user_id", session.user.email)
      .order("date", { ascending: false })
      .limit(7)
      .then(({ data }) => data ?? []),
    getValidWhoopToken(session.user.email)
      .then((token) => (token ? fetchWhoopData(token) : null))
      .catch(() => null),
    session.accessToken
      ? fetchCalendarEvents(session.accessToken).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Check: Recovery <50% for 2+ days (we only have latest from Whoop API)
  const recoveryScore = whoopData?.recovery?.score?.recovery_score;
  if (recoveryScore !== undefined && recoveryScore < 50) {
    alerts.push({
      type: "low_recovery",
      message: `Recovery at ${Math.round(recoveryScore)}% — your body is asking for rest. Honor it.`,
      severity: "warning",
    });
  }

  // Check: Sleep <6hrs
  if (whoopData?.sleep?.start && whoopData?.sleep?.end) {
    const sleepMs =
      new Date(whoopData.sleep.end).getTime() -
      new Date(whoopData.sleep.start).getTime();
    const sleepHrs = sleepMs / 3_600_000;
    if (sleepHrs < 6) {
      alerts.push({
        type: "sleep_debt",
        message: `Only ${sleepHrs.toFixed(1)}hrs of sleep — sleep debt is building. Protect tonight's rest.`,
        severity: "critical",
      });
    }
  }

  // Check: Stress >7 for 3+ consecutive days
  const highStressDays = checkinResult.filter(
    (c: { stress_level: number | null }) =>
      c.stress_level !== null && c.stress_level > 7
  );
  if (highStressDays.length >= 3) {
    alerts.push({
      type: "high_stress",
      message:
        "Stress has been high for 3+ days — is this feeling actually yours? (Undefined solar plexus check)",
      severity: "warning",
    });
  }

  // Check: Calendar >5 events AND recovery <60%
  if (calendarData) {
    const todayEvents = getTodayEvents(calendarData.events);
    if (todayEvents.length > 5 && recoveryScore !== undefined && recoveryScore < 60) {
      alerts.push({
        type: "heavy_day_low_tank",
        message: `${todayEvents.length} events today with ${Math.round(recoveryScore)}% recovery — heavy day, low tank. Protect your energy.`,
        severity: "critical",
      });
    }
  }

  return NextResponse.json(alerts);
}
