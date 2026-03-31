import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchCalendarEvents, fetchWorkCalendarEvents, refreshWorkCalendarToken } from "@/lib/googleCalendar";
import { createServiceClient } from "@/lib/supabase";

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

  // Fetch personal calendar events
  const result = await fetchCalendarEvents(session.accessToken);

  // Detect scope errors — stale token issued before calendar scope was added.
  // User must sign out and sign back in to re-consent.
  if (
    result.error &&
    (result.error.includes("insufficient authentication scopes") ||
      result.error.includes("insufficientPermissions") ||
      result.error.includes("403"))
  ) {
    return NextResponse.json(
      {
        error: "CalendarScopeError",
        message:
          "Calendar access not authorised. Please sign out and sign back in to grant calendar permissions.",
        needsReauth: true,
      },
      { status: 401 }
    );
  }

  // Attempt to fetch work calendar events if token exists
  if (session.user?.email) {
    try {
      const supabase = createServiceClient();
      const { data: workToken } = await supabase
        .from("work_calendar_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", session.user.email)
        .single();

      if (workToken) {
        let accessToken = workToken.access_token;

        // Refresh if expired (with 60s buffer)
        const needsRefresh =
          workToken.expires_at &&
          Date.now() / 1000 > workToken.expires_at - 60;

        if (needsRefresh && workToken.refresh_token) {
          const refreshed = await refreshWorkCalendarToken(workToken.refresh_token);
          if (refreshed) {
            accessToken = refreshed.access_token;
            // Update stored token
            await supabase
              .from("work_calendar_tokens")
              .update({
                access_token: refreshed.access_token,
                expires_at: refreshed.expires_at,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", session.user.email);
          }
        }

        const workEvents = await fetchWorkCalendarEvents(accessToken);

        if (workEvents.length > 0) {
          // Merge: replace busy blocks with full work events
          const personalOnly = result.events.filter((e) => !e.isBusy);
          const merged = [...personalOnly, ...workEvents].sort((a, b) => {
            const aTime = a.start.dateTime ?? a.start.date ?? "";
            const bTime = b.start.dateTime ?? b.start.date ?? "";
            return aTime.localeCompare(bTime);
          });
          result.events = merged;
        }
      }
    } catch {
      // Non-critical — return personal events only
    }
  }

  return NextResponse.json(result);
}
