// ─── Token storage (raw REST fetch — bypasses supabase-js SDK key-format issues)
function supabaseRestHeaders() {
  // Prefer service role key; fall back to anon key (RLS policy allows both)
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

function restUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1${path}`;
}

export const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1";

export const WHOOP_SCOPES = [
  "read:recovery",
  "read:sleep",
  "read:workout",
  "read:profile",
  "read:cycles",
  "offline",
].join(" ");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhoopRecovery {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score: {
    user_calibrating: boolean;
    recovery_score: number; // 0–100
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage: number;
    skin_temp_celsius: number;
  };
}

export interface WhoopSleepStages {
  total_awake_time_milli: number;
  total_light_sleep_time_milli: number;
  total_slow_wave_sleep_time_milli: number;
  total_rem_sleep_time_milli: number;
  sleep_cycle_count: number;
  disturbance_count: number;
}

export interface WhoopSleep {
  id: number;
  start: string;
  end: string;
  nap: boolean;
  score_state: string;
  score: {
    stage_summary: WhoopSleepStages;
    respiratory_rate: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
  };
}

export interface WhoopCycle {
  id: number;
  start: string;
  end: string;
  score_state: string;
  score: {
    strain: number; // 0–21
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

export interface WhoopWorkout {
  id: number;
  start: string;
  end: string;
  sport_id: number;
  score_state: string;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    distance_meter: number | null;
  } | null;
}

// Common Whoop sport IDs → display names
const SPORT_NAMES: Record<number, string> = {
  0: "Running",
  1: "Cycling",
  44: "Weightlifting",
  45: "Functional Fitness",
  71: "HIIT",
  126: "Outdoor Run",
};

export function whoopSportName(sportId: number): string {
  return SPORT_NAMES[sportId] ?? "Workout";
}

export interface WhoopData {
  recovery: WhoopRecovery | null;
  sleep: WhoopSleep | null;
  cycle: WhoopCycle | null;
  workouts: WhoopWorkout[];
  fetchedAt: string;
}

export interface StoredWhoopToken {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
}

// ─── Token storage (direct REST — bypasses supabase-js SDK key handling) ──────

export async function getWhoopToken(
  userId: string
): Promise<StoredWhoopToken | null> {
  const res = await fetch(
    restUrl(
      `/whoop_tokens?user_id=eq.${encodeURIComponent(userId)}&select=access_token,refresh_token,expires_at&limit=1`
    ),
    {
      headers: {
        ...supabaseRestHeaders(),
        Prefer: "return=representation",
      },
    }
  );

  if (!res.ok) {
    console.error("[getWhoopToken] REST error:", res.status, await res.text());
    return null;
  }

  const rows: StoredWhoopToken[] = await res.json();
  return rows[0] ?? null;
}

export async function saveWhoopToken(
  userId: string,
  token: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  }
) {
  const expires_at = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;

  const body = {
    user_id: userId,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    expires_at,
    scope: token.scope ?? null,
    token_type: token.token_type ?? "Bearer",
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(restUrl("/whoop_tokens") + "?on_conflict=user_id" , {
    method: "POST",
    headers: {
      ...supabaseRestHeaders(),
      // upsert on conflict: merge into existing row
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[saveWhoopToken] REST error:", res.status, detail);
    throw new Error(`Failed to save Whoop token (HTTP ${res.status}): ${detail}`);
  }
}

export async function deleteWhoopToken(userId: string) {
  await fetch(
    restUrl(`/whoop_tokens?user_id=eq.${encodeURIComponent(userId)}`),
    {
      method: "DELETE",
      headers: supabaseRestHeaders(),
    }
  );
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function refreshWhoopToken(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const reqBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
  }).toString();

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: reqBody,
  });

  console.log("[refreshWhoopToken] status:", res.status);
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("[refreshWhoopToken] failed:", res.status, errBody);
    return null;
  }

  // IMPORTANT: Whoop uses ROTATING refresh tokens.
  // The moment Whoop returns a new token pair the old refresh_token is revoked.
  // We must persist the new tokens before returning — if we fail to save we
  // lose both tokens and can never refresh again without re-connecting OAuth.
  const data = await res.json();
  const newAccessToken: string = data.access_token;
  const newRefreshToken: string | undefined = data.refresh_token;

  // Attempt save with one automatic retry (1s delay) to handle transient DB errors.
  let lastSaveError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await saveWhoopToken(userId, data);
      console.log(`[refreshWhoopToken] token saved on attempt ${attempt}`);
      return newAccessToken;
    } catch (err) {
      lastSaveError = err;
      console.error(
        `[refreshWhoopToken] save attempt ${attempt} failed:`,
        err instanceof Error ? err.message : String(err)
      );
      if (attempt === 1) {
        // Wait 1 second before retry
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
  }

  // Both save attempts failed after Whoop already rotated the tokens.
  // Log the raw tokens so they can be manually recovered from Vercel logs
  // and inserted directly into Supabase to avoid a full OAuth re-connect.
  console.error(
    "[refreshWhoopToken] ROTATION_SAVE_FAILED — manual recovery data below:"
  );
  console.error(
    `ROTATION_SAVE_FAILED: user_id=${userId} new_access_token=${newAccessToken} new_refresh_token=${newRefreshToken ?? "none"} expires_in=${data.expires_in ?? "unknown"}`
  );

  throw new Error(
    `ROTATION_SAVE_FAILED: new_refresh_token=${newRefreshToken ?? "none"} (check Vercel logs to manually restore). Original save error: ${lastSaveError instanceof Error ? lastSaveError.message : String(lastSaveError)}`
  );
}

/** Returns a valid access token (refreshes if expired) */
export async function getValidWhoopToken(
  userId: string
): Promise<string | null> {
  const stored = await getWhoopToken(userId);
  console.log("[getValidWhoopToken] stored token found:", !!stored, "expires_at:", stored?.expires_at);
  if (!stored) return null;

  // Check expiry (with 60s buffer)
  if (stored.expires_at) {
    const expiresAt = new Date(stored.expires_at).getTime();
    const nowMs = Date.now();
    console.log("[getValidWhoopToken] expiresAt:", new Date(expiresAt).toISOString(), "now:", new Date(nowMs).toISOString(), "expired:", nowMs >= expiresAt - 60_000);
    if (nowMs < expiresAt - 60_000) {
      console.log("[getValidWhoopToken] token still valid, returning");
      return stored.access_token;
    }
    // Expired — try refresh
    if (stored.refresh_token) {
      console.log("[getValidWhoopToken] token expired, attempting refresh...");
      let refreshed: string | null = null;
      try {
        refreshed = await refreshWhoopToken(userId, stored.refresh_token);
      } catch (err) {
        // saveWhoopToken threw during refresh — new token wasn't persisted
        console.error("[getValidWhoopToken] refresh threw (token not saved):", err);
        throw new Error("Whoop token refresh failed — please reconnect in Settings.");
      }
      if (refreshed) {
        console.log("[getValidWhoopToken] refresh succeeded");
        return refreshed;
      }
      // Whoop API rejected the refresh token (e.g. 400) — old token is invalid
      console.error("[getValidWhoopToken] refresh returned null — Whoop rejected the refresh token");
      throw new Error("Whoop token refresh failed — please reconnect in Settings.");
    }
    console.warn("[getValidWhoopToken] token expired and no refresh_token available");
    throw new Error("Whoop token expired and no refresh token available — please reconnect in Settings.");
  }

  return stored.access_token;
}

// ─── API fetching ─────────────────────────────────────────────────────────────

async function whoopGet<T>(
  path: string,
  accessToken: string
): Promise<T | null> {
  const res = await fetch(`${WHOOP_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  console.log(`[whoopGet] ${path} → status ${res.status}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[whoopGet] ${path} error body:`, body);
    return null;
  }
  const data = await res.json();
  console.log(`[whoopGet] ${path} response:`, JSON.stringify(data).slice(0, 500));
  return data;
}

