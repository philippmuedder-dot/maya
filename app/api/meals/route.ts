import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? "";
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userEmail)
    .order("logged_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[meals] fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch meals." }, { status: 500 });
  }

  return NextResponse.json({ meals: data ?? [] });
}
