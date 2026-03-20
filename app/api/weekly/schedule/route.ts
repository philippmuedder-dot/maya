import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCalendarEvents, groupEventsByDay } from "@/lib/googleCalendar";
import { getValidWhoopToken, fetchWhoopData } from "@/lib/whoop";
import Anthropic from "@anthropic-ai/sdk";

interface Task {
  title: string;
  hours: number;
  deadline?: string;
  category: "work" | "personal";
}

// POST — generate AI schedule from tasks + context
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tasks } = (await req.json()) as { tasks: Task[] };

  if (!tasks || tasks.length === 0) {
    return NextResponse.json(
      { error: "At least one task is required" },
      { status: 400 }
    );
  }

  // Gather calendar + Whoop data in parallel
  const [calendarData, whoopData] = await Promise.all([
    session.accessToken
      ? fetchCalendarEvents(session.accessToken).catch(() => null)
      : Promise.resolve(null),
    getValidWhoopToken(session.user.email)
      .then((token) => (token ? fetchWhoopData(token) : null))
      .catch(() => null),
  ]);

  // Build calendar context — next 7 days
  const today = new Date();
  const next7Days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    next7Days.push(d.toISOString().split("T")[0]);
  }

  let calendarContext = "No calendar data available.";
  if (calendarData?.events) {
    const grouped = groupEventsByDay(calendarData.events);
    const dayLines = next7Days.map((date) => {
      const dayEvents = grouped[date] ?? [];
      const dayName = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
      });
      if (dayEvents.length === 0) return `${dayName} ${date}: No events — open for deep work`;
      const eventList = dayEvents
        .map((e) => {
          const start = e.start?.dateTime
            ? new Date(e.start.dateTime).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })
            : "all-day";
          return `${start}: ${e.summary}`;
        })
        .join(", ");
      return `${dayName} ${date}: ${dayEvents.length} events — ${eventList}`;
    });
    calendarContext = dayLines.join("\n");
  }

  // Whoop recovery context
  let recoveryContext = "No Whoop data available.";
  if (whoopData?.recovery) {
    const r = whoopData.recovery.score;
    recoveryContext = `Current recovery: ${r.recovery_score}%, HRV: ${r.hrv_rmssd_milli}ms, RHR: ${r.resting_heart_rate}bpm`;
  }

  const taskList = tasks
    .map(
      (t, i) =>
        `${i + 1}. [${t.category}] "${t.title}" — ${t.hours}h${t.deadline ? ` (deadline: ${t.deadline})` : ""}`
    )
    .join("\n");

  const prompt = `You are scheduling tasks for Philipp, a 3/5 Generator (Human Design) with Sacral authority.

TASKS TO SCHEDULE:
${taskList}

CALENDAR (next 7 days):
${calendarContext}

RECOVERY DATA:
${recoveryContext}

SCHEDULING RULES:
- Generator energy: schedule deep work on low-meeting mornings (before noon)
- Cave environment: protect morning blocks for focus — no admin or calls
- Longevity first: don't stack hard workout + heavy cognitive work on the same day
- Respect deadlines — schedule those tasks with enough buffer
- If recovery is low (<60%), lighten the first 1-2 days
- Spread tasks across the week — avoid overloading any single day
- Personal tasks can go in evenings or light days
- Each day should have max 2-3 scheduled tasks

Return JSON array:
[{
  "date": "YYYY-MM-DD",
  "task": "exact task title from list",
  "category": "work" | "personal",
  "suggested_time": "Morning" | "Afternoon" | "Evening",
  "reason": "brief reason for this slot"
}]
Return ONLY valid JSON. No markdown, no explanation.`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const schedule = JSON.parse(text);

    return NextResponse.json({ schedule });
  } catch (err) {
    console.error("[weekly/schedule] error:", err);
    return NextResponse.json(
      { error: "Failed to generate schedule" },
      { status: 500 }
    );
  }
}
