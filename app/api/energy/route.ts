import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — last 14 days of energy logs + today's mood from daily_checkins
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const cutoff = fourteenDaysAgo.toISOString().split("T")[0];

  const { data: logs, error: logsError } = await supabase
    .from("energy_logs")
    .select("*")
    .eq("user_id", session.user.email)
    .gte("date", cutoff)
    .order("created_at", { ascending: false });

  if (logsError) {
    return NextResponse.json({ error: logsError.message }, { status: 500 });
  }

  // Fetch today's checkin for mood
  const today = new Date().toISOString().split("T")[0];
  const { data: checkin } = await supabase
    .from("daily_checkins")
    .select("mood")
    .eq("user_id", session.user.email)
    .eq("date", today)
    .single();

  return NextResponse.json({
    logs: logs ?? [],
    todayMood: checkin?.mood ?? null,
  });
}

// POST — add a new energy log entry (multiple allowed per day)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { people, feeling, drain_source, date } = body;

  if (!feeling || !["energized", "neutral", "drained"].includes(feeling)) {
    return NextResponse.json(
      { error: "feeling must be one of: energized, neutral, drained" },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().split("T")[0];
  // Use provided date if valid and not in the future, otherwise fall back to today
  const logDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today ? date : today;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("energy_logs")
    .insert({
      user_id: session.user.email,
      date: logDate,
      people: people || null,
      feeling,
      drain_source: drain_source || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE — remove a specific log entry
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("energy_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
