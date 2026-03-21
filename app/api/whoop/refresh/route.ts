import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getWhoopToken, saveWhoopToken, WHOOP_TOKEN_URL } from "@/lib/whoop";

/**
 * POST /api/whoop/refresh
 *
 * Manually force a Whoop token refresh for the current user.
 * Useful for debugging and for recovering from a stale token without
 * forcing a full OAuth re-connect.
 *
 * Optionally accepts a JSON body: { refresh_token: string }
 * to supply a known-good refresh token directly (e.g. recovered from logs).
 * If omitted, uses the refresh token stored in Supabase.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.email;

  // Allow caller to supply a refresh token override (e.g. recovered from logs)
  let refreshTokenOverride: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    refreshTokenOverride = body?.refresh_token ?? undefined;
  } catch {
    // no body — that's fine
  }

  // Fetch stored token to get the refresh_token if not overridden
  const stored = await getWhoopToken(userId);

  const refreshToken = refreshTokenOverride ?? stored?.refresh_token ?? null;
  if (!refreshToken) {
    return NextResponse.json(
      {
        error: "No refresh token available",
        hint: "Pass { refresh_token: '...' } in the request body to supply one manually, or reconnect Whoop via Settings.",
      },
      { status: 400 }
    );
  }

  console.log(
    `[whoop/refresh] forcing token refresh for ${userId} (override=${!!refreshTokenOverride})`
  );

  // Call Whoop token endpoint directly
  const formBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
  }).toString();

  const whoopRes = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
  });

  if (!whoopRes.ok) {
    const errText = await whoopRes.text().catch(() => "");
    console.error("[whoop/refresh] Whoop rejected refresh:", whoopRes.status, errText);
    return NextResponse.json(
      {
        error: "Whoop rejected the refresh token",
        status: whoopRes.status,
        detail: errText,
        hint: "The refresh token is revoked. Reconnect Whoop via Settings → Disconnect → Reconnect.",
      },
      { status: 502 }
    );
  }

  const tokenData = await whoopRes.json();

  // Attempt to save with one retry
  let saveError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await saveWhoopToken(userId, tokenData);
      console.log(`[whoop/refresh] new token saved (attempt ${attempt})`);
      return NextResponse.json({
        ok: true,
        expires_in: tokenData.expires_in,
        has_refresh_token: !!tokenData.refresh_token,
        message: "Token refreshed and saved successfully.",
      });
    } catch (err) {
      saveError = err;
      console.error(`[whoop/refresh] save attempt ${attempt} failed:`, err);
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 1_000));
      }
    }
  }

  // Save failed — return the new tokens in the response so the caller can
  // manually insert them into Supabase via the dashboard.
  const detail =
    saveError instanceof Error ? saveError.message : String(saveError);
  console.error(
    `[whoop/refresh] ROTATION_SAVE_FAILED: new_access_token=${tokenData.access_token} new_refresh_token=${tokenData.refresh_token ?? "none"}`
  );

  return NextResponse.json(
    {
      error: "Token refreshed from Whoop but failed to save to database",
      detail,
      // Return tokens so operator can manually restore via Supabase dashboard
      recovery: {
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        expires_in: tokenData.expires_in ?? null,
      },
      hint: "Insert the recovery object manually into the whoop_tokens table in Supabase.",
    },
    { status: 500 }
  );
}
