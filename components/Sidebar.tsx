"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const navGroups = [
  {
    label: "Today",
    items: [{ href: "/", label: "Morning Briefing", icon: "ph-sun" }],
  },
  {
    label: "Body",
    items: [
      { href: "/health", label: "Health", icon: "ph-heartbeat" },
      { href: "/sleep", label: "Sleep", icon: "ph-moon" },
      { href: "/bloodwork", label: "Bloodwork", icon: "ph-drop" },
      { href: "/supplements", label: "Supplements", icon: "ph-pill" },
      { href: "/wellbeing", label: "Wellbeing", icon: "ph-barbell" },
      { href: "/meals", label: "Meals", icon: "ph-fork-knife" },
    ],
  },
  {
    label: "Mind",
    items: [
      { href: "/energy", label: "Energy", icon: "ph-lightning" },
      { href: "/flow", label: "Flow", icon: "ph-flow-arrow" },
      { href: "/decisions", label: "Decisions", icon: "ph-scales" },
      { href: "/memory", label: "Memory", icon: "ph-brain" },
    ],
  },
  {
    label: "Life",
    items: [
      { href: "/wealth", label: "Wealth", icon: "ph-wallet", soon: true },
      { href: "/weekly", label: "Weekly Review", icon: "ph-calendar-blank" },
      { href: "/genetics", label: "Genetics", icon: "ph-dna" },
    ],
  },
  {
    label: "Coach",
    items: [{ href: "/chat", label: "AI Coach", icon: "ph-chat-circle" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const email = session?.user?.email ?? "philipp@maya.os";
  const name = session?.user?.name?.split(" ")[0] ?? "Philipp";
  const initial = name[0].toUpperCase();

  return (
    <aside
      className="hidden md:flex"
      style={{
        width: 252,
        flex: "none",
        background: "#0a0b0b",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        flexDirection: "column",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "22px 22px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, #4fd99a, #176b4a)", boxShadow: "0 0 16px rgba(79,217,154,0.5)", flex: "none" }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "0.5px" }}>MAYA</div>
          <div style={{ ...MONO, fontSize: 9, letterSpacing: "1.5px", color: "#5e645e", textTransform: "uppercase", marginTop: 1 }}>Personal OS</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 16 }}>
        {navGroups.map((group) => (
          <div key={group.label}>
            <div style={{ ...MONO, fontSize: 8.5, letterSpacing: "1.5px", color: "#4d524d", textTransform: "uppercase", padding: "0 10px 7px" }}>
              {group.label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {group.items.map(({ href, label, icon, soon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "9px 11px",
                      borderRadius: 10,
                      textDecoration: "none",
                      fontSize: 13.5,
                      fontWeight: isActive ? 500 : 400,
                      color: isActive ? "#eef0ee" : "#a2a8a2",
                      background: isActive ? "rgba(79,217,154,0.1)" : "transparent",
                      borderLeft: isActive ? "2px solid #4fd99a" : "2px solid transparent",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                        (e.currentTarget as HTMLElement).style.color = "#eef0ee";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#a2a8a2";
                      }
                    }}
                  >
                    <i
                      className={isActive ? `ph-fill ${icon}` : `ph ${icon}`}
                      style={{ fontSize: 18, color: isActive ? "#4fd99a" : "#7d837d" }}
                    />
                    {label}
                    {soon && (
                      <span style={{ ...MONO, marginLeft: "auto", fontSize: 8, letterSpacing: "1px", color: "#4fd99a", background: "rgba(79,217,154,0.12)", padding: "2px 6px", borderRadius: 5 }}>
                        SOON
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 2 }}>
        <Link
          href="/settings"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 11px", borderRadius: 10, textDecoration: "none", color: "#a2a8a2", fontSize: 13.5 }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLElement).style.color = "#eef0ee";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#a2a8a2";
          }}
        >
          <i className="ph ph-gear-six" style={{ fontSize: 18, color: "#7d837d" }} />
          Settings
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 11px", marginTop: 4 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #2a2c2c, #16201b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#9fb8ac", flex: "none" }}>
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: "#cdd2cd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
            <div style={{ ...MONO, fontSize: 10, color: "#5e645e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
