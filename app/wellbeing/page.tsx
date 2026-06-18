"use client";

import { useState } from "react";

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;

type GutChoice = "yes" | "no" | null;

function GutCheck({ question }: { question: string }) {
  const [choice, setChoice] = useState<GutChoice>(null);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
      <span style={{ fontSize: 14, color: "#dfe3df" }}>{question}</span>
      <div style={{ display: "flex", gap: 7, flex: "none" }}>
        {(["yes", "no"] as GutChoice[]).map((opt) => {
          const active = choice === opt;
          return (
            <button
              key={opt!}
              onClick={() => setChoice(opt)}
              style={{
                ...MONO,
                fontSize: 12,
                padding: "9px 16px",
                borderRadius: 10,
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

export default function WellbeingPage() {
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
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 16px", borderRadius: 11, border: "1px solid rgba(79,217,154,0.2)", background: "rgba(79,217,154,0.06)", cursor: "pointer" }}>
            <i className="ph-fill ph-barbell" style={{ fontSize: 15, color: "#4fd99a" }} />
            <span style={{ fontSize: 12.5, color: "#cdd2cd" }}>Phase · Longevity + Muscle</span>
            <i className="ph ph-caret-down" style={{ fontSize: 13, color: "#7d837d" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 372px", gap: 18, alignItems: "start" }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>

            {/* Today's training */}
            <div style={{ border: "1px solid rgba(79,217,154,0.22)", borderRadius: 16, background: "linear-gradient(160deg, rgba(79,217,154,0.06), rgba(79,217,154,0))", padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <i className="ph-duotone ph-person-simple-run" style={{ fontSize: 17, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#4fd99a", textTransform: "uppercase" }}>Today&apos;s training</span>
              </div>
              <h2 style={{ fontWeight: 400, fontSize: 24, color: "#eef0ee", margin: "0 0 10px" }}>Moderate session</h2>
              <p style={{ fontSize: 14, color: "#cdd2cd", margin: "0 0 18px", lineHeight: 1.55, maxWidth: 520 }}>
                Recovery&apos;s at 68% — enough for steady aerobic work, not a max effort. A zone-two run protects tomorrow&apos;s recovery while serving the longevity goal.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 12.5, color: "#dfe3df", padding: "8px 14px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>Zone 2 · 40 min</span>
                <span style={{ fontSize: 12.5, color: "#dfe3df", padding: "8px 14px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>Mobility · 10 min</span>
                <span style={{ fontSize: 12.5, color: "#868d86", padding: "8px 14px", borderRadius: 999, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>before lunch · natural light</span>
              </div>
              <GutCheck question="Does a zone-2 run before lunch feel right?" />
            </div>

            {/* Workout learning engine */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <i className="ph-duotone ph-brain" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Workout learning engine</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <i className="ph-fill ph-trend-up" style={{ fontSize: 16, color: "#4fd99a", marginTop: 2, flex: "none" }} />
                  <p style={{ margin: 0, fontSize: 14, color: "#dfe3df", lineHeight: 1.5 }}>Strength training gives you <span style={{ color: "#4fd99a" }}>15% better HRV recovery</span> than HIIT.</p>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
                <div style={{ display: "flex", gap: 12 }}>
                  <i className="ph-fill ph-trend-up" style={{ fontSize: 16, color: "#4fd99a", marginTop: 2, flex: "none" }} />
                  <p style={{ margin: 0, fontSize: 14, color: "#dfe3df", lineHeight: 1.5 }}>Tuesday zone-2 runs consistently improve your <span style={{ color: "#4fd99a" }}>Thursday recovery</span>.</p>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
                <div style={{ display: "flex", gap: 12 }}>
                  <i className="ph-fill ph-trend-down" style={{ fontSize: 16, color: "#d9b45f", marginTop: 2, flex: "none" }} />
                  <p style={{ margin: 0, fontSize: 14, color: "#dfe3df", lineHeight: 1.5 }}>Late evening workouts cut your deep sleep by <span style={{ color: "#d9b45f" }}>~40 min</span>.</p>
                </div>
              </div>
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
                <span style={{ ...MONO, fontSize: 12, color: "#eef0ee" }}>8h 0m</span>
              </div>
              <div style={{ position: "relative", height: 10, borderRadius: 6, background: "rgba(255,255,255,0.05)", marginBottom: 8, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "33%", width: "34%", top: 0, bottom: 0, background: "linear-gradient(90deg, #1e8d63, #4fd99a)", borderRadius: 6 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", ...MONO, fontSize: 9, color: "#5e645e", marginBottom: 18 }}>
                <span>6a</span><span>12p</span><span>6p</span><span>12a</span>
              </div>
              <p style={{ fontSize: 13, color: "#cdd2cd", margin: 0, lineHeight: 1.55 }}>
                12:00–20:00 today. <span style={{ color: "#4fd99a" }}>Consistent 5 days running.</span> Eating after 8pm tends to cost you ~35 min of deep sleep.
              </p>
            </div>

            {/* Today's fuel */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <i className="ph-duotone ph-fork-knife" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Today&apos;s fuel</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { time: "12:00 · BREAK FAST", dish: "Eggs, avocado, greens in natural light", note: "protein + healthy fat for a focus day" },
                  { time: "15:00 · POST-TRAINING", dish: "Salmon, sweet potato, rocket", note: "high protein — pairs with your creatine" },
                  { time: "19:30 · DINNER", dish: "Lentil & vegetable stew", note: "lighter & early — protects deep sleep" },
                ].map(({ time, dish, note }, idx) => (
                  <div key={time}>
                    {idx > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "16px 0" }} />}
                    <div style={{ ...MONO, fontSize: 9, letterSpacing: "1px", color: "#4fd99a", marginBottom: 5 }}>{time}</div>
                    <div style={{ fontSize: 13.5, color: "#eef0ee" }}>{dish}</div>
                    <div style={{ fontSize: 11.5, color: "#868d86", marginTop: 2 }}>{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
