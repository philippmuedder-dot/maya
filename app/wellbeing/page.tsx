import type { Metadata } from "next";
import { getServerSession } from "next-auth";

export const metadata: Metadata = { title: "MAYA — Wellbeing" };
import { authOptions } from "@/lib/auth";
import { getValidWhoopToken, fetchWhoopData, WhoopData } from "@/lib/whoop";
import { RecoveryRing } from "@/components/RecoveryRing";
import WorkoutSection from "./WorkoutSection";
import EatingWindowSection from "./EatingWindowSection";
import WorkoutPatterns from "./WorkoutPatterns";

// ─── Training recommendation logic ─────────────────────────────────────────────

type TrainingTier = "hard" | "moderate" | "recovery";

interface TrainingRec {
  tier: TrainingTier;
  headline: string;
  subline: string;
  suggestions: string[];
  timing: string;
  nutrition: {
    headline: string;
    points: string[];
  };
}

function getTrainingRec(recovery: number | null): TrainingRec {
  if (recovery === null) {
    return {
      tier: "moderate",
      headline: "No recovery data yet",
      subline: "Connect Whoop in Settings to get personalised daily training guidance.",
      suggestions: [
        "Default: moderate effort — zone 2 cardio or mobility work",
        "Listen to your body and respond accordingly",
        "Strength training if energy feels high",
      ],
      timing: "Morning or early afternoon",
      nutrition: {
        headline: "Balanced day",
        points: [
          "Adequate protein: 1.6–2g per kg bodyweight",
          "Eat in direct light — your digestion thrives in it",
          "Prioritise whole foods, fibre, and hydration",
          "Avoid processed food; gut health drives recovery",
        ],
      },
    };
  }

  if (recovery >= 70) {
    return {
      tier: "hard",
      headline: "Hard session day",
      subline: `Recovery at ${recovery}% — your body is primed. This is the window for strength and muscle-building work.`,
      suggestions: [
        "Compound lifts: squat, deadlift, bench, overhead press",
        "Target 3–5 sets per movement, 6–12 rep range",
        "Progressive overload — add weight or reps vs last session",
        "Rest 2–3 min between heavy sets",
        "Finish with 10–15 min zone 2 cooldown if desired",
      ],
      timing: "Morning or early afternoon — avoid training within 3h of sleep",
      nutrition: {
        headline: "High-protein day — hard training fuel",
        points: [
          "Protein: aim for 2g per kg bodyweight today",
          "Pre-workout: complex carbs 90–120 min before (oats, rice, fruit)",
          "Post-workout: protein + carbs within 90 min (Greek yoghurt, eggs, rice)",
          "Eat in direct light — your digestion type thrives here",
          "Creatine and magnesium glycinate support strength performance",
        ],
      },
    };
  }

  if (recovery >= 50) {
    return {
      tier: "moderate",
      headline: "Moderate session day",
      subline: `Recovery at ${recovery}% — solid but not peak. Protect your long-term capacity; moderate effort pays off more than pushing through.`,
      suggestions: [
        "Zone 2 cardio: 30–45 min at conversational pace (130–145 BPM)",
        "Mobility flow or yoga: hip openers, thoracic rotation, shoulder work",
        "Light strength: machines, cables, bodyweight — not max effort",
        "Stretching + breathwork to support parasympathetic recovery",
      ],
      timing: "Morning preferred — afternoon if energy picks up",
      nutrition: {
        headline: "Moderate protein — recovery-supportive",
        points: [
          "Protein: 1.6–1.8g per kg bodyweight",
          "Anti-inflammatory focus: berries, leafy greens, olive oil, fatty fish",
          "Omega-3s today support the recovery you need",
          "Eat in direct light — not at a dark desk",
          "Limit alcohol — it compounds suboptimal recovery",
        ],
      },
    };
  }

  return {
    tier: "recovery",
    headline: "Recovery-only day",
    subline: `Recovery at ${recovery}% — your system is rebuilding. This is not laziness; it's the longevity protocol working. Protect it.`,
    suggestions: [
      "20–30 min slow walk outdoors — sunlight + movement",
      "Gentle stretching or yin yoga (no intensity)",
      "Breathwork: box breathing, 4-7-8, or Wim Hof light",
      "Avoid anything that spikes heart rate above zone 1",
      "Prioritise sleep hygiene tonight — this is where the gains happen",
    ],
    timing: "Move when it feels good — no pressure on timing",
    nutrition: {
      headline: "Recovery nutrition — repair and restore",
      points: [
        "Protein: maintain 1.6g per kg — muscle protein synthesis continues",
        "Collagen-rich foods support connective tissue repair (bone broth, eggs)",
        "Zinc and magnesium today: supports overnight recovery",
        "Avoid heavy meals late — your HRV will thank you",
        "Hydration is the most underrated recovery lever",
      ],
    },
  };
}

