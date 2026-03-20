"use client";

import { useEffect, useState } from "react";

interface Alert {
  type: string;
  message: string;
  severity: "warning" | "critical";
}

export default function ProactiveAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Alert[]) => setAlerts(data))
      .catch(() => {});
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.type));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <div
          key={alert.type}
          className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
            alert.severity === "critical"
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
          }`}
        >
          <span className="text-base mt-0.5">
            {alert.severity === "critical" ? "🚨" : "⚠️"}
          </span>
          <p className="flex-1">{alert.message}</p>
          <button
            onClick={() =>
              setDismissed((prev) => new Set(prev).add(alert.type))
            }
            className="text-xs opacity-60 hover:opacity-100 transition-opacity shrink-0"
          >
            dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
