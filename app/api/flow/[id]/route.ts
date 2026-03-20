import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// PATCH — update a creative seed's status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { status } = body;

  if (!["active", "exploring", "parked"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("creative_seeds")
    .update({ status })
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .select()
    .single();

  if (error) {
    console.error("[flow/[id]] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update seed." }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE — delete a creative seed or flow state by id
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const userId = session.user.email;

  // Try deleting from creative_seeds first, then flow_states
  const { error: seedError, count: seedCount } = await supabase
    .from("creative_seeds")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", userId);

  if (seedError) {
    console.error("[flow/[id]] DELETE seed error:", seedError);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }

  if (seedCount && seedCount > 0) {
    return NextResponse.json({ success: true });
  }

  // Not found in creative_seeds — try flow_states
  const { error: flowError } = await supabase
    .from("flow_states")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (flowError) {
    console.error("[flow/[id]] DELETE flow_state error:", flowError);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
