# FlowTrace NEAR Agent Toolkit · v0.6.0

给人和Agent提供NEAR业务查询和规则预检。包含网页自然语言对话、手动操作、8个MCP工具、4个固定任务流程和一个配套Skill。手动、MCP和任务API直接查询，无需模型密钥；网页AI对话由服务端OpenAI Agents SDK调用同一套确定性服务。所有入口均不需要钱包私钥，也不签名或广播。

网页试用：https://www.darkchunk.win/collect/agent/

## 直接打开公开演示

- 账户检查：https://www.darkchunk.win/collect/agent/?demo=account#manual
- 变化核对：https://www.darkchunk.win/collect/agent/?demo=changes#manual
- 金额超限：https://www.darkchunk.win/collect/agent/?demo=limit#manual
- 历史收款：https://www.darkchunk.win/collect/agent/?demo=receipt#manual

打开链接只选择任务、填入固定公开样本，不自动查询或调用模型；点击查询按钮后才读取主网。页面里的“复制公开示例链接”不包含你编辑的账户或订单字段。示例中的账户不由本项目控制。未知、重复的 demo 参数不选择预设，也不能覆盖样本账户、金额或上限。旧 #changes 链接继续可用。

## 网页对话与手动操作

对话示例：“查询wrap.near的余额和公钥权限”；“预检从wrap.near到v2.ref-finance.near转0.01 wNEAR，上限0.001 wNEAR”。缺少实际操作参数时助手需要追问。查询完成后可展开工具记录，也可将结果带到手动表单复核。blocked表示规则阻止，incomplete表示检查有未知项，不应当视为转账成功。

对话每IP每分钟最多2条、全站并发1；默认每日40次尝试，计数仅保留在当前服务进程，重启会重置。每轮最多3次工具调用、4轮模型循环；达到限制或模型不可用时可继续使用手动表单。服务端需配置OPENAI_API_KEY，可选OPENAI_MODEL与CHAT_DAILY_LIMIT。模型密钥不进入前端或源码，不是NEAR钱包私钥。

对话消息与生成解释所需的工具结果会发送OpenAI。SDK远程追踪关闭，Responses设置store=false；本服务不保存对话正文。手动模式不经过模型。请勿输入私钥、助记词或API密钥。

GET `api/agent/chat/status`返回配置状态和使用限制；POST `api/agent/chat`接收`{messages:[{role:"user",content:"查询wrap.near的余额"}]}`。只接受user/assistant文本消息，不接受system、tool或自定义工具定义。8KB请求体限制同样适用。返回答复和真实工具调用记录；不包含OpenAI凭据。

“比赛提交”区提供官方入口、核验日期、截止时间、准备清单及可复制的项目介绍草稿。详见[提交准备](./submission.md)。公开源码：https://github.com/yinbowen-dc/FlowTrace 。X 演示帖与比赛报名尚未提交。

## MCP 接入

支持Streamable HTTP，工具目录由标准`tools/list`返回。公共端点：

```text
https://www.darkchunk.win/collect/mcp
```

支持HTTP MCP的客户端通常可以配置如下；具体设置名称以客户端文档为准：

```json
{"mcpServers":{"flowtrace-near":{"url":"https://www.darkchunk.win/collect/mcp"}}}
```

本机stdio配置（将路径改为自己的仓库路径；先运行`npm ci`）：

```json
{"mcpServers":{"flowtrace-near":{"command":"node","args":["/absolute/path/to/flowtrace/mcp/stdio.mjs"]}}}
```

本项目用官方MCP TypeScript SDK v2实现，支持2026-07-28请求及SDK提供的2025版无会话兼容方式。HTTP端点只接受POST，不提供长连接订阅。无需鉴权的公开查询受速率限制，不能视为生产SLA。CDN或网络环境可能限制自动客户端；可改用本机stdio直接访问固定上游。

在仓库中运行官方客户端示例：

```sh
npm ci
npm start
# 另一个终端：
npm run agent:demo
npm run agent:demo -- --stdio --account wrap.near
npm run agent:demo -- --url https://www.darkchunk.win/collect/mcp
```

## 八个工具

