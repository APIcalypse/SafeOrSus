// ============================================================
// SafeOrSus — Farcaster Webhook Handler
// ============================================================
// Receives Neynar cast webhooks.
// Detects Ethereum wallet addresses in cast text.
// Triggers analysis and posts a reply via the bot account.
//
// Setup in Neynar dashboard:
//   URL: https://<your-domain>/api/webhook/farcaster
//   Events: cast.created
//   Filter: mention OR all casts (depending on your bot FID setup)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { orchestrateAnalysis, isValidWalletAddress } from "@/lib/orchestrator";
import { isEnsName } from "@/lib/agents/ens-agent";
import { postBotReply, postBotChatReply } from "@/lib/bot/reply";
import { generateChatReply, getFallbackChatReply } from "@/lib/bot/chat-agent";

// Regex: matches 0x + 40 hex chars (standard Ethereum address)
const ETH_ADDRESS_REGEX = /\b(0x[0-9a-fA-F]{40})\b/g;
// Regex: matches ENS names like vitalik.eth, nick.xyz, etc.
const ENS_NAME_REGEX = /\b([a-zA-Z0-9-]+\.(eth|xyz|id))\b/gi;

// Bot's own FID — prevents the bot from replying to its own casts
const BOT_FID = process.env.BOT_FID ? parseInt(process.env.BOT_FID, 10) : null;

// Bot's username — used to detect mentions (e.g. "@douxxiie")
const BOT_USERNAME = process.env.BOT_USERNAME ?? "douxxiie";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Optional: verify Neynar webhook signature
    const webhookSecret = process.env.NEYNAR_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers.get("x-neynar-signature");
      if (!signature) {
        return NextResponse.json({ error: "Missing signature" }, { status: 401 });
      }
      // TODO: verify HMAC-SHA512 signature if you set a secret in the dashboard
      // For MVP we skip this — add verification before production
    }

    const body = await req.json();

    // Neynar webhook payload shape
    const event = body as NeynarWebhookEvent;

    // Only handle cast.created events
    if (event.type !== "cast.created") {
      return NextResponse.json({ ok: true, skipped: "not a cast event" });
    }

    const cast = event.data;
    if (!cast?.hash || !cast?.text) {
      return NextResponse.json({ ok: true, skipped: "no cast data" });
    }

    // Self-reply guard temporarily disabled for testing
    // TODO: re-enable before going live
    const authorFid = cast.author?.fid;
    const authorUsername = cast.author?.username ?? "";

    // Only reply if the bot is explicitly mentioned by FID or by @username
    const mentionedFids = (cast.mentioned_profiles ?? []).map((p) => p.fid);
    const mentionedByFid = BOT_FID && mentionedFids.includes(BOT_FID);
    const mentionedByUsername = cast.text.toLowerCase().includes(`@${BOT_USERNAME.toLowerCase()}`);
    if (!mentionedByFid && !mentionedByUsername) {
      return NextResponse.json({ ok: true, skipped: "bot not mentioned" });
    }

    // Extract all Ethereum wallet addresses / ENS names from the cast text
    const wallets = extractWallets(cast.text);

    // ── Case 1: Wallet + optional question ───────────────────────────────
    if (wallets.length > 0) {
      const wallet = wallets[0];

      console.log(
        `[webhook] Analyzing wallet ${wallet} from cast ${cast.hash} by FID ${cast.author?.fid}`,
      );

      const result = await orchestrateAnalysis(wallet);

      // Strip the wallet address/ENS from the cast text to extract the question
      const questionText = cast.text
        .replace(new RegExp(wallet.replace(/\./g, "\\."), "gi"), "")
        .replace(/@\w+/g, "") // strip @mentions
        .replace(/\s+/g, " ")
        .trim();

      const hasQuestion = questionText.length > 8;

      // If there's a meaningful question alongside the wallet, use chat agent
      // for a combined answer. Otherwise use the standard wallet reply.
      if (hasQuestion) {
        console.log(`[webhook] Wallet + question detected: "${questionText}"`);
        const chatReply =
          (await generateChatReply({
            question: questionText,
            authorUsername,
            walletContext: result,
          })) ?? getFallbackChatReply(authorUsername);

        const replyHash = await postBotChatReply({
          parentHash: cast.hash,
          text: chatReply,
          embedWallet: wallet,
          inputQuery: result.inputQuery,
        });

        return NextResponse.json({
          ok: true,
          wallet,
          mode: "wallet+question",
          replyHash,
        });
      }

      // Standard wallet scan reply
      const replyHash = await postBotReply({
        parentHash: cast.hash,
        authorFid: cast.author?.fid,
        result,
      });

      return NextResponse.json({
        ok: true,
        wallet,
        mode: "wallet-scan",
        score: result.score.score,
        riskLevel: result.score.riskLevel,
        replyHash,
      });
    }

    // ── Case 2: Chat-only (no wallet found) ──────────────────────────────
    console.log(`[webhook] No wallet found — generating chat reply for cast ${cast.hash}`);

    const chatReply =
      (await generateChatReply({
        question: cast.text,
        authorUsername,
      })) ?? getFallbackChatReply(authorUsername);

    const replyHash = await postBotChatReply({
      parentHash: cast.hash,
      text: chatReply,
    });

    return NextResponse.json({
      ok: true,
      mode: "chat",
      replyHash,
    });
  } catch (err) {
    console.error("[webhook] Error processing cast:", err);
    // Always return 200 to Neynar — returning 4xx/5xx causes retries
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 200 },
    );
  }
}

function extractWallets(text: string): string[] {
  const addresses = text.match(ETH_ADDRESS_REGEX) ?? [];
  const ensNames = text.match(ENS_NAME_REGEX) ?? [];
  // Addresses first, then ENS names — deduplicate
  const all = [...addresses, ...ensNames];
  const unique = [...new Set(all)];
  return unique.filter((v) => isValidWalletAddress(v) || isEnsName(v));
}

// Health check — lets you verify the webhook URL is reachable
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    service: "SafeOrSus Farcaster Webhook",
    endpoint: "POST /api/webhook/farcaster",
    events: ["cast.created"],
    groqEnabled: !!process.env.GROQ_API_KEY,
    botFid: BOT_FID,
    signerUuidSet: !!process.env.NEYNAR_SIGNER_UUID,
    signerUuidPrefix: process.env.NEYNAR_SIGNER_UUID?.slice(0, 8) ?? null,
  });
}

// ---- Neynar webhook types (minimal) ----

interface NeynarWebhookEvent {
  type: string;
  data: NeynarCast;
}

interface NeynarCast {
  hash: string;
  text: string;
  author?: {
    fid: number;
    username?: string;
  };
  parent_hash?: string;
  parent_author?: {
    fid: number;
  };
  mentioned_profiles?: Array<{ fid: number; username?: string }>;
}
