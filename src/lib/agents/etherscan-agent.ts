// ============================================================
// SafeOrSus — Etherscan Agent (V2 API + Known-Bad DB)
// ============================================================
// Signal collection strategy:
//   1. Known-bad address DB (instant — Tornado Cash, phishing wallets)
//   2. Contract source code → isContract, isVerified, contractName
//   3. Transaction list → drainer pattern, mixer pattern, Tornado interaction
//   4. Internal transactions → drain calls from other contracts
//   5. ERC-20 token transfers → scam token detection
//   6. Deployer check → was deployer itself unverified?
//   7. ETH balance → near-zero after activity = likely drained
// ============================================================

import type { EtherscanResult } from "@/features/app/types";

const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";
const CHAIN_ID = "1"; // Ethereum mainnet

// ---- Known-Bad Address Database ----

interface KnownEntry { label: string; slug: string }

const KNOWN_BAD: Record<string, KnownEntry> = {
  // Tornado Cash (OFAC sanctioned)
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf": { label: "Tornado Cash", slug: "tornado-cash" },
  "0xa160cdab225685da1d56aa342ad8841c3b53f291": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x12d66f87a04a9e220c9d05126361210b0c4bb7fc": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x34bc1b87f60e0a30c0e24fd7abada70436c71406": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x22aaa7720ddd5388a3c0a3333430953c68f1849b": { label: "Tornado Cash", slug: "tornado-cash" },
  "0xba214c1c1928a32bffe790263e38b4af9bfcd659": { label: "Tornado Cash", slug: "tornado-cash" },
  "0xb1c8094b234dce6e03f10a5b673c1d8c69739a00": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x527653ea119f3e6a1f5bd18fbf9b956beaef6156": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x58e8dcc13be9780fc42e8723d8ead4cf46943df2": { label: "Tornado Cash", slug: "tornado-cash" },
  "0xd96f2b1c14db8458374d9aca76e26c3950113464": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x4736dcf1b7a3d580672cce6e7c65cd5cc9cfba9d": { label: "Tornado Cash", slug: "tornado-cash" },
  "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3": { label: "Tornado Cash", slug: "tornado-cash" },
  "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x07687e702b410fa43f4cb4af7fa097918ffd2730": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x23773e65ed146a459667303b6428754be17f17ff": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x03893a7c7463ae47d46bc7f091665f1893656003": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x2717c5e28cf931547b621a5dddb772ab6a35b701": { label: "Tornado Cash", slug: "tornado-cash" },
  "0xf67721a2d8f736e75a49fdc940616ad24db81c35": { label: "Tornado Cash", slug: "tornado-cash" },
  "0x9ad122c22b14202b4490edaf288fdb3c7cb3ff5e": { label: "Tornado Cash", slug: "tornado-cash" },
  // Known Phishing / Hack
  "0x7f268357a8c2552623316e2562d90e642bb538e5": { label: "Phish / Hack", slug: "phish-hack" },
  "0xa7efae728d2936e78bda97dc267687568dd593f3": { label: "Phish / Hack", slug: "phish-hack" },
  "0x098b716b8aaf21512996dc57eb0615e2383e2f96": { label: "Phish / Hack", slug: "phish-hack" },
  "0xa0e1c89ef1a489c9c7de96311ed5ce5d32c20e4b": { label: "Phish / Hack", slug: "phish-hack" },
  "0x3adfcc3c9dc05c9e3a30ba72f9f61f1b7ac86909": { label: "Phish / Hack", slug: "phish-hack" },
  "0x53b6936513e738f44fb50d2b9476730c0d3e6a2b": { label: "Phish / Hack", slug: "phish-hack" },
  "0x76a603b9a5d21deef0bd1e2caad09c6e0c4a23a5": { label: "Phish / Hack", slug: "phish-hack" },
  "0x00000c07575bb4e64457687a0382b4d3ea470000": { label: "Phish / Hack", slug: "phish-hack" },
  // Exchanges (trust signals)
  "0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae": { label: "Ethereum Foundation", slug: "ethereum-foundation" },
  "0x28c6c06298d514db089934071355e5743bf21d60": { label: "Binance", slug: "exchange" },
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": { label: "Binance", slug: "exchange" },
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": { label: "Binance", slug: "exchange" },
  "0x56eddb7aa87536c09ccc2793473599fd21a8b17f": { label: "Binance", slug: "exchange" },
  "0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43": { label: "Coinbase", slug: "exchange" },
  "0x71660c4005ba85c37ccec55d0c4493e66fe775d3": { label: "Coinbase", slug: "exchange" },
  "0x503828976d22510aad0201ac7ec88293211d23da": { label: "Coinbase", slug: "exchange" },
};

