"use client";

import { useEffect, useRef, useState } from "react";

// ─── Breathwork patterns ─────────────────────────────────────────────────────

type BreathType = "box" | "478" | "resonance";
type PhaseName = "inhale" | "hold" | "exhale";

interface PhaseConfig {
  name: PhaseName;
  duration: number; // seconds
  circleScale: number; // 0.6 small → 1.3 large
  transitionDuration: number; // css transition seconds (0 for holds)
  label: string;
}

interface Pattern {
  label: string;
  description: string;
  phases: PhaseConfig[];
  cycleSeconds: number;
}

const PATTERNS: Record<BreathType, Pattern> = {
  box: {
    label: "Box Breathing",
    description: "4-4-4-4",
    cycleSeconds: 16,
    phases: [
      { name: "inhale", duration: 4, circleScale: 1.3, transitionDuration: 4, label: "Inhale" },
      { name: "hold",   duration: 4, circleScale: 1.3, transitionDuration: 0, label: "Hold" },
      { name: "exhale", duration: 4, circleScale: 0.6, transitionDuration: 4, label: "Exhale" },
      { name: "hold",   duration: 4, circleScale: 0.6, transitionDuration: 0, label: "Hold" },
    ],
  },
  "478": {
    label: "4-7-8 Breathing",
    description: "4-7-8",
    cycleSeconds: 19,
    phases: [
      { name: "inhale", duration: 4, circleScale: 1.3, transitionDuration: 4, label: "Inhale" },
      { name: "hold",   duration: 7, circleScale: 1.3, transitionDuration: 0, label: "Hold" },
      { name: "exhale", duration: 8, circleScale: 0.6, transitionDuration: 8, label: "Exhale" },
    ],
  },
  resonance: {
    label: "Resonance Breathing",
    description: "5.5-5.5",
    cycleSeconds: 11,
    phases: [
      { name: "inhale", duration: 5.5, circleScale: 1.3, transitionDuration: 5.5, label: "Inhale" },
      { name: "exhale", duration: 5.5, circleScale: 0.6, transitionDuration: 5.5, label: "Exhale" },
    ],
  },
};

// ─── HRV chart helpers ────────────────────────────────────────────────────────

interface HrvPoint { date: string; hrv: number | null }
interface LogEntry {
  id: string;
  date: string;
  type: string;
  duration_mins: number;
  feeling_after: number | null;
}

function formatShortDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function HrvTrendChart({ hrvData, logs }: { hrvData: HrvPoint[]; logs: LogEntry[] }) {
  const validHrv = hrvData.filter((d) => d.hrv != null);
  if (validHrv.length < 5) return null;

  const breathworkDates = new Set(logs.map((l) => l.date));
  const maxHrv = Math.max(...validHrv.map((d) => d.hrv!));
  const minHrv = Math.min(...validHrv.map((d) => d.hrv!));
  const range = maxHrv - minHrv || 1;

  return (
    <div className="mt-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
      <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
        HRV Trend (last 30 days)
      </h4>
      <div className="flex items-end gap-1 h-16">
        {validHrv.slice(-20).map((d, i) => {
          const heightPct = ((d.hrv! - minHrv) / range) * 100;
          const hasBreathwork = breathworkDates.has(d.date);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div
                className={`w-full rounded-t transition-all ${
                  hasBreathwork
                    ? "bg-indigo-400 dark:bg-indigo-500"
                    : "bg-neutral-300 dark:bg-neutral-600"
                }`}
                style={{ height: `${Math.max(heightPct, 8)}%` }}
                title={`${formatShortDate(d.date)}: ${d.hrv}ms${hasBreathwork ? " (breathwork)" : ""}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400 dark:bg-indigo-500" />
          <span className="text-[10px] text-neutral-400">Breathwork day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-neutral-300 dark:bg-neutral-600" />
          <span className="text-[10px] text-neutral-400">Regular day</span>
        </div>
        <span className="text-[10px] text-neutral-400 ml-auto">
          Range: {minHrv}–{maxHrv}ms
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type SessionState = "idle" | "running" | "done";

export default function BreathworkSection() {
  const [selectedType, setSelectedType] = useState<BreathType>("box");
  const [durationMins, setDurationMins] = useState(5);
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [feeling, setFeeling] = useState(7);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Timer display state
  const [phaseLabel, setPhaseLabel] = useState("Inhale");
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [circleScale, setCircleScale] = useState(0.6);
  const [circleTransDur, setCircleTransDur] = useState(0);

  // Data
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hrvData, setHrvData] = useState<HrvPoint[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Refs for timer logic (avoid stale closures)
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const lastPhaseIdxRef = useRef<number>(-1);

  useEffect(() => {
    fetch("/api/breathwork")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setLogs(d.logs ?? []);
          setHrvData(d.hrv_data ?? []);
        }
        setDataLoaded(true);
      })
      .catch(() => setDataLoaded(true));
  }, [saved]);

  function getPhaseAtElapsed(pattern: Pattern, elapsed: number) {
    const cycleElapsed = elapsed % pattern.cycleSeconds;
    let accum = 0;
    for (let i = 0; i < pattern.phases.length; i++) {
      accum += pattern.phases[i].duration;
      if (cycleElapsed < accum) {
        const phaseStart = accum - pattern.phases[i].duration;
        return { phase: pattern.phases[i], idx: i, timeLeft: accum - cycleElapsed, phaseStart };
      }
    }
    return { phase: pattern.phases[0], idx: 0, timeLeft: pattern.phases[0].duration, phaseStart: 0 };
  }

  function startSession() {
    const pattern = PATTERNS[selectedType];
    const totalSecs = durationMins * 60;
    startTimeRef.current = Date.now();
    lastPhaseIdxRef.current = -1;
    setSessionState("running");
    setTotalTimeLeft(totalSecs);
    setPhaseTimeLeft(pattern.phases[0].duration);
    setPhaseLabel(pattern.phases[0].label);
    setCircleScale(pattern.phases[0].circleScale);
    setCircleTransDur(pattern.phases[0].transitionDuration);

    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const totalSecs = durationMins * 60;
      const remaining = Math.max(0, totalSecs - elapsed);

      if (remaining <= 0) {
        if (tickRef.current) clearInterval(tickRef.current);
        setSessionState("done");
        setTotalTimeLeft(0);
        setCircleScale(0.6);
        setCircleTransDur(1);
        return;
      }

      const { phase, idx, timeLeft } = getPhaseAtElapsed(PATTERNS[selectedType], elapsed);

      // Trigger circle animation only on phase change
      if (idx !== lastPhaseIdxRef.current) {
        lastPhaseIdxRef.current = idx;
        setCircleScale(phase.circleScale);
        setCircleTransDur(phase.transitionDuration);
        setPhaseLabel(phase.label);
      }

      setPhaseTimeLeft(Math.ceil(timeLeft));
      setTotalTimeLeft(Math.ceil(remaining));
    }, 200);
  }

  function stopSession() {
    if (tickRef.current) clearInterval(tickRef.current);
    setSessionState("idle");
    setCircleScale(0.6);
    setCircleTransDur(0.5);
  }

  async function saveSession() {
    setSaving(true);
    try {
      await fetch("/api/breathwork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          duration_mins: durationMins,
          feeling_after: feeling,
        }),
      });
      setSaved(true);
      setSessionState("idle");
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  const pattern = PATTERNS[selectedType];
  const mins = Math.floor(totalTimeLeft / 60);
  const secs = totalTimeLeft % 60;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg className="h-5 w-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          HRV Training
        </h2>
      </div>

      {/* ── Idle / Setup ──────────────────────────────────────────────────── */}
      {sessionState === "idle" && (
        <div className="space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.entries(PATTERNS) as [BreathType, Pattern][]).map(([key, p]) => (
              <button
                key={key}
                onClick={() => setSelectedType(key)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedType === key
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400"
                }`}
              >
                <p className={`text-sm font-medium ${selectedType === key ? "text-indigo-700 dark:text-indigo-300" : "text-neutral-900 dark:text-neutral-100"}`}>
                  {p.label}
                </p>
                <p className="text-xs text-neutral-400 mt-0.5">{p.description}</p>
              </button>
            ))}
          </div>

          {/* Phase guide */}
          <div className="flex flex-wrap gap-2">
            {pattern.phases.map((ph, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  ph.name === "inhale"
                    ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                    : ph.name === "exhale"
                      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {ph.label} {ph.duration}s
              </span>
            ))}
          </div>

          {/* Duration selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600 dark:text-neutral-400 shrink-0">Duration</span>
            <div className="flex gap-2">
              {[3, 5, 10, 15].map((m) => (
                <button
                  key={m}
                  onClick={() => setDurationMins(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    durationMins === m
                      ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                      : "border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
          >
            Start {durationMins}-minute session
          </button>

          {/* Recent sessions */}
          {dataLoaded && logs.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Recent sessions</p>
              {logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {formatShortDate(log.date)} · {PATTERNS[log.type as BreathType]?.label ?? log.type} · {log.duration_mins}m
                  </span>
                  {log.feeling_after != null && (
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Felt {log.feeling_after}/10
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* HRV trend */}
          {dataLoaded && <HrvTrendChart hrvData={hrvData} logs={logs} />}
        </div>
      )}

      {/* ── Active Session ────────────────────────────────────────────────── */}
      {sessionState === "running" && (
        <div className="space-y-6">
          {/* Animated circle */}
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <div className="relative flex items-center justify-center w-48 h-48">
              {/* Outer glow ring */}
              <div
                className="absolute rounded-full bg-indigo-200 dark:bg-indigo-800/40"
                style={{
                  width: 192,
                  height: 192,
                  transform: `scale(${circleScale})`,
                  transition: `transform ${circleTransDur}s ease-in-out`,
                }}
              />
              {/* Inner circle */}
              <div
                className="absolute rounded-full bg-indigo-400 dark:bg-indigo-500 opacity-60"
                style={{
                  width: 128,
                  height: 128,
                  transform: `scale(${circleScale})`,
                  transition: `transform ${circleTransDur}s ease-in-out`,
                }}
              />
              {/* Phase text */}
              <div className="relative z-10 text-center">
                <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">
                  {phaseLabel}
                </p>
                <p className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">
                  {phaseTimeLeft}
                </p>
              </div>
            </div>

            {/* Timer */}
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {mins}:{String(secs).padStart(2, "0")} remaining
            </p>
          </div>

          <button
            onClick={stopSession}
            className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            End session
          </button>
        </div>
      )}

      {/* ── Post-session ──────────────────────────────────────────────────── */}
      {sessionState === "done" && (
        <div className="space-y-5">
          <div className="text-center py-4">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Session complete — {durationMins} minutes of {pattern.label}
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              How do you feel now?
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={feeling}
              onChange={(e) => setFeeling(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Tense</span>
              <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">{feeling}</span>
              <span>Calm & clear</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveSession}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save session"}
            </button>
            <button
              onClick={() => setSessionState("idle")}
              className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Skip
            </button>
          </div>

          {saved && (
            <p className="text-xs text-center text-emerald-600 dark:text-emerald-400">
              Session logged.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
