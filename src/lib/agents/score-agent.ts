// ============================================================
// SafeOrSus — Score Agent (Pure Deterministic Rule Engine)
// ============================================================
// Converts normalized WalletSignals into a 0–100 risk score.
// Higher score = riskier.
//
// FULLY DETERMINISTIC — no LLM, no randomness.
// ============================================================

import type { WalletSignals, ScoreResult, RiskLevel } from "@/features/app/types";

interface ScoringRule {
  condition: (s: WalletSignals) => boolean;
  weight: number;
  signal: string;
}

const SCORING_RULES: ScoringRule[] = [
  // ── Critical risk factors ────────────────────────────────────────────────
  {
    condition: (s) => s.isScamSnifferBlocked,
    weight: 60,
    signal: "🚫 Blocked by ScamSniffer — known malicious address",
  },
  {
    condition: (s) => s.hasPhishingLabel,
    weight: 55,
    signal: "⚠️ Flagged as phishing/hack address on Etherscan",
  },
  {
    condition: (s) => s.hasMixerLabel,
    weight: 40,
    signal: "🔀 Associated with a known mixer/tumbler",
  },

  // ── Behavioural risk factors (from transaction analysis) ─────────────────
  {
    condition: (s) => s.hasDrainerPattern,
    weight: 55,
    signal: "🚨 Drainer contract pattern detected (transferFrom/approve abuse)",
  },
  {
    condition: (s) => s.hasTornadoInteraction,
    weight: 40,
    signal: "🌪️ Interacted with Tornado Cash (OFAC sanctioned mixer)",
  },
  {
    condition: (s) => s.hasMixerPattern,
    weight: 30,
    signal: "🔀 Mixer-like pattern: repeated equal-value outgoing transactions",
  },
  {
    condition: (s) => s.hasScamTokens,
    weight: 20,
    signal: "🪙 Received or sent known scam/rug-pull tokens",
  },
  {
    condition: (s) => s.deployedByUnverified,
    weight: 15,
    signal: "🏭 Contract deployed by an unverified or suspicious deployer",
  },

  // ── Moderate risk factors ────────────────────────────────────────────────
  {
    condition: (s) => !s.hasFarcasterIdentity && !s.hasExchangeLabel,
    weight: 15,
    signal: "👻 No Farcaster identity linked to this wallet",
  },
  {
    condition: (s) => s.isContract && !s.isVerifiedContract,
    weight: 20,
    signal: "📜 Unverified smart contract",
  },
  {
    condition: (s) =>
      s.hasFarcasterIdentity && s.followerCount < 10 && s.followerCount > 0,
    weight: 10,
    signal: "📉 Very low Farcaster follower count (< 10)",
  },
  {
    condition: (s) => s.isUnknown && !s.hasFarcasterIdentity,
    weight: 10,
    signal: "❓ Unknown wallet with no social presence",
  },

  // ── Trust-building factors (negative weight = reduces score) ─────────────
  {
    condition: (s) => s.hasExchangeLabel,
    weight: -20,
    signal: "🏦 Known exchange address",
  },
  {
    condition: (s) => s.isVerifiedContract,
    weight: -10,
    signal: "✅ Verified smart contract",
  },
  {
    condition: (s) => s.hasFarcasterIdentity && s.followerCount >= 100,
    weight: -15,
    signal: "🟢 Active Farcaster identity (100+ followers)",
  },
  {
    condition: (s) => s.isAddressVerifiedOnFarcaster,
    weight: -10,
    signal: "🔗 Address verified on Farcaster profile",
  },
  {
    condition: (s) => s.hasPowerBadge,
    weight: -20,
    signal: "⚡ Farcaster Power Badge holder",
  },
];

export function runScoreAgent(signals: WalletSignals): ScoreResult {
  let score = 0;
  const activeSignals: string[] = [];

  for (const rule of SCORING_RULES) {
    if (rule.condition(signals)) {
      score += rule.weight;
      if (rule.weight > 0) {
        activeSignals.push(rule.signal);
      }
    }
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  const riskLevel = getRiskLevel(score);

  return {
    score,
    riskLevel,
    signals: activeSignals,
  };
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "medium";
  if (score >= 10) return "low";
  return "safe";
}