// Known Tornado Cash contract addresses (for interaction detection)
const TORNADO_ADDRS = new Set([
  "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
  "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf",
  "0xa160cdab225685da1d56aa342ad8841c3b53f291",
  "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936",
  "0x12d66f87a04a9e220c9d05126361210b0c4bb7fc",
  "0x34bc1b87f60e0a30c0e24fd7abada70436c71406",
]);

// Known scam/rug-pull token names (lowercased)
const SCAM_TOKEN_KEYWORDS = [
  "squid", "evilpepe", "evil pepe", "babydoge", "safemoon", "shib2",
  "ethereummax", "ethereummax", "cum", "inu2", "elondog", "moonrat",
  "honk", "floki2", "rugpull", "scam", "fake usdt", "fake usdc",
];

// ---- API helper ----

async function etherscanCall(params: Record<string, string>): Promise<unknown> {
  const apiKey = process.env.ETHERSCAN_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ETHERSCAN_API_KEY is not set");
  }
  const url = new URL(ETHERSCAN_V2);
  url.searchParams.set("chainid", CHAIN_ID);
  url.searchParams.set("apikey", apiKey);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "SafeOrSus/1.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Etherscan HTTP ${res.status}`);
  return res.json();
}

// ---- Contract info ----

interface ContractInfo {
  isContract: boolean;
  isVerified: boolean;
  contractName: string | null;
}

async function getContractInfo(address: string): Promise<ContractInfo> {
  try {
    const data = await etherscanCall({
      module: "contract", action: "getsourcecode", address,
    }) as { status: string; result: Array<Record<string, string>> };

    if (data.status !== "1" || !Array.isArray(data.result) || !data.result[0]) {
      return getContractFromCode(address);
    }
    const r = data.result[0];
    const abi = r.ABI ?? "";
    const notVerified = "Contract source code not verified";
    const isVerified = abi !== notVerified && abi.length > 10;
    const isContract = abi.length > 0;
    const contractName = r.ContractName?.length ? r.ContractName : null;
    return { isContract, isVerified, contractName };
  } catch {
    return { isContract: false, isVerified: false, contractName: null };
  }
}

async function getContractFromCode(address: string): Promise<ContractInfo> {
  try {
    const data = await etherscanCall({
      module: "proxy", action: "eth_getCode", address, tag: "latest",
    }) as { result: string };
    const code = data.result ?? "0x";
    return { isContract: code !== "0x" && code.length > 4, isVerified: false, contractName: null };
  } catch {
    return { isContract: false, isVerified: false, contractName: null };
  }
}

// ---- Transaction & behaviour analysis ----

// Drainer contract function signatures (first 4 bytes of keccak256)
// transferFrom, approve, setApprovalForAll — the holy trinity of drainers
const DRAINER_FUNCTION_SIGS = new Set([
  "0x23b872dd", // transferFrom(address,address,uint256)
  "0x095ea7b3", // approve(address,uint256)
  "0xa22cb465", // setApprovalForAll(address,bool)
]);

interface BehaviourAnalysis {
  txCount: number;
  hasDrainerPattern: boolean;
  hasTornadoInteraction: boolean;
  hasMixerPattern: boolean;
  hasScamTokens: boolean;
  deployedByUnverified: boolean;
  ethBalance: number;
}

