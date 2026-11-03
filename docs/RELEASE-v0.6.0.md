# FlowTrace v0.6.0

Payment investigations can now be saved as orders with retained evidence. Previously, each payment check was an independent request; the payment workspace adds persistent order claims, transaction associations, check history, archive/restore and same-session receipt-reuse detection.

[Open payment workspace](https://www.darkchunk.win/collect/agent/payments/) · [Scope, privacy and APIs](PAYMENTS.md)

- Save immutable payment terms and explicitly run a NEAR receipt check. Compare expected amount, verified net receipt and exact difference.
- Show NEAR evidence, user-declared merchant state, optional 1Click reports and missing source-chain proof separately.
- Retain ten checks and thirty audit entries per order; editing links invalidates the current report while preserving history.
- Flag all saved orders sharing a verified receipt in the same session, including archived orders. Archive/restore is reversible.
- Keep query failures unknown, protect newer edits from in-flight writes and bound reports, concurrency, session lifetime and public-demo capacity.
- Preserve existing watch sessions, chat and the eight on-demand MCP tools. Persistent orders use a separate session cookie and SQLite database in the existing data volume.

Verification includes 110 deterministic tests locally and on Node.js 22.23.4, with thirteen new payment tests covering exact receipt amounts, isolation, association revisions, duplicate detection, failure history, channel-only uncertainty, concurrency, retention, restart persistence, size limits and HTTP guards.

- The final staging image saved an order, obtained the real historical 103.463854 USDC receipt and recovered the order and its check history after a container restart.
- Desktop and 390px phone layouts were checked. Browser checks covered association edits, history invalidation, archive/restore, reload persistence and duplicate detection.
- The public workspace independently saved and checked two constructed orders. The first showed the 0.536146 USDC shortfall; checking the second flagged both orders for receipt reuse.
- All 36 deployed runtime files match the release source. Existing environment, isolation and persistent data volume were preserved, including both account watches and the 89 events present at cutover. The previous container is retained for rollback.
- A standard public MCP client listed the eight existing tools and successfully read mainnet status.

The historical demo pairs a public receipt with constructed order claims. It is not a real merchant order. Source-chain payment/refund proof, quote association, merchant database integration and automatic execution remain outside this release.
