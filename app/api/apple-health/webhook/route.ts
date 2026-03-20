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
  const body = await req.json();

  // Verify auth if secret is configured
  const secret = process.env.APPLE_HEALTH_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const userEmail = body.user_email;
  if (!userEmail || typeof userEmail !== "string") {
    return NextResponse.json({ error: "user_email is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  let rows: { user_id: string; date: string; steps: number | null; resting_hr: number | null; hrv: number | null }[] = [];

  // Format B: simple day summaries
  if (Array.isArray(body.days)) {
    rows = body.days
      .filter((d: { date?: string }) => d.date)
      .map((d: { date: string; steps?: number; resting_hr?: number; hrv?: number }) => ({
        user_id: userEmail,
        date: d.date,
        steps: d.steps ?? null,
        resting_hr: d.resting_hr ?? null,
        hrv: d.hrv ?? null,
      }));
  }

  // Format A: Health Auto Export metrics
  if (body.data?.metrics && Array.isArray(body.data.metrics)) {
    const dateMap = new Map<string, { steps: number | null; resting_hr: number | null; hrv: number | null }>();

    const METRIC_MAP: Record<string, "steps" | "resting_hr" | "hrv"> = {
      step_count: "steps",
      resting_heart_rate: "resting_hr",
      heart_rate_variability: "hrv",
    };

    for (const metric of body.data.metrics) {
      const field = METRIC_MAP[metric.name];
      if (!field || !Array.isArray(metric.data)) continue;

      for (const point of metric.data) {
        const date = typeof point.date === "string" ? point.date.split("T")[0] : null;
        if (!date) continue;

        if (!dateMap.has(date)) {
          dateMap.set(date, { steps: null, resting_hr: null, hrv: null });
        }
        const entry = dateMap.get(date)!;
        entry[field] = typeof point.qty === "number" ? point.qty : null;
      }
    }

    rows = Array.from(dateMap.entries()).map(([date, data]) => ({
      user_id: userEmail,
      date,
      ...data,
    }));
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid data found in payload" }, { status: 400 });
  }

  const { error } = await supabase
    .from("apple_health_data")
    .upsert(rows, { onConflict: "user_id,date" });

  if (error) {
    console.error("[apple-health/webhook] db error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[apple-health/webhook] upserted ${rows.length} rows for ${userEmail}`);
  return NextResponse.json({ ok: true, upserted: rows.length });
}
