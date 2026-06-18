"use client";

import { useEffect, useState } from "react";
import { WhoopData } from "@/lib/whoop";

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface HistoryDay {
  date: string;
  recovery_score: number | null;
  hrv: number | null;
  strain: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
}
interface AppleDay { date: string; steps: number | null; resting_hr: number | null; hrv: number | null; }
interface EnergyDay { date: string; energyScore: number | null; stressLevel: number | null; mood: string | null; }

function dayNum(dateStr: string): string {
  const d = dateStr.split("-")[2] ?? dateStr;
  return String(Number(d));
}
function recColor(v: number | null): string {
  if (v == null) return "rgba(255,255,255,0.1)";
  if (v >= 67) return "#4fd99a";
  if (v >= 34) return "#3a9e74";
  return "#d9b45f";
}
function barH(value: number | null, max: number): number {
  if (value == null || max <= 0) return 4;
  return Math.max(4, Math.round((value / max) * 90));
}

export default function HealthPage() {
  const [whoop, setWhoop] = useState<WhoopData | null>(null);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [apple, setApple] = useState<AppleDay[]>([]);
  const [energy, setEnergy] = useState<EnergyDay[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const s = await fetch("/api/whoop/status");
        if (s.ok && (await s.json()).connected) {
          const d = await fetch("/api/whoop/data");
          if (d.ok) setWhoop(await d.json());
        }
      } catch {}
    })();
    fetch("/api/whoop/history").then((r) => (r.ok ? r.json() : { days: [] })).then((d) => setHistory(d.days ?? [])).catch(() => {});
    fetch("/api/apple-health/data").then((r) => (r.ok ? r.json() : [])).then((d) => setApple(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/energy/trend").then((r) => (r.ok ? r.json() : { days: [] })).then((d) => setEnergy(d.days ?? [])).catch(() => {});
  }, []);

  // Current snapshot
  const recovery = whoop?.recovery?.score?.recovery_score ?? null;
  const hrv = whoop?.recovery?.score?.hrv_rmssd_milli ?? null;
  const rhr = whoop?.recovery?.score?.resting_heart_rate ?? null;
  const sleepEff = whoop?.sleep?.score?.sleep_efficiency_percentage ?? null;
  let sleepStr: string | null = null;
  if (whoop?.sleep?.start && whoop?.sleep?.end) {
    const m = Math.round((new Date(whoop.sleep.end).getTime() - new Date(whoop.sleep.start).getTime()) / 60000);
    sleepStr = `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  }

  // 7-day window from history
  const last7 = history.slice(-7);
  const avg = (arr: (number | null)[]) => {
    const vals = arr.filter((v): v is number => v != null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const avgRecovery = avg(last7.map((d) => d.recovery_score));
  const avgRhr = avg(apple.map((d) => d.resting_hr));
  const maxHrv = Math.max(1, ...last7.map((d) => d.hrv ?? 0));

  // Apple summary
  const appleSorted = [...apple].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latestApple = appleSorted[0];
  const avgSteps = avg(apple.map((d) => d.steps));
  const appleHrvTrend = (() => {
    const vals = [...apple].sort((a, b) => (a.date < b.date ? -1 : 1)).map((d) => d.hrv).filter((v): v is number => v != null);
    if (vals.length < 2) return null;
    return vals[vals.length - 1] >= vals[0] ? "rising" : "easing";
  })();

  // Frustration strip from stress levels (last 14 days)
  const energy14 = energy.slice(-14);
  const frustrationSignals = energy14.filter((d) => (d.stressLevel ?? 0) >= 7).length;
  const stripColor = (lvl: number | null) => (lvl == null ? "rgba(255,255,255,0.06)" : lvl >= 7 ? "#d9b45f" : lvl <= 3 ? "#4fd99a" : "rgba(255,255,255,0.06)");

  const dim = (v: string | number | null, suffix = "") => (v == null ? "—" : `${v}${suffix}`);

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -180, left: "30%", width: 680, height: 460, background: "radial-gradient(ellipse at center, rgba(79,217,154,0.08), rgba(79,217,154,0) 70%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "34px 44px 56px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 30 }}>
          <div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: "2px", color: "#7d837d", textTransform: "uppercase", marginBottom: 8 }}>Recovery &amp; Body</div>
            <h1 style={{ fontWeight: 300, fontSize: 32, color: "#eef0ee", margin: 0, letterSpacing: "-0.4px" }}>Health</h1>
          </div>
          <a href="/settings" style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#cdd2cd", padding: "11px 18px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", cursor: "pointer", fontFamily: "'Sora', sans-serif", textDecoration: "none" }}>
            <i className="ph ph-gear" style={{ fontSize: 17, color: "#4fd99a" }} />
            Manage integrations
          </a>
        </div>

        {/* Top stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
          {[
            { icon: "ph-pulse", label: "Recovery", value: dim(recovery), unit: recovery != null ? "%" : "", sub: avgRecovery != null ? `7-day avg ${avgRecovery}%` : "no recent data", valueColor: "#4fd99a" },
            { icon: "ph-wave-sine", label: "HRV", value: hrv != null ? String(Math.round(hrv)) : "—", unit: hrv != null ? "ms" : "", sub: "rmssd" },
            { icon: "ph-heartbeat", label: "Resting HR", value: rhr != null ? String(Math.round(rhr)) : "—", unit: rhr != null ? "bpm" : "", sub: avgRhr != null ? `7-day avg ${avgRhr}` : "" },
            { icon: "ph-moon-stars", label: "Sleep", value: sleepStr ?? "—", unit: "", sub: sleepEff != null ? `${Math.round(sleepEff)}% efficiency` : "" },
          ].map(({ icon, label, value, unit, sub, valueColor }) => (
            <div key={label} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, background: "rgba(255,255,255,0.02)", padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <i className={`ph-duotone ${icon}`} style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 9, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>{label}</span>
              </div>
              <div>
                <span style={{ ...MONO, fontSize: 30, color: valueColor ?? "#eef0ee", fontWeight: 600 }}>{value}</span>
                {unit && <span style={{ fontSize: 13, color: "#7d837d" }}>{unit}</span>}
              </div>
              <div style={{ fontSize: 11, color: "#868d86", marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* 7-day trend */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 24, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <span style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#7d837d", textTransform: "uppercase" }}>7-day trend</span>
            <span style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>{last7.length > 0 ? `${last7.length} days` : "no data yet"}</span>
          </div>
          {last7.length === 0 ? (
            <p style={{ fontSize: 13, color: "#868d86", margin: 0 }}>No stored Whoop history yet — trends appear after a few days of synced data.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
              {/* Recovery */}
              <div>
                <div style={{ fontSize: 12, color: "#a2a8a2", marginBottom: 16 }}>Recovery <span style={{ color: "#5e645e" }}>·%</span></div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                  {last7.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", height: barH(d.recovery_score, 100), background: recColor(d.recovery_score), borderRadius: 4 }} />
                      <span style={{ ...MONO, fontSize: 9, color: i === last7.length - 1 ? "#4fd99a" : "#5e645e" }}>{dayNum(d.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* HRV */}
              <div>
                <div style={{ fontSize: 12, color: "#a2a8a2", marginBottom: 16 }}>HRV <span style={{ color: "#5e645e" }}>·ms</span></div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                  {last7.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", height: barH(d.hrv, maxHrv), background: i === last7.length - 1 ? "#4fd99a" : "#3a9e74", borderRadius: 4 }} />
                      <span style={{ ...MONO, fontSize: 9, color: i === last7.length - 1 ? "#4fd99a" : "#5e645e" }}>{dayNum(d.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Strain */}
              <div>
                <div style={{ fontSize: 12, color: "#a2a8a2", marginBottom: 16 }}>Strain <span style={{ color: "#5e645e" }}>·0–21</span></div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                  {last7.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", height: barH(d.strain, 21), background: "#d9b45f", borderRadius: 4, opacity: 0.85 }} />
                      <span style={{ ...MONO, fontSize: 9, color: i === last7.length - 1 ? "#4fd99a" : "#5e645e" }}>{dayNum(d.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Two-col bottom */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Apple Health */}
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="ph ph-apple-logo" style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Apple Health</span>
              </div>
              <span style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>{latestApple ? `updated ${latestApple.date}` : "no data"}</span>
            </div>
            {apple.length === 0 ? (
              <p style={{ fontSize: 13, color: "#868d86", margin: 0, lineHeight: 1.5 }}>No Apple Health data yet — sync via the Health Auto Export app.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { icon: "ph-footprints", label: "Steps · daily avg", value: avgSteps != null ? avgSteps.toLocaleString() : "—" },
                  { icon: "ph-heartbeat", label: "Resting HR", value: latestApple?.resting_hr != null ? `${Math.round(latestApple.resting_hr)} bpm` : "—" },
                  { icon: "ph-wave-sine", label: "HRV trend", value: appleHrvTrend ?? "—", valueColor: appleHrvTrend === "rising" ? "#4fd99a" : undefined },
                ].map(({ icon, label, value, valueColor }, idx) => (
                  <div key={label}>
                    {idx > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "16px 0" }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13.5, color: "#a2a8a2", display: "flex", alignItems: "center", gap: 9 }}>
                        <i className={`ph ${icon}`} style={{ fontSize: 17, color: "#7d837d" }} />{label}
                      </span>
                      <span style={{ ...MONO, fontSize: 16, color: (valueColor as string) ?? "#eef0ee" }}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Frustration pattern */}
          <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <i className="ph ph-warning" style={{ fontSize: 16, color: "#d9b45f" }} />
              <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Frustration pattern</span>
            </div>
            <p style={{ fontSize: 13, color: "#868d86", margin: "0 0 16px", lineHeight: 1.55 }}>
              Frustration is a not-self signal — it shows up when you&rsquo;re pushing against your nature. Maya tracks when it clusters.
            </p>
            {energy14.length === 0 ? (
              <p style={{ ...MONO, fontSize: 10, color: "#5e645e", margin: 0 }}>No check-in data yet</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                  {energy14.map((d, i) => (
                    <div key={i} style={{ flex: 1, height: 28, borderRadius: 5, background: stripColor(d.stressLevel) }} />
                  ))}
                </div>
                <p style={{ ...MONO, fontSize: 10, color: "#5e645e", margin: 0 }}>{frustrationSignals} frustration signal{frustrationSignals !== 1 ? "s" : ""} in {energy14.length} days</p>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
