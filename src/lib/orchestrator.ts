// ============================================================
// SafeOrSus — Orchestrator (Main Agent Brain)
// ============================================================
// Coordinates all sub-agents, merges data, computes score,
// generates summary, and returns a structured AnalysisResult.
//
// This is the ONLY entry point for analysis logic.
// ============================================================

import { resolveEns, isEnsName, isEthAddress } from "@/lib/agents/ens-agent";
import { runEtherscanAgent } from "@/lib/agents/etherscan-agent";
import { runNeynarAgent } from "@/lib/agents/neynar-agent";
import { runScamSnifferAgent } from "@/lib/agents/scamsniffer-agent";
import { mergeReports } from "@/lib/agents/report-merger";
import { runScoreAgent } from "@/lib/agents/score-agent";
import { generateSummary } from "@/lib/agents/summary-agent";
import type { AnalysisResult, EnsResult, ScamSnifferResult } from "@/features/app/types";

// Accepts either a 0x address or an ENS name
export function isValidInput(input: string): boolean {
  return isEthAddress(input) || isEnsName(input);
}

// Keep backward compat alias
export function isValidWalletAddress(addr: string): boolean {
  return isEthAddress(addr);
}

export async function orchestrateAnalysis(input: string): Promise<AnalysisResult> {
  const trimmed = input.trim();

  if (!isValidInput(trimmed)) {
    throw new Error(
      "Invalid input. Enter a valid Ethereum address (0x...) or ENS name (e.g. vitalik.eth).",
    );
  }

  // Step 0: Resolve ENS name → address if needed
  const ensResult = await resolveEns(trimmed);

  if (!ensResult.address) {
    throw new Error(
      ensResult.error ??
        `Could not resolve "${trimmed}" to an Ethereum address.`,
    );
  }

  const wallet = ensResult.address;

  const ens: EnsResult = {
    address: ensResult.address,
    ensName: ensResult.ensName,
    wasResolved: ensResult.wasResolved,
    error: ensResult.error,
  };

  // Step 1: Run all data collection agents in parallel
  const [etherscanResult, neynarResult, scamSnifferResult] = await Promise.allSettled([
    runEtherscanAgent(wallet),
    runNeynarAgent(wallet),
    runScamSnifferAgent(wallet),
  ]);

  const etherscan =
    etherscanResult.status === "fulfilled"
      ? etherscanResult.value
      : {
          label: null,
          slug: null,
          isContract: null,
          isVerified: null,
          hasDrainerPattern: false,
          hasTornadoInteraction: false,
          hasMixerPattern: false,
          hasScamTokens: false,
          deployedByUnverified: false,
          txCount: 0,
          ethBalance: 0,
          error: "Agent failed",
        };

  const social =
    neynarResult.status === "fulfilled"
      ? neynarResult.value
      : {
          fid: null,
          username: null,
          displayName: null,
          followerCount: null,
          followingCount: null,
          verifiedAddresses: [],
          activeStatus: "unknown" as const,
          hasPowerBadge: false,
          xUsername: null,
          neynarScore: null,
          error: "Agent failed",
        };

  const scamSniffer: ScamSnifferResult =
    scamSnifferResult.status === "fulfilled"
      ? scamSnifferResult.value
      : { checked: false, isBlocked: false, status: "UNKNOWN", source: "none", error: "Agent failed" };

  // Step 2: Merge raw data into normalized signals
  const signals = mergeReports(etherscan, social, wallet, scamSniffer);

  // Step 3: Compute deterministic risk score
  const score = runScoreAgent(signals);

  // Step 4: Generate human-readable summary (Groq LLM, with template fallback)
  const partialResult = { wallet, inputQuery: trimmed, ens, etherscan, social, scamSniffer, signals, score };
  const summary = await generateSummary(partialResult);

  return {
    wallet,
    inputQuery: trimmed,
    ens,
    etherscan,
    social,
    scamSniffer,
    signals,
    score,
    summary,
    analyzedAt: new Date().toISOString(),
  };
}
