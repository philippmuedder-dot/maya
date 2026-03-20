import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — list all decisions for user, ordered by date desc
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("user_id", session.user.email)
    .order("date", { ascending: false });

  if (error) {
    console.error("[decisions] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch decisions." }, { status: 500 });
  }

  return NextResponse.json({ decisions: data });
}

// POST — create a new decision
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { description, decision_type, confidence, expected_outcome, followup_date } = body;

  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  if (!decision_type) {
    return NextResponse.json({ error: "Decision type is required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("decisions")
    .insert({
      user_id: session.user.email,
      description,
      decision_type,
      confidence: confidence ?? null,
      expected_outcome: expected_outcome || null,
      followup_date: followup_date || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[decisions] POST error:", error);
    return NextResponse.json({ error: "Failed to create decision." }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
