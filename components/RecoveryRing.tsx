"use client";

import { recoveryColor } from "@/lib/whoop";

interface RecoveryRingProps {
  score: number;
  /** "sm" = 64×64 ring (wellbeing page inline use); "lg" = 96×96 (health panel). Default: "lg" */
  size?: "sm" | "lg";
  /** Whether to render the score percentage centred inside the ring. Default: true */
  showScore?: boolean;
}

export function RecoveryRing({ score, size = "lg", showScore = true }: RecoveryRingProps) {
  const isLg = size === "lg";
  const dim = isLg ? 96 : 64;
  const cx = dim / 2;
  const radius = isLg ? 36 : 28;
  const strokeWidth = isLg ? 8 : 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${
        isLg ? "w-24 h-24" : "w-16 h-16"
      }`}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-neutral-200 dark:text-neutral-800"
        />
        {/* Progress — uses text-* class so stroke="currentColor" picks it up correctly */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          stroke="currentColor"
          className={`transition-all duration-700 ${recoveryColor(score)}`}
        />
      </svg>

      {showScore && (
        <span
          className={`absolute font-bold text-neutral-900 dark:text-neutral-100 ${
            isLg ? "text-2xl" : "text-sm"
          }`}
        >
          {score}%
        </span>
      )}
    </div>
  );
}
