"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { MealLog } from "@/lib/supabase";

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const TAG_COLORS: Record<string, string> = {
  inflammatory: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  "high-glycemic": "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
  "high-protein": "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  processed: "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  "whole-food": "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  "high-fat": "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
  "high-fiber": "bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
  alcohol: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

interface MealAnalysis {
  meal_type: string;
  foods_identified: string[];
  tags: string[];
  rough_macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  ai_summary: string;
}

export default function MealsPage() {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("image/jpeg");

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);

  const fetchMeals = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
      const res = await fetch("/api/meals");
      if (res.ok) {
        const data = await res.json();
        setMeals(data.meals ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMeals(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setAnalysis(null);
    setAnalyzeError(null);
    setSavedId(null);
    setSaveError(null);

    const mime = file.type || "image/jpeg";
    setMimeType(mime);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreviewUrl(dataUrl);
      // Strip data URL prefix to get raw base64
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      analyzeImage(base64, mime);
    };
    reader.readAsDataURL(file);
  }

  async function analyzeImage(b64: string, mime: string) {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/meals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: b64, mimeType: mime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveMeal() {
    if (!analysis) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/meals/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          analysis,
          logged_at: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSavedId(data.id);
      // Refresh the meals list
      fetchMeals();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setPreviewUrl(null);
    setImageBase64(null);
    setAnalysis(null);
    setAnalyzeError(null);
    setSavedId(null);
    setSaveError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold mb-1">Meals</h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        Photo log with Claude nutrition analysis
      </p>

      {/* Upload / Camera area */}
      {!previewUrl && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl py-12 bg-neutral-50 dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
        >
          <span className="text-5xl">📸</span>
          <span className="text-base font-medium text-neutral-700 dark:text-neutral-300">
            Take or upload a photo
          </span>
          <span className="text-sm text-neutral-400 dark:text-neutral-500">
            Tap to open camera or choose from library
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Preview */}
      {previewUrl && (
        <div className="space-y-4">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Meal preview"
              className="w-full max-h-72 object-cover rounded-2xl"
            />
            {!savedId && (
              <button
                onClick={reset}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Analyzing state */}
          {analyzing && (
            <div className="flex items-center gap-3 px-4 py-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              <span className="animate-spin text-xl">⏳</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Analyzing with Claude Vision...
              </span>
            </div>
          )}

          {/* Error */}
          {analyzeError && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
              {analyzeError}
            </div>
          )}

          {/* Analysis result */}
          {analysis && !savedId && (
            <div className="space-y-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
              {/* Meal type */}
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {analysis.meal_type === "breakfast" ? "🌅" :
                   analysis.meal_type === "lunch" ? "☀️" :
                   analysis.meal_type === "dinner" ? "🌙" : "🍎"}
                </span>
                <span className="font-semibold capitalize">
                  {MEAL_TYPE_LABELS[analysis.meal_type] ?? analysis.meal_type}
                </span>
              </div>

              {/* Summary */}
              {analysis.ai_summary && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {analysis.ai_summary}
                </p>
              )}

              {/* Foods */}
              {analysis.foods_identified?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                    Foods Identified
                  </p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    {analysis.foods_identified.join(", ")}
                  </p>
                </div>
              )}

              {/* Tags */}
              {analysis.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {analysis.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${TAG_COLORS[tag] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Macros */}
              {analysis.rough_macros && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Calories", value: analysis.rough_macros.calories, unit: "kcal" },
                    { label: "Protein", value: analysis.rough_macros.protein_g, unit: "g" },
                    { label: "Carbs", value: analysis.rough_macros.carbs_g, unit: "g" },
                    { label: "Fat", value: analysis.rough_macros.fat_g, unit: "g" },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold">{value}</p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{unit}</p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Save button */}
              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
              <button
                onClick={saveMeal}
                disabled={saving}
                className="w-full py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save meal"}
              </button>
            </div>
          )}

          {/* Saved success */}
          {savedId && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center space-y-3">
              <p className="text-2xl">✅</p>
              <p className="font-medium text-green-800 dark:text-green-300">Meal saved!</p>
              <button
                onClick={reset}
                className="text-sm text-neutral-500 dark:text-neutral-400 underline"
              >
                Log another meal
              </button>
            </div>
          )}
        </div>
      )}

      {/* Meal history */}
      <div className="mt-8">
        <h2 className="text-base font-semibold mb-3">Recent meals</h2>

        {loadingMeals && (
          <div className="text-sm text-neutral-400 dark:text-neutral-500">Loading...</div>
        )}

        {!loadingMeals && meals.length === 0 && (
          <div className="text-sm text-neutral-400 dark:text-neutral-500">
            No meals logged yet. Take your first photo above.
          </div>
        )}

        <div className="space-y-3">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="flex gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3"
            >
              {meal.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={meal.photo_url}
                  alt={meal.ai_summary ?? "Meal"}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                  🍽️
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium capitalize">
                    {MEAL_TYPE_LABELS[meal.meal_type ?? ""] ?? meal.meal_type ?? "Meal"}
                  </span>
                  {meal.rough_macros && typeof meal.rough_macros === "object" && "calories" in meal.rough_macros && (
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      {(meal.rough_macros as { calories: number }).calories} kcal
                    </span>
                  )}
                </div>
                {meal.ai_summary && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {meal.ai_summary}
                  </p>
                )}
                {meal.tags && meal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {meal.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_COLORS[tag] ?? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                  {formatDate(meal.logged_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
