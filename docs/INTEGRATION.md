# FlowTrace integration guide

[Project overview](../README.md) · [中文概览](../README.zh-CN.md) · [中文完整参数说明](../public/agent/guide.md)

Use the same four workflows from a local server, MCP client or REST application. All examples below are read-only; transfer preflight returns an unsigned template.

## Share a ready-to-fill demo

| Example | Link |
| --- | --- |
| Account | [Open](https://www.darkchunk.win/collect/agent/?demo=account#manual) |
| Changes | [Open](https://www.darkchunk.win/collect/agent/?demo=changes#manual) |
| Amount limit | [Open](https://www.darkchunk.win/collect/agent/?demo=limit#manual) |
| Historical receipt | [Open](https://www.darkchunk.win/collect/agent/?demo=receipt#manual) |

Links only fill fixed public inputs. The user must click Query to read mainnet data. Copying an example link never includes edited account or order fields. Additional URL fields cannot override the preset.

## Quick start

Requires **Node.js 22+** and npm.

```sh
git clone https://github.com/yinbowen-dc/FlowTrace.git
cd FlowTrace
npm ci
npm start
```

Open **http://127.0.0.1:8804/agent/**.

Manual forms, MCP and task APIs work without an AI key. Optional chat uses the server-side `OPENAI_API_KEY` configuration. See the [configuration guide](../public/agent/guide.md) for model settings, limits and data handling.

```sh
# Run deterministic tests with fixtures
npm test

# Recheck the included historical payment evidence, offline
npm run replay -- examples/public-receipt-evidence.json
```

## Connect your agent

### Remote MCP

Endpoint: **https://www.darkchunk.win/collect/mcp**

Clients that support Streamable HTTP MCP can use this configuration; exact settings vary by client:

```json
{
  "mcpServers": {
    "flowtrace": {
      "url": "https://www.darkchunk.win/collect/mcp"
    }
  }
}
```

### Local stdio

Run `npm ci` first, then replace the path with your checkout:

```json
{
  "mcpServers": {
    "flowtrace": {
      "command": "node",
      "args": ["/absolute/path/to/FlowTrace/mcp/stdio.mjs"]
    }
  }
}
```

A runnable client example is included:

```sh
npm run agent:demo -- --stdio --account wrap.near
```

<details>
<summary><strong>Explore all 8 MCP tools</strong></summary>

| Tool | Purpose |
| --- | --- |
| `near_network_status` | Read the mainnet final block anchor. |
| `near_account_overview` | Read native NEAR and the three supported FT balances at one block. |
| `near_account_permissions` | Inspect direct account access keys and their permissions. |
| `near_account_changes` | Compare balances, permissions and code hashes across two finalized heights. |
| `near_verify_receipt` | Check the net FT event amount in a specific finalized transaction. |
| `intents_get_status` | Read a NEAR Intents 1Click channel-status report. |
| `near_investigate_payment` | Compare a payment claim with transaction evidence and optional channel status. |
| `near_transfer_preflight` | Check FT transfer conditions and prepare an unsigned wallet template. |

Discover exact inputs using `tools/list` or the [live catalog](https://www.darkchunk.win/collect/api/agent/catalog). The [integration guide](../public/agent/guide.md) covers scope, limits, examples and the [companion Skill](../public/agent/skills/near-agent-ops/SKILL.md).

</details>

## Use the REST API

This public example requests a read-only comparison:

```sh
curl https://www.darkchunk.win/collect/api/agent/run \
  -H 'Content-Type: application/json' \
  --data '{"task":"account_compare","input":{"accountId":"wrap.near","lookbackBlocks":100}}'
```

| Task | Use it for |
| --- | --- |
| `account_inspect` | Balances and access keys at a shared final block. |
| `account_compare` | Net account changes across two finalized heights. |
| `payment_investigate` | One order claim and its target FT transaction. |
| `transfer_preflight` | FT transfer checks and an unsigned request for wallet review. |

`lookbackBlocks` is an integer from **1 to 5000**, default **100**. It is a height difference; the report returns the actual time interval. Amount inputs use decimal strings and exact atomic units.
