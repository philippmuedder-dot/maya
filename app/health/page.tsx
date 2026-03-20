import type { Metadata } from "next";
import { WhoopPanel } from "@/components/WhoopPanel";

export const metadata: Metadata = { title: "MAYA — Health" };
import { AppleHealthPanel } from "@/components/AppleHealthPanel";

export default function HealthPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Health
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Recovery, HRV, and body data.
        </p>
      </div>

      <WhoopPanel />
      <AppleHealthPanel />
    </div>
  );
}