async function analyseBehaviour(address: string): Promise<BehaviourAnalysis> {
  const addrLower = address.toLowerCase();

  // Fire all requests in parallel — 4 independent API calls
  const [txRes, internalRes, tokenRes, balanceRes] = await Promise.allSettled([
    etherscanCall({
      module: "account", action: "txlist", address,
      startblock: "0", endblock: "99999999",
      page: "1", offset: "25", sort: "desc",
    }),
    etherscanCall({
      module: "account", action: "txlistinternal", address,
      startblock: "0", endblock: "99999999",
      page: "1", offset: "10", sort: "desc",
    }),
    etherscanCall({
      module: "account", action: "tokentx", address,
      startblock: "0", endblock: "99999999",
      page: "1", offset: "15", sort: "desc",
    }),
    etherscanCall({
      module: "account", action: "balance", address, tag: "latest",
    }),
  ]);

  // Parse txlist
  const txs: Array<Record<string, string>> =
    txRes.status === "fulfilled" &&
    (txRes.value as { status: string; result: unknown }).status === "1" &&
    Array.isArray((txRes.value as { result: unknown }).result)
      ? (txRes.value as { result: Array<Record<string, string>> }).result
      : [];

  // Parse internal txs
  const internalTxs: Array<Record<string, string>> =
    internalRes.status === "fulfilled" &&
    Array.isArray((internalRes.value as { result: unknown }).result)
      ? (internalRes.value as { result: Array<Record<string, string>> }).result
      : [];

  // Parse token transfers
  const tokenTxs: Array<Record<string, string>> =
    tokenRes.status === "fulfilled" &&
    Array.isArray((tokenRes.value as { result: unknown }).result)
      ? (tokenRes.value as { result: Array<Record<string, string>> }).result
      : [];

  // Parse balance
  const balRaw: string =
    balanceRes.status === "fulfilled"
      ? String((balanceRes.value as { result: string }).result ?? "0")
      : "0";
  const ethBalance = /^\d+$/.test(balRaw) ? parseInt(balRaw, 10) : 0;

  const txCount = txs.length;

  // --- Tornado Cash interaction ---
  const hasTornadoInteraction =
    txs.some((tx) =>
      TORNADO_ADDRS.has(tx.to?.toLowerCase() ?? "") ||
      TORNADO_ADDRS.has(tx.from?.toLowerCase() ?? ""),
    ) ||
    internalTxs.some((tx) =>
      TORNADO_ADDRS.has(tx.to?.toLowerCase() ?? "") ||
      TORNADO_ADDRS.has(tx.from?.toLowerCase() ?? ""),
    );

  // --- Drainer pattern ---
  // A drainer contract primarily calls transferFrom/approve/setApprovalForAll
  // outbound from the contract address
  const outgoingTxs = txs.filter((tx) => tx.from?.toLowerCase() === addrLower);
  const drainerCallCount = outgoingTxs.filter((tx) =>
    DRAINER_FUNCTION_SIGS.has(tx.input?.slice(0, 10)?.toLowerCase() ?? ""),
  ).length;
  const hasDrainerPattern =
    outgoingTxs.length > 0 &&
    drainerCallCount / outgoingTxs.length > 0.4; // >40% drainer calls

  // --- Mixer pattern ---
  // Many outgoing txs with identical ETH values (not zero)
  const outgoingWithValue = outgoingTxs.filter((tx) => tx.value !== "0");
  let hasMixerPattern = false;
  if (outgoingWithValue.length >= 5) {
    const values = outgoingWithValue.map((tx) => tx.value);
    const uniqueValues = new Set(values);
    const mostCommon = Math.max(
      ...[...uniqueValues].map((v) => values.filter((x) => x === v).length),
    );
    hasMixerPattern = mostCommon / values.length > 0.6;
  }

  // --- Scam token detection ---
  const tokenNames = tokenTxs.map((tx) =>
    (tx.tokenName ?? "").toLowerCase(),
  );
  const hasScamTokens = tokenNames.some((name) =>
    SCAM_TOKEN_KEYWORDS.some((kw) => name.includes(kw)),
  );

  // --- Deployer reputation ---
  // Find the creation tx (earliest tx where 'to' is empty = contract creation)
  let deployedByUnverified = false;
  const creationTx = txs
    .slice()
    .reverse()
    .find((tx) => tx.to === "" || tx.to === null);
  if (creationTx?.from) {
    // Check if the deployer itself is a known-bad address or unverified contract
    const deployerLower = creationTx.from.toLowerCase();
    const isKnownBadDeployer = Boolean(KNOWN_BAD[deployerLower]);
    if (!isKnownBadDeployer) {
      // Check if deployer is itself a contract (unverified is suspicious)
      try {
        const deployerInfo = await getContractInfo(creationTx.from);
        deployedByUnverified = deployerInfo.isContract && !deployerInfo.isVerified;
      } catch {
        deployedByUnverified = false;
      }
    } else {
      deployedByUnverified = true;
    }
  }

  return {
    txCount,
    hasDrainerPattern,
    hasTornadoInteraction,
    hasMixerPattern,
    hasScamTokens,
    deployedByUnverified,
    ethBalance,
  };
}

