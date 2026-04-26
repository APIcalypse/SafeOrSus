"use client";

import { cn } from "@neynar/ui";
import { RiskScoreDisplay } from "@/features/app/components/risk-score-display";
import { ShareButton } from "@/neynar-farcaster-sdk/mini";
import type { AnalysisResult } from "@/features/app/types";

interface AnalysisResultCardProps {
  result: AnalysisResult;
  onReset: () => void;
}

function buildShareText(score: number, riskLevel: string): string {
  if (riskLevel === "safe" || riskLevel === "low") {
    return `My og wallet is safe on SafeOrSus...phew...\n\n🛡 Risk score: ${score}/100`;
  }
  if (riskLevel === "medium") {
    return `Just scanned my wallet on SafeOrSus 👀\n\n🛡 Risk score: ${score}/100`;
  }
  return `Scanned a sus wallet on SafeOrSus 🚨\n\n🛡 Risk score: ${score}/100`;
}

export function AnalysisResultCard({ result, onReset }: AnalysisResultCardProps) {
  const { wallet, ens, etherscan, social, scamSniffer, score, summary, inputQuery } = result;

  const shortWallet = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  const displayName = ens?.ensName ?? shortWallet;
  // Use ENS name if available, otherwise truncated address — for share image
  const walletDisplay = ens?.ensName ?? shortWallet;

  const shareText = buildShareText(score.score, score.riskLevel);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-0.5">
            Analysis Result
          </p>
          <div className="flex items-center gap-2">
            {ens?.ensName && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                <span>✦</span>
                {ens.ensName}
              </span>
            )}
            <p className="font-mono text-sm text-gray-400">{shortWallet}</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/5 transition-all"
        >
          ← New Search
        </button>
      </div>

      {/* Risk Score */}
      <RiskScoreDisplay score={score} />

      {/* ScamSniffer blocklist */}
      <div
        className={cn(
          "rounded-2xl border p-3 flex items-center gap-3",
          !scamSniffer.checked
            ? "border-white/5 bg-white/2"
            : scamSniffer.isBlocked
              ? "bg-red-500/10 border-red-500/40"
              : "bg-emerald-500/8 border-emerald-500/25",
        )}
      >
        <span className="text-xl shrink-0">
          {!scamSniffer.checked ? "🔍" : scamSniffer.isBlocked ? "🚫" : "✅"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                !scamSniffer.checked
                  ? "text-gray-600"
                  : scamSniffer.isBlocked
                    ? "text-red-400"
                    : "text-emerald-400",
              )}
            >
              ScamSniffer
            </p>
            {scamSniffer.checked && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/5">
                {scamSniffer.source === "api" ? "Live API" : "DB ~7d lag"}
              </span>
            )}
          </div>
          <p className={cn("text-xs mt-0.5", !scamSniffer.checked ? "text-gray-600" : "text-gray-300")}>
            {!scamSniffer.checked
              ? "Blocklist check unavailable"
              : scamSniffer.isBlocked
                ? "BLOCKED — Known malicious address on ScamSniffer's list"
                : "PASSED — Not found on ScamSniffer's blocklist"}
          </p>
        </div>
        {scamSniffer.checked && (
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-full shrink-0",
              scamSniffer.isBlocked
                ? "bg-red-500/20 text-red-300"
                : "bg-emerald-500/15 text-emerald-300",
            )}
          >
            {scamSniffer.status}
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2">
          Summary
        </p>
        <p className="text-sm text-gray-200 leading-relaxed">{summary}</p>
      </div>

      {/* Data grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Etherscan data */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
            Etherscan
          </p>
          <div className="space-y-2">
            <DataRow
              label="Label"
              value={etherscan.label ?? "None"}
              muted={!etherscan.label}
            />
            <DataRow
              label="Contract"
              value={etherscan.isContract ? "Yes" : "No"}
              highlight={etherscan.isContract ?? false}
            />
            {etherscan.isContract && (
              <DataRow
                label="Verified"
                value={etherscan.isVerified ? "Yes" : "No"}
                highlight={etherscan.isVerified ?? false}
                highlightColor={etherscan.isVerified ? "emerald" : "red"}
              />
            )}
          </div>
        </div>

        {/* Farcaster data */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
            Farcaster
          </p>
          <div className="space-y-2">
            {social.fid ? (
              <>
                <DataRow label="User" value={`@${social.username ?? "unknown"}`} />
                <DataRow
                  label="Followers"
                  value={(social.followerCount ?? 0).toLocaleString()}
                />
                <DataRow
                  label="Trusted"
                  value={social.hasPowerBadge ? "✓ Yes" : "No"}
                  highlight={social.hasPowerBadge}
                  highlightColor="emerald"
                />
              </>
            ) : (
              <p className="text-xs text-gray-500 italic">No identity found</p>
            )}
          </div>
        </div>
      </div>

      {/* X / Twitter row — only shown if linked */}
      {social.xUsername && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
              X / Twitter
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">
              ✓ Linked via Farcaster
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <DataRow label="Handle" value={`@${social.xUsername}`} />
              {social.neynarScore != null && (
                <DataRow
                  label="Trust Score"
                  value={`${Math.round(social.neynarScore * 100)} / 100`}
                  highlight={social.neynarScore >= 0.8}
                  highlightColor="emerald"
                />
              )}
            </div>
            <a
              href={`https://x.com/${social.xUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-4 shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              View
            </a>
          </div>
        </div>
      )}

      {/* Full wallet address + ENS info */}
      <div className="rounded-xl border border-white/5 bg-white/2 px-4 py-3 space-y-1.5">
        {ens?.ensName && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">ENS Name</p>
            <p className="text-xs text-purple-300 font-medium">{ens.ensName}</p>
          </div>
        )}
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-gray-600 shrink-0">Address</p>
          <p className="font-mono text-xs text-gray-400 break-all text-right">{wallet}</p>
        </div>
      </div>

      {/* Share button */}
      {/* path deep-links to results using original input (ENS or 0x address) */}
      {/* queryParams feed the share image renderer */}
      <ShareButton
        text={shareText}
        path={`/?wallet=${encodeURIComponent(inputQuery ?? wallet)}`}
        queryParams={{
          score: score.score.toString(),
          riskLevel: score.riskLevel,
          wallet: walletDisplay,
        }}
        className="w-full"
      >
        <span className="flex items-center justify-center gap-2 w-full py-0.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share My Score
        </span>
      </ShareButton>
    </div>
  );
}

function DataRow({
  label,
  value,
  muted = false,
  highlight = false,
  highlightColor = "emerald",
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
  highlightColor?: "emerald" | "red";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-600 uppercase tracking-wide">{label}</span>
      <span
        className={cn(
          "text-xs font-medium",
          muted
            ? "text-gray-600 italic"
            : highlight
              ? highlightColor === "emerald"
                ? "text-emerald-400"
                : "text-red-400"
              : "text-gray-200",
        )}
      >
        {value}
      </span>
    </div>
  );
}