| 工具 | 用途与输入 |
|---|---|
| near_network_status | `{}`，同步主网及final区块，最多15秒缓存 |
| near_account_overview | `{accountId}`，NEAR和三个FT余额，固定final锚点 |
| near_account_changes | `{accountId,lookbackBlocks?}`，默认100、范围1–5000的整数，比较两final区块的余额、公钥权限与代码哈希 |
| near_account_permissions | `{accountId}`，直接访问公钥及权限解释 |
| near_verify_receipt | `{txHash,senderAccountId,recipient,asset}`，单交易FT标准事件净变化 |
| intents_get_status | `{depositAddress,depositMemo?}`，1Click渠道报告 |
| near_investigate_payment | 收款声明与收据、可选渠道状态比较，输入见下表与目录 |
| near_transfer_preflight | `{accountId,recipient,asset,amount,maxAmount?}`，FT规则检查及未签名模板 |

`asset`只能是`USDC`、`USDT`、`wNEAR`。金额使用十进制**字符串**，精度分别为6、6、24，内部使用BigInt。不能指定自定义RPC或任意合约。完整JSON Schema：
https://www.darkchunk.win/collect/api/agent/catalog

## 四个任务接口

`POST https://www.darkchunk.win/collect/api/agent/run`，Content-Type为`application/json`。返回`{ok,requestId,data}`，data含任务名、开始结束时间、步骤耗时、核验结果和建议。不是后台常驻Agent，不自动重复运行。

| task | input | 结果 |
|---|---|---|
| account_compare | `{accountId,lookbackBlocks?}` | 两final高度及实际时间间隔、精确余额净差额、公钥和合约代码变化；未知保留 |
| account_inspect | `{accountId}` | 一个final区块下的余额与公钥权限，某资产失败保留unknown |
| payment_investigate | 下方字段 | 收款差异、各证据查询状态、单交易核验范围 |
| transfer_preflight | `{accountId,recipient,asset,amount,maxAmount?}` | blocked / incomplete / ready_for_wallet_review，检查项及可选钱包模板 |

```sh
curl https://www.darkchunk.win/collect/api/agent/run \
  -H 'Content-Type: application/json' \
  --data '{"task":"account_inspect","input":{"accountId":"wrap.near"}}'
```

`payment_investigate`必填：`asset`、`expectedAmount`、`recipient`、`txHash`、`senderAccountId`、`createdAt`、`dueAt`。时间必须为带时区ISO字符串，dueAt晚于createdAt。可选`merchantStatus`为paid/unpaid/refunded/unknown（默认unknown），可选原1Click`depositAddress`及`depositMemo`。订单关联是调用方声明，不由链上数据证明；仅核对这一笔订单，不跨全库查重。

## 预检到底检查什么

固定代币余额、收款账户存在、NEP-145存储注册、原生NEAR余额扣除协议存储占用后是否满足应用的**0.01 NEAR费用缓冲加1 yoctoNEAR附带金额**，以及可选本次金额上限。所有查询请求指定同一个final区块；查询返回区块与锚点不匹配时暂停确认。

缓冲是应用策略，不是实时Gas报价，不保证一定足够。模板使用30 Tgas，不保证合约接受或执行成功。本版不执行合约仿真，不检查用户选定公钥的签名权限，也不签名或广播。模板不带nonce，60秒后过期；钱包仍须重新核对网络、余额、接收方、合约、费用与授权。

`maxAmount`只比较本次参数，不能限制后续实际签名或累计历史支出。FunctionCall key的allowance是Gas预算，不是代币支出限额。不存在“接口预检通过就自动授权”的关系。

## 数据与边界

固定主网RPC（FastNear、NEAR官方与归档节点）及1Click状态API；RPC响应不是本地轻客户端的独立密码学证明。余额任务不含NFT、其他FT、质押池份额和Intents内部余额。权限工具只列账户直接访问公钥，不是合约审计。单次任务与MCP按需查询；网页可单独启用有期限的服务器后台观察与站内事件。未提供外部通知、套利执行、持仓管理或盈利保证。

查询错误不等于零余额或未付款。渠道SUCCESS不能独立证明商家到账，REFUNDED不能独立证明来源链退款。网页历史样本不属于真实商户订单；任务返回来源与时刻供人工核对。

请求默认每IP每分钟60次、同时4个，8KB请求体。未知字段拒绝。单次任务不持久化请求或订单，不记录请求体；后台观察另行保存所选公开账户、规则、完整基线和最近事件，按浏览器会话隔离；查询技术标识会发送到对应固定上游。下载JSON由当前浏览器生成。

## Skill

