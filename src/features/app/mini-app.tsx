"use client";

import { useState, useEffect } from "react";
import { WalletInput } from "@/features/app/components/wallet-input";
import { AnalysisResultCard } from "@/features/app/components/analysis-result";
import type { AnalysisResult } from "@/features/app/types";

type AppState = "input" | "loading" | "result" | "error";

export function MiniApp() {
  const [state, setState] = useState<AppState>("input");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-scan if ?wallet= is in the URL (e.g. tapped from a bot reply embed)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const wallet = params.get("wallet");
    if (wallet) handleAnalyze(wallet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async (wallet: string) => {
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data as AnalysisResult);
      setState("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("input");
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="min-h-dvh bg-[#080b14] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Split shield icon */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
              {/* Shield left half - green */}
              <path
                d="M20 4L6 9V20C6 27.2 12.4 33.6 20 36V4Z"
                fill="#10b981"
                fillOpacity="0.2"
                stroke="#10b981"
                strokeWidth="1.5"
              />
              {/* Shield right half - red */}
              <path
                d="M20 4L34 9V20C34 27.2 27.6 33.6 20 36V4Z"
                fill="#ef4444"
                fillOpacity="0.2"
                stroke="#ef4444"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">SafeOrSus</h1>
            <p className="text-xs text-gray-500 mt-0.5">Wallet Risk Scanner</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* Idle/Input state */}
        {(state === "input" || state === "error") && (
          <>
            {/* Tagline */}
            <div className="text-center py-2">
              <p className="text-gray-300 text-sm font-medium">
                Know before you ape.
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Paste any Ethereum wallet to get an instant risk analysis.
              </p>
            </div>

            {/* Input */}
            <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <WalletInput
                onAnalyze={handleAnalyze}
                isLoading={false}
              />
            </div>

            {/* Error */}
            {state === "error" && errorMsg && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/8 px-4 py-3">
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <span>⚠️</span> {errorMsg}
                </p>
              </div>
            )}

            {/* How it works */}
            <div className="rounded-2xl border border-white/5 bg-white/2 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">
                How it works
              </p>
              <div className="space-y-3">
                {[
                  { icon: "🔍", label: "Etherscan scan", desc: "Checks labels & contract data" },
                  { icon: "🦋", label: "Farcaster lookup", desc: "Finds social identity" },
                  { icon: "⚖️", label: "Risk scoring", desc: "Deterministic 0–100 score" },
                ].map((step) => (
                  <div key={step.icon} className="flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">{step.icon}</span>
                    <div>
                      <p className="text-xs text-gray-300 font-medium">{step.label}</p>
                      <p className="text-xs text-gray-600">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Loading state */}
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-5">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 40 40" fill="none" className="w-20 h-20 animate-pulse">
                <path d="M20 4L6 9V20C6 27.2 12.4 33.6 20 36V4Z" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1.5"/>
                <path d="M20 4L34 9V20C34 27.2 27.6 33.6 20 36V4Z" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="1.5"/>
              </svg>
              <div className="absolute inset-0 rounded-full border-2 border-t-emerald-500 border-r-red-500 border-b-transparent border-l-transparent animate-spin" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-medium">Analyzing wallet...</p>
              <div className="space-y-1">
                {[
                  "Scanning Etherscan labels",
                  "Checking Farcaster identity",
                  "Computing risk score",
                ].map((step, i) => (
                  <p key={step} className="text-xs text-gray-600 flex items-center justify-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
                      style={{ animationDelay: `${i * 0.3}s` }}
                    />
                    {step}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Result state */}
        {state === "result" && result && (
          <AnalysisResultCard result={result} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
