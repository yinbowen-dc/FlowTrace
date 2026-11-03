# Payment operations · v0.6

[Open workspace](https://www.darkchunk.win/collect/agent/payments/)

## Product flow

Save a payment claim, link a NEAR transaction and its signer, then explicitly request verification. The server uses the existing deterministic `payment_investigate` workflow to obtain finalized FT event evidence. Saving an order never queries the chain or confirms payment.

The workspace shows declared amount, verified NEAR net receipt, difference, merchant-record declaration, optional 1Click status and missing source-chain evidence. USDC, USDT and wNEAR are supported. A built-in historical example uses a real 103.463854 USDC receipt with a constructed 104 USDC claim; it is not a real customer invoice.

## Persistence and identity

- Anonymous browser sessions use a separate `flowtrace_payments` HttpOnly, SameSite=Strict cookie, with Secure on public hosts. Only its SHA-256 hash is stored. Existing account-watch sessions are unaffected.
- Orders, associations, check snapshots and audit records are stored server-side. Clearing site data loses access; there is no cross-device login or recovery flow.
- Sessions expire after seven days without access. Expired data is cleaned on later order creation; this is not a permanent accounting ledger.
- Each session may retain 20 orders including archives; the public service allows 100 sessions and 200 orders globally. Each order retains ten check reports and thirty audit entries. Reports are capped at 96 KiB, with at most 100 receipt claim keys.
- Archive is reversible and retains receipt claims and history. There is no deletion action in this version. Export contains the selected record and its retained history, not the cookie.

## What the evidence means

Order ownership, merchant state and the association between an order, transaction and channel address are caller declarations. A NEAR receipt does not independently prove invoice ownership. Unknown merchant state stays unknown; the app does not connect to a merchant database.

The same verified FT event, asset and recipient referenced by multiple retained orders in one session flags all affected orders, including archives. Different sessions are isolated. This is a review signal; it does not prove a globally unique payment, support partial allocation or automatically reject an on-chain transaction.

Receipt associations and merchant-state edits increment the order revision and invalidate its current report. Previous reports retain their original inputs. In-flight results cannot overwrite newer links or an archived order. Checks are explicitly requested, globally limited to two concurrent jobs and spaced at least thirty seconds apart per order.

Query failures produce unknown results and retain prior checks as history. Existing verified receipt claims survive a failed recheck. Oversized results produce a compact unknown report instead of keeping a stale confirmed result. Neither 1Click SUCCESS nor REFUNDED independently confirms NEAR receipt or source-chain refund. Source-chain identifiers are stored as investigation leads, without external-chain verification in this release.

No custody, signing, broadcasting, payment, refund, arbitrage execution, external notification or automatic recheck is performed. The eight existing MCP tools and four workflows remain on-demand; persistent order APIs are scoped to the browser session and are not exposed as unauthenticated MCP tools.

## Deployment

Node.js 22.16+ is required. Set `PAYMENTS_DB_PATH` to a private SQLite path. When only `WATCH_DB_PATH` is set, the server automatically uses `payments.sqlite` in the same directory, preserving the existing persistent-volume deployment. Do not place databases under `public/`. The Docker image includes the new `payments/` modules; runtime data remains outside the image.

```sh
WATCH_DB_PATH=./runtime/watch.sqlite npm start
```

This enables both databases. Only `PAYMENTS_DB_PATH=./runtime/payments.sqlite` enables the payment workspace without account observation. Back up live SQLite databases with the supported backup mechanism, including committed WAL data.

## Session-scoped HTTP APIs

Paths sit beneath the deployment prefix, e.g. `/collect`. Bodies are strict JSON; cookies are never URL parameters or body fields. Normal same-origin, host, rate and concurrency checks apply.

| Method | Endpoint | Body |
| --- | --- | --- |
| GET | `/api/payments/status` | None; anonymous requests allocate nothing |
| POST | `/api/payments/create` | `{reference, recipient, asset, expectedAmount, createdAt, dueAt, links?}` |
| POST | `/api/payments/detail` | `{id}` |
| POST | `/api/payments/link` | `{id, revision, links}`; replaces associations, invalidates current report |
| POST | `/api/payments/check` | `{id, revision}`; reads fixed upstream services and saves a check |
| POST | `/api/payments/archive` | `{id, revision, archived}` |

`links` may include paired `txHash`/`senderAccountId`, `merchantStatus`, `depositAddress`/optional `depositMemo`, `sourceChain` and optional `sourceTx`. Source-chain values are `unspecified`, `near`, `ethereum`, `base`, `solana`, `bitcoin` or `other`. Times use timezone-qualified ISO strings; amounts use exact decimal strings. Order amount, asset, recipient and time window remain immutable. There are no owner overrides, arbitrary RPC URLs or client-supplied evidence reports.
