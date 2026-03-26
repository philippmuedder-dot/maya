"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

const navItems = [
  { href: "/", label: "Morning Briefing", icon: "☀️" },
  { href: "/health", label: "Health", icon: "💓" },
  { href: "/bloodwork", label: "Bloodwork", icon: "🩸" },
  { href: "/supplements", label: "Supplements", icon: "💊" },
  { href: "/wellbeing", label: "Wellbeing", icon: "🏋️" },
  { href: "/sleep", label: "Sleep", icon: "🌙" },
  { href: "/energy", label: "Energy", icon: "⚡" },
  { href: "/flow", label: "Flow", icon: "🌊" },
  { href: "/decisions", label: "Decisions", icon: "🎯" },
  { href: "/chat", label: "AI Coach", icon: "🤖" },
  { href: "/weekly", label: "Weekly Review", icon: "📅" },
  { href: "/genetics", label: "Genetics", icon: "🧬" },
  { href: "/memory", label: "Memory", icon: "🧠" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 hidden md:flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <h1 className="text-xl font-bold tracking-tight">MAYA</h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          Personal Operating System
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User / Auth */}
      <div className="px-4 py-4 border-t border-neutral-200 dark:border-neutral-800">
        {session ? (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {session.user?.email}
            </p>
            <button
              onClick={() => signOut()}
              className="w-full text-left text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => signIn("google")}
            className="w-full px-3 py-2 text-sm bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:opacity-90 transition-opacity"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}
