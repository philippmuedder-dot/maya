"use client";

import { useEffect, useState } from "react";

interface EnergyLog {
  id: string;
  user_id: string;
  date: string;
  people: string | null;
  feeling: "energized" | "neutral" | "drained";
  drain_source: string | null;
  created_at: string;
}

const FEELINGS = ["energized", "neutral", "drained"] as const;

const FEELING_STYLES: Record<string, string> = {
  energized:
    "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700",
  neutral:
    "bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:border-neutral-600",
  drained:
    "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
};

const FEELING_SELECTED: Record<string, string> = {
  energized:
    "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600",
  neutral:
    "bg-neutral-500 text-white border-neutral-500 dark:bg-neutral-500 dark:border-neutral-500",
  drained:
    "bg-red-500 text-white border-red-500 dark:bg-red-600 dark:border-red-600",
};

const FEELING_LABELS: Record<string, string> = {
  energized: "Energized",
  neutral: "Neutral",
  drained: "Drained",
};

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const BAR_COLORS: Record<string, string> = {
  energized: "bg-emerald-500 dark:bg-emerald-400",
  neutral: "bg-amber-400 dark:bg-amber-400",
  drained: "bg-red-500 dark:bg-red-400",
};

const BAR_HEIGHTS: Record<string, string> = {
  energized: "h-full",
  neutral: "h-2/3",
  drained: "h-1/3",
};

interface StressPattern {
  trigger: string;
  frequency: number;
  impact_on_recovery: string;
  suggestion: string;
}

