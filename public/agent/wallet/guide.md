# FlowTrace Wallet Agent · v0.7.0

说出目标 → Agent 整理参数 → 服务器预检并保存任务 → 用户打开 Meteor 钱包并决定是否签名 → 独立查询 FINAL 执行和到账证据。

## 当前能力

| 操作 | 当前行为 |
| --- | --- |
| 查余额 | 主网 final 锚点，NEAR / USDC / USDT / wNEAR，失败保留未知 |
| 转账准备 | 原生 NEAR Transfer 或固定三个 FT 的 ft_transfer，精确整数金额 |
| 钱包连接 | Meteor 主网；使用 NEAR Connect，不请求添加访问公钥 |
| 签名与提交 | 用户点击页面按钮后交 Meteor 钱包，由用户在钱包中决定；服务器不持有私钥、不广播 |
| 结果核验 | 比对任务与实际交易的签名账户、收款方、单一动作、资产和金额；要求 FINAL、成功收据和区块锚点；FT 额外核对标准事件净到账 |
| 进度保存 | 当前浏览器独立 HttpOnly 会话，最多20个任务，保存7天 |
| 换币 / 跨链 | 后续能力，本版尚未接入报价或执行 |

页面打开时每8秒选择一项待核验任务重查，最多约2分钟；关闭页面不继续查询，回来可手动重查。模型不能签名或代替用户点击钱包。余额不是可自由转出余额，0.01 NEAR 为应用费用缓冲，不是 Gas 报价或模拟结果。

## 用了什么脚手架

- 官方 [create-near-app](https://github.com/near/create-near-app)：可生成 React/Vite 或 Next.js 应用，现有项目已有 Node 服务，因此复用其钱包连接方案，不替换服务器。
- [NEAR 前端集成说明](https://docs.near.org/web3-apps/quickstart)：模板使用 NEAR Connect。
- [NEAR Connect](https://github.com/azbang/near-connect)，锁定 npm `@hot-labs/near-connect@0.12.0`，MIT。连接钱包、获取账户和 `signAndSendTransaction` 使用其真实 API。
- Meteor 适配器在连接时由浏览器从上游固定 Git 提交加载，运行在隔离 iframe；本仓库不再分发上游适配器二进制。来源、SHA-256 与上游许可证信息在 `vendor/SOURCES.json`，图标同样从官方地址加载。本版本仅列出 Meteor；不是所有钱包和手机环境均已实测。

## 状态与恢复

`ready → wallet_open → submitted → completed / failed / unknown`

条件不满足进入 `blocked` 或 `incomplete`，不会产生可发送请求。打开钱包前再次预检；同一任务只能打开一次。钱包错误或弹窗关闭进入 `needs_hash`，不自动重发。若实际已提交，在钱包里复制哈希后关联并核验。钱包返回哈希本身不代表完成；查询故障也不代表交易失败。

任务内容不可编辑，改变收款方或金额需创建新任务。打开钱包前可取消准备任务；打开后不能通过本服务撤销链上操作。同一浏览器会话不能用一个哈希关联多个任务。

## 隐私与边界

连接的公开账户只作为准备参数，服务端不把连接声明当作钱包所有权证明。匿名任务会话与既有支付、观察会话分离；不等于可跨设备登录的账户。任务保存在服务器 SQLite，包含公开账户和金额；清除浏览器会话后不能恢复。对话与必要工具结果发送给现有 OpenAI 服务，密钥仅在服务器。

核验依赖固定 RPC 的返回，不是独立轻客户端证明；不证明收款人的身份、订单归属或收益。没有托管、自动套利、后台代签、通用合约调用、自动代付存储。FT 收款方未注册存储时直接阻止，需另行处理后新建任务。

## 开发

```sh
npm ci
npm run build
WATCH_DB_PATH=./runtime/watch.sqlite npm start
npm test
```

新增 `frontend/wallet.js` 经 esbuild 生成公开浏览器包；提交构建产物，Docker 使用已构建文件。新增 `wallet.sqlite` 位于 `WATCH_DB_PATH` 同目录，沿用持久卷，不改动已有观察和支付数据库。

只在 `/agent/wallet/` HTML 放开连接器需要的 nonce 脚本、行内样式及列出的 GitHub/Meteor/RPC 地址，其他页面继续使用原 CSP。钱包的第三方代码在连接器的 `allow-scripts` iframe 内运行，升级需复核固定版本。
