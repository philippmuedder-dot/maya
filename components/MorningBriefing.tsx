"use client";

import { useEffect, useState, useCallback } from "react";
import DailyCheckinModal from "./DailyCheckinModal";
import ProactiveAlerts from "./ProactiveAlerts";
import DailyTasks from "./DailyTasks";
import SacralPanel from "./SacralPanel";
import { CalendarPanel } from "./CalendarPanel";

interface Briefing {
  day_type: "Focus" | "Maintenance" | "Recovery";
  training: "Hard" | "Moderate" | "Recovery only";
  avoid_heavy_decisions: boolean;
  decision_reason: string;
  top_priorities: string[];
  supplement_focus: string;
  what_to_pause: string;
  phase: "Survival" | "Building" | "Thriving";
  phase_message: string;
  sacral_prompts: string[];
}

const DAY_TYPE_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  Focus: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-300",
    icon: "🎯",
  },
  Maintenance: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-300",
    icon: "🔧",
  },
  Recovery: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: "🌿",
  },
};

const TRAINING_STYLE: Record<string, string> = {
  Hard: "text-red-600 dark:text-red-400",
  Moderate: "text-amber-600 dark:text-amber-400",
  "Recovery only": "text-emerald-600 dark:text-emerald-400",
};

const PHASE_STYLE: Record<string, { bg: string; icon: string }> = {
  Survival: { bg: "bg-red-50 dark:bg-red-900/20", icon: "🛡️" },
  Building: { bg: "bg-blue-50 dark:bg-blue-900/20", icon: "🏗️" },
  Thriving: { bg: "bg-emerald-50 dark:bg-emerald-900/20", icon: "🌟" },
};

export default function MorningBriefing() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [needsCheckin, setNeedsCheckin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing");
      if (!res.ok) throw new Error("Failed to fetch briefing");
      const data = await res.json();

      if (data.needsCheckin) {
        setNeedsCheckin(true);
      } else if (data.briefing) {
        setBriefing(data.briefing);
        setNeedsCheckin(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  function handleCheckinComplete() {
    setNeedsCheckin(false);
    setLoading(true);
    fetchBriefing();
  }

  if (needsCheckin) {
    return <DailyCheckinModal onComplete={handleCheckinComplete} />;
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-48" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
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
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchBriefing}
            className="mt-2 text-xs text-red-600 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  const dayStyle = DAY_TYPE_STYLE[briefing.day_type] ?? DAY_TYPE_STYLE.Maintenance;
  const phaseStyle = PHASE_STYLE[briefing.phase] ?? PHASE_STYLE.Building;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">
          {today}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Morning Briefing
        </h1>
      </div>

      {/* Proactive Alerts */}
      <ProactiveAlerts />

      {/* Daily Tasks */}
      <DailyTasks />

      {/* Day Type + Training + Decision */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className={`p-4 rounded-xl ${dayStyle.bg}`}>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Day Type
          </p>
          <p className={`text-lg font-bold ${dayStyle.text}`}>
            {dayStyle.icon} {briefing.day_type}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Training
          </p>
          <p
            className={`text-lg font-bold ${TRAINING_STYLE[briefing.training] ?? ""}`}
          >
            {briefing.training}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            Decisions
          </p>
          <p
            className={`text-sm font-medium ${
              briefing.avoid_heavy_decisions
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {briefing.avoid_heavy_decisions
              ? "Avoid heavy decisions"
              : "Full capacity"}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {briefing.decision_reason}
          </p>
        </div>
      </div>

      {/* Top Priorities */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Top Priorities — respond to these
        </h3>
        <ol className="space-y-2">
          {briefing.top_priorities.map((p, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="text-xs font-bold text-neutral-400 mt-0.5 w-4 shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                {p}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Supplement Focus + What to Pause */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
            Supplement Focus
          </h3>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {briefing.supplement_focus}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
            Consider Pausing
          </h3>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {briefing.what_to_pause}
          </p>
        </div>
      </div>

      {/* Phase */}
      <div className={`p-4 rounded-xl ${phaseStyle.bg}`}>
        <div className="flex items-center gap-2 mb-1">
          <span>{phaseStyle.icon}</span>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {briefing.phase} Mode
          </h3>
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {briefing.phase_message}
        </p>
      </div>

      {/* Sacral Response Panel */}
      {briefing.sacral_prompts?.length > 0 && (
        <SacralPanel prompts={briefing.sacral_prompts} />
      )}

      {/* Calendar */}
      <CalendarPanel />
    </div>
  );
}
