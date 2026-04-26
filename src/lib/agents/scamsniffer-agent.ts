// ============================================================
// SafeOrSus — ScamSniffer Agent (Free GitHub DB edition)
// ============================================================
// Uses the public ScamSniffer scam-database on GitHub.
// No API key required. ~120KB, ~2500 addresses, O(1) lookup.
//
// DB: https://github.com/scamsniffer/scam-database
// Refreshed every 6 hours in-process. 7-day update lag from live.
//
// If SCAMSNIFFER_API_KEY is set, falls back to the paid live API
// (https://docs.scamsniffer.io/reference/getaddresscheck).
// ============================================================

export interface ScamSnifferResult {
  checked: boolean;
  isBlocked: boolean;
  status: "BLOCKED" | "PASSED" | "UNKNOWN";
  source: "github-db" | "api" | "none";
  error?: string;
}

const GITHUB_DB_URL =
  "https://raw.githubusercontent.com/scamsniffer/scam-database/main/blacklist/address.json";

const SCAMSNIFFER_API_URL = "https://lookup-api.scamsniffer.io/address/check";

// In-process cache — survives across requests in the same server process
let cachedSet: Set<string> | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function getBlocklist(): Promise<Set<string> | null> {
  const now = Date.now();
  if (cachedSet && now < cacheExpiresAt) return cachedSet;

  try {
    const res = await fetch(GITHUB_DB_URL, {
      // Next.js ISR cache: revalidate every 6 hours at the HTTP layer too
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return cachedSet ?? null; // stale-if-error

    const addresses: string[] = await res.json();
    cachedSet = new Set(addresses.map((a) => a.toLowerCase()));
    cacheExpiresAt = now + CACHE_TTL_MS;
    return cachedSet;
  } catch {
    return cachedSet ?? null; // return stale on network failure
  }
}

export async function runScamSnifferAgent(
  address: string,
): Promise<ScamSnifferResult> {
  const apiKey = process.env.SCAMSNIFFER_API_KEY;

  // ── Path A: paid live API (if key is configured) ──────────────────────────
  if (apiKey) {
    try {
      const res = await fetch(
        `${SCAMSNIFFER_API_URL}?address=${encodeURIComponent(address)}`,
        {
          headers: { "x-api-key": apiKey, Accept: "application/json" },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(5_000),
        },
      );

      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          const isBlocked = data.status === "BLOCKED";
          return {
            checked: true,
            isBlocked,
            status: isBlocked ? "BLOCKED" : "PASSED",
            source: "api",
          };
        }
      }
      // If API fails, fall through to GitHub DB
    } catch {
      // Fall through to GitHub DB
    }
  }

  // ── Path B: free GitHub DB ────────────────────────────────────────────────
  const blocklist = await getBlocklist();

  if (!blocklist) {
    return {
      checked: false,
      isBlocked: false,
      status: "UNKNOWN",
      source: "none",
      error: "Could not fetch blocklist",
    };
  }

  const isBlocked = blocklist.has(address.toLowerCase());

  return {
    checked: true,
    isBlocked,
    status: isBlocked ? "BLOCKED" : "PASSED",
    source: "github-db",
  };
}
