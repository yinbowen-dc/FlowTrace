# FlowTrace · NEAR Hackathon 提交准备

官网与提交表单：https://nearhackathon.com/ （页面底部Submit）。

规则核验日期：2026-11-03。无需提前报名，提交截止为2026-11-14 23:59 UTC，即北京时间11月15日07:59。实际资格与最新规则以官网为准。

## 当前产品

公开演示：https://www.darkchunk.win/collect/agent/

可通过对话或手动表单读取NEAR主网账户余额及权限、排查FT收款差异、预检FT转账并生成未签名模板。同一套后端同时提供7个MCP工具和3个任务API，配套Skill可下载。

## 建议赛道

优先考虑AI Security & Defense：用明确的输入、可复核的证据与转账规则预检，降低Agent误操作。收款排查可考虑Real-World Money。当前maxAmount是应用参数检查，不是链上支出上限；不能把此项目描述成已实现钱包授权隔离或链上资金保护。

## 提交前补齐

- 公开代码仓库：https://github.com/yinbowen-dc/flowtrace-near 。项目以 MIT 许可证发布；比赛尚未提交。
- X演示帖子URL：说明项目为NEAR HACKATHON构建，按官网要求标记@NEARProtocol、#NEARHackathon，并附演示视频或截图。
- 项目名称、20–2000字符介绍、团队负责人、邮箱、团队人数、NEAR收奖账户等，按官方表单填写。
- 演示可使用公开账户和历史转账，但需要标明没有这些账户的控制权、不是真实商家订单。

## 建议演示脚本

1. 在对话框输入“查询wrap.near余额和公钥权限”，展示实际工具结果、来源及final锚点。
2. 点击“在手动面板复核这次结果”，查看相同参数与JSON报告。
3. 预检0.01 wNEAR、本次上限0.001 wNEAR，展示blocked及无可执行模板；没有发出任何交易。
4. 用手动面板核对附带的历史USDC收款，说明事件净额、订单关联和渠道状态各自的核验范围。
5. 展示MCP工具目录和配套Skill，说明其他Agent如何复用。

此文档是准备材料，不代表报名或提交成功。网页不会代替你发布仓库、发帖或勾选官网的隐私同意。
