import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidWhoopToken, WhoopWorkout, whoopSportName } from "@/lib/whoop";

// Re-uses the same whoopGet pattern but only fetches workouts —
// lighter than calling /api/whoop/data which also fetches recovery + sleep + cycle.
async function fetchWorkouts(accessToken: string): Promise<WhoopWorkout[]> {
  const res = await fetch(
    "https://api.prod.whoop.com/developer/v1/activity/workout?limit=10",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  // Whoop returns `records` for workout pagination
  return data?.records ?? data?.data ?? [];
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string | null = null;
  try {
    accessToken = await getValidWhoopToken(session.user.email);
  } catch {
    // Not connected — return empty list gracefully
    return NextResponse.json([]);
  }

  if (!accessToken) return NextResponse.json([]);

  const workouts = await fetchWorkouts(accessToken);

  // Annotate each workout with its sport display name for the client
  const annotated = workouts.map((w) => ({
    ...w,
    sport_name: whoopSportName(w.sport_id),
  }));

  return NextResponse.json(annotated);
}
