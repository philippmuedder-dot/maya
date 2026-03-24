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

  // Resolve user email — try common field names, fall back to env default
  const userEmail =
    (body.user_email as string | undefined) ??
    (body.email as string | undefined) ??
    (body.userId as string | undefined) ??
    process.env.DEFAULT_USER_EMAIL ??
    null;

  console.log("[apple-health/webhook] resolved userEmail:", userEmail);
  console.log("[apple-health/webhook] payload.data structure:", JSON.stringify(body.data ?? body.metrics ?? "(none)").slice(0, 2000));

  if (!userEmail || typeof userEmail !== "string") {
    console.warn("[apple-health/webhook] no user_email and no DEFAULT_USER_EMAIL set — data not saved");
    return NextResponse.json({ ok: true, note: "no user_email — set DEFAULT_USER_EMAIL env var" });
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
    const dateMap = new Map<string, {
      steps: number | null;
      resting_hr: number | null;
      hrv: number | null;
      walking_running_distance: number | null;
    }>();
    // Track counts for fields that need averaging
    const avgCounts = new Map<string, Map<string, number>>();

    const METRIC_MAP: Record<string, "steps" | "resting_hr" | "hrv" | "walking_running_distance"> = {
      // common Health Auto Export names
      step_count: "steps",
      steps: "steps",
      resting_heart_rate: "resting_hr",
      restingHeartRate: "resting_hr",
      resting_hr: "resting_hr",
      heart_rate_variability: "hrv",
      heartRateVariability: "hrv",
      hrv: "hrv",
      heart_rate: "hrv", // fallback mapping
      walking_running_distance: "walking_running_distance",
    };

    // Metrics that should be SUMMED per day (not averaged)
    const SUM_FIELDS = new Set(["steps", "walking_running_distance"]);

    for (const metric of metrics as { name?: string; data?: { date?: string; qty?: number }[] }[]) {
      console.log("[apple-health/webhook] metric name:", metric.name, "data points:", metric.data?.length ?? 0);
      const field = metric.name ? METRIC_MAP[metric.name] : undefined;
      if (!field || !Array.isArray(metric.data)) continue;

      for (const point of metric.data) {
        const date = typeof point.date === "string" ? point.date.split("T")[0] : null;
        if (!date || typeof point.qty !== "number") continue;

        if (!dateMap.has(date)) {
          dateMap.set(date, { steps: null, resting_hr: null, hrv: null, walking_running_distance: null });
        }
        const entry = dateMap.get(date)!;

        if (SUM_FIELDS.has(field)) {
          // SUM for steps and distance
          entry[field] = (entry[field] ?? 0) + point.qty;
        } else {
          // AVERAGE for heart rate metrics
          if (!avgCounts.has(date)) avgCounts.set(date, new Map());
          const dateCounts = avgCounts.get(date)!;
          const count = (dateCounts.get(field) ?? 0) + 1;
          dateCounts.set(field, count);
          // Running average: prev * (n-1)/n + new/n
          const prev = entry[field] ?? 0;
          entry[field] = prev + (point.qty - prev) / count;
        }
      }
    }

    if (dateMap.size > 0) {
      rows = Array.from(dateMap.entries()).map(([date, data]) => ({
        user_id: userEmail,
        date,
        steps: data.steps !== null ? Math.round(data.steps) : null,
        resting_hr: data.resting_hr !== null ? Math.round(data.resting_hr) : null,
        hrv: data.hrv !== null ? Math.round(data.hrv) : null,
      }));
    }
  }

  if (rows.length === 0) {
    console.warn("[apple-health/webhook] no rows extracted — payload keys:", Object.keys(body));
    return NextResponse.json({ ok: true, note: "no data rows extracted — check logs" });
  }

  const dedupedRows = Object.values(
    rows.reduce((acc, row) => {
      acc[`${row.user_id}_${row.date}`] = row;
      return acc;
    }, {} as Record<string, typeof rows[0]>)
  );

  console.log(`[apple-health/webhook] rows before dedup: ${rows.length}, after: ${dedupedRows.length}`);

  let upsertErrors = 0;
  for (const row of dedupedRows) {
    const { error } = await supabase
      .from("apple_health_data")
      .upsert(row, { onConflict: "user_id,date" });
    if (error) {
      console.error("[apple-health/webhook] row upsert error:", error);
      upsertErrors++;
    }
  }

  console.log(`[apple-health/webhook] upserted ${dedupedRows.length - upsertErrors}/${dedupedRows.length} rows for ${userEmail}`);
  return NextResponse.json({ ok: true, upserted: dedupedRows.length - upsertErrors, errors: upsertErrors });
}
