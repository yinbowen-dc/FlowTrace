import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {Agent,Runner} from '@openai/agents';
import {createServer} from '../server.mjs';
import {createChatService} from '../agent/chat.mjs';
import {createWalletStore} from '../wallet/store.mjs';
import {prepareConversation,publicConversation} from '../agent/conversations.mjs';
import {consumeChatResponse} from '../public/agent/chat-stream.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const frame=event=>'data: '+JSON.stringify(event)+'\n\n';

test('stream parser handles split UTF-8, CRLF, heartbeats and completed results',async()=>{
  const result={answer:'查到余额。',tools:[]},wire=': keepalive\r\n\r\n'+frame({type:'text_delta',delta:'查到'}).replaceAll('\n','\r\n')+frame({type:'complete',data:result});
  const bytes=new TextEncoder().encode(wire),seen=[];
  const response=new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i++)c.enqueue(bytes.slice(i,i+1));c.close();}}),{headers:{'content-type':'text/event-stream'}});
  assert.deepEqual(await consumeChatResponse(response,e=>seen.push(e)),result);assert.equal(seen[0].delta,'查到');
});

test('a closed or failed stream never becomes a completed answer',async()=>{
  await assert.rejects(()=>consumeChatResponse(new Response(frame({type:'text_delta',delta:'部分回答'}),{headers:{'content-type':'text/event-stream'}})),e=>e.code==='STREAM_INTERRUPTED');
  await assert.rejects(()=>consumeChatResponse(new Response(frame({type:'error',error:{code:'MODEL_QUOTA',message:'额度不足'}}),{headers:{'content-type':'text/event-stream'}})),e=>e.code==='MODEL_QUOTA');
  await assert.rejects(()=>consumeChatResponse(new Response(JSON.stringify({error:{code:'CHAT_IN_PROGRESS',message:'仍在处理'}}),{status:409})),e=>e.code==='CHAT_IN_PROGRESS');
});

test('real Agents SDK emits text deltas before completion and persists only the completed turn',async t=>{
  const release=deferred(),firstDelta=deferred(),store=createWalletStore();t.after(()=>store.close());
  const model={getResponse:async()=>{throw Error('nonstream path used');},async *getStreamedResponse(){
    yield {type:'response_started'};yield {type:'output_text_delta',delta:'查到'};await release.promise;
    yield {type:'output_text_delta',delta:'结果。'};
    yield {type:'response_done',response:{id:'response_fixture',usage:{requests:1,inputTokens:1,outputTokens:2,totalTokens:3},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'查到结果。'}]}]}};
  }};
  const chat=createChatService({apiKey:'',runner:new Runner({tracingDisabled:true}),agentFactory:x=>new Agent({...x,model})});
  const body={messages:[{role:'user',content:'解释 NEAR 主网'}]},turn=await prepareConversation(store,null,body,randomUUID()),events=[];
  const running=chat.respond(body,{session:turn.session,conversationMessages:turn.messages,onEvent:e=>{events.push(e);if(e.type==='text_delta')firstDelta.resolve();}});
  await firstDelta.promise;assert.equal(events.find(e=>e.type==='text_delta').delta,'查到');assert.equal(publicConversation(store,turn.token).messages.length,0);
  release.resolve();const result=await running;await turn.commit(result);
  assert.equal(result.answer,'查到结果。');assert.equal(events.filter(e=>e.type==='text_delta').length,2);assert.equal(publicConversation(store,turn.token).messages.at(-1).content,result.answer);
});

test('the SDK publishes a structured account card before the next model response is finished',async()=>{
  let turns=0,queries=0;const cardReady=deferred(),release=deferred(),events=[];
  const model={getResponse:async()=>{throw Error('nonstream path used');},async *getStreamedResponse(){
    turns++;yield {type:'response_started'};
    let output;
    if(turns===1)output=[{type:'function_call',id:'tool_balance',name:'inspect_account',callId:'call_balance',arguments:'{"accountId":"wrap.near"}'}];
    else{await release.promise;yield {type:'output_text_delta',delta:'余额已显示。'};output=[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'余额已显示。'}]}];}
    yield {type:'response_done',response:{id:'response_'+turns,usage:{requests:1,inputTokens:1,outputTokens:2,totalTokens:3},output}};
  }};
  const report={task:'account_inspect',data:{accountId:'wrap.near',anchor:{network:'mainnet',height:200,hash:'fixture-block',fetchedAt:new Date().toISOString()},native:{symbol:'NEAR',status:'verified',amountAtomic:'1000000000000000000000000'},tokens:[]}};
  const chat=createChatService({apiKey:'',service:{run:async()=>{queries++;return report;}},runner:new Runner({tracingDisabled:true}),agentFactory:x=>new Agent({...x,model})});
  const running=chat.respond({messages:[{role:'user',content:'查询 wrap.near'}]},{onEvent:e=>{events.push(e);if(e.accountView)cardReady.resolve(e.accountView);}});
  const card=await cardReady.promise;assert.equal(card.assets[0].amount,'1');assert.equal(events.some(e=>e.type==='text_delta'),false);
  assert.ok(events.some(e=>e.type==='tool_start'));release.resolve();assert.equal((await running).answer,'余额已显示。');assert.equal(queries,1);
});

