import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "MAYA — Personal Operating System",
  description: "Your Human Design-aligned personal OS",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MAYA",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css" />
        <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css" />
        <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/duotone/style.css" />
        <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/bold/style.css" />
      </head>
      <body style={{ margin: 0, background: "#060707", color: "#eef0ee", fontFamily: "'Sora', system-ui, sans-serif" }}>
        <Providers>
          <div style={{ minHeight: "100vh", display: "flex", background: "#060707" }}>
            <Sidebar />
            <main style={{ flex: 1, minWidth: 0, position: "relative", overflow: "hidden" }} className="pb-20 md:pb-0">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
            <BottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
