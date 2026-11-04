import {accountId,decimal} from './core.js';

const symbols=['NEAR','USDC','USDT','wNEAR'];
const money=value=>typeof value==='string'&&/^\d{1,39}(?:\.\d{1,24})?$/.test(value);

// Keep every digit in the data. Rounding belongs only to the visible label.
export function balanceLabel(value,places=4){
  if(!money(value)||!Number.isInteger(places)||places<0||places>8)return {text:'未知',approximate:false};
  const [whole,fraction='']=value.split('.'),digits=fraction.padEnd(places,'0');
  let units=BigInt(whole)*10n**BigInt(places)+BigInt(digits.slice(0,places)||'0');
  const approximate=/[1-9]/.test(fraction.slice(places));
  if(units===0n&&approximate)return {text:'< '+(places?'0.'+'0'.repeat(places-1)+'1':'1'),approximate:true};
  if(Number(fraction[places]||0)>=5)units++;
  const raw=units.toString().padStart(places+1,'0'),integer=places?raw.slice(0,-places):raw;
  const tail=places?raw.slice(-places).replace(/0+$/,''):'';
  return {text:integer.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(tail?'.'+tail:''),approximate};
}

export function accountView(report){
  if(report?.task!=='account_inspect')return null;
  const d=report.data,a=d?.anchor;
  if(!accountId(d?.accountId)||a?.network!=='mainnet'||!Number.isSafeInteger(a.height)||!a.hash||!Number.isFinite(Date.parse(a.fetchedAt)))return null;
  const all=[d.native,...(Array.isArray(d.tokens)?d.tokens:[])];
  const assets=symbols.map(symbol=>{
    const row=all.find(x=>x?.symbol===symbol),places=symbol==='NEAR'||symbol==='wNEAR'?24:6;
    let amount=null;
    if(row?.status==='verified'&&typeof row.amountAtomic==='string'&&/^\d{1,39}$/.test(row.amountAtomic))amount=decimal(row.amountAtomic,places);
    return {symbol,status:amount===null?'unknown':'verified',amount};
  });
  const p=d.permissions?.status==='verified'?d.permissions.report:null;
  return {
    kind:'account',accountId:d.accountId,network:'mainnet',fetchedAt:a.fetchedAt,
    blockHeight:a.height,blockHash:a.hash,source:typeof a.source==='string'?a.source.slice(0,200):'',
    complete:assets.every(x=>x.status==='verified'),assets,
    locked:d.native?.status==='verified'&&money(d.native.locked)?d.native.locked:null,
    permissions:p&&Array.isArray(p.keys)?{count:p.keys.length,fullAccessCount:p.keys.filter(k=>k.type==='FullAccess').length}:null
  };
}

export function accountViewFromTools(tools=[]){
  for(const t of [...tools].reverse())if(t.name==='inspect_account'&&t.status==='completed'){
    const view=accountView(t.result);if(view)return view;
  }
  return null;
}

// Native SDK items retain tool outputs. Project the same view for old conversations
// without guessing balances from assistant prose or adding database migrations.
export function conversationViews(items=[]){
  const result=[];let pending=null;
  for(const item of items){
    if(item.role==='user')pending=null;
    if(item.type==='function_call_result'&&item.name==='inspect_account'&&item.status==='completed'){
      const output=typeof item.output==='string'?item.output:item.output?.type==='text'?item.output.text:null;
      if(typeof output==='string'&&output.length<=96000)try{pending=accountView(JSON.parse(output));}catch{pending=null;}
    }
    if(!['user','assistant'].includes(item.role))continue;
    const content=typeof item.content==='string'?item.content:(Array.isArray(item.content)?item.content:[]).filter(x=>['input_text','output_text','text'].includes(x.type)).map(x=>x.text||'').join('\n');
    if(!content.trim())continue;
    result.push({role:item.role,content:content.slice(0,2000),...(item.role==='assistant'&&pending?{accountView:pending}:{})});
    if(item.role==='assistant')pending=null;
  }
  return result;
}
