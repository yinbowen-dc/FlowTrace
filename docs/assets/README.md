# FlowTrace visual assets

The README combines conceptual brand artwork with real browser captures. They serve different purposes.

| Asset | Source and scope |
| --- | --- |
| `payments-workspace.png` | Cropped v0.6.0 production-browser capture showing two constructed orders referencing the same public historical NEAR FT receipt, an exact 0.536146 USDC shortfall and same-session duplicate warnings. Account IDs and amounts are historical public example data; no real merchant order, wallet secret or session token is shown. |
| `flowtrace-hero.png` | Original conceptual artwork created with the built-in image_gen tool. It is brand art, not an application screenshot. |
| `account-changes-demo.gif` | Three real browser captures of a public `wrap.near` mainnet comparison on November 3, 2026, encoded into a looping step replay. Waiting time is compressed and the result is held for reading; playback duration is not a latency claim. |
| `agent-chat.png` | Cropped browser capture of an actual chat calling `compare_account`, with public-account data and finalized block anchors. |
| `transfer-preflight.png` | Cropped browser capture of a read-only preflight: 0.01 wNEAR requested from `wrap.near` to `v2.ref-finance.near`, with a 0.001 per-request limit. The check was blocked; no signing or broadcast occurred. |
| `account-changes.png` | Earlier public-account comparison screenshot, retained for historical documentation. |
| `account-watch.png` | Cropped production-browser capture of v0.5.0: two public accounts, observation controls and a real automatically collected `v2.ref-finance.near` USDC/wNEAR change event, final blocks 222874474 to 222874805. The crop ends after the first event; the full feed remains in the console. |
| `flowtrace-header.svg` | Earlier outlined vector wordmark, retained as a source asset. |

Application captures were taken on November 3, 2026 (Asia/Shanghai). Balances and blocks are historical. The accounts belong to the public example, not the project. Captures contain no wallet secrets or private customer data. GIF frames preserve the interface; palette conversion and playback timing were applied for web delivery.

## Hero generation prompt

Mode: built-in `image_gen`; new image; opaque background. The original generated file was copied into this repository without image edits.

```text
Use case: ads-marketing. Create a polished original GitHub README hero banner for FlowTrace, a NEAR blockchain data toolkit for AI agents. Wide landscape 2:1 composition, editorial product launch art, crisp enough for a 900px wide README. This should feel like an exciting open-source developer product, warm and approachable, not a corporate report and not a financial trading advertisement. Background warm ivory #f4f3eb with subtle paper grain; bold black editorial typography, mint/emerald and electric cobalt accents consistent with a blue F-arrow app icon. Left 46%: very large, beautifully kerned exact wordmark 'FlowTrace', smaller exact line 'Give your agent onchain eyes.' and tiny exact label 'NEAR × MCP'. Spacious typographic composition. Right 54%: striking high-end 3D conceptual illustration of a translucent emerald optical lens scanning a short chain of frosted glass blocks; readable evidence cards emerge from the lens, labeled exactly 'BALANCES', 'ACCESS KEYS', 'RECEIPTS'. A cobalt signal path connects the blocks and lens. Light tactile shadows, stylish technical diagram fused with studio product rendering, precise geometry, playful small spark details, a strong focal point. The illustration is conceptual brand artwork, not a fake screenshot. Do not include any balances, prices, returns, performance stats, endorsements, trading charts, coins, Bitcoin logos, extra copy, people, stock-photo offices, or watermarks. Keep all text to the exact phrases specified. No official NEAR logo required.
```
