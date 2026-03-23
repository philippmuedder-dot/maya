import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST — create a Google Calendar event for a weekly plan task
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError" || !session.accessToken) {
    return NextResponse.json({ error: "SessionExpired" }, { status: 401 });
  }

  const body = await req.json();
  const { title, date, suggested_time, category } = body;

  if (!title || !date) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 });
  }

  // Determine start/end times based on suggested_time
  const timeSlots: Record<string, { start: string; end: string }> = {
    Morning: { start: "09:00:00", end: "10:30:00" },
    Afternoon: { start: "14:00:00", end: "15:30:00" },
    Evening: { start: "18:00:00", end: "19:30:00" },
  };

  const slot = timeSlots[suggested_time] ?? timeSlots.Morning;

  const event = {
    summary: title,
    description: `MAYA Weekly Plan — ${category ?? "task"}`,
    start: {
      dateTime: `${date}T${slot.start}`,
      timeZone: "Europe/Amsterdam",
    },
    end: {
      dateTime: `${date}T${slot.end}`,
      timeZone: "Europe/Amsterdam",
    },
    colorId: category === "work" ? "7" : "2", // peacock=work, sage=personal
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err?.error?.message ?? `Calendar API error: ${res.status}` },
      { status: res.status }
    );
  }

  const created = await res.json();
  return NextResponse.json({ ok: true, eventId: created.id, htmlLink: created.htmlLink });
}
