"use client";

import { useEffect, useState, useCallback } from "react";
import WeeklyPlanningModal from "@/components/WeeklyPlanningModal";

interface ScheduleItem {
  date: string;
  task: string;
  category: "work" | "personal";
  suggested_time: "Morning" | "Afternoon" | "Evening";
  reason: string;
  completed?: boolean;
}

interface Task {
  id: string;
  title: string;
  hours: number;
  deadline: string;
  category: "work" | "personal";
}

interface Suggestion {
  stressor: string;
  suggestion: string;
}

interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start: string;
  stressors: string[];
  tasks: Task[];
  schedule: ScheduleItem[];
  intention: string;
  ai_suggestions: Suggestion[];
  created_at: string;
  updated_at: string;
}

interface Checkin {
  date: string;
  stress_level: number | null;
  mood: string | null;
  creative_energy: string | null;
}

export default function WeeklyPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [weekStart, setWeekStart] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPlanning, setShowPlanning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const isSunday = new Date().getDay() === 0;

  const fetchWeekData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/weekly");
      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
        setCheckins(data.checkins ?? []);
        setWeekStart(data.weekStart);
      }
    } catch (err) {
      console.error("Failed to fetch weekly data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);

  async function fetchSummary() {
    setLoadingSummary(true);
    try {
      const res = await fetch("/api/weekly/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary ?? data.message);
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  }

  async function toggleTaskComplete(index: number) {
    if (!plan) return;
    const updated = [...plan.schedule];
    updated[index] = { ...updated[index], completed: !updated[index].completed };
    setPlan({ ...plan, schedule: updated });

    try {
      await fetch("/api/weekly", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: updated }),
      });
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  }

  function handlePlanningComplete() {
    setShowPlanning(false);
    fetchWeekData();
  }

  // Format week range for display
  const weekEndDate = weekStart
    ? (() => {
        const d = new Date(weekStart + "T12:00:00");
        d.setDate(d.getDate() + 6);
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      })()
    : "";

  const weekStartFormatted = weekStart
    ? new Date(weekStart + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "";

  if (showPlanning) {
    return <WeeklyPlanningModal onComplete={handlePlanningComplete} />;
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-48" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-64" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Compute week stats
  const avgStress =
    checkins.length > 0
      ? (
          checkins.reduce((sum, c) => sum + (c.stress_level ?? 0), 0) /
          checkins.length
        ).toFixed(1)
      : "—";

  const moodCounts: Record<string, number> = {};
  checkins.forEach((c) => {
    if (c.mood) moodCounts[c.mood] = (moodCounts[c.mood] ?? 0) + 1;
  });
  const topMood =
    Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const completedTasks = plan?.schedule?.filter((s) => s.completed).length ?? 0;
  const totalTasks = plan?.schedule?.length ?? 0;
  const completionPct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Group schedule by date
  const scheduleByDate: Record<string, ScheduleItem[]> = {};
  (plan?.schedule ?? []).forEach((item) => {
    if (!scheduleByDate[item.date]) scheduleByDate[item.date] = [];
    scheduleByDate[item.date].push(item);
  });

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">
            {weekStartFormatted} — {weekEndDate}
          </p>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Weekly Review
          </h1>
        </div>
        {isSunday && (
          <button
            onClick={() => setShowPlanning(true)}
            className="px-4 py-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {plan ? "Redo Planning" : "Start Weekly Planning"}
          </button>
        )}
      </div>

      {/* No plan yet */}
      {!plan && (
        <div className="text-center py-12 space-y-3">
          <p className="text-4xl">📋</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No weekly plan yet.{" "}
            {isSunday
              ? 'Use the "Start Weekly Planning" button above to plan your week.'
              : "Come back on Sunday to create your weekly plan."}
          </p>
          {!isSunday && (
            <button
              onClick={() => setShowPlanning(true)}
              className="text-xs text-neutral-500 underline hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Plan anyway
            </button>
          )}
        </div>
      )}

      {/* Plan exists — show review */}
      {plan && (
        <>
          {/* Week Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Avg Stress
              </p>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {avgStress}
                <span className="text-xs font-normal text-neutral-400">
                  /10
                </span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Top Mood
              </p>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {topMood}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Task Completion
              </p>
              <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {completedTasks}/{totalTasks}
                <span className="text-xs font-normal text-neutral-400 ml-1">
                  ({completionPct}%)
                </span>
              </p>
            </div>
          </div>

          {/* Intention */}
          {plan.intention && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <span>🧭</span>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Weekly Intention
                </h3>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {plan.intention}
              </p>
            </div>
          )}

          {/* Cycle Completion — tasks started vs finished */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Cycle Completion
            </h3>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2.5 mb-2">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500">
              {completedTasks} of {totalTasks} tasks completed this week
              {completionPct === 100 && totalTasks > 0
                ? " — full cycle completed!"
                : completionPct >= 75
                  ? " — strong finish ahead"
                  : completionPct >= 50
                    ? " — on track"
                    : totalTasks > 0
                      ? " — some tasks still open"
                      : ""}
            </p>
          </div>

          {/* Scheduled Tasks — grouped by day */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              This Week&apos;s Schedule
            </h3>
            {Object.entries(scheduleByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, items]) => {
                const dayName = new Date(
                  date + "T12:00:00"
                ).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                });
                const isToday =
                  date === new Date().toISOString().split("T")[0];

                return (
                  <div key={date}>
                    <p
                      className={`text-xs font-bold mb-2 ${
                        isToday
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-neutral-400"
                      }`}
                    >
                      {isToday ? "Today — " : ""}
                      {dayName}
                    </p>
                    <div className="space-y-2">
                      {items.map((item, idx) => {
                        const globalIdx = plan.schedule.findIndex(
                          (s) =>
                            s.date === item.date &&
                            s.task === item.task &&
                            s.suggested_time === item.suggested_time
                        );
                        return (
                          <div
                            key={idx}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                              item.completed
                                ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
                            }`}
                          >
                            <button
                              onClick={() => toggleTaskComplete(globalIdx)}
                              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                item.completed
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-500"
                              }`}
                            >
                              {item.completed && (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium ${
                                  item.completed
                                    ? "text-neutral-400 line-through"
                                    : "text-neutral-900 dark:text-neutral-100"
                                }`}
                              >
                                {item.task}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    item.suggested_time === "Morning"
                                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                                      : item.suggested_time === "Afternoon"
                                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                                  }`}
                                >
                                  {item.suggested_time}
                                </span>
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    item.category === "work"
                                      ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                                      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                  }`}
                                >
                                  {item.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* AI Weekly Summary */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                AI Weekly Patterns
              </h3>
              {!summary && !loadingSummary && (
                <button
                  onClick={fetchSummary}
                  className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 underline"
                >
                  Generate
                </button>
              )}
            </div>
            {loadingSummary && (
              <p className="text-sm text-neutral-400 animate-pulse">
                Analyzing your week...
              </p>
            )}
            {summary && (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {summary}
              </p>
            )}
            {!summary && !loadingSummary && (
              <p className="text-xs text-neutral-400">
                Click &quot;Generate&quot; to get AI insights on this
                week&apos;s patterns.
              </p>
            )}
          </div>

          {/* Stressor suggestions if they exist */}
          {plan.ai_suggestions && plan.ai_suggestions.length > 0 && (
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
                Stressor Suggestions
              </h3>
              <div className="space-y-2">
                {plan.ai_suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20"
                  >
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                      {s.stressor}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {s.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
