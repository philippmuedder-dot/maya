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
  isWork?: boolean; // full event from connected work calendar
}

export interface CalendarResponse {
  events: CalendarEvent[];
  calendarName: string;
  error?: string;
  work_calendar_needs_reauth?: boolean;
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
  // Calculate "today" in Europe/Berlin timezone
  const berlinDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // yields "YYYY-MM-DD"

  return events.filter((e) => {
    const startStr = e.start.dateTime ?? e.start.date ?? "";
    // For dateTime values, convert to Berlin date; for date values, use as-is
    if (e.start.dateTime) {
      const berlinEventDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(e.start.dateTime));
      return berlinEventDate === berlinDate;
    }
    return startStr.startsWith(berlinDate);
  });
}

export function groupEventsByDay(
  events: CalendarEvent[]
): Record<string, CalendarEvent[]> {
  return events.reduce(
    (acc, event) => {
      const dateStr = event.start.dateTime
        ? new Intl.DateTimeFormat("en-US", {
            timeZone: "Europe/Berlin",
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "2-digit",
          }).format(new Date(event.start.dateTime))
        : new Date(event.start.date!).toDateString();
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(event);
      return acc;
    },
    {} as Record<string, CalendarEvent[]>
  );
}

/** Get today's date string (YYYY-MM-DD) in Europe/Berlin timezone */
export function getBerlinDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatEventTime(event: CalendarEvent): string {
  if (event.start.date && !event.start.dateTime) return "All day";
  if (!event.start.dateTime) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(event.start.dateTime));
}

const WORK_CALENDAR_ID = "philipp@vetsak.com";

/** Refresh a work calendar access token using its stored refresh_token */
export async function refreshWorkCalendarToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: number;
} | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      access_token: data.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    };
  } catch {
    return null;
  }
}

/** Fetch full work calendar events using a dedicated work access token */
export async function fetchWorkCalendarEvents(
  workAccessToken: string
): Promise<{ events: CalendarEvent[]; tokenInvalid?: boolean }> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 86_400_000);

  const params = new URLSearchParams({
    calendarId: WORK_CALENDAR_ID,
    timeMin: now.toISOString(),
    timeMax: in7Days.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(WORK_CALENDAR_ID)}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${workAccessToken}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) {
      const tokenInvalid = res.status === 401 || res.status === 403;
      console.error(`[fetchWorkCalendarEvents] API error ${res.status}${tokenInvalid ? " — token invalid/expired" : ""}`);
      return { events: [], tokenInvalid };
    }
    const data = await res.json();
    return {
      events: (data.items ?? []).map((e: CalendarEvent) => ({
        ...e,
        isWork: true,
      })),
    };
  } catch {
    return { events: [] };
  }
}

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
