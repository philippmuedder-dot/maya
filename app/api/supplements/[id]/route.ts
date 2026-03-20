import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// PATCH — update a supplement
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, dose, unit, timing, purpose, notes, active } = body;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("supplements")
    .update({ name, dose, unit, timing, purpose, notes, active })
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .select()
    .single();

  if (error) {
    console.error("[supplements/[id]] PATCH error:", error);
    return NextResponse.json({ error: "Failed to update supplement." }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE — delete a supplement
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
    .from("supplements")
    .delete()
    .eq("id", params.id)
    .eq("user_id", session.user.email);

  if (error) {
    console.error("[supplements/[id]] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete supplement." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