const anchor='11111111111111111111111111111112';
async function fixtureServer(t,respond){
  const dir=await mkdtemp(join(tmpdir(),'ft-stream-http-'));
  const adapters={network:async()=>({network:'mainnet',height:200,hash:anchor,fetchedAt:new Date().toISOString()}),rpc:async(m)=>({source:'fixture',raw:m==='EXPERIMENTAL_protocol_config'?{chain_id:'mainnet',runtime_config:{storage_amount_per_byte:'10000000000000000000'}}:{block_hash:anchor,block_height:200,amount:'5000000000000000000000000',locked:'0',storage_usage:1000}})};
  const server=createServer({basePath:'/collect',adapters,chatService:{status:()=>({available:true}),respond},watchDbPath:join(dir,'watch.sqlite'),walletOptions:{autoStart:false}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
  const url='http://127.0.0.1:'+server.address().port+'/collect';
  return {url,post:(body,cookie)=>fetch(url+'/api/wallet/chat',{method:'POST',headers:{'content-type':'application/json',accept:'text/event-stream',...(cookie?{cookie}:{})},body:JSON.stringify(body)})};
}

test('HTTP delivers partial output before a run finishes, then caches retries without repeating a task',async t=>{
  const release=deferred(),partial=deferred();let calls=0;
  const {url,post}=await fixtureServer(t,async(body,context)=>{
    calls++;await context.wallet.prepare({accountId:'alice.near',recipient:'bob.near',asset:'NEAR',amount:'0.1',maxAmount:'0.01'});
    context.onEvent({type:'text_delta',delta:'预检'});await release.promise;context.onEvent({type:'text_delta',delta:'被阻止。'});
    await context.session.addItems([{role:'user',content:body.messages[0].content},{role:'assistant',content:'预检被阻止。'}]);return {answer:'预检被阻止。',tools:[]};
  });
  const body={requestId:randomUUID(),messages:[{role:'user',content:'准备测试任务'}]},response=await post(body),cookie=response.headers.get('set-cookie').split(';')[0];
  assert.equal(response.headers.get('x-accel-buffering'),'no');assert.match(response.headers.get('cache-control'),/no-transform/);
  const events=[],reading=consumeChatResponse(response,e=>{events.push(e);if(e.type==='text_delta')partial.resolve();});
  await partial.promise;assert.equal(events.some(e=>e.type==='complete'),false);
  const pending=(await(await fetch(url+'/api/wallet/conversation',{headers:{cookie}})).json()).data;assert.equal(pending.messages.length,0);
  release.resolve();assert.equal((await reading).answer,'预检被阻止。');
  const again=await consumeChatResponse(await post(body,cookie));assert.equal(again.reused,true);assert.equal(calls,1);
  const tasks=(await(await fetch(url+'/api/wallet/status',{headers:{cookie}})).json()).data.tasks;assert.equal(tasks.length,1);
  assert.equal((await post({...body,messages:[{role:'user',content:'更改参数'}]},cookie)).status,409);
});

test('disconnecting the observer still commits the run and the same request can recover it',async t=>{
  const release=deferred(),finished=deferred();let calls=0;
  const {url,post}=await fixtureServer(t,async(body,context)=>{
    calls++;context.onEvent({type:'text_delta',delta:'正在查询'});await release.promise;
    await context.session.addItems([{role:'user',content:body.messages[0].content},{role:'assistant',content:'已完成查询。'}]);finished.resolve();return {answer:'已完成查询。',tools:[]};
  });
  const body={requestId:randomUUID(),messages:[{role:'user',content:'查公开数据'}]},response=await post(body),cookie=response.headers.get('set-cookie').split(';')[0],reader=response.body.getReader();await reader.read();await reader.cancel();
  release.resolve();await finished.promise;
  let recovered;for(let n=0;n<30;n++){const r=await post(body,cookie);if(r.ok){recovered=await consumeChatResponse(r);break;}await r.arrayBuffer();await new Promise(r=>setTimeout(r,5));}
  assert.equal(recovered?.answer,'已完成查询。');assert.equal(calls,1);
  assert.equal((await(await fetch(url+'/api/wallet/conversation',{headers:{cookie}})).json()).data.messages.length,2);
});

test('an error after streaming starts is sanitized and does not persist a successful partial answer',async t=>{
  const {url,post}=await fixtureServer(t,async(_body,context)=>{context.onEvent({type:'text_delta',delta:'未完成片段'});throw Error('private-provider-secret');});
  const response=await post({requestId:randomUUID(),messages:[{role:'user',content:'查询'}]}),cookie=response.headers.get('set-cookie').split(';')[0];
  await assert.rejects(()=>consumeChatResponse(response),e=>e.code==='MODEL_UNAVAILABLE'&&!e.message.includes('private-provider-secret'));
  const messages=(await(await fetch(url+'/api/wallet/conversation',{headers:{cookie}})).json()).data.messages;assert.ok(!JSON.stringify(messages).includes('未完成片段'));assert.ok(messages.at(-1).content.includes('本轮处理未完成'));
});
