<p>
  <img src="docs/assets/flowtrace-header.svg" width="100%" alt="FlowTrace — NEAR Agent Toolkit" />
</p>

**English** · [简体中文](README.zh-CN.md)

**NEAR account and payment checks for people and AI agents.**

Give FlowTrace an account ID or transaction details. It reads NEAR mainnet data and returns a report about balances, permissions, payments or transfer conditions. Use the web console yourself, or let an agent call the same checks through MCP.

[Try the demo →](https://www.darkchunk.win/collect/agent/)　[Developer guide →](docs/INTEGRATION.md)

## Project status

| Area | Available today |
| --- | --- |
| Version | **v0.4 · MVP demo** |
| Network | **NEAR mainnet**, queried on demand through RPC |
| Interfaces | Manual web forms, AI chat, MCP and REST API |
| Assets | Native NEAR, plus USDC, USDT and wNEAR |
| Verification | 76 tests passed for the v0.4 baseline; [mainnet checks](examples/account-changes-verification.json) are recorded separately |

**This is an on-demand checking tool. Continuous monitoring, automatic alerts and arbitrage execution are not implemented.**

## What you can do

### 1. Inspect an account

- **Input:** A NEAR account ID.
- **Output:** Native NEAR and three supported FT balances, plus direct access keys and their permissions.
- **Use it for:** Understanding account assets and which keys can act on the account.

### 2. Compare account changes

- **Input:** An account ID and a lookback in block heights, default 100.
- **Output:** Net balance changes, added or removed keys, permission changes and contract-code hashes across two finalized blocks.
- **Use it for:** Checking recent state changes, with both block anchors available for review.

### 3. Investigate a payment

- **Input:** An expected amount, asset, recipient, transaction hash, sender and other payment-claim details.
- **Output:** A comparison between the claim and net FT events in that transaction, with optional 1Click channel status.
- **Use it for:** Investigating whether a specific payment matches an expected receipt.

### 4. Check an FT transfer before wallet review

- **Input:** Sender, recipient, USDC / USDT / wNEAR, amount and an optional per-request amount limit.
- **Output:** Balance, recipient, token-storage and fee-reserve checks, plus an optional unsigned template.
- **Use it for:** Finding missing conditions before handing a transfer to a wallet for review.

These **4 workflows** use **8 MCP tools**. They share the same backend rules across all interfaces.

## Try it

Start with a public example. No wallet connection is needed:

1. Open [Account changes](https://www.darkchunk.win/collect/agent/#changes).
2. Click **填入公开示例** (Fill public example), then **查询两个区块并核对** (Compare).
3. Review both block anchors, the actual time interval and each change. Download the JSON report if needed.

Or open [chat](https://www.darkchunk.win/collect/agent/) and ask:

> Compare the balance and permission changes of wrap.near over the last 100 block heights.

Manual forms remain available if chat reaches its quota or the model is unavailable. The web interface is currently in Chinese; API identifiers are in English.

### Preview

[![FlowTrace account-change report showing block anchors, balance deltas and permission checks](docs/assets/account-changes.png)](https://www.darkchunk.win/collect/agent/#changes)

*Captured on November 3, 2026, from one public-account query for wrap.near. This is a historical screenshot, not a live view.*

## How data reaches the report

**Your question → Web / Agent → Shared checks → NEAR mainnet RPC → Report**

- Account reads use finalized block anchors; comparisons read state at two blocks.
- Payment checks can also read 1Click status. Channel status and on-chain receipt evidence are reported separately.
- Reports preserve blocks, sources, query times, exact amounts and unknown results. AI selects tools and explains the results.

## Current scope

- **Comparisons show net differences between two snapshots.** They are not transaction histories; zero net movement does not establish inactivity.
- **Preflight still requires wallet review.** This version does not hold keys, sign, broadcast, swap or refund.
- **Asset coverage is fixed.** Other tokens, NFTs, staking-pool shares and Intents internal balances are not included.
- **Results have specific limits.** A key change does not establish theft. A payment check does not prove invoice ownership or full cross-chain settlement. Preflight is not contract simulation or an execution guarantee.

<details>
<summary>Data handling and public-service limits</summary>

- Chat messages and needed tool results go to OpenAI; the service does not persist chat bodies. Manual checks do not use a model.
- Imported orders stay in the browser's unencrypted localStorage. Never enter wallet secrets or API keys.
- Public endpoints have rate and concurrency limits and no production SLA. RPC data is an upstream observation, not an independent light-client proof.
- Historical-data failures remain unknown, rather than being treated as zero balances or no changes.
- A per-request amount limit is an input rule, not an on-chain spending cap. FunctionCall key allowance is a gas budget.

See the [full data and integration notes](public/agent/guide.md) (Chinese).

</details>

## Develop and contribute

| Your next step | Start here |
| --- | --- |
| Run locally, connect MCP or call REST | [Developer guide](docs/INTEGRATION.md) |
| Inspect all 8 tools and parameters | [Full parameter guide](public/agent/guide.md) (Chinese) · [Live catalog](https://www.darkchunk.win/collect/api/agent/catalog) |
| Give an agent operating rules | [Companion Skill](public/agent/skills/near-agent-ops/SKILL.md) |
| Review tests and historical evidence | [Account-change verification](examples/account-changes-verification.json) · [Offline payment replay](examples/README.md) |
| Report a bug or contribute | [Contributing](CONTRIBUTING.md) |

Next steps include watchlists, scheduled collection, change notifications, transaction-history indexing and merchant order integration. **These features are not yet available.**

---

Built for NEAR HACKATHON 2026 with AI coding assistance. Submission is pending; see [submission preparation](public/agent/submission.md). The existing domain is hosting infrastructure; the earlier market dashboard is not a source or runtime dependency.

FlowTrace uses the official MCP SDK, OpenAI Agents SDK, Zod, NEAR RPC, NearBlocks sample discovery and optional 1Click status. Dependencies retain their own licenses. [MIT](LICENSE) · FlowTrace contributors.
