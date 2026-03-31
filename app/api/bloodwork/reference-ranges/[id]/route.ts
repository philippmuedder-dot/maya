import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// PATCH — update a single reference range
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { optimal_min, optimal_max, unit, source } = body;

  const update: Record<string, unknown> = {};
  if (optimal_min !== undefined) update.optimal_min = optimal_min != null ? Number(optimal_min) : null;
  if (optimal_max !== undefined) update.optimal_max = optimal_max != null ? Number(optimal_max) : null;
  if (unit !== undefined) update.unit = unit?.trim() || null;
  if (source !== undefined) update.source = source?.trim() || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify ownership before updating
  const { data, error } = await supabase
    .from("reference_ranges")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", session.user.email)
    .select("id, marker_name, optimal_min, optimal_max, unit, source")
    .single();

  if (error) {
    console.error("[bloodwork/reference-ranges/patch] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// DELETE — remove a single reference range (falls back to FH defaults in the UI)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { error, count } = await supabase
    .from("reference_ranges")
    .delete({ count: "exact" })
    .eq("id", params.id)
    .eq("user_id", session.user.email);

  if (error) {
    console.error("[bloodwork/reference-ranges/delete] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
