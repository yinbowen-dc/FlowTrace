import test from 'node:test';
import assert from 'node:assert/strict';
import {RunContext} from '@openai/agents';
import {createAgentService} from '../agent/service.mjs';
import {buildChatTools} from '../agent/chat.mjs';
import {QueryError} from '../adapters.mjs';
import {ASSETS} from '../public/lib/core.js';
const oldHash='1'.repeat(32),newHash='1'.repeat(31)+'2';
function fixture(options={}){
  const calls=[],now=Date.now(),anchor={network:'mainnet',height:200,hash:newHash,blockTime:new Date(now).toISOString(),fetchedAt:new Date().toISOString(),source:'fixture-current'};
  const adapters={network:async()=>anchor,rpc:async(method,params)=>{
    calls.push({method,params});
    if(method==='block'){if(options.historyFailure)throw new QueryError('UNKNOWN_BLOCK','历史区块不可用');return {source:'fixture-history',raw:{header:{height:options.wrongHeight?99:100,hash:oldHash,timestamp_nanosec:String(BigInt(now+(options.futureTime?60000:-60000))*1000000n)}}};}
    const old=params.block_id===oldHash,base={block_hash:options.wrongAnchor?'wrong':params.block_id,block_height:old?100:200};
    let raw;
    if(params.request_type==='view_account')raw={...base,amount:'1000000000000000000000000',locked:'0',storage_usage:1000,code_hash:options.codeChange&&!old?newHash:oldHash};
    else if(params.request_type==='view_access_key_list'){
      if(options.keyFailure&&old)throw new QueryError('TIMEOUT','历史权限查询超时');
      const permission=options.unknownKey?{Unknown:true}:{FunctionCall:{receiver_id:'app.near',method_names:options.reorder?(old?['read','view']:['view','read']):['read'],allowance:'1'}};
      const keys=[{public_key:'ed25519:existing',access_key:{permission}}];
      if(options.keyChange&&!old){keys[0].access_key.permission={FunctionCall:{receiver_id:'app.near',method_names:[],allowance:null}};keys.push({public_key:'ed25519:added',access_key:{permission:'FullAccess'}});}
      if(options.duplicateKey)keys.push(keys[0]);
      raw={...base,keys};
    }else if(params.request_type==='call_function'){
      if(options.tokenFailure&&old&&params.account_id===ASSETS.USDT.contract)throw new QueryError('TIMEOUT','历史余额查询超时');
      const start=params.account_id===ASSETS.wNEAR.contract?900719925474099300000000000000000000n:1000000n;
      const value=(start+(options.tokenChange&&!old?1n:0n)).toString();raw={...base,result:[...Buffer.from(JSON.stringify(value))]};
    }else throw Error('Unexpected RPC method');
    return {raw,source:old?'fixture-history':'fixture-current'};
  }};
  return {calls,service:createAgentService({adapters})};
}
test('comparison anchors both snapshots and keeps one-atomic-unit deltas exact',async()=>{
  const {service,calls}=fixture({tokenChange:true});const r=await service.run({task:'account_compare',input:{accountId:'alice.near'}}),d=r.data;
  assert.equal(d.input.lookbackBlocks,100);assert.equal(d.baseline.height,100);assert.equal(d.current.height,200);assert.equal(d.intervalSeconds,60);
  assert.equal(d.balances.find(x=>x.symbol==='wNEAR').delta,'0.000000000000000000000001');
  assert.equal(d.state,'changes_found');assert.ok(calls.filter(x=>x.method==='query').every(x=>[oldHash,newHash].includes(x.params.block_id)));
  assert.ok(calls.every(x=>['query','block'].includes(x.method)));
});
test('comparison reports new full-access keys, permission changes and code changes',async()=>{
  const {service}=fixture({keyChange:true,codeChange:true});const d=await service.call('near_account_changes',{accountId:'alice.near',lookbackBlocks:100});
  assert.equal(d.permissions.added[0].permission.type,'FullAccess');assert.equal(d.permissions.changed[0].after.gasAllowanceAtomic,null);assert.equal(d.contract.changed,true);
  assert.deepEqual(d.findings.map(x=>x.kind),['key_permission_changed','key_added','contract_code_changed']);
});
test('method ordering is not a permission change and unchanged snapshots have narrow scope',async()=>{
  const {service}=fixture({reorder:true});const d=await service.call('near_account_changes',{accountId:'alice.near'});
  assert.equal(d.state,'no_changes');assert.equal(d.findings.length,0);assert.match(d.scope,/净额为零不代表期间没有交易/);
});
test('historical query failures and unrecognized keys never become no-changes reports',async()=>{
  for(const options of [{tokenFailure:true},{keyFailure:true},{unknownKey:true},{duplicateKey:true},{wrongAnchor:true}]){
    const {service}=fixture(options),d=await service.call('near_account_changes',{accountId:'alice.near'});
    assert.equal(d.state,'incomplete',JSON.stringify(options));assert.equal(d.quality,'partial');
    if(options.tokenFailure)assert.equal(d.balances.find(x=>x.symbol==='USDT').deltaAtomic,undefined);
  }
});
test('missing, mismatched or future historical blocks stop comparison',async()=>{
  for(const options of [{historyFailure:true},{wrongHeight:true},{futureTime:true}]){
    const {service,calls}=fixture(options);await assert.rejects(()=>service.call('near_account_changes',{accountId:'alice.near'}),e=>['UNKNOWN_BLOCK','INVALID_HISTORY'].includes(e.code));
    assert.equal(calls.filter(x=>x.method==='query').length,0);
  }
});
test('lookback bounds and extra execution fields are rejected before RPC',async()=>{
  const {service,calls}=fixture();for(const fields of [{lookbackBlocks:0},{lookbackBlocks:5001},{lookbackBlocks:1.5},{lookbackBlocks:'100'},{privateKey:'not-accepted'}])await assert.rejects(()=>service.call('near_account_changes',{accountId:'alice.near',...fields}),e=>e.code==='INVALID_INPUT');
  assert.equal(calls.length,0);
});
test('chat comparison uses the same deterministic task and preserves tool evidence',async()=>{
  const {service}=fixture({tokenChange:true}),trace=[];
  const tool=buildChatTools(service,[{role:'user',content:'对比alice.near最近100个区块的变化'}],trace).find(x=>x.name==='compare_account');
  const r=await tool.invoke(new RunContext(),JSON.stringify({accountId:'alice.near',lookbackBlocks:100}));
  assert.equal(r.task,'account_compare');assert.equal(trace[0].status,'completed');assert.equal(trace[0].result.data.findings.length,3);
});
test('chat cannot invent an account for a comparison request',async()=>{
  const {service,calls}=fixture(),trace=[];
  const tool=buildChatTools(service,[{role:'user',content:'检查一下我的账户近期变化'}],trace).find(x=>x.name==='compare_account');
  const r=await tool.invoke(new RunContext(),JSON.stringify({accountId:'invented.near',lookbackBlocks:100}));
  assert.equal(r.error.code,'DETAILS_REQUIRED');assert.equal(calls.length,0);
});
