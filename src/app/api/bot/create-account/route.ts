// ============================================================
// SafeOrSus — Bot Account Creation Route
// ============================================================
// POST /api/bot/create-account?secret=<BOT_SETUP_SECRET>
//
// Creates a brand-new Farcaster account for the bot using
// Neynar's managed wallet infrastructure (no Privy needed):
//   1. Reserve a fresh FID from Neynar
//   2. Register the account with a username + profile
//   3. Return the new signer UUID and FID
//
// This is a ONE-TIME setup. After running it:
//   - Save NEYNAR_SIGNER_UUID=<signerUuid> in env vars
//   - Save BOT_FID=<fid> in env vars
//   - The bot will post under the new account going forward
// ============================================================

import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_BASE = "https://api.neynar.com/v2";
const SETUP_SECRET = process.env.BOT_SETUP_SECRET;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Guard: require ?secret=<BOT_SETUP_SECRET>
  if (SETUP_SECRET) {
    const url = new URL(req.url);
    const provided = url.searchParams.get("secret");
    if (provided !== SETUP_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.NEYNAR_API_KEY;
  const walletId = process.env.NEYNAR_WALLET_ID;

  if (!apiKey || !walletId) {
    return NextResponse.json(
      { error: "Missing NEYNAR_API_KEY or NEYNAR_WALLET_ID" },
      { status: 500 },
    );
  }

  // Optional: read desired username from request body
  let fname = "safeorsus-bot";
  try {
    const body = await req.json();
    if (body?.fname) fname = body.fname;
  } catch {
    // no body is fine
  }

  try {
    // ── Step 1: Reserve a fresh FID ──────────────────────────────────────────
    console.log("[bot/create-account] Fetching fresh FID...");
    const fidRes = await fetch(`${NEYNAR_API_BASE}/farcaster/user/fid`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "x-wallet-id": walletId,
      },
    });

    if (!fidRes.ok) {
      const body = await fidRes.text();
      throw new Error(`Failed to fetch FID: ${fidRes.status} — ${body}`);
    }

    const { fid } = await fidRes.json();
    console.log(`[bot/create-account] Reserved FID: ${fid}`);

    // ── Step 2: Register the account ─────────────────────────────────────────
    // With Neynar's managed wallet, they handle the EIP-712 signature
    // and the onchain registration — we just provide the FID and metadata.
    console.log(`[bot/create-account] Registering account with fname="${fname}"...`);
    const registerRes = await fetch(`${NEYNAR_API_BASE}/farcaster/user`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "x-wallet-id": walletId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fid,
        fname,
        metadata: {
          bio: "Instant wallet risk scanner for Farcaster. Drop any ETH address and I'll check it. Powered by @safeorsus",
          display_name: "SafeOrSus Bot",
        },
      }),
    });

    if (!registerRes.ok) {
      const body = await registerRes.text();
      throw new Error(`Failed to register account: ${registerRes.status} — ${body}`);
    }

    const registerData = await registerRes.json();
    console.log("[bot/create-account] Account registered:", JSON.stringify(registerData, null, 2));

    // Extract the signer UUID from the response
    const signerUuid: string | undefined =
      registerData?.signer?.uuid ?? registerData?.signers?.[0]?.uuid;

    const newFid: number | undefined = registerData?.user?.fid ?? fid;

    return NextResponse.json({
      ok: true,
      message: "Bot account created successfully!",
      fid: newFid,
      fname,
      signerUuid: signerUuid ?? null,
      signerStatus: registerData?.signer?.status ?? registerData?.signers?.[0]?.status ?? "unknown",
      rawResponse: registerData,
      nextSteps: [
        `1. Add env var: NEYNAR_SIGNER_UUID=${signerUuid}`,
        `2. Add env var: BOT_FID=${newFid}`,
        `3. Remove old NEYNAR_SIGNER_UUID and BOT_FID (the @douxxiie ones)`,
        `4. Redeploy the app — the bot will now post as @${fname}`,
        `5. Set up a Neynar webhook at dev.neynar.com → cast.created events → https://<your-domain>/api/webhook/farcaster`,
      ],
    });
  } catch (err) {
    console.error("[bot/create-account] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET — show instructions
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    service: "SafeOrSus Bot Account Creator",
    description:
      "POST here to create a brand-new Farcaster account for the bot. Uses Neynar managed wallet — no Privy needed.",
    configured: {
      neynarApiKey: !!process.env.NEYNAR_API_KEY,
      neynarWalletId: !!process.env.NEYNAR_WALLET_ID,
    },
    usage: "POST /api/bot/create-account with optional body: { \"fname\": \"your-bot-name\" }",
    note: "Run this ONCE. After success, save the returned signerUuid and fid as env vars.",
  });
}
