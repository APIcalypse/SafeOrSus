// ============================================================
// SafeOrSus — Neynar / Farcaster Social Agent (Deterministic)
// ============================================================
// Looks up wallet address via Neynar to find Farcaster identity.
//
// Strategy:
//   1. bulk-by-address with address_types=custody_address,verified_address
//      → finds users who have this address as custody OR verified wallet
//   2. Pick the best match (highest neynar score, then most followers)
//   3. Map fields correctly: verifications[], score, power_badge
// ============================================================

import type { NeynarResult } from "@/features/app/types";

const NEYNAR_API_BASE = "https://api.neynar.com/v2";

export async function runNeynarAgent(wallet: string): Promise<NeynarResult> {
  const apiKey = process.env.NEYNAR_API_KEY;

  if (!apiKey) {
    return emptyResult("NEYNAR_API_KEY not configured");
  }

  try {
    const addressLower = wallet.toLowerCase();

    // Pass address_types to match BOTH custody and verified addresses
    const url =
      `${NEYNAR_API_BASE}/farcaster/user/bulk-by-address` +
      `?addresses=${addressLower}` +
      `&address_types=custody_address,verified_address`;

    const userRes = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
      },
      next: { revalidate: 60 },
    });

    if (!userRes.ok) {
      if (userRes.status === 404) {
        return emptyResult(); // No Farcaster user — not an error
      }
      return emptyResult(`Neynar API error: ${userRes.status}`);
    }

    const data = await userRes.json();

    // Response shape: { [address_lowercase]: User[] }
    const users: NeynarUser[] =
      data[addressLower] ||
      data[wallet] ||
      (Object.values(data)[0] as NeynarUser[]) ||
      [];

    if (!users || users.length === 0) {
      return emptyResult();
    }

    // Pick the best user: highest neynar score, then most followers
    const user = users.reduce((best, u) => {
      const scoreA = u.score ?? 0;
      const scoreB = best.score ?? 0;
      if (scoreA !== scoreB) return scoreA > scoreB ? u : best;
      return (u.follower_count ?? 0) > (best.follower_count ?? 0) ? u : best;
    });

    // `verifications` is the canonical list of connected ETH addresses.
    // `verified_addresses` is also present but may be incomplete in bulk responses.
    const verifiedAddresses: string[] = [
      ...(user.verifications ?? []),
      ...(user.verified_addresses?.eth_addresses ?? []),
      ...(user.verified_addresses?.sol_addresses ?? []),
    ].filter((v, i, arr) => arr.indexOf(v) === i);

    // Farcaster's "blue checkmark" = neynar score >= 0.8 (trusted/power user).
    const neynarScore = user.score ?? null;
    const hasPowerBadge =
      user.power_badge === true || (neynarScore != null && neynarScore >= 0.8);

    // Extract linked X/Twitter handle from verified_accounts
    const xAccount = (user.verified_accounts ?? []).find(
      (a) => a.platform === "x",
    );
    const xUsername = xAccount?.username ?? null;

    return {
      fid: user.fid ?? null,
      username: user.username ?? null,
      displayName: user.display_name ?? null,
      followerCount: user.follower_count ?? 0,
      followingCount: user.following_count ?? 0,
      verifiedAddresses,
      activeStatus: user.active_status === "active" ? "active" : "inactive",
      hasPowerBadge,
      xUsername,
      neynarScore,
    };
  } catch (err) {
    return emptyResult(err instanceof Error ? err.message : "Unknown error");
  }
}

function emptyResult(error?: string): NeynarResult {
  return {
    fid: null,
    username: null,
    displayName: null,
    followerCount: null,
    followingCount: null,
    verifiedAddresses: [],
    activeStatus: "unknown",
    hasPowerBadge: false,
    xUsername: null,
    neynarScore: null,
    ...(error ? { error } : {}),
  };
}

// Neynar user fields we care about
interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  follower_count: number;
  following_count: number;
  active_status?: string;
  power_badge?: boolean;
  /** Neynar trust score 0–1. >= 0.8 = blue checkmark equivalent */
  score?: number;
  /** Canonical list of connected/verified ETH addresses */
  verifications?: string[];
  verified_addresses?: {
    eth_addresses?: string[];
    sol_addresses?: string[];
  };
  /** Linked social accounts (X, GitHub, etc.) */
  verified_accounts?: Array<{
    platform: string;
    username: string;
  }>;
}
