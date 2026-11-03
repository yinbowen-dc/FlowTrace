# FlowTrace — NEAR Agent Operations

Check NEAR accounts, investigate a payment, and review a transfer before asking a wallet to sign. People, conversational agents, and MCP clients use the same deterministic backend, with timestamps, sources, and unresolved checks visible in each report.

**[Live agent console](https://www.darkchunk.win/collect/agent/)** · **[Payment investigation workspace](https://www.darkchunk.win/collect/)** · [Integration guide](public/agent/guide.md) · [Example evidence](examples/README.md)

Built for **NEAR HACKATHON**, November 2026. Suggested tracks: AI Security & Defense and Real-World Money. This repository contains a working application; competition submission is still pending.

## The problem

An agent can return a confident explanation while the underlying balance query failed, a payment has not finalized, or a transfer exceeds the user's stated limit. A channel's success status can also differ from what a merchant has actually received. FlowTrace keeps these checks explicit and returns evidence that a person or another tool can inspect.

## What works

| Workflow | Result |
| --- | --- |
| Inspect an account | Native NEAR and USDC/USDT/wNEAR balances plus direct access-key permissions, queried at one final block. Failed queries remain unknown. |
| Investigate a payment | Compare a declared order against the net standard FT events in one finalized NEAR transaction, with optional NEAR Intents 1Click status. |
| Preflight an FT transfer | Check balances, receiver existence and token registration, native storage/gas reserve, and an optional caller amount limit. Return checks and, where appropriate, an unsigned wallet template. |
| Talk to the service | An OpenAI Agents SDK agent calls those workflows. The UI exposes actual tool results and can transfer a report into the manual panel. |
| Integrate another agent | Seven tools over standard Streamable HTTP MCP or local stdio, three task APIs, and a downloadable Skill. |
| Recheck evidence | Download JSON and replay the payment rules locally with the included CLI. |

NEAR provides the account model, access-key permissions, final block anchors, FT events, token storage rules, and transaction data used by these checks. 1Click is an optional channel-status source; it is not independent proof of merchant receipt.

## Try it in three minutes

1. Open the [agent console](https://www.darkchunk.win/collect/agent/). Ask: `查询 wrap.near 的余额和公钥权限`. Expand the tool results and inspect the final block, sources, and balances.
2. Send the result to the manual panel or run the same account query directly there. Download its JSON report.
3. Ask: `预检从 wrap.near 到 v2.ref-finance.near 转 0.01 wNEAR，本次上限 0.001 wNEAR`. The amount exceeds the stated limit, so the report is blocked and contains no executable transfer template.
4. Open the payment workspace's explicitly labelled demo orders, or replay the included historical public receipt locally. The sample is not a real merchant order and does not establish invoice ownership.

`wrap.near` and `v2.ref-finance.near` are public example accounts. This project does not control them. These examples only query public information; they do not send transactions. If the AI provider is unavailable or a usage limit is reached, the manual forms and MCP workflows remain usable without a model key.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm start
# Open http://127.0.0.1:8804/agent/

npm test
npm run replay -- examples/public-receipt-evidence.json
```

The manual console, MCP, and task APIs need no AI key. For optional conversation, set a server-side `OPENAI_API_KEY` in a Git-ignored `.env.local`. Optional settings are `OPENAI_MODEL` (default `gpt-5.6-terra`) and `CHAT_DAILY_LIMIT` (default 40 attempts per UTC day, held in process memory). Never put a model key in frontend code.

Other settings: `HOST`, `PORT`, `BASE_PATH`, `ALLOWED_HOSTS`, and optional `ONECLICK_API_KEY` where required by the upstream provider. The deployment prefix is empty locally or, for example, `/collect`. An upstream timeout or authorization error is returned explicitly.

## Agent integration

Public HTTP MCP endpoint:

```json
{"mcpServers":{"flowtrace-near":{"url":"https://www.darkchunk.win/collect/mcp"}}}
```

Local stdio:

```json
{"mcpServers":{"flowtrace-near":{"command":"node","args":["/absolute/path/to/flowtrace/mcp/stdio.mjs"]}}}
```

Tool names: `near_network_status`, `near_account_overview`, `near_account_permissions`, `near_verify_receipt`, `intents_get_status`, `near_investigate_payment`, and `near_transfer_preflight`.

```sh
# With the local server running in another terminal:
npm run agent:demo

# Or let the example launch a stdio server:
npm run agent:demo -- --stdio --account wrap.near
```

`GET /api/agent/catalog` describes all inputs. `POST /api/agent/run` accepts `{task,input}` for `account_inspect`, `payment_investigate`, or `transfer_preflight`. See the [integration guide](public/agent/guide.md) for limits and exact fields. Monetary inputs are decimal strings and use exact atomic units internally.

## Architecture and verification

The browser and offline replay CLI share `public/lib/core.js`. `adapters.mjs` queries fixed NEAR mainnet RPC providers and optional 1Click status. `agent/service.mjs` implements deterministic workflows shared by REST and MCP. `agent/chat.mjs` connects the conversational interface to these same workflows using the official OpenAI Agents SDK. No model-generated code is executed.

The automated suite covers event-netting and receipt finality, order association, amount precision, upstream failures, task validation, transfer limits, chat tool grounding, and HTTP/stdio MCP. Tests use controlled fixtures. Live RPC and browser checks were performed separately during development; an old observation is not a current balance or a guarantee of upstream availability.

## Boundaries and data handling

- No key custody, transaction signing, broadcasting, swaps, refunds, or automated trading.
- Preflight is a rules check, not contract simulation or a guarantee of successful execution. The caller's amount limit is not an on-chain spending restriction. A FunctionCall key's gas allowance is not a token spending allowance.
- Fixed NEAR mainnet tokens only: USDC, USDT, and wNEAR. The account report is not a complete portfolio, security audit, staking report, or Intents internal-balance report.
- A payment check covers the declared order and one transaction. It does not prove source-chain settlement, refunds, invoice ownership, or aggregate every transfer to an account.
- RPC results are trusted upstream observations, not an independently verified light-client proof. File hashes check content integrity, not upstream authenticity.
- Orders stay in the browser's unencrypted localStorage. Queries send necessary public identifiers to fixed upstream services. Shared browsers can expose locally saved orders.
- Chat messages and needed tool results go to OpenAI. SDK remote tracing is disabled and Responses uses `store=false`; this service does not persist chat bodies. Do not enter wallet secrets or API keys.
- Public endpoints have rate and concurrency limits, and no production SLA. The chat's daily counter resets with the server process and is not a precise spending budget.

## Dependencies and development disclosure

This application was implemented with AI coding assistance. The FlowTrace application and agent interfaces were developed on November 3, 2026; the existing hosting/domain is only deployment infrastructure, and the earlier market dashboard is not a source-code or runtime dependency.

The lockfile pins official MCP SDK packages, OpenAI Agents SDK, and Zod. Those upstream libraries, Node.js, NEAR RPC, NearBlocks discovery, and 1Click are external services or existing dependencies, not original work claimed by this project. NearBlocks only discovers sample transaction identifiers; RPC receipts are queried again for verification. Imported fixtures are labelled public historical evidence or synthetic demonstrations.

## License

MIT; see [LICENSE](LICENSE). Dependency licenses remain with their respective owners.
