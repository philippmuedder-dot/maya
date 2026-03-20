import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — flow states, creative seeds, today's checkin, gut decision stats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.email;
  const today = new Date().toISOString().split("T")[0];

  // Last 30 days boundary for gut decision stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const [flowRes, seedsRes, checkinRes, gutRes] = await Promise.all([
    supabase
      .from("flow_states")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("creative_seeds")
      .select("*")
      .eq("user_id", userId)
      .order("sparked_at", { ascending: false }),
    supabase
      .from("daily_checkins")
      .select("creative_energy, gut_decision_type")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("daily_checkins")
      .select("gut_decision_type")
      .eq("user_id", userId)
      .gte("date", thirtyDaysAgoStr)
      .not("gut_decision_type", "is", null),
  ]);

  if (flowRes.error) {
    console.error("[flow] GET flow_states error:", flowRes.error);
  }
  if (seedsRes.error) {
    console.error("[flow] GET creative_seeds error:", seedsRes.error);
  }
  if (checkinRes.error) {
    console.error("[flow] GET daily_checkins error:", checkinRes.error);
  }
  if (gutRes.error) {
    console.error("[flow] GET gut_decision_stats error:", gutRes.error);
  }

  // Compute gut decision stats
  const gutDecisionStats = { gut: 0, rational: 0, fear: 0 };
  (gutRes.data ?? []).forEach((row: { gut_decision_type: string }) => {
    const t = row.gut_decision_type as keyof typeof gutDecisionStats;
    if (t in gutDecisionStats) {
      gutDecisionStats[t]++;
    }
  });

  return NextResponse.json({
    flowStates: flowRes.data ?? [],
    creativeSeeds: seedsRes.data ?? [],
    todayCheckin: checkinRes.data ?? null,
    gutDecisionStats,
  });
}

// POST — create flow state, creative seed, or update gut decision
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.email;
  const body = await req.json();
  const { type } = body;

  if (type === "flow") {
    const { activity, start_time, duration_mins, preceded_by } = body;
    if (!activity) {
      return NextResponse.json({ error: "Activity is required." }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("flow_states")
      .insert({
        user_id: userId,
        date: today,
        activity,
        start_time: start_time || null,
        duration_mins: duration_mins ? parseInt(duration_mins, 10) : null,
        preceded_by: preceded_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[flow] POST flow_state error:", error);
      return NextResponse.json({ error: "Failed to save flow state." }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }

  if (type === "seed") {
    const { idea } = body;
    if (!idea) {
      return NextResponse.json({ error: "Idea is required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("creative_seeds")
      .insert({
        user_id: userId,
        idea,
        sparked_at: new Date().toISOString(),
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("[flow] POST creative_seed error:", error);
      return NextResponse.json({ error: "Failed to save idea." }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  }

  if (type === "gut_decision") {
    const { gut_decision_type } = body;
    if (!["gut", "rational", "fear"].includes(gut_decision_type)) {
      return NextResponse.json({ error: "Invalid decision type." }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("daily_checkins")
      .update({ gut_decision_type })
      .eq("user_id", userId)
      .eq("date", today)
      .select()
      .single();

    if (error) {
      console.error("[flow] POST gut_decision error:", error);
      return NextResponse.json(
        { error: "Failed to update. Make sure you have a daily check-in for today." },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid type." }, { status: 400 });
}
