import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — fetch user preferences
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", session.user.email)
    .single();

  return NextResponse.json({
    current_timezone: data?.current_timezone ?? "Europe/Berlin",
  });
}

// POST — upsert user preferences
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { current_timezone } = body;

  if (!current_timezone) {
    return NextResponse.json({ error: "current_timezone is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: session.user.email,
        current_timezone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
