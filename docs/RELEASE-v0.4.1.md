# FlowTrace v0.4.1

The product demo now opens the specific public example a visitor chooses. Previously, links to manual mode could leave visitors on an unrelated task with empty inputs.

## Try a workflow

| Workflow | Direct link | What is prefilled |
| --- | --- | --- |
| Account | [Open](https://www.darkchunk.win/collect/agent/?demo=account#manual) | `wrap.near` |
| Changes | [Open](https://www.darkchunk.win/collect/agent/?demo=changes#manual) | `wrap.near`, 100 block heights |
| Amount limit | [Open](https://www.darkchunk.win/collect/agent/?demo=limit#manual) | 0.01 wNEAR requested, 0.001 limit |
| Receipt | [Open](https://www.darkchunk.win/collect/agent/?demo=receipt#manual) | The included historical USDC transaction and a declared payment claim |

Opening these links selects and fills a fixed example. It does not query mainnet or call the model. Click Query to read current data. Example accounts are not controlled by this project.

## Changes

- Refreshed the live console with the FlowTrace artwork, product message and four direct demo entries.
- Added public-example link copying. Edited account and order fields are never included in copied links.
- Added history navigation for preset routes. Unsupported or repeated demo names cannot choose arbitrary tasks; URL fields cannot widen the example amount limit.
- Preserved legacy `#changes` URLs and existing manual, chat, REST and MCP capabilities.
- Updated the public repository link and project name in the live console and submission materials.

## Verification

- 81 tests passed on Node.js 25.9.0 locally and Node.js 22.23.4 on the server.
- Browser checks covered all four prefilled examples and their mainnet reports, example-link privacy and back/forward navigation.
- At 390px, the page and viewport widths both measured 390px; the example inputs remained usable.
- A staging container verified the inherited application environment before production switch. The 28 deployed runtime files matched the verified release source.
- Public health and the standard Streamable HTTP MCP client were checked separately. The original eight tools and four task workflows remain available.

This release does not introduce background monitoring, alerts, custody, signing or broadcasting. Tests use deterministic fixtures; live observations are separate historical checks. Hackathon submission is deferred for now; the prepared draft and media are retained.
