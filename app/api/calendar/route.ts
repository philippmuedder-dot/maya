import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCalendarEvents } from "@/lib/googleCalendar";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "SessionExpired", message: "Please sign in again." },
      { status: 401 }
    );
  }

  if (!session.accessToken) {
    return NextResponse.json(
      { error: "No access token available" },
      { status: 401 }
    );
  }

  const result = await fetchCalendarEvents(session.accessToken);
  return NextResponse.json(result);
}
