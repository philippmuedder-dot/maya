"use client";

import { useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface EatingWindow {
  id: string;
  date: string; // "YYYY-MM-DD"
  first_meal_time: string | null; // "HH:MM:SS" from PostgreSQL TIME
  last_meal_time: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Parse "HH:MM" or "HH:MM:SS" → total minutes since midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Returns { hours, mins } of eating window, or null if invalid */
function calcWindowDuration(
  first: string,
  last: string
): { hours: number; mins: number } | null {
  const diff = timeToMinutes(last) - timeToMinutes(first);
  if (diff <= 0) return null;
  return { hours: Math.floor(diff / 60), mins: diff % 60 };
}

/** Format a local date as "YYYY-MM-DD" (avoids UTC offset issues) */
function localDateStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Count consecutive days (going back from today) where both meals are logged
 * and the eating window is ≤ 8 hours. Any gap or window > 8 hr breaks the streak.
 */
function calcStreak(windows: EatingWindow[]): number {
  const sorted = [...windows].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (let i = 0; i < sorted.length; i++) {
    const w = sorted[i];
    if (!w.first_meal_time || !w.last_meal_time) break;

    // The expected date for position i is today − i days
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (w.date !== localDateStr(expected)) break; // gap in data

    const dur = calcWindowDuration(w.first_meal_time, w.last_meal_time);
    if (!dur || dur.hours * 60 + dur.mins > 8 * 60) break;
    streak++;
  }
  return streak;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function EatingWindowSection() {
  const [windows, setWindows] = useState<EatingWindow[]>([]);
  const [firstMeal, setFirstMeal] = useState("");
  const [lastMeal, setLastMeal] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fetch last 30 records on mount; pre-fill form if today already logged
  useEffect(() => {
    fetch("/api/eating-windows")
      .then((r) => r.json())
      .then((data: EatingWindow[]) => {
        if (!Array.isArray(data)) return;
        setWindows(data);
        const todayRecord = data.find((w) => w.date === localDateStr()) ?? null;
        if (todayRecord) {
          setFirstMeal(todayRecord.first_meal_time?.slice(0, 5) ?? "");
          setLastMeal(todayRecord.last_meal_time?.slice(0, 5) ?? "");
        }
      })
      .catch(console.error);
  }, []);

  // Auto-clear saved indicator after 3s
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/eating-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_meal_time: firstMeal || null,
          last_meal_time: lastMeal || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      // Update local list so streak recalculates immediately
      setWindows((prev) => {
        const without = prev.filter((w) => w.date !== data.date);
        return [data, ...without];
      });
      setSaved(true);
    } catch (err) {
      console.error("[EatingWindowSection] save error:", err);
    } finally {
      setSaving(false);
    }
  }

  const duration =
    firstMeal && lastMeal ? calcWindowDuration(firstMeal, lastMeal) : null;
  const windowMins = duration ? duration.hours * 60 + duration.mins : null;
  const isGoodWindow = windowMins !== null && windowMins <= 8 * 60;
  const streak = calcStreak(windows);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Eating Window
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Log today&apos;s first and last meal
          </p>
        </div>
        {streak > 0 && (
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-none">
              🔥 {streak}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              day streak
            </div>
          </div>
        )}
      </div>

      {/* Time inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            First meal today
          </label>
          <input
            type="time"
            value={firstMeal}
            onChange={(e) => setFirstMeal(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Last meal today
          </label>
          <input
            type="time"
            value={lastMeal}
            onChange={(e) => setLastMeal(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>
      </div>

      {/* Window duration badge */}
      {duration && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            isGoodWindow
              ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
          }`}
        >
          <span className="text-base shrink-0">{isGoodWindow ? "✅" : "⚠️"}</span>
          <div>
            <span
              className={`text-sm font-semibold ${
                isGoodWindow
                  ? "text-emerald-800 dark:text-emerald-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}
            >
              {duration.hours}h{duration.mins > 0 ? ` ${duration.mins}m` : ""} window
            </span>
            <span
              className={`text-xs ml-2 ${
                isGoodWindow
                  ? "text-emerald-600 dark:text-emerald-500"
                  : "text-amber-600 dark:text-amber-500"
              }`}
            >
              {isGoodWindow ? "≤ 8hr — IF goal met" : "> 8hr — outside IF window"}
            </span>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || (!firstMeal && !lastMeal)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Saved
          </span>
        )}
      </div>

      {/* Direct Light reminder */}
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3 py-2 flex items-start gap-2">
        <span className="text-sm shrink-0">☀️</span>
        <p className="text-xs text-amber-800 dark:text-amber-400">
          <strong>Direct Light digestion</strong> — eat in natural light, not at a dark desk. This is your Human Design.
        </p>
      </div>
    </div>
  );
}
