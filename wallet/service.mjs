import {z} from 'zod';
import {QueryError} from '../adapters.mjs';
import {schemas} from '../agent/schemas.mjs';
import {txHash,ASSETS,atomic} from '../public/lib/core.js';
import {randomUUID} from 'node:crypto';
const identifier=z.string().uuid(),revision=z.number().int().positive();
const operation=z.strictObject({id:identifier,revision});
export const walletSchemas={prepare:schemas.near_transfer_preflight,open:operation.extend({accountId:z.string()}),result:operation.extend({attemptId:identifier,txHash:z.string().refine(txHash).optional()}),check:operation,cancel:operation,detail:z.strictObject({id:identifier.nullable().optional()}),focus:z.strictObject({id:identifier}),tracking:operation.extend({action:z.enum(['pause','resume'])})};
const parse=(s,x)=>{const r=s.safeParse(x);if(!r.success)throw new QueryError('INVALID_INPUT','请核对账户、金额与任务字段',400);return r.data;};
export function createWalletService({store,service,adapters,clock=()=>Date.now(),autoStart=true,tickMs=5000}={}){
  let stopped=false,timer=null,inFlight=null,closePromise=null;
  const status=token=>({enabled:true,network:'mainnet',tasks:store.list(token),retentionDays:7,maxTasks:20,serverSigning:false,backgroundVerification:{enabled:true,leaseHours:24,maxChecks:60,automaticModelCalls:false},focusTaskId:store.conversation(token).focusTaskId});
  async function prepare(token,input,{requestId,beforeWrite=()=>{}}={}){input=parse(walletSchemas.prepare,input);const preflight=await service.call('near_transfer_preflight',input);beforeWrite();return store.create(token,{network:'mainnet',state:preflight.state==='ready_for_wallet_review'?'ready':preflight.state,input,preflight,txHash:null,attemptId:null,report:null},{requestId});}
  async function open(token,raw){const x=parse(walletSchemas.open,raw),t=store.read(token,x.id);if(t.revision!==x.revision)throw new QueryError('WALLET_CONFLICT','任务已更新，请刷新',409);if(t.state!=='ready')throw new QueryError('WALLET_STATE','本任务无法再次打开钱包；如已提交请核验交易',409);if(t.input.accountId!==x.accountId)throw new QueryError('WALLET_ACCOUNT','请连接与付款账户一致的主网钱包',409);
    const preflight=await service.call('near_transfer_preflight',t.input);if(preflight.state!=='ready_for_wallet_review'||Date.parse(preflight.expiresAt)<=clock())return store.update(token,t.id,t.revision,{...t,preflight,state:preflight.state==='blocked'?'blocked':'incomplete'});
    return store.update(token,t.id,t.revision,{...t,preflight,state:'wallet_open',attemptId:randomUUID(),walletOpenedAt:new Date(clock()).toISOString()});
  }
  function result(token,raw){const x=parse(walletSchemas.result,raw),t=store.read(token,x.id);if(!['wallet_open','needs_hash'].includes(t.state)||t.attemptId!==x.attemptId)throw new QueryError('WALLET_STATE','钱包尝试不匹配或任务已提交',409);if(x.txHash&&store.claimed(token,x.txHash,t.id))throw new QueryError('WALLET_DUPLICATE','此哈希已关联另一任务，请先核对原任务',409);return store.update(token,t.id,x.revision,{...t,state:x.txHash?'submitted':'needs_hash',txHash:x.txHash||null});}
  function cancel(token,raw){const x=parse(walletSchemas.cancel,raw),t=store.read(token,x.id);if(!['ready','blocked','incomplete'].includes(t.state))throw new QueryError('WALLET_STATE','钱包已打开，请先在钱包中核对；本服务无法撤销链上交易',409);return store.update(token,t.id,x.revision,{...t,state:'cancelled'});}
  async function verify(t){
    const deadline=clock()+25000,query={tx_hash:t.txHash,sender_account_id:t.input.accountId,wait_until:'NONE'};
    const {raw:r,source}=await adapters.rpc('EXPERIMENTAL_tx_status',query,deadline);
    const report={checkedAt:new Date(clock()).toISOString(),source,network:'mainnet',txHash:t.txHash,finalExecutionStatus:r.final_execution_status};
    if(r.final_execution_status!=='FINAL')return {...report,state:'pending',message:'尚未取得FINAL执行结果'};
    const tx=r.transaction,txo=r.transaction_outcome;
    if(tx?.hash!==t.txHash||tx.signer_id!==t.input.accountId||txo?.id!==t.txHash)throw new QueryError('WALLET_EVIDENCE','节点交易标识与付款账户不匹配');
    if(!Array.isArray(tx.actions)||tx.actions.length!==1)throw new QueryError('WALLET_MISMATCH','交易不是此任务要求的单一转账');
    const p=t.preflight.walletRequest,a=tx.actions[0],expected=p.actions[0];let matches=false;
    if(t.input.asset==='NEAR')matches=tx.receiver_id===t.input.recipient&&Object.keys(a).length===1&&a.Transfer?.deposit===expected.params.deposit;
    else {let args;try{args=JSON.parse(Buffer.from(a.FunctionCall?.args||'','base64').toString());}catch{}matches=tx.receiver_id===ASSETS[t.input.asset].contract&&Object.keys(a).length===1&&a.FunctionCall?.method_name==='ft_transfer'&&String(a.FunctionCall.deposit)==='1'&&String(a.FunctionCall.gas)===expected.params.gas&&args&&Object.keys(args).sort().join(',')==='amount,receiver_id'&&args.receiver_id===t.input.recipient&&args.amount===expected.params.args.amount;}
    if(!matches)throw new QueryError('WALLET_MISMATCH','链上收款方、资产或金额与任务不一致');
    const outs=r.receipts_outcome;if(!Array.isArray(outs)||!outs.length||outs.length>16)throw new QueryError('WALLET_EVIDENCE','收据缺失或超出本版核验范围');
    if(!txo.outcome?.status||!outs.every(o=>o.outcome?.status))throw new QueryError('WALLET_EVIDENCE','交易执行状态缺失');
    if(r.status?.Failure||txo.outcome.status.Failure||outs.some(o=>o.outcome.status.Failure))return {...report,state:'failed',message:'FINAL执行失败；请核对钱包费用与错误记录'};
    const succeeded=s=>s&&(Object.hasOwn(s,'SuccessValue')||typeof s.SuccessReceiptId==='string');
    if(!succeeded(r.status)||!succeeded(txo.outcome.status)||!outs.every(o=>succeeded(o.outcome.status)))throw new QueryError('WALLET_EVIDENCE','未取得完整的成功执行证据');
    const first=outs.find(o=>o.id===txo.outcome.status.SuccessReceiptId);if(!first||first.outcome.executor_id!==p.receiverId)throw new QueryError('WALLET_EVIDENCE','缺少目标转账收据');
    const final=await adapters.rpc('block',{finality:'final'},deadline),fh=final.raw.header;const blocks=[];
    for(const hash of new Set([txo.block_hash,...outs.map(o=>o.block_hash)])){if(!txHash(hash))throw new QueryError('WALLET_EVIDENCE','收据区块哈希无效');const b=await adapters.rpc('block',{block_id:hash},deadline),h=b.raw.header;if(h?.hash!==hash||!Number.isSafeInteger(h.height)||!Number.isSafeInteger(fh?.height)||h.height>fh.height||h.height<t.preflight.anchor.height)throw new QueryError('WALLET_EVIDENCE','收据不在本次任务之后的final区块范围内');blocks.push({hash,height:h.height});}
    if(t.input.asset!=='NEAR'){const ft=await service.call('near_verify_receipt',{txHash:t.txHash,senderAccountId:t.input.accountId,recipient:t.input.recipient,asset:t.input.asset});if(!ft.facts.verified||ft.facts.receivedAtomic!==atomic(t.input.amount,ASSETS[t.input.asset].decimals))throw new QueryError('WALLET_EVIDENCE','FT标准事件净到账尚未与任务金额匹配');report.received=ft.received;}
    return {...report,state:'completed',message:'FINAL执行、转账参数与目标收据核验通过',blocks,finalHead:{height:fh.height,hash:fh.hash},scope:'固定RPC返回的执行与区块证据；不是独立轻客户端证明，不证明对方控制权或业务订单归属。'};
  }
  async function check(token,raw,{background=false}={}){
    const x=parse(walletSchemas.check,raw),claim=store.checkLease(token,x.id,x.revision,{background});if(!claim)return null;const {task:t,lease}=claim;if(!lease)return t;
    let report;try{report=await verify(t);}catch(e){report={state:'unknown',checkedAt:new Date(clock()).toISOString(),error:{code:e.code||'QUERY_FAILED',message:e instanceof QueryError?e.message:'本次链上核验未完成'}};}
    return store.finishCheck(token,t,lease,{...t,state:report.state==='pending'?'submitted':report.state,report,lastCheckedAt:new Date(clock()).toISOString()});
  }
  function detail(token,raw={}){const x=parse(walletSchemas.detail,raw),id=x.id||store.conversation(token).focusTaskId||store.list(token)[0]?.id;if(!id)throw new QueryError('WALLET_NOT_FOUND','当前会话还没有转账任务',404);return store.read(token,id);}
  function focus(token,raw){const x=parse(walletSchemas.focus,raw);store.focus(token,x.id);return detail(token,x);}
  function tracking(token,raw){const x=parse(walletSchemas.tracking,raw);return store.setTracking(token,x.id,x.revision,x.action);}
  async function tick(){if(stopped)return;if(inFlight)return inFlight;inFlight=(async()=>{for(const due of store.due()){if(stopped)break;try{await check(due.token,{id:due.id,revision:due.revision},{background:true});}catch(e){if(!['WALLET_CONFLICT','WALLET_COOLDOWN','WALLET_SESSION'].includes(e.code))console.error('WALLET_BACKGROUND_CHECK_FAILED');}}})().finally(()=>{inFlight=null;});return inFlight;}
  function start(){if(timer||stopped)return;timer=setInterval(()=>{void tick().catch(()=>console.error('WALLET_BACKGROUND_CYCLE_FAILED'));},tickMs);timer.unref?.();void tick().catch(()=>console.error('WALLET_BACKGROUND_CYCLE_FAILED'));}
  function close(){if(closePromise)return closePromise;stopped=true;if(timer)clearInterval(timer);closePromise=(async()=>{await inFlight?.catch(()=>{});store.close();})();return closePromise;}
  if(autoStart)start();
  return {status,prepare,open,result,check,cancel,detail,focus,tracking,tick,start,close,conversations:store,accessStatus:store.accessStatus,createAccess:store.createAccess,authorizeAccess:store.authorizeAccess,revokeAccess:store.revokeAccess};
}
