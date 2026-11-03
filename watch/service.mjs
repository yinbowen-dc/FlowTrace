import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {QueryError} from '../adapters.mjs';
import {accountId,atomic,ASSETS,txHash} from '../public/lib/core.js';
import {compareAccountSnapshots} from '../agent/changes.mjs';
export const DEFAULT_RULES={balances:true,keys:true,code:true,thresholds:{NEAR:'1',USDC:'10',USDT:'10',wNEAR:'1'}};
const amount=(decimals)=>z.string().max(70).refine(value=>{try{return BigInt(atomic(value,decimals))>=0n;}catch{return false;}},'阈值必须是代币精度范围内的非负十进制字符串');
const ruleSchema=z.strictObject({balances:z.boolean().default(true),keys:z.boolean().default(true),code:z.boolean().default(true),thresholds:z.strictObject({NEAR:amount(24).default('1'),USDC:amount(6).default('10'),USDT:amount(6).default('10'),wNEAR:amount(24).default('1')}).default(()=>({...DEFAULT_RULES.thresholds}))}).refine(x=>x.balances||x.keys||x.code,'至少选择一种观察规则');
const addSchema=z.strictObject({accountId:z.string().refine(accountId,'需要有效的NEAR账户'),rules:ruleSchema.default(()=>structuredClone(DEFAULT_RULES))});
const actionSchema=z.strictObject({id:z.uuid().optional(),action:z.enum(['pause','resume','extend','delete','check','ack'])}).refine(x=>x.action==='ack'||!!x.id,'需要观察ID');
const eventsSchema=z.strictObject({before:z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional()});
const parse=(schema,value)=>{const p=schema.safeParse(value);if(!p.success)throw new QueryError('INVALID_INPUT',p.error.issues.slice(0,2).map(x=>x.message).join('; '),400);return p.data;};
const trimAnchor=a=>({height:a.height,hash:a.hash,blockTime:a.blockTime,fetchedAt:a.fetchedAt,source:a.source});
export function filterWatchFindings(report,rules){return report.findings.filter(f=>{
  if(f.kind==='balance_change'){
    if(!rules.balances)return false;
    const symbol=f.symbol==='NEAR locked'?'NEAR':f.symbol,decimals=symbol==='NEAR'?24:ASSETS[symbol]?.decimals;
    if(decimals===undefined)return false;
    const n=BigInt(f.deltaAtomic),threshold=BigInt(atomic(rules.thresholds[symbol],decimals));return n!==0n&&(n<0n?-n:n)>=threshold;
  }
  return f.kind==='contract_code_changed'?rules.code:rules.keys;
});}
function compactReport(report,before,after,rules,findings){
  const count={added:report.permissions.added.length,removed:report.permissions.removed.length,changed:report.permissions.changed.length};
  return {from:trimAnchor(before.anchor),to:trimAnchor(after.anchor),rules,balances:report.balances,permissions:{status:report.permissions.status,counts:count,publicKeys:[...report.permissions.added,...report.permissions.removed,...report.permissions.changed].slice(0,20).map(x=>x.publicKey.slice(0,100)),detailsTruncated:count.added+count.removed+count.changed>20},contract:report.contract,findings:findings.slice(0,30).map(f=>({...f,...(f.publicKey?{publicKey:f.publicKey.slice(0,100)}:{})})),findingCount:findings.length,scope:'两个final快照的净变化；不是完整流水、被盗判定或安全审计。权限公钥最多展示20条，变化摘要最多30条。'};
}
function validateSnapshot(snapshot,account,now){
  const a=snapshot?.anchor;
  if(snapshot?.accountId!==account||a?.network!=='mainnet'||!Number.isSafeInteger(a.height)||a.height<0||!txHash(a.hash)||!Number.isFinite(Date.parse(a.blockTime))||!Number.isFinite(Date.parse(a.fetchedAt))||Math.abs(now-Date.parse(a.fetchedAt))>120000)throw new QueryError('WATCH_ANCHOR','本轮未获得匹配的新鲜主网区块');
  if(Buffer.byteLength(JSON.stringify(snapshot))>512*1024)throw new QueryError('WATCH_SNAPSHOT_SIZE','账户快照超过观察服务读取范围');
  if(snapshot.quality!=='complete_within_scope'||compareAccountSnapshots(snapshot,snapshot).quality!=='complete_within_scope')throw new QueryError('WATCH_INCOMPLETE','余额、权限或代码查询不完整；保留上次完整基线');
}
export function createWatchService({store,service,clock=Date.now,pollMs=180000,leaseMs=86400000,tickMs=5000,autoStart=true}={}){
  let stopped=false,timer=null,inFlight=null,closePromise=null;
  const samples=new Map();
  const status=token=>({enabled:true,now:new Date(clock()).toISOString(),pollSeconds:pollMs/1000,leaseHours:leaseMs/3600000,limits:store.limits,...store.read(token,clock())});
  function add(token,body){const input=parse(addSchema,body),known=store.owner(token,clock()),sessionToken=known?token:randomBytes(32).toString('base64url');store.add(sessionToken,input,clock(),leaseMs);return {data:status(sessionToken),sessionToken};}
  function action(token,body){store.action(token,parse(actionSchema,body),clock(),leaseMs);return status(token);}
  function events(token,body){const {before}=parse(eventsSchema,body);return {events:store.events(token,before,clock())};}
  async function observe(group){
    let snapshot,error;
    try{const cached=samples.get(group.accountId);if(cached&&clock()-cached.at<Math.min(60000,pollMs)){if(cached.error)throw cached.error;snapshot=cached.snapshot;}else{try{snapshot=(await service.run({task:'account_inspect',input:{accountId:group.accountId}})).data;validateSnapshot(snapshot,group.accountId,clock());samples.set(group.accountId,{at:clock(),snapshot});}catch(e){samples.set(group.accountId,{at:clock(),error:e});throw e;}while(samples.size>20)samples.delete(samples.keys().next().value);}validateSnapshot(snapshot,group.accountId,clock());}catch(e){error=e;}
    for(const w of group.watches){const now=clock();try{
      if(error)throw error;
      const before=w.baseline,events=[];
      if(before){
        if(snapshot.anchor.height<before.anchor.height||Date.parse(snapshot.anchor.blockTime)<Date.parse(before.anchor.blockTime)||(snapshot.anchor.height===before.anchor.height&&snapshot.anchor.hash!==before.anchor.hash)||(snapshot.anchor.height>before.anchor.height&&snapshot.anchor.hash===before.anchor.hash))throw new QueryError('WATCH_ANCHOR_CONFLICT','本轮区块没有可靠推进；保留上次完整基线');
        if(snapshot.anchor.height===before.anchor.height){store.finish(w,{state:'observing',nextAt:now+pollMs},now);continue;}
        const report=compareAccountSnapshots(before,snapshot),findings=filterWatchFindings(report,w.rules);
        if(findings.length)events.push({kind:'changes',report:compactReport(report,before,snapshot,w.rules,findings)});
      }else events.push({kind:'baseline',report:{anchor:trimAnchor(snapshot.anchor),message:'已建立完整基线；后续从这个区块开始核对。'}});
      if(w.error_code)events.push({kind:'recovered',report:{anchor:trimAnchor(snapshot.anchor),message:'查询恢复；变化范围以报告的起止区块为准。'}});
      store.finish(w,{snapshot,state:'observing',nextAt:now+pollMs,events},now);
    }catch(e){const code=e instanceof QueryError?e.code:'WATCH_QUERY_FAILED';store.finish(w,{state:'unknown',errorCode:code,nextAt:now+Math.min(pollMs*2**Math.min(w.failures,3),900000),events:w.error_code===code?[]:[{kind:'query_unknown',report:{code,message:e instanceof QueryError?e.message:'本轮查询未完成；保留上次完整基线，不能据此判断没有变化。'}}]},now);}}
  }
  async function tick(){
    if(stopped)return;if(inFlight)return inFlight;
    inFlight=(async()=>{for(const group of store.claim(clock(),2)){if(stopped)break;await observe(group);}})().finally(()=>{inFlight=null;});
    return inFlight;
  }
  function start(){if(timer||stopped)return;timer=setInterval(()=>{void tick().catch(()=>console.error('WATCH_CYCLE_FAILED'));},tickMs);timer.unref?.();void tick().catch(()=>console.error('WATCH_CYCLE_FAILED'));}
  function close(){if(closePromise)return closePromise;stopped=true;if(timer)clearInterval(timer);closePromise=(async()=>{await inFlight?.catch(()=>{});store.close();})();return closePromise;}
  if(autoStart)start();
  return {status,add,action,events,tick,start,close};
}
