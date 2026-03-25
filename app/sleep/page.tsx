"use client";

import { useEffect, useState } from "react";
import BreathworkSection from "@/components/BreathworkSection";

interface SleepStages {
  light: number;
  deep: number;
  rem: number;
  awake: number;
}

interface SleepLogEntry {
  date: string;
  duration_hrs: number;
  performance_pct: number;
  efficiency_pct: number;
  stages: SleepStages;
}

interface Supplement {
  name: string;
  dose: number | null;
  unit: string | null;
  timing: string;
}

interface SleepData {
  bedtime: {
    time: string;
    wake_time: string;
    event_summary: string;
    event_time: string;
  } | null;
  winddown: {
    stress_level: number | null;
    tomorrow_load: string;
    protocol: string[];
  };
  supplements: Supplement[];
  sleep_log: SleepLogEntry[];
  sleep_debt: number | null;
}

function durationColor(hrs: number): string {
  if (hrs >= 7.5) return "text-emerald-600 dark:text-emerald-400";
  if (hrs >= 6) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function debtColor(debt: number): string {
  if (debt < 2) return "bg-emerald-500";
  if (debt <= 5) return "bg-yellow-500";
  return "bg-red-500";
}

function debtTextColor(debt: number): string {
  if (debt < 2) return "text-emerald-600 dark:text-emerald-400";
  if (debt <= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function SleepPage() {
  const [data, setData] = useState<SleepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sleep")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load sleep data");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-56" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Sleep</h1>
        <div className="rounded-xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const debtAbs = Math.abs(data.sleep_debt ?? 0);
  const debtIsPositive = (data.sleep_debt ?? 0) > 0;
  // Cap the bar at 10 hours for visualization
  const debtBarPct = Math.min((debtAbs / 10) * 100, 100);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Sleep</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Optimize your rest and recovery
        </p>
      </div>

      {/* ─── Bedtime Calculator ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="flex items-center gap-2 mb-3">
          <svg className="h-5 w-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Bedtime Calculator
          </h2>
        </div>
        {data.bedtime ? (
          <div>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {data.bedtime.time}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              For 8hrs sleep before your {data.bedtime.event_time}{" "}
              {data.bedtime.event_summary}
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No events scheduled tomorrow — sleep when your body says yes
          </p>
        )}
      </div>

      {/* ─── Evening Wind-Down Protocol ───────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Evening Wind-Down Protocol
        </h2>

        <div className="flex items-center gap-3 mb-4">
          {data.winddown.stress_level !== null ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
              Stress: {data.winddown.stress_level}/10
            </span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              No checkin today
            </span>
          )}
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              data.winddown.tomorrow_load === "heavy"
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                : data.winddown.tomorrow_load === "moderate"
                  ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
            }`}
          >
            Tomorrow: {data.winddown.tomorrow_load}
          </span>
        </div>

        <div className="space-y-2">
          {data.winddown.protocol.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded border-2 border-neutral-300 dark:border-neutral-600 shrink-0" />
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Sleep Debt Tracker ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Sleep Debt Tracker
        </h2>
        {data.sleep_debt !== null ? (
          <div>
            <p className={`text-2xl font-bold ${debtTextColor(debtAbs)}`}>
              {debtIsPositive ? "-" : "+"}{debtAbs}hrs
              <span className="text-sm font-normal text-neutral-400 ml-2">this week</span>
            </p>
            <div className="mt-3 relative">
              {/* Background bar */}
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
                {debtAbs > 0 && (
                  <div
                    className={`h-3 rounded-full transition-all ${debtColor(debtAbs)}`}
                    style={{ width: `${debtBarPct}%` }}
                  />
                )}
              </div>
              {/* Labels */}
              <div className="flex justify-between mt-1">
                <span className="text-xs text-neutral-400">0hrs (target)</span>
                <span className="text-xs text-neutral-400">10hrs debt</span>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {debtAbs < 2
                ? "Sleep debt is low — you are well-rested"
                : debtAbs <= 5
                  ? "Moderate sleep debt — prioritize an earlier bedtime"
                  : "High sleep debt — recovery should be your top priority"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Connect Whoop in Settings to track sleep debt
          </p>
        )}
      </div>

      {/* ─── Pre-Sleep Supplements ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Pre-Sleep Supplements
        </h2>
        {data.supplements.length > 0 ? (
          <div className="space-y-2">
            {data.supplements.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"
              >
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {s.name}
                </span>
                <div className="flex items-center gap-2">
                  {s.dose && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {s.dose}{s.unit || ""}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.timing === "evening"
                        ? "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                        : "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                    }`}
                  >
                    {s.timing === "evening" ? "Evening" : "Night"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No evening supplements configured
          </p>
        )}
      </div>

      {/* ─── HRV Training / Breathwork ──────────────────────────────────────────── */}
      <BreathworkSection />

      {/* ─── Sleep Log (Last 7 Nights) ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Sleep Log (Last 7 Nights)
        </h2>
        {data.sleep_log.length > 0 ? (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-2 pr-3">
                    Date
                  </th>
                  <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-2 px-2">
                    Duration
                  </th>
                  <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-2 px-2">
                    Perf
                  </th>
                  <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-2 px-2">
                    Eff
                  </th>
                  <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-2 px-2">
                    Deep
                  </th>
                  <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 pb-2 pl-2">
                    REM
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.sleep_log.map((night, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                  >
                    <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                      {formatDate(night.date)}
                    </td>
                    <td className={`py-2 px-2 text-right font-medium whitespace-nowrap ${durationColor(night.duration_hrs)}`}>
                      {night.duration_hrs.toFixed(1)}h
                    </td>
                    <td className="py-2 px-2 text-right text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {Math.round(night.performance_pct)}%
                    </td>
                    <td className="py-2 px-2 text-right text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {Math.round(night.efficiency_pct)}%
                    </td>
                    <td className="py-2 px-2 text-right text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {night.stages.deep.toFixed(1)}h
                    </td>
                    <td className="py-2 pl-2 text-right text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                      {night.stages.rem.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Connect Whoop in Settings to see sleep data
          </p>
        )}
      </div>
    </div>
  );
}
