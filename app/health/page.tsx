import type { Metadata } from "next";

export const metadata: Metadata = { title: "MAYA — Health" };

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;
const days = ["12", "13", "14", "15", "16", "17", "18"];

const recoveryData = [
  { h: 43, c: "#d9b45f" }, { h: 49, c: "#3a9e74" }, { h: 39, c: "#d9b45f" },
  { h: 53, c: "#3a9e74" }, { h: 58, c: "#4fd99a" }, { h: 50, c: "#3a9e74" }, { h: 54, c: "#4fd99a" },
];
const hrvData = [
  { h: 48, c: "#2f7d5c" }, { h: 56, c: "#3a9e74" }, { h: 44, c: "#2f7d5c" },
  { h: 60, c: "#3a9e74" }, { h: 66, c: "#4fd99a" }, { h: 63, c: "#4fd99a" }, { h: 70, c: "#4fd99a" },
];
const strainData = [
  { h: 46, o: 0.85 }, { h: 32, o: 0.7 }, { h: 54, o: 1 },
  { h: 34, o: 0.7 }, { h: 25, o: 0.6 }, { h: 43, o: 0.85 }, { h: 31, o: 0.7 },
];

export default function HealthPage() {
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
          <button style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#cdd2cd", padding: "11px 18px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
            <i className="ph ph-upload-simple" style={{ fontSize: 17, color: "#4fd99a" }} />
            Upload Apple Health XML
          </button>
        </div>

        {/* Top stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
          {[
            { icon: "ph-pulse", label: "Recovery", value: "68", unit: "%", sub: "7-day avg 62%", valueColor: "#4fd99a" },
            { icon: "ph-wave-sine", label: "HRV", value: "64", unit: "ms", sub: "▲ 9% this week", subColor: "#4fd99a" },
            { icon: "ph-heartbeat", label: "Resting HR", value: "52", unit: "bpm", sub: "7-day avg 53" },
            { icon: "ph-moon-stars", label: "Sleep", value: "7:12", unit: "", sub: "88% efficiency" },
          ].map(({ icon, label, value, unit, sub, valueColor, subColor }) => (
            <div key={label} style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, background: "rgba(255,255,255,0.02)", padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <i className={`ph-duotone ${icon}`} style={{ fontSize: 16, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 9, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>{label}</span>
              </div>
              <div>
                <span style={{ ...MONO, fontSize: 30, color: valueColor ?? "#eef0ee", fontWeight: 600 }}>{value}</span>
                {unit && <span style={{ fontSize: 13, color: "#7d837d" }}>{unit}</span>}
              </div>
              <div style={{ fontSize: 11, color: subColor ?? "#868d86", marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* 7-day trend */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 24, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <span style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#7d837d", textTransform: "uppercase" }}>7-day trend</span>
            <span style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>Jun 12 – 18</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
            {/* Recovery */}
            <div>
              <div style={{ fontSize: 12, color: "#a2a8a2", marginBottom: 16 }}>Recovery <span style={{ color: "#5e645e" }}>·%</span></div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                {recoveryData.map(({ h, c }, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: "100%", height: h, background: c, borderRadius: 4 }} />
                    <span style={{ ...MONO, fontSize: 9, color: days[i] === "18" ? "#4fd99a" : "#5e645e" }}>{days[i]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* HRV */}
            <div>
              <div style={{ fontSize: 12, color: "#a2a8a2", marginBottom: 16 }}>HRV <span style={{ color: "#5e645e" }}>·ms</span></div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                {hrvData.map(({ h, c }, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: "100%", height: h, background: c, borderRadius: 4 }} />
                    <span style={{ ...MONO, fontSize: 9, color: days[i] === "18" ? "#4fd99a" : "#5e645e" }}>{days[i]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Strain */}
            <div>
              <div style={{ fontSize: 12, color: "#a2a8a2", marginBottom: 16 }}>Strain <span style={{ color: "#5e645e" }}>·0–21</span></div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
                {strainData.map(({ h, o }, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: "100%", height: h, background: "#d9b45f", borderRadius: 4, opacity: o }} />
                    <span style={{ ...MONO, fontSize: 9, color: days[i] === "18" ? "#4fd99a" : "#5e645e" }}>{days[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
              <span style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>uploaded Jun 16</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { icon: "ph-footprints", label: "Steps · daily avg", value: "8,420" },
                { icon: "ph-heartbeat", label: "Resting HR", value: "53 bpm" },
                { icon: "ph-wave-sine", label: "HRV trend", value: "rising", valueColor: "#4fd99a" },
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
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {["#d9b45f","n","n","#d9b45f","n","#4fd99a","#4fd99a","n","n","#d9b45f","n","#4fd99a","#4fd99a","n"].map((c, i) => (
                <div key={i} style={{ flex: 1, height: 28, borderRadius: 5, background: c === "n" ? "rgba(255,255,255,0.06)" : c }} />
              ))}
            </div>
            <p style={{ ...MONO, fontSize: 10, color: "#5e645e", margin: 0 }}>3 frustration signals in 14 days · trending lower</p>
          </div>
        </div>

      </div>
    </div>
  );
}
