export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status: string;
  htmlLink: string;
  colorId?: string;
  attendees?: { email: string; responseStatus: string }[];
  isBusy?: boolean; // free/busy-only block from work calendar
}

export interface CalendarResponse {
  events: CalendarEvent[];
  calendarName: string;
  error?: string;
}

/** Calendar load classification based on event count + total duration */
export function classifyCalendarLoad(events: CalendarEvent[]): {
  label: "Light" | "Moderate" | "Heavy";
  color: string;
} {
  const todayEvents = getTodayEvents(events);
  const totalMinutes = todayEvents.reduce((acc, e) => {
    if (e.start.dateTime && e.end.dateTime) {
      return (
        acc +
        (new Date(e.end.dateTime).getTime() -
          new Date(e.start.dateTime).getTime()) /
          60_000
      );
    }
    return acc;
  }, 0);

  if (todayEvents.length >= 5 || totalMinutes >= 300) {
    return { label: "Heavy", color: "text-red-500 dark:text-red-400" };
  }
  if (todayEvents.length >= 3 || totalMinutes >= 150) {
    return { label: "Moderate", color: "text-yellow-500 dark:text-yellow-400" };
  }
  return { label: "Light", color: "text-emerald-500 dark:text-emerald-400" };
}

export function getTodayEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  return events.filter((e) => {
    const start = e.start.dateTime
      ? new Date(e.start.dateTime)
      : new Date(e.start.date!);
    return start >= todayStart && start < todayEnd;
  });
}

export function groupEventsByDay(
  events: CalendarEvent[]
): Record<string, CalendarEvent[]> {
  return events.reduce(
    (acc, event) => {
      const dateStr = event.start.dateTime
        ? new Date(event.start.dateTime).toDateString()
        : new Date(event.start.date!).toDateString();
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(event);
      return acc;
    },
    {} as Record<string, CalendarEvent[]>
  );
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.start.date && !event.start.dateTime) return "All day";
  if (!event.start.dateTime) return "";
  return new Date(event.start.dateTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const WORK_CALENDAR_ID = "philipp@vetsak.com";

export async function fetchCalendarEvents(
  accessToken: string
): Promise<CalendarResponse> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86_400_000);

  const params = new URLSearchParams({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: in7Days.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const [primaryRes, freeBusyRes] = await Promise.all([
    fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers, next: { revalidate: 300 } }
    ),
    fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers,
      body: JSON.stringify({
        timeMin: now.toISOString(),
        timeMax: in7Days.toISOString(),
        items: [{ id: WORK_CALENDAR_ID }],
      }),
      next: { revalidate: 300 },
    }),
  ]);

  if (!primaryRes.ok) {
    const error = await primaryRes.json().catch(() => ({}));
    return {
      events: [],
      calendarName: "primary",
      error: error?.error?.message ?? `Calendar API error: ${primaryRes.status}`,
    };
  }

  const primaryData = await primaryRes.json();
  const personalEvents: CalendarEvent[] = primaryData.items ?? [];

  // Merge work calendar busy blocks if available
  let busyEvents: CalendarEvent[] = [];
  if (freeBusyRes.ok) {
    const fbData = await freeBusyRes.json();
    const busyPeriods: { start: string; end: string }[] =
      fbData?.calendars?.[WORK_CALENDAR_ID]?.busy ?? [];
    busyEvents = busyPeriods.map((b, i) => ({
      id: `busy-work-${i}-${b.start}`,
      summary: "Busy (work)",
      start: { dateTime: b.start },
      end: { dateTime: b.end },
      status: "confirmed",
      htmlLink: "",
      isBusy: true,
    }));
  }

  const allEvents = [...personalEvents, ...busyEvents].sort((a, b) => {
    const aTime = a.start.dateTime ?? a.start.date ?? "";
    const bTime = b.start.dateTime ?? b.start.date ?? "";
    return aTime.localeCompare(bTime);
  });

  return {
    events: allEvents,
    calendarName: primaryData.summary ?? "Calendar",
  };
}
