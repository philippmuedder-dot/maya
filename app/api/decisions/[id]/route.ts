import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// PATCH — update a decision (any fields)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Only include fields that were actually sent
  const allowed = [
    "description",
    "decision_type",
    "confidence",
    "expected_outcome",
    "actual_outcome",
    "outcome_satisfaction",
    "followup_date",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("decisions")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .select()
    .single();

  if (error) {
    console.error("[decisions/[id]] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update decision." }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE — delete a decision
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("decisions")
    .delete()
    .eq("id", params.id)
    .eq("user_id", session.user.email);

  if (error) {
    console.error("[decisions/[id]] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete decision." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
