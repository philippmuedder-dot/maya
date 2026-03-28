import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidWhoopToken, fetchWhoopData, deleteWhoopToken } from "@/lib/whoop";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string | null = null;
  try {
    accessToken = await getValidWhoopToken(session.user.email);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Whoop token error — please reconnect in Settings.";
    console.error("[whoop/data] getValidWhoopToken threw:", message);
    return NextResponse.json(
      { error: "TokenRefreshFailed", message },
      { status: 401 }
    );
  }

  console.log("[whoop/data] accessToken found:", !!accessToken);

  if (!accessToken) {
    return NextResponse.json(
      { error: "NotConnected", message: "Connect Whoop in Settings." },
      { status: 404 }
    );
  }

  const data = await fetchWhoopData(accessToken);
  console.log("[whoop/data] fetchWhoopData result:", JSON.stringify({
    hasRecovery: !!data.recovery,
    hasSleep: !!data.sleep,
    hasCycle: !!data.cycle,
    recovery: data.recovery,
    sleep: data.sleep,
    cycle: data.cycle,
  }, null, 2));

  // Fire-and-forget upsert into whoop_daily_data
  const today = new Date().toISOString().split("T")[0];
  let sleepHours: number | null = null;
  if (data.sleep?.start && data.sleep?.end) {
    const diffMs = new Date(data.sleep.end).getTime() - new Date(data.sleep.start).getTime();
    sleepHours = Math.round((diffMs / 3_600_000) * 10) / 10;
  }

  const supabase = createServiceClient();
  const sleepDebtMins = data.sleep?.score?.sleep_needed?.need_from_sleep_debt_milli != null
    ? Math.round(data.sleep.score.sleep_needed.need_from_sleep_debt_milli / 60000)
    : null;
  const sleepNeedMins = data.sleep?.score?.sleep_needed?.baseline_milli != null
    ? Math.round(data.sleep.score.sleep_needed.baseline_milli / 60000)
    : null;

  Promise.resolve(
    supabase
      .from("whoop_daily_data")
      .upsert(
        {
          user_id: session.user.email,
          date: today,
          recovery_score: data.recovery?.score?.recovery_score ?? null,
          hrv: data.recovery?.score?.hrv_rmssd_milli ?? null,
          strain: data.cycle?.score?.strain ?? null,
          sleep_hours: sleepHours,
          sleep_quality: data.sleep?.score?.sleep_performance_percentage ?? null,
          sleep_debt_mins: sleepDebtMins,
          sleep_need_mins: sleepNeedMins,
        },
        { onConflict: "user_id,date" }
      )
  )
    .then(({ error }) => {
      if (error) console.error("[whoop/data] upsert whoop_daily_data error:", error);
      else console.log("[whoop/data] upserted whoop_daily_data for", today);
    })
    .catch(console.error);

  return NextResponse.json(data);
}

/** DELETE — disconnect Whoop */
export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteWhoopToken(session.user.email);
  return NextResponse.json({ success: true });
}
