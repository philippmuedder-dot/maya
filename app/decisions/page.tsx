"use client";

import { useEffect, useState } from "react";

interface Decision {
  id: string;
  user_id: string;
  date: string;
  description: string;
  decision_type: "gut" | "rational" | "fear" | "mixed";
  confidence: number | null;
  expected_outcome: string | null;
  actual_outcome: string | null;
  outcome_satisfaction: number | null;
  followup_date: string | null;
  created_at: string;
}

const DECISION_TYPES = ["gut", "rational", "fear", "mixed"] as const;

const TYPE_LABELS: Record<string, string> = {
  gut: "Gut-led",
  rational: "Rational",
  fear: "Fear-led",
  mixed: "Mixed",
};

const TYPE_BADGE: Record<string, string> = {
  gut: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
  rational: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  fear: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
  mixed: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
};

const TYPE_PILL_SELECTED: Record<string, string> = {
  gut: "bg-emerald-600 dark:bg-emerald-500 text-white border-transparent",
  rational: "bg-blue-600 dark:bg-blue-500 text-white border-transparent",
  fear: "bg-red-600 dark:bg-red-500 text-white border-transparent",
  mixed: "bg-purple-600 dark:bg-purple-500 text-white border-transparent",
};

const TYPE_BAR_COLOR: Record<string, string> = {
  gut: "bg-emerald-500",
  rational: "bg-blue-500",
  fear: "bg-red-500",
  mixed: "bg-purple-500",
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Decision Form ────────────────────────────────────────────────────────────

function DecisionForm({
  onSave,
  onCancel,
  saving,
}: {
  onSave: (data: {
    description: string;
    decision_type: string;
    confidence: number;
    expected_outcome: string;
    followup_date: string;
  }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [description, setDescription] = useState("");
  const [decisionType, setDecisionType] = useState("");
  const [confidence, setConfidence] = useState(5);
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [followupDate, setFollowupDate] = useState("");

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4 bg-neutral-50 dark:bg-neutral-900/50">
      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          What&apos;s the decision? *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Describe the decision you made or need to make..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none"
        />
      </div>

      {/* Decision type pills */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">
          How was it made? *
        </label>
        <div className="flex gap-2 flex-wrap">
          {DECISION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDecisionType(decisionType === t ? "" : t)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                decisionType === t
                  ? TYPE_PILL_SELECTED[t]
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Confidence slider */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          Confidence{" "}
          <span className="text-neutral-400 dark:text-neutral-500">
            ({confidence}/10)
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="w-full accent-neutral-900 dark:accent-neutral-100"
        />
      </div>

      {/* Expected outcome */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          Expected outcome
        </label>
        <input
          type="text"
          value={expectedOutcome}
          onChange={(e) => setExpectedOutcome(e.target.value)}
          placeholder="What do you expect to happen?"
          className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        />
      </div>

      {/* Follow-up date */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          Follow-up date{" "}
          <span className="text-neutral-400 dark:text-neutral-500">(optional)</span>
        </label>
        <input
          type="date"
          value={followupDate}
          onChange={(e) => setFollowupDate(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() =>
            onSave({
              description,
              decision_type: decisionType,
              confidence,
              expected_outcome: expectedOutcome,
              followup_date: followupDate,
            })
          }
          disabled={saving || !description.trim() || !decisionType}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save"}
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

// ─── Follow-up Card ──────────────────────────────────────────────────────────

function FollowUpCard({
  decision,
  onSave,
  saving,
}: {
  decision: Decision;
  onSave: (id: string, actual_outcome: string, outcome_satisfaction: number) => void;
  saving: boolean;
}) {
  const [actualOutcome, setActualOutcome] = useState("");
  const [satisfaction, setSatisfaction] = useState(5);

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 p-4 bg-amber-50/50 dark:bg-amber-900/10 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {decision.description}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                TYPE_BADGE[decision.decision_type]
              }`}
            >
              {TYPE_LABELS[decision.decision_type]}
            </span>
            {decision.confidence && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Confidence: {decision.confidence}/10
              </span>
            )}
          </div>
          {decision.expected_outcome && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Expected: {decision.expected_outcome}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          What actually happened?
        </label>
        <textarea
          value={actualOutcome}
          onChange={(e) => setActualOutcome(e.target.value)}
          rows={2}
          placeholder="Describe the actual outcome..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          Satisfaction with outcome{" "}
          <span className="text-neutral-400 dark:text-neutral-500">
            ({satisfaction}/10)
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={satisfaction}
          onChange={(e) => setSatisfaction(Number(e.target.value))}
          className="w-full accent-neutral-900 dark:accent-neutral-100"
        />
      </div>

      <button
        onClick={() => onSave(decision.id, actualOutcome, satisfaction)}
        disabled={saving || !actualOutcome.trim()}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

// ─── Decision Insights ────────────────────────────────────────────────────────

interface DecisionInsightsData {
  gut_satisfaction_rate: number | null;
  rational_satisfaction_rate: number | null;
  fear_satisfaction_rate: number | null;
  mixed_satisfaction_rate: number | null;
  confidence_correlation: string;
  insight: string;
  recommendation: string;
  decisions_with_outcomes: number;
  total_decisions: number;
}

function DecisionInsights() {
  const [data, setData] = useState<DecisionInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insufficientData, setInsufficientData] = useState(false);
  const [decisionsWithOutcomes, setDecisionsWithOutcomes] = useState(0);
  const [decisionsNeeded, setDecisionsNeeded] = useState(8);

  useEffect(() => {
    fetch("/api/insights/decisions")
      .then((r) => r.json())
      .then((d) => {
        if (d.insufficient_data) {
          setInsufficientData(true);
          setDecisionsWithOutcomes(d.decisions_with_outcomes ?? 0);
          setDecisionsNeeded(d.decisions_needed ?? 8);
        } else {
          setData(d);
        }
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Building decision intelligence
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {decisionsWithOutcomes} of {decisionsNeeded} decisions with outcomes logged. Log decisions and follow up on them to unlock Sacral authority insights.
        </p>
        <div className="w-48 mx-auto">
          <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100 transition-all"
              style={{ width: `${Math.min(100, (decisionsWithOutcomes / decisionsNeeded) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const rates = [
    { type: "Gut-led", rate: data.gut_satisfaction_rate, color: "bg-emerald-500" },
    { type: "Rational", rate: data.rational_satisfaction_rate, color: "bg-blue-500" },
    { type: "Fear-led", rate: data.fear_satisfaction_rate, color: "bg-red-500" },
    { type: "Mixed", rate: data.mixed_satisfaction_rate, color: "bg-purple-500" },
  ].filter((r) => r.rate !== null);

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Based on {data.decisions_with_outcomes} decisions with recorded outcomes.
      </p>

      {/* Satisfaction rates by type */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Satisfaction by Decision Type
        </h3>
        <div className="space-y-2.5">
          {rates.map((r) => (
            <div key={r.type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{r.type}</span>
                <span className="text-neutral-500 dark:text-neutral-400">{r.rate}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${r.color} transition-all`}
                  style={{ width: `${r.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sacral insight */}
      <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 p-4 space-y-2">
        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          Sacral Authority Evidence
        </h3>
        <p className="text-sm text-emerald-800 dark:text-emerald-300">{data.insight}</p>
      </div>

      {/* Confidence correlation */}
      {data.confidence_correlation && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Confidence vs Outcome
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{data.confidence_correlation}</p>
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 p-4">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          Recommendation
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{data.recommendation}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [followupSaving, setFollowupSaving] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "insights">("log");

  useEffect(() => {
    fetch("/api/decisions")
      .then((r) => r.json())
      .then((data) => {
        if (data.decisions) setDecisions(data.decisions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Create decision ────────────────────────────────────────────────────────

  async function saveDecision(formData: {
    description: string;
    decision_type: string;
    confidence: number;
    expected_outcome: string;
    followup_date: string;
  }) {
    setFormSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description.trim(),
          decision_type: formData.decision_type,
          confidence: formData.confidence,
          expected_outcome: formData.expected_outcome.trim() || null,
          followup_date: formData.followup_date || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed.");
      setDecisions((prev) => [data, ...prev]);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setFormSaving(false);
    }
  }

  // ── Follow-up save ─────────────────────────────────────────────────────────

  async function saveFollowup(
    id: string,
    actual_outcome: string,
    outcome_satisfaction: number
  ) {
    setFollowupSaving(id);

    try {
      const res = await fetch(`/api/decisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual_outcome, outcome_satisfaction }),
      });
      const data = await res.json();
      if (res.ok) {
        setDecisions((prev) => prev.map((d) => (d.id === id ? data : d)));
      }
    } catch (err) {
      console.error("Follow-up save failed:", err);
    } finally {
      setFollowupSaving(null);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function deleteDecision(id: string) {
    if (!confirm("Delete this decision?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/decisions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
    }
    setDeletingId(null);
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const today = todayStr();

  const pendingFollowups = decisions.filter(
    (d) =>
      d.followup_date &&
      d.followup_date <= today &&
      !d.actual_outcome
  );

  // Outcome stats: only for decisions with outcome_satisfaction
  const withOutcomes = decisions.filter(
    (d) => d.outcome_satisfaction !== null && d.outcome_satisfaction !== undefined
  );

  const outcomeStats: { type: string; avg: number; count: number }[] = [];
  if (withOutcomes.length >= 5) {
    for (const type of DECISION_TYPES) {
      const ofType = withOutcomes.filter((d) => d.decision_type === type);
      if (ofType.length > 0) {
        const avg =
          ofType.reduce((sum, d) => sum + (d.outcome_satisfaction ?? 0), 0) /
          ofType.length;
        outcomeStats.push({ type, avg: Math.round(avg * 10) / 10, count: ofType.length });
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Decisions
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {loading
              ? "Loading..."
              : `${decisions.length} decision${decisions.length !== 1 ? "s" : ""} logged`}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setFormError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Log a Decision
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {(["log", "insights"] as const).map((tab) => (
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
      {activeTab === "insights" && <DecisionInsights />}

      {/* Log tab */}
      {activeTab === "log" && (<>

      {/* Log form */}
      {showForm && (
        <DecisionForm
          onSave={saveDecision}
          onCancel={() => {
            setShowForm(false);
            setFormError(null);
          }}
          saving={formSaving}
        />
      )}
      {formError && (
        <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
      )}

      {/* Pending Follow-ups */}
      {pendingFollowups.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Pending Follow-ups
          </h2>
          {pendingFollowups.map((d) => (
            <FollowUpCard
              key={d.id}
              decision={d}
              onSave={saveFollowup}
              saving={followupSaving === d.id}
            />
          ))}
        </div>
      )}

      {/* Outcome Stats */}
      {outcomeStats.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Decision Quality by Type
          </h2>
          <div className="space-y-2">
            {outcomeStats.map((s) => (
              <div key={s.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {TYPE_LABELS[s.type]}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {s.avg} avg ({s.count} decision{s.count !== 1 ? "s" : ""})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${TYPE_BAR_COLOR[s.type]}`}
                    style={{ width: `${(s.avg / 10) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Decisions */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse"
            />
          ))}
        </div>
      ) : decisions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center">
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">
            No decisions logged yet.
          </p>
          <p className="text-neutral-400 dark:text-neutral-600 text-xs mt-1">
            Start tracking your decisions to see patterns over time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            All Decisions
          </h2>
          {decisions.map((d) => (
            <div
              key={d.id}
              className={`rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 ${
                deletingId === d.id ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Description */}
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {d.description}
                  </p>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        TYPE_BADGE[d.decision_type]
                      }`}
                    >
                      {TYPE_LABELS[d.decision_type]}
                    </span>
                    {d.confidence && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {d.confidence}/10
                      </span>
                    )}
                  </div>

                  {/* Expected outcome */}
                  {d.expected_outcome && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-medium">Expected:</span> {d.expected_outcome}
                    </p>
                  )}

                  {/* Actual outcome */}
                  {d.actual_outcome && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-medium">Actual:</span> {d.actual_outcome}
                      {d.outcome_satisfaction && (
                        <span className="ml-2 text-neutral-400 dark:text-neutral-500">
                          (satisfaction: {d.outcome_satisfaction}/10)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Follow-up date (future) */}
                  {d.followup_date &&
                    d.followup_date > today &&
                    !d.actual_outcome && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500">
                        Follow up:{" "}
                        {new Date(d.followup_date + "T00:00:00").toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </p>
                    )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => deleteDecision(d.id)}
                  title="Delete"
                  className="shrink-0 p-1.5 rounded-lg text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      </>)}
    </div>
  );
}
