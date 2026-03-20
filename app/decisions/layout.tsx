import type { Metadata } from "next";

export const metadata: Metadata = { title: "MAYA — Decisions" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
