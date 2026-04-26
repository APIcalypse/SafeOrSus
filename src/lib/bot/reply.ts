// ============================================================
// SafeOrSus — Farcaster Bot Reply Helper
// ============================================================
// Posts analysis results back to Farcaster as a cast reply.
// Uses Neynar's publishCast API with the bot's managed signer.
// ============================================================

import type { AnalysisResult } from "@/features/app/types";

const NEYNAR_API_BASE = "https://api.neynar.com/v2";

// The published app URL — used to generate the embed link in bot replies
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://miniapp-generator-fid-1101582-260421150027107.neynar.app";

const RISK_EMOJI: Record<string, string> = {
  safe: "✅",
  low: "🟡",
  medium: "🟠",
  high: "🔴",
  critical: "🚨",
};

interface PostReplyOptions {
  /** The hash of the cast we're replying to */
  parentHash: string;
  /** The FID of the cast author (used to tag them) */
  authorFid?: number;
  /** The analysis result to format */
  result: AnalysisResult;
}

/**
 * Posts the analysis result as a Farcaster cast reply.
 * Returns the new cast hash if successful.
 */
export async function postBotReply(options: PostReplyOptions): Promise<string | null> {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;

  if (!apiKey || !signerUuid) {
    console.warn("[bot/reply] Missing NEYNAR_API_KEY or NEYNAR_SIGNER_UUID — cannot post reply");
    return null;
  }

  const text = formatReplyText(options.result);
  const { wallet, inputQuery } = options.result;

  // Use inputQuery (original input — ENS or 0x address) for the deep link.
  // Falls back to resolved wallet address if inputQuery is missing.
  const deepLinkInput = inputQuery ?? wallet;
  const embedUrl = `${APP_URL}/?wallet=${encodeURIComponent(deepLinkInput)}`;

  try {
    const res = await fetch(`${NEYNAR_API_BASE}/farcaster/cast`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text,
        parent: options.parentHash,
        embeds: [{ url: embedUrl }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[bot/reply] Neynar cast error ${res.status}:`, body);
      return null;
    }

    const data = await res.json();
    const castHash: string | undefined = data?.cast?.hash;
    console.log(`[bot/reply] Posted reply cast: ${castHash ?? "unknown"}`);
    return castHash ?? null;
  } catch (err) {
    console.error("[bot/reply] Failed to post cast:", err);
    return null;
  }
}

interface PostChatReplyOptions {
  /** The hash of the cast we're replying to */
  parentHash: string;
  /** The AI-generated reply text */
  text: string;
  /** Wallet address to embed deep-link (optional — chat-only replies omit it) */
  embedWallet?: string;
  /** Original input query (ENS or address) — used for the deep-link */
  inputQuery?: string;
}

/**
 * Posts a plain text chat reply. Used for conversational responses.
 * Optionally embeds the mini app deep-link if a wallet was involved.
 */
export async function postBotChatReply(options: PostChatReplyOptions): Promise<string | null> {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;

  if (!apiKey || !signerUuid) {
    console.warn("[bot/reply] Missing NEYNAR_API_KEY or NEYNAR_SIGNER_UUID — cannot post reply");
    return null;
  }

  // Only embed the deep-link if a wallet was part of the cast
  const deepLinkInput = options.inputQuery ?? options.embedWallet;
  const embeds = deepLinkInput
    ? [{ url: `${APP_URL}/?wallet=${encodeURIComponent(deepLinkInput)}` }]
    : [];

  // Truncate to Farcaster's 1024-byte limit
  const text = options.text.length > 900 ? options.text.slice(0, 897) + "..." : options.text;

  try {
    const res = await fetch(`${NEYNAR_API_BASE}/farcaster/cast`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signer_uuid: signerUuid,
        text,
        parent: options.parentHash,
        ...(embeds.length > 0 && { embeds }),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[bot/reply] Neynar cast error ${res.status}:`, body);
      return null;
    }

    const data = await res.json();
    const castHash: string | undefined = data?.cast?.hash;
    console.log(`[bot/reply] Posted chat reply cast: ${castHash ?? "unknown"}`);
    return castHash ?? null;
  } catch (err) {
    console.error("[bot/reply] Failed to post chat cast:", err);
    return null;
  }
}

function formatReplyText(result: AnalysisResult): string {
  const { wallet, score, summary } = result;
  const emoji = RISK_EMOJI[score.riskLevel] ?? "🔍";
  const short = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;

  const lines: string[] = [
    `${emoji} SafeOrSus Report for ${short}`,
    `Risk Score: ${score.score}/100 — ${score.riskLevel.toUpperCase()}`,
    ``,
    summary,
  ];

  // Append top signals (max 2 to stay under cast character limit)
  if (score.signals.length > 0) {
    lines.push(``);
    score.signals.slice(0, 2).forEach((sig) => lines.push(sig));
  }

  const text = lines.join("\n");

  // Farcaster cast limit is 1024 bytes — truncate gracefully
  if (text.length > 900) {
    return text.slice(0, 897) + "...";
  }

  return text;
}
