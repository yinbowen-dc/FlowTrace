# 字段模板与公开样本

- `orders-template.csv`：从公开网页实际下载的模板。保留表头，替换中文占位账户、时间、金额和关联标识后导入。占位账户故意不能直接通过校验。
- `orders.json`：字段格式示例，不是真实商家订单。`example-merchant.near` 也是待替换账户；空白查询字段不会自动补造。
- `public-receipt-evidence.json`：从公开网页下载的真实 NEAR 转账历史快照。比较金额取自收据净额，只用于展示离线重跑，不证明跨链支付或发票归属。

在项目根目录运行 `npm run replay -- examples/public-receipt-evidence.json`，不需要钱包、密钥或网络。文件内的 SHA256 只检查内容一致性，不独立证明 RPC 真实性或当前订单状态。

- `account-changes-verification.json`：v0.4 主网快照对比、标准 MCP 客户端和真实模型工具调用的历史核验摘要；不是当前余额或持续监控数据。
