# 🛡️ Safe or Sus

**Safe or Sus** is an AI-powered Farcaster mini app that analyzes **Ethereum addresses and ENS names** to determine whether they are **safe or suspicious**.

It combines **onchain data, scam intelligence, social identity, and public labels** into a single, human-readable trust score.

---

## 🚀 The Problem

In Web3, users constantly interact with unknown wallets.

But:
- Blockchain data is hard to interpret  
- Scam signals are fragmented  
- Trust is unclear  

👉 Users are forced to guess.

---

## 💡 The Solution

**Safe or Sus transforms fragmented signals into a simple decision:**

> ✅ Safe  
> ⚠️ Suspicious  

By combining:
- Deterministic risk scoring  
- AI-powered explanations  
- Social identity signals  
- Scam intelligence  
- Public onchain labels  

---

## ✨ Key Features

- 🔍 **Address & ENS Analysis**  
  Input any Ethereum address or ENS name (auto-resolved)

- ⚡ **AI Explanations (Groq)**  
  Fast, human-readable summaries powered by Groq

- 🧮 **Deterministic Risk Score**  
  Transparent rule-based scoring system

- 🚨 **Scam Detection (ScamSniffer)**  
  Detects known malicious addresses

- 🏷️ **Etherscan Labels**  
  Extracts known labels (e.g. exchange, flagged entities)

- 🧑‍🤝‍🧑 **Social Trust Signals**
  - Farcaster identity detection  
  - X (Twitter) linkage  
  - Follower count as reputation signal  

- 🤖 **Farcaster Bot Integration**
  - Analyze wallets directly from casts  
  - Instant replies with results + app link  

---

## 🧠 How It Works

1. **Input**
   - Ethereum address or ENS name  

2. **Resolution**
   - ENS → address  

3. **Analysis Pipeline**

   - 🧮 Deterministic scoring (rules & heuristics)  
   - 🚨 ScamSniffer check  
   - 🏷️ Etherscan label extraction  
   - 🧑‍🤝‍🧑 Social identity lookup (Farcaster + X)  
   - ⚡ AI summarization (Groq)  

4. **Output**

   - ✅ Safe / ⚠️ Suspicious  
   - 📊 Risk score  
   - 🧠 Explanation  
   - 🧑‍🤝‍🧑 Social context  
   - 🏷️ Known labels  

---

## 🤖 Farcaster Bot Integration

Safe or Sus works as a **real-time security assistant inside Farcaster**.

### Example Flow

1. A user mentions the bot:
hey @douxiiie check this wallet
0x13b093EAfA3878De27183388Fea7D0D2B0AbF9E


2. The bot replies instantly with:

- 🔴 Risk Score (e.g. 65/100 — HIGH)  
- 🧠 AI explanation  
- 🚨 ScamSniffer status  
- 🏷️ Etherscan labels  
- 🧑‍🤝‍🧑 Social identity info  

3. User clicks through to the mini app for full analysis

---

## ⚡ What Makes It Different

Most tools show **raw blockchain data**.

**Safe or Sus provides:**

- 🧠 Interpretation (AI)  
- 🧮 Transparency (deterministic logic)  
- 🌐 Context (social + labels + scam data)  

👉 A complete **trust layer for wallets**

---

## 🎯 Use Cases

- Before interacting with a wallet  
- Evaluating unknown senders  
- Avoiding scams & phishing  
- Learning Web3 security intuitively  

---

## 🛠️ Tech Stack

- **Frontend:** Next.js + React
- **Web3:** Wagmi + Viem  
- **AI:** Groq (LLM inference)  
- **Farcaster:** Mini App SDK + Neynar  
- **Database:** Drizzle ORM + PostgreSQL  
- **Data Sources:** ScamSniffer + Etherscan  

---

## 🔐 Impact

- Reduces user risk  
- Makes Web3 more accessible  
- Bridges **technical data → human understanding**

---

## 🔮 Future Work

- 🤖 Automated webhook bot (full conversational assistant)  
- 🏆 Wallet reputation over time  
- 🔗 Transaction behavior analysis  
- 🌐 Cross-chain support  
- 🤖 Advanced AI risk detection  
- 🎁 Community-driven scam reporting  

---

## 🏆 Built for FarHack Online 2026

Safe or Sus explores how to unify fragmented trust signals into a single decision layer inside Farcaster.


## 💡 Tagline

> Know before you ape.
