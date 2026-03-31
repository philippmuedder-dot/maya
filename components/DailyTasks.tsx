"use client";

import { useEffect, useState, useCallback } from "react";

interface DailyTask {
  id: string;
  task: string;
  completed: boolean;
  carried_from_date: string | null;
  date: string;
}

interface StaleTask {
  id: string;
  task: string;
  date: string;
}

export default function DailyTasks() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [staleTasks, setStaleTasks] = useState<StaleTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/daily-tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setStaleTasks(data.staleTasks ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch daily tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function markStaleDone(id: string) {
    setStaleTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch("/api/daily-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: true }),
      });
    } catch (err) {
      console.error("Failed to mark stale task done:", err);
    }
  }

  async function snoozeTask(id: string, from: "stale" | "today") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (from === "stale") {
      setStaleTasks((prev) => prev.filter((t) => t.id !== id));
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
    try {
      await fetch("/api/daily-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, snoozed: true, date: tomorrowStr }),
      });
    } catch (err) {
      console.error("Failed to snooze task:", err);
    }
  }

  async function toggleComplete(id: string, currentCompleted: boolean) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !currentCompleted } : t
      )
    );

    try {
      await fetch("/api/daily-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !currentCompleted }),
      });
    } catch (err) {
      console.error("Failed to toggle task:", err);
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, completed: currentCompleted } : t
        )
      );
    }
  }

  if (loading) return null;
  if (tasks.length === 0 && staleTasks.length === 0) return null;

  const daysSince = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const now = new Date();
    return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  };

  return (
    <div className="space-y-3">
      {/* Stale task warnings */}
      {staleTasks.length > 0 && (
        <div className="space-y-2">
          {staleTasks.map((st) => (
            <div
              key={st.id}
              className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            >
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                You&apos;ve been avoiding{" "}
                <span className="font-semibold">&ldquo;{st.task}&rdquo;</span>{" "}
                for {daysSince(st.date)} days — is this a gut no?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => markStaleDone(st.id)}
                  className="text-xs px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
                >
                  ✓ Done
                </button>
                <button
                  onClick={() => snoozeTask(st.id, "stale")}
                  className="text-xs px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Not today
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's tasks */}
      {tasks.length > 0 && (
        <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
            Today&apos;s Top Tasks
          </h3>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3"
              >
                <button
                  onClick={() => toggleComplete(task.id, task.completed)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    task.completed
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-neutral-300 dark:border-neutral-600 hover:border-neutral-500"
                  }`}
                >
                  {task.completed && (
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
                    className={`text-sm ${
                      task.completed
                        ? "text-neutral-400 line-through"
                        : "text-neutral-900 dark:text-neutral-100"
                    }`}
                  >
                    {task.task}
                  </p>
                  {task.carried_from_date && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      Carried from{" "}
                      {new Date(
                        task.carried_from_date + "T12:00:00"
                      ).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
                {!task.completed && (
                  <button
                    onClick={() => snoozeTask(task.id, "today")}
                    className="text-xs px-2 py-0.5 rounded text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                  >
                    Not today
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
