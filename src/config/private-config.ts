import "server-only";
import { z } from "zod";

const privateConfigSchema = z.object({
  neynarApiKey: z
    .string()
    .min(1, "NEYNAR_API_KEY environment variable is required"),
  coingeckoApiKey: z.string(),
  // Etherscan API V2 — wallet analysis
  etherscanApiKey: z.string().optional(),
  // Groq API — optional, enables LLM-generated summaries
  groqApiKey: z.string().optional(),
  // Neynar signer UUID — needed for the bot to post casts
  neynarSignerUuid: z.string().optional(),
  // Bot's Farcaster FID — prevents self-replies
  botFid: z.string().optional(),
  // Privy — bot wallet management
  privyAppId: z.string().optional(),
  privyAppSecret: z.string().optional(),
  privyBotWalletId: z.string().optional(),
});

export const privateConfig = privateConfigSchema.parse({
  neynarApiKey: process.env.NEYNAR_API_KEY || "",
  coingeckoApiKey: process.env.COINGECKO_API_KEY ?? "",
  etherscanApiKey: process.env.ETHERSCAN_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  neynarSignerUuid: process.env.NEYNAR_SIGNER_UUID || "",
  botFid: process.env.BOT_FID || "",
  privyAppId: process.env.PRIVY_APP_ID || "",
  privyAppSecret: process.env.PRIVY_APP_SECRET || "",
  privyBotWalletId: process.env.PRIVY_BOT_WALLET_ID || "",
});
