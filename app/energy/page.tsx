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

// ─── Stress Patterns ──────────────────────────────────────────────────────────

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
      {correlation && (
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{correlation}</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Based on {checkinsCount} check-ins
          </p>
        </div>
      )}

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

// ─── Mood Trend Graph ─────────────────────────────────────────────────────────

interface TrendDay {
  date: string;
  energyScore: number | null;
  stressLevel: number | null;
  mood: string | null;
}

function moodToScore(mood: string | null): number | null {
  if (!mood) return null;
  const lower = mood.toLowerCase();
  if (lower.includes("thri")) return 5;
  if (lower.includes("build") || lower.includes("great") || lower.includes("good")) return 4;
  if (lower.includes("neutral") || lower.includes("ok") || lower.includes("fine")) return 3;
  if (lower.includes("tired") || lower.includes("low")) return 2;
  if (lower.includes("frust") || lower.includes("drain") || lower.includes("bad")) return 1;
  return 3;
}

function MoodTrendGraph() {
  const [days, setDays] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/energy/trend")
      .then((r) => r.json())
      .then((data) => setDays(data.days ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-40 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const hasData = days.some(
    (d) => d.energyScore !== null || d.stressLevel !== null || d.mood !== null
  );

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No trend data yet. Complete daily check-ins and log energy to unlock the 30-day view.
        </p>
      </div>
    );
  }

  const W = 600;
  const H = 120;
  const PADDING = { top: 8, right: 8, bottom: 24, left: 28 };
  const chartW = W - PADDING.left - PADDING.right;
  const chartH = H - PADDING.top - PADDING.bottom;

  function toX(i: number) {
    return PADDING.left + (i / (days.length - 1)) * chartW;
  }

  // Energy: 0–2 → normalize to 0–1
  function energyY(v: number) {
    return PADDING.top + chartH - (v / 2) * chartH;
  }
  // Stress: 1–10 → normalize inverted (low stress = high on chart)
  function stressY(v: number) {
    return PADDING.top + ((v - 1) / 9) * chartH;
  }
  // Mood: 1–5 → normalize
  function moodY(v: number) {
    return PADDING.top + chartH - ((v - 1) / 4) * chartH;
  }

  function buildPath(points: (number | null)[], yFn: (v: number) => number) {
    const parts: string[] = [];
    let inSegment = false;
    for (let i = 0; i < days.length; i++) {
      const v = points[i];
      if (v === null) {
        inSegment = false;
        continue;
      }
      const x = toX(i);
      const y = yFn(v);
      if (!inSegment) {
        parts.push(`M ${x} ${y}`);
        inSegment = true;
      } else {
        parts.push(`L ${x} ${y}`);
      }
    }
    return parts.join(" ");
  }

  const energyPoints = days.map((d) => d.energyScore);
  const stressPoints = days.map((d) => d.stressLevel !== null ? d.stressLevel : null);
  const moodPoints = days.map((d) => moodToScore(d.mood));

  // Y-axis labels
  const yLabels = [
    { y: PADDING.top, label: "Hi" },
    { y: PADDING.top + chartH / 2, label: "Mid" },
    { y: PADDING.top + chartH, label: "Lo" },
  ];

  // X-axis: show every 5th day label
  const xLabels = days
    .map((d, i) => ({ i, d }))
    .filter(({ i }) => i === 0 || i === days.length - 1 || i % 7 === 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 280, height: 120 }}
        >
          {/* Grid lines */}
          {yLabels.map(({ y, label }) => (
            <g key={label}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={W - PADDING.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 4}
                y={y + 4}
                textAnchor="end"
                fontSize={8}
                fill="currentColor"
                opacity={0.4}
              >
                {label}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map(({ i, d }) => {
            const date = new Date(d.date + "T12:00:00");
            return (
              <text
                key={d.date}
                x={toX(i)}
                y={H - 4}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                opacity={0.4}
              >
                {DAY_ABBR[date.getDay()]} {date.getDate()}
              </text>
            );
          })}

          {/* Energy line — green */}
          <path
            d={buildPath(energyPoints, energyY)}
            fill="none"
            stroke="#10b981"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Mood line — blue */}
          <path
            d={buildPath(moodPoints, moodY)}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="4 2"
          />

          {/* Stress line — red (inverted: high stress = bad) */}
          <path
            d={buildPath(stressPoints, stressY)}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="2 2"
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-emerald-500 rounded" />
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Energy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-blue-500 rounded" style={{ borderTop: "2px dashed" }} />
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Mood</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-red-500 rounded" style={{ borderTop: "2px dashed" }} />
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">Stress</span>
        </div>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 ml-auto">30 days</span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EnergyPage() {
  const [logs, setLogs] = useState<EnergyLog[]>([]);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"track" | "trends" | "patterns">("track");

  // Form state
  const [people, setPeople] = useState("");
  const [feeling, setFeeling] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/energy")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs ?? []);
        setTodayMood(data.todayMood ?? null);
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
          drain_source: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLogs((prev) => [data, ...prev]);
        // Reset form for next entry
        setPeople("");
        setFeeling("");
        setNotes("");
      }
    } catch (err) {
      console.error("Failed to save energy log:", err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteLog(id: string) {
    try {
      await fetch("/api/energy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setLogs((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error("Failed to delete log:", err);
    }
  }

  // Build 14-day chart data (average per day for multiple logs)
  const chartDays = buildChartDays(logs);

  // Today's logs
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter((l) => l.date === todayStr);

  // Daily score: average of today's entries
  const todayScore = todayLogs.length > 0
    ? todayLogs.reduce((sum, l) => {
        return sum + (l.feeling === "energized" ? 1 : l.feeling === "drained" ? -1 : 0);
      }, 0) / todayLogs.length
    : null;

  // Weekly energy balance (last 7 days)
  const last7 = chartDays.slice(-7);
  const weekScore = last7.reduce((sum, d) => {
    if (d.avgScore === null) return sum;
    return sum + d.avgScore;
  }, 0);
  const daysWithData = last7.filter((d) => d.avgScore !== null).length;

  // Show Not-Self check?
  const showNotSelf = todayMood === "Frustrated" || feeling === "drained" ||
    todayLogs.some((l) => l.feeling === "drained");

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
        {(["track", "trends", "patterns"] as const).map((tab) => (
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

      {activeTab === "trends" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              30-Day Trend
            </h2>
            <MoodTrendGraph />
          </div>
        </div>
      )}

      {activeTab === "track" && (
        <>
          {/* Add Entry Form */}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Log an Interaction
            </h2>

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Person or situation
              </label>
              <input
                type="text"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                placeholder="e.g. team standup, solo deep work, call with Anna"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                Energy impact
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

            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                Notes <span className="text-neutral-400">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. back-to-back meetings, great creative session"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>

            <button
              onClick={saveLog}
              disabled={saving || !feeling}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving..." : "Add Entry"}
            </button>
          </div>

          {/* Today's Entries */}
          {todayLogs.length > 0 && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Today&apos;s Interactions
                  <span className="text-xs font-normal text-neutral-400 ml-2">
                    {todayLogs.length} entr{todayLogs.length === 1 ? "y" : "ies"}
                  </span>
                </h2>
                {todayScore !== null && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    todayScore > 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : todayScore < 0
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}>
                    {todayScore > 0 ? "Net positive" : todayScore < 0 ? "Net drain" : "Balanced"}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {todayLogs.map((log) => {
                  const time = new Date(log.created_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });
                  return (
                    <div key={log.id} className="flex items-start gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                      <span className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${
                        log.feeling === "energized" ? "bg-emerald-500" :
                        log.feeling === "drained" ? "bg-red-500" : "bg-amber-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {log.people && (
                            <span className="text-sm text-neutral-900 dark:text-neutral-100 font-medium truncate">
                              {log.people}
                            </span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            log.feeling === "energized"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : log.feeling === "drained"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}>
                            {FEELING_LABELS[log.feeling]}
                          </span>
                        </div>
                        {log.drain_source && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{log.drain_source}</p>
                        )}
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{time}</p>
                      </div>
                      <button
                        onClick={() => deleteLog(log.id)}
                        className="shrink-0 p-1 rounded text-neutral-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Remove"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                  {day.avgScore !== null ? (
                    <div
                      className={`w-full rounded-t transition-all ${
                        day.avgScore > 0
                          ? BAR_COLORS.energized + " " + BAR_HEIGHTS.energized
                          : day.avgScore < 0
                            ? BAR_COLORS.drained + " " + BAR_HEIGHTS.drained
                            : BAR_COLORS.neutral + " " + BAR_HEIGHTS.neutral
                      } min-h-[4px]`}
                    />
                  ) : (
                    <div className="w-full h-full rounded border border-dashed border-neutral-300 dark:border-neutral-700" />
                  )}
                </div>
              ))}
            </div>

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

            <div className="flex gap-4 pt-1">
              {FEELINGS.map((f) => (
                <div key={f} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${BAR_COLORS[f]}`} />
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
                  {weekScore > 0 ? `+${weekScore.toFixed(1)}` : weekScore.toFixed(1)}
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
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChartDays(logs: EnergyLog[]) {
  const days: { date: string; avgScore: number | null }[] = [];

  // Group logs by date and compute average score
  const logsByDate = new Map<string, EnergyLog[]>();
  logs.forEach((l) => {
    if (!logsByDate.has(l.date)) logsByDate.set(l.date, []);
    logsByDate.get(l.date)!.push(l);
  });

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLogs = logsByDate.get(dateStr);
    if (dayLogs && dayLogs.length > 0) {
      const avg = dayLogs.reduce((sum, l) => {
        return sum + (l.feeling === "energized" ? 1 : l.feeling === "drained" ? -1 : 0);
      }, 0) / dayLogs.length;
      days.push({ date: dateStr, avgScore: avg });
    } else {
      days.push({ date: dateStr, avgScore: null });
    }
  }

  return days;
}
