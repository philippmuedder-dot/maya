import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractMemoryFromRecentChat } from "@/lib/userMemory";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await extractMemoryFromRecentChat(session.user.email);
  return NextResponse.json({ success: true });
}
