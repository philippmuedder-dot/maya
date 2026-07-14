import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — how many logged days exist per supplement_id.
// Used to warn before deleting: supplement_logs cascade-delete with the supplement.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("supplement_logs")
    .select("supplement_id")
    .eq("user_id", session.user.email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.supplement_id as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }

  return NextResponse.json({ counts });
}
