import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MAYA — Memory",
};

export default function MemoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
