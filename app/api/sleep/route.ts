import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { getValidWhoopToken } from "@/lib/whoop";
import { fetchCalendarEvents } from "@/lib/googleCalendar";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.email;
  const supabase = createServiceClient();

  // ─── Fetch calendar events for bedtime + wind-down ─────────────────────────
  let bedtime: { time: string; event_summary: string; event_time: string } | null = null;
  let tomorrowEventCount = 0;

  if (session.accessToken) {
    try {
      const calData = await fetchCalendarEvents(session.accessToken as string);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const tomorrowEvents = calData.events.filter((e) => {
        const start = e.start.dateTime ?? e.start.date ?? "";
        return start.startsWith(tomorrowStr);
      });

      tomorrowEventCount = tomorrowEvents.length;

      // Find first event with a specific time (not all-day)
      const firstTimedEvent = tomorrowEvents.find((e) => e.start.dateTime);
      if (firstTimedEvent?.start.dateTime) {
        const eventStart = new Date(firstTimedEvent.start.dateTime);
        const bedtimeDate = new Date(eventStart.getTime() - 8.5 * 60 * 60 * 1000);
        const eventTimeStr = eventStart.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        const bedtimeStr = bedtimeDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        bedtime = {
          time: bedtimeStr,
          event_summary: firstTimedEvent.summary || "Event",
          event_time: eventTimeStr,
        };
      }
    } catch (err) {
      console.error("[sleep] Calendar fetch error:", err);
    }
  }

  // ─── Fetch today's checkin stress level ────────────────────────────────────
  let stressLevel: number | null = null;
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const { data: checkinData } = await supabase
      .from("daily_checkins")
      .select("stress_level")
      .eq("user_id", userId)
      .eq("date", todayStr)
      .single();

    if (checkinData) {
      stressLevel = checkinData.stress_level;
    }
  } catch (err) {
    console.error("[sleep] Checkin fetch error:", err);
  }

  // ─── Build wind-down protocol ──────────────────────────────────────────────
  const tomorrowLoad =
    tomorrowEventCount >= 5 ? "heavy" : tomorrowEventCount >= 3 ? "moderate" : "light";

  let protocol: string[] = [];
  if (stressLevel !== null && stressLevel >= 7) {
    protocol = [
      "Start wind-down 90 minutes before bedtime",
      "10-minute body scan or progressive muscle relaxation",
      "4-7-8 breathing: 3 rounds minimum",
      "No screens — use a physical book or journal",
      "Dim all lights to amber/warm tones",
      "Write tomorrow's top 3 priorities to clear mental load",
      "Cool bedroom to 18-19°C",
    ];
  } else if (stressLevel !== null && stressLevel >= 4) {
    protocol = [
      "Start wind-down 60 minutes before bedtime",
      "5-minute box breathing (4-4-4-4)",
      "Switch to night mode on all devices",
      "Light stretching or gentle yoga",
      "Dim lights and lower room temperature",
      "Quick brain dump — jot down any open loops",
    ];
  } else {
    protocol = [
      "Start wind-down 30 minutes before bedtime",
      "Put phone on Do Not Disturb",
      "Dim lights and set room to comfortable temp",
      "Read or listen to something calming",
      "A few slow deep breaths before lights out",
    ];
  }

  const winddown = {
    stress_level: stressLevel,
    tomorrow_load: tomorrowLoad,
    protocol,
  };

  // ─── Fetch evening/night supplements ───────────────────────────────────────
  let supplements: { name: string; dose: number | null; unit: string | null; timing: string }[] = [];

  try {
    const { data: suppData } = await supabase
      .from("supplements")
      .select("name, dose, unit, timing")
      .eq("user_id", userId)
      .eq("active", true)
      .in("timing", ["evening", "night"]);

    if (suppData) {
      supplements = suppData;
    }
  } catch (err) {
    console.error("[sleep] Supplements fetch error:", err);
  }

  // ─── Fetch 7 days of Whoop sleep data ──────────────────────────────────────
  interface SleepLogEntry {
    date: string;
    duration_hrs: number;
    performance_pct: number;
    efficiency_pct: number;
    stages: {
      light: number;
      deep: number;
      rem: number;
      awake: number;
    };
  }

  let sleepLog: SleepLogEntry[] = [];
  let sleepDebt: number | null = null;

  try {
    const token = await getValidWhoopToken(userId);
    if (token) {
      const res = await fetch(
        `https://api.prod.whoop.com/developer/v1/activity/sleep?limit=7`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const records = data.records ?? [];

        // Filter out naps, map to our format
        const mainSleeps = records.filter(
          (r: { nap: boolean }) => !r.nap
        );

        sleepLog = mainSleeps.map(
          (r: {
            start: string;
            score: {
              stage_summary: {
                total_light_sleep_time_milli: number;
                total_slow_wave_sleep_time_milli: number;
                total_rem_sleep_time_milli: number;
                total_awake_time_milli: number;
              };
              sleep_performance_percentage: number;
              sleep_efficiency_percentage: number;
            };
          }) => {
            const stages = r.score.stage_summary;
            const totalSleepMs =
              stages.total_light_sleep_time_milli +
              stages.total_slow_wave_sleep_time_milli +
              stages.total_rem_sleep_time_milli;
            const durationHrs = +(totalSleepMs / 3_600_000).toFixed(2);

            return {
              date: new Date(r.start).toISOString().split("T")[0],
              duration_hrs: durationHrs,
              performance_pct: r.score.sleep_performance_percentage ?? 0,
              efficiency_pct: r.score.sleep_efficiency_percentage ?? 0,
              stages: {
                light: +(stages.total_light_sleep_time_milli / 3_600_000).toFixed(2),
                deep: +(stages.total_slow_wave_sleep_time_milli / 3_600_000).toFixed(2),
                rem: +(stages.total_rem_sleep_time_milli / 3_600_000).toFixed(2),
                awake: +(stages.total_awake_time_milli / 3_600_000).toFixed(2),
              },
            };
          }
        );

        // Calculate sleep debt (target 8hrs per night)
        if (sleepLog.length > 0) {
          sleepDebt = sleepLog.reduce(
            (debt, night) => debt + (8 - night.duration_hrs),
            0
          );
          sleepDebt = +sleepDebt.toFixed(1);
        }
      }
    }
  } catch (err) {
    console.error("[sleep] Whoop sleep fetch error:", err);
  }

  return NextResponse.json({
    bedtime,
    winddown,
    supplements,
    sleep_log: sleepLog,
    sleep_debt: sleepDebt,
  });
}
