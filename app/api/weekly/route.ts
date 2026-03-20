import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// Helper: get Monday of the current week
function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split("T")[0];
}

// GET — fetch current week's plan
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const weekStart = getCurrentWeekStart();

  const { data, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("user_id", session.user.email)
    .eq("week_start", weekStart)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also fetch week stats for review
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const { data: checkins } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", session.user.email)
    .gte("date", weekStart)
    .lte("date", weekEndStr)
    .order("date", { ascending: true });

  return NextResponse.json({
    plan: data ?? null,
    weekStart,
    checkins: checkins ?? [],
  });
}

// POST — create a new weekly plan
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { stressors, tasks, schedule, intention, ai_suggestions } = body;

  const supabase = createServiceClient();
  const weekStart = getCurrentWeekStart();

  const { data, error } = await supabase
    .from("weekly_plans")
    .upsert(
      {
        user_id: session.user.email,
        week_start: weekStart,
        stressors: stressors ?? [],
        tasks: tasks ?? [],
        schedule: schedule ?? [],
        intention: intention ?? "",
        ai_suggestions: ai_suggestions ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan: data });
}

// PATCH — update task completion or schedule
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const supabase = createServiceClient();
  const weekStart = getCurrentWeekStart();

  // Build update object from provided fields
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.schedule !== undefined) updates.schedule = body.schedule;
  if (body.tasks !== undefined) updates.tasks = body.tasks;

  const { data, error } = await supabase
    .from("weekly_plans")
    .update(updates)
    .eq("user_id", session.user.email)
    .eq("week_start", weekStart)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plan: data });
}
