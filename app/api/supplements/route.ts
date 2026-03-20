import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — list all supplements for user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("supplements")
    .select("*")
    .eq("user_id", session.user.email)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[supplements] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch supplements." }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST — create a new supplement
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, dose, unit, timing, purpose, notes, active } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("supplements")
    .insert({
      user_id: session.user.email,
      name,
      dose: dose ?? null,
      unit: unit || null,
      timing: timing || null,
      purpose: purpose || null,
      notes: notes || null,
      active: active !== undefined ? active : true,
    })
    .select()
    .single();

  if (error) {
    console.error("[supplements] POST error:", error);
    return NextResponse.json({ error: "Failed to create supplement." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
