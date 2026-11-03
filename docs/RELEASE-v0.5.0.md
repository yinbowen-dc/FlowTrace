# FlowTrace v0.5.0

Close the browser and account observation keeps running. Previously, each account comparison required a new on-demand request; this release adds opt-in server-side watchlists and an in-app event feed.

**[Open account observation](https://www.darkchunk.win/collect/agent/#watch)** · [Rules and deployment](WATCH.md)

## What you can do

1. Add a public NEAR account; no wallet connection or AI key is needed.
2. Choose balance, access-key and contract-code rules. Default balance thresholds are 1 NEAR, 10 USDC, 10 USDT and 1 wNEAR.
3. The first complete snapshot establishes a baseline. The server checks again approximately every three minutes for a renewable 24-hour lease, including while the page is closed.
4. Reopen the console to review events, unread counts and start/end finalized blocks. Pause, resume, extend, request a check or export the loaded reports.

Each anonymous browser session can save three accounts. The public instance allows ten distinct active accounts and fifty saved watches globally. Sessions retain the latest 100 events and expire after seven days without access. Clearing browser data loses access to the list; this version has no account recovery or cross-device login.

## Evidence and failure handling

- Only complete, fresh, consistently anchored mainnet snapshots advance the baseline. Query failures preserve the prior baseline and produce an unknown state, with retry backoff and repeated-error deduplication.
- A change report shows net differences between two snapshots. It is not a full transaction history, a theft finding or a contract audit. Changes below a configured threshold do not produce a change event.
- Resume creates a fresh baseline; it does not infer changes during a pause or expired lease.
- Watch collection uses the deterministic account service. The existing eight MCP tools and four workflows remain on-demand; browser watches have separate session-scoped APIs.
- There are no external email/SMS/social notifications, custody, signing, broadcasting or automatic trades.

## Verification

- All 96 deterministic tests passed locally on Node.js 25.9.0 and in the server's Node.js 22.23.4 environment. Fifteen new tests cover observation precision, isolation, error recovery, limits, leases, in-flight pause behavior, retention, cookies and file-database recovery.
- A real `wrap.near` baseline was established locally, the preview tab was closed, and the background worker recorded a later change from final block 222872697 to 222873016. The balance net difference was −3013.559437048412302532384078 NEAR; it is historical public-account data, not a single-transfer claim.
- A staging container using the final image collected a real baseline at final block 222874265. After a container restart, the same session recovered its watch ID, baseline and event from the persistent volume.
- Production health reports v0.5.0. Its 31 runtime files match the verified source. Existing application environment and container isolation were preserved; only the observation database environment setting and dedicated persistent volume were added. The previous container is retained for rollback.
- The public Streamable HTTP MCP client listed all eight tools and successfully called `near_network_status`. Existing model configuration was retained and chat availability was checked; this release did not make another billable model request.
- The production console established real baselines for `wrap.near` and `v2.ref-finance.near`. Desktop and 390px phone layouts were checked; phone document width and viewport both measured 390px.
- The next production cycle automatically recorded a `wrap.near` change from final block 222874403 to 222874733, net −1282.347963555400560443981271 NEAR. The [production screenshot](assets/account-watch.png) shows both watched accounts and a later `v2.ref-finance.near` USDC/wNEAR change event.

Screenshots and live observations are historical checks, separate from the deterministic tests. This is a bounded public demo without a production SLA. Hackathon submission and X publication remain deferred.
