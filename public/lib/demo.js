import {ASSETS,normalizeOrder,atomic} from './core.js';
export const DEMO_AS_OF='2026-11-03T04:00:00.000Z';
const hash=n=>'1'.repeat(31)+'23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[n];
export function mockChain(order,amount,{refund='0',finality='FINAL',overall=true}={}){
  const blockHash='synthetic-block-001',id='synthetic-receipt-'+order.txHash;
  const event=(old,newOwner,value,memo)=>'EVENT_JSON:'+JSON.stringify({standard:'nep141',version:'1.0.0',event:'ft_transfer',data:[{old_owner_id:old,new_owner_id:newOwner,amount:atomic(value,order.decimals),memo}]});
  const logs=[event('settlement.demo.near',order.recipient,amount,'synthetic payment')];
  if(refund!=='0')logs.push(event(order.recipient,'settlement.demo.near',refund,'synthetic refund'));
  return {ok:true,network:'mainnet',source:'synthetic:NEAR-RPC-fixture',fetchedAt:DEMO_AS_OF,
    query:{txHash:order.txHash,senderAccountId:order.senderAccountId,recipient:order.recipient,tokenContract:order.tokenContract},
    raw:{transaction:{hash:order.txHash,signer_id:order.senderAccountId},final_execution_status:finality,status:overall?{SuccessValue:''}:{Failure:{synthetic:true}},
      receipts_outcome:[{id,block_hash:blockHash,outcome:{executor_id:order.tokenContract,status:{SuccessValue:''},logs}}]},
    blocks:{[blockHash]:{header:{hash:blockHash,height:222000001,timestamp_nanosec:String(BigInt(Date.parse(DEMO_AS_OF)-120000)*1000000n)}}},finalHead:{height:222000010,hash:'synthetic-final-head'}};
}
export function mockProvider(order,status='SUCCESS'){
  return {ok:true,source:'synthetic:1Click-status-fixture',fetchedAt:DEMO_AS_OF,signatureVerified:false,query:{depositAddress:order.depositAddress,depositMemo:order.depositMemo},
    raw:{status,updatedAt:'2026-11-03T03:58:00.000Z',correlationId:'synthetic-'+order.id,quoteResponse:{quoteRequest:{recipient:order.recipient,destinationAsset:'nep141:'+ASSETS[order.asset].contract,recipientType:'DESTINATION_CHAIN',swapType:'EXACT_INPUT',depositType:'ORIGIN_CHAIN'},quote:{depositAddress:order.depositAddress,depositMemo:order.depositMemo}},
      swapDetails:{destinationChainTxHashes:order.txHash?[{hash:order.txHash}]:[],refundedAmount:status==='REFUNDED'?'100000000':undefined}}};
}
export function demoRecords(){
  const specs=[
    ['FT-26031','Northstar Studio','125','125','paid','SUCCESS','matched','正常到账：三方记录一致'],
    ['FT-26032','Mori Design','100','98.5','paid','SUCCESS','underpaid','少付1.5 USDC，原因待核实'],
    ['FT-26033','Orbit Labs','245','245','unpaid','SUCCESS','merchant_gap','链上已到，商家还显示未支付'],
    ['FT-26034','Atlas Research','80',null,'unpaid','SUCCESS','unverified','渠道成功，尚无可核验目标收据'],
    ['FT-26035','Cedar Goods','360',null,'unpaid','PROCESSING','overdue','超过商家期限，渠道仍在处理'],
    ['FT-26036','Plain Workshop','150',null,'unpaid','REFUNDED','refund_unverified','渠道报告退款，来源链尚未核验'],
    ['FT-26037','Lumen Team','180','180','paid','SUCCESS','duplicate','一份收据关联了两笔订单'],
    ['FT-26038','Lumen Team','180','180','paid','SUCCESS','duplicate','重复收据的第二笔订单'],
    ['FT-26039','Field Notes','100','100','paid','SUCCESS','underpaid','同笔交易先转入100，再全部退回'],
    ['FT-26040','Forma Supply','100','105','paid','SUCCESS','overpaid','到账比应收多5 USDC']
  ];
  return specs.map(([id,customer,expected,received,merchantStatus,status,expectedCode,caseNote],i)=>{
    const order=normalizeOrder({id,customer,expectedAmount:expected,asset:'USDC',recipient:'merchant.demo.near',sourceChain:['Base','Ethereum','Solana'][i%3],merchantStatus,
      createdAt:'2026-11-03T03:00:00.000Z',dueAt:i===4?'2026-11-03T03:30:00.000Z':'2026-11-03T05:00:00.000Z',
      depositAddress:'0x'+(i+10).toString(16).padStart(40,'0'),depositMemo:'',txHash:received===null?'':hash(i===7?6:i),senderAccountId:received===null?'':'settlement.demo.near',note:caseNote});
    return {order,caseNote,expectedCode,evidence:{provider:mockProvider(order,status),...(received!==null?{chain:mockChain(order,received,{refund:i===8?'100':'0'})}:{})}};
  });
}
