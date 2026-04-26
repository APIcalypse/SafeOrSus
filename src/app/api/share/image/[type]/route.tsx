import { NextRequest } from "next/server";
import { publicConfig } from "@/config/public-config";
import {
  getShareImageResponse,
  parseNextRequestSearchParams,
} from "@/neynar-farcaster-sdk/nextjs";

export const revalidate = 3600;

const { appEnv, heroImageUrl, imageUrl } = publicConfig;
const showDevWarning = appEnv !== "production";

interface RiskConfig {
  color: string;
  glow: string;
  bg: string;
  border: string;
  label: string;
  tagline: string;
}

const RISK_CONFIG: Record<string, RiskConfig> = {
  safe: {
    color: "#10b981",
    glow: "rgba(16,185,129,0.35)",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.4)",
    label: "SAFE",
    tagline: "This wallet looks clean ✓",
  },
  low: {
    color: "#34d399",
    glow: "rgba(52,211,153,0.35)",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.4)",
    label: "LOW RISK",
    tagline: "Mostly safe, minor flags",
  },
  medium: {
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.35)",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.4)",
    label: "MEDIUM RISK",
    tagline: "Proceed with caution ⚠️",
  },
  high: {
    color: "#ef4444",
    glow: "rgba(239,68,68,0.35)",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.4)",
    label: "HIGH RISK",
    tagline: "Suspicious activity detected 🚨",
  },
  critical: {
    color: "#ff3333",
    glow: "rgba(255,51,51,0.45)",
    bg: "rgba(255,51,51,0.12)",
    border: "rgba(255,51,51,0.5)",
    label: "CRITICAL",
    tagline: "Known threat — do not interact ☠️",
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;

  // For farcaster/promo types, serve the static promo image directly
  if (type === "farcaster" || type === "promo") {
    const baseUrl = request.nextUrl.origin;
    const promoUrl = `${baseUrl}/app-farcaster-image.png`;
    const promoRes = await fetch(promoUrl);
    const buffer = await promoRes.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const searchParams = parseNextRequestSearchParams(request);
  const score = parseInt(searchParams.score ?? "0", 10);
  const riskLevelRaw = (searchParams.riskLevel ?? "unknown").toLowerCase();
  const wallet = searchParams.wallet ?? "0x????...????";

  const cfg = RISK_CONFIG[riskLevelRaw] ?? {
    color: "#6b7280",
    glow: "rgba(107,114,128,0.3)",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.3)",
    label: "UNKNOWN",
    tagline: "Could not determine risk",
  };

  // Truncate long addresses; keep ENS names as-is
  const walletDisplay =
    wallet.startsWith("0x") && wallet.length > 16
      ? `${wallet.slice(0, 8)}...${wallet.slice(-6)}`
      : wallet.length > 24
        ? `${wallet.slice(0, 22)}...`
        : wallet;

  // SVG arc ring — r=44, circ ≈ 276.5
  const CIRC = 276.5;
  const filled = Math.max(4, (score / 100) * CIRC);
  const gap = CIRC - filled;

  return getShareImageResponse(
    { type, heroImageUrl, imageUrl, showDevWarning },
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: "#07070d",
        fontFamily: "sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow blob */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "22%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${cfg.glow} 0%, transparent 70%)`,
          display: "flex",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* ── TOP BAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "36px 52px 0",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
              fontSize: 26,
            }}
          >
            🛡
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "white",
                letterSpacing: 0.5,
                lineHeight: 1,
              }}
            >
              SafeOrSus
            </span>
            <span
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.35)",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              Wallet Risk Scanner
            </span>
          </div>
        </div>

        {/* Risk badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            backgroundColor: cfg.bg,
            border: `2px solid ${cfg.border}`,
            borderRadius: 100,
            padding: "12px 28px",
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: cfg.color,
              display: "flex",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: cfg.color,
              letterSpacing: 2,
            }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* ── MAIN ROW ── */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          padding: "0 52px",
          gap: 56,
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Score ring */}
        <div
          style={{
            display: "flex",
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: 200,
            height: 200,
          }}
        >
          <svg
            width="200"
            height="200"
            viewBox="0 0 100 100"
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="7"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={cfg.color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${gap}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
            }}
          >
            <span
              style={{
                fontSize: 72,
                fontWeight: 900,
                color: cfg.color,
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontSize: 16,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: 1,
              }}
            >
              / 100
            </span>
          </div>
        </div>

        {/* Right column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
          }}
        >
          {/* Tagline */}
          <span
            style={{
              fontSize: 34,
              fontWeight: 800,
              color: "white",
              lineHeight: 1.2,
            }}
          >
            {cfg.tagline}
          </span>

          {/* Wallet pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "14px 20px",
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                backgroundColor: cfg.color,
                display: "flex",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.7)",
                fontFamily: "monospace",
                letterSpacing: 1,
              }}
            >
              {walletDisplay}
            </span>
          </div>

          {/* CTA */}
          <span
            style={{
              fontSize: 18,
              color: "rgba(167,139,250,0.8)",
              letterSpacing: 0.5,
            }}
          >
            Scan any wallet → SafeOrSus
          </span>
        </div>
      </div>

      {/* ── BOTTOM STRIP ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 52px 30px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.18)",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Know before you ape.
        </span>
      </div>
    </div>,
  );
}
