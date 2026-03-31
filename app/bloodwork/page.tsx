"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Marker {
  name: string;
  value: string;
  unit: string;
  reference_range: string;
  reference_min?: number | null;
  reference_max?: number | null;
  status: "normal" | "low" | "high";
}

interface BloodworkResult {
  id: string;
  test_date: string | null;
  lab_name: string | null;
  markers: Marker[];
  created_at: string;
}

interface PendingResult {
  markers: Marker[];
  test_date: string | null;
  lab_name: string | null;
  file_path: string;
}

interface StoredRange {
  id: string;
  marker_name: string;
  optimal_min: number | null;
  optimal_max: number | null;
  unit: string | null;
  source: string | null;
}

type RefSource = "lab" | "function_health";
type EffectiveStatus = "normal" | "low" | "high" | "suboptimal";
type ActiveTab = "latest" | "trends" | "ranges";

/** Sort bloodwork results newest-first by test_date (ISO strings compare correctly as strings).
 *  Records without a test_date always go last. */
function sortByTestDate(results: BloodworkResult[]): BloodworkResult[] {
  return [...results].sort((a, b) => {
    if (!a.test_date && !b.test_date) return 0;
    if (!a.test_date) return 1;  // null → last
    if (!b.test_date) return -1; // null → last
    // ISO date strings: lexicographic order = chronological order
    if (b.test_date > a.test_date) return 1;  // b is newer → b first
    if (b.test_date < a.test_date) return -1;
    return 0;
  });
}

// ─── Function Health Hardcoded Fallback Ranges ─────────────────────────────────

interface OptimalRange {
  min?: number;
  max?: number;
}

const FH_OPTIMAL: [string, OptimalRange][] = [
  ["vitamin d", { min: 60, max: 80 }],
  ["ferritin", { min: 50, max: 150 }],
  ["tsh", { min: 0.5, max: 2.0 }],
  ["fasting glucose", { min: 70, max: 85 }],
  ["glucose", { min: 70, max: 85 }],
  ["hba1c", { max: 5.4 }],
  ["hemoglobin a1c", { max: 5.4 }],
  ["ldl", { max: 100 }],
  ["homocysteine", { max: 8 }],
  ["hs-crp", { max: 0.5 }],
  ["hscrp", { max: 0.5 }],
  ["high-sensitivity c-reactive", { max: 0.5 }],
  ["c-reactive protein", { max: 0.5 }],
  ["testosterone", { min: 600, max: 900 }],
];

// Returns { status, rangeSource } where rangeSource indicates which range was used
function getEffectiveStatus(
  marker: Marker,
  refSource: RefSource,
  dbRanges: Record<string, StoredRange>
): { status: EffectiveStatus; rangeSource: "stored" | "fh_default" | "lab" } {
  if (refSource !== "function_health") {
    return { status: marker.status, rangeSource: "lab" };
  }

  const numeric = parseNumericValue(marker.value);
  if (numeric === null) return { status: marker.status, rangeSource: "lab" };

  const key = marker.name.toLowerCase().trim();

  // 1. Check stored DB ranges first
  const stored = dbRanges[key];
  if (stored && (stored.optimal_min != null || stored.optimal_max != null)) {
    const belowMin = stored.optimal_min != null && numeric < stored.optimal_min;
    const aboveMax = stored.optimal_max != null && numeric > stored.optimal_max;
    if ((belowMin || aboveMax) && marker.status === "normal") {
      return { status: "suboptimal", rangeSource: "stored" };
    }
    return { status: marker.status, rangeSource: "stored" };
  }

  // 2. Fall back to hardcoded FH ranges
  const nameLower = marker.name.toLowerCase();
  for (const [fhKey, range] of FH_OPTIMAL) {
    if (nameLower.includes(fhKey)) {
      const belowMin = range.min !== undefined && numeric < range.min;
      const aboveMax = range.max !== undefined && numeric > range.max;
      if ((belowMin || aboveMax) && marker.status === "normal") {
        return { status: "suboptimal", rangeSource: "fh_default" };
      }
      return { status: marker.status, rangeSource: "fh_default" };
    }
  }

  return { status: marker.status, rangeSource: "lab" };
}

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES: Record<string, string[]> = {
  Lipids: ["cholesterol", "ldl", "hdl", "triglyceride", "vldl", "lipoprotein", "apolipoprotein"],
  Vitamins: ["vitamin", "folate", "b12", "b6", "b9", "ferritin", "d3", "d2"],
  Hormones: ["testosterone", "estrogen", "cortisol", "tsh", "t3", "t4", "igf", "dhea", "lh", "fsh", "prolactin"],
  Metabolic: ["glucose", "hba1c", "uric acid", "albumin", "total protein"],
  "Liver / Kidney": ["alt", "ast", "ggt", "alkaline phosphatase", "bilirubin", "creatinine", "egfr", "bun", "urea"],
  Blood: ["hemoglobin", "hematocrit", "rbc", "wbc", "platelet", "mcv", "mch", "mchc", "neutrophil", "lymphocyte", "monocyte", "eosinophil", "basophil", "iron"],
  Electrolytes: ["sodium", "potassium", "calcium", "magnesium", "phosphorus", "chloride", "bicarbonate"],
  Inflammation: ["crp", "esr", "fibrinogen", "homocysteine"],
};