function StressPatterns() {
  const [patterns, setPatterns] = useState<StressPattern[]>([]);
  const [peakDays, setPeakDays] = useState<string[]>([]);
  const [correlation, setCorrelation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [insufficientData, setInsufficientData] = useState(false);
  const [checkinsCount, setCheckinsCount] = useState(0);
  const [checkinsNeeded, setCheckinsNeeded] = useState(14);

  useEffect(() => {
    fetch("/api/insights/stress")
      .then((r) => r.json())
      .then((data) => {
        setPatterns(data.patterns ?? []);
        setPeakDays(data.peak_stress_days ?? []);
        setCorrelation(data.stress_recovery_correlation ?? null);
        setInsufficientData(data.insufficient_data ?? false);
        setCheckinsCount(data.checkins_count ?? 0);
        setCheckinsNeeded(data.checkins_needed ?? 14);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (insufficientData) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 mx-auto flex items-center justify-center">
          <svg className="h-6 w-6 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Building stress patterns
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {checkinsCount} of {checkinsNeeded} daily check-ins completed. Keep checking in to unlock stress-recovery correlations.
        </p>
        <div className="w-48 mx-auto">
          <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100 transition-all"
              style={{ width: `${Math.min(100, (checkinsCount / checkinsNeeded) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stress-recovery correlation summary */}
      {correlation && (
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{correlation}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Based on {checkinsCount} check-ins
          </p>
        </div>
      )}

      {/* Peak stress days */}
      {peakDays.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
            Peak Stress Days
          </h3>
          <div className="flex gap-2 flex-wrap">
            {peakDays.map((day) => (
              <span
                key={day}
                className="text-xs font-medium px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              >
                {day}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stress trigger patterns */}
      {patterns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Recurring Stress Triggers
          </h3>
          {patterns.map((p, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{p.trigger}</h4>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                  {p.frequency}x in 30 days
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{p.impact_on_recovery}</p>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
                <p className="text-xs text-emerald-800 dark:text-emerald-400">{p.suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EnergyPage() {
  const [logs, setLogs] = useState<EnergyLog[]>([]);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"track" | "patterns">("track");

  // Form state
  const [people, setPeople] = useState("");
  const [feeling, setFeeling] = useState<string>("");
  const [drainSource, setDrainSource] = useState("");

  useEffect(() => {
    fetch("/api/energy")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs ?? []);
        setTodayMood(data.todayMood ?? null);

        // Pre-fill if today's log exists
        const today = new Date().toISOString().split("T")[0];
        const todayLog = (data.logs ?? []).find(
          (l: EnergyLog) => l.date === today
        );
        if (todayLog) {
          setPeople(todayLog.people ?? "");
          setFeeling(todayLog.feeling ?? "");
          setDrainSource(todayLog.drain_source ?? "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function saveLog() {
    if (!feeling) return;
    setSaving(true);

    try {
      const res = await fetch("/api/energy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people: people.trim() || null,
          feeling,
          drain_source: feeling === "drained" ? drainSource.trim() || null : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const today = new Date().toISOString().split("T")[0];
        setLogs((prev) => {
          const without = prev.filter((l) => l.date !== today);
          return [data, ...without];
        });
      }
    } catch (err) {
      console.error("Failed to save energy log:", err);
    } finally {
      setSaving(false);
    }
  }

  // Build 14-day chart data
  const chartDays = buildChartDays(logs);

  // Weekly energy balance (last 7 days)
  const last7 = chartDays.slice(-7);
  const weekScore = last7.reduce((sum, d) => {
    if (d.feeling === "energized") return sum + 1;
    if (d.feeling === "drained") return sum - 1;
    return sum;
  }, 0);
  const daysWithData = last7.filter((d) => d.feeling).length;

  // Show Not-Self check?
  const showNotSelf =
    todayMood === "Frustrated" || feeling === "drained";

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLog = logs.find((l) => l.date === todayStr);

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-48" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-64" />
          <div className="h-40 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
          <div className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Energy
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Track who and what affects your energy levels.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {(["track", "patterns"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100"
                : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "patterns" && <StressPatterns />}

      {activeTab === "track" && (<>
      {/* Daily Energy Log Form */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Today&apos;s Energy Log
          </h2>
          {todayLog && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Logged
            </span>
          )}
        </div>

        {/* People input */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Who are you spending time with today?
          </label>
          <input
            type="text"
            value={people}
            onChange={(e) => setPeople(e.target.value)}
            placeholder="e.g. team standup, solo deep work, dinner with Anna"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>

        {/* Feeling pills */}
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            How does your energy feel?
          </label>
          <div className="flex gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFeeling(feeling === f ? "" : f)}
                className={`text-sm px-4 py-2 rounded-full border font-medium transition-colors ${
                  feeling === f ? FEELING_SELECTED[f] : FEELING_STYLES[f]
                }`}
              >
                {FEELING_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Drain source — only when drained */}
        {feeling === "drained" && (
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              What drained you most?
            </label>
            <input
              type="text"
              value={drainSource}
              onChange={(e) => setDrainSource(e.target.value)}
              placeholder="e.g. back-to-back meetings, conflict with X, decision fatigue"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
          </div>
        )}

        {/* Save */}
        <button
          onClick={saveLog}
          disabled={saving || !feeling}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : todayLog ? "Update" : "Save"}
        </button>
      </div>

      {/* Not-Self Check */}
      {showNotSelf && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-2">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Is this feeling actually yours?
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
            With your undefined solar plexus, you absorb others&apos; emotions.
            Before acting on this feeling, wait and see if it fades. If the
            frustration or drain lifts when you step away from certain people or
            environments, it was never yours to begin with.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Generator strategy: wait for clarity before responding.
          </p>
        </div>
      )}

      {/* Energy Pattern — Last 14 Days */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Energy Pattern
          <span className="font-normal text-neutral-400 dark:text-neutral-500 ml-1">
            Last 14 days
          </span>
        </h2>

        <div className="flex items-end gap-1.5 h-24">
          {chartDays.map((day) => (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              {day.feeling ? (
                <div
                  className={`w-full rounded-t ${BAR_COLORS[day.feeling]} ${BAR_HEIGHTS[day.feeling]} min-h-[4px] transition-all`}
                />
              ) : (
                <div className="w-full h-full rounded border border-dashed border-neutral-300 dark:border-neutral-700" />
              )}
            </div>
          ))}
        </div>

        {/* Date labels */}
        <div className="flex gap-1.5">
          {chartDays.map((day) => {
            const d = new Date(day.date + "T12:00:00");
            const isToday = day.date === todayStr;
            return (
              <div
                key={day.date}
                className={`flex-1 text-center text-[10px] ${
                  isToday
                    ? "font-bold text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {DAY_ABBR[d.getDay()]}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 pt-1">
          {FEELINGS.map((f) => (
            <div key={f} className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-sm ${BAR_COLORS[f]}`}
              />
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {FEELING_LABELS[f]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Energy Balance */}
      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Weekly Energy Balance
        </h2>
        {daysWithData === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            No data this week yet.
          </p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                weekScore > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : weekScore < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {weekScore > 0 ? `+${weekScore}` : weekScore}
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {weekScore > 0
                ? "Net positive this week"
                : weekScore < 0
                  ? "Energy deficit"
                  : "Balanced energy this week"}
            </span>
          </div>
        )}
        {daysWithData > 0 && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Based on {daysWithData} day{daysWithData !== 1 ? "s" : ""} of data
            (energized = +1, neutral = 0, drained = -1)
          </p>
        )}
      </div>
      </>)}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChartDays(logs: EnergyLog[]) {
  const days: { date: string; feeling: string | null }[] = [];
  const logMap = new Map<string, string>();
  logs.forEach((l) => logMap.set(l.date, l.feeling));

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      feeling: logMap.get(dateStr) ?? null,
    });
  }

  return days;
}
