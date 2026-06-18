"use client";

import { useEffect, useState } from "react";
import { WhoopData } from "@/lib/whoop";

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface Briefing {
  training: "Hard" | "Moderate" | "Recovery only";
  phase: string;
}
interface WorkoutPattern { workout_type: string; avg_next_day_recovery: number; insight: string; recommendation: string; }
interface EatingWindow { id: string; date: string; first_meal_time: string | null; last_meal_time: string | null; }
interface Meal {
  id: string;
  meal_type: string | null;
  foods_identified: string[] | null;
  ai_summary: string | null;
  tags: string[] | null;
  logged_at: string;
}

const GUT_PROMPT = "today's training session";

function GutCheck({ question, value, onChange }: { question: string; value: "yes" | "no" | null; onChange: (v: "yes" | "no") => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <span style={{ fontSize: 14, color: "#dfe3df" }}>{question}</span>
      <div style={{ display: "flex", gap: 7, flex: "none" }}>
        {(["yes", "no"] as const).map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              style={{
                ...MONO, fontSize: 12, padding: "9px 16px", borderRadius: 10,
                border: `1px solid ${active ? "rgba(79,217,154,0.3)" : "rgba(255,255,255,0.12)"}`,
                background: active ? "rgba(79,217,154,0.08)" : "transparent",
                color: active ? "#4fd99a" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function trainingCopy(training: Briefing["training"] | null, recovery: number | null): { title: string; body: string; chips: { label: string; muted?: boolean }[] } {
  const recPhrase = recovery != null ? `Recovery's at ${recovery}% — ` : "";
  if (training === "Hard") {
    return {
      title: "Strength / hard session",
      body: `${recPhrase}your body can take real load today. Train with intent, then protect tomorrow with good sleep and fuel.`,
      chips: [{ label: "Strength · 50 min" }, { label: "Mobility · 10 min" }, { label: "fuel well after", muted: true }],
    };
  }
  if (training === "Recovery only") {
    return {
      title: "Recovery only",
      body: `${recPhrase}today is for restoration, not output. Keep it gentle — a walk, mobility, breathwork. The work is rest.`,
      chips: [{ label: "Walk · 30 min" }, { label: "Mobility · 15 min" }, { label: "natural light", muted: true }],
    };
  }
  return {
    title: "Moderate session",
    body: `${recPhrase}enough for steady aerobic work, not a max effort. A zone-two run protects tomorrow's recovery while serving the longevity goal.`,
    chips: [{ label: "Zone 2 · 40 min" }, { label: "Mobility · 10 min" }, { label: "before lunch · natural light", muted: true }],
  };
}

function toHour(t: string | null): number | null {
  if (!t) return null;
  const hm = t.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return Number(hm[1]) + Number(hm[2]) / 60;
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.getHours() + d.getMinutes() / 60;
}
function fmtHour(t: string | null): string {
  const h = toHour(t);
  if (h == null) return "—";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export default function WellbeingPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [whoop, setWhoop] = useState<WhoopData | null>(null);
  const [patterns, setPatterns] = useState<WorkoutPattern[]>([]);
  const [bestTime, setBestTime] = useState<string | null>(null);
  const [workoutInsufficient, setWorkoutInsufficient] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(true);
  const [eating, setEating] = useState<EatingWindow | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [gut, setGut] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    fetch("/api/briefing").then((r) => r.json()).then((d) => { if (d.briefing) setBriefing(d.briefing); }).catch(() => {});

    (async () => {
      try {
        const s = await fetch("/api/whoop/status");
        if (s.ok && (await s.json()).connected) {
          const d = await fetch("/api/whoop/data");
          if (d.ok) setWhoop(await d.json());
        }
      } catch {}
    })();

    fetch("/api/insights/workouts").then((r) => r.json()).then((d) => {
      setPatterns(d.patterns ?? []);
      setBestTime(d.best_time ?? null);
      setWorkoutInsufficient(d.insufficient_data ?? false);
    }).catch(() => {}).finally(() => setWorkoutLoading(false));

    fetch("/api/eating-windows").then((r) => (r.ok ? r.json() : [])).then((d: EatingWindow[]) => {
      if (Array.isArray(d) && d.length) setEating(d[0]); // most recent
    }).catch(() => {});

    fetch("/api/meals").then((r) => (r.ok ? r.json() : { meals: [] })).then((d) => setMeals(d.meals ?? [])).catch(() => {});

    fetch("/api/sacral").then((r) => (r.ok ? r.json() : [])).then((rows: { prompt: string; response: "yes" | "no" }[]) => {
      const m = Array.isArray(rows) ? rows.find((x) => x.prompt === GUT_PROMPT) : null;
      if (m) setGut(m.response);
    }).catch(() => {});
  }, []);

  function answerGut(v: "yes" | "no") {
    setGut(v);
    fetch("/api/sacral", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: GUT_PROMPT, response: v }) }).catch(() => {});
  }

  const recovery = whoop?.recovery?.score?.recovery_score ?? null;
  const copy = trainingCopy(briefing?.training ?? null, recovery);

  // Eating window math (axis 6:00 → 24:00 = 18h span)
  const firstH = toHour(eating?.first_meal_time ?? null);
  const lastH = toHour(eating?.last_meal_time ?? null);
  const windowHrs = firstH != null && lastH != null ? Math.max(0, lastH - firstH) : null;
  const leftPct = firstH != null ? Math.min(100, Math.max(0, ((firstH - 6) / 18) * 100)) : 33;
  const widthPct = firstH != null && lastH != null ? Math.min(100 - leftPct, ((lastH - firstH) / 18) * 100) : 34;

  // Today's meals
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
  const todayMeals = meals
    .filter((m) => new Date(m.logged_at).toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" }) === todayStr)
    .sort((a, b) => (a.logged_at < b.logged_at ? -1 : 1));

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -180, left: "30%", width: 680, height: 460, background: "radial-gradient(ellipse at center, rgba(79,217,154,0.08), rgba(79,217,154,0) 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "34px 44px 56px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 30 }}>
          <div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: "2px", color: "#7d837d", textTransform: "uppercase", marginBottom: 8 }}>Movement &amp; nutrition · longevity first</div>
            <h1 style={{ fontWeight: 300, fontSize: 32, color: "#eef0ee", margin: 0, letterSpacing: "-0.4px" }}>Wellbeing</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", borderRadius: 11, border: "1px solid rgba(79,217,154,0.2)", background: "rgba(79,217,154,0.06)" }}>
            <i className="ph-fill ph-barbell" style={{ fontSize: 15, color: "#4fd99a" }} />
            <span style={{ fontSize: 12.5, color: "#cdd2cd" }}>Longevity + Muscle</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_372px]" style={{ gap: 18, alignItems: "start" }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>

            {/* Today's training */}
            <div style={{ border: "1px solid rgba(79,217,154,0.22)", borderRadius: 16, background: "linear-gradient(160deg, rgba(79,217,154,0.06), rgba(79,217,154,0))", padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <i className="ph-duotone ph-person-simple-run" style={{ fontSize: 17, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#4fd99a", textTransform: "uppercase" }}>Today&apos;s training</span>
              </div>
              <h2 style={{ fontWeight: 400, fontSize: 24, color: "#eef0ee", margin: "0 0 10px" }}>{copy.title}</h2>
              <p style={{ fontSize: 14, color: "#cdd2cd", margin: "0 0 18px", lineHeight: 1.55, maxWidth: 520 }}>{copy.body}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {copy.chips.map((c) => (
                  <span key={c.label} style={{ fontSize: 12.5, color: c.muted ? "#868d86" : "#dfe3df", padding: "8px 14px", borderRadius: 999, background: c.muted ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", border: `1px solid ${c.muted ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.08)"}` }}>{c.label}</span>
                ))}
              </div>
              <GutCheck question="Does today's session feel like a yes in your body?" value={gut} onChange={answerGut} />
            </div>

            {/* Workout learning engine */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <i className="ph-duotone ph-brain" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Workout learning engine</span>
              </div>
              {workoutLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[0, 1, 2].map((i) => <div key={i} style={{ height: 32, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "mayaBreathe 4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />)}
                </div>
              ) : workoutInsufficient || patterns.length === 0 ? (
                <p style={{ fontSize: 13.5, color: "#868d86", margin: 0, lineHeight: 1.5 }}>Not enough logged workouts yet — patterns between training type, timing, and recovery surface as you log more.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                  {patterns.map((p, idx) => {
                    const up = (p.avg_next_day_recovery ?? 0) >= 0;
                    return (
                      <div key={idx}>
                        {idx > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 15 }} />}
                        <div style={{ display: "flex", gap: 12 }}>
                          <i className={up ? "ph-fill ph-trend-up" : "ph-fill ph-trend-down"} style={{ fontSize: 16, color: up ? "#4fd99a" : "#d9b45f", marginTop: 2, flex: "none" }} />
                          <p style={{ margin: 0, fontSize: 14, color: "#dfe3df", lineHeight: 1.5 }}>
                            <span style={{ color: "#eef0ee", fontWeight: 500 }}>{p.workout_type}</span> — {p.insight}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {bestTime && <div style={{ ...MONO, fontSize: 10, color: "#5e645e", marginTop: 4 }}>best training window · {bestTime}</div>}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Eating window */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ph ph-clock" style={{ fontSize: 16, color: "#4fd99a" }} />
                  <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Eating window</span>
                </div>
                <span style={{ ...MONO, fontSize: 12, color: "#eef0ee" }}>{windowHrs != null ? `${Math.floor(windowHrs)}h ${Math.round((windowHrs % 1) * 60)}m` : "—"}</span>
              </div>
              <div style={{ position: "relative", height: 10, borderRadius: 6, background: "rgba(255,255,255,0.05)", marginBottom: 8, overflow: "hidden" }}>
                {firstH != null && lastH != null && (
                  <div style={{ position: "absolute", left: `${leftPct}%`, width: `${widthPct}%`, top: 0, bottom: 0, background: "linear-gradient(90deg, #1e8d63, #4fd99a)", borderRadius: 6 }} />
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", ...MONO, fontSize: 9, color: "#5e645e", marginBottom: 18 }}>
                <span>6a</span><span>12p</span><span>6p</span><span>12a</span>
              </div>
              <p style={{ fontSize: 13, color: "#cdd2cd", margin: 0, lineHeight: 1.55 }}>
                {firstH != null && lastH != null
                  ? <>{fmtHour(eating?.first_meal_time ?? null)}–{fmtHour(eating?.last_meal_time ?? null)} today. Eating late tends to cost deep sleep — keep dinner early.</>
                  : "No eating window logged today yet."}
              </p>
            </div>

            {/* Today's fuel */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <i className="ph-duotone ph-fork-knife" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Today&apos;s fuel</span>
              </div>
              {todayMeals.length === 0 ? (
                <p style={{ fontSize: 13, color: "#868d86", margin: 0, lineHeight: 1.5 }}>No meals logged today yet — snap a photo to log one.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {todayMeals.map((m, idx) => {
                    const time = new Date(m.logged_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
                    const dish = m.ai_summary || (m.foods_identified ?? []).join(", ") || "Logged meal";
                    const note = (m.tags ?? []).join(" · ");
                    return (
                      <div key={m.id}>
                        {idx > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "16px 0" }} />}
                        <div style={{ ...MONO, fontSize: 9, letterSpacing: "1px", color: "#4fd99a", marginBottom: 5 }}>{time} · {(m.meal_type ?? "MEAL").toUpperCase()}</div>
                        <div style={{ fontSize: 13.5, color: "#eef0ee" }}>{dish}</div>
                        {note && <div style={{ fontSize: 11.5, color: "#868d86", marginTop: 2 }}>{note}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
