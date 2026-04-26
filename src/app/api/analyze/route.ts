// ============================================================
// SafeOrSus — /api/analyze Route Handler
// ============================================================
// Accepts a wallet address (0x...) or ENS name (*.eth, *.xyz, *.id).
// ENS names are resolved to addresses by the orchestrator.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { orchestrateAnalysis, isValidInput } from "@/lib/orchestrator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accept both "wallet" and "query" fields for flexibility
    const input = (body.wallet ?? body.query ?? "").trim();

    if (!input) {
      return NextResponse.json(
        { error: "wallet address or ENS name is required" },
        { status: 400 },
      );
    }

    if (!isValidInput(input)) {
      return NextResponse.json(
        {
          error:
            "Invalid input. Provide a valid Ethereum address (0x + 40 hex chars) or ENS name (e.g. vitalik.eth).",
        },
        { status: 400 },
      );
    }

    const result = await orchestrateAnalysis(input);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const input = (searchParams.get("wallet") ?? searchParams.get("query") ?? "").trim();

  if (!input) {
    return NextResponse.json(
      { error: "wallet or query param required" },
      { status: 400 },
    );
  }

  if (!isValidInput(input)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address or ENS name" },
      { status: 400 },
    );
  }

  try {
    const result = await orchestrateAnalysis(input);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
