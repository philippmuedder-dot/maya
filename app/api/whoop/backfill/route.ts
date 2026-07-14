import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getValidWhoopToken, WHOOP_API_BASE } from "@/lib/whoop";
import { createServiceClient } from "@/lib/supabase";

// Allow a longer run — paginated history fetch across 3 streams
export const maxDuration = 60;

interface AnyRecord {
  score?: Record<string, number> | null;
  created_at?: string;
  start?: string;
  end?: string;
  nap?: boolean;
}

// Fetch all records for a Whoop endpoint across a date range, following next_token.
async function fetchAll(path: string, token: string, startISO: string, endISO: string, maxPages: number): Promise<AnyRecord[]> {
  const out: AnyRecord[] = [];
  let nextToken: string | null = null;
  for (let i = 0; i < maxPages; i++) {
    const url = new URL(`${WHOOP_API_BASE}${path}`);
    url.searchParams.set("start", startISO);
    url.searchParams.set("end", endISO);
    url.searchParams.set("limit", "25");
    if (nextToken) url.searchParams.set("nextToken", nextToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) break;
    const data = await res.json();
    out.push(...((data.records ?? []) as AnyRecord[]));
    nextToken = data.next_token ?? null;
    if (!nextToken) break;
  }
  return out;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let token: string | null = null;
  try {
    token = await getValidWhoopToken(session.user.email);
  } catch {
    return NextResponse.json({ error: "Whoop token invalid — reconnect in Settings." }, { status: 401 });
  }
  if (!token) return NextResponse.json({ error: "Whoop not connected." }, { status: 404 });

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 120);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const [recoveries, sleeps, cycles] = await Promise.all([
    fetchAll("/v2/recovery", token, startISO, endISO, 8),
    fetchAll("/v2/activity/sleep", token, startISO, endISO, 10),
    fetchAll("/v1/cycle", token, startISO, endISO, 8),
  ]);

  const email = session.user.email;
  const map = new Map<string, Record<string, unknown>>();
  const row = (date: string) => {
    let r = map.get(date);
    if (!r) { r = { user_id: email, date }; map.set(date, r); }
    return r;
  };

  // Recovery → recovery_score, hrv, resting HR (bucket by created_at date)
  for (const rec of recoveries) {
    const d = (rec.created_at ?? "").slice(0, 10);
    if (!d || !rec.score) continue;
    const r = row(d);
    if (rec.score.recovery_score != null) r.recovery_score = rec.score.recovery_score;
    if (rec.score.hrv_rmssd_milli != null) r.hrv = rec.score.hrv_rmssd_milli;
  }

  // Cycle → strain (bucket by start date)
  for (const c of cycles) {
    const d = (c.start ?? "").slice(0, 10);
    if (!d || !c.score) continue;
    const r = row(d);
    if (c.score.strain != null) r.strain = c.score.strain;
  }

  // Sleep → sleep_hours + quality (bucket by end/wake date; keep longest non-nap per day)
  const bestSleepByDate = new Map<string, { hours: number; quality: number | null }>();
  for (const s of sleeps) {
    if (s.nap) continue;
    if (!s.start || !s.end) continue;
    const d = s.end.slice(0, 10);
    const hours = Math.round(((new Date(s.end).getTime() - new Date(s.start).getTime()) / 3_600_000) * 10) / 10;
    const quality = s.score?.sleep_performance_percentage ?? null;
    const existing = bestSleepByDate.get(d);
    if (!existing || hours > existing.hours) bestSleepByDate.set(d, { hours, quality });
  }
  for (const [d, v] of bestSleepByDate) {
    const r = row(d);
    r.sleep_hours = v.hours;
    if (v.quality != null) r.sleep_quality = v.quality;
  }

  // Only upsert rows that carry at least one metric
  const rows = Array.from(map.values()).filter(
    (r) => r.recovery_score != null || r.hrv != null || r.strain != null || r.sleep_hours != null
  );

  const supabase = createServiceClient();
  let written = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase
      .from("whoop_daily_data")
      .upsert(chunk, { onConflict: "user_id,date" });
    if (error) {
      return NextResponse.json({ error: error.message, written }, { status: 500 });
    }
    written += chunk.length;
  }

  return NextResponse.json({
    ok: true,
    fetched: { recoveries: recoveries.length, sleeps: sleeps.length, cycles: cycles.length },
    daysWritten: written,
    range: { from: startISO.slice(0, 10), to: endISO.slice(0, 10) },
  });
}
