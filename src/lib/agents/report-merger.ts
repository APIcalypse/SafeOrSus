// ============================================================
// SafeOrSus — Report Merger (Deterministic Signal Normalizer)
// ============================================================
// Takes raw EtherscanResult + NeynarResult and produces a
// normalized WalletSignals struct.
//
// This is the ONLY component that knows about both data sources.
// The Score Agent only sees WalletSignals — not raw data.
// ============================================================

import type {
  EtherscanResult,
  NeynarResult,
  ScamSnifferResult,
  WalletSignals,
} from "@/features/app/types";

// Slug → risk category mapping
const PHISHING_SLUGS = new Set([
  "phish-hack",
  "phishing",
  "hack",
  "exploit",
  "scam",
  "fraud",
  "rug-pull",
  "rugpull",
  "fake",
  "malicious",
]);

const MIXER_SLUGS = new Set([
  "tornado-cash",
  "mixer",
  "tumbler",
  "privacy",
  "anonymizer",
]);

const EXCHANGE_SLUGS = new Set([
  "exchange",
  "binance",
  "coinbase",
  "kraken",
  "okex",
  "kucoin",
  "bybit",
  "huobi",
  "ftx",
  "gemini",
  "bitstamp",
]);

const CONTRACT_SLUGS = new Set([
  "contract",
  "defi",
  "dex",
  "protocol",
  "vault",
  "pool",
  "bridge",
]);

export function mergeReports(
  etherscan: EtherscanResult,
  neynar: NeynarResult,
  wallet: string,
  scamSniffer?: ScamSnifferResult,
): WalletSignals {
  const slug = etherscan.slug?.toLowerCase() ?? null;
  const label = etherscan.label?.toLowerCase() ?? null;

  // Check slug against known categories
  const hasPhishingLabel =
    (slug !== null && PHISHING_SLUGS.has(slug)) ||
    (label !== null &&
      (label.includes("phish") ||
        label.includes("hack") ||
        label.includes("scam") ||
        label.includes("exploit")));

  const hasMixerLabel =
    (slug !== null && MIXER_SLUGS.has(slug)) ||
    (label !== null && label.includes("mixer"));

  const hasExchangeLabel =
    (slug !== null && EXCHANGE_SLUGS.has(slug)) ||
    (label !== null && label.includes("exchange"));

  const hasContractLabel =
    (slug !== null && CONTRACT_SLUGS.has(slug)) ||
    (label !== null &&
      (label.includes("contract") ||
        label.includes("defi") ||
        label.includes("protocol")));

  const isUnknown =
    etherscan.label === null &&
    etherscan.slug === null &&
    !etherscan.isContract;

  // Check if the queried wallet is in the user's verified addresses
  const walletLower = wallet.toLowerCase();
  const isAddressVerifiedOnFarcaster = neynar.verifiedAddresses.some(
    (addr) => addr.toLowerCase() === walletLower,
  );

  return {
    hasPhishingLabel,
    hasMixerLabel,
    hasExchangeLabel,
    hasContractLabel,
    isUnknown,
    isContract: etherscan.isContract ?? false,
    isVerifiedContract: (etherscan.isContract && etherscan.isVerified) ?? false,
    hasFarcasterIdentity: neynar.fid !== null,
    followerCount: neynar.followerCount ?? 0,
    isAddressVerifiedOnFarcaster,
    // Behavioural signals from transaction analysis
    hasDrainerPattern: etherscan.hasDrainerPattern,
    hasTornadoInteraction: etherscan.hasTornadoInteraction,
    hasMixerPattern: etherscan.hasMixerPattern,
    hasScamTokens: etherscan.hasScamTokens,
    deployedByUnverified: etherscan.deployedByUnverified,
    hasPowerBadge: neynar.hasPowerBadge ?? false,
    isScamSnifferBlocked: scamSniffer?.isBlocked ?? false,
    rawLabel: etherscan.label,
    rawSlug: etherscan.slug,
  };
}