// ─── Tier badge styling ─────────────────────────────────────────────────────────

function tierStyle(tier: TrainingTier) {
  if (tier === "hard")
    return {
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
      dot: "bg-emerald-500",
      icon: "💪",
    };
  if (tier === "moderate")
    return {
      badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-800",
      dot: "bg-yellow-500",
      icon: "🏃",
    };
  return {
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
    icon: "🧘",
  };
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default async function WellbeingPage() {
  // Fetch Whoop data server-side
  let whoopData: WhoopData | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const token = await getValidWhoopToken(session.user.email).catch(() => null);
      if (token) {
        whoopData = await fetchWhoopData(token);
      }
    }
  } catch {
    // No Whoop data — show neutral state
  }

  const recoveryScore = whoopData?.recovery?.score?.recovery_score ?? null;
  const hrv = whoopData?.recovery?.score?.hrv_rmssd_milli ?? null;
  const strain = whoopData?.cycle?.score?.strain ?? null;
  const rec = getTrainingRec(recoveryScore !== null ? Math.round(recoveryScore) : null);
  const style = tierStyle(rec.tier);

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Wellbeing</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            🏗️ Longevity + Muscle Building
          </span>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Longevity-first. Respond, don&apos;t push.
        </p>
      </div>

      {/* ── TODAY'S TRAINING ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
          Today&apos;s Training
        </h2>

        {/* Whoop metrics row */}
        {whoopData && (
          <div className="flex items-center gap-6 flex-wrap">
            {recoveryScore !== null && <RecoveryRing score={Math.round(recoveryScore)} size="sm" />}
            <div className="flex gap-6">
              {hrv !== null && (
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">HRV</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {Math.round(hrv)}
                    <span className="text-xs font-normal text-neutral-400 ml-0.5">ms</span>
                  </p>
                </div>
              )}
              {strain !== null && (
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Yesterday&apos;s Strain</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {strain.toFixed(1)}
                    <span className="text-xs font-normal text-neutral-400 ml-0.5">/21</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommendation card */}
        <div className={`rounded-xl border ${style.border} p-5 space-y-4`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{style.icon}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {rec.headline}
                </h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
                  {rec.tier === "hard" ? "Hard" : rec.tier === "moderate" ? "Moderate" : "Recovery only"}
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{rec.subline}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {rec.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{s}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-xs">⏰</span>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{rec.timing}</p>
          </div>
        </div>
      </section>

      {/* ── NUTRITION TODAY ──────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
          Nutrition Today
        </h2>

        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥗</span>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {rec.nutrition.headline}
            </h3>
          </div>

          <div className="space-y-2">
            {rec.nutrition.points.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                <p className="text-sm text-neutral-700 dark:text-neutral-300">{p}</p>
              </div>
            ))}
          </div>

          {/* Direct Light reminder */}
          <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-3 py-2 flex items-start gap-2">
            <span className="text-sm shrink-0">☀️</span>
            <p className="text-xs text-amber-800 dark:text-amber-400">
              <strong>Direct Light digestion</strong> — eat your main meals in natural light, not at a dark desk.
              This is part of your Human Design.
            </p>
          </div>
        </div>
      </section>

      {/* ── EATING WINDOW ─────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
          Eating Window
        </h2>
        <EatingWindowSection />
      </section>

      {/* ── WORKOUT LOG ──────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
          Workout Log
        </h2>
        <WorkoutSection />
      </section>

      {/* ── WORKOUT PATTERNS ──────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
          Workout Patterns
        </h2>
        <WorkoutPatterns />
      </section>
    </div>
  );
}
