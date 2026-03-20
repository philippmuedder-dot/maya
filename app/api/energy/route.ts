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

  // Fetch last 14 days of energy logs
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  const cutoff = fourteenDaysAgo.toISOString().split("T")[0];

  const { data: logs, error: logsError } = await supabase
    .from("energy_logs")
    .select("*")
    .eq("user_id", session.user.email)
    .gte("date", cutoff)
    .order("date", { ascending: false });

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

// POST — create or update today's energy log
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { people, feeling, drain_source } = body;

  if (!feeling || !["energized", "neutral", "drained"].includes(feeling)) {
    return NextResponse.json(
      { error: "feeling must be one of: energized, neutral, drained" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Check if today's log already exists
  const { data: existing } = await supabase
    .from("energy_logs")
    .select("id")
    .eq("user_id", session.user.email)
    .eq("date", today)
    .single();

  let data, error;

  if (existing) {
    // Update existing log
    ({ data, error } = await supabase
      .from("energy_logs")
      .update({ people: people || null, feeling, drain_source: drain_source || null })
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    // Insert new log
    ({ data, error } = await supabase
      .from("energy_logs")
      .insert({
        user_id: session.user.email,
        date: today,
        people: people || null,
        feeling,
        drain_source: drain_source || null,
      })
      .select()
      .single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
