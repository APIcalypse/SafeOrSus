// ============================================================
// SafeOrSus — Bot Setup Route
// ============================================================
// POST /api/bot/setup
//   → Creates a Privy server wallet for the bot (or reuses existing)
//   → Creates a Neynar managed signer
//   → Signs the Farcaster key registration via Privy
//   → Registers the signer with Neynar
//   → Returns the signer_uuid to store as NEYNAR_SIGNER_UUID
//
// This is a ONE-TIME setup route. Protect it in production.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { setupPrivyBotSigner } from "@/lib/bot/privy-signer";

// Simple secret guard — require ?secret=<BOT_SETUP_SECRET> in the URL
// Set BOT_SETUP_SECRET in your env vars to protect this endpoint.
const SETUP_SECRET = process.env.BOT_SETUP_SECRET;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Guard: only allow if secret matches (or no secret set in dev)
  if (SETUP_SECRET) {
    const url = new URL(req.url);
    const provided = url.searchParams.get("secret");
    if (provided !== SETUP_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await setupPrivyBotSigner();

    return NextResponse.json({
      ok: true,
      message: "Bot signer registered successfully",
      signerUuid: result.signerUuid,
      publicKey: result.publicKey,
      fid: result.fid,
      status: result.status,
      privyWalletId: result.privyWalletId,
      privyWalletAddress: result.privyWalletAddress,
      nextSteps: [
        `1. Save NEYNAR_SIGNER_UUID=${result.signerUuid} in your env vars`,
        `2. Save PRIVY_BOT_WALLET_ID=${result.privyWalletId} in your env vars`,
        `3. If status is "pending_approval", approve at: https://warpcast.com/~/signer-requests`,
        `4. If status is "approved", the bot is ready to post casts`,
      ],
    });
  } catch (err) {
    console.error("[bot/setup] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET — show current config status
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    service: "SafeOrSus Bot Setup",
    configured: {
      privyAppId: !!process.env.PRIVY_APP_ID,
      privyAppSecret: !!process.env.PRIVY_APP_SECRET,
      privyBotWalletId: !!process.env.PRIVY_BOT_WALLET_ID,
      neynarApiKey: !!process.env.NEYNAR_API_KEY,
      neynarSignerUuid: !!process.env.NEYNAR_SIGNER_UUID,
      botFid: process.env.BOT_FID ?? null,
    },
    instructions: "POST /api/bot/setup to register the bot signer",
  });
}
