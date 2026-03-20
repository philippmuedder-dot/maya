import type { Metadata } from "next";

export const metadata: Metadata = { title: "MAYA — Sleep" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
