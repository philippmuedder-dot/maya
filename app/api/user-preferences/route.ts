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
    bloodwork_reference_source: data?.bloodwork_reference_source ?? "function_health",
  });
}

// POST — upsert user preferences
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { current_timezone, bloodwork_reference_source } = body;

  const update: Record<string, string> = {
    user_id: session.user.email,
    updated_at: new Date().toISOString(),
  };
  if (current_timezone) update.current_timezone = current_timezone;
  if (bloodwork_reference_source) update.bloodwork_reference_source = bloodwork_reference_source;

  if (Object.keys(update).length === 2) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(update, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
