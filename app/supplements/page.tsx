"use client";

import { useEffect, useState, useCallback } from "react";

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface Supplement {
  id: string;
  name: string;
  product_name: string | null;
  dose: number | null;
  unit: string | null;
  timing: string | null;
  purpose: string | null;
  active: boolean;
}

interface Insight {
  supplement: string;
  correlation: string;
  confidence: "low" | "medium" | "high";
  suggestion: "continue" | "stop" | "adjust" | "restart";
  reason: string;
}

const SUGGESTION_STYLE: Record<Insight["suggestion"], { tag: string; color: string; bg: string; icon: string }> = {
  continue: { tag: "KEEP", color: "#4fd99a", bg: "rgba(79,217,154,0.12)", icon: "ph-fill ph-trend-up" },
  stop: { tag: "STOP", color: "#d9b45f", bg: "rgba(217,180,95,0.12)", icon: "ph-fill ph-minus-circle" },
  adjust: { tag: "ADJUST", color: "#9fb8ac", bg: "rgba(159,184,172,0.12)", icon: "ph-fill ph-sliders" },
  restart: { tag: "RESTART", color: "#4fd99a", bg: "rgba(79,217,154,0.12)", icon: "ph-fill ph-arrow-counter-clockwise" },
};

function SupplementItem({
  id, name, dose, unit, timing, purpose, isTaken, onToggle,
}: {
  id: string; name: string; dose: number | null; unit: string | null;
  timing: string; purpose: string; isTaken: boolean;
  onToggle: (id: string) => void;
}) {
  const timeLabel = timing ? timing.charAt(0).toUpperCase() + timing.slice(1) : "";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "rgba(255,255,255,0.015)" }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(79,217,154,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <i className="ph-duotone ph-pill" style={{ fontSize: 19, color: "#4fd99a" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, color: "#eef0ee", fontWeight: 500 }}>
          {name}{dose != null && <span style={{ ...MONO, fontSize: 12, color: "#7d837d", fontWeight: 400 }}> {dose}{unit}</span>}
        </div>
        <div style={{ fontSize: 12, color: "#868d86", marginTop: 2 }}>
          {timeLabel}{purpose ? ` · ${purpose}` : ""}
        </div>
      </div>
      {timing && (
        <span style={{ ...MONO, fontSize: 10, color: "#7d837d", padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.04)" }}>{timeLabel}</span>
      )}
      <button
        onClick={() => onToggle(id)}
        style={{
          width: 24, height: 24, borderRadius: 7, flex: "none", cursor: "pointer",
          background: isTaken ? "#4fd99a" : "transparent",
          border: isTaken ? "none" : "1px solid rgba(255,255,255,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {isTaken && <i className="ph-bold ph-check" style={{ fontSize: 14, color: "#06231e" }} />}
      </button>
    </div>
  );
}

// ── Add supplement modal ──────────────────────────────────────────────────────
const TIMINGS = ["morning", "afternoon", "evening", "night"];

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("mg");
  const [timing, setTiming] = useState("morning");
  const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setErr("Name is required."); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/supplements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dose: dose ? Number(dose) : null,
          unit: unit || null,
          timing,
          purpose: purpose.trim() || null,
          active: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const field: React.CSSProperties = {
    ...MONO, fontSize: 13, padding: "10px 12px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)",
    color: "#eef0ee", width: "100%", outline: "none",
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: "#0c0e0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 26 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 400, fontSize: 20, color: "#eef0ee", margin: 0 }}>Add supplement</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7d837d" }}>
            <i className="ph ph-x" style={{ fontSize: 20 }} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input style={field} placeholder="Name (e.g. Magnesium Glycinate)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <div style={{ display: "flex", gap: 10 }}>
            <input style={{ ...field, flex: 2 }} placeholder="Dose" inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} />
            <input style={{ ...field, flex: 1 }} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {TIMINGS.map((t) => {
              const active = timing === t;
              return (
                <button
                  key={t}
                  onClick={() => setTiming(t)}
                  style={{ ...MONO, fontSize: 12, padding: "9px 14px", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${active ? "#4fd99a" : "rgba(255,255,255,0.12)"}`,
                    background: active ? "rgba(79,217,154,0.13)" : "transparent",
                    color: active ? "#4fd99a" : "rgba(255,255,255,0.5)" }}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <input style={field} placeholder="Purpose (optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          {err && <p style={{ fontSize: 12, color: "#e0807f", margin: 0 }}>{err}</p>}
          <button
            onClick={save}
            disabled={saving}
            style={{ marginTop: 4, fontSize: 14, color: "#06231e", padding: "12px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #4fd99a, #1e8d63)", cursor: saving ? "default" : "pointer", fontFamily: "'Sora', sans-serif", fontWeight: 500, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving…" : "Save supplement"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insufficient, setInsufficient] = useState(false);
  const [daysCollected, setDaysCollected] = useState(0);
  const [daysNeeded, setDaysNeeded] = useState(14);

  const loadSupplements = useCallback(() => {
    fetch("/api/supplements")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Supplement[]) => {
        setSupplements(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    loadSupplements();

    // Today's taken state
    fetch("/api/supplements/logs")
      .then((r) => (r.ok ? r.json() : { taken: [] }))
      .then((data: { taken?: string[] }) => {
        if (Array.isArray(data.taken)) setTaken(new Set(data.taken));
      })
      .catch(() => {});

    // Real learning-engine insights
    fetch("/api/insights/supplements")
      .then((r) => r.json())
      .then((data) => {
        setInsights(data.insights ?? []);
        setInsufficient(data.insufficient_data ?? false);
        setDaysCollected(data.days_collected ?? 0);
        setDaysNeeded(data.days_needed ?? 14);
      })
      .catch(() => {})
      .finally(() => setInsightsLoading(false));
  }, [loadSupplements]);

  const toggleTaken = (id: string) => {
    const willBeTaken = !taken.has(id);
    setTaken((prev) => {
      const n = new Set(prev);
      if (willBeTaken) n.add(id);
      else n.delete(id);
      return n;
    });
    // Persist
    fetch("/api/supplements/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplement_id: id, taken: willBeTaken }),
    }).catch(() => {
      // revert on failure
      setTaken((prev) => {
        const n = new Set(prev);
        if (willBeTaken) n.delete(id);
        else n.add(id);
        return n;
      });
    });
  };

  const activeSupps = supplements.filter((s) => s.active);
  const pausedSupps = supplements.filter((s) => !s.active);
  const takenCount = activeSupps.filter((s) => taken.has(s.id)).length;
  const totalCount = activeSupps.length;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -180, left: "30%", width: 680, height: 460, background: "radial-gradient(ellipse at center, rgba(79,217,154,0.08), rgba(79,217,154,0) 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "34px 44px 56px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 30 }}>
          <div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: "2px", color: "#7d837d", textTransform: "uppercase", marginBottom: 8 }}>Stack · learning engine</div>
            <h1 style={{ fontWeight: 300, fontSize: 32, color: "#eef0ee", margin: 0, letterSpacing: "-0.4px" }}>Supplements</h1>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#06231e", padding: "11px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #4fd99a, #1e8d63)", cursor: "pointer", fontFamily: "'Sora', sans-serif", fontWeight: 500 }}>
            <i className="ph-bold ph-plus" style={{ fontSize: 16 }} />
            Add supplement
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_372px]" style={{ gap: 18, alignItems: "start" }}>

          {/* LEFT — stack */}
          <div>
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#7d837d", textTransform: "uppercase" }}>Today&apos;s stack</span>
                <span style={{ ...MONO, fontSize: 11, color: "#4fd99a" }}>{takenCount} of {totalCount} taken</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {!loaded ? (
                  [0, 1, 2].map((i) => (
                    <div key={i} style={{ height: 68, borderRadius: 12, background: "rgba(255,255,255,0.03)", animation: "mayaBreathe 4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                  ))
                ) : activeSupps.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center" }}>
                    <p style={{ fontSize: 13.5, color: "#868d86", margin: "0 0 14px" }}>No active supplements yet.</p>
                    <button onClick={() => setShowAdd(true)} style={{ ...MONO, fontSize: 12, padding: "9px 16px", borderRadius: 10, border: "1px solid #4fd99a", background: "rgba(79,217,154,0.13)", color: "#4fd99a", cursor: "pointer" }}>
                      Add your first supplement
                    </button>
                  </div>
                ) : (
                  activeSupps.map((s) => (
                    <SupplementItem
                      key={s.id}
                      id={s.id}
                      name={s.product_name || s.name}
                      dose={s.dose}
                      unit={s.unit}
                      timing={s.timing ?? ""}
                      purpose={s.purpose ?? ""}
                      isTaken={taken.has(s.id)}
                      onToggle={toggleTaken}
                    />
                  ))
                )}

                {/* Paused items (real inactive supplements) */}
                {pausedSupps.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px dashed rgba(217,180,95,0.3)", borderRadius: 12, background: "rgba(217,180,95,0.03)", opacity: 0.85 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(217,180,95,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                      <i className="ph-duotone ph-pause" style={{ fontSize: 18, color: "#d9b45f" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, color: "#cdd2cd", fontWeight: 500 }}>{s.product_name || s.name}{s.dose != null && <span style={{ ...MONO, fontSize: 12, color: "#7d837d", fontWeight: 400 }}> {s.dose}{s.unit}</span>}</div>
                      <div style={{ fontSize: 12, color: "#a08a55", marginTop: 2 }}>Paused{s.purpose ? ` · ${s.purpose}` : ""}</div>
                    </div>
                    <span style={{ ...MONO, fontSize: 10, color: "#d9b45f", padding: "5px 10px", borderRadius: 7, background: "rgba(217,180,95,0.1)" }}>PAUSED</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — learning */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* What Maya has learned */}
            <div style={{ border: "1px solid rgba(79,217,154,0.2)", borderRadius: 16, background: "linear-gradient(160deg, rgba(79,217,154,0.06), rgba(79,217,154,0))", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <i className="ph-duotone ph-brain" style={{ fontSize: 17, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#4fd99a", textTransform: "uppercase" }}>What Maya has learned</span>
              </div>

              {insightsLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "mayaBreathe 4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              ) : insufficient ? (
                <div>
                  <p style={{ fontSize: 13, color: "#868d86", margin: "0 0 12px", lineHeight: 1.5 }}>
                    Building your supplement profile — {daysCollected} of {daysNeeded} days collected. Keep logging to unlock correlations with your recovery data.
                  </p>
                  <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (daysCollected / Math.max(1, daysNeeded)) * 100)}%`, background: "#4fd99a", borderRadius: 999, transition: "width 0.3s" }} />
                  </div>
                </div>
              ) : insights.length === 0 ? (
                <p style={{ fontSize: 13, color: "#868d86", margin: 0, lineHeight: 1.5 }}>No clear correlations yet. Keep logging — patterns surface over time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {insights.map((ins, idx) => {
                    const st = SUGGESTION_STYLE[ins.suggestion] ?? SUGGESTION_STYLE.continue;
                    return (
                      <div key={idx}>
                        {idx > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />}
                        <div style={{ display: "flex", gap: 11 }}>
                          <i className={st.icon} style={{ fontSize: 16, color: st.color, marginTop: 2, flex: "none" }} />
                          <div>
                            <p style={{ margin: 0, fontSize: 13.5, color: "#dfe3df", lineHeight: 1.5 }}>
                              <span style={{ color: "#eef0ee", fontWeight: 500 }}>{ins.supplement}</span> — {ins.correlation}
                            </p>
                            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#7d837d" }}>{ins.confidence} confidence · {ins.reason}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Monthly review — derived from real insight suggestions */}
            {!insightsLoading && insights.length > 0 && (
              <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <i className="ph ph-arrows-clockwise" style={{ fontSize: 16, color: "#4fd99a" }} />
                  <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Monthly review</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {insights.map((ins, idx) => {
                    const st = SUGGESTION_STYLE[ins.suggestion] ?? SUGGESTION_STYLE.continue;
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ ...MONO, fontSize: 9, color: st.color, padding: "3px 8px", borderRadius: 6, background: st.bg, flex: "none" }}>{st.tag}</span>
                        <span style={{ fontSize: 12.5, color: "#cdd2cd" }}>{ins.supplement} — {ins.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={loadSupplements} />}
    </div>
  );
}