function categorize(marker: Marker): string {
  const nameLower = marker.name.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some((kw) => nameLower.includes(kw))) return cat;
  }
  return "Other";
}

function parseNumericValue(val: string): number | null {
  const cleaned = val.replace(/[<>~≤≥]/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function statusColor(status: EffectiveStatus) {
  if (status === "high") return "text-red-600 dark:text-red-400";
  if (status === "low") return "text-yellow-600 dark:text-yellow-400";
  if (status === "suboptimal") return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function statusBadge(status: EffectiveStatus) {
  const base = "text-xs font-medium px-2 py-0.5 rounded-full";
  if (status === "high") return `${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`;
  if (status === "low") return `${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400`;
  if (status === "suboptimal") return `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`;
  return `${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400`;
}

function statusLabel(status: EffectiveStatus) {
  if (status === "suboptimal") return "Sub-optimal";
  return status;
}

// ─── Trend Helpers ─────────────────────────────────────────────────────────────

interface TrendPoint {
  date: string;
  dateLabel: string;
  value: number;
  status: EffectiveStatus;
}

interface MarkerTrendData {
  name: string;
  unit: string;
  category: string;
  points: TrendPoint[];
  latest: TrendPoint;
  previous: TrendPoint;
  delta: number;
  deltaPercent: number;
  trend: "improving" | "worsening" | "stable";
}

interface UnretestedMarker {
  name: string;
  unit: string;
  value: string;
  status: EffectiveStatus;
  lastSeen: string;
  category: string;
}

function determineTrend(
  prev: TrendPoint,
  latest: TrendPoint,
  deltaPercent: number
): "improving" | "worsening" | "stable" {
  if (Math.abs(deltaPercent) < 5) return "stable";
  const prevBad = prev.status !== "normal";
  const latestBad = latest.status !== "normal";
  if (prevBad && !latestBad) return "improving";
  if (!prevBad && latestBad) return "worsening";
  return "stable";
}

function buildTrendData(
  results: BloodworkResult[],
  refSource: RefSource,
  dbRanges: Record<string, StoredRange>
): {
  trendData: Record<string, MarkerTrendData>;
  unretested: UnretestedMarker[];
} {
  const sorted = [...results].sort((a, b) => {
    const aDate = a.test_date ?? a.created_at;
    const bDate = b.test_date ?? b.created_at;
    return aDate.localeCompare(bDate);
  });

  const markerMap: Record<string, TrendPoint[]> = {};
  const markerMeta: Record<string, { unit: string; name: string }> = {};

  const latestResult = sorted[sorted.length - 1];
  const latestMarkerKeys = new Set(
    latestResult.markers.map((m) => m.name.toLowerCase().trim())
  );

  for (const result of sorted) {
    const dateStr = result.test_date ?? result.created_at.split("T")[0];
    const dateLabel = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });

    for (const m of result.markers) {
      const numeric = parseNumericValue(m.value);
      if (numeric === null) continue;

      const key = m.name.toLowerCase().trim();
      if (!markerMap[key]) markerMap[key] = [];
      if (!markerMeta[key]) markerMeta[key] = { unit: m.unit, name: m.name };

      const { status } = getEffectiveStatus(m, refSource, dbRanges);
      markerMap[key].push({ date: dateStr, dateLabel, value: numeric, status });
    }
  }

  const trendData: Record<string, MarkerTrendData> = {};

  for (const [key, points] of Object.entries(markerMap)) {
    if (points.length < 2) continue;

    const latest = points[points.length - 1];
    const previous = points[points.length - 2];
    const delta = latest.value - previous.value;
    const deltaPercent = previous.value !== 0
      ? (delta / Math.abs(previous.value)) * 100
      : 0;

    const trend = determineTrend(previous, latest, deltaPercent);
    const mockMarker: Marker = {
      name: markerMeta[key].name,
      value: "",
      unit: markerMeta[key].unit,
      reference_range: "",
      status: latest.status === "suboptimal" ? "normal" : latest.status,
    };

    trendData[key] = {
      name: markerMeta[key].name,
      unit: markerMeta[key].unit,
      category: categorize(mockMarker),
      points,
      latest,
      previous,
      delta,
      deltaPercent,
      trend,
    };
  }

  const unretested: UnretestedMarker[] = [];
  for (const [key, points] of Object.entries(markerMap)) {
    if (latestMarkerKeys.has(key)) continue;
    const lastPoint = points[points.length - 1];
    let origValue = String(lastPoint.value);
    for (let i = sorted.length - 1; i >= 0; i--) {
      const found = sorted[i].markers.find((m) => m.name.toLowerCase().trim() === key);
      if (found) { origValue = found.value; break; }
    }
    const mockMarker: Marker = {
      name: markerMeta[key].name,
      value: origValue,
      unit: markerMeta[key].unit,
      reference_range: "",
      status: lastPoint.status === "suboptimal" ? "normal" : lastPoint.status,
    };
    unretested.push({
      name: markerMeta[key].name,
      unit: markerMeta[key].unit,
      value: origValue,
      status: lastPoint.status,
      lastSeen: lastPoint.dateLabel,
      category: categorize(mockMarker),
    });
  }

  return { trendData, unretested };
}

// ─── Trend Chart Component ─────────────────────────────────────────────────────

function MarkerTrendCard({ data }: { data: MarkerTrendData }) {
  const isUp = data.delta > 0;
  const arrow = isUp ? "↑" : "↓";
  const absPct = Math.abs(data.deltaPercent).toFixed(1);

  const trendStyle = {
    improving: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
    worsening: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    stable: "text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800",
  }[data.trend];

  const trendLabel = { improving: "Getting better", worsening: "Getting worse", stable: "Stable" }[data.trend];

  const lineColor =
    data.latest.status === "normal" ? "#10b981" :
    data.latest.status === "suboptimal" ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{data.name}</p>
          <p className="text-xs text-neutral-400">{data.unit}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${trendStyle}`}>
          {trendLabel}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <span className={`text-lg font-bold font-mono ${statusColor(data.latest.status)}`}>
          {data.latest.value}
          <span className="text-xs font-normal text-neutral-400 ml-1">{data.unit}</span>
        </span>
        <span className={`text-xs font-medium ${isUp ? "text-blue-500" : "text-purple-500"}`}>
          {arrow} {absPct}%
        </span>
        <span className="text-xs text-neutral-400">
          from {data.previous.value} ({data.previous.dateLabel})
        </span>
      </div>

      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.points} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ backgroundColor: "rgba(17,17,17,0.9)", border: "none", borderRadius: "8px", fontSize: "12px", color: "#f5f5f5" }}
              formatter={(value: number) => [`${value} ${data.unit}`, data.name]}
              labelFormatter={(label: string) => label}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const color = payload.status === "normal" ? "#10b981" : payload.status === "suboptimal" ? "#f59e0b" : "#ef4444";
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill={color} stroke="white" strokeWidth={1.5} />;
              }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Trend Section ─────────────────────────────────────────────────────────────

function TrendSection({
  results,
  refSource,
  dbRanges,
}: {
  results: BloodworkResult[];
  refSource: RefSource;
  dbRanges: Record<string, StoredRange>;
}) {
  const { trendData, unretested } = buildTrendData(results, refSource, dbRanges);
  const markers = Object.values(trendData);

  const improving = markers.filter((m) => m.trend === "improving").length;
  const worsening = markers.filter((m) => m.trend === "worsening").length;
  const stable = markers.filter((m) => m.trend === "stable").length;

  const byCategory: Record<string, MarkerTrendData[]> = {};
  for (const m of markers) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }

  const order = [...Object.keys(CATEGORIES), "Other"];
  const sortedCats = order.filter((c) => byCategory[c]);

  return (
    <div className="space-y-6">
      {markers.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          {improving > 0 && <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium">{improving} improved</span>}
          {worsening > 0 && <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium">{worsening} declined</span>}
          {stable > 0 && <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">{stable} stable</span>}
          {unretested.length > 0 && <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium">{unretested.length} not retested</span>}
        </div>
      )}

      {markers.length === 0 && unretested.length === 0 && (
        <p className="text-sm text-neutral-400">No markers appear in multiple uploads yet.</p>
      )}

      {sortedCats.map((cat) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">{cat}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {byCategory[cat].map((m) => <MarkerTrendCard key={m.name} data={m} />)}
          </div>
        </div>
      ))}

      {unretested.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Not yet retested</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              {unretested.length} marker{unretested.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
            These markers appeared in an older test but are not in your most recent upload.
          </p>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">Marker</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">Last Value</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">Last Tested</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {unretested.map((m, i) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{m.name}</td>
                    <td className={`px-4 py-2.5 font-mono ${statusColor(m.status)}`}>
                      {m.value}{m.unit ? <span className="text-neutral-400 text-xs ml-1">{m.unit}</span> : null}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400 text-xs">{m.lastSeen}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Not retested</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Marker Table ─────────────────────────────────────────────────────────────

function MarkerTable({
  markers,
  refSource,
  dbRanges,
}: {
  markers: Marker[];
  refSource: RefSource;
  dbRanges: Record<string, StoredRange>;
}) {
  const grouped: Record<string, Marker[]> = {};
  for (const m of markers) {
    const cat = categorize(m);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  }

  const order = [...Object.keys(CATEGORIES), "Other"];
  const sorted = order.filter((c) => grouped[c]);

  return (
    <div className="space-y-6">
      {sorted.map((cat) => (
        <div key={cat}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">{cat}</h3>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="text-left px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">Marker</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">Value</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">Optimal Range</th>
                  <th className="text-left px-4 py-2 font-medium text-neutral-600 dark:text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {grouped[cat].map((m, i) => {
                  const { status: eff, rangeSource } = getEffectiveStatus(m, refSource, dbRanges);
                  const key = m.name.toLowerCase().trim();
                  const stored = dbRanges[key];

                  // Build the optimal range display string
                  let optimalRangeStr = m.reference_range;
                  let rangeLabel: string | null = null;
                  if (refSource === "function_health") {
                    if (stored && (stored.optimal_min != null || stored.optimal_max != null)) {
                      const min = stored.optimal_min != null ? stored.optimal_min : "–";
                      const max = stored.optimal_max != null ? stored.optimal_max : "–";
                      optimalRangeStr = `${min}–${max}${stored.unit ? ` ${stored.unit}` : ""}`;
                      rangeLabel = stored.source || "from your lab";
                    } else {
                      // Check FH hardcoded
                      const nameLower = m.name.toLowerCase();
                      for (const [fhKey, range] of FH_OPTIMAL) {
                        if (nameLower.includes(fhKey)) {
                          const min = range.min != null ? range.min : "–";
                          const max = range.max != null ? range.max : "–";
                          optimalRangeStr = `${min}–${max}${m.unit ? ` ${m.unit}` : ""}`;
                          rangeLabel = "FH default";
                          break;
                        }
                      }
                    }
                  }

                  return (
                    <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100">{m.name}</td>
                      <td className={`px-4 py-2.5 font-mono ${statusColor(eff)}`}>
                        {m.value}{m.unit ? <span className="text-neutral-400 text-xs ml-1">{m.unit}</span> : null}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400 text-xs hidden sm:table-cell">
                        <span>{optimalRangeStr}</span>
                        {rangeLabel && rangeSource !== "lab" && (
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            rangeSource === "stored"
                              ? "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
                              : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}>
                            {rangeSource === "stored" ? rangeLabel : "FH"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={statusBadge(eff)}>{statusLabel(eff)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Panel ─────────────────────────────────────────────────────────────

function ConfirmPanel({
  pending,
  onSave,
  onDiscard,
  saving,
}: {
  pending: PendingResult;
  onSave: (testDate: string | null, labName: string | null) => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const [testDate, setTestDate] = useState(pending.test_date ?? "");
  const [labName, setLabName] = useState(pending.lab_name ?? "");
  const dateFoundByAI = !!pending.test_date;
  const markerCount = pending.markers.length;
  const abnormal = pending.markers.filter((m) => m.status !== "normal").length;

  // Count how many markers have extracted reference ranges
  const withRanges = pending.markers.filter(
    (m) => m.reference_min != null || m.reference_max != null
  ).length;

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-900/10 p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Review before saving</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Claude extracted{" "}
          <span className="font-medium text-neutral-700 dark:text-neutral-300">{markerCount} markers</span>
          {abnormal > 0 && <> · <span className="font-medium text-red-600 dark:text-red-400">{abnormal} out of range</span></>}
          {withRanges > 0 && <> · <span className="font-medium text-violet-600 dark:text-violet-400">{withRanges} reference ranges stored</span></>}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 flex-wrap text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Test Date
          {!dateFoundByAI && (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Not found in document — please enter manually
            </span>
          )}
          {dateFoundByAI && (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              Found in document
            </span>
          )}
        </label>
        <input
          type="date"
          value={testDate}
          onChange={(e) => setTestDate(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        />
        {!dateFoundByAI && !testDate && (
          <p className="text-xs text-amber-600 dark:text-amber-400">A test date helps track trends over time. You can still save without it.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
          Lab Name <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <input
          type="text"
          value={labName}
          onChange={(e) => setLabName(e.target.value)}
          placeholder="e.g. LabCorp, Quest Diagnostics, Function Health"
          className="w-full max-w-sm px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(testDate || null, labName.trim() || null)}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : "Save Results"}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

// ─── Reference Range Setting Bar ─────────────────────────────────────────────

function ReferenceRangeBar({
  refSource,
  storedCount,
  onToggle,
  saving,
}: {
  refSource: RefSource;
  storedCount: number;
  onToggle: (next: RefSource) => void;
  saving: boolean;
}) {
  const isFH = refSource === "function_health";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 shrink-0">Reference ranges:</span>
        {isFH ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            Function Health optimal
            {storedCount > 0 && (
              <span className="font-normal text-violet-500 dark:text-violet-500">
                ({storedCount} stored from your uploads)
              </span>
            )}
          </span>
        ) : (
          <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Standard lab ranges</span>
        )}
      </div>
      <button
        onClick={() => onToggle(isFH ? "lab" : "function_health")}
        disabled={saving}
        className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline underline-offset-2 decoration-dotted transition-colors disabled:opacity-50 shrink-0"
      >
        {saving ? "Saving…" : `Switch to ${isFH ? "standard" : "Function Health"}`}
      </button>
    </div>
  );
}

// ─── Reference Ranges Editor Tab ──────────────────────────────────────────────

interface NewRangeForm {
  marker_name: string;
  optimal_min: string;
  optimal_max: string;
  unit: string;
  source: string;
}

const EMPTY_NEW: NewRangeForm = { marker_name: "", optimal_min: "", optimal_max: "", unit: "", source: "custom" };

function RangesTab({
  dbRanges,
  onRangesChange,
}: {
  dbRanges: Record<string, StoredRange>;
  onRangesChange: (updated: Record<string, StoredRange>) => void;
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<StoredRange>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRange, setNewRange] = useState<NewRangeForm>(EMPTY_NEW);
  const [addSaving, setAddSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const sorted = Object.values(dbRanges).sort((a, b) =>
    a.marker_name.localeCompare(b.marker_name)
  );
  const filtered = search.trim()
    ? sorted.filter((r) => r.marker_name.toLowerCase().includes(search.toLowerCase().trim()))
    : sorted;

  function startEdit(r: StoredRange) {
    setEditingId(r.id);
    setEditValues({
      optimal_min: r.optimal_min,
      optimal_max: r.optimal_max,
      unit: r.unit ?? "",
      source: r.source ?? "",
    });
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
    setRowError(null);
  }

  async function saveEdit(r: StoredRange) {
    setSavingId(r.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/bloodwork/reference-ranges/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ooptimal_min: editValues.optimal_min != null && String(editValues.optimal_min) !== "" ? Number(editValues.optimal_min) : null,
optimal_max: editValues.optimal_max != null && String(editValues.optimal_max) !== "" ? Number(editValues.optimal_max) : null,
          unit: editValues.unit || null,
          source: editValues.source || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setRowError(data.error ?? "Save failed"); return; }
      const updated = { ...dbRanges };
      updated[data.marker_name] = data as StoredRange;
      onRangesChange(updated);
      setEditingId(null);
    } catch {
      setRowError("Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRange(r: StoredRange) {
    if (!confirm(`Remove optimal range for "${r.marker_name}"? It will fall back to Function Health defaults.`)) return;
    setDeletingId(r.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/bloodwork/reference-ranges/${r.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) { setRowError("Delete failed"); return; }
      const updated = { ...dbRanges };
      delete updated[r.marker_name];
      onRangesChange(updated);
    } catch {
      setRowError("Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function addRange() {
    if (!newRange.marker_name.trim()) { setRowError("Marker name is required"); return; }
    setAddSaving(true);
    setRowError(null);
    try {
      const res = await fetch("/api/bloodwork/reference-ranges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marker_name: newRange.marker_name.trim(),
          optimal_min: newRange.optimal_min !== "" ? Number(newRange.optimal_min) : null,
          optimal_max: newRange.optimal_max !== "" ? Number(newRange.optimal_max) : null,
          unit: newRange.unit.trim() || null,
          source: newRange.source.trim() || "custom",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setRowError(data.error ?? "Add failed"); return; }
      const updated = { ...dbRanges };
      updated[(data as StoredRange).marker_name] = data as StoredRange;
      onRangesChange(updated);
      setNewRange(EMPTY_NEW);
      setShowAdd(false);
    } catch {
      setRowError("Add failed");
    } finally {
      setAddSaving(false);
    }
  }

  const inputCls = "w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-violet-500";
  const numInputCls = `${inputCls} w-20`;

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search markers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">✕</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">{filtered.length} / {sorted.length} ranges</span>
          <button
            onClick={() => { setShowAdd((s) => !s); setRowError(null); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add range
          </button>
        </div>
      </div>

      {rowError && (
        <p className="text-xs text-red-600 dark:text-red-400">{rowError}</p>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-900/10 p-4 space-y-3">
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">New reference range</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="col-span-2 sm:col-span-2">
              <label className="block text-[10px] text-neutral-500 mb-0.5">Marker name</label>
              <input type="text" placeholder="e.g. vitamin d" value={newRange.marker_name} onChange={(e) => setNewRange((p) => ({ ...p, marker_name: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-0.5">Optimal min</label>
              <input type="number" placeholder="–" value={newRange.optimal_min} onChange={(e) => setNewRange((p) => ({ ...p, optimal_min: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-0.5">Optimal max</label>
              <input type="number" placeholder="–" value={newRange.optimal_max} onChange={(e) => setNewRange((p) => ({ ...p, optimal_max: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-0.5">Unit</label>
              <input type="text" placeholder="ng/mL" value={newRange.unit} onChange={(e) => setNewRange((p) => ({ ...p, unit: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-40">
              <label className="block text-[10px] text-neutral-500 mb-0.5">Source</label>
              <input type="text" placeholder="custom" value={newRange.source} onChange={(e) => setNewRange((p) => ({ ...p, source: e.target.value }))} className={inputCls} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={addRange} disabled={addSaving} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors">
                {addSaving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setShowAdd(false); setNewRange(EMPTY_NEW); setRowError(null); }} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400 py-8 text-center">
          {sorted.length === 0 ? "No reference ranges stored yet. Upload a bloodwork report to populate them." : "No markers match your search."}
        </p>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400">Marker</th>
                <th className="text-left px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400">Min</th>
                <th className="text-left px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400">Max</th>
                <th className="text-left px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">Unit</th>
                <th className="text-left px-4 py-2.5 font-medium text-neutral-600 dark:text-neutral-400 hidden sm:table-cell">Source</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isEditing = editingId === r.id;
                const isSaving = savingId === r.id;
                const isDeleting = deletingId === r.id;

                return (
                  <tr key={r.id} className={`border-b border-neutral-100 dark:border-neutral-800 last:border-0 ${isEditing ? "bg-violet-50/30 dark:bg-violet-900/10" : ""}`}>
                    {/* Marker name — never editable (it's the key) */}
                    <td className="px-4 py-2.5 font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                      {r.marker_name}
                    </td>

                    {/* Min */}
                    <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 font-mono text-xs">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.optimal_min ?? ""}
                          onChange={(e) => setEditValues((p) => ({ ...p, optimal_min: e.target.value === "" ? null : Number(e.target.value) }))}
                          className={numInputCls}
                          placeholder="–"
                        />
                      ) : (
                        r.optimal_min != null ? r.optimal_min : <span className="text-neutral-400">–</span>
                      )}
                    </td>

                    {/* Max */}
                    <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300 font-mono text-xs">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.optimal_max ?? ""}
                          onChange={(e) => setEditValues((p) => ({ ...p, optimal_max: e.target.value === "" ? null : Number(e.target.value) }))}
                          className={numInputCls}
                          placeholder="–"
                        />
                      ) : (
                        r.optimal_max != null ? r.optimal_max : <span className="text-neutral-400">–</span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="px-4 py-2.5 text-neutral-500 dark:text-neutral-400 text-xs hidden sm:table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(editValues.unit ?? "")}
                          onChange={(e) => setEditValues((p) => ({ ...p, unit: e.target.value }))}
                          className={`${inputCls} w-20`}
                          placeholder="unit"
                        />
                      ) : (
                        r.unit || <span className="text-neutral-300 dark:text-neutral-600">–</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-4 py-2.5 text-xs hidden sm:table-cell">
                      {isEditing ? (
                        <input
                          type="text"
                          value={String(editValues.source ?? "")}
                          onChange={(e) => setEditValues((p) => ({ ...p, source: e.target.value }))}
                          className={`${inputCls} w-28`}
                          placeholder="source"
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                          {r.source || "–"}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 justify-end">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(r)}
                              disabled={isSaving}
                              className="px-2.5 py-1 rounded text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors"
                            >
                              {isSaving ? "…" : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="px-2.5 py-1 rounded text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(r)}
                              disabled={!!editingId || isDeleting}
                              className="px-2.5 py-1 rounded text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 disabled:opacity-40 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteRange(r)}
                              disabled={!!editingId || isDeleting}
                              className="px-2.5 py-1 rounded text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 transition-colors"
                            >
                              {isDeleting ? "…" : "Delete"}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BloodworkPage() {
  const [results, setResults] = useState<BloodworkResult[]>([]);
  const [selected, setSelected] = useState<BloodworkResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("latest");

  const [pending, setPending] = useState<PendingResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [refSource, setRefSource] = useState<RefSource>("function_health");
  const [prefSaving, setPrefSaving] = useState(false);
  const [dbRanges, setDbRanges] = useState<Record<string, StoredRange>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/bloodwork/results")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = sortByTestDate(data);
          setResults(sorted);
          if (sorted.length > 0) setSelected(sorted[0]);
        }
      })
      .catch(console.error);

    fetch("/api/user-preferences")
      .then((r) => r.json())
      .then((prefs) => {
        if (prefs.bloodwork_reference_source) {
          setRefSource(prefs.bloodwork_reference_source as RefSource);
        }
      })
      .catch(console.error);

    fetch("/api/bloodwork/reference-ranges")
      .then((r) => r.json())
      .then((data: StoredRange[]) => {
        if (Array.isArray(data)) {
          const map: Record<string, StoredRange> = {};
          for (const r of data) map[r.marker_name] = r;
          setDbRanges(map);
        }
      })
      .catch(console.error);
  }, []);

  async function handleToggleRefSource(next: RefSource) {
    setPrefSaving(true);
    setRefSource(next);
    try {
      await fetch("/api/user-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloodwork_reference_source: next }),
      });
    } catch {
      // Non-fatal
    } finally {
      setPrefSaving(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setPending(null);
    setSaveError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/bloodwork/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed.");
      } else {
        setPending(data as PendingResult);
        // Refresh stored ranges — upload may have added new ones
        fetch("/api/bloodwork/reference-ranges")
          .then((r) => r.json())
          .then((ranges: StoredRange[]) => {
            if (Array.isArray(ranges)) {
              const map: Record<string, StoredRange> = {};
              for (const r of ranges) map[r.marker_name] = r;
              setDbRanges(map);
            }
          })
          .catch(console.error);
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave(testDate: string | null, labName: string | null) {
    if (!pending) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/bloodwork/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markers: pending.markers,
          test_date: testDate,
          lab_name: labName,
          file_path: pending.file_path,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save.");
      } else {
        const updated = sortByTestDate([data as BloodworkResult, ...results]);
        setResults(updated);
        setSelected(updated[0]);
        setPending(null);
      }
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function discardPending() {
    setPending(null);
    setSaveError(null);
  }

  function onRangesChange(updated: Record<string, StoredRange>) {
    setDbRanges(updated);
  }

  const hasTrends = results.length >= 2;
  const newestResultId = results[0]?.id;
  const storedRangeCount = Object.keys(dbRanges).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Bloodwork</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Upload lab results — Claude extracts markers and stores reference ranges.
          </p>
        </div>
        <div className="shrink-0">
          <label
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
              uploading || !!pending
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed"
                : "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300"
            }`}
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
                </svg>
                Upload Lab Results
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" className="hidden" disabled={uploading || !!pending} onChange={handleUpload} />
          </label>
          <p className="text-xs text-neutral-400 mt-1 text-right">PDF, JPG, PNG, WEBP</p>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {uploadError}
        </div>
      )}

      {pending && (
        <>
          <ConfirmPanel pending={pending} onSave={handleSave} onDiscard={discardPending} saving={saving} />
          {saveError && <p className="text-xs text-red-600 dark:text-red-400">{saveError}</p>}
        </>
      )}

      {results.length === 0 && !uploading && !pending && (
        <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center">
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">No bloodwork uploaded yet.</p>
          <p className="text-neutral-400 dark:text-neutral-600 text-xs mt-1">Upload a PDF or image of your lab results to get started.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <ReferenceRangeBar refSource={refSource} storedCount={storedRangeCount} onToggle={handleToggleRefSource} saving={prefSaving} />

          {/* Tab bar — always visible when results exist */}
          <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("latest")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "latest" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
            >
              Latest
            </button>
            <button
              onClick={() => setActiveTab("trends")}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "trends" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
            >
              Trends
            </button>
            <button
              onClick={() => setActiveTab("ranges")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "ranges" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"}`}
            >
              Ranges
              {storedRangeCount > 0 && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${activeTab === "ranges" ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300" : "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"}`}>
                  {storedRangeCount}
                </span>
              )}
            </button>
          </div>

          {activeTab === "latest" && (
            <>
              {results.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected?.id === r.id
                          ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent"
                          : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
                      }`}
                    >
                      {r.id === newestResultId && (
                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${selected?.id === r.id ? "bg-white dark:bg-neutral-900" : "bg-emerald-500"}`} />
                      )}
                      {r.id === newestResultId
                        ? "Current"
                        : r.test_date
                          ? new Date(r.test_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {r.lab_name && r.id !== newestResultId ? ` — ${r.lab_name}` : ""}
                      {!r.test_date && r.id !== newestResultId && <span className="ml-1 opacity-60">(no test date)</span>}
                    </button>
                  ))}
                </div>
              )}

              {selected && (
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {selected.lab_name || "Lab Results"}
                        </h2>
                        {selected.id === newestResultId && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Current</span>
                        )}
                      </div>
                      {selected.test_date ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {new Date(selected.test_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          {results.length > 1 && selected.id !== newestResultId && (
                            <span className="ml-2 text-neutral-400">
                              — compared to your{" "}
                              {results[0].test_date
                                ? new Date(results[0].test_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })
                                : "latest"}{" "}
                              baseline
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No test date recorded</p>
                      )}
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        {refSource === "function_health"
                          ? storedRangeCount > 0
                            ? `Function Health optimal ranges — ${storedRangeCount} stored from your uploads, rest from FH defaults`
                            : "Assessed against Function Health optimal ranges"
                          : "Assessed against standard lab ranges"}
                      </p>
                    </div>
                    <div className="flex gap-3 text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                      <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Normal</span>
                      {refSource === "function_health" && (
                        <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" />Sub-opt</span>
                      )}
                      <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />High</span>
                    </div>
                  </div>

                  {selected.markers.length === 0 ? (
                    <p className="text-sm text-neutral-400">No markers extracted from this file.</p>
                  ) : (
                    <MarkerTable markers={selected.markers} refSource={refSource} dbRanges={dbRanges} />
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === "trends" && (
            hasTrends
              ? <TrendSection results={results} refSource={refSource} dbRanges={dbRanges} />
              : <p className="text-sm text-neutral-400 py-6">Upload a second bloodwork report to see trends across tests.</p>
          )}

          {activeTab === "ranges" && (
            <RangesTab dbRanges={dbRanges} onRangesChange={onRangesChange} />
          )}
        </div>
      )}
    </div>
  );
}
