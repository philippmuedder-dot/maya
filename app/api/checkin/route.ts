import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — today's check-in + last 7 days history
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", session.user.email)
    .order("date", { ascending: false })
    .limit(7);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const today = new Date().toISOString().split("T")[0];
  const todayCheckin = data?.find((c: { date: string }) => c.date === today) ?? null;

  return NextResponse.json({ today: todayCheckin, history: data ?? [] });
}

// POST — save daily check-in (upsert)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { stress_level, top_stressor, mood, creative_energy, feeling_is_mine } = body;

  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("daily_checkins")
    .upsert(
      {
        user_id: session.user.email,
        date: today,
        stress_level,
        top_stressor: top_stressor || null,
        mood,
        creative_energy,
        feeling_is_mine: feeling_is_mine ?? null,
      },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
