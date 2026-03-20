"use client";

import { useEffect, useState } from "react";
import {
  WhoopData,
  recoveryColor,
  recoveryLabel,
  formatSleepDuration,
} from "@/lib/whoop";
import { RecoveryRing } from "@/components/RecoveryRing";

function StatCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueClass ?? "text-neutral-900 dark:text-neutral-100"}`}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{sub}</p>
      )}
    </div>
  );
}


export function WhoopPanel() {
  const [data, setData] = useState<WhoopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notConnected, setNotConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const statusRes = await fetch("/api/whoop/status");
        if (!statusRes.ok) { setNotConnected(true); return; }
        const { connected } = await statusRes.json();
        if (!connected) { setNotConnected(true); return; }

        const dataRes = await fetch("/api/whoop/data");
        if (!dataRes.ok) {
          setError(`Could not load Whoop data (${dataRes.status}).`);
          return;
        }
        setData(await dataRes.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="h-4 w-40 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (notConnected) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Whoop Recovery
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          Connect your Whoop to see recovery data here.
        </p>
        <a
          href="/settings"
          className="inline-block text-xs font-medium px-3 py-1.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity"
        >
          Connect in Settings →
        </a>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          Whoop Recovery
        </h2>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          {error ?? "No data available."}
        </p>
      </div>
    );
  }

  const recovery = data.recovery;
  const sleep = data.sleep;
  const cycle = data.cycle;
  const score = recovery?.score?.recovery_score ?? 0;
  const hrv = recovery?.score?.hrv_rmssd_milli;
  const rhr = recovery?.score?.resting_heart_rate;
  const sleepPerf = sleep?.score?.sleep_performance_percentage;
  const strain = cycle?.score?.strain;
  const totalSleepMs =
    sleep?.score?.stage_summary
      ? (sleep.score.stage_summary.total_light_sleep_time_milli ?? 0) +
        (sleep.score.stage_summary.total_slow_wave_sleep_time_milli ?? 0) +
        (sleep.score.stage_summary.total_rem_sleep_time_milli ?? 0)
      : null;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Whoop Recovery
        </h2>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {data.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : ""}
        </span>
      </div>

      <div className="p-5">
        {!recovery ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            No recovery data yet — Whoop may still be processing.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Recovery ring + label */}
            <div className="flex items-center gap-5">
              <RecoveryRing score={score} showScore={false} />
              <div>
                <p className={`text-3xl font-bold ${recoveryColor(score)}`}>
                  {score}%
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {recoveryLabel(score)} — {recovery.score_state === "SCORED" ? "Scored" : "Pending"}
                </p>
                {hrv && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                    HRV {Math.round(hrv)} ms
                  </p>
                )}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {hrv && (
                <StatCard
                  label="HRV"
                  value={`${Math.round(hrv)} ms`}
                  sub="rMSSD"
                />
              )}
              {rhr && (
                <StatCard
                  label="Resting HR"
                  value={`${Math.round(rhr)} bpm`}
                />
              )}
              {sleepPerf != null && (
                <StatCard
                  label="Sleep Performance"
                  value={`${Math.round(sleepPerf)}%`}
                  sub={totalSleepMs ? formatSleepDuration(totalSleepMs) : undefined}
                />
              )}
              {strain != null && (
                <StatCard
                  label="Day Strain"
                  value={strain.toFixed(1)}
                  sub="out of 21"
                />
              )}
            </div>

            {/* Sleep stages */}
            {sleep?.score?.stage_summary && (
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wide">
                  Sleep Stages
                </p>
                <div className="space-y-1.5">
                  {[
                    {
                      label: "REM",
                      ms: sleep.score.stage_summary.total_rem_sleep_time_milli,
                      color: "bg-indigo-400",
                    },
                    {
                      label: "Deep",
                      ms: sleep.score.stage_summary.total_slow_wave_sleep_time_milli,
                      color: "bg-blue-500",
                    },
                    {
                      label: "Light",
                      ms: sleep.score.stage_summary.total_light_sleep_time_milli,
                      color: "bg-blue-300",
                    },
                  ].map(({ label, ms, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 w-10">
                        {label}
                      </span>
                      <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{
                            width: `${Math.min(100, (ms / (totalSleepMs || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-neutral-400 dark:text-neutral-500 w-12 text-right">
                        {formatSleepDuration(ms)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