下载`https://www.darkchunk.win/collect/agent/skills/near-agent-ops/SKILL.md`，按客户端规则放入名为`near-agent-ops`的技能目录。仓库中的完整目录位于`public/agent/skills/near-agent-ops/`，包括可选界面元数据。Skill提供调用和解释规则，不授予链上资金操作权限。

官方参考：
- https://docs.near.org/api/rpc/contracts
- https://docs.near.org/api/rpc/protocol
- https://docs.near.org/protocol/accounts-contracts/access-keys
- https://github.com/near/NEPs/blob/master/neps/nep-0145.md
- https://modelcontextprotocol.io/specification/latest/basic/transports
- https://docs.near-intents.org/integration/devkit/skills

## v0.4 账户变化核对

网页入口：https://www.darkchunk.win/collect/agent/#changes 。也可对话“核对 wrap.near 最近100个区块的余额和权限变化”。REST使用account_compare，MCP使用near_account_changes。lookbackBlocks必须是JSON整数，默认100，范围1–5000；这是高度差，不是分钟数。实际起止区块时间及间隔随结果返回。

服务先锚定最新final区块，再按高度读取历史区块；两边的余额和公钥列表分别锚定到各自区块哈希，不接收客户端伪造的快照。金额和净差使用最小单位字符串与BigInt。报告区分新增/移除公钥、权限变动和代码哈希变化，未把Gas allowance当成代币预算。

未知余额、无法识别的权限、重复公钥或区块响应不匹配，不能输出“没有变化”。历史区块不可用则本轮查询失败，不回退为零。净额为零仍可能发生多笔相互抵消的转账，新增公钥也可能是正常换钥；此报告不是被盗判定或安全审计。此手动核对任务按需查询，不自动建立后台观察或完整流水索引；后台观察须在下方功能中单独启用。

区块查询参数参考：https://docs.near.org/api/rpc/block-chunk

## v0.5 后台账户观察

入口：https://www.darkchunk.win/collect/agent/#watch 。用户明确启用后，服务器约每3分钟读取final快照；关闭网页仍会采集，默认每次运行24小时，可续期、暂停、恢复或移除。每浏览器最多3账户；全局最多10个活跃账户、50条观察。观察不使用模型密钥，不执行资金操作。

余额阈值默认NEAR为1、USDC/USDT为10、wNEAR为1；使用绝对净差额及精确最小单位。权限、代码和余额规则可独立选择。仅完整快照推进基线；失败保留未知，重复错误合并并退避重试。单次手动采集及暂停/恢复不能突破60秒采样间隔，相同公开账户会复用近期快照。

列表与事件存于服务端SQLite，通过HttpOnly、SameSite=Strict会话Cookie隔离，正式站点Cookie带Secure。数据库仅存会话令牌哈希；没有跨设备登录或找回，清除站点数据会失去列表访问。会话连续7天不访问后清理，保留最近100条站内事件，每次加载20条；删除观察会连同事件移除。导出仅含当前列表与已加载事件，不含Cookie。

启用：设置WATCH_DB_PATH到非public目录的SQLite路径。Docker需挂载持久卷供node用户写入；根文件系统仍只读。完整规则与接口见公开仓库docs/WATCH.md。现有8个MCP工具和4条单次任务不变；后台观察使用独立、同源会话范围的网页接口。

## v0.6 支付排查工作台

入口：https://www.darkchunk.win/collect/agent/payments/ 。保存订单声明、关联NEAR交易后，点击按钮读取主网核验。页面比较应收、实际净到账与差额，保留最近10次核验和30条操作记录；关联修改后当前报告失效，旧报告留在历史。同一浏览器中多张订单复用收据会相互提示，归档保留关联，支持恢复。

订单使用独立HttpOnly会话Cookie，服务端SQLite持久化；每浏览器20张（含归档），全站200张、100个会话。7天不访问后会话失效，清除站点数据无法找回。设置WATCH_DB_PATH时自动使用同目录payments.sqlite，也可独立设置PAYMENTS_DB_PATH。

本次仅核验NEAR及可选1Click渠道报告。来源链交易标识仅保存为线索；来源链入金、退款、报价归属和商家数据库尚未独立核验。SUCCESS与REFUNDED不能替代到账或退款证据。没有自动复查、外部通知或资金执行。现有MCP与对话仍按次查询，保存订单使用独立网页接口；完整说明见公开仓库docs/PAYMENTS.md。
