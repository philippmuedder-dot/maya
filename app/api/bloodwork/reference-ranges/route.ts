import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export interface StoredRange {
  id: string;
  marker_name: string;
  optimal_min: number | null;
  optimal_max: number | null;
  unit: string | null;
  source: string | null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reference_ranges")
    .select("id, marker_name, optimal_min, optimal_max, unit, source")
    .eq("user_id", session.user.email)
    .order("marker_name", { ascending: true });

  if (error) {
    console.error("[bloodwork/reference-ranges] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { marker_name, optimal_min, optimal_max, unit, source } = body;

  if (!marker_name?.trim()) {
    return NextResponse.json({ error: "marker_name is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reference_ranges")
    .upsert(
      {
        user_id: session.user.email,
        marker_name: marker_name.toLowerCase().trim(),
        optimal_min: optimal_min != null ? Number(optimal_min) : null,
        optimal_max: optimal_max != null ? Number(optimal_max) : null,
        unit: unit?.trim() || null,
        source: source?.trim() || "custom",
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,marker_name" }
    )
    .select("id, marker_name, optimal_min, optimal_max, unit, source")
    .single();

  if (error) {
    console.error("[bloodwork/reference-ranges] POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
