"use client";

import { useEffect, useState } from "react";

interface WorkoutPattern {
  workout_type: string;
  avg_next_day_recovery: number;
  insight: string;
  recommendation: string;
}

export default function WorkoutPatterns() {
  const [patterns, setPatterns] = useState<WorkoutPattern[]>([]);
  const [bestTime, setBestTime] = useState<string | null>(null);
  const [bestTimeReason, setBestTimeReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [insufficientData, setInsufficientData] = useState(false);
  const [workoutsLogged, setWorkoutsLogged] = useState(0);
  const [workoutsNeeded, setWorkoutsNeeded] = useState(10);

  useEffect(() => {
    fetch("/api/insights/workouts")
      .then((r) => r.json())
      .then((data) => {
        setPatterns(data.patterns ?? []);
        setBestTime(data.best_time ?? null);
        setBestTimeReason(data.best_time_reason ?? null);
        setInsufficientData(data.insufficient_data ?? false);
        setWorkoutsLogged(data.workouts_logged ?? 0);
        setWorkoutsNeeded(data.workouts_needed ?? 10);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (insufficientData) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center space-y-2">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Building workout patterns
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {workoutsLogged} of {workoutsNeeded} workouts logged. Keep training to unlock recovery correlations.
        </p>
        <div className="w-48 mx-auto">
          <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100 transition-all"
              style={{ width: `${Math.min(100, (workoutsLogged / workoutsNeeded) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-6 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No clear workout patterns found yet. Keep logging for more data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Best time card */}
      {bestTime && (
        <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-4 flex items-start gap-3">
          <span className="text-lg shrink-0">⏰</span>
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Best workout time: <span className="capitalize">{bestTime}</span>
            </p>
            {bestTimeReason && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{bestTimeReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Pattern cards */}
      {patterns.map((p, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {p.workout_type}
            </h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              p.avg_next_day_recovery >= 67
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : p.avg_next_day_recovery >= 34
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            }`}>
              {Math.round(p.avg_next_day_recovery)}% avg recovery
            </span>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{p.insight}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.recommendation}</p>
        </div>
      ))}
    </div>
  );
}
