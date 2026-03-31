import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export interface StoredRange {
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
    .select("marker_name, optimal_min, optimal_max, unit, source")
    .eq("user_id", session.user.email);

  if (error) {
    console.error("[bloodwork/reference-ranges] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
