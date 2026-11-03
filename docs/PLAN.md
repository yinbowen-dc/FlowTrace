# FlowTrace — product and demo plan

Make the public journey work from the README to a useful mainnet check, then prepare an accurate hackathon submission.

## 1. Show what works — complete

- Publish bilingual, visual READMEs with the real mainnet walkthrough, agent tool call and blocked-preflight example.
- Keep current capabilities separate from planned monitoring and notifications.
- Evidence: published README and visual assets in `docs/assets/`.

## 2. Make the demo easy to try — complete

- Align the live console with the FlowTrace branding and product message.
- Provide four links that fill fixed public examples: account, changes, payment receipt and amount-limit preflight.
- Let users copy an example link without sharing their edited account or order fields.
- Opening a link must not query the chain, call the model, sign or broadcast. Queries require an explicit click.
- Preserve legacy `#changes` links and existing MCP, REST and chat behavior.
- Check malformed routes, unknown presets, history navigation and the absence of request-parameter overrides.
- Verified all four examples in the browser, plus desktop and 390px phone layouts. Back/forward restored the selected example; copying a link omitted edited fields.

## 3. Publish and prepare materials — complete

- Deployed v0.4.1 to the existing server. Runtime environment, isolation and loopback routing were preserved; the prior container is retained for rollback.
- Public health reports v0.4.1. Demo routing and mainnet results were checked; public MCP exposes the existing eight tools.
- Update repository links, product name, developer instructions and the private application draft.
- Prepared current screenshots, a 13-second MP4 step replay and an X-post draft. The owner still needs to publish the public post.
- Submission materials are prepared. X publication and official submission are deferred for now; they are not part of the remaining work for this release.

## Release boundary

This pass improves the product presentation and demo journey. It does not add custody, signing, trading, background monitoring or alerts. Those require their own product and operating design.

## Verification

- 81 tests passed locally on Node.js 25.9.0 and on the server with Node.js 22.23.4.
- 28 deployed runtime files match the verified release source byte for byte.
- [v0.4.1 release notes](RELEASE-v0.4.1.md) include the four shareable demo links and scope.
- Official application is not submitted. X publication and final form review are deferred; the private draft and prepared media are retained for later.
