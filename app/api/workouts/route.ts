import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — last 7 workouts for user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", session.user.email)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(7);

  if (error) {
    console.error("[workouts] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch workouts." }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — log a new workout
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, type, duration_mins, strain, notes } = body;

  if (!type) {
    return NextResponse.json({ error: "Workout type is required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: session.user.email,
      date: date ?? new Date().toISOString().split("T")[0],
      type,
      duration_mins: duration_mins ?? null,
      strain: strain ?? null,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[workouts] POST error:", error);
    return NextResponse.json({ error: "Failed to log workout." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
