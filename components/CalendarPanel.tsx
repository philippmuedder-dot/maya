"use client";

import { useEffect, useState } from "react";
import {
  CalendarEvent,
  CalendarResponse,
  classifyCalendarLoad,
  getTodayEvents,
  groupEventsByDay,
  formatEventTime,
} from "@/lib/googleCalendar";

function EventRow({ event }: { event: CalendarEvent }) {
  const time = formatEventTime(event);
  if (event.isBusy) {
    return (
      <div className="flex gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
        <span className="text-xs text-neutral-400 dark:text-neutral-500 w-16 shrink-0 pt-0.5">
          {time}
        </span>
        <p className="text-sm text-neutral-400 dark:text-neutral-600 italic truncate">
          Busy (work)
        </p>
      </div>
    );
  }
  return (
    <div className="flex gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <span className="text-xs text-neutral-400 dark:text-neutral-500 w-16 shrink-0 pt-0.5">
        {time}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {event.summary ?? "(No title)"}
        </p>
        {event.location && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
            {event.location}
          </p>
        )}
      </div>
    </div>
  );
}

export function CalendarPanel() {
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((d: CalendarResponse) => {
        if (d.error) {
          setError(d.error === "Unauthorized" ? "Sign in to see your calendar." : d.error);
        } else {
          setData(d);
        }
      })
      .catch(() => setError("Failed to load calendar."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <div className="h-4 w-32 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse mb-2" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          Today&apos;s Calendar
        </h2>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const todayEvents = getTodayEvents(data.events);
  const load = classifyCalendarLoad(data.events);
  const grouped = groupEventsByDay(data.events);
  const days = Object.keys(grouped).slice(0, 7);

  // Upcoming = everything after today
  const upcomingDays = days.filter((d) => {
    const date = new Date(d);
    const today = new Date();
    return date.toDateString() !== today.toDateString();
  });

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Today&apos;s Calendar
        </h2>
        <span className={`text-xs font-medium ${load.color}`}>
          {load.label} load · {todayEvents.length} event{todayEvents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Today */}
      <div className="px-5 py-3">
        {todayEvents.length === 0 ? (
          <p className="text-sm text-neutral-400 dark:text-neutral-500 py-2">
            No events today — good space for deep work.
          </p>
        ) : (
          todayEvents.map((e) => <EventRow key={e.id} event={e} />)
        )}
      </div>

      {/* Upcoming days */}
      {upcomingDays.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-neutral-800">
          <details className="group">
            <summary className="px-5 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 list-none flex items-center gap-1">
              <span className="group-open:rotate-90 inline-block transition-transform">›</span>
              Next 7 days ({data.events.length - todayEvents.length} events)
            </summary>
            <div className="px-5 pb-4 space-y-4">
              {upcomingDays.map((dayStr) => (
                <div key={dayStr}>
                  <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 mb-1 uppercase tracking-wide">
                    {new Date(dayStr).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  {grouped[dayStr].map((e) => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
