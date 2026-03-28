import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { getWhoopToken, fetchWhoopData } from "@/lib/whoop";
import { createHmac } from "crypto";

/**
 * POST — Whoop webhook receiver
 * Handles: workout.updated, recovery.updated, sleep.updated
 * On each event: look up user, fetch fresh data, upsert whoop_daily_data
 */
export async function POST(req: NextRequest) {
  const body = await req.text();

  // Verify signature if secret is configured
  const secret = process.env.WHOOP_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-whoop-signature") ?? "";
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    if (sig !== expected) {
      console.warn("[whoop/webhook] signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: { user_id?: number; type?: string };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id: whoopUserId, type: eventType } = payload;
  if (!whoopUserId || !eventType) {
    return NextResponse.json({ error: "Missing user_id or type" }, { status: 400 });
  }

  const validEvents = ["workout.updated", "recovery.updated", "sleep.updated"];
  if (!validEvents.includes(eventType)) {
    // Acknowledge but ignore unknown event types
    return NextResponse.json({ ok: true, skipped: true });
  }

  console.log(`[whoop/webhook] received ${eventType} for whoop user ${whoopUserId}`);

  try {
    // Look up which MAYA user owns this Whoop account
    const supabase = createServiceClient();
    const { data: tokenRows } = await supabase
      .from("whoop_tokens")
      .select("user_id")
      .limit(20);

    if (!tokenRows || tokenRows.length === 0) {
      console.warn("[whoop/webhook] no whoop_tokens found");
      return NextResponse.json({ error: "No matching user" }, { status: 404 });
    }

    // Try each user — find the one whose Whoop profile matches
    // For single-user v1, just process the first token
const email = tokenRows[0].user_id;

const tokenRow = await getWhoopToken(email);
const accessToken = tokenRow?.access_token;
    if (!accessToken) {
      console.error("[whoop/webhook] could not get valid token for", email);
      return NextResponse.json({ error: "Token expired" }, { status: 500 });
    }

    const data = await fetchWhoopData(accessToken);

    // Upsert into whoop_daily_data
    const today = new Date().toISOString().split("T")[0];
    let sleepHours: number | null = null;
    if (data.sleep?.start && data.sleep?.end) {
      const diffMs = new Date(data.sleep.end).getTime() - new Date(data.sleep.start).getTime();
      sleepHours = Math.round((diffMs / 3_600_000) * 10) / 10;
    }

    const sleepDebtMins = data.sleep?.score?.sleep_needed?.need_from_sleep_debt_milli != null
      ? Math.round(data.sleep.score.sleep_needed.need_from_sleep_debt_milli / 60000)
      : null;
    const sleepNeedMins = data.sleep?.score?.sleep_needed?.baseline_milli != null
      ? Math.round(data.sleep.score.sleep_needed.baseline_milli / 60000)
      : null;

    const { error: upsertError } = await supabase
      .from("whoop_daily_data")
      .upsert(
        {
          user_id: email,
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
      );

    if (upsertError) {
      console.error("[whoop/webhook] upsert error:", upsertError);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    console.log(`[whoop/webhook] upserted whoop_daily_data for ${email} (${today})`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[whoop/webhook] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
