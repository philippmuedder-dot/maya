"use client";

import { useState, useEffect } from "react";

interface Props {
  prompts: string[];
}

interface SacralResponse {
  prompt: string;
  response: "yes" | "no";
}

export default function SacralPanel({ prompts }: Props) {
  const [responses, setResponses] = useState<SacralResponse[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Load today's already-saved responses on mount
  useEffect(() => {
    fetch("/api/sacral")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { prompt: string; response: "yes" | "no" }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setResponses(data.map((d) => ({ prompt: d.prompt, response: d.response })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false));
  }, []);

  const answered = new Set(responses.map((r) => r.prompt));

  async function handleResponse(prompt: string, response: "yes" | "no") {
    setSaving(prompt);
    try {
      const res = await fetch("/api/sacral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, response }),
      });
      if (res.ok) {
        setResponses((prev) => [...prev, { prompt, response }]);
      }
    } catch (err) {
      console.error("Sacral response failed:", err);
    } finally {
      setSaving(null);
    }
  }

  if (loadingExisting) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Sacral Response
          </h3>
        </div>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const allAnswered = prompts.length > 0 && prompts.every((p) => answered.has(p));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Sacral Response
        </h3>
        <span className="text-xs text-neutral-400">
          {allAnswered ? "All responses saved for today" : "Trust your gut — yes or no"}
        </span>
      </div>

      {prompts.map((prompt) => {
        const resp = responses.find((r) => r.prompt === prompt);
        const isAnswered = answered.has(prompt);
        const isSaving = saving === prompt;

        return (
          <div
            key={prompt}
            className={`p-4 rounded-xl border transition-all ${
              isAnswered
                ? resp?.response === "yes"
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                  : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700"
                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
            }`}
          >
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
              Does{" "}
              <span className="font-semibold">{prompt}</span>{" "}
              feel like a yes?
            </p>

            {isAnswered ? (
              <p className="text-xs font-medium">
                {resp?.response === "yes" ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Yes — go for it
                  </span>
                ) : (
                  <span className="text-neutral-500">
                    No — honor that and skip it
                  </span>
                )}
              </p>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleResponse(prompt, "yes")}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? "..." : "Yes"}
                </button>
                <button
                  onClick={() => handleResponse(prompt, "no")}
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                >
                  {isSaving ? "..." : "No"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
