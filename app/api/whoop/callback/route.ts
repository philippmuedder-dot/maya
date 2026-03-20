import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { WHOOP_TOKEN_URL, saveWhoopToken } from "@/lib/whoop";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?whoop=error&reason=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?whoop=error&reason=missing_code`
    );
  }

  // Verify state matches current session user
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/auth/signin?callbackUrl=/settings`
    );
  }

  const expectedState = Buffer.from(session.user.email).toString("base64");
  if (state !== expectedState) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?whoop=error&reason=state_mismatch`
    );
  }

  // Exchange code for token
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/whoop/callback`;

  const tokenRes = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.WHOOP_CLIENT_ID!,
      client_secret: process.env.WHOOP_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("Whoop token exchange failed:", err);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?whoop=error&reason=token_exchange`
    );
  }

  const tokenData = await tokenRes.json();

  try {
    await saveWhoopToken(session.user.email, tokenData);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[whoop/callback] Failed to save token:", detail);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?whoop=error&reason=${encodeURIComponent(detail)}`
    );
  }

  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL}/settings?whoop=connected`
  );
}
