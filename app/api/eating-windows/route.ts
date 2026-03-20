import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — last 30 eating windows for streak calculation
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("eating_windows")
    .select("id, date, first_meal_time, last_meal_time")
    .eq("user_id", session.user.email)
    .order("date", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[eating-windows] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch eating windows." }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — upsert today's eating window
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { first_meal_time, last_meal_time, date } = body;
  const today = date ?? new Date().toISOString().split("T")[0];

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("eating_windows")
    .upsert(
      {
        user_id: session.user.email,
        date: today,
        first_meal_time: first_meal_time || null,
        last_meal_time: last_meal_time || null,
      },
      { onConflict: "user_id,date" }
    )
    .select("id, date, first_meal_time, last_meal_time")
    .single();

  if (error) {
    console.error("[eating-windows] POST error:", error);
    return NextResponse.json({ error: "Failed to save eating window." }, { status: 500 });
  }

  return NextResponse.json(data);
}
