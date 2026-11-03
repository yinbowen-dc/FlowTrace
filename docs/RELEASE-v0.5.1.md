# FlowTrace v0.5.1

A second web-chat question could fail even after the first question completed successfully. The browser correctly sent plain user/assistant text history, but the server passed assistant text directly to an Agents SDK serializer that expects structured assistant output items. Serialization then failed before an API request was sent.

The server now converts validated assistant history into completed `output_text` message items before calling the runner. The public chat schema, tool guards, model configuration and data handling remain the same. No keys were created or rotated.

## Verification

- Reproduced the original `item.content.map is not a function` failure locally with the installed SDK.
- Added a regression test that runs the real Agent, Runner and Responses serializer against a stubbed network response. It failed before the fix and passes with the fix; it checks actual wire history, nonstored responses and unchanged caller input.
- All 97 tests passed locally and on Node.js 22.23.4 in the server environment.
- Live v0.5.0 acceptance checks independently verified current account balances/permissions, a 100-height comparison, historical payment evidence and a constructed shortfall, blocked and ready-for-review preflight cases, anonymous watch isolation and the eight-tool public MCP endpoint.
- Ten online interface cases passed, including an explicit paid-record match, invalid-input rejection and an anonymous session seeing an empty private watchlist.
- After deploying v0.5.1, the existing browser conversation successfully continued from an account query to a real `preflight_transfer` call. The 0.01 wNEAR request and 0.001 wNEAR limit were retained; the result was blocked with no wallet request.
- The 31 deployed runtime files match the release source. The original environment, isolation and persistent volume were retained. Both existing watches and all 22 events present at the release switch survived the restart; the previous container is available for rollback.

The payment example is a public historical transaction paired with constructed order claims. It is not a real customer order. Its net USDC receipt was 103.463854; changing the declared amount to 104 correctly produced a 0.536146 shortfall.

Current product scope remains account observation, payment evidence and preflight. Conversational tools perform on-demand checks; background watches are managed through the separate web panel. Pool-price arbitrage scans and automatic execution are not implemented. The 1Click path was not exercised in this acceptance pass because no real deposit address was supplied.

[Try the console](https://www.darkchunk.win/collect/agent/#chat) · [Official Responses message/state mapping](https://developers.openai.com/api/docs/guides/migrate-to-responses)
