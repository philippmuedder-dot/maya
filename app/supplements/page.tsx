"use client";

import { useEffect, useState } from "react";

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface Supplement {
  id: string;
  name: string;
  dose: number | null;
  unit: string | null;
  timing: string | null;
  purpose: string | null;
  active: boolean;
}

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
          {name}{dose && <span style={{ ...MONO, fontSize: 12, color: "#7d837d", fontWeight: 400 }}> {dose}{unit}</span>}
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

const PLACEHOLDERS = [
  { id: "p1", name: "Magnesium Glycinate", dose: 400, unit: "mg", timing: "night", purpose: "sleep & HRV support", active: true },
  { id: "p2", name: "Omega-3", dose: 2, unit: "g", timing: "morning", purpose: "brain & inflammation", active: true },
  { id: "p3", name: "Creatine", dose: 5, unit: "g", timing: "afternoon", purpose: "strength & cognition", active: true },
];

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/supplements")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Supplement[]) => {
        setSupplements(data.filter((s) => s.active));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const toggleTaken = (id: string) =>
    setTaken((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const displaySupps = loaded && supplements.length > 0 ? supplements : PLACEHOLDERS;
  const takenCount = taken.size;
  const totalCount = displaySupps.length;

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
          <button style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#06231e", padding: "11px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #4fd99a, #1e8d63)", cursor: "pointer", fontFamily: "'Sora', sans-serif", fontWeight: 500 }}>
            <i className="ph-bold ph-plus" style={{ fontSize: 16 }} />
            Add supplement
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 372px", gap: 18, alignItems: "start" }}>

          {/* LEFT — stack */}
          <div>
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#7d837d", textTransform: "uppercase" }}>Today&apos;s stack</span>
                <span style={{ ...MONO, fontSize: 11, color: "#4fd99a" }}>{takenCount} of {totalCount} taken</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {displaySupps.map((s) => (
                  <SupplementItem
                    key={s.id}
                    id={s.id}
                    name={s.name}
                    dose={s.dose}
                    unit={s.unit}
                    timing={s.timing ?? ""}
                    purpose={s.purpose ?? ""}
                    isTaken={taken.has(s.id)}
                    onToggle={toggleTaken}
                  />
                ))}
                {/* Paused item */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", border: "1px dashed rgba(217,180,95,0.3)", borderRadius: 12, background: "rgba(217,180,95,0.03)", opacity: 0.85 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(217,180,95,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                    <i className="ph-duotone ph-pause" style={{ fontSize: 18, color: "#d9b45f" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, color: "#cdd2cd", fontWeight: 500 }}>Ashwagandha <span style={{ ...MONO, fontSize: 12, color: "#7d837d", fontWeight: 400 }}>600mg</span></div>
                    <div style={{ fontSize: 12, color: "#a08a55", marginTop: 2 }}>Paused by Maya · HRV strong, not needed</div>
                  </div>
                  <span style={{ ...MONO, fontSize: 10, color: "#d9b45f", padding: "5px 10px", borderRadius: 7, background: "rgba(217,180,95,0.1)" }}>PAUSED</span>
                </div>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { icon: "ph-fill ph-trend-up", color: "#4fd99a", text: <>Your HRV runs <span style={{ color: "#4fd99a" }}>12% higher</span> on nights you take magnesium glycinate.</> },
                  { icon: "ph-fill ph-trend-up", color: "#4fd99a", text: <>Creatine on training days correlates with <span style={{ color: "#4fd99a" }}>better next-day recovery</span>.</> },
                  { icon: "ph-fill ph-minus-circle", color: "#d9b45f", text: "No measurable signal from ashwagandha over 6 weeks of data." },
                ].map(({ icon, color, text }, idx) => (
                  <div key={idx}>
                    {idx > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />}
                    <div style={{ display: "flex", gap: 11 }}>
                      <i className={icon} style={{ fontSize: 16, color, marginTop: 2, flex: "none" }} />
                      <p style={{ margin: 0, fontSize: 13.5, color: "#dfe3df", lineHeight: 1.5 }}>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ ...MONO, fontSize: 10, color: "#5e645e", marginTop: 16 }}>6 weeks of data · referenced to Whoop + bloodwork</div>
            </div>

            {/* Monthly review */}
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <i className="ph ph-arrows-clockwise" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Monthly review</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { tag: "STOP", tagColor: "#d9b45f", tagBg: "rgba(217,180,95,0.12)", text: "Ashwagandha — low signal" },
                  { tag: "KEEP", tagColor: "#4fd99a", tagBg: "rgba(79,217,154,0.12)", text: "Magnesium — strong HRV link" },
                  { tag: "ADD", tagColor: "#9fb8ac", tagBg: "rgba(159,184,172,0.12)", text: "Vitamin D3 — low in bloodwork" },
                ].map(({ tag, tagColor, tagBg, text }) => (
                  <div key={tag} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ ...MONO, fontSize: 9, color: tagColor, padding: "3px 8px", borderRadius: 6, background: tagBg, flex: "none" }}>{tag}</span>
                    <span style={{ fontSize: 12.5, color: "#cdd2cd" }}>{text}</span>
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
