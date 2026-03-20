import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

const TIMING_ORDER = ["morning", "afternoon", "evening", "night"] as const;
type Timing = (typeof TIMING_ORDER)[number];

interface Supplement {
  id: string;
  name: string;
  dose: number | null;
  unit: string | null;
  timing: Timing | null;
  purpose: string | null;
  notes: string | null;
  active: boolean;
}

// GET — active supplements grouped by timing (for morning briefing)
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
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[supplements/today] error:", error);
    return NextResponse.json({ error: "Failed to fetch supplements." }, { status: 500 });
  }

  const supplements = (data ?? []) as Supplement[];

  // Group by timing
  const grouped: Record<string, Supplement[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
    unscheduled: [],
  };

  for (const s of supplements) {
    const key = s.timing && TIMING_ORDER.includes(s.timing) ? s.timing : "unscheduled";
    grouped[key].push(s);
  }

  // Remove empty groups
  const result: Record<string, Supplement[]> = {};
  for (const [key, list] of Object.entries(grouped)) {
    if (list.length > 0) result[key] = list;
  }

  return NextResponse.json(result);
}
