// ============================================================
// SafeOrSus — ENS Agent
// ============================================================
// Resolves ENS names to Ethereum addresses (and reverse).
// Uses viem's built-in ENS support with the Cloudflare public
// mainnet RPC — no API key required.
//
// Forward:  "vitalik.eth"  → "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
// Reverse:  "0xd8dA..."    → "vitalik.eth"
// ============================================================

import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

// Public Ethereum RPC endpoints — tried in order
// The DRPC endpoint is free with no bot-check
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http("https://eth.drpc.org", { timeout: 8_000 }),
});

export interface EnsResolutionResult {
  /** Original user input */
  input: string;
  /** Resolved Ethereum address */
  address: string | null;
  /** ENS name (forward input or reverse-looked-up) */
  ensName: string | null;
  /** True if the input was an ENS name and we resolved it to an address */
  wasResolved: boolean;
  error?: string;
}

/** Returns true if the input looks like an ENS name */
export function isEnsName(input: string): boolean {
  const t = input.trim().toLowerCase();
  return t.endsWith(".eth") || t.endsWith(".xyz") || t.endsWith(".id");
}

/** Returns true if the input is a valid 0x Ethereum address */
export function isEthAddress(input: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(input.trim());
}

/**
 * Main entry point.
 * - ENS input  → resolves to address + returns ENS name
 * - Address input → reverse-looks up ENS name (best-effort)
 */
export async function resolveEns(input: string): Promise<EnsResolutionResult> {
  const trimmed = input.trim();

  try {
    if (isEnsName(trimmed)) {
      return await forwardResolve(trimmed);
    }

    if (isEthAddress(trimmed)) {
      return await reverseResolve(trimmed);
    }

    return {
      input: trimmed,
      address: null,
      ensName: null,
      wasResolved: false,
      error: `"${trimmed}" is neither a valid ENS name nor an Ethereum address`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.warn("[ens-agent] Resolution error:", msg);
    // Graceful degradation: if input was already an address, return it as-is
    if (isEthAddress(trimmed)) {
      return { input: trimmed, address: trimmed, ensName: null, wasResolved: false, error: msg };
    }
    return { input: trimmed, address: null, ensName: null, wasResolved: false, error: msg };
  }
}

// ---- Forward: ENS name → address ----

async function forwardResolve(name: string): Promise<EnsResolutionResult> {
  let normalized: string;
  try {
    normalized = normalize(name);
  } catch {
    return {
      input: name,
      address: null,
      ensName: name,
      wasResolved: false,
      error: `"${name}" is not a valid ENS name`,
    };
  }

  const address = await publicClient.getEnsAddress({ name: normalized });

  if (!address) {
    return {
      input: name,
      address: null,
      ensName: normalized,
      wasResolved: false,
      error: `ENS name "${normalized}" has no address record`,
    };
  }

  return {
    input: name,
    address,
    ensName: normalized,
    wasResolved: true,
  };
}

// ---- Reverse: address → ENS name ----

async function reverseResolve(address: string): Promise<EnsResolutionResult> {
  // Best-effort — many addresses have no reverse record, that's fine
  let ensName: string | null = null;
  try {
    ensName = await publicClient.getEnsName({ address: address as `0x${string}` });
  } catch {
    // No reverse record — not an error
  }

  return {
    input: address,
    address,
    ensName: ensName ?? null,
    wasResolved: false,
  };
}
