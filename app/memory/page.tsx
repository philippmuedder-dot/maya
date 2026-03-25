"use client";

import { useEffect, useState } from "react";

type MemoryCategory = "preference" | "pattern" | "goal" | "avoid" | "insight";

interface Memory {
  id: string;
  category: MemoryCategory;
  insight: string;
  source: string;
  created_at: string;
  last_reinforced_at: string;
}

const CATEGORY_CONFIG: Record<
  MemoryCategory,
  { label: string; emoji: string; description: string }
> = {
  preference: { label: "Preferences", emoji: "👤", description: "Things you like or dislike, how you want things done" },
  pattern: { label: "Patterns", emoji: "🔄", description: "Recurring behaviors and tendencies" },
  goal: { label: "Goals", emoji: "🎯", description: "Things you're working toward" },
  avoid: { label: "Avoid", emoji: "🚫", description: "Things that drain you or should be minimized" },
  insight: { label: "Insights", emoji: "💡", description: "Meaningful observations about your mindset and growth" },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as MemoryCategory[];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [addCategory, setAddCategory] = useState<MemoryCategory>("insight");
  const [addInsight, setAddInsight] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetch("/api/memory")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMemories)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/memory/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = addInsight.trim();
    if (!text) return;

    setAdding(true);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: addCategory, insight: text }),
      });
      if (res.ok) {
        const newMemory = await res.json();
        setMemories((prev) => [newMemory, ...prev]);
        setAddInsight("");
        setShowAddForm(false);
      }
    } finally {
      setAdding(false);
    }
  }

  const grouped = ALL_CATEGORIES.reduce<Record<MemoryCategory, Memory[]>>(
    (acc, cat) => {
      acc[cat] = memories.filter((m) => m.category === cat);
      return acc;
    },
    {} as Record<MemoryCategory, Memory[]>
  );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Memory
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          What MAYA has learned about you from conversations. Extracted every 10 messages.
        </p>
      </div>

      {/* Add memory */}
      <div className="mb-6">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            + Add manual insight
          </button>
        ) : (
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3"
          >
            <div className="flex gap-2">
              <select
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value as MemoryCategory)}
                className="px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].emoji} {CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={addInsight}
              onChange={(e) => setAddInsight(e.target.value)}
              placeholder="Describe the insight..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding || !addInsight.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {adding ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddInsight(""); }}
                className="px-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {loading && (
        <div className="text-sm text-neutral-400 animate-pulse">Loading memories...</div>
      )}

      {!loading && memories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧠</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No memories yet. MAYA will start learning after every 10 chat messages.
          </p>
        </div>
      )}

      {/* Grouped by category */}
      <div className="space-y-6">
        {ALL_CATEGORIES.map((cat) => {
          const items = grouped[cat];
          if (items.length === 0) return null;
          const config = CATEGORY_CONFIG[cat];
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{config.emoji}</span>
                <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  {config.label}
                </h2>
                <span className="text-xs text-neutral-400">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map((memory) => (
                  <div
                    key={memory.id}
                    className="flex items-start justify-between gap-3 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">
                        {memory.insight}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {memory.source === "manual" ? "Added manually" : "From chat"} · {formatDate(memory.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(memory.id)}
                      disabled={deleting === memory.id}
                      className="text-neutral-300 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors text-lg leading-none mt-0.5 disabled:opacity-50 flex-shrink-0"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
