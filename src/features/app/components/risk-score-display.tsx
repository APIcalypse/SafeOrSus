"use client";

import { cn } from "@neynar/ui";
import type { RiskLevel, ScoreResult } from "@/features/app/types";

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; color: string; bgColor: string; borderColor: string; emoji: string }
> = {
  safe: {
    label: "SAFE",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/40",
    emoji: "✅",
  },
  low: {
    label: "LOW RISK",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/40",
    emoji: "🟡",
  },
  medium: {
    label: "MODERATE",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/40",
    emoji: "🟠",
  },
  high: {
    label: "HIGH RISK",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/40",
    emoji: "🔴",
  },
  critical: {
    label: "CRITICAL",
    color: "text-red-400",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/60",
    emoji: "🚨",
  },
};

interface RiskScoreDisplayProps {
  score: ScoreResult;
}

export function RiskScoreDisplay({ score }: RiskScoreDisplayProps) {
  const config = RISK_CONFIG[score.riskLevel];
  const percentage = score.score;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        config.bgColor,
        config.borderColor,
      )}
    >
      {/* Score circle + label */}
      <div className="flex items-center gap-4 mb-4">
        {/* Circular score */}
        <div className="relative flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            {/* Track */}
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke={
                score.riskLevel === "safe"
                  ? "#10b981"
                  : score.riskLevel === "low"
                    ? "#eab308"
                    : score.riskLevel === "medium"
                      ? "#f97316"
                      : "#ef4444"
              }
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(percentage / 100) * 213.6} 213.6`}
              transform="rotate(-90 40 40)"
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-xl font-bold leading-none", config.color)}>
              {percentage}
            </span>
            <span className="text-gray-500 text-[10px] leading-none mt-0.5">/100</span>
          </div>
        </div>

        {/* Risk level label */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{config.emoji}</span>
            <span className={cn("text-lg font-bold tracking-wider", config.color)}>
              {config.label}
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Risk Score: <span className="text-white font-medium">{percentage}</span> / 100
          </p>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            score.riskLevel === "safe"
              ? "bg-emerald-500"
              : score.riskLevel === "low"
                ? "bg-yellow-500"
                : score.riskLevel === "medium"
                  ? "bg-orange-500"
                  : "bg-red-500",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Active risk signals */}
      {score.signals.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
            Risk Signals Detected
          </p>
          {score.signals.map((signal, i) => (
            <div
              key={i}
              className="text-sm text-gray-300 bg-white/5 rounded-lg px-3 py-2"
            >
              {signal}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
