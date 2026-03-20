"use client";

import { useState } from "react";

interface Task {
  id: string;
  title: string;
  hours: number;
  deadline: string;
  category: "work" | "personal";
}

interface ScheduleItem {
  date: string;
  task: string;
  category: "work" | "personal";
  suggested_time: "Morning" | "Afternoon" | "Evening";
  reason: string;
  completed?: boolean;
}

interface Suggestion {
  stressor: string;
  suggestion: string;
}

interface Props {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

export default function WeeklyPlanningModal({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  // Step 0: Last week check-in
  const [weekStress, setWeekStress] = useState(5);
  const [stressors, setStressors] = useState(["", "", ""]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Step 1: Tasks
  const [workTasks, setWorkTasks] = useState<Task[]>([]);
  const [personalTasks, setPersonalTasks] = useState<Task[]>([]);

  // Step 2: AI Schedule
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Step 3: Intention
  const [intention, setIntention] = useState("");
  const [saving, setSaving] = useState(false);

  function updateStressor(index: number, value: string) {
    const updated = [...stressors];
    updated[index] = value;
    setStressors(updated);
  }

  function addTask(category: "work" | "personal") {
    const list = category === "work" ? workTasks : personalTasks;
    const setter = category === "work" ? setWorkTasks : setPersonalTasks;
    if (list.length >= 5) return;
    setter([
      ...list,
      {
        id: crypto.randomUUID(),
        title: "",
        hours: 1,
        deadline: "",
        category,
      },
    ]);
  }

  function updateTask(
    category: "work" | "personal",
    id: string,
    field: string,
    value: string | number
  ) {
    const list = category === "work" ? workTasks : personalTasks;
    const setter = category === "work" ? setWorkTasks : setPersonalTasks;
    setter(
      list.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  }

  function removeTask(category: "work" | "personal", id: string) {
    const list = category === "work" ? workTasks : personalTasks;
    const setter = category === "work" ? setWorkTasks : setPersonalTasks;
    setter(list.filter((t) => t.id !== id));
  }

  async function fetchSuggestions() {
    const filled = stressors.filter((s) => s.trim());
    if (filled.length === 0) return;

    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/weekly/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stress_level: weekStress,
          stressors: filled,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function generateSchedule() {
    const allTasks = [...workTasks, ...personalTasks].filter(
      (t) => t.title.trim()
    );
    if (allTasks.length === 0) return;

    setLoadingSchedule(true);
    try {
      const res = await fetch("/api/weekly/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: allTasks }),
      });
      if (res.ok) {
        const data = await res.json();
        setSchedule(
          (data.schedule ?? []).map((s: ScheduleItem) => ({
            ...s,
            completed: false,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to generate schedule:", err);
    } finally {
      setLoadingSchedule(false);
    }
  }

  function moveScheduleItem(index: number, direction: "up" | "down") {
    const newSchedule = [...schedule];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSchedule.length) return;
    [newSchedule[index], newSchedule[swapIndex]] = [
      newSchedule[swapIndex],
      newSchedule[index],
    ];
    setSchedule(newSchedule);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stressors: stressors.filter((s) => s.trim()),
          tasks: [...workTasks, ...personalTasks].filter(
            (t) => t.title.trim()
          ),
          schedule,
          intention,
          ai_suggestions: suggestions,
        }),
      });
      if (res.ok) {
        onComplete();
      }
    } catch (err) {
      console.error("Failed to save weekly plan:", err);
    } finally {
      setSaving(false);
    }
  }

  function canAdvance() {
    if (step === 0) return true;
    if (step === 1) {
      return (
        [...workTasks, ...personalTasks].filter((t) => t.title.trim()).length > 0
      );
    }
    if (step === 2) return schedule.length > 0;
    return true;
  }

  async function next() {
    if (step === 0) {
      // Fetch AI suggestions before moving to step 1
      await fetchSuggestions();
      setStep(1);
    } else if (step === 1) {
      // Generate AI schedule before moving to step 2
      await generateSchedule();
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      await handleSave();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
            Sunday Planning Session
          </p>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            {step === 0 && "How was last week?"}
            {step === 1 && "What must get done this week?"}
            {step === 2 && "Your AI-optimized schedule"}
            {step === 3 && "Set your weekly intention"}
          </h2>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step
                    ? "bg-neutral-900 dark:bg-neutral-100"
                    : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          {/* Step 0 — Last week stress check-in */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Overall stress level last week
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={weekStress}
                  onChange={(e) => setWeekStress(parseInt(e.target.value, 10))}
                  className="w-full accent-neutral-900 dark:accent-neutral-100"
                />
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Calm</span>
                  <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {weekStress}
                  </span>
                  <span>Maxed out</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Top 3 things that stressed you most
                </label>
                {stressors.map((s, i) => (
                  <input
                    key={i}
                    type="text"
                    value={s}
                    onChange={(e) => updateStressor(i, e.target.value)}
                    placeholder={`Stressor ${i + 1}${i > 0 ? " (optional)" : ""}`}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Must-do tasks */}
          {step === 1 && (
            <div className="space-y-6">
              {/* AI suggestions from step 0 */}
              {suggestions.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
                    AI Suggestions for your stressors
                  </p>
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
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
              )}

              {/* Work tasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Work Tasks
                  </h3>
                  <button
                    onClick={() => addTask("work")}
                    disabled={workTasks.length >= 5}
                    className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30"
                  >
                    + Add task
                  </button>
                </div>
                {workTasks.length === 0 && (
                  <button
                    onClick={() => addTask("work")}
                    className="w-full p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-sm text-neutral-400 hover:border-neutral-400 transition-colors"
                  >
                    + Add a work task
                  </button>
                )}
                {workTasks.map((t) => (
                  <TaskInput
                    key={t.id}
                    task={t}
                    onChange={(field, value) =>
                      updateTask("work", t.id, field, value)
                    }
                    onRemove={() => removeTask("work", t.id)}
                  />
                ))}
              </div>

              {/* Personal tasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Personal Tasks
                  </h3>
                  <button
                    onClick={() => addTask("personal")}
                    disabled={personalTasks.length >= 5}
                    className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 disabled:opacity-30"
                  >
                    + Add task
                  </button>
                </div>
                {personalTasks.length === 0 && (
                  <button
                    onClick={() => addTask("personal")}
                    className="w-full p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-sm text-neutral-400 hover:border-neutral-400 transition-colors"
                  >
                    + Add a personal task
                  </button>
                )}
                {personalTasks.map((t) => (
                  <TaskInput
                    key={t.id}
                    task={t}
                    onChange={(field, value) =>
                      updateTask("personal", t.id, field, value)
                    }
                    onRemove={() => removeTask("personal", t.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — AI Schedule */}
          {step === 2 && (
            <div className="space-y-4">
              {loadingSchedule ? (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-400 animate-pulse">
                    Analyzing your calendar, recovery, and tasks...
                  </p>
                </div>
              ) : schedule.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-neutral-400">
                    No schedule generated. Go back and add tasks.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-neutral-400">
                    Reorder tasks using the arrows. Review and adjust before
                    confirming.
                  </p>
                  {schedule.map((item, i) => {
                    const dayName = new Date(
                      item.date + "T12:00:00"
                    ).toLocaleDateString("en-US", { weekday: "short" });
                    const dateShort = new Date(
                      item.date + "T12:00:00"
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-start gap-3"
                      >
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveScheduleItem(i, "up")}
                            disabled={i === 0}
                            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 text-xs"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveScheduleItem(i, "down")}
                            disabled={i === schedule.length - 1}
                            className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 text-xs"
                          >
                            ▼
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-neutral-500">
                              {dayName} {dateShort}
                            </span>
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
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {item.task}
                          </p>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {item.reason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* Step 3 — Weekly intention */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Generator-style intention
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Set a broad direction, not a rigid goal. Think &quot;build
                  momentum on...&quot; or &quot;create space for...&quot; — not
                  &quot;complete X by Friday.&quot;
                </p>
              </div>
              <textarea
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                placeholder="What's your directional intention this week?"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-between items-center">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={next}
            disabled={
              !canAdvance() ||
              saving ||
              loadingSuggestions ||
              loadingSchedule
            }
            className="px-6 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : loadingSuggestions
                ? "Getting suggestions..."
                : loadingSchedule
                  ? "Building schedule..."
                  : step === TOTAL_STEPS - 1
                    ? "Save Plan"
                    : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Task input sub-component ---
function TaskInput({
  task,
  onChange,
  onRemove,
}: {
  task: Task;
  onChange: (field: string, value: string | number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={task.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Task title"
          className="flex-1 px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        />
        <button
          onClick={onRemove}
          className="text-neutral-400 hover:text-red-500 text-sm"
        >
          ×
        </button>
      </div>
      <div className="flex gap-2">
        <div className="flex items-center gap-1">
          <label className="text-xs text-neutral-400">Hours:</label>
          <input
            type="number"
            min={0.5}
            max={8}
            step={0.5}
            value={task.hours}
            onChange={(e) => onChange("hours", parseFloat(e.target.value) || 1)}
            className="w-16 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-neutral-400">Deadline:</label>
          <input
            type="date"
            value={task.deadline}
            onChange={(e) => onChange("deadline", e.target.value)}
            className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>
      </div>
    </div>
  );
}
