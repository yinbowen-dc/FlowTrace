export const RULE_VERSION = 'flowtrace-1';
export const ASSETS = Object.freeze({
  USDC: {symbol:'USDC',decimals:6,contract:'17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1'},
  USDT: {symbol:'USDT',decimals:6,contract:'usdt.tether-token.near'},
  wNEAR: {symbol:'wNEAR',decimals:24,contract:'wrap.near'}
});
export const STATES = Object.freeze({
  matched:{label:'到账一致',tone:'green'}, underpaid:{label:'到账不足',tone:'red'}, overpaid:{label:'超额到账',tone:'amber'},
  merchant_gap:{label:'商家状态未同步',tone:'amber'}, provider_conflict:{label:'渠道与收据冲突',tone:'red'},
  refund_unverified:{label:'退款待核验',tone:'amber'}, duplicate:{label:'收据重复关联',tone:'red'},
  overdue:{label:'处理超时',tone:'amber'}, pending:{label:'等待处理',tone:'blue'}, unverified:{label:'证据待补齐',tone:'slate'},
  stale:{label:'查询已过期',tone:'amber'}, failed:{label:'渠道报告失败',tone:'red'}
});
const U128 = (1n<<128n)-1n;
export const accountId = x => typeof x==='string' && x.length>=2 && x.length<=64 && /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(x);
export function txHash(x) {
  if(typeof x!=='string'||x.length<32||x.length>44||!/^[1-9A-HJ-NP-Za-km-z]+$/.test(x)) return false;
  let n=0n; const abc='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  for(const c of x)n=n*58n+BigInt(abc.indexOf(c));
  const zeros=x.match(/^1*/)[0].length;
  return zeros+(n===0n?0:Math.ceil(n.toString(16).length/2))===32;
}
export function atomic(value,decimals) {
  if(typeof value!=='string'||!/^\d{1,39}(?:\.\d+)?$/.test(value))throw Error('金额请填写十进制字符串，不支持科学计数法或负数');
  const [a,b='']=value.split('.');
  if(b.length>decimals)throw Error(`金额最多支持${decimals}位小数`);
  const n=BigInt(a)*10n**BigInt(decimals)+BigInt((b||'').padEnd(decimals,'0')||'0');
  if(n>U128)throw Error('金额超过NEP-141范围');
  return n.toString();
}
export function decimal(value,decimals) {
  let n=BigInt(value),sign=n<0n?'-':''; if(n<0n)n=-n;
  const unit=10n**BigInt(decimals),fraction=(n%unit).toString().padStart(decimals,'0').replace(/0+$/,'');
  return sign+(n/unit).toString()+(fraction?'.'+fraction:'');
}
const textField=(x,max,label,required=false)=>{
  if(x===undefined||x===null||x===''){if(required)throw Error(`${label}不能为空`);return '';}
  if(typeof x!=='string'||x.length>max||/[\u0000-\u001f]/.test(x))throw Error(`${label}格式不正确`);
  return x.trim();
};
function dateField(x,label,required=true){const s=textField(x,40,label,required);if(!s)return '';if(!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(s)||!Number.isFinite(Date.parse(s)))throw Error(`${label}需要带时区的ISO时间`);return new Date(s).toISOString();}
export function normalizeOrder(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('订单必须是对象');
  const id=textField(raw.id,80,'订单编号',true),customer=textField(raw.customer,100,'客户')||'未命名客户';
  if(!/^[\w\u4e00-\u9fff.-]+$/.test(id))throw Error('订单编号仅支持文字、数字、点、横线和下划线');
  const asset=textField(raw.asset,12,'资产',true);if(!Object.hasOwn(ASSETS,asset))throw Error('首版支持USDC、USDT和wNEAR');
  const a=ASSETS[asset],expectedAmount=textField(raw.expectedAmount,70,'应收金额',true),expectedAtomic=atomic(expectedAmount,a.decimals);
  if(BigInt(expectedAtomic)<=0n)throw Error('应收金额必须大于0');
  if(raw.settlementChain&&raw.settlementChain!=='near')throw Error('首版仅核验目标链NEAR');
  const recipient=textField(raw.recipient,64,'NEAR收款账户',true);if(!accountId(recipient))throw Error('NEAR收款账户不正确');
  const senderAccountId=textField(raw.senderAccountId,64,'签名账户');if(senderAccountId&&!accountId(senderAccountId))throw Error('NEAR签名账户不正确');
  const hash=textField(raw.txHash,44,'交易哈希');if(hash&&!txHash(hash))throw Error('NEAR交易哈希需要32字节Base58值');
  const depositAddress=textField(raw.depositAddress,128,'渠道入金地址');if(depositAddress&&!/^[A-Za-z0-9:_.-]{5,128}$/.test(depositAddress))throw Error('渠道入金地址格式不正确');
  const depositMemo=textField(raw.depositMemo,256,'入金Memo');
  const createdAt=dateField(raw.createdAt,'创建时间'),dueAt=dateField(raw.dueAt,'到期时间');
  if(Date.parse(dueAt)<=Date.parse(createdAt))throw Error('到期时间需要晚于创建时间');
  const merchantStatus=textField(raw.merchantStatus,16,'商家状态')||'unpaid';if(!['paid','unpaid','refunded','unknown'].includes(merchantStatus))throw Error('商家状态应为paid/unpaid/refunded/unknown');
  return {id,customer,asset,expectedAmount:decimal(expectedAtomic,a.decimals),expectedAtomic,tokenContract:a.contract,decimals:a.decimals,
    recipient,createdAt,dueAt,sourceChain:textField(raw.sourceChain,32,'来源链')||'未指定',settlementChain:'near',merchantStatus,
    depositAddress,depositMemo,txHash:hash,senderAccountId,note:textField(raw.note,300,'备注')};
}
export function importOrders(content,format='json') {
  if(typeof content!=='string'||new TextEncoder().encode(content).length>1048576)throw Error('文件最大1MB');
  let rows;
  if(format==='json'){const data=JSON.parse(content);rows=Array.isArray(data)?data:data.orders;}
  else {const records=parseCSV(content);const headers=records.shift()||[];if(new Set(headers).size!==headers.length)throw Error('CSV表头不能重复');rows=records.filter(x=>x.some(Boolean)).map((values,i)=>{if(values.length!==headers.length)throw Error(`CSV第${i+2}行列数不一致`);return Object.fromEntries(headers.map((h,j)=>[h,values[j]]));});}
  if(!Array.isArray(rows)||!rows.length||rows.length>200)throw Error('每次需导入1至200笔订单');
  const result=rows.map((x,i)=>{try{return normalizeOrder(x);}catch(e){throw Error(`第${i+1}笔：${e.message}`);}});
  if(new Set(result.map(x=>x.id)).size!==result.length)throw Error('导入文件存在重复订单编号');
  return result;
}
export function parseCSV(s) {
  s=s.replace(/^\uFEFF/,'');let rows=[],row=[],field='',quoted=false,ended=false;
  for(let i=0;i<s.length;i++){const c=s[i];if(quoted){if(c==='"'){if(s[i+1]==='"'){field+='"';i++;}else{quoted=false;ended=true;}}else field+=c;}
    else if(c==='"'){if(field||ended)throw Error('CSV引号位置不正确');quoted=true;}
    else if(c===','){row.push(field);field='';ended=false;}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';ended=false;}
    else {if(ended)throw Error('CSV引号后存在非法字符');field+=c;}}
  if(quoted)throw Error('CSV引号未闭合');if(field||row.length){row.push(field);rows.push(row);}return rows;
}
const success=s=>s&&typeof s==='object'&&(Object.hasOwn(s,'SuccessValue')||Object.hasOwn(s,'SuccessReceiptId'));
export function chainFacts(chain,order) {
  const base={verified:false,receivedAtomic:null,events:[],receiptKeys:[],issues:[],txHash:order.txHash,blockTime:null};
  if(!chain?.ok){base.issues.push(chain?.error?.message||'尚未读取链上收据');return base;}
  const r=chain.raw,q=chain.query||{};
  if(chain.network!=='mainnet'||q.recipient!==order.recipient||q.tokenContract!==order.tokenContract||q.txHash!==order.txHash||q.senderAccountId!==order.senderAccountId){base.issues.push('查询标识与订单不一致');return base;}
  if(!r?.transaction||r.transaction.hash!==order.txHash||r.transaction.signer_id!==order.senderAccountId){base.issues.push('RPC交易身份不匹配');return base;}
  if(r.final_execution_status!=='FINAL'){base.issues.push('尚未取得FINAL执行结果');return base;}
  if(!success(r.status)){base.issues.push('交易整体执行失败或未知，需人工检查成功收据与补偿');return base;}
  if(!Array.isArray(r.receipts_outcome)||!r.receipts_outcome.length){base.issues.push('未取得完整执行收据');return base;}
  let total=0n,invalid=false;const ids=new Set();
  for(const item of r.receipts_outcome){
    if(!item?.id||ids.has(item.id)){invalid=true;base.issues.push('执行收据ID缺失或重复');continue;}ids.add(item.id);
    const o=item.outcome;if(!o||o.executor_id!==order.tokenContract||!success(o.status))continue;
    if(!Array.isArray(o.logs)){invalid=true;base.issues.push('代币收据日志缺失');continue;}
    for(let li=0;li<o.logs.length;li++){
      const log=o.logs[li];if(typeof log!=='string'||!log.startsWith('EVENT_JSON:'))continue;
      let e;try{e=JSON.parse(log.slice(11));}catch{invalid=true;base.issues.push('代币事件JSON无法解析');continue;}
      if(e.standard!=='nep141')continue;
      if(e.version!=='1.0.0'||!['ft_transfer','ft_mint','ft_burn'].includes(e.event)||!Array.isArray(e.data)){invalid=true;base.issues.push('不支持的代币事件格式');continue;}
      for(let di=0;di<e.data.length;di++){
        const d=e.data[di];if(!d||typeof d.amount!=='string'||!/^\d{1,39}$/.test(d.amount)||BigInt(d.amount)>U128){invalid=true;base.issues.push('代币事件金额不正确');continue;}
        let delta=0n;const value=BigInt(d.amount);
        if(e.event==='ft_transfer'){if(!accountId(d.new_owner_id)||!accountId(d.old_owner_id)){invalid=true;continue;}if(d.new_owner_id===order.recipient)delta+=value;if(d.old_owner_id===order.recipient)delta-=value;}
        else {if(!accountId(d.owner_id)){invalid=true;continue;}if(d.owner_id===order.recipient)delta=e.event==='ft_mint'?value:-value;}
        if(delta!==0n){const block=chain.blocks?.[item.block_hash]?.header;
          if(!block||block.hash!==item.block_hash||!Number.isSafeInteger(block.height)||!Number.isSafeInteger(chain.finalHead?.height)||block.height>chain.finalHead.height){invalid=true;base.issues.push('收据区块缺少final锚点');continue;}
          let time;try{const ms=Number(BigInt(block.timestamp_nanosec||block.timestamp)/1000000n);if(!Number.isSafeInteger(ms)||ms<=0)throw Error();time=new Date(ms).toISOString();}catch{invalid=true;base.issues.push('收据区块时间无效');continue;}
          base.events.push({id:item.id+':'+li+':'+di,receiptId:item.id,kind:e.event,deltaAtomic:delta.toString(),time,blockHeight:block.height,blockHash:item.block_hash,memo:typeof d.memo==='string'?d.memo.slice(0,300):''});
          total+=delta; base.blockTime=!base.blockTime||time>base.blockTime?time:base.blockTime;
          base.receiptKeys.push('near:'+order.tokenContract+':'+item.id+':'+li+':'+di);
        }
      }
    }
  }
  base.issues=[...new Set(base.issues)];
  if(invalid){base.issues.push('事件不完整，暂停自动核对');return base;}
  if(!base.events.length){base.issues.push('未找到该资产向该账户的标准转账事件');return base;}
  base.verified=true;base.receivedAtomic=total.toString();return base;
}
export function freshAt(value,now,maxAge=180000){const age=now-Date.parse(value);return Number.isFinite(age)&&age>=-30000&&age<=maxAge;}
export function diagnose(order,evidence={},context=[],asOf=new Date().toISOString()) {
  const now=Date.parse(asOf);if(!Number.isFinite(now))throw Error('评估时间无效');
  const facts=chainFacts(evidence.chain,order),findings=[];
  const add=(code,title,detail,action,tone='amber')=>findings.push({code,title,detail,action,tone});
  const p=evidence.provider,raw=p?.raw,status=p?.ok?raw?.status:null;
  const providerFresh=!!p?.ok&&freshAt(p.fetchedAt,now);
  if(facts.verified){
    if(Date.parse(facts.blockTime)<Date.parse(order.createdAt)-30000||Date.parse(facts.blockTime)>now+30000)add('provider_conflict','收据时间与订单窗口不一致','关联的转账早于订单创建，或出现未来时间。','核对是否为预付款、旧收据或错误关联；需要商家补充说明。','red');
    const reused=context.filter(x=>x.id!==order.id&&x.keys?.some(k=>facts.receiptKeys.includes(k)));
    if(reused.length)add('duplicate','收据关联到其他订单',`还关联了 ${reused.map(x=>x.id).join('、')}；不能重复确认收入。`,'核对订单到转账的关联，保留正确的一笔。','red');
    const delta=BigInt(facts.receivedAtomic)-BigInt(order.expectedAtomic);
    if(delta<0n)add('underpaid','目标资产净到账不足',`本交易净到账${decimal(facts.receivedAtomic,order.decimals)} ${order.asset}，比应收少${decimal(-delta,order.decimals)}。`,'检查目标金额约定、分笔支付、交易内退款及渠道费用；不直接归因手续费。','red');
    if(delta>0n)add('overpaid','目标资产超额到账',`本交易比应收多${decimal(delta,order.decimals)} ${order.asset}。`,'核对订单关联和金额约定；退款需人工在原系统处理。');
    if(order.merchantStatus!=='paid')add('merchant_gap','商家记录与已核验收据不同',`商家记录为${{unpaid:'未支付',refunded:'已退款',unknown:'未知'}[order.merchantStatus]||'未知'}，目标链存在成功转账。`,'核对商家数据库和回调日志；本工具不能证明回调确实丢失。');
  }
  if(p?.ok){
    const req=raw.quoteResponse?.quoteRequest,quote=raw.quoteResponse?.quote;
    if(!['KNOWN_DEPOSIT_TX','PENDING_DEPOSIT','INCOMPLETE_DEPOSIT','PROCESSING','SUCCESS','REFUNDED','FAILED'].includes(status))add('unverified','渠道返回未知状态','未识别的渠道状态不会被当作成功。','核对渠道原始响应。');
    if(p.query?.depositAddress!==order.depositAddress||(p.query?.depositMemo||'')!==(order.depositMemo||'')||!req||req.recipient!==order.recipient||req.destinationAsset!=='nep141:'+order.tokenContract||req.recipientType!=='DESTINATION_CHAIN'||!['EXACT_INPUT','EXACT_OUTPUT','FLEX_INPUT'].includes(req.swapType)||quote?.depositAddress!==order.depositAddress||(order.depositMemo||'')!==(quote?.depositMemo||''))add('provider_conflict','渠道订单关联不匹配','收款方、目标资产、入金标识或支持的兑换模式未通过核对。','检查入金地址和Memo；首版不自动核对ANY_INPUT及内部余额结算。','red');
    const hashes=raw.swapDetails?.destinationChainTxHashes?.map(x=>x.hash)||[];
    if(order.txHash&&hashes.length&&!hashes.includes(order.txHash))add('provider_conflict','目标交易不在渠道记录中','手动关联的NEAR交易不在渠道目标链交易列表里。','核对是否贴错交易或需要分笔关联。','red');
    if(facts.verified&&typeof raw.swapDetails?.amountOut==='string'&&/^\d{1,39}$/.test(raw.swapDetails.amountOut)&&BigInt(raw.swapDetails.amountOut)!==BigInt(facts.receivedAtomic))add('provider_conflict','渠道输出与单笔收据净额不同','渠道报告的目标输出金额和本交易净到账不一致。','核对是否多笔到账、错误关联或渠道数据尚未同步。','red');
    if(status==='SUCCESS'&&facts.verified&&!hashes.length)add('unverified','渠道缺少目标交易关联','链上转账可核验，但渠道未提供对应的目标交易哈希。','核对渠道原始记录；尚不能完整关联此跨链流程。');
    if(!providerFresh)add('stale','渠道查询已过有效时间','这份渠道查询超过3分钟或时间无效；final收据仅证明历史转账。','重新读取渠道状态。');
    else if(status==='REFUNDED')add('refund_unverified','渠道报告退款，来源链尚未核验','REFUNDED是渠道报告，不能独立证明来源链已收到退款。','前往来源链核对退款交易、地址、资产和金额。');
    else if(status==='FAILED')add('failed','渠道报告处理失败','需结合目标链记录和渠道原因继续排查。','查看渠道原始响应并联系原渠道；不要重复付款。','red');
    else if(status==='SUCCESS'&&!facts.verified)add('unverified','渠道报告成功，目标到账证据未齐','渠道状态不能替代目标链收据。','补充目标NEAR交易哈希及签名账户，再核验收款方与资产。');
    else if(['PROCESSING','PENDING_DEPOSIT','KNOWN_DEPOSIT_TX','INCOMPLETE_DEPOSIT'].includes(status)){
      if(facts.verified&&BigInt(facts.receivedAtomic)>0n)add('provider_conflict','渠道仍在处理，链上已有到账','当前渠道状态与所关联的历史收据存在差异。','核对目标交易关联、分笔支付与渠道更新时序。','red');
      else if(now>Date.parse(order.dueAt))add('overdue','订单已过商家设定期限','该时间是商家订单期限，不是1Click的服务时限。','核对入金是否足额、Memo和渠道处理状态。');
      else add('pending','等待渠道处理','目前还没有目标链到账核验结果。','稍后重新读取状态。','blue');
    }
  } else if(order.depositAddress&&p)add('unverified','渠道查询未取得可用结果',p.error?.message||'查询失败不能等同没有付款。','检查地址和Memo，稍后重试。');
  if(!facts.verified&&!findings.length)add('unverified','目标链证据待补齐',facts.issues.join('；'),'补充目标交易哈希、签名账户，再读取链上收据。');
  const priority=['duplicate','provider_conflict','underpaid','failed','overpaid','merchant_gap','refund_unverified','stale','overdue','unverified','pending'];
  findings.sort((a,b)=>priority.indexOf(a.code)-priority.indexOf(b.code));
  const code=findings[0]?.code||'matched';
  return {ruleVersion:RULE_VERSION,asOf,code,...STATES[code],findings,facts,providerStatus:status,providerFresh,
    receivedAtomic:facts.receivedAtomic,differenceAtomic:facts.receivedAtomic===null?null:(BigInt(facts.receivedAtomic)-BigInt(order.expectedAtomic)).toString(),
    explanation:findings[0]?.detail||'指定NEAR交易的净转账与订单应收一致；关联由商家提供，不证明当前钱包余额。'};
}
export function contextFor(records){return records.map(({order,evidence})=>({id:order.id,keys:chainFacts(evidence?.chain,order).receiptKeys}));}
export function evaluateAll(records,asOf){const context=contextFor(records);return records.map(r=>({...r,result:diagnose(r.order,r.evidence,context,asOf)}));}
export function csvCell(x){let s=String(x??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function canonical(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(v=>canonical(v)??'null').join(',')+']';return '{'+Object.keys(x).filter(k=>x[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';}
export async function digest(x){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(x)));return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function makeBundle(record,context,asOf,dataMode){const payload={ruleVersion:RULE_VERSION,dataMode,asOf,order:record.order,evidence:record.evidence,context,evaluation:diagnose(record.order,record.evidence,context,asOf)};return {format:'flowtrace.evidence.v1',sha256:await digest(payload),payload};}
export async function replayBundle(bundle){
  if(bundle?.format!=='flowtrace.evidence.v1'||bundle.payload?.ruleVersion!==RULE_VERSION)throw Error('不支持的证据格式或规则版本');
  if(await digest(bundle.payload)!==bundle.sha256)throw Error('摘要不一致：文件内容发生变化');
  const p=bundle.payload,order=normalizeOrder(p.order),evaluation=diagnose(order,p.evidence,p.context,p.asOf);
  if(canonical(evaluation)!==canonical(p.evaluation))throw Error('规则重跑与记录结论不一致');
  return {valid:true,dataMode:p.dataMode,asOf:p.asOf,code:evaluation.code,label:evaluation.label,events:evaluation.facts.events.length};
}
