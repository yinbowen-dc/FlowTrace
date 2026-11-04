# 钱包 Agent 实现说明 · v0.8.3

确认事实：现有项目是 Node ESM 服务，已有 Agents SDK、固定 NEAR RPC、余额与 FT 预检、SQLite 会话；用户选择先替代普通钱包用户的查余额、转账、换币、跨链操作，并希望复用脚手架。

本次实现选择：复用官方 create-near-app 当前使用的 NEAR Connect；保留既有网站，先实现余额与单笔转账闭环。前端独立入口 `/agent/wallet/`，后端新增匿名任务库。模型只生成准备任务，实际签名交用户钱包。

尚待用户真实钱包验证的部分：Meteor 对应设备上的连接与签名返回、真实交易后的端到端核验。自动测试使用受控 RPC 夹具验证成功、失败、未知与参数不匹配；不会为了测试发送真实资金。换币和跨链执行不在本次完成范围。

完整流程、恢复方式、脚手架来源及边界见 [公开指南](../public/agent/wallet/guide.md)。


v0.8.0 新增：原生 SDK Session 的服务器持久化、当前讨论任务、查询/取消准备任务工具、有期限的后台核验以及会话隔离的私有任务 MCP。失败运行不自动重放，后台不调用模型或广播。详细取舍和验证见 [v0.8.0 说明](RELEASE-v0.8.0.md)。

## Google Cloud 配置

v0.8.3 接入 Google 授权码登录：PKCE S256、state 与 nonce、官方库 ID Token 校验，使用验证后的 Google `sub` 作为身份。登录后对话和任务跨设备共享，首次登录可关联当前访客记录，同时撤销旧访客 Cookie 和外部 MCP 令牌。已有账号不会自动覆盖另一台设备的访客数据。Google 登录不等于钱包所有权认证，也不会代替钱包签名。

| Google Auth Platform 字段 | 配置 |
| --- | --- |
| 应用名称 | FlowTrace |
| Audience | External；Testing 时仅添加指定测试用户，开放所有用户前再发布 |
| OAuth 客户端类型 | Web application |
| 客户端名称 | FlowTrace Web |
| 应用主页 | `https://www.darkchunk.win/collect/agent/wallet/` |
| 隐私说明 | `https://www.darkchunk.win/collect/agent/wallet/privacy/` |
| Authorized domain | `darkchunk.win`；按控制台要求由域名所有者验证 |
| JavaScript origin（若填写） | `https://www.darkchunk.win` |
| Authorized redirect URI | `https://www.darkchunk.win/collect/auth/google/callback` |
| Scopes | `openid`、`email`、`profile` |

支持邮箱和开发者联系邮箱使用登录控制台的项目负责人邮箱。下载的 OAuth 客户端 JSON 仅用于安全写入服务端 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`；示例见仓库根目录 `.env.example`。`AUTH_PUBLIC_ORIGIN=https://www.darkchunk.win`，密钥不进入浏览器包、Git 或日志。当前服务未配置真实凭证时，登录按钮禁用，访客功能照常可用。`GET /collect/api/auth/status` 的 `available` 只表示凭证已配置，不代表 Google 控制台发布状态或完整登录验证通过。

账号身份和登录会话保存在独立 `auth.sqlite`；钱包数据仍在 `wallet.sqlite`。保留同一 runtime 卷并持久化两个文件。登录会话30天，钱包记录仍按7天无访问过期。观察和支付工作台继续使用各自访客会话。退出只撤销当前设备会话。
