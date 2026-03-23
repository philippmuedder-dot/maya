"use client";

import { useEffect, useRef, useState } from "react";

interface Supplement {
  id: string;
  name: string;
  dose: number | null;
  unit: string | null;
  timing: "morning" | "afternoon" | "evening" | "night" | null;
  purpose: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

type ParsedSupplement = Omit<Supplement, "id" | "active" | "created_at">;

const UNITS = ["mg", "g", "mcg", "IU", "ml", "other"];
const TIMINGS = ["morning", "afternoon", "evening", "night"] as const;
const TIMING_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

const TIMING_COLORS: Record<string, string> = {
  morning: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  afternoon: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  evening: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  night: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
};

const EMPTY_FORM = {
  name: "",
  dose: "",
  unit: "mg",
  timing: "" as string,
  purpose: "",
  notes: "",
  active: true,
};

// ─── Supplement Insights ──────────────────────────────────────────────────────

interface SupplementInsight {
  supplement: string;
  correlation: string;
  confidence: "low" | "medium" | "high";
  suggestion: "continue" | "stop" | "adjust" | "restart";
  reason: string;
}

const CONFIDENCE_BADGE: Record<string, string> = {
  low: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const SUGGESTION_BADGE: Record<string, string> = {
  continue: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  stop: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  adjust: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  restart: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function SupplementInsights() {
  const [insights, setInsights] = useState<SupplementInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [insufficientData, setInsufficientData] = useState(false);
  const [daysCollected, setDaysCollected] = useState(0);
  const [daysNeeded, setDaysNeeded] = useState(14);

  useEffect(() => {
    fetch("/api/insights/supplements")
      .then((r) => r.json())
      .then((data) => {
        setInsights(data.insights ?? []);
        setInsufficientData(data.insufficient_data ?? false);
        setDaysCollected(data.days_collected ?? 0);
        setDaysNeeded(data.days_needed ?? 14);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
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
          Building your supplement profile
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {daysCollected} of {daysNeeded} days collected. Keep logging to unlock correlations
          between your supplements and recovery data.
        </p>
        <div className="w-48 mx-auto">
          <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100 transition-all"
              style={{ width: `${Math.min(100, (daysCollected / daysNeeded) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No clear correlations found yet. As more data accumulates, patterns will emerge.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Based on {daysCollected} days of recovery data cross-referenced with your supplement stack.
      </p>
      {insights.map((insight, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {insight.supplement}
            </h3>
            <div className="flex gap-1.5 shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONFIDENCE_BADGE[insight.confidence]}`}>
                {insight.confidence}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${SUGGESTION_BADGE[insight.suggestion]}`}>
                {insight.suggestion}
              </span>
            </div>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{insight.correlation}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{insight.reason}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Supplement Card ───────────────────────────────────────────────────────────

function SupplementCard({
  supplement,
  onEdit,
  onToggle,
  onDelete,
  taken,
  onToggleTaken,
}: {
  supplement: Supplement;
  onEdit: (s: Supplement) => void;
  onToggle: (s: Supplement) => void;
  onDelete: (id: string) => void;
  taken: boolean;
  onToggleTaken: (id: string, taken: boolean) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-opacity ${
        supplement.active
          ? "border-neutral-200 dark:border-neutral-800"
          : "border-neutral-100 dark:border-neutral-900 opacity-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {supplement.name}
            </h3>
            {supplement.dose && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {supplement.dose}
                {supplement.unit || ""}
              </span>
            )}
            {supplement.timing && (
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  TIMING_COLORS[supplement.timing] ??
                  "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {TIMING_LABELS[supplement.timing]}
              </span>
            )}
          </div>
          {supplement.purpose && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {supplement.purpose}
            </p>
          )}
          {supplement.notes && (
            <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-0.5 italic">
              {supplement.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Taken today toggle — active supplements only */}
          {supplement.active && (
            <button
              onClick={() => onToggleTaken(supplement.id, !taken)}
              title={taken ? "Mark as not taken" : "Mark as taken today"}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                taken
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "border border-neutral-200 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              }`}
            >
              {taken ? (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" strokeLinecap="round" />
                </svg>
              )}
              {taken ? "Taken" : "Take"}
            </button>
          )}

          {/* Active toggle */}
          <button
            onClick={() => onToggle(supplement)}
            title={supplement.active ? "Pause" : "Activate"}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {supplement.active ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(supplement)}
            title="Edit"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(supplement.id)}
            title="Delete"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Supplement Form ───────────────────────────────────────────────────────────

function SupplementForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<typeof EMPTY_FORM>;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });

  function set(key: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Magnesium Glycinate"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Dose
          </label>
          <input
            type="number"
            value={form.dose}
            onChange={(e) => set("dose", e.target.value)}
            placeholder="400"
            min="0"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Unit
          </label>
          <select
            value={form.unit}
            onChange={(e) => set("unit", e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Timing
          </label>
          <div className="flex gap-2 flex-wrap">
            {TIMINGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => set("timing", form.timing === t ? "" : t)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  form.timing === t
                    ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
                }`}
              >
                {TIMING_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Purpose
          </label>
          <input
            type="text"
            value={form.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            placeholder="e.g. Sleep quality, muscle relaxation"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
            Notes
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="e.g. Take with food"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => set("active", !form.active)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              form.active ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-300 dark:bg-neutral-700"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white dark:bg-neutral-900 transition-transform ${
                form.active ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            {form.active ? "Active" : "Paused"}
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Parse Review Panel ────────────────────────────────────────────────────────

function ParseReviewPanel({
  parsed,
  onConfirm,
  onDiscard,
  saving,
}: {
  parsed: ParsedSupplement[];
  onConfirm: (items: ParsedSupplement[]) => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  // Bulk timing selection — applied to all items that don't have their own override
  const [bulkTiming, setBulkTiming] = useState<string>("");
  // Per-item list — each item can individually override the bulk timing
  const [items, setItems] = useState<ParsedSupplement[]>(parsed);

  // When bulk timing changes, apply it to every item
  function applyBulkTiming(t: string) {
    setBulkTiming(t);
    setItems((prev) => prev.map((item) => ({ ...item, timing: t as ParsedSupplement["timing"] })));
  }

  function setItemTiming(index: number, t: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, timing: t as ParsedSupplement["timing"] } : item
      )
    );
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 p-5 bg-blue-50/50 dark:bg-blue-900/10 space-y-5">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Review Parsed Supplements
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {items.length} supplement{items.length !== 1 ? "s" : ""} found — set timing, remove any you don&apos;t want, then save.
        </p>
      </div>

      {/* ── Bulk timing selector ── */}
      <div className="rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-4 py-4 space-y-3">
        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          When do you take this supplement?
        </p>
        <div className="flex gap-2 flex-wrap">
          {TIMINGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => applyBulkTiming(bulkTiming === t ? "" : t)}
              className={`text-xs px-4 py-2 rounded-full border font-medium transition-colors ${
                bulkTiming === t
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
              }`}
            >
              {TIMING_LABELS[t]}
            </button>
          ))}
        </div>
        {bulkTiming && (
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Applied to all — override per item below if needed.
          </p>
        )}
      </div>

      {/* ── Ingredient list ── */}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 px-4 py-3"
          >
            <div className="flex-1 min-w-0 space-y-2">
              {/* Name + dose row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {item.name}
                </span>
                {item.dose && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {item.dose}{item.unit || ""}
                  </span>
                )}
              </div>
              {item.purpose && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.purpose}</p>
              )}
              {/* Per-item timing override */}
              <div className="flex gap-1.5 flex-wrap">
                {TIMINGS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setItemTiming(i, item.timing === t ? "" : t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      item.timing === t
                        ? TIMING_COLORS[t] + " border-transparent font-medium"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-500 hover:border-neutral-400"
                    }`}
                  >
                    {TIMING_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Remove button */}
            <button
              onClick={() => remove(i)}
              className="shrink-0 p-1 mt-0.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onConfirm(items)}
          disabled={saving || items.length === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : `Save ${items.length} supplement${items.length !== 1 ? "s" : ""}`}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stack" | "insights">("stack");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplement | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Upload/Parse
  const [showUpload, setShowUpload] = useState(false);
  const [parseText, setParseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedSupplement[] | null>(null);
  const [parseSaving, setParseSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filter
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");

  // Compliance — taken today
  const [takenToday, setTakenToday] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/supplements")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSupplements(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Load today's compliance
    fetch("/api/supplements/logs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.taken)) setTakenToday(new Set(data.taken));
      })
      .catch(console.error);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null);
    setFormError(null);
    setShowForm(true);
    setShowUpload(false);
  }

  function openEdit(s: Supplement) {
    setEditTarget(s);
    setFormError(null);
    setShowForm(true);
    setShowUpload(false);
  }

  function cancelForm() {
    setShowForm(false);
    setEditTarget(null);
    setFormError(null);
  }

  async function saveForm(formData: typeof EMPTY_FORM) {
    setFormSaving(true);
    setFormError(null);

    const payload = {
      name: formData.name.trim(),
      dose: formData.dose ? parseFloat(formData.dose as unknown as string) : null,
      unit: formData.unit || null,
      timing: formData.timing || null,
      purpose: formData.purpose.trim() || null,
      notes: formData.notes.trim() || null,
      active: formData.active,
    };

    try {
      if (editTarget) {
        const res = await fetch(`/api/supplements/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Update failed.");
        setSupplements((prev) => prev.map((s) => (s.id === editTarget.id ? data : s)));
      } else {
        const res = await fetch("/api/supplements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Create failed.");
        setSupplements((prev) => [...prev, data]);
      }
      setShowForm(false);
      setEditTarget(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setFormSaving(false);
    }
  }

  async function toggleActive(s: Supplement) {
    const res = await fetch(`/api/supplements/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s, active: !s.active }),
    });
    const data = await res.json();
    if (res.ok) {
      setSupplements((prev) => prev.map((x) => (x.id === s.id ? data : x)));
    }
  }

  async function toggleTaken(id: string, taken: boolean) {
    // Optimistic update
    setTakenToday((prev) => {
      const next = new Set(prev);
      if (taken) next.add(id);
      else next.delete(id);
      return next;
    });
    await fetch("/api/supplements/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplement_id: id, taken }),
    }).catch(console.error);
  }

  async function deleteSupplement(id: string) {
    if (!confirm("Delete this supplement?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/supplements/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSupplements((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  }

  // ── Parse flow ─────────────────────────────────────────────────────────────

  async function parseText_() {
    if (!parseText.trim()) return;
    setParsing(true);
    setParseError(null);

    try {
      const res = await fetch("/api/supplements/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: parseText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed.");
      setParsedItems(data.supplements as ParsedSupplement[]);
      setParseText("");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse.");
    } finally {
      setParsing(false);
    }
  }

  async function parseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setParseError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/supplements/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed.");
      setParsedItems(data.supplements as ParsedSupplement[]);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse.");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmParsed(items: ParsedSupplement[]) {
    setParseSaving(true);

    try {
      const created: Supplement[] = [];
      for (const item of items) {
        const res = await fetch("/api/supplements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, active: true }),
        });
        const data = await res.json();
        if (res.ok) created.push(data);
      }
      setSupplements((prev) => [...prev, ...created]);
      setParsedItems(null);
      setShowUpload(false);
    } catch {
      setParseError("Failed to save some supplements.");
    } finally {
      setParseSaving(false);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = supplements.filter((s) => {
    if (filter === "active") return s.active;
    if (filter === "paused") return !s.active;
    return true;
  });

  const activeCount = supplements.filter((s) => s.active).length;

  // Group active by timing for summary row
  const timingGroups = TIMINGS.map((t) => ({
    timing: t,
    count: supplements.filter((s) => s.active && s.timing === t).length,
  })).filter((g) => g.count > 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Supplements</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {loading
              ? "Loading…"
              : `${activeCount} active supplement${activeCount !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              setShowUpload((v) => !v);
              setShowForm(false);
              setParsedItems(null);
              setParseError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Parse
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {(["stack", "insights"] as const).map((tab) => (
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

      {/* Insights tab */}
      {activeTab === "insights" && <SupplementInsights />}

      {/* Stack tab */}
      {activeTab === "stack" && <>

      {/* Timing summary chips */}
      {timingGroups.length > 0 && !loading && (
        <div className="flex gap-2 flex-wrap">
          {timingGroups.map(({ timing, count }) => (
            <span
              key={timing}
              className={`text-xs font-medium px-3 py-1 rounded-full ${
                TIMING_COLORS[timing] ??
                "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {TIMING_LABELS[timing]} · {count}
            </span>
          ))}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <SupplementForm
          initial={
            editTarget
              ? {
                  name: editTarget.name,
                  dose: editTarget.dose !== null ? String(editTarget.dose) : "",
                  unit: editTarget.unit ?? "mg",
                  timing: editTarget.timing ?? "",
                  purpose: editTarget.purpose ?? "",
                  notes: editTarget.notes ?? "",
                  active: editTarget.active,
                }
              : undefined
          }
          onSave={saveForm}
          onCancel={cancelForm}
          saving={formSaving}
        />
      )}
      {formError && (
        <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
      )}

      {/* Upload / Parse Panel */}
      {showUpload && !parsedItems && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Parse Supplements
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Paste a list or upload a photo — Claude will extract each supplement automatically.
            </p>
          </div>

          <textarea
            value={parseText}
            onChange={(e) => setParseText(e.target.value)}
            rows={4}
            placeholder="e.g. Magnesium Glycinate 400mg at night for sleep, Vitamin D3 5000IU in the morning, Omega-3 2g with breakfast…"
            className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={parseText_}
              disabled={parsing || !parseText.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {parsing ? "Parsing…" : "Parse Text"}
            </button>

            <span className="text-xs text-neutral-400">or</span>

            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 cursor-pointer transition-colors">
              {parsing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Parsing…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
                  </svg>
                  Upload Image
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={parsing}
                onChange={parseFile}
              />
            </label>
          </div>

          {parseError && (
            <p className="text-xs text-red-600 dark:text-red-400">{parseError}</p>
          )}
        </div>
      )}

      {/* Parse Review */}
      {parsedItems && (
        <ParseReviewPanel
          parsed={parsedItems}
          onConfirm={confirmParsed}
          onDiscard={() => {
            setParsedItems(null);
            setShowUpload(false);
          }}
          saving={parseSaving}
        />
      )}

      {/* Filter tabs */}
      {supplements.length > 0 && !loading && (
        <div className="flex gap-1">
          {(["all", "active", "paused"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors capitalize ${
                filter === f
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Supplement list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center">
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            {supplements.length === 0
              ? "No supplements yet."
              : "No supplements match this filter."}
          </p>
          {supplements.length === 0 && (
            <p className="text-neutral-400 dark:text-neutral-600 text-xs mt-1">
              Add your stack manually or paste a list to parse automatically.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className={deletingId === s.id ? "opacity-50 pointer-events-none" : ""}>
              <SupplementCard
                supplement={s}
                onEdit={openEdit}
                onToggle={toggleActive}
                onDelete={deleteSupplement}
                taken={takenToday.has(s.id)}
                onToggleTaken={toggleTaken}
              />
            </div>
          ))}
        </div>
      )}

      </>}
    </div>
  );
}
