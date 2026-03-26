"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

const mainTabs = [
  {
    href: "/",
    label: "Home",
    icon: (a: boolean) => (
      <svg className="w-6 h-6" fill={a ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
        {a ? (
          <path d="M11.47 3.841a.75.75 0 011.06 0l8.69 8.69a.75.75 0 01-.53 1.28h-1.44v7.44a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5h-3v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-7.44H3.31a.75.75 0 01-.53-1.28l8.69-8.69z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        )}
      </svg>
    ),
  },
  {
    href: "/health",
    label: "Health",
    icon: (a: boolean) => (
      <svg className="w-6 h-6" fill={a ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
        {a ? (
          <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        )}
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "Coach",
    icon: (a: boolean) => (
      <svg className="w-6 h-6" fill={a ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
        {a ? (
          <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        )}
      </svg>
    ),
  },
  {
    href: "/weekly",
    label: "Weekly",
    icon: (a: boolean) => (
      <svg className="w-6 h-6" fill={a ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={a ? 0 : 1.5}>
        {a ? (
          <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        )}
      </svg>
    ),
  },
];

const morePages = [
  { href: "/bloodwork", label: "Bloodwork", emoji: "\u{1F9EA}" },
  { href: "/supplements", label: "Supplements", emoji: "\u{1F48A}" },
  { href: "/wellbeing", label: "Wellbeing", emoji: "\u{1F9D8}" },
  { href: "/sleep", label: "Sleep", emoji: "\u{1F634}" },
  { href: "/energy", label: "Energy", emoji: "\u{26A1}" },
  { href: "/flow", label: "Flow", emoji: "\u{1F30A}" },
  { href: "/decisions", label: "Decisions", emoji: "\u{1F9ED}" },
  { href: "/genetics", label: "Genetics", emoji: "\u{1F9EC}" },
  { href: "/memory", label: "Memory", emoji: "\u{1F9E0}" },
  { href: "/settings", label: "Settings", emoji: "\u{2699}\u{FE0F}" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const moreIsActive = morePages.some((p) =>
    p.href === "/" ? pathname === "/" : pathname.startsWith(p.href)
  );

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Slide-up drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="bg-white dark:bg-neutral-900 rounded-t-2xl shadow-xl border-t border-neutral-200 dark:border-neutral-800">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          </div>

          {/* Grid of pages */}
          <div className="grid grid-cols-4 gap-1 px-4 pb-4">
            {morePages.map(({ href, label, emoji }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeDrawer}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-colors ${
                    active
                      ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 dark:text-neutral-400 active:bg-neutral-100 dark:active:bg-neutral-800"
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[11px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-lg border-t border-neutral-200 dark:border-neutral-800 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {mainTabs.map(({ href, label, icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center min-h-[52px] gap-0.5 flex-1 transition-colors ${
                  active
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {icon(active)}
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className={`flex flex-col items-center justify-center min-h-[52px] gap-0.5 flex-1 transition-colors ${
              moreIsActive || drawerOpen
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
