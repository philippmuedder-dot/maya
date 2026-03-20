import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWhoopToken } from "@/lib/whoop";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const token = await getWhoopToken(session.user.email);
  return NextResponse.json({ connected: !!token });
}
