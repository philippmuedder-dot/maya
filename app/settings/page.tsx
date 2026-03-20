"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type WhoopStatus = "loading" | "connected" | "disconnected" | "error";

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
        connected
          ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-neutral-400"}`}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

/**
 * Inner component — needs Suspense wrapper because it calls useSearchParams().
 * Initialises Whoop status from the URL synchronously so there is no race
 * condition between the URL-param result and the async API check.
 */
function SettingsContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  // Derive initial state directly from URL params (synchronous — no race)
  const urlWhoop = searchParams.get("whoop");
  const urlReason = searchParams.get("reason");

  const [whoopStatus, setWhoopStatus] = useState<WhoopStatus>(() => {
    if (urlWhoop === "connected") return "connected";
    if (urlWhoop === "error") return "disconnected";
    return "loading";
  });

  const [whoopMessage, setWhoopMessage] = useState<string | null>(() => {
    if (urlWhoop === "connected") return "Whoop connected successfully.";
    if (urlWhoop === "error")
      return `Connection failed: ${urlReason ?? "unknown error"}`;
    return null;
  });

  const [disconnecting, setDisconnecting] = useState(false);

  // Check Supabase-backed status only when the URL gives no answer
  const checkWhoopStatus = useCallback(async () => {
    setWhoopStatus("loading");
    const res = await fetch("/api/whoop/status");
    if (!res.ok) {
      setWhoopStatus("disconnected");
      return;
    }
    const { connected } = await res.json();
    setWhoopStatus(connected ? "connected" : "disconnected");
  }, []);

  useEffect(() => {
    // URL already gave us a definitive answer — skip the API check
    if (urlWhoop === "connected" || urlWhoop === "error") return;

    if (status === "authenticated") {
      checkWhoopStatus();
    } else if (status === "unauthenticated") {
      setWhoopStatus("disconnected");
    }
  }, [status, urlWhoop, checkWhoopStatus]);

  const handleDisconnectWhoop = async () => {
    setDisconnecting(true);
    await fetch("/api/whoop/data", { method: "DELETE" });
    setWhoopStatus("disconnected");
    setWhoopMessage("Whoop disconnected.");
    setDisconnecting(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Settings
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Manage your connections and account.
        </p>
      </div>

      {whoopMessage && (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900">
          {whoopMessage}
        </div>
      )}

      {/* Account */}
      <SectionCard title="Account">
        {session ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {session.user?.name}
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                {session.user?.email}
              </p>
              {session.error === "RefreshAccessTokenError" && (
                <p className="text-xs text-red-500 mt-1">
                  Session expired — please sign in again.
                </p>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors border border-neutral-200 dark:border-neutral-700 px-3 py-1.5 rounded-lg"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="text-sm font-medium px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity"
          >
            Sign in with Google
          </button>
        )}
      </SectionCard>

      {/* Google Calendar */}
      <SectionCard title="Google Calendar">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Read-only access to your primary calendar
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              Connected via Google sign-in
            </p>
          </div>
          <StatusBadge connected={!!session} />
        </div>
      </SectionCard>

      {/* Whoop */}
      <SectionCard title="Whoop">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Recovery score, HRV, sleep stages, and strain
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              OAuth 2.0 — token stored securely in Supabase
            </p>
          </div>
          <div className="shrink-0 ml-4">
            {whoopStatus === "loading" ? (
              <div className="h-5 w-20 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
            ) : whoopStatus === "connected" ? (
              <div className="flex items-center gap-3">
                <StatusBadge connected />
                <button
                  onClick={handleDisconnectWhoop}
                  disabled={disconnecting}
                  className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            ) : (
              <a
                href="/api/whoop/auth"
                className="inline-block text-xs font-medium px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity"
              >
                Connect Whoop
              </a>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Human Design (read-only) */}
      <SectionCard title="Human Design Profile">
        <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
          {[
            ["Type", "Generator"],
            ["Strategy", "Responding"],
            ["Authority", "Sacral"],
            ["Profile", "3/5 — The Great Life Experimenter"],
            ["Not-self", "Frustration"],
            ["Alignment", "Satisfaction"],
            ["Cross", "Right Angle Cross of Maya 3 (32/42 | 62/61)"],
            ["Environment", "Blending Caves"],
            ["Digestion", "Direct Light"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-neutral-400 dark:text-neutral-500 w-28 shrink-0">
                {label}
              </span>
              <span>{value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3">
          This profile is hardcoded — it never changes.
        </p>
      </SectionCard>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}
