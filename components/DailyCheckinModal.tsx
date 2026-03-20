"use client";

import { useState } from "react";

interface Props {
  onComplete: () => void;
}

const MOODS = ["Energized", "Calm", "Neutral", "Tired", "Frustrated"] as const;
const CREATIVE = ["Sparked", "Neutral", "Depleted"] as const;

const MOOD_ICONS: Record<string, string> = {
  Energized: "⚡",
  Calm: "🌊",
  Neutral: "😐",
  Tired: "😴",
  Frustrated: "😤",
};

export default function DailyCheckinModal({ onComplete }: Props) {
  const [stress, setStress] = useState(5);
  const [stressor, setStressor] = useState("");
  const [mood, setMood] = useState<string>("");
  const [creative, setCreative] = useState<string>("");
  const [feelingIsMine, setFeelingIsMine] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0); // 0=stress, 1=mood, 2=creative, 3=solar plexus (conditional)

  const showSolarPlexus = stress > 6;
  const totalSteps = showSolarPlexus ? 4 : 3;

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stress_level: stress,
          top_stressor: stressor || null,
          mood,
          creative_energy: creative,
          feeling_is_mine: showSolarPlexus ? feelingIsMine : null,
        }),
      });
      if (res.ok) {
        onComplete();
      }
    } catch (err) {
      console.error("Check-in failed:", err);
    } finally {
      setSaving(false);
    }
  }

  function canAdvance() {
    if (step === 0) return true;
    if (step === 1) return mood !== "";
    if (step === 2) return creative !== "";
    return true;
  }

  function next() {
    if (step === 2 && !showSolarPlexus) {
      handleSubmit();
    } else if (step === totalSteps - 1) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
            Daily Check-in
          </p>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
            How are you showing up today?
          </h2>
          {/* Progress dots */}
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
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
        <div className="px-6 py-6 min-h-[200px]">
          {step === 0 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                How stressed did you feel yesterday?
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={stress}
                  onChange={(e) => setStress(parseInt(e.target.value, 10))}
                  className="w-full accent-neutral-900 dark:accent-neutral-100"
                />
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Calm</span>
                  <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {stress}
                  </span>
                  <span>Maxed out</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Top stressor (optional)
                </label>
                <input
                  type="text"
                  value={stressor}
                  onChange={(e) => setStressor(e.target.value)}
                  placeholder="What weighed on you most?"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                How would you describe your mood right now?
              </label>
              <div className="grid grid-cols-5 gap-2">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-all ${
                      mood === m
                        ? "border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                        : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                    }`}
                  >
                    <span className="text-xl">{MOOD_ICONS[m]}</span>
                    <span>{m}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Creative energy?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {CREATIVE.map((c) => {
                  const icons: Record<string, string> = {
                    Sparked: "✨",
                    Neutral: "➖",
                    Depleted: "🪫",
                  };
                  return (
                    <button
                      key={c}
                      onClick={() => setCreative(c)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm transition-all ${
                        creative === c
                          ? "border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                      }`}
                    >
                      <span className="text-2xl">{icons[c]}</span>
                      <span>{c}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && showSolarPlexus && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Undefined Solar Plexus Check
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  You absorb others&apos; emotions. High stress may not be
                  yours.
                </p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={feelingIsMine}
                  onChange={(e) => setFeelingIsMine(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-neutral-900 dark:accent-neutral-100"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Yes, this feeling is actually mine — not absorbed from someone
                  else
                </span>
              </label>
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
            disabled={!canAdvance() || saving}
            className="px-6 py-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : step === totalSteps - 1 || (step === 2 && !showSolarPlexus)
                ? "Generate Briefing"
                : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
