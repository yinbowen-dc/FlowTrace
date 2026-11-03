<p align="center">
  <a href="https://www.darkchunk.win/collect/agent/"><img src="docs/assets/flowtrace-hero.png" width="100%" alt="FlowTrace — Give your agent onchain eyes" /></a>
</p>

<h2 align="center">Give your agent onchain eyes.</h2>
<p align="center">Ask about accounts. Spot state changes. Check transfers before wallet review.</p>
<p align="center">
  <a href="https://www.darkchunk.win/collect/agent/"><strong>🚀 Try it live</strong></a> ·
  <a href="#-what-just-changed-in-this-account">🎬 Watch the demo</a> ·
  <a href="#-give-your-own-agent-the-tools">🧩 Connect your agent</a> ·
  <a href="README.zh-CN.md">简体中文</a>
</p>
<p align="center"><strong>NEAR mainnet</strong> · 8 MCP tools · <a href="LICENSE">MIT</a></p>

## 👁️ Close the tab. Come back to the changes.

Add an account to your watchlist. The server checks balances, keys and code approximately every three minutes and records changes that meet your rules. **Collection continues while the browser is closed**, for a renewable 24-hour observation lease. Pause, resume and export reports from the console.

Up to three accounts per browser session. Incomplete observations preserve the last complete baseline. These are snapshot differences, not full transaction histories or theft detection.

