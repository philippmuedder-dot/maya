"use client";

import { useState, useEffect, useCallback } from "react";
import DailyCheckinModal from "./DailyCheckinModal";
import {
  WhoopData,
} from "@/lib/whoop";
import {
  CalendarResponse,
  getTodayEvents,
  classifyCalendarLoad,
  formatEventTime,
} from "@/lib/googleCalendar";

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

// ── Data shape returned by /api/briefing ──────────────────────────────────────
interface Briefing {
  day_type: "Focus" | "Maintenance" | "Recovery";
  training: "Hard" | "Moderate" | "Recovery only";
  avoid_heavy_decisions: boolean;
  decision_reason: string;
  top_priorities: string[];
  supplement_focus: string;
  what_to_pause: string;
  phase: "Survival" | "Building" | "Thriving";
  phase_message: string;
  sacral_prompts: string[];
}

type SacralChoice = "yes" | "no" | "unsure";

// ── Controlled Sacral group (persists yes/no to /api/sacral) ──────────────────
function SacralGroup({
  question,
  value,
  onChange,
}: {
  question: string;
  value: SacralChoice | null;
  onChange: (v: SacralChoice) => void;
}) {
  const options: SacralChoice[] = ["yes", "no", "unsure"];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
      <span style={{ fontSize: 15, color: "#dfe3df", lineHeight: 1.4 }}>{question}</span>
      <div style={{ display: "flex", gap: 7, flex: "none" }}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
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

// ── Small helpers ─────────────────────────────────────────────────────────────
function recoveryClause(score: number | null): string {
  if (score == null) return "";
  if (score >= 67) return "You're recovered and rising — ";
  if (score >= 34) return "You're steady — ";
  return "You're running low, be gentle — ";
}

function creativeFromPhase(phase: Briefing["phase"]): string {
  if (phase === "Thriving") return "High";
  if (phase === "Building") return "Returning";
  return "Protect";
}

function moveText(training: Briefing["training"]): string {
  if (training === "Hard")
    return "Recovery supports a harder session today — push if it feels alive in the body.";
  if (training === "Moderate")
    return "Moderate today — a zone-two effort would land well. Save the heavy lift for tomorrow.";
  return "Recovery only — keep it gentle. Walk, mobilize, breathe. The work is rest.";
}

export default function MorningBriefing() {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [needsCheckin, setNeedsCheckin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Whoop (kept separate: connected !== data present)
  const [whoop, setWhoop] = useState<WhoopData | null>(null);

  // Calendar
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);

  // Sacral answers keyed by prompt
  const [sacralAnswers, setSacralAnswers] = useState<Record<string, SacralChoice>>({});

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing");
      if (!res.ok) throw new Error("Failed to fetch briefing");
      const data = await res.json();
      if (data.needsCheckin) {
        setNeedsCheckin(true);
      } else if (data.briefing) {
        setBriefing(data.briefing);
        setNeedsCheckin(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Whoop — status gate first, then data (null data still means connected)
  useEffect(() => {
    (async () => {
      try {
        const statusRes = await fetch("/api/whoop/status");
        if (!statusRes.ok) return;
        const { connected } = await statusRes.json();
        if (!connected) return;
        const dataRes = await fetch("/api/whoop/data");
        if (dataRes.ok) setWhoop(await dataRes.json());
      } catch {
        /* leave whoop null — tiles show placeholders */
      }
    })();
  }, []);

  // Calendar
  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((d: CalendarResponse) => {
        if (!d.error) setCalendar(d);
      })
      .catch(() => {});
  }, []);

  // Existing sacral responses for today
  useEffect(() => {
    fetch("/api/sacral")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { prompt: string; response: "yes" | "no" }[]) => {
        if (Array.isArray(rows) && rows.length) {
          const m: Record<string, SacralChoice> = {};
          rows.forEach((d) => {
            m[d.prompt] = d.response;
          });
          setSacralAnswers(m);
        }
      })
      .catch(() => {});
  }, []);

  function handleCheckinComplete() {
    setNeedsCheckin(false);
    setLoading(true);
    fetchBriefing();
  }

  async function answerSacral(prompt: string, response: SacralChoice) {
    setSacralAnswers((prev) => ({ ...prev, [prompt]: response }));
    // Backend stores yes/no only; "unsure" stays local
    if (response === "yes" || response === "no") {
      try {
        await fetch("/api/sacral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, response }),
        });
      } catch (err) {
        console.error("Sacral response failed:", err);
      }
    }
  }

  if (needsCheckin) {
    return <DailyCheckinModal onComplete={handleCheckinComplete} />;
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px 44px" }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: "1.5px", color: "#4fd99a", textTransform: "uppercase", marginBottom: 24 }}>
          Maya is reading the morning…
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: i === 0 ? 128 : 84,
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
                animation: "mayaBreathe 4s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 44px" }}>
        <div style={{ border: "1px solid rgba(217,180,95,0.3)", borderRadius: 16, padding: 24, background: "rgba(217,180,95,0.06)" }}>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#d9b45f", textTransform: "uppercase", marginBottom: 8 }}>
            Briefing unavailable
          </div>
          <p style={{ fontSize: 14, color: "#cdd2cd", margin: "0 0 16px", lineHeight: 1.5 }}>
            {error ?? "Couldn't load today's briefing."}
          </p>
          <button
            onClick={fetchBriefing}
            style={{ ...MONO, fontSize: 12, padding: "9px 16px", borderRadius: 10, border: "1px solid #4fd99a", background: "rgba(79,217,154,0.13)", color: "#4fd99a", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Derived values from live data ───────────────────────────────────────────
  const recoveryScore = whoop?.recovery?.score?.recovery_score ?? null;
  const hrv = whoop?.recovery?.score?.hrv_rmssd_milli ?? null;
  const rhr = whoop?.recovery?.score?.resting_heart_rate ?? null;
  const strain = whoop?.cycle?.score?.strain ?? null;
  const sleepEff = whoop?.sleep?.score?.sleep_efficiency_percentage ?? null;

  let sleepStr: string | null = null;
  if (whoop?.sleep?.start && whoop?.sleep?.end) {
    const ms = new Date(whoop.sleep.end).getTime() - new Date(whoop.sleep.start).getTime();
    const totalMin = Math.round(ms / 60000);
    sleepStr = `${Math.floor(totalMin / 60)}:${String(totalMin % 60).padStart(2, "0")}`;
  }

  const ringPct = recoveryScore ?? 0;
  const ringBg = `conic-gradient(#4fd99a 0% ${ringPct}%, rgba(255,255,255,0.06) ${ringPct}% 100%)`;

  const todayEvents = calendar ? getTodayEvents(calendar.events) : [];
  const load = calendar ? classifyCalendarLoad(calendar.events) : null;

  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const nowStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "Europe/Berlin" });

  const dim = (s: string | number | null, suffix = "") => (s == null ? "—" : `${s}${suffix}`);

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
            <div style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>{nowStr} · listening</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ ...MONO, fontSize: 11, color: "#7d837d", letterSpacing: "0.5px" }}>{dateStr}</span>
            <i className="ph ph-bell" style={{ fontSize: 19, color: "#7d837d", cursor: "pointer" }} />
          </div>
        </div>

        {/* Greeting */}
        <h1 style={{ fontWeight: 300, fontSize: 32, lineHeight: 1.32, color: "#eef0ee", margin: "0 0 12px", letterSpacing: "-0.4px", maxWidth: 760 }}>
          {partOfDay}, Philipp. {recoveryClause(recoveryScore)}
          <span style={{ color: "#4fd99a", fontWeight: 400 }}>this is a {briefing.day_type.toLowerCase()} day.</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 28 }}>
          <i className="ph-fill ph-diamond" style={{ fontSize: 11, color: "#4fd99a" }} />
          <span style={{ ...MONO, fontSize: 11, letterSpacing: "0.5px", color: "#868d86" }}>
            <span style={{ color: "#cdd2cd" }}>{briefing.phase} phase</span> · {briefing.phase_message}
          </span>
        </div>

        {/* Whoop Overview */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 24, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <i className="ph-duotone ph-pulse" style={{ fontSize: 16, color: "#4fd99a" }} />
              <span style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#7d837d", textTransform: "uppercase" }}>Whoop · this morning</span>
            </div>
            <span style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>
              {whoop?.fetchedAt ? `synced ${new Date(whoop.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}` : "no sync yet"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr 1fr 1fr", gap: 18, alignItems: "center" }}>
            {/* Recovery ring */}
            <div style={{ position: "relative", width: 128, height: 128, borderRadius: "50%", background: ringBg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 26px rgba(79,217,154,0.18)" }}>
              <div style={{ width: 104, height: 104, borderRadius: "50%", background: "#080909", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                <span style={{ ...MONO, fontSize: 34, color: "#4fd99a", fontWeight: 600, lineHeight: 1 }}>{dim(recoveryScore)}</span>
                <span style={{ ...MONO, fontSize: 8, color: "#7d837d", letterSpacing: "1.5px" }}>RECOVERY</span>
              </div>
            </div>
            {/* HRV */}
            <div style={{ height: 128, borderRadius: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <i className="ph-duotone ph-wave-sine" style={{ fontSize: 18, color: "#4fd99a" }} />
              <div><span style={{ ...MONO, fontSize: 25, color: "#eef0ee" }}>{hrv != null ? Math.round(hrv) : "—"}</span><span style={{ fontSize: 11, color: "#7d837d", marginLeft: 2 }}>ms</span></div>
              <div>
                <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1px", color: "#7d837d" }}>HRV</div>
                <div style={{ fontSize: 10, color: "#868d86", marginTop: 2 }}>rmssd</div>
              </div>
            </div>
            {/* Resting HR */}
            <div style={{ height: 128, borderRadius: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <i className="ph-duotone ph-heartbeat" style={{ fontSize: 18, color: "#4fd99a" }} />
              <div><span style={{ ...MONO, fontSize: 25, color: "#eef0ee" }}>{rhr != null ? Math.round(rhr) : "—"}</span><span style={{ fontSize: 11, color: "#7d837d", marginLeft: 2 }}>bpm</span></div>
              <div>
                <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1px", color: "#7d837d" }}>RESTING HR</div>
                <div style={{ fontSize: 10, color: "#868d86", marginTop: 2 }}>overnight</div>
              </div>
            </div>
            {/* Sleep */}
            <div style={{ height: 128, borderRadius: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <i className="ph-duotone ph-moon-stars" style={{ fontSize: 18, color: "#4fd99a" }} />
              <div><span style={{ ...MONO, fontSize: 25, color: "#eef0ee" }}>{sleepStr ?? "—"}</span></div>
              <div>
                <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1px", color: "#7d837d" }}>SLEEP</div>
                <div style={{ fontSize: 10, color: "#868d86", marginTop: 2 }}>{sleepEff != null ? `${Math.round(sleepEff)}% efficiency` : "—"}</div>
              </div>
            </div>
            {/* Strain */}
            <div style={{ height: 128, borderRadius: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <i className="ph-duotone ph-lightning" style={{ fontSize: 18, color: "#d9b45f" }} />
              <div><span style={{ ...MONO, fontSize: 25, color: "#eef0ee" }}>{strain != null ? strain.toFixed(1) : "—"}</span></div>
              <div>
                <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1px", color: "#7d837d" }}>STRAIN · YEST</div>
                <div style={{ fontSize: 10, color: "#868d86", marginTop: 2 }}>0–21 scale</div>
              </div>
            </div>
          </div>
        </div>

        {/* Classification chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderRadius: 999, background: "rgba(79,217,154,0.08)", border: "1px solid rgba(79,217,154,0.2)" }}>
            <i className="ph-fill ph-crosshair" style={{ fontSize: 16, color: "#4fd99a" }} />
            <span style={{ fontSize: 12, color: "#7d837d" }}>day</span>
            <span style={{ fontSize: 13, color: "#eef0ee", fontWeight: 500 }}>{briefing.day_type}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <i className="ph ph-barbell" style={{ fontSize: 16, color: "#868d86" }} />
            <span style={{ fontSize: 12, color: "#7d837d" }}>train</span>
            <span style={{ fontSize: 13, color: "#eef0ee", fontWeight: 500 }}>{briefing.training}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <i className="ph ph-scales" style={{ fontSize: 16, color: "#868d86" }} />
            <span style={{ fontSize: 12, color: "#7d837d" }}>decisions</span>
            <span style={{ fontSize: 13, color: "#eef0ee", fontWeight: 500 }}>{briefing.avoid_heavy_decisions ? "Protect" : "Full capacity"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderRadius: 999, background: "rgba(79,217,154,0.08)", border: "1px solid rgba(79,217,154,0.2)" }}>
            <i className="ph-fill ph-sparkle" style={{ fontSize: 16, color: "#4fd99a" }} />
            <span style={{ fontSize: 12, color: "#7d837d" }}>creative</span>
            <span style={{ fontSize: 13, color: "#eef0ee", fontWeight: 500 }}>{creativeFromPhase(briefing.phase)}</span>
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
                {briefing.top_priorities.map((p, i) => (
                  <div key={i}>
                    {i > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 15 }} />}
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <i className="ph ph-arrow-bend-down-right" style={{ fontSize: 15, color: "#4fd99a", marginTop: 3, flex: "none" }} />
                      <span style={{ fontSize: 14.5, color: "#cdd2cd", lineHeight: 1.5 }}>{p}</span>
                    </div>
                  </div>
                ))}
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
                {briefing.sacral_prompts.map((prompt, i) => (
                  <div key={prompt}>
                    {i > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 18 }} />}
                    <SacralGroup
                      question={`Does ${prompt} feel like a yes?`}
                      value={sacralAnswers[prompt] ?? null}
                      onChange={(v) => answerSacral(prompt, v)}
                    />
                  </div>
                ))}
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
                {load && <span style={{ ...MONO, fontSize: 10, color: load.label === "Heavy" ? "#e0807f" : load.label === "Moderate" ? "#d9b45f" : "#4fd99a" }}>{load.label.toLowerCase()} load</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {todayEvents.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#7d837d", margin: 0 }}>No events today — good space for deep work.</p>
                ) : (
                  todayEvents.map((ev) => {
                    const busy = ev.isBusy;
                    const border = busy ? "#d9b45f" : "#4fd99a";
                    return (
                      <div key={ev.id} style={{ display: "flex", gap: 12 }}>
                        <span style={{ ...MONO, fontSize: 11, color: "#7d837d", width: 52, flex: "none", paddingTop: 2 }}>{formatEventTime(ev)}</span>
                        <div style={{ borderLeft: `2px solid ${border}`, paddingLeft: 12, flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, color: busy ? "#cdd2cd" : "#eef0ee" }}>{busy ? "Busy (work)" : (ev.summary || "(No title)")}</div>
                          {ev.location && !busy && <div style={{ fontSize: 11, color: "#7d837d", marginTop: 2 }}>{ev.location}</div>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Move */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <i className="ph ph-barbell" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Move</span>
              </div>
              <p style={{ fontSize: 14, color: "#cdd2cd", margin: 0, lineHeight: 1.5 }}>{moveText(briefing.training)}</p>
            </div>

            {/* Fuel */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <i className="ph ph-pill" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Fuel</span>
              </div>
              <p style={{ fontSize: 14, color: "#cdd2cd", margin: 0, lineHeight: 1.5 }}>
                {briefing.supplement_focus}
                {briefing.what_to_pause && (
                  <> <span style={{ color: "#d9b45f" }}>Hold: {briefing.what_to_pause}</span></>
                )}
              </p>
            </div>

            {/* Alignment */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 20, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <i className="ph ph-shield-check" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Alignment</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: "#a2a8a2" }}>Heavy decisions</span>
                <span style={{ color: briefing.avoid_heavy_decisions ? "#d9b45f" : "#4fd99a" }}>{briefing.avoid_heavy_decisions ? "Hold" : "Clear"}</span>
              </div>
              {briefing.decision_reason && (
                <p style={{ fontSize: 12.5, color: "#868d86", margin: 0, lineHeight: 1.5 }}>{briefing.decision_reason}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
