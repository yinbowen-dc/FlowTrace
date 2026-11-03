import {z} from 'zod';
import {accountId,txHash,ASSETS} from '../public/lib/core.js';
const account=z.string().refine(accountId,'需要有效NEAR账户');
const hash=z.string().refine(txHash,'需要32字节Base58交易哈希');
const asset=z.enum(Object.keys(ASSETS));
const amount=z.string().max(70).regex(/^\d{1,39}(?:\.\d+)?$/,'金额使用正十进制字符串');
const date=z.iso.datetime({offset:true});
export const schemas={
  near_network_status:z.strictObject({}),
  near_account_overview:z.strictObject({accountId:account}),
  near_account_permissions:z.strictObject({accountId:account}),
  near_verify_receipt:z.strictObject({txHash:hash,senderAccountId:account,recipient:account,asset}),
  intents_get_status:z.strictObject({depositAddress:z.string().regex(/^[A-Za-z0-9:_.-]{5,128}$/),depositMemo:z.string().max(256).regex(/^[^\u0000-\u001f]*$/).optional()}),
  near_investigate_payment:z.strictObject({txHash:hash,senderAccountId:account,recipient:account,asset,expectedAmount:amount,createdAt:date,dueAt:date,merchantStatus:z.enum(['paid','unpaid','refunded','unknown']).default('unknown'),depositAddress:z.string().regex(/^[A-Za-z0-9:_.-]{5,128}$/).optional(),depositMemo:z.string().max(256).regex(/^[^\u0000-\u001f]*$/).optional()}).refine(x=>!x.depositMemo||x.depositAddress,'Memo必须与入金地址一起提供'),
  near_transfer_preflight:z.strictObject({accountId:account,recipient:account,asset,amount,maxAmount:amount.optional()})
};
export const tasks={account_inspect:'near_account_overview',payment_investigate:'near_investigate_payment',transfer_preflight:'near_transfer_preflight'};
export const runSchema=z.strictObject({task:z.enum(Object.keys(tasks)),input:z.record(z.string(),z.unknown())});
export const descriptions={
  near_network_status:'读取NEAR主网同步状态与final区块锚点；缓存最多15秒。',
  near_account_overview:'在同一个final区块读取原生NEAR及USDC、USDT、wNEAR余额。失败保留未知状态，不能代表全部资产。',
  near_account_permissions:'读取账户访问公钥和权限。FunctionCall allowance是Gas预算，不是代币支出上限；这不是安全审计。',
  near_verify_receipt:'核对单笔FINAL交易中指定FT合约对收款账户的标准事件净变化；不证明发票归属或来源链退款。',
  intents_get_status:'读取1Click渠道报告；SUCCESS不独立证明到账，REFUNDED不独立证明退款。',
  near_investigate_payment:'比较单笔订单、1Click可选状态和NEAR收据，定位少付、超额、时窗及状态差异；不跨全部订单查重。',
  near_transfer_preflight:'只读检查指定FT余额、收款方存储注册及NEAR费用预留，生成未签名钱包请求。不是链上模拟，不签名、不广播。maxAmount仅检查本次输入，不授权执行。'
};
