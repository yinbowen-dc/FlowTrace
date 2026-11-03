# Account observation · v0.5

[Open account observation](https://www.darkchunk.win/collect/agent/#watch) · [中文产品介绍](../README.zh-CN.md)

## What runs in the background

After an explicit Start action, the server reads a finalized NEAR account snapshot approximately every three minutes. It compares that snapshot with the last complete baseline and records findings selected by the user's rules. Collection continues while the browser is closed, until the 24-hour observation lease expires. The owner can extend, pause, resume or remove a watch.

The existing eight MCP tools and four task workflows still perform on-demand checks. Background watches use separate, session-scoped web APIs; they are not extra MCP tools.

## Rules and evidence

- Watch native NEAR, USDC, USDT and wNEAR net balance changes, direct access-key changes and contract-code hashes.
- Default absolute thresholds: 1 NEAR, 10 USDC, 10 USDT and 1 wNEAR. Amounts retain exact atomic-unit precision. The NEAR threshold also applies to the locked-NEAR field.
- Zero threshold means any nonzero net difference. Balance, key and code rules can be selected independently.
- Only complete, correctly anchored snapshots advance the baseline. Partial queries, unrecognized permissions, stale or conflicting heads remain unknown and preserve the prior complete baseline.
- First collection and recovery produce informational events. Repeated identical query errors are deduplicated and retry with backoff, up to 15 minutes.
- Reports retain start/end block anchors, applied rules and selected changes. Key lists are limited to 20 identifiers and findings to 30 summaries; snapshots are capped at 512 KiB and event reports at 32 KiB.
- These are two-point net changes, not full transaction histories, theft detection or a contract audit. No external email, SMS or social message is sent.

## Privacy and retention

Each browser receives an opaque HttpOnly, SameSite=Strict session cookie; public-host cookies are Secure. The database stores only its SHA-256 hash. The cookie is never included in downloaded reports. There is no wallet connection, private key, password or model key required for observation.

Chosen account IDs, rules, the latest complete baseline and events are stored server-side. Other sessions cannot list, change or delete them. Clearing browser data loses access to that anonymous list; there is no cross-device login or recovery flow in this version.

An owner session expires after seven days without access. Expired sessions and their watches/events are removed. Each owner retains the latest 100 events, loaded in pages of 20. Removing a watch also removes its events. Export includes the current list and the events loaded in the page.

## Public-demo limits

- Three saved accounts per browser session; up to ten distinct active accounts and fifty saved watches globally.
- Approximate three-minute cadence; the actual last attempt and next planned time are shown.
- Each observation lease lasts 24 hours. Resume re-establishes a baseline. Manual collection and pause/resume cannot force samples faster than once per minute; recent samples are reused across sessions for the same public account.
- The server checks a small bounded queue, does not overlap collection cycles and backs off on query failures. Public endpoints retain the existing request limits. This is a demo service without a production SLA.

## Run locally

Requires Node.js **22.16+**.

```sh
npm ci
WATCH_DB_PATH=./runtime/watch.sqlite npm start
```

Without `WATCH_DB_PATH`, observation is disabled and the existing manual/MCP/REST tools remain available. The database directory and files are private, ignored by Git and excluded from the Docker image. Never point the database into `public/`.

The deployment mounts a dedicated persistent Docker volume at `/app/runtime` and sets `WATCH_DB_PATH=/app/runtime/watch.sqlite`. The container stays non-root with a read-only root filesystem. Back up the database with SQLite's supported backup mechanism; copying only the live main database file can omit WAL data.

## HTTP surface

All paths are under the deployment prefix, e.g. `/collect`. JSON POST requests must come from the same origin. Browser fetches use the HttpOnly cookie automatically; do not put session tokens in URLs or public configuration.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/watch/status` | Service configuration, this session's list, latest 20 events and unread count; no anonymous allocation |
| POST | `/api/watch/add` | `{accountId, rules?}`; explicitly start a private watch and issue the session cookie |
| POST | `/api/watch/action` | `{id, action}` with pause, resume, extend, check or delete; `{action:"ack"}` marks this session's events read |
| POST | `/api/watch/events` | `{before?}`; this session's next page of older events |

Bodies are strict: no owner overrides, RPC URLs, signing inputs or arbitrary contracts. The worker obtains snapshots itself through the shared deterministic account service. Client-supplied snapshots are never trusted.

## Implementation references

- [Node.js 22 SQLite API](https://nodejs.org/download/release/latest-jod/docs/api/sqlite.html)
- [NEAR public RPC providers and their published limits](https://docs.near.org/api/rpc/providers)
