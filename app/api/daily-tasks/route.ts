import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — fetch today's tasks + yesterday's incomplete (for carry-over) + stale tasks
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Today's tasks
  const { data: todayTasks } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", session.user.email)
    .eq("date", today)
    .order("created_at", { ascending: true });

  // Yesterday's incomplete tasks (for carry-over in check-in)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const { data: yesterdayIncomplete } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", session.user.email)
    .eq("date", yesterdayStr)
    .eq("completed", false);

  // Stale tasks — incomplete tasks carried for 3+ days
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

  const { data: staleTasks } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", session.user.email)
    .eq("completed", false)
    .neq("snoozed", true)
    .lte("date", threeDaysAgoStr)
    .order("date", { ascending: true });

  // Deduplicate stale tasks by task text — only show unique task names
  const staleByText = new Map<string, { id: string; task: string; date: string }>();
  (staleTasks ?? []).forEach((t: { id: string; task: string; date: string }) => {
    if (!staleByText.has(t.task)) {
      staleByText.set(t.task, { id: t.id, task: t.task, date: t.date });
    }
  });

  return NextResponse.json({
    tasks: todayTasks ?? [],
    yesterdayIncomplete: yesterdayIncomplete ?? [],
    staleTasks: Array.from(staleByText.values()),
  });
}

// POST — save daily tasks (from check-in)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tasks } = body; // Array of { task: string, carried_from_date?: string }

  if (!tasks || !Array.isArray(tasks)) {
    return NextResponse.json({ error: "Invalid tasks" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Filter out empty tasks
  const validTasks = tasks.filter(
    (t: { task: string }) => t.task && t.task.trim() !== ""
  );

  if (validTasks.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  const rows = validTasks.map((t: { task: string; carried_from_date?: string }) => ({
    user_id: session.user!.email!,
    date: today,
    task: t.task.trim(),
    completed: false,
    carried_from_date: t.carried_from_date || null,
  }));

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data });
}

// PATCH — toggle task completion
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, completed, snoozed, date } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (completed !== undefined) updates.completed = completed;
  if (snoozed !== undefined) updates.snoozed = snoozed;
  if (date !== undefined) updates.date = date;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("daily_tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.user.email)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
