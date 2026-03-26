import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MAYA — Genetics",
};

export default function GeneticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
