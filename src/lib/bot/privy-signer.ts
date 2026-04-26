// ============================================================
// SafeOrSus — Privy Bot Signer Registration
// ============================================================
// Uses Privy server wallet to sign the Farcaster key registration
// EIP-712 message, then registers the signer with Neynar.
//
// Run once via POST /api/bot/setup to get a signer_uuid.
// Store the result as NEYNAR_SIGNER_UUID in env vars.
// ============================================================

import { PrivyClient } from "@privy-io/node";

const NEYNAR_API = "https://api.neynar.com/v2";

// Farcaster SignedKeyRequest EIP-712 domain + types
// https://github.com/farcasterxyz/protocol/blob/main/docs/SPECIFICATION.md
const SIGNED_KEY_REQUEST_VALIDATOR_ADDRESS =
  "0x00000000fc700472606ED4fA22623Cd18fD24964";

const EIP_712_DOMAIN = {
  name: "Farcaster SignedKeyRequestValidator",
  version: "1",
  chainId: 10, // Optimism mainnet (Farcaster uses OP)
  verifyingContract: SIGNED_KEY_REQUEST_VALIDATOR_ADDRESS,
} as const;

const EIP_712_TYPES = {
  SignedKeyRequest: [
    { name: "requestFid", type: "uint256" },
    { name: "key", type: "bytes" },
    { name: "deadline", type: "uint256" },
  ],
};

export interface SignerSetupResult {
  signerUuid: string;
  publicKey: string;
  fid: number | null;
  status: string;
  privyWalletId: string;
  privyWalletAddress: string;
}

export async function setupPrivyBotSigner(): Promise<SignerSetupResult> {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  const neynarApiKey = process.env.NEYNAR_API_KEY;
  // The FID of your app/bot account on Farcaster
  const appFid = process.env.BOT_FID ? parseInt(process.env.BOT_FID, 10) : null;

  if (!appId || !appSecret) throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET are required");
  if (!neynarApiKey) throw new Error("NEYNAR_API_KEY is required");
  if (!appFid) throw new Error("BOT_FID is required (your bot's Farcaster FID)");

  const privy = new PrivyClient({ appId, appSecret });

  // ── Step 1: Get or create the bot's Privy wallet ──────────────────────────
  let walletId = process.env.PRIVY_BOT_WALLET_ID;
  let walletAddress: string;

  if (walletId) {
    // Use existing wallet
    const existing = await privy.wallets().get(walletId);
    walletAddress = existing.address;
    console.log(`[privy-signer] Using existing wallet ${walletAddress}`);
  } else {
    // Create a new server wallet for the bot
    const newWallet = await privy.wallets().create({ chain_type: "ethereum" });
    walletId = newWallet.id;
    walletAddress = newWallet.address;
    console.log(`[privy-signer] Created new wallet ${walletAddress} (id: ${walletId})`);
    console.log(`[privy-signer] IMPORTANT: Save PRIVY_BOT_WALLET_ID=${walletId}`);
  }

  // ── Step 2: Create a Neynar managed signer ────────────────────────────────
  const signerRes = await fetch(`${NEYNAR_API}/farcaster/signer`, {
    method: "POST",
    headers: {
      "x-api-key": neynarApiKey,
      "Content-Type": "application/json",
    },
  });

  if (!signerRes.ok) {
    throw new Error(`Failed to create Neynar signer: ${await signerRes.text()}`);
  }

  const signerData = await signerRes.json();
  const signerUuid: string = signerData.signer_uuid;
  const publicKey: string = signerData.public_key; // hex, 0x prefixed

  console.log(`[privy-signer] Created signer ${signerUuid} with key ${publicKey}`);

  // ── Step 3: Sign the key registration EIP-712 message via Privy ──────────
  // deadline = now + 1 day (in seconds)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 86400);

  const signedKeyRes = await privy.wallets().ethereum().signTypedData(walletId, {
    params: {
      typed_data: {
        domain: EIP_712_DOMAIN,
        types: EIP_712_TYPES,
        primary_type: "SignedKeyRequest",
        message: {
          requestFid: BigInt(appFid),
          key: publicKey as `0x${string}`,
          deadline,
        },
      },
    },
  });

  const signature = signedKeyRes.signature;
  console.log(`[privy-signer] Signed key request: ${signature.slice(0, 20)}...`);

  // ── Step 4: Register the signed key with Neynar ───────────────────────────
  const registerRes = await fetch(`${NEYNAR_API}/farcaster/signer/signed_key`, {
    method: "POST",
    headers: {
      "x-api-key": neynarApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      signer_uuid: signerUuid,
      app_fid: appFid,
      deadline: deadline.toString(),
      signature,
    }),
  });

  if (!registerRes.ok) {
    throw new Error(`Failed to register signed key: ${await registerRes.text()}`);
  }

  const registered = await registerRes.json();
  console.log(`[privy-signer] Signer registered — status: ${registered.status}, fid: ${registered.fid}`);

  return {
    signerUuid,
    publicKey,
    fid: registered.fid ?? null,
    status: registered.status ?? "pending_approval",
    privyWalletId: walletId,
    privyWalletAddress: walletAddress,
  };
}
