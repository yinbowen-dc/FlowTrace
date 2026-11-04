# FlowTrace Wallet Agent · v0.8.3

说出目标 → Agent 整理参数 → 服务器预检并保存任务 → 用户在 Meteor 钱包决定是否签名 → 后台核验 FINAL 执行和到账证据 → 继续问“刚才那笔怎么样”。

Google 登录配置完成后，可关联钱包助手的对话和任务，并在其他设备恢复；登录会话最长30天，工作区仍按7天无访问过期。登录不代替钱包签名。具体配置和当前状态见 [实现说明](https://github.com/yinbowen-dc/FlowTrace/blob/main/docs/WALLET-AGENT.md)，数据处理见 [隐私说明](privacy/)。

## 当前能力

| 操作 | 当前行为 |
| --- | --- |
| 查余额 | 主网 final 锚点，NEAR / USDC / USDT / wNEAR，失败保留未知 |
| 转账准备 | 原生 NEAR Transfer 或固定三个 FT 的 ft_transfer；金额用精确整数 |
| 钱包连接与提交 | Meteor 主网，NEAR Connect；由用户确认签名，服务器不持有私钥、不广播 |
| 对话恢复 | 原生 Agents SDK Session 接口，成功轮次保存到服务器 SQLite；保留最近6轮，7天会话有效 |
| 任务衔接 | 准备任务后自动选中，也能在任务卡片切换；“刚才那笔”指当前讨论任务 |
| 对话操作 | 读任务、重新核验、在用户明确要求时取消尚未打开钱包的准备任务 |
| 后台核验 | 关联哈希后自动开启，关闭页面仍继续；初始约30秒间隔，逐步退避至15分钟，最多24小时或60次后台额度 |
| 外部 Agent | 限当前会话、1小时有效、可撤销的私有任务 MCP 入口 |
| 换币 / 跨链 | 本版尚未接入报价或执行 |

已有账户观察是独立服务，继续按原来的约3分钟周期运行。

账户查询在对话和手动面板中使用同一张资产卡片。默认余额最多展示4位小数，舍入时标为“约”，非零微小余额不会显示成零；展开“精确余额与查询依据”可查看全部精度、采集时间与区块。卡片来自工具的结构化结果，不从模型文字中提取金额。恢复旧对话时也会读取该轮已保存的工具结果，显示原来的快照，不自动查询新余额。

## 钱包与任务边界

预检只检查规则，不是交易模拟。0.01 NEAR 为应用费用缓冲，不是实际 Gas 报价。余额不等于可自由转出余额。FT 收款方未注册存储时直接阻止，不自动代付注册。

`ready → wallet_open → submitted → completed / failed / unknown`

条件不满足进入 `blocked` 或 `incomplete`。打开钱包前再次预检，同一任务只能打开一次。钱包未返回可核验哈希时进入 `needs_hash`，请先在钱包核对记录；任务不会自动重发。钱包返回哈希不代表完成，需核对 FINAL 执行、原始参数、目标收据；FT 额外核对标准事件净到账。

任务参数不可编辑，明确更改金额、收款方等需新建任务。用户可以取消未打开钱包的准备任务；已打开钱包或已提交的链上交易不能通过本服务撤销。

## 后台核验与恢复

后台只做固定 RPC 查询，不调用模型，不签名，不广播。领取检查任务时保存90秒处理租约，进程异常退出后等租约失效再恢复；不依赖网页保持连接。

关联交易哈希后开启最多24小时、60次的自动追踪。前台或外部 Agent 手动重查也计入检查次数，手动查询可在自动额度结束后明确继续。后台同时处理一项任务，查询慢时实际间隔会延长，不提供时效保证。页面每10秒刷新已保存的状态，刷新页面本身不触发链上查询。

查询失败保留 `unknown`，不会据此判断未付款。参数、证据不匹配会暂停自动重试，需人工核对。可在任务卡片暂停，或明确续期24小时并重置后台额度。暂停时正在返回的旧结果不会覆盖暂停后的任务。完成、FINAL执行失败、到期、次数耗尽或会话失效都会停止自动查询。

## 流式对话

钱包页面通过同一个 `POST /api/wallet/chat` 接口发送 `Accept: text/event-stream`，接收请求确认、工具执行状态、资产卡片和模型文本增量。返回 `complete` 事件前，内容仍属于本轮未完成片段；完成后才保存完整对话。旧的 JSON 请求仍受支持。

断开网页连接不会重新执行或自动取消这一轮。服务器会在原有时限内继续处理并保存结果；“恢复本轮结果”携带相同请求编号与原参数，读取已保存结果，仍在执行或已中断的请求不会被自动重放。客户端不会自动重试模型请求。

## 对话记忆与重复请求

服务端读取自己的对话历史，不信任客户端附带的 assistant 历史。SDK 工具调用和结果与完整轮次一起保存；失败轮次不保存半截工具调用链，已创建任务仍可从列表恢复。消息及必要工具结果继续由现有 OpenAI 服务处理。

每条消息带唯一 `requestId`，相同请求重试返回原结果；同一请求不能改变内容。同一轮准备任务也有去重键，避免模型重复调用创建两份任务。中断后不会自动重放模型运行，请先核对任务列表后发送新消息。

清空对话只清理对话历史，任务仍保留。清空后，尚未完成的旧对话不能把历史写回来。对话不是钱包授权；涉及资金的签名仍在用户钱包完成。

## 外部 Agent 接入

公共只读链工具入口保持不变：`https://www.darkchunk.win/collect/mcp`，8个工具。

新的私有任务入口：`https://www.darkchunk.win/collect/mcp/tasks`，需要 Bearer 访问令牌。在网页“让你的其他 Agent 接进来”面板创建，最多同时2个，每个1小时有效，可一并撤销。新令牌只显示、复制一次，不写入模型对话或公开仓库。

```json
{
  "mcpServers": {
    "flowtraceTasks": {
      "url": "https://www.darkchunk.win/collect/mcp/tasks",
      "headers": { "Authorization": "Bearer YOUR_PRIVATE_TASK_TOKEN" }
    }
  }
}
```

示例为支持 URL 和自定义请求头的客户端配置；不同客户端的配置位置可能不同。当前使用手动 Bearer 令牌，不提供 OAuth 自动登录。令牌不得放入 URL。

| 工具 | 行为 |
| --- | --- |
| `wallet_list_tasks` | 读取令牌所属会话的任务及追踪状态 |
| `wallet_get_task` | 用完整任务 UUID 读取参数和最近核验报告 |
| `wallet_check_task` | 从保存的参数重新核验链上交易，同时更新本地报告 |

此令牌不能创建转账、取消任务、签名、广播、访问别人的任务或充当网页登录 Cookie。检查工具会查询上游并更新本地记录，MCP 声明 `readOnlyHint:false`；另外两个读取工具为 `true`。

## HTTP 与 SDK 接口

- `GET /api/wallet/conversation`：恢复当前会话的显示消息与讨论任务。
- `POST /api/wallet/chat`：`messages` 的最后一条用户消息、可选 `walletAccountId`、唯一 `requestId`。
- `POST /api/wallet/focus`：`{ "id": "TASK_UUID" }`，切换讨论任务。
- `POST /api/wallet/detail`：`{ "id": "TASK_UUID" }`，空或null表示当前讨论任务。
- `POST /api/wallet/check`：`id` 与当前 `revision`，重新核验。
- `POST /api/wallet/tracking`：`id`、`revision`、`action: "pause" | "resume"`。
- `POST /api/wallet/conversation/reset`：清空对话，保留任务。
- `GET /api/wallet/access/status`，`POST /api/wallet/access/create`、`revoke`：管理任务访问令牌。

浏览器 API 使用 HttpOnly、SameSite=Strict 的 `flowtrace_wallet` Cookie；生产站点为 Secure。会话不是可跨设备登录的用户账户。连接的公开地址也不是钱包所有权证明。任务与历史保存在服务器，通过会话隔离；清除站点数据后无法找回。

## 脚手架与开发

复用官方 [create-near-app](https://github.com/near/create-near-app) 当前采用的 [NEAR Connect](https://github.com/azbang/near-connect) 连接方案，保留现有 Node 服务。锁定 `@hot-labs/near-connect@0.12.0`，MIT。Meteor 适配器在连接时从固定 Git 提交加载，并运行在隔离 iframe；来源和上游许可证见 `vendor/SOURCES.json`。

```sh
npm ci
npm run build
WATCH_DB_PATH=./runtime/watch.sqlite npm start
npm test
```

`frontend/wallet.js` 经 esbuild 构建为浏览器包。`wallet.sqlite` 位于 `WATCH_DB_PATH` 同目录，新增表使用兼容迁移，沿用持久卷。任务、对话、访问凭证哈希和后台租约都在此库；不改动既有观察或支付数据库。

核验依赖固定 RPC 返回，不是独立轻客户端证明；不证明收款人身份、业务订单归属或收益。真实资金签名由用户操作，未为了测试转移资金。
