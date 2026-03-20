"use client";

import { useEffect, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ManualWorkout {
  id: string;
  user_id: string;
  date: string; // "YYYY-MM-DD"
  type: string;
  duration_mins: number | null;
  strain: number | null;
  notes: string | null;
  created_at: string;
}

interface WhoopWorkout {
  id: number;
  start: string; // ISO timestamp
  end: string;
  sport_id: number;
  sport_name: string; // annotated by /api/whoop/workouts
  score_state: string;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    distance_meter: number | null;
  } | null;
}

/** Unified display record — either source */
interface DisplayWorkout {
  key: string;
  source: "manual" | "whoop";
  date: string; // "YYYY-MM-DD" for sorting
  type: string;
  duration_mins: number | null;
  strain: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  notes: string | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const WORKOUT_TYPES = [
  "Strength / Hypertrophy",
  "Zone 2 Cardio",
  "HIIT",
  "Mobility / Yoga",
  "Walk",
  "Stretch / Breathwork",
  "Other",
];

const TYPE_ICONS: Record<string, string> = {
  "Strength / Hypertrophy": "🏋️",
  "Zone 2 Cardio": "🏃",
  "HIIT": "⚡",
  "Mobility / Yoga": "🧘",
  "Walk": "🚶",
  "Stretch / Breathwork": "🌬️",
  "Other": "💪",
  // Whoop sport names
  "Running": "🏃",
  "Cycling": "🚴",
  "Weightlifting": "🏋️",
  "Functional Fitness": "💪",
  "Outdoor Run": "🏃",
  "Workout": "💪",
};

const EMPTY_FORM = { type: "", duration_mins: "", notes: "" };

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** ISO timestamp → local "YYYY-MM-DD" */
function isoToLocalDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToDurationMins(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000);
}

function toDisplay(w: ManualWorkout): DisplayWorkout {
  return {
    key: `manual-${w.id}`,
    source: "manual",
    date: w.date,
    type: w.type,
    duration_mins: w.duration_mins,
    strain: w.strain,
    avg_hr: null,
    max_hr: null,
    notes: w.notes,
  };
}

function whoopToDisplay(w: WhoopWorkout): DisplayWorkout {
  return {
    key: `whoop-${w.id}`,
    source: "whoop",
    date: isoToLocalDate(w.start),
    type: w.sport_name,
    duration_mins: w.end ? isoToDurationMins(w.start, w.end) : null,
    strain: w.score?.strain ?? null,
    avg_hr: w.score?.average_heart_rate ?? null,
    max_hr: w.score?.max_heart_rate ?? null,
    notes: null,
  };
}

// ─── Workout Log Form ──────────────────────────────────────────────────────────

function WorkoutLogForm({ onSaved }: { onSaved: (w: ManualWorkout) => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Auto-clear success banner after 3s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [success]);

  function set(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.type) {
      setError("Please select a workout type.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          duration_mins: form.duration_mins ? parseInt(form.duration_mins, 10) : null,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to log workout.");
      onSaved(data as ManualWorkout);
      setForm(EMPTY_FORM);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Workout type pills */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          Workout Type *
        </label>
        <div className="flex flex-wrap gap-2">
          {WORKOUT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", form.type === t ? "" : t)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                form.type === t
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
              }`}
            >
              {TYPE_ICONS[t]} {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Duration (min)
          </label>
          <input
            type="number"
            value={form.duration_mins}
            onChange={(e) => set("duration_mins", e.target.value)}
            placeholder="45"
            min="1"
            max="300"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Notes
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="e.g. Felt strong, PR on squat"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !form.type}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Log Workout"}
        </button>
        {success && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Workout logged
          </span>
        )}
      </div>
    </form>
  );
}

// ─── Workout History ────────────────────────────────────────────────────────────

function WorkoutHistory({ workouts }: { workouts: DisplayWorkout[] }) {
  if (workouts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No workouts logged yet.</p>
        <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
          Log your first session above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {workouts.map((w) => {
        const dateObj = new Date(w.date + "T12:00:00");
        const label = dateObj.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const icon = TYPE_ICONS[w.type] ?? "💪";

        return (
          <div
            key={w.key}
            className="flex items-start gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3"
          >
            <div className="text-lg shrink-0 mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {w.type}
                </span>

                {/* Whoop "W" source badge */}
                {w.source === "whoop" && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 leading-none">
                    W
                  </span>
                )}

                {w.duration_mins != null && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {w.duration_mins} min
                  </span>
                )}

                {w.strain != null && (
                  <span className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 px-2 py-0.5 rounded-full">
                    Strain {w.strain.toFixed(1)}
                  </span>
                )}

                {w.avg_hr != null && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    ♥ {Math.round(w.avg_hr)} avg / {w.max_hr != null ? Math.round(w.max_hr) : "—"} max
                  </span>
                )}
              </div>

              {w.notes && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {w.notes}
                </p>
              )}
            </div>

            <div className="shrink-0 text-xs text-neutral-400 dark:text-neutral-600">{label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main exported component ───────────────────────────────────────────────────

export default function WorkoutSection() {
  const [manualWorkouts, setManualWorkouts] = useState<ManualWorkout[]>([]);
  const [whoopWorkouts, setWhoopWorkouts] = useState<WhoopWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/workouts").then((r) => r.json()),
      fetch("/api/whoop/workouts").then((r) => r.json()),
    ])
      .then(([manual, whoop]) => {
        if (Array.isArray(manual)) setManualWorkouts(manual);
        if (Array.isArray(whoop)) setWhoopWorkouts(whoop);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(w: ManualWorkout) {
    setManualWorkouts((prev) => [w, ...prev].slice(0, 10));
  }

  // Merge manual + Whoop, sort by date descending, cap at 10
  const merged: DisplayWorkout[] = [
    ...manualWorkouts.map(toDisplay),
    ...whoopWorkouts.map(whoopToDisplay),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Log form */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Log Today&apos;s Workout
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            What did you respond to today?
          </p>
        </div>
        <WorkoutLogForm onSaved={handleSaved} />
      </div>

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Recent Workouts
          </h2>
          {whoopWorkouts.length > 0 && (
            <>
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                W
              </span>
              <span className="text-xs text-neutral-400 dark:text-neutral-600">
                = Whoop synced
              </span>
            </>
          )}
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <WorkoutHistory workouts={merged} />
        )}
      </div>
    </div>
  );
}
