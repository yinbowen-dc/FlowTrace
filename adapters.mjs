import {ASSETS,accountId,txHash,chainFacts,decimal,normalizeOrder} from './public/lib/core.js';
export class QueryError extends Error {constructor(code,message,status=502){super(message);this.code=code;this.status=status;}}
const RPCS=['https://free.rpc.fastnear.com','https://rpc.mainnet.near.org','https://archival-rpc.mainnet.near.org'];
async function readJSON(response,max=3*1024*1024){
  const reader=response.body?.getReader();if(!reader)throw new QueryError('INVALID_RESPONSE','上游没有返回内容');
  let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new QueryError('RESPONSE_TOO_LARGE','上游响应超过本版读取上限');}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new QueryError('INVALID_RESPONSE','上游响应不是有效JSON');}
}
export function createAdapters({fetcher=fetch,rpcs=RPCS,timeout=9000,clock=()=>new Date().toISOString()}={}){
  let networkCache=null,sampleCache=null,sampleFlight=null,cacheBytes=0;const flights=new Map(),cache=new Map();
  async function request(url,options={},deadline=Infinity){
    if(Date.now()>=deadline)throw new QueryError('TIMEOUT','本轮查询达到时间上限，请稍后重试');
    try{const response=await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(timeout,deadline-Date.now())))});const data=await readJSON(response);return {status:response.status,data};}
    catch(e){if(e instanceof QueryError)throw e;throw new QueryError(e.name==='TimeoutError'?'TIMEOUT':'NETWORK_ERROR',e.name==='TimeoutError'?'上游查询超时，请稍后重试':'无法连接上游，请稍后重试');}
  }
  async function rpc(method,params,deadline=Date.now()+20000){
    let last;
    for(const url of rpcs){try{const {status,data}=await request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:'flowtrace',method,params})},deadline);
      if(status!==200)throw new QueryError('UPSTREAM_HTTP',`RPC返回HTTP ${status}`);
      if(data.error){const code=data.error.cause?.name||data.error.data?.name||'RPC_ERROR';throw new QueryError(code,['UNKNOWN_TRANSACTION','TIMEOUT_ERROR','DOES_NOT_TRACK_SHARD'].includes(code)?'节点暂未提供此交易；请检查哈希、签名账户或节点历史范围':'RPC未能完成此查询');}
      if(!data.result||typeof data.result!=='object')throw new QueryError('INVALID_RESPONSE','RPC缺少结果');return {raw:data.result,source:url};
    }catch(e){last=e;}}
    throw last;
  }
  async function memo(key,ttl,fn){
    const hit=cache.get(key);if(hit&&Date.now()-hit.at<ttl)return structuredClone(hit.value);
    if(flights.has(key))return structuredClone(await flights.get(key));
    const p=fn().then(value=>{const bytes=Buffer.byteLength(JSON.stringify(value));const previous=cache.get(key);if(previous){cacheBytes-=previous.bytes;cache.delete(key);}if(bytes<=512*1024){while(cache.size>=80||cacheBytes+bytes>8*1024*1024){const first=cache.keys().next().value;if(first===undefined)break;cacheBytes-=cache.get(first).bytes;cache.delete(first);}cache.set(key,{at:Date.now(),value,bytes});cacheBytes+=bytes;}return value;}).finally(()=>flights.delete(key));
    flights.set(key,p);return structuredClone(await p);
  }
  async function network(deadline=Date.now()+20000){
    if(networkCache&&Date.now()-networkCache.at<15000)return networkCache.value;
    const s=await rpc('status',[],deadline);if(s.raw.chain_id!=='mainnet'||s.raw.sync_info?.syncing!==false)throw new QueryError('WRONG_NETWORK','RPC不是已同步的NEAR主网');
    const b=await rpc('block',{finality:'final'},deadline);const h=b.raw.header;
    if(!Number.isSafeInteger(h?.height)||!h.hash)throw new QueryError('INVALID_RESPONSE','final区块格式不正确');
    const value={network:'mainnet',source:b.source,fetchedAt:clock(),height:h.height,hash:h.hash,blockTime:new Date(Number(BigInt(h.timestamp_nanosec||h.timestamp)/1000000n)).toISOString()};
    networkCache={at:Date.now(),value};return value;
  }
  async function provider({depositAddress,depositMemo=''}){
    if(typeof depositAddress!=='string'||!/^[A-Za-z0-9:_.-]{5,128}$/.test(depositAddress)||typeof depositMemo!=='string'||depositMemo.length>256||/[\u0000-\u001f]/.test(depositMemo))throw new QueryError('INVALID_INPUT','入金地址或Memo格式不正确',400);
    return memo('p:'+depositAddress+':'+depositMemo,15000,async()=>{
      const u=new URL('https://1click.chaindefuser.com/v0/status');u.searchParams.set('depositAddress',depositAddress);if(depositMemo)u.searchParams.set('depositMemo',depositMemo);
      const headers={accept:'application/json'};if(process.env.ONECLICK_API_KEY)headers['X-API-Key']=process.env.ONECLICK_API_KEY;
      const {status,data}=await request(u.href,{headers});
      if(status===404)throw new QueryError('PROVIDER_NOT_FOUND','渠道未找到该地址及Memo记录；这不等于链上没有付款',404);
      if(status===401||status===403)throw new QueryError('PROVIDER_AUTH_REQUIRED','该渠道查询需要服务端配置伙伴API访问权限',503);
      if(status!==200)throw new QueryError('PROVIDER_HTTP',`渠道暂时返回HTTP ${status}`);
      if(typeof data.status!=='string'||!data.quoteResponse||!data.swapDetails)throw new QueryError('INVALID_RESPONSE','渠道响应缺少状态或关联字段');
      return {ok:true,source:'https://1click.chaindefuser.com/v0/status',fetchedAt:clock(),query:{depositAddress,depositMemo},raw:data,signatureVerified:false};
    });
  }
  async function receipt({txHash:hash,senderAccountId,recipient,tokenContract},budgetDeadline=Infinity){
    if(!txHash(hash)||!accountId(senderAccountId)||!accountId(recipient)||!Object.values(ASSETS).some(a=>a.contract===tokenContract))throw new QueryError('INVALID_INPUT','需要有效NEAR交易哈希、签名账户、收款账户和支持的代币合约',400);
    return memo('t:'+hash+':'+senderAccountId+':'+recipient+':'+tokenContract,15000,async()=>{
      const deadline=Math.min(Date.now()+30000,budgetDeadline);
      await network(deadline);const tx=await rpc('EXPERIMENTAL_tx_status',{tx_hash:hash,sender_account_id:senderAccountId,wait_until:'NONE'},deadline);
      const final=await rpc('block',{finality:'final'},deadline),blocks={};
      const hashes=[...new Set((tx.raw.receipts_outcome||[]).filter(x=>x.outcome?.executor_id===tokenContract&&x.outcome?.logs?.some(s=>typeof s==='string'&&s.startsWith('EVENT_JSON:'))).map(x=>x.block_hash))];
      if(hashes.length>16)throw new QueryError('TOO_COMPLEX','该交易涉及过多收据区块，首版需人工核对');
      for(let i=0;i<hashes.length;i+=3)await Promise.all(hashes.slice(i,i+3).map(async h=>{const b=await rpc('block',{block_id:h},deadline);blocks[h]={header:b.raw.header};}));
      return {ok:true,network:'mainnet',source:tx.source,fetchedAt:clock(),query:{txHash:hash,senderAccountId,recipient,tokenContract},raw:tx.raw,blocks,finalHead:{height:final.raw.header.height,hash:final.raw.header.hash},finalHeadSource:final.source};
    });
  }
  async function findSample(){
    if(sampleCache&&Date.now()-sampleCache.at<60000)return structuredClone(sampleCache.value);
    if(sampleFlight)return structuredClone(await sampleFlight);
    sampleFlight=(async()=>{
      const deadline=Date.now()+55000,net=await network(deadline);let lookedAt=0;
      async function inspect(t,discoverySource){
          if(!txHash(t.hash)||!accountId(t.signer_id)||Date.now()>deadline)return null;
          lookedAt++;
          let execution;try{execution=await rpc('EXPERIMENTAL_tx_status',{tx_hash:t.hash,sender_account_id:t.signer_id,wait_until:'NONE'},deadline);}catch{return null;}
          if(execution.raw.final_execution_status!=='FINAL')return null;
          const candidates=[];
          for(const out of execution.raw.receipts_outcome||[]){const asset=Object.values(ASSETS).find(a=>a.contract===out.outcome?.executor_id);if(!asset)continue;
            for(const log of out.outcome.logs||[]){if(!log.startsWith('EVENT_JSON:'))continue;let event;try{event=JSON.parse(log.slice(11));}catch{continue;}
              if(event.standard!=='nep141'||!['ft_transfer','ft_mint'].includes(event.event))continue;
              for(const entry of event.data||[]){const recipient=entry.new_owner_id||entry.owner_id;if(accountId(recipient))candidates.push({asset,recipient});}
            }
          }
          for(const {asset,recipient} of candidates.slice(0,4)){
          const evidence=await receipt({txHash:t.hash,senderAccountId:t.signer_id,recipient,tokenContract:asset.contract},deadline);
          const now=clock();let order=normalizeOrder({id:'PUBLIC-'+t.hash.slice(0,8),customer:'公开主网转账样本',asset:asset.symbol,expectedAmount:'1',recipient,createdAt:new Date(Date.parse(now)-600000).toISOString(),dueAt:now,sourceChain:'NEAR',merchantStatus:'paid',txHash:t.hash,senderAccountId:t.signer_id});
          const facts=chainFacts(evidence,order);if(!facts.verified||BigInt(facts.receivedAtomic)<=0n)continue;
          order=normalizeOrder({...order,expectedAmount:decimal(facts.receivedAtomic,asset.decimals)});
          const value={dataMode:'public-sample',notice:'真实公开转账，金额仅用于重跑核对示例，不是商家订单，也不证明跨链兑换。',order,evidence:{chain:evidence},discoverySource,lookedAt,fetchedAt:clock()};
          sampleCache={at:Date.now(),value};return value;
          }
          return null;
      }
      // Index data only discovers public identifiers. Every candidate is independently
      // reread through the fixed NEAR RPC and never trusted as a payment proof.
      for(const contract of [ASSETS.USDC.contract,ASSETS.wNEAR.contract]){
        if(Date.now()>deadline)break;
        const url='https://api.nearblocks.io/v3/accounts/'+contract+'/txns';
        try{const {status,data}=await request(url,{},deadline);if(status!==200||!Array.isArray(data.data))continue;
          for(const item of data.data.slice(0,5)){const result=await inspect({hash:item.transaction_hash,signer_id:item.signer_account_id},url);if(result)return result;}
        }catch{ /* Bounded block scan below remains available. */ }
      }
      for(let offset=10;offset<40;offset+=20){
        if(Date.now()>deadline)break;
        const b=await rpc('block',{block_id:net.height-offset},deadline);
        const chunks=await Promise.allSettled(b.raw.chunks.slice(0,16).map(x=>rpc('chunk',{chunk_id:x.chunk_hash},deadline)));
        const txs=chunks.filter(x=>x.status==='fulfilled').flatMap(x=>x.value.raw.transactions||[]).slice(0,10);
        for(const t of txs){const result=await inspect(t,'NEAR final block scan');if(result)return result;
        }
      }
      throw new QueryError('NO_SAMPLE','这次有限范围内未找到支持的简单转账。请填写自己的公开交易标识，或稍后重试。',503);
    })().finally(()=>sampleFlight=null);
    return structuredClone(await sampleFlight);
  }
  return {network,provider,receipt,findSample,rpc};
}