/** Fetch the most recent Whoop data for a user */
export async function fetchWhoopData(
  accessToken: string
): Promise<WhoopData> {
  // Fetch cycle first — we need the cycleId to fetch recovery
  const cycleRes = await whoopGet<{ records: WhoopCycle[] }>(`/cycle?limit=1`, accessToken);
  console.log("[fetchWhoopData] cycleRes:", JSON.stringify(cycleRes));

  const cycle = cycleRes?.records?.[0] ?? null;
  const cycleId = cycle?.id ?? null;

  // Fetch recovery, sleep, and workouts in parallel (recovery needs cycleId)
  const [recoveryRes, sleepRes, workoutRes] = await Promise.all([
    cycleId
      ? whoopGet<WhoopRecovery>(`/cycle/${cycleId}/recovery`, accessToken)
      : Promise.resolve(null),
    whoopGet<{ records: WhoopSleep[] }>(`/activity/sleep?limit=1`, accessToken),
    whoopGet<{ records: WhoopWorkout[] }>(`/activity/workout?limit=10`, accessToken),
  ]);

  console.log("[fetchWhoopData] recoveryRes:", JSON.stringify(recoveryRes));
  console.log("[fetchWhoopData] sleepRes:", JSON.stringify(sleepRes));
  console.log("[fetchWhoopData] workoutRes count:", workoutRes?.records?.length ?? 0);

  // Find latest non-nap sleep
  const sleeps = sleepRes?.records ?? [];
  const mainSleep = sleeps.find((s) => !s.nap) ?? sleeps[0] ?? null;

  return {
    recovery: recoveryRes ?? null,
    sleep: mainSleep,
    cycle,
    workouts: workoutRes?.records ?? [],
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Recovery helpers ─────────────────────────────────────────────────────────

export function recoveryColor(score: number): string {
  if (score >= 67) return "text-emerald-500 dark:text-emerald-400";
  if (score >= 34) return "text-yellow-500 dark:text-yellow-400";
  return "text-red-500 dark:text-red-400";
}

export function recoveryBgColor(score: number): string {
  if (score >= 67) return "bg-emerald-500";
  if (score >= 34) return "bg-yellow-500";
  return "bg-red-500";
}

export function recoveryLabel(score: number): string {
  if (score >= 67) return "Ready";
  if (score >= 34) return "Moderate";
  return "Low";
}

export function formatSleepDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}
