import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("work_calendar_tokens")
    .select("email, expires_at")
    .eq("user_id", session.user.email)
    .single();

  return NextResponse.json({
    connected: !!data,
    email: data?.email ?? null,
  });
}
