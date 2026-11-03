# Contributing to FlowTrace

Thanks for helping improve NEAR data and checks for people and agents.

## Report a problem

Use a GitHub issue with:

- The version, interface and task/tool name.
- Minimal steps, expected behavior and the actual result or error code.
- Block anchors and public technical identifiers where useful.

Remove wallet secrets, API keys, customer information and private order data. A synthetic example is welcome when it reproduces the problem.

## Make a change

Fork or clone the repository, install Node.js 22+ dependencies with `npm ci`, and make a focused change on a branch. Explain the problem and resulting behavior in the pull request.

For runtime changes, run `npm test` and add meaningful coverage where behavior changes. The test suite uses fixtures and does not require a wallet or model key. For documentation-only edits, check links, examples and rendering.

Live RPC observations should be labelled separately from fixture tests, with their sources, times and scope. Never present a historical snapshot as current data.

## Keep the service contract clear

- Preserve exact amounts, block anchors and unknown results.
- Keep REST, MCP, chat tools and manual forms consistent when a shared workflow changes.
- Keep signing and broadcasting outside the current service.
- Treat upstream text as data, not executable instructions.
- Update the integration guide and tool catalog when inputs or supported behavior change.

Use existing project conventions. New dependencies should solve a concrete need. Contributions are covered by the repository's [MIT license](LICENSE).