// ---- Label derivation from contract name ----

function deriveLabelFromContractName(name: string): { label: string; slug: string } | null {
  const n = name.toLowerCase();
  if (n.includes("uniswap") || n.includes("sushiswap") || n.includes("curve") ||
      n.includes("aave") || n.includes("compound") || n.includes("yearn") ||
      n.includes("balancer") || n.includes("1inch")) {
    return { label: `DeFi Protocol: ${name}`, slug: "defi" };
  }
  if (n.includes("usdc") || n.includes("usdt") || n.includes("dai") ||
      n.includes("weth") || n.includes("wbtc") || n.includes("token")) {
    return { label: `Token: ${name}`, slug: "token" };
  }
  if (n.includes("multisig") || n.includes("gnosis") || n.includes("safe")) {
    return { label: `Multisig: ${name}`, slug: "contract" };
  }
  if (n.includes("nft") || n.includes("erc721") || n.includes("erc1155")) {
    return { label: `NFT Contract: ${name}`, slug: "contract" };
  }
  return { label: name, slug: "contract" };
}

// ---- Main agent ----

const EMPTY_BEHAVIOUR: BehaviourAnalysis = {
  txCount: 0,
  hasDrainerPattern: false,
  hasTornadoInteraction: false,
  hasMixerPattern: false,
  hasScamTokens: false,
  deployedByUnverified: false,
  ethBalance: 0,
};

export async function runEtherscanAgent(wallet: string): Promise<EtherscanResult> {
  const addrLower = wallet.toLowerCase();

  // Step 1: Known-bad DB — instant hit, still run contract info in parallel
  const knownEntry = KNOWN_BAD[addrLower];
  if (knownEntry) {
    const [contractInfo, behaviour] = await Promise.allSettled([
      getContractInfo(wallet),
      analyseBehaviour(wallet),
    ]);
    const c = contractInfo.status === "fulfilled"
      ? contractInfo.value
      : { isContract: false, isVerified: false, contractName: null };
    const b = behaviour.status === "fulfilled" ? behaviour.value : EMPTY_BEHAVIOUR;

    return {
      label: knownEntry.label,
      slug: knownEntry.slug,
      isContract: c.isContract,
      isVerified: c.isVerified,
      hasDrainerPattern: b.hasDrainerPattern,
      hasTornadoInteraction: b.hasTornadoInteraction || knownEntry.slug === "tornado-cash",
      hasMixerPattern: b.hasMixerPattern || knownEntry.slug === "tornado-cash",
      hasScamTokens: b.hasScamTokens,
      deployedByUnverified: b.deployedByUnverified,
      txCount: b.txCount,
      ethBalance: b.ethBalance,
    };
  }

  // Step 2: Full API analysis in parallel
  const [contractInfo, behaviour] = await Promise.allSettled([
    getContractInfo(wallet),
    analyseBehaviour(wallet),
  ]);

  const c = contractInfo.status === "fulfilled"
    ? contractInfo.value
    : { isContract: false, isVerified: false, contractName: null };
  const b = behaviour.status === "fulfilled" ? behaviour.value : EMPTY_BEHAVIOUR;

  // Step 3: Derive label
  let label: string | null = null;
  let slug: string | null = null;

  if (b.hasTornadoInteraction) {
    label = "Tornado Cash Interaction";
    slug = "tornado-cash";
  } else if (b.hasDrainerPattern && c.isContract && !c.isVerified) {
    label = "Phish / Hack";
    slug = "phish-hack";
  } else if (b.hasMixerPattern) {
    label = "Mixer Pattern Detected";
    slug = "mixer";
  } else if (c.isVerified && c.contractName) {
    const derived = deriveLabelFromContractName(c.contractName);
    if (derived) { label = derived.label; slug = derived.slug; }
  }

  return {
    label,
    slug,
    isContract: c.isContract,
    isVerified: c.isVerified,
    hasDrainerPattern: b.hasDrainerPattern,
    hasTornadoInteraction: b.hasTornadoInteraction,
    hasMixerPattern: b.hasMixerPattern,
    hasScamTokens: b.hasScamTokens,
    deployedByUnverified: b.deployedByUnverified,
    txCount: b.txCount,
    ethBalance: b.ethBalance,
  };
}
