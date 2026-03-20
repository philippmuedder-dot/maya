import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

interface DayRecord {
  date: string; // YYYY-MM-DD
  steps: number | null;
  resting_hr: number | null;
  hrv: number | null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { days } = (await req.json()) as { days: DayRecord[] };
  if (!Array.isArray(days) || days.length === 0) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const rows = days.map((d) => ({
    user_id: session.user!.email!,
    date: d.date,
    steps: d.steps ?? null,
    resting_hr: d.resting_hr ?? null,
    hrv: d.hrv ?? null,
  }));

  const { error } = await supabase
    .from("apple_health_data")
    .upsert(rows, { onConflict: "user_id,date" });

  if (error) {
    console.error("[apple-health/upload] db error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: rows.length });
}
