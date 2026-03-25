import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — fetch all memories for the user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", session.user.email)
    .order("last_reinforced_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST — manually add a memory
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category, insight } = await req.json();
  if (!category || !insight) {
    return NextResponse.json({ error: "category and insight required" }, { status: 400 });
  }

  const validCategories = ["preference", "pattern", "goal", "avoid", "insight"];
  if (!validCategories.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_memory")
    .insert({
      user_id: session.user.email,
      category,
      insight: insight.trim(),
      source: "manual",
      last_reinforced_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
