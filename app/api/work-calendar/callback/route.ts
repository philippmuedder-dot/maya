import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?work_calendar=error&reason=${error ?? "missing_code"}`
    );
  }

  // Decode the user_id we passed in state
  let userId: string;
  try {
    userId = Buffer.from(state, "base64").toString("utf-8");
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?work_calendar=error&reason=invalid_state`
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/work-calendar/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?work_calendar=error&reason=token_exchange_failed`
    );
  }

  const tokens = await tokenRes.json();
  const expiresAt = tokens.expires_in
    ? Math.floor(Date.now() / 1000) + tokens.expires_in
    : null;

  // Get the email of the connected account
  let email: string | null = null;
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (userRes.ok) {
      const user = await userRes.json();
      email = user.email ?? null;
    }
  } catch {
    // Non-critical
  }

  const supabase = createServiceClient();
  const { error: dbError } = await supabase
    .from("work_calendar_tokens")
    .upsert(
      {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_at: expiresAt,
        email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (dbError) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?work_calendar=error&reason=db_save_failed`
    );
  }

  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL}/settings?work_calendar=connected`
  );
}
