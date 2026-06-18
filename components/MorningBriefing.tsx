"use client";

import { useState } from "react";

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

type SacralChoice = "yes" | "no" | "unsure" | null;

function SacralGroup({ question }: { question: string }) {
  const [choice, setChoice] = useState<SacralChoice>(null);
  const options: SacralChoice[] = ["yes", "no", "unsure"];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
      <span style={{ fontSize: 15, color: "#dfe3df", lineHeight: 1.4 }}>{question}</span>
      <div style={{ display: "flex", gap: 7, flex: "none" }}>
        {options.map((opt) => {
          const active = choice === opt;
          return (
            <button
              key={opt}
              onClick={() => setChoice(opt)}
              style={{
                ...MONO,
                fontSize: 12,
                padding: "9px 15px",
                borderRadius: 10,
                border: `1px solid ${active ? "#4fd99a" : "rgba(255,255,255,0.12)"}`,
                background: active ? "rgba(79,217,154,0.13)" : "transparent",
                color: active ? "#4fd99a" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
                transition: "all 0.15s",
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

export default function MorningBriefing() {
  const recoveryScore = 68;
  const phase = "Building";
  const phaseNote = "Your creative energy is returning. Let it lead.";
  const ringBg = `conic-gradient(#4fd99a 0% ${recoveryScore}%, rgba(255,255,255,0.06) ${recoveryScore}% 100%)`;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* Aura */}
      <div style={{ position: "absolute", top: -180, left: "30%", width: 680, height: 460, background: "radial-gradient(ellipse at center, rgba(79,217,154,0.10), rgba(79,217,154,0) 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "30px 44px 56px" }}>

        {/* Presence bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 30 }}>
          <div style={{ position: "relative", width: 36, height: 36, flex: "none" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #4fd99a, #176b4a)", animation: "mayaBreathe 4s ease-in-out infinite", boxShadow: "0 0 22px rgba(79,217,154,0.45)" }} />
          </div>
          <div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: "2px", color: "#4fd99a", textTransform: "uppercase" }}>Maya</div>
            <div style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>06:42 · listening</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ ...MONO, fontSize: 11, color: "#7d837d", letterSpacing: "0.5px" }}>Thursday · June 18</span>
            <i className="ph ph-bell" style={{ fontSize: 19, color: "#7d837d", cursor: "pointer" }} />
          </div>
        </div>

        {/* Greeting */}
        <h1 style={{ fontWeight: 300, fontSize: 32, lineHeight: 1.32, color: "#eef0ee", margin: "0 0 12px", letterSpacing: "-0.4px", maxWidth: 760 }}>
          Morning, Philipp. You&rsquo;re recovered and rising &mdash; <span style={{ color: "#4fd99a", fontWeight: 400 }}>this is a focus day.</span> Let&rsquo;s protect the cave and move on what feels alive.
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 28 }}>
          <i className="ph-fill ph-diamond" style={{ fontSize: 11, color: "#4fd99a" }} />
          <span style={{ ...MONO, fontSize: 11, letterSpacing: "0.5px", color: "#868d86" }}>
            <span style={{ color: "#cdd2cd" }}>{phase} phase</span> · {phaseNote}
          </span>
        </div>

        {/* Whoop Overview */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 24, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <i className="ph-duotone ph-pulse" style={{ fontSize: 16, color: "#4fd99a" }} />
              <span style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#7d837d", textTransform: "uppercase" }}>Whoop · this morning</span>
            </div>
            <span style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>synced 06:31</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr 1fr", gap: 18, alignItems: "center" }}>
            {/* Recovery ring */}
            <div style={{ position: "relative", width: 128, height: 128, borderRadius: "50%", background: ringBg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 26px rgba(79,217,154,0.18)" }}>
              <div style={{ width: 104, height: 104, borderRadius: "50%", background: "#080909", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                <span style={{ ...MONO, fontSize: 34, color: "#4fd99a", fontWeight: 600, lineHeight: 1 }}>{recoveryScore}</span>
                <span style={{ ...MONO, fontSize: 8, color: "#7d837d", letterSpacing: "1.5px" }}>RECOVERY</span>
              </div>
            </div>
            {/* HRV */}
            <div style={{ height: 128, borderRadius: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <i className="ph-duotone ph-wave-sine" style={{ fontSize: 18, color: "#4fd99a" }} />
              <div><span style={{ ...MONO, fontSize: 25, color: "#eef0ee" }}>64</span><span style={{ fontSize: 11, color: "#7d837d", marginLeft: 2 }}>ms</span></div>
              <div>
                <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1px", color: "#7d837d" }}>HRV</div>
                <div style={{ fontSize: 10, color: "#4fd99a", marginTop: 2 }}>▲ 9% · 3-day rise</div>
              </div>
            </div>
            {/* Resting HR */}
            <div style={{ height: 128, borderRadius: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <i className="ph-duotone ph-heartbeat" style={{ fontSize: 18, color: "#4fd99a" }} />
              <div><span style={{ ...MONO, fontSize: 25, color: "#eef0ee" }}>52</span><span style={{ fontSize: 11, color: "#7d837d", marginLeft: 2 }}>bpm</span></div>
              <div>
                <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1px", color: "#7d837d" }}>RESTING HR</div>
                <div style={{ fontSize: 10, color: "#868d86", marginTop: 2 }}>steady</div>
              </div>
            </div>
            {/* Sleep */}
            <div style={{ height: 128, borderRadius: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <i className="ph-duotone ph-moon-stars" style={{ fontSize: 18, color: "#4fd99a" }} />
              <div><span style={{ ...MONO, fontSize: 25, color: "#eef0ee" }}>7:12</span></div>
              <div>
                <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1px", color: "#7d837d" }}>SLEEP</div>
                <div style={{ fontSize: 10, color: "#868d86", marginTop: 2 }}>88% efficiency</div>
              </div>
            </div>
            {/* Strain */}
            <div style={{ height: 128, borderRadius: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <i className="ph-duotone ph-lightning" style={{ fontSize: 18, color: "#d9b45f" }} />
              <div><span style={{ ...MONO, fontSize: 25, color: "#eef0ee" }}>8.2</span></div>
              <div>
                <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1px", color: "#7d837d" }}>STRAIN · YEST</div>
                <div style={{ fontSize: 10, color: "#868d86", marginTop: 2 }}>light day</div>
              </div>
            </div>
          </div>
        </div>

        {/* Classification chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderRadius: 999, background: "rgba(79,217,154,0.08)", border: "1px solid rgba(79,217,154,0.2)" }}>
            <i className="ph-fill ph-crosshair" style={{ fontSize: 16, color: "#4fd99a" }} />
            <span style={{ fontSize: 12, color: "#7d837d" }}>day</span>
            <span style={{ fontSize: 13, color: "#eef0ee", fontWeight: 500 }}>Focus</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <i className="ph ph-barbell" style={{ fontSize: 16, color: "#868d86" }} />
            <span style={{ fontSize: 12, color: "#7d837d" }}>train</span>
            <span style={{ fontSize: 13, color: "#eef0ee", fontWeight: 500 }}>Moderate</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <i className="ph ph-scales" style={{ fontSize: 16, color: "#868d86" }} />
            <span style={{ fontSize: 12, color: "#7d837d" }}>decisions</span>
            <span style={{ fontSize: 13, color: "#eef0ee", fontWeight: 500 }}>Full capacity</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderRadius: 999, background: "rgba(79,217,154,0.08)", border: "1px solid rgba(79,217,154,0.2)" }}>
            <i className="ph-fill ph-sparkle" style={{ fontSize: 16, color: "#4fd99a" }} />
            <span style={{ fontSize: 12, color: "#7d837d" }}>creative</span>
            <span style={{ fontSize: 13, color: "#eef0ee", fontWeight: 500 }}>High</span>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_372px]" style={{ gap: 18, alignItems: "start" }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
            {/* Priorities */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 22, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <i className="ph ph-target" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Worth responding to</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <i className="ph ph-arrow-bend-down-right" style={{ fontSize: 15, color: "#4fd99a", marginTop: 3, flex: "none" }} />
                  <span style={{ fontSize: 14.5, color: "#cdd2cd", lineHeight: 1.5 }}>The Q3 brand identity is waiting — does it pull you this morning?</span>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <i className="ph ph-arrow-bend-down-right" style={{ fontSize: 15, color: "#4fd99a", marginTop: 3, flex: "none" }} />
                  <span style={{ fontSize: 14.5, color: "#cdd2cd", lineHeight: 1.5 }}>Reply on the partnership thread. Your gut already knows the answer.</span>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <i className="ph ph-arrow-bend-down-right" style={{ fontSize: 15, color: "#4fd99a", marginTop: 3, flex: "none" }} />
                  <span style={{ fontSize: 14.5, color: "#cdd2cd", lineHeight: 1.5 }}>Deep-work block 9–11 is protected. The cave is yours.</span>
                </div>
              </div>
            </div>

            {/* Sacral check hero */}
            <div style={{ border: "1px solid rgba(79,217,154,0.25)", borderRadius: 16, padding: 24, background: "linear-gradient(135deg, rgba(79,217,154,0.07), rgba(79,217,154,0))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4fd99a", boxShadow: "0 0 10px #4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#4fd99a", textTransform: "uppercase" }}>Sacral check</span>
              </div>
              <p style={{ fontSize: 12.5, color: "#868d86", margin: "0 0 20px" }}>Answer from the body, not the mind. First response only.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <SacralGroup question="Does the product redesign feel like a yes right now?" />
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                <SacralGroup question="Is the 2pm investor call a yes in your body?" />
                <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />
                <SacralGroup question="Does a zone-2 run before lunch feel right?" />
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Today calendar */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 22, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="ph ph-calendar-blank" style={{ fontSize: 16, color: "#4fd99a" }} />
                  <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Today</span>
                </div>
                <span style={{ ...MONO, fontSize: 10, color: "#d9b45f" }}>light load</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { time: "09:00", title: "Deep work — Q3 identity", sub: "protected · cave", accent: "#4fd99a", border: "#4fd99a" },
                  { time: "11:30", title: "Team standup", sub: "30 min", accent: "#7d837d", border: "rgba(255,255,255,0.12)" },
                  { time: "14:00", title: "Investor call", sub: "emotional load — is it yours?", accent: "#d9b45f", border: "#d9b45f" },
                  { time: "16:00", title: "1:1 with Sara", sub: "45 min", accent: "#7d837d", border: "rgba(255,255,255,0.12)" },
                ].map((ev) => (
                  <div key={ev.time} style={{ display: "flex", gap: 12 }}>
                    <span style={{ ...MONO, fontSize: 11, color: "#7d837d", width: 44, flex: "none", paddingTop: 2 }}>{ev.time}</span>
                    <div style={{ borderLeft: `2px solid ${ev.border}`, paddingLeft: 12, flex: 1 }}>
                      <div style={{ fontSize: 13.5, color: ev.border === "#4fd99a" ? "#eef0ee" : "#cdd2cd" }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: ev.accent, marginTop: 2 }}>{ev.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Move */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <i className="ph ph-barbell" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Move</span>
              </div>
              <p style={{ fontSize: 14, color: "#cdd2cd", margin: 0, lineHeight: 1.5 }}>Moderate today — a zone-two run before lunch would land well. Save the heavy lift for tomorrow.</p>
            </div>

            {/* Fuel */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <i className="ph ph-pill" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Fuel</span>
              </div>
              <p style={{ fontSize: 14, color: "#cdd2cd", margin: 0, lineHeight: 1.5 }}>
                Magnesium + omega-3 with breakfast. Creatine post-training. <span style={{ color: "#d9b45f" }}>Hold the ashwagandha</span> — HRV doesn&rsquo;t need it this week.
              </p>
            </div>

            {/* Alignment */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <i className="ph ph-shield-check" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Alignment</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "#a2a8a2" }}>Frustration risk</span><span style={{ color: "#4fd99a" }}>Low</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "#a2a8a2" }}>Cave environment</span><span style={{ color: "#4fd99a" }}>Ready</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "#a2a8a2" }}>Emotional load</span><span style={{ color: "#d9b45f" }}>2pm flagged</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
