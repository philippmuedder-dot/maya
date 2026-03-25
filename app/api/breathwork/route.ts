import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — recent breathwork logs + HRV correlation data
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split("T")[0];

  const [{ data: logs }, { data: whoopData }] = await Promise.all([
    supabase
      .from("breathwork_logs")
      .select("*")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: false })
      .limit(30),
    supabase
      .from("whoop_daily_data")
      .select("date, hrv")
      .eq("user_id", session.user.email)
      .gte("date", cutoff)
      .order("date", { ascending: true }),
  ]);

  return NextResponse.json({ logs: logs ?? [], hrv_data: whoopData ?? [] });
}

// POST — log a breathwork session
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, duration_mins, feeling_after, date } = body;

  if (!type || !duration_mins) {
    return NextResponse.json({ error: "type and duration_mins required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const today = date ?? new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("breathwork_logs")
    .insert({
      user_id: session.user.email,
      date: today,
      type,
      duration_mins,
      feeling_after: feeling_after ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
