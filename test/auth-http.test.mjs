import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createServer} from '../server.mjs';
import {consumeChatResponse} from '../public/agent/chat-stream.js';

async function fixture(t,{configured=true,production=false}={}){
  const dir=await mkdtemp(join(tmpdir(),'ft-auth-http-'));let calls=0,redeems=0;
  const anchor='11111111111111111111111111111112';
  const adapters={network:async()=>({network:'mainnet',height:200,hash:anchor,fetchedAt:new Date().toISOString()}),rpc:async m=>({source:'fixture',raw:m==='EXPERIMENTAL_protocol_config'?{chain_id:'mainnet',runtime_config:{storage_amount_per_byte:'10000000000000000000'}}:{block_hash:anchor,block_height:200,amount:'5000000000000000000000000',locked:'0',storage_usage:1000}})};
  const provider={available:configured,publicOrigin:production?'https://www.darkchunk.win':'http://127.0.0.1',redirectUri:'https://www.darkchunk.win/collect/auth/google/callback',prepare:async()=>({nonce:'fixture-nonce',verifier:'fixture-verifier',challenge:'fixture-challenge'}),authorizationUrl:({state})=>'https://accounts.google.com/o/oauth2/v2/auth?state='+state,redeem:async({code,verifier,nonceHash})=>{redeems++;assert.equal(verifier,'fixture-verifier');assert.equal(nonceHash.length,64);if(code==='invalid')throw Error('SECRET_CODE_SHOULD_NOT_ESCAPE');return {subject:code,email:code+'@example.com',name:code};}};
  const chatService={status:()=>({available:true}),respond:async(body,ctx)=>{calls++;ctx.onEvent?.({type:'text_delta',delta:'已记录。'});await ctx.session.addItems([{role:'user',content:body.messages[0].content},{role:'assistant',content:'已记录。'}]);return {answer:'已记录。',tools:[]};}};
  const server=createServer({basePath:'/collect',adapters,chatService,watchDbPath:join(dir,'watch.sqlite'),walletOptions:{autoStart:false},authOptions:configured?{provider}:{clientId:'',clientSecret:''}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});});
  const base='http://127.0.0.1:'+server.address().port,host=production?'www.darkchunk.win':new URL(base).host,origin=production?'https://'+host:base;
  const transport=production?(url,options)=>new Promise((resolve,reject)=>{const request=http.request(url,options,response=>{const parts=[];response.on('data',c=>parts.push(c));response.on('end',()=>{const headers=[];for(let n=0;n<response.rawHeaders.length;n+=2)headers.push([response.rawHeaders[n],response.rawHeaders[n+1]]);resolve(new Response(Buffer.concat(parts),{status:response.statusCode,headers}));});});request.on('error',reject);request.end(options.body);}):fetch;
  const req=(path,{cookie,body,headers={},method}={})=>transport(base+'/collect'+path,{redirect:'manual',method:method||(body?'POST':'GET'),headers:{host,...(cookie?{cookie}:{}),...(body?{'content-type':'application/json',origin}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const data=async(path,options)=>(await(await req(path,options)).json()).data;
  async function start(cookie){const r=await req('/api/auth/google/start',{body:{},cookie}),payload=await r.json();assert.equal(r.status,200,JSON.stringify(payload));const d=payload.data;return {state:new URL(d.url).searchParams.get('state'),cookie:r.headers.getSetCookie()[0].split(';')[0],response:r};}
  async function login(code,cookie){const attempt=await start(cookie),r=await req('/auth/google/callback?state='+attempt.state+'&code='+code,{cookie:attempt.cookie});return {response:r,cookie:r.headers.getSetCookie().find(x=>x.startsWith('flowtrace_auth=')&&!x.startsWith('flowtrace_auth=;'))?.split(';')[0],attempt};}
  return {req,data,start,login,calls:()=>calls,redeems:()=>redeems};
}
const input={accountId:'alice.near',recipient:'bob.near',asset:'NEAR',amount:'0.1',maxAmount:'0.01'};
test('login binds guest tasks and streamed history to one Google subject across devices, with account isolation and logout',async t=>{
  const f=await fixture(t),taskResponse=await f.req('/api/wallet/prepare',{body:input}),guest=taskResponse.headers.getSetCookie()[0].split(';')[0],task=(await taskResponse.json()).data;
  const body={requestId:randomUUID(),messages:[{role:'user',content:'记住这个任务'}]};await consumeChatResponse(await f.req('/api/wallet/chat',{body,cookie:guest,headers:{accept:'text/event-stream'}}));
  const a=await f.login('alice',guest);assert.match(a.response.headers.get('location'),/login=success$/);assert.ok(a.response.headers.getSetCookie().some(x=>x.startsWith('flowtrace_wallet=;')));
  assert.equal((await f.data('/api/auth/status',{cookie:a.cookie})).user.email,'alice@example.com');assert.equal((await f.data('/api/wallet/status',{cookie:a.cookie})).tasks[0].id,task.id);
  assert.equal((await f.data('/api/wallet/conversation',{cookie:a.cookie})).messages.length,2);assert.equal((await f.data('/api/wallet/status',{cookie:guest})).tasks.length,0);
  const second=await f.login('alice'),other=await f.login('bob');assert.equal((await f.data('/api/wallet/status',{cookie:second.cookie})).tasks[0].id,task.id);assert.deepEqual((await f.data('/api/wallet/status',{cookie:other.cookie})).tasks,[]);
  const cached=await consumeChatResponse(await f.req('/api/wallet/chat',{body,cookie:second.cookie,headers:{accept:'text/event-stream'}}));assert.equal(cached.reused,true);assert.equal(f.calls(),1);
  const next={requestId:randomUUID(),messages:[{role:'user',content:'继续'}]},stream=await f.req('/api/wallet/chat',{body:next,cookie:second.cookie,headers:{accept:'text/event-stream'}});assert.equal(stream.headers.get('set-cookie'),null);assert.equal((await consumeChatResponse(stream)).answer,'已记录。');assert.equal((await f.data('/api/wallet/conversation',{cookie:a.cookie})).messages.length,4);
  await f.req('/api/auth/logout',{body:{},cookie:second.cookie});assert.equal((await f.data('/api/auth/status',{cookie:second.cookie})).authenticated,false);assert.equal((await f.data('/api/auth/status',{cookie:a.cookie})).authenticated,true);assert.equal((await f.data('/api/wallet/conversation',{cookie:second.cookie})).messages.length,0);
});
test('callback rejects mismatched/replayed states and sanitizes provider errors; auth mutations require exact same-origin',async t=>{
  const f=await fixture(t);assert.equal((await f.req('/api/auth/google/start',{body:{},headers:{origin:'https://evil.test'}})).status,403);assert.equal((await f.req('/api/auth/google/start',{body:{},headers:{origin:''}})).status,403);assert.equal((await f.req('/api/auth/google/start',{body:{unexpected:true}})).status,400);
  const a=await f.start(),bad=await f.req('/auth/google/callback?state='+a.state+'&code=alice',{cookie:'flowtrace_oauth='+'x'.repeat(43)});assert.match(bad.headers.get('location'),/login=failed$/);assert.equal(f.redeems(),0);
  const good=await f.req('/auth/google/callback?state='+a.state+'&code=alice',{cookie:a.cookie});assert.match(good.headers.get('location'),/login=success$/);const replay=await f.req('/auth/google/callback?state='+a.state+'&code=alice',{cookie:a.cookie});assert.match(replay.headers.get('location'),/login=failed$/);assert.equal(f.redeems(),1);
  const cancelled=await f.start(),cancel=await f.req('/auth/google/callback?state='+cancelled.state+'&error=access_denied',{cookie:cancelled.cookie});assert.match(cancel.headers.get('location'),/login=cancelled$/);
  const failed=await f.login('invalid');assert.match(failed.response.headers.get('location'),/login=failed$/);assert.ok(!JSON.stringify([...failed.response.headers]).includes('SECRET'));assert.equal(failed.cookie,undefined);
});
test('production cookies use narrow OAuth correlation and HttpOnly Secure account sessions; missing config stays disabled',async t=>{
  const f=await fixture(t,{production:true}),login=await f.login('alice'),cookies=login.response.headers.getSetCookie();
  assert.match(login.attempt.response.headers.get('set-cookie'),/Path=\/collect\/auth\/google\/; HttpOnly; SameSite=Lax; Max-Age=600; Secure/);
  assert.ok(cookies.some(x=>/flowtrace_auth=.+; Path=\/collect\/; HttpOnly; SameSite=Strict; Max-Age=2592000; Secure/.test(x)));
  const disabled=await fixture(t,{configured:false});assert.equal((await disabled.data('/api/auth/status')).available,false);assert.equal((await disabled.req('/api/auth/google/start',{body:{}})).status,503);
});
