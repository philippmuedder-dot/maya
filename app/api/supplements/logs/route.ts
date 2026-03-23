import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — today's taken supplement IDs + optional 7-day compliance
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];
  const weekly = req.nextUrl.searchParams.get("weekly") === "true";

  if (weekly) {
    // Last 7 days compliance per supplement
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const cutoff = sevenDaysAgo.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("supplement_logs")
      .select("supplement_id, date, taken")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .eq("taken", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group by supplement_id
    const bySupp: Record<string, number> = {};
    for (const row of data ?? []) {
      bySupp[row.supplement_id] = (bySupp[row.supplement_id] ?? 0) + 1;
    }

    return NextResponse.json({ compliance: bySupp, days: 7 });
  }

  // Today's taken supplements
  const { data, error } = await supabase
    .from("supplement_logs")
    .select("supplement_id, taken")
    .eq("user_id", session.user.email)
    .eq("date", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const taken = (data ?? [])
    .filter((r) => r.taken)
    .map((r) => r.supplement_id as string);

  return NextResponse.json({ taken, date: today });
}

// POST — toggle a supplement as taken/untaken today
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { supplement_id, taken = true } = body;

  if (!supplement_id) {
    return NextResponse.json({ error: "supplement_id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const { error } = await supabase
    .from("supplement_logs")
    .upsert(
      { user_id: session.user.email, supplement_id, date: today, taken },
      { onConflict: "user_id,supplement_id,date" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, supplement_id, taken });
}
