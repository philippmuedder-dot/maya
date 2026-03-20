"use client";

import { useEffect, useRef, useState } from "react";

interface DayData {
  date: string;
  steps: number | null;
  resting_hr: number | null;
  hrv: number | null;
}

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function parseAppleHealthXML(xmlText: string): DayData[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const records = Array.from(doc.querySelectorAll("Record"));

  const TYPES = {
    steps: "HKQuantityTypeIdentifierStepCount",
    resting_hr: "HKQuantityTypeIdentifierRestingHeartRate",
    hrv: "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const byDay: Record<string, { steps: number[]; resting_hr: number[]; hrv: number[] }> = {};

  for (const rec of records) {
    const type = rec.getAttribute("type") ?? "";
    const startDate = rec.getAttribute("startDate") ?? "";
    const value = parseFloat(rec.getAttribute("value") ?? "NaN");
    if (isNaN(value) || !startDate) continue;

    const date = startDate.slice(0, 10);
    if (new Date(date) < cutoff) continue;

    if (!byDay[date]) byDay[date] = { steps: [], resting_hr: [], hrv: [] };

    if (type === TYPES.steps) byDay[date].steps.push(value);
    else if (type === TYPES.resting_hr) byDay[date].resting_hr.push(value);
    else if (type === TYPES.hrv) byDay[date].hrv.push(value);
  }

  return Object.entries(byDay)
    .map(([date, d]) => ({
      date,
      steps: d.steps.length ? Math.round(d.steps.reduce((a, b) => a + b, 0)) : null,
      resting_hr: avg(d.resting_hr),
      hrv: avg(d.hrv),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function StatCard({ label, value, unit }: { label: string; value: string | null; unit?: string }) {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4">
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</p>
      {value !== null ? (
        <p className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {value}
          {unit && <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400 ml-1">{unit}</span>}
        </p>
      ) : (
        <p className="text-sm text-neutral-400 dark:text-neutral-600">—</p>
      )}
    </div>
  );
}

export function AppleHealthPanel() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/apple-health/data")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadMsg(null);

    try {
      const text = await file.text();
      const days = parseAppleHealthXML(text);

      if (days.length === 0) {
        setUploadError("No health records found in the last 30 days.");
        return;
      }

      const res = await fetch("/api/apple-health/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const result = await res.json();

      if (!res.ok) {
        setUploadError(result.error ?? "Upload failed.");
      } else {
        setUploadMsg(`Saved ${result.saved} days of data.`);
        // Refresh
        const fresh = await fetch("/api/apple-health/data").then((r) => r.json());
        if (Array.isArray(fresh)) setData(fresh);
      }
    } catch {
      setUploadError("Failed to parse file. Make sure it's a valid Apple Health export.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Compute 7-day averages from the most recent 7 days with data
  const recent7 = data.slice(0, 7);
  const avgSteps = avg(recent7.map((d) => d.steps));
  const avgHR = avg(recent7.map((d) => d.resting_hr));
  const avgHRV = avg(recent7.map((d) => d.hrv));

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Apple Health</h2>
          {data.length > 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">7-day averages</p>
          )}
        </div>
        <label
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
            uploading
              ? "border-neutral-200 dark:border-neutral-700 text-neutral-400 cursor-not-allowed"
              : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500"
          }`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Parsing…
            </>
          ) : (
            <>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m-4-4l4 4 4-4" />
              </svg>
              Upload Export
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xml"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      </div>

      {uploadError && (
        <p className="text-xs text-red-600 dark:text-red-400 mb-3">{uploadError}</p>
      )}
      {uploadMsg && (
        <p className="text-xs text-green-600 dark:text-green-400 mb-3">{uploadMsg}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No data yet.</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-600 mt-1">
            Export from iPhone: Health app → your profile → Export All Health Data → upload the XML file.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Avg Steps"
            value={avgSteps !== null ? avgSteps.toLocaleString() : null}
            unit="/ day"
          />
          <StatCard
            label="Resting HR"
            value={avgHR !== null ? String(avgHR) : null}
            unit="bpm"
          />
          <StatCard
            label="HRV"
            value={avgHRV !== null ? String(avgHRV) : null}
            unit="ms"
          />
        </div>
      )}
    </div>
  );
}
