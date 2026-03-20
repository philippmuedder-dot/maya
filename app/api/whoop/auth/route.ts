import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WHOOP_AUTH_URL, WHOOP_SCOPES } from "@/lib/whoop";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/whoop/callback`;

  const params = new URLSearchParams({
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: WHOOP_SCOPES,
    state: Buffer.from(session.user.email).toString("base64"),
  });

  return NextResponse.redirect(`${WHOOP_AUTH_URL}?${params}`);
}
