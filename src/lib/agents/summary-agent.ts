// ============================================================
// SafeOrSus — Summary Agent (Groq LLM)
// ============================================================
// Generates a human-readable explanation of the risk assessment.
// Uses Groq's llama-3.1-8b-instant for fast, cheap inference.
// Falls back to deterministic templates if Groq is unavailable.
// ============================================================

import type { AnalysisResult, RiskLevel } from "@/features/app/types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const RISK_EMOJI: Record<RiskLevel, string> = {
  safe: "✅",
  low: "🟡",
  medium: "🟠",
  high: "🔴",
  critical: "🚨",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  safe: "Looks Safe",
  low: "Low Risk",
  medium: "Moderate Risk",
  high: "High Risk",
  critical: "Critical Risk",
};

type PartialResult = Omit<AnalysisResult, "summary" | "analyzedAt">;

export async function generateSummary(result: PartialResult): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    try {
      const llmSummary = await generateGroqSummary(result, groqKey);
      if (llmSummary) return llmSummary;
    } catch {
      // fall through to template
    }
  }

  return generateTemplateSummary(result);
}

// ---- Groq LLM Summary ----

async function generateGroqSummary(
  result: PartialResult,
  apiKey: string,
): Promise<string | null> {
  const { score, signals, etherscan, social, wallet } = result;

  const context = [
    `Wallet: ${wallet}`,
    `Risk Score: ${score.score}/100 (${score.riskLevel})`,
    etherscan.label ? `Etherscan Label: ${etherscan.label}` : "Etherscan Label: None",
    etherscan.isContract
      ? `Contract: Yes (${etherscan.isVerified ? "verified" : "unverified"})`
      : "Contract: No",
    social.fid
      ? `Farcaster: @${social.username} — ${social.followerCount?.toLocaleString() ?? 0} followers`
      : "Farcaster: No identity found",
    score.signals.length > 0
      ? `Risk signals: ${score.signals.join("; ")}`
      : "Risk signals: None detected",
  ].join("\n");

  const prompt = `You are SafeOrSus, a Web3 security tool that analyzes Ethereum wallets.
Given the following wallet analysis data, write a concise 2-3 sentence plain-English explanation
of whether this wallet is safe or suspicious. Be direct, informative, and helpful.
Do NOT start with "Based on" or repeat the score. Focus on what matters most.

${context}`;

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150,
      temperature: 0.4,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const text: string | undefined =
    data?.choices?.[0]?.message?.content?.trim();

  if (!text || text.length < 20) return null;

  // Prepend the emoji + label header
  const emoji = RISK_EMOJI[result.score.riskLevel];
  const label = RISK_LABEL[result.score.riskLevel];
  return `${emoji} ${label} (${result.score.score}/100). ${text}`;
}

// ---- Template Fallback ----

function generateTemplateSummary(result: PartialResult): string {
  const { score, etherscan, social } = result;
  const { riskLevel } = score;
  const emoji = RISK_EMOJI[riskLevel];
  const label = RISK_LABEL[riskLevel];

  const parts: string[] = [];

  if (etherscan.label) {
    if (riskLevel === "critical" || riskLevel === "high") {
      parts.push(
        `This wallet is labeled "${etherscan.label}" on Etherscan — a major red flag.`,
      );
    } else if (riskLevel === "safe" || riskLevel === "low") {
      parts.push(`Etherscan identifies this as "${etherscan.label}".`);
    } else {
      parts.push(`Etherscan label: "${etherscan.label}".`);
    }
  } else if (etherscan.isContract) {
    parts.push(
      etherscan.isVerified
        ? "This is a verified smart contract."
        : "This is an unverified smart contract — proceed with caution.",
    );
  } else {
    parts.push("No Etherscan label found for this wallet.");
  }

  if (social.fid) {
    const name = social.displayName || social.username || `FID ${social.fid}`;
    const followers = social.followerCount ?? 0;
    parts.push(
      `Linked to Farcaster user @${social.username || name} with ${followers.toLocaleString()} followers.`,
    );
  } else {
    parts.push("No Farcaster identity is linked to this wallet.");
  }

  if (riskLevel === "critical") {
    parts.push("Do NOT interact with this wallet. It has been flagged for malicious activity.");
  } else if (riskLevel === "high") {
    parts.push("Exercise extreme caution before interacting with this wallet.");
  } else if (riskLevel === "medium") {
    parts.push("Verify this wallet carefully before sending funds or signing transactions.");
  } else if (riskLevel === "low") {
    parts.push("This wallet shows minor risk signals but appears mostly legitimate.");
  } else {
    parts.push("This wallet appears clean based on available data.");
  }

  return `${emoji} ${label} (${score.score}/100). ${parts.join(" ")}`;
}