[![Real mainnet watchlist and automatically collected change event](docs/assets/account-watch.png)](https://www.darkchunk.win/collect/agent/#watch)

<sub>Production capture, November 3, 2026. Two public accounts and a real background change event; values are historical.</sub>

**[Start account observation →](https://www.darkchunk.win/collect/agent/#watch)** · [Rules, data and deployment](docs/WATCH.md)

## 🔎 What just changed in this account?

Did the balance move? Was a key added? Did the contract code change?

Give FlowTrace an account ID. Get **net balance changes, access-key changes and code-hash differences** in one report, with both finalized block anchors ready for review.

[![Real mainnet account-comparison walkthrough](docs/assets/account-changes-demo.gif)](https://www.darkchunk.win/collect/agent/?demo=changes#manual)

<sub>Real mainnet capture, November 3, 2026. Waiting time is compressed. Two snapshots show net differences, not a full transaction history.</sub>

**[Try it with wrap.near →](https://www.darkchunk.win/collect/agent/?demo=changes#manual)**

## 🗣️ Ask a question. Let the agent check.

Drop this into chat:

```text
Compare the balance and permission changes of wrap.near over the last 100 block heights.
```

The agent calls real tools and returns results, block heights and an expandable tool trace. Open the same result in the manual panel when you want a closer look.

<p align="center">
  <img src="docs/assets/agent-chat.png" width="660" alt="Real agent conversation calling compare_account and returning balances, permissions and block anchors" />
</p>

<sub>Actual tool call captured on November 3, 2026. Values are historical; the web UI is currently in Chinese.</sub>

**[Open chat and ask your question →](https://www.darkchunk.win/collect/agent/#chat)**

## 🛑 Sending 0.01 with a 0.001 request limit?

Flag the mismatch before wallet review.

FlowTrace checks **FT balances, recipient existence, token storage, fee reserves and a per-request amount limit**. This public example actually returns a blocked preflight:

[![Real blocked preflight: 0.01 wNEAR requested against a 0.001 wNEAR request limit](docs/assets/transfer-preflight.png)](https://www.darkchunk.win/collect/agent/?demo=limit#manual)

<sub>A read-only rules check. The amount limit applies to this preflight input; it is not an on-chain authorization or spending cap.</sub>

Checks can produce an **unsigned template** for wallet review. Funds and signing stay with your wallet.

**[Open the amount-limit example →](https://www.darkchunk.win/collect/agent/?demo=limit#manual)**

## 💸 “Does this receipt match what we agreed?”

Provide the expected amount, asset, recipient and target transaction. FlowTrace checks the transaction's **net FT events**, lists mismatches and missing evidence, and can also read **1Click channel status**.

Useful for payment troubleshooting, merchant-reconciliation prototypes and agents that need payment evidence. Order association is declared by the caller; channel status and merchant receipt are checked separately.

**[Try the historical payment example →](https://www.darkchunk.win/collect/agent/?demo=receipt#manual)**

## 🧩 Give your own agent the tools

The same checks work in the browser and in clients that support HTTP MCP:

```json
{
  "mcpServers": {
    "flowtrace": {
      "url": "https://www.darkchunk.win/collect/mcp"
    }
  }
}
```

**Inspect → compare → investigate → preflight.** Structured results help your agent continue the task and help you download the evidence for review.

<details>
<summary><strong>Explore all 8 MCP tools</strong></summary>

| Tool | What it does |
| --- | --- |
| `near_network_status` | Mainnet status and final block anchor |
| `near_account_overview` | NEAR, USDC, USDT and wNEAR balances |
| `near_account_permissions` | Direct account access keys and permissions |
| `near_account_changes` | Balance, key and code changes across two blocks |
| `near_verify_receipt` | Net FT events in a finalized transaction |
| `intents_get_status` | 1Click channel-status report |
| `near_investigate_payment` | Payment claim, receipt evidence and optional channel status |
| `near_transfer_preflight` | FT transfer checks and an unsigned wallet template |

</details>

[Local setup / stdio / REST →](docs/INTEGRATION.md) · [Full parameters →](public/agent/guide.md) · [Companion Skill →](public/agent/skills/near-agent-ops/SKILL.md)

## 🚀 Take it for a spin

1. Open the [live demo](https://www.darkchunk.win/collect/agent/?demo=changes#manual). No wallet connection needed.
2. Click **填入公开示例** (Fill public example), then **查询两个区块并核对** (Compare).
3. Review the changes and blocks. Download your first JSON report.

Want your own instance? **Node.js 22.16+**, then:

```sh
git clone https://github.com/yinbowen-dc/FlowTrace.git
cd FlowTrace
npm ci
WATCH_DB_PATH=./runtime/watch.sqlite npm start
```

Open **http://127.0.0.1:8804/agent/**. Manual forms, MCP and REST need no model key. AI chat uses server-side configuration; see the [integration guide](docs/INTEGRATION.md).

## 🛠️ Working today. More to build.

This is **v0.5.0 MVP**: web chat, manual checks, 8 MCP tools and 4 workflows are implemented. The v0.5.0 release passed **96 tests**; mainnet, MCP-client and real model-tool checks were performed separately.

Server-side watchlists, periodic snapshots and in-app events are now available. Transaction-history indexing and merchant order integration are next; those extensions are not implemented.

[Plan →](docs/PLAN.md) · [v0.5.0 release →](docs/RELEASE-v0.5.0.md) · [Ideas and bugs →](https://github.com/yinbowen-dc/FlowTrace/issues) · [Contribute →](CONTRIBUTING.md) · [Mainnet verification →](examples/account-changes-verification.json) · [Offline payment evidence →](examples/README.md)

<details>
<summary>Before you use it: data, scope and limits</summary>

- MCP and manual tasks query on demand. Browser watches opt into leased server-side collection and in-app events; external notifications and arbitrage execution are not implemented.
- Account reports cover native NEAR plus USDC, USDT and wNEAR, not other tokens, NFTs, staking-pool shares or Intents internal balances.
- Comparisons show net snapshot differences. Zero net movement does not establish inactivity; a key change does not establish theft. Historical-data failures remain unknown.
- A payment check does not prove invoice ownership, full cross-chain settlement or source-chain refunds. Channel success alone is not merchant-receipt proof.
- Preflight is not simulation or an execution guarantee. FlowTrace does not hold keys, sign, broadcast, swap or refund. FunctionCall key allowance is a gas budget.
- Chat messages and needed tool results go to OpenAI; the service does not persist chat bodies. Opt-in watches store selected accounts, baselines and events in browser-session isolation; see [watch data handling](docs/WATCH.md). Imported orders remain in the browser's unencrypted localStorage. Never enter wallet secrets or API keys.
- Public endpoints have rate and concurrency limits and no production SLA. RPC data is an upstream observation, not an independent light-client proof. The web UI is currently in Chinese.

See the [full data and integration guide](public/agent/guide.md) (Chinese) and [visual asset notes](docs/assets/README.md).

</details>

---

Built for **NEAR HACKATHON 2026** with AI coding assistance. Submission is pending; see [preparation](public/agent/submission.md). The existing domain is hosting infrastructure; the earlier market dashboard is not a source or runtime dependency.

Uses the official MCP SDK, OpenAI Agents SDK, Zod, NEAR RPC, NearBlocks sample discovery and optional 1Click status, each under its own license. **[MIT](LICENSE) · FlowTrace contributors**
