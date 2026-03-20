"use client";

import { useEffect, useState, useCallback } from "react";

interface FlowState {
  id: string;
  user_id: string;
  date: string;
  activity: string;
  start_time: string | null;
  duration_mins: number | null;
  preceded_by: string | null;
  created_at: string;
}

interface CreativeSeed {
  id: string;
  user_id: string;
  idea: string;
  sparked_at: string;
  status: "active" | "exploring" | "parked";
  created_at: string;
}

interface GutDecisionStats {
  gut: number;
  rational: number;
  fear: number;
}

interface TodayCheckin {
  creative_energy: string | null;
  gut_decision_type: string | null;
}

// Deterministic rotation based on id string
function getRotation(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return (hash % 5) - 2; // -2 to 2
}

const SEED_COLORS: Record<string, string> = {
  active: "bg-yellow-50 dark:bg-yellow-900/20",
  exploring: "bg-amber-50 dark:bg-amber-900/20",
  parked: "bg-neutral-100 dark:bg-neutral-800",
};

const SEED_STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  exploring: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  parked: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400",
};

const STATUS_CYCLE: Record<string, string> = {
  active: "exploring",
  exploring: "parked",
  parked: "active",
};

export default function FlowPage() {
  const [flowStates, setFlowStates] = useState<FlowState[]>([]);
  const [creativeSeeds, setCreativeSeeds] = useState<CreativeSeed[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<TodayCheckin | null>(null);
  const [gutStats, setGutStats] = useState<GutDecisionStats>({ gut: 0, rational: 0, fear: 0 });
  const [loading, setLoading] = useState(true);

  // Flow form
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [flowForm, setFlowForm] = useState({
    activity: "",
    start_time: "",
    duration_mins: "",
    preceded_by: "",
  });
  const [flowSaving, setFlowSaving] = useState(false);

  // Seed form
  const [showSeedForm, setShowSeedForm] = useState(false);
  const [seedIdea, setSeedIdea] = useState("");
  const [seedSaving, setSeedSaving] = useState(false);

  // Gut decision
  const [gutSaving, setGutSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/flow");
      if (res.ok) {
        const data = await res.json();
        setFlowStates(data.flowStates);
        setCreativeSeeds(data.creativeSeeds);
        setTodayCheckin(data.todayCheckin);
        setGutStats(data.gutDecisionStats);
      }
    } catch (err) {
      console.error("Failed to fetch flow data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Flow State handlers ──────────────────────────────────────────────────

  async function saveFlowState() {
    if (!flowForm.activity.trim()) return;
    setFlowSaving(true);
    try {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "flow",
          activity: flowForm.activity.trim(),
          start_time: flowForm.start_time || null,
          duration_mins: flowForm.duration_mins || null,
          preceded_by: flowForm.preceded_by.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFlowStates((prev) => [data, ...prev].slice(0, 10));
        setFlowForm({ activity: "", start_time: "", duration_mins: "", preceded_by: "" });
        setShowFlowForm(false);
      }
    } catch (err) {
      console.error("Failed to save flow state:", err);
    } finally {
      setFlowSaving(false);
    }
  }

  async function deleteFlowState(id: string) {
    if (!confirm("Delete this flow state?")) return;
    try {
      const res = await fetch(`/api/flow/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFlowStates((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete flow state:", err);
    }
  }

  // ── Gut Decision handlers ────────────────────────────────────────────────

  async function setGutDecision(type: string) {
    setGutSaving(true);
    try {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "gut_decision", gut_decision_type: type }),
      });
      if (res.ok) {
        setTodayCheckin((prev) => prev ? { ...prev, gut_decision_type: type } : prev);
        // Update local stats
        setGutStats((prev) => {
          const updated = { ...prev };
          // Remove old selection if any
          if (todayCheckin?.gut_decision_type) {
            const old = todayCheckin.gut_decision_type as keyof GutDecisionStats;
            if (old in updated) updated[old] = Math.max(0, updated[old] - 1);
          }
          // Add new
          const key = type as keyof GutDecisionStats;
          if (key in updated) updated[key]++;
          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to set gut decision:", err);
    } finally {
      setGutSaving(false);
    }
  }

  // ── Creative Seed handlers ───────────────────────────────────────────────

  async function saveSeed() {
    if (!seedIdea.trim()) return;
    setSeedSaving(true);
    try {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "seed", idea: seedIdea.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreativeSeeds((prev) => [data, ...prev]);
        setSeedIdea("");
        setShowSeedForm(false);
      }
    } catch (err) {
      console.error("Failed to save seed:", err);
    } finally {
      setSeedSaving(false);
    }
  }

  async function cycleSeedStatus(seed: CreativeSeed) {
    const nextStatus = STATUS_CYCLE[seed.status] || "active";
    try {
      const res = await fetch(`/api/flow/${seed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreativeSeeds((prev) => prev.map((s) => (s.id === seed.id ? data : s)));
      }
    } catch (err) {
      console.error("Failed to update seed:", err);
    }
  }

  async function deleteSeed(id: string) {
    try {
      const res = await fetch(`/api/flow/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCreativeSeeds((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete seed:", err);
    }
  }

  // ── Donut chart ──────────────────────────────────────────────────────────

  const gutTotal = gutStats.gut + gutStats.rational + gutStats.fear;
  const gutPct = gutTotal > 0 ? (gutStats.gut / gutTotal) * 100 : 0;
  const rationalPct = gutTotal > 0 ? (gutStats.rational / gutTotal) * 100 : 0;
  // fearPct is the remainder

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-64" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Flow</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Creative energy, flow states, and decision tracking.
        </p>
      </div>

      {/* ── Daily Creative Pulse ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-3">
          Daily Creative Pulse
        </h2>
        {todayCheckin?.creative_energy ? (
          <span
            className={`inline-flex items-center text-sm font-medium px-3 py-1.5 rounded-full ${
              todayCheckin.creative_energy.toLowerCase() === "high"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : todayCheckin.creative_energy.toLowerCase() === "medium"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            {todayCheckin.creative_energy}
          </span>
        ) : (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Complete your morning check-in to see today&apos;s creative energy
          </p>
        )}
      </div>

      {/* ── Flow State Logger ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Flow State Logger
          </h2>
          {!showFlowForm && (
            <button
              onClick={() => setShowFlowForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Log a Flow State
            </button>
          )}
        </div>

        {/* Inline form */}
        {showFlowForm && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 bg-neutral-50 dark:bg-neutral-900/50">
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                What were you doing? *
              </label>
              <input
                type="text"
                value={flowForm.activity}
                onChange={(e) => setFlowForm((f) => ({ ...f, activity: e.target.value }))}
                placeholder="e.g. Deep coding session, writing"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  What time did you start?
                </label>
                <input
                  type="time"
                  value={flowForm.start_time}
                  onChange={(e) => setFlowForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  How long? (minutes)
                </label>
                <input
                  type="number"
                  value={flowForm.duration_mins}
                  onChange={(e) => setFlowForm((f) => ({ ...f, duration_mins: e.target.value }))}
                  placeholder="45"
                  min="1"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                What preceded it?
              </label>
              <input
                type="text"
                value={flowForm.preceded_by}
                onChange={(e) => setFlowForm((f) => ({ ...f, preceded_by: e.target.value }))}
                placeholder="e.g. Morning walk, coffee, meditation"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveFlowState}
                disabled={flowSaving || !flowForm.activity.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {flowSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setShowFlowForm(false);
                  setFlowForm({ activity: "", start_time: "", duration_mins: "", preceded_by: "" });
                }}
                disabled={flowSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Flow state list */}
        {flowStates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No flow states logged yet.
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
              Start tracking when you enter flow to find your patterns.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {flowStates.map((fs) => (
              <div
                key={fs.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {fs.activity}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(fs.date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {fs.start_time && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {fs.start_time}
                      </span>
                    )}
                    {fs.duration_mins && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                        {fs.duration_mins} min
                      </span>
                    )}
                  </div>
                  {fs.preceded_by && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1 italic">
                      Preceded by: {fs.preceded_by}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => deleteFlowState(fs.id)}
                  title="Delete"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Gut vs Rational Tracker ───────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Gut vs Rational Tracker
        </h2>

        {todayCheckin ? (
          <>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Today&apos;s decisions were mostly:
            </p>
            <div className="flex gap-2">
              {([
                { key: "gut", label: "Gut-led", color: "bg-green-500", hover: "hover:bg-green-600", ring: "ring-green-500" },
                { key: "rational", label: "Rational", color: "bg-blue-500", hover: "hover:bg-blue-600", ring: "ring-blue-500" },
                { key: "fear", label: "Fear-led", color: "bg-red-500", hover: "hover:bg-red-600", ring: "ring-red-500" },
              ] as const).map(({ key, label, color, hover, ring }) => {
                const isSelected = todayCheckin.gut_decision_type === key;
                return (
                  <button
                    key={key}
                    onClick={() => setGutDecision(key)}
                    disabled={gutSaving}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${
                      isSelected
                        ? `${color} text-white ring-2 ${ring} ring-offset-2 ring-offset-white dark:ring-offset-neutral-950`
                        : `border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 ${hover}`
                    }`}
                  >
                    {isSelected && (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Complete your morning check-in first to track today&apos;s decision style.
          </p>
        )}

        {/* Donut chart — last 30 days */}
        {gutTotal > 0 && (
          <div className="flex items-center gap-6 pt-2">
            <div
              className="w-24 h-24 rounded-full shrink-0"
              style={{
                background: `conic-gradient(
                  #10b981 0% ${gutPct}%,
                  #3b82f6 ${gutPct}% ${gutPct + rationalPct}%,
                  #ef4444 ${gutPct + rationalPct}% 100%
                )`,
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white dark:bg-neutral-950" />
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  Gut-led: {gutStats.gut}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  Rational: {gutStats.rational}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                <span className="text-neutral-700 dark:text-neutral-300">
                  Fear-led: {gutStats.fear}
                </span>
              </div>
              <p className="text-neutral-400 dark:text-neutral-600 pt-1">
                Last 30 days ({gutTotal} entries)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Creative Seeds Board ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Creative Seeds
          </h2>
          {!showSeedForm && (
            <button
              onClick={() => setShowSeedForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Capture an Idea
            </button>
          )}
        </div>

        {/* Inline seed form */}
        {showSeedForm && (
          <div className="flex gap-2">
            <input
              type="text"
              value={seedIdea}
              onChange={(e) => setSeedIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && seedIdea.trim()) saveSeed();
                if (e.key === "Escape") {
                  setShowSeedForm(false);
                  setSeedIdea("");
                }
              }}
              placeholder="What's the idea?"
              autoFocus
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
            />
            <button
              onClick={saveSeed}
              disabled={seedSaving || !seedIdea.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {seedSaving ? "..." : "Save"}
            </button>
            <button
              onClick={() => {
                setShowSeedForm(false);
                setSeedIdea("");
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Seeds grid */}
        {creativeSeeds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-8 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No creative seeds yet.
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
              Capture ideas as they come — nurture them later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {creativeSeeds.map((seed) => {
              const rotation = getRotation(seed.id);
              return (
                <div
                  key={seed.id}
                  className={`relative rounded-xl p-4 ${SEED_COLORS[seed.status]} border border-neutral-200/60 dark:border-neutral-700/40 transition-transform hover:scale-[1.02]`}
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  {/* Delete button */}
                  <button
                    onClick={() => deleteSeed(seed.id)}
                    className="absolute top-2 right-2 p-1 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <p className="text-sm text-neutral-900 dark:text-neutral-100 pr-6 mb-3">
                    {seed.idea}
                  </p>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => cycleSeedStatus(seed)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors ${SEED_STATUS_BADGE[seed.status]}`}
                      title={`Click to change: ${seed.status} → ${STATUS_CYCLE[seed.status]}`}
                    >
                      {seed.status}
                    </button>
                    <span className="text-xs text-neutral-400 dark:text-neutral-600">
                      {new Date(seed.sparked_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
