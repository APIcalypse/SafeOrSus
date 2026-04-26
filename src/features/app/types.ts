// ============================================================
// SafeOrSus — Shared Types
// ============================================================

export type RiskLevel = "safe" | "low" | "medium" | "high" | "critical";

// Raw output from Etherscan scraping
export interface EtherscanResult {
  label: string | null;
  slug: string | null;
  isContract: boolean | null;
  isVerified: boolean | null;
  // Enhanced signals from transaction analysis
  hasDrainerPattern: boolean;    // outgoing transferFrom/approve drain calls
  hasTornadoInteraction: boolean; // interacted with Tornado Cash
  hasMixerPattern: boolean;       // repeated equal-value txs
  hasScamTokens: boolean;         // received/sent known scam tokens
  deployedByUnverified: boolean;  // deployed by another unverified contract
  txCount: number;                // number of transactions seen
  ethBalance: number;             // ETH balance in wei (as number, safe for display)
  error?: string;
}

// Raw output from Neynar / Farcaster social lookup
export interface NeynarResult {
  fid: number | null;
  username: string | null;
  displayName: string | null;
  followerCount: number | null;
  followingCount: number | null;
  verifiedAddresses: string[];
  activeStatus: "active" | "inactive" | "unknown";
  /** True if the user has the Farcaster Power Badge (blue checkmark) */
  hasPowerBadge: boolean;
  /** Linked X/Twitter handle (without @), if connected via Farcaster */
  xUsername: string | null;
  /** Neynar trust score 0–1 (0.8+ = blue checkmark equivalent) */
  neynarScore: number | null;
  error?: string;
}

// Normalized signals fed into the scoring engine
export interface WalletSignals {
  hasPhishingLabel: boolean;
  hasMixerLabel: boolean;
  hasExchangeLabel: boolean;
  hasContractLabel: boolean;
  isUnknown: boolean;
  isContract: boolean;
  isVerifiedContract: boolean;
  hasFarcasterIdentity: boolean;
  followerCount: number;
  isAddressVerifiedOnFarcaster: boolean;
  // Enhanced signals
  hasDrainerPattern: boolean;
  hasTornadoInteraction: boolean;
  hasMixerPattern: boolean;
  hasScamTokens: boolean;
  deployedByUnverified: boolean;
  /** User has Farcaster Power Badge (blue checkmark) */
  hasPowerBadge: boolean;
  /** ScamSniffer returned BLOCKED for this address */
  isScamSnifferBlocked: boolean;
  rawLabel: string | null;
  rawSlug: string | null;
}

// ScamSniffer blocklist result
export interface ScamSnifferResult {
  checked: boolean;
  isBlocked: boolean;
  status: "BLOCKED" | "PASSED" | "UNKNOWN";
  source: "github-db" | "api" | "none";
  error?: string;
}

// Scoring output
export interface ScoreResult {
  score: number; // 0–100 (higher = riskier)
  riskLevel: RiskLevel;
  signals: string[]; // human-readable signal descriptions
}

// ENS resolution result
export interface EnsResult {
  /** The resolved 0x address */
  address: string | null;
  /** ENS name (forward input or reverse-looked-up) */
  ensName: string | null;
  /** True if input was an ENS name and got resolved */
  wasResolved: boolean;
  error?: string;
}

// Full analysis result returned by the orchestrator
export interface AnalysisResult {
  /** The resolved 0x address that was analyzed */
  wallet: string;
  /** Original input (may be ENS name or address) */
  inputQuery: string;
  /** ENS resolution info */
  ens: EnsResult;
  etherscan: EtherscanResult;
  social: NeynarResult;
  scamSniffer: ScamSnifferResult;
  signals: WalletSignals;
  score: ScoreResult;
  summary: string;
  analyzedAt: string;
}
