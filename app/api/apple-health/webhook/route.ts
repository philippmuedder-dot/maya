import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * POST — Apple Health webhook receiver (for Health Auto Export app)
 *
 * Accepts two payload formats:
 *
 * Format A (Health Auto Export):
 * { "data": { "metrics": [{ "name": "step_count", "data": [{ "date": "...", "qty": 8500 }] }] }, "user_email": "..." }
 *
 * Format B (simple day summaries):
 * { "user_email": "...", "days": [{ "date": "...", "steps": 8500, "resting_hr": 62, "hrv": 45 }] }
 */
export async function POST(req: NextRequest) {
  // Log headers for debugging
  const ua = req.headers.get("user-agent") ?? "unknown";
  const ct = req.headers.get("content-type") ?? "unknown";
  console.log(`[apple-health/webhook] POST from UA="${ua}" content-type="${ct}"`);

  // Read raw body text first so we can log it before any parsing
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[apple-health/webhook] failed to read body:", err);
    return NextResponse.json({ ok: true, note: "body unreadable" });
  }

  console.log("[apple-health/webhook] raw body (first 2000 chars):", rawBody.slice(0, 2000));

  // Parse JSON — return 200 regardless so the app doesn't retry forever
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(rawBody);
  } catch {
    console.error("[apple-health/webhook] body is not valid JSON — logged above for inspection");
    return NextResponse.json({ ok: true, note: "non-JSON body received and logged" });
  }

  // Optional bearer auth
  const secret = process.env.APPLE_HEALTH_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== secret) {
      console.warn("[apple-health/webhook] unauthorized — wrong or missing bearer token");
      // Still return 200 so we can see what the app sends, but don't save
      return NextResponse.json({ ok: true, note: "unauthorized — data not saved" });
    }
  }

  // Resolve user email — try common field names
  const userEmail =
    (body.user_email as string | undefined) ??
    (body.email as string | undefined) ??
    (body.userId as string | undefined) ??
    null;

  if (!userEmail || typeof userEmail !== "string") {
    console.warn("[apple-health/webhook] no user_email found in payload — keys:", Object.keys(body));
    return NextResponse.json({ ok: true, note: "no user_email — data logged but not saved" });
  }

  const supabase = createServiceClient();
  let rows: {
    user_id: string;
    date: string;
    steps: number | null;
    resting_hr: number | null;
    hrv: number | null;
  }[] = [];

  // Format B: simple day summaries
  if (Array.isArray(body.days)) {
    rows = (body.days as { date?: string; steps?: number; resting_hr?: number; hrv?: number }[])
      .filter((d) => d.date)
      .map((d) => ({
        user_id: userEmail,
        date: d.date!,
        steps: d.steps ?? null,
        resting_hr: d.resting_hr ?? null,
        hrv: d.hrv ?? null,
      }));
  }

  // Format A: Health Auto Export metrics array
  const metrics =
    (body.data as { metrics?: unknown[] } | undefined)?.metrics ??
    (body.metrics as unknown[] | undefined);

  if (Array.isArray(metrics)) {
    const dateMap = new Map<string, { steps: number | null; resting_hr: number | null; hrv: number | null }>();

    const METRIC_MAP: Record<string, "steps" | "resting_hr" | "hrv"> = {
      // common Health Auto Export names
      step_count: "steps",
      steps: "steps",
      resting_heart_rate: "resting_hr",
      restingHeartRate: "resting_hr",
      heart_rate_variability: "hrv",
      heartRateVariability: "hrv",
      hrv: "hrv",
    };

    for (const metric of metrics as { name?: string; data?: { date?: string; qty?: number }[] }[]) {
      console.log("[apple-health/webhook] metric name:", metric.name, "data points:", metric.data?.length ?? 0);
      const field = metric.name ? METRIC_MAP[metric.name] : undefined;
      if (!field || !Array.isArray(metric.data)) continue;

      for (const point of metric.data) {
        const date = typeof point.date === "string" ? point.date.split("T")[0] : null;
        if (!date) continue;

        if (!dateMap.has(date)) {
          dateMap.set(date, { steps: null, resting_hr: null, hrv: null });
        }
        const entry = dateMap.get(date)!;
        entry[field] = typeof point.qty === "number" ? Math.round(point.qty) : null;
      }
    }

    if (dateMap.size > 0) {
      rows = Array.from(dateMap.entries()).map(([date, data]) => ({
        user_id: userEmail,
        date,
        ...data,
      }));
    }
  }

  if (rows.length === 0) {
    console.warn("[apple-health/webhook] no rows extracted — payload keys:", Object.keys(body));
    return NextResponse.json({ ok: true, note: "no data rows extracted — check logs" });
  }

  const { error } = await supabase
    .from("apple_health_data")
    .upsert(rows, { onConflict: "user_id,date" });

  if (error) {
    console.error("[apple-health/webhook] db error:", error);
    // Return 200 so the app doesn't retry; error is in logs
    return NextResponse.json({ ok: true, note: "db error — check logs" });
  }

  console.log(`[apple-health/webhook] upserted ${rows.length} rows for ${userEmail}`);
  return NextResponse.json({ ok: true, upserted: rows.length });
}
