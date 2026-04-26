"use client";

import { useState } from "react";
import { cn } from "@neynar/ui";

interface WalletInputProps {
  onAnalyze: (input: string) => void;
  isLoading: boolean;
}

const EXAMPLE_WALLETS = [
  { label: "vitalik.eth", address: "vitalik.eth" },
  { label: "0xd8dA...6045", address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
];

const ETH_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ENS_NAME_RE = /^[a-zA-Z0-9-]+\.(eth|xyz|id)$/i;

function validate(value: string): string {
  if (!value) return "Enter a wallet address or ENS name";
  const t = value.trim();
  if (!ETH_ADDRESS_RE.test(t) && !ENS_NAME_RE.test(t)) {
    return "Enter a valid Ethereum address (0x…) or ENS name (e.g. vitalik.eth)";
  }
  return "";
}

function getInputType(value: string): "address" | "ens" | "unknown" {
  const t = value.trim();
  if (ETH_ADDRESS_RE.test(t)) return "address";
  if (ENS_NAME_RE.test(t)) return "ens";
  return "unknown";
}

export function WalletInput({ onAnalyze, isLoading }: WalletInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const inputType = getInputType(value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    const err = validate(trimmed);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    onAnalyze(trimmed);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (error) setError("");
  };

  const handleExample = (address: string) => {
    setValue(address);
    setError("");
  };

  // Icon shown inside the input based on current input type
  const typeIndicator =
    inputType === "ens" ? (
      <span className="text-purple-400 text-xs font-bold">ENS</span>
    ) : inputType === "address" ? (
      <span className="text-emerald-400 text-xs">0x</span>
    ) : null;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
            Wallet Address or ENS Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={handleChange}
              placeholder="0x… or vitalik.eth"
              className={cn(
                "w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white placeholder-gray-600",
                "font-mono text-sm focus:outline-none focus:ring-2 transition-all",
                "pr-20",
                error
                  ? "border-red-500/60 focus:ring-red-500/30"
                  : inputType === "ens"
                    ? "border-purple-500/40 focus:ring-purple-500/30 focus:border-purple-500/50"
                    : inputType === "address"
                      ? "border-emerald-500/40 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                      : "border-white/10 focus:ring-emerald-500/30 focus:border-emerald-500/40",
              )}
              disabled={isLoading}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="none"
            />

            {/* Right-side indicator area */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {typeIndicator && !isLoading && (
                <span className="opacity-70">{typeIndicator}</span>
              )}
              {value && !isLoading && (
                <button
                  type="button"
                  onClick={() => { setValue(""); setError(""); }}
                  className="text-gray-500 hover:text-gray-300 transition-colors p-0.5 leading-none"
                  aria-label="Clear"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <span>⚠️</span> {error}
            </p>
          )}

          {/* ENS hint */}
          {inputType === "ens" && !error && (
            <p className="text-xs text-purple-400/70 flex items-center gap-1">
              <span>✦</span> ENS name will be resolved to address before analysis
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !value.trim()}
          className={cn(
            "w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200",
            "flex items-center justify-center gap-2",
            isLoading || !value.trim()
              ? "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"
              : inputType === "ens"
                ? "bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 active:scale-[0.98]",
          )}
        >
          {isLoading ? (
            <>
              <span className="animate-spin text-lg">⟳</span>
              <span>{inputType === "ens" ? "Resolving & Analyzing..." : "Analyzing..."}</span>
            </>
          ) : (
            <>
              <span>{inputType === "ens" ? "✦" : "🔍"}</span>
              <span>Analyze {inputType === "ens" ? "ENS Name" : "Wallet"}</span>
            </>
          )}
        </button>
      </form>

      {/* Quick examples */}
      <div>
        <p className="text-xs text-gray-600 mb-2">Try an example:</p>
        <div className="flex gap-2 flex-wrap">
          {EXAMPLE_WALLETS.map((ex) => (
            <button
              key={ex.address}
              onClick={() => handleExample(ex.address)}
              disabled={isLoading}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/5 hover:border-white/15 transition-all disabled:opacity-40 font-mono"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
