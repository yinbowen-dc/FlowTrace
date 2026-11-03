import {request as httpRequest} from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWatchStore} from '../watch/store.mjs';
import {createWatchService,DEFAULT_RULES} from '../watch/service.mjs';
import {createServer} from '../server.mjs';
import {ASSETS} from '../public/lib/core.js';
import {QueryError} from '../adapters.mjs';
const hash=n=>'1'.repeat(31)+'23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'[n%57];
function snapshot(accountId,height,now,amount='0',patch={}){return {accountId,quality:'complete_within_scope',anchor:{network:'mainnet',height,hash:hash(height),blockTime:new Date(now-1000).toISOString(),fetchedAt:new Date(now).toISOString(),source:'https://rpc.example'},native:{status:'verified',symbol:'NEAR',amountAtomic:amount,lockedAtomic:'0',codeHash:hash(0)},tokens:Object.values(ASSETS).map(a=>({...a,status:'verified',amountAtomic:'0'})),permissions:{status:'verified',report:{keys:[]}},...patch};}
function setup(t,options={}){
 let now=Date.now(),height=1,calls=0,amount='0',mode='ok';const store=options.store||createWatchStore(options.storeOptions);
 const runner={run:async({input})=>{calls++;if(mode==='error')throw new QueryError('UPSTREAM_DOWN','查询未完成');const result=snapshot(input.accountId,height++,now,amount);if(mode==='partial')result.tokens[1]={...result.tokens[1],status:'unknown',amountAtomic:undefined};return {data:result};}};
 const watch=createWatchService({store,service:options.runner||runner,clock:()=>now,pollMs:100,autoStart:false,...options.serviceOptions});
 t.after(()=>watch.close());return {watch,store,advance:(ms=100)=>{now+=ms;},now:()=>now,amount:value=>{amount=value;},mode:value=>{mode=value;},calls:()=>calls};
}
const changes=watch=>watch.events.filter(e=>e.kind==='changes');
test('creating a watch is explicit and establishes a real complete baseline only when the worker runs',async t=>{
 const f=setup(t);assert.equal(f.watch.status(null).hasSession,false);assert.equal(f.calls(),0);
 const {data,sessionToken}=f.watch.add(null,{accountId:'alice.near'});assert.equal(data.watches.length,1);assert.equal(f.calls(),0);assert.ok(!JSON.stringify(data).includes(sessionToken));
 await f.watch.tick();const state=f.watch.status(sessionToken);assert.equal(state.watches[0].baseline.height,1);assert.equal(state.events[0].kind,'baseline');assert.equal(state.watches[0].lastState,'observing');
});
test('threshold checks retain exact 24-decimal amounts at and below a boundary',async t=>{
 const f=setup(t),{sessionToken}=f.watch.add(null,{accountId:'alice.near'});await f.watch.tick();
 f.amount('999999999999999999999999');f.advance();await f.watch.tick();assert.equal(changes(f.watch.status(sessionToken)).length,0);
 f.amount('1999999999999999999999999');f.advance();await f.watch.tick();const event=changes(f.watch.status(sessionToken))[0];assert.equal(event.report.balances[0].deltaAtomic,'1000000000000000000000000');assert.equal(event.report.findings[0].deltaAtomic,'1000000000000000000000000');
});
test('partial observations never advance the complete baseline and errors are deduplicated',async t=>{
 const f=setup(t),{sessionToken}=f.watch.add(null,{accountId:'alice.near'});await f.watch.tick();
 f.mode('partial');f.advance();await f.watch.tick();f.advance(1000);await f.watch.tick();let state=f.watch.status(sessionToken);
 assert.equal(state.watches[0].baseline.height,1);assert.equal(state.watches[0].lastState,'unknown');assert.equal(state.events.filter(e=>e.kind==='query_unknown').length,1);
 f.mode('ok');f.amount('2000000000000000000000000');f.advance(1000);await f.watch.tick();state=f.watch.status(sessionToken);
 assert.equal(changes(state)[0].report.from.height,1);assert.equal(state.events.filter(e=>e.kind==='recovered').length,1);assert.equal(state.watches[0].errorCode,null);
});
test('two owners share one RPC snapshot without sharing their lists or events',async t=>{
 const f=setup(t),a=f.watch.add(null,{accountId:'alice.near'}),b=f.watch.add(null,{accountId:'alice.near'});await f.watch.tick();assert.equal(f.calls(),1);
 assert.equal(f.watch.status(a.sessionToken).watches[0].id,a.data.watches[0].id);assert.equal(f.watch.status(b.sessionToken).events[0].watchId,b.data.watches[0].id);
 assert.throws(()=>f.watch.action(b.sessionToken,{id:a.data.watches[0].id,action:'delete'}),e=>e.code==='WATCH_NOT_FOUND');
});
test('a pause during an in-flight query prevents late baselines or alerts from being committed',async t=>{
 let resolve;const pending=new Promise(r=>resolve=r);const f=setup(t,{runner:{run:()=>pending}}),a=f.watch.add(null,{accountId:'alice.near'});const running=f.watch.tick();
 f.watch.action(a.sessionToken,{id:a.data.watches[0].id,action:'pause'});resolve({data:snapshot('alice.near',1,f.now())});await running;
 const state=f.watch.status(a.sessionToken);assert.equal(state.watches[0].state,'paused');assert.equal(state.watches[0].baseline,null);assert.equal(state.events.length,0);
});
test('expiration stops collection and resume establishes a fresh baseline',async t=>{
 const f=setup(t,{serviceOptions:{leaseMs:150}}),a=f.watch.add(null,{accountId:'alice.near'});await f.watch.tick();f.advance(151);await f.watch.tick();assert.equal(f.calls(),1);assert.equal(f.watch.status(a.sessionToken).watches[0].state,'expired');
 f.advance(60000);f.watch.action(a.sessionToken,{id:a.data.watches[0].id,action:'resume'});f.amount('9000000000000000000000000');await f.watch.tick();assert.equal(changes(f.watch.status(a.sessionToken)).length,0);assert.equal(f.calls(),2);
});
test('manual checks have a minimum spacing and owner limits do not widen through payloads',async t=>{
 const f=setup(t),a=f.watch.add(null,{accountId:'alice.near'});await f.watch.tick();assert.throws(()=>f.watch.action(a.sessionToken,{id:a.data.watches[0].id,action:'check'}),e=>e.code==='WATCH_TOO_SOON');
 f.watch.add(a.sessionToken,{accountId:'bob.near'});f.watch.add(a.sessionToken,{accountId:'carol.near'});assert.throws(()=>f.watch.add(a.sessionToken,{accountId:'dave.near'}),e=>e.code==='WATCH_OWNER_LIMIT');
 for(const body of [{accountId:'alice.near',rpc:'https://evil.example'},{accountId:'BAD.NEAR'},{accountId:'bob.near',rules:{...DEFAULT_RULES,thresholds:{...DEFAULT_RULES.thresholds,USDC:'0.0000001'}}},{accountId:'bob.near',rules:{...DEFAULT_RULES,balances:false,keys:false,code:false}}])assert.throws(()=>f.watch.add(null,body),e=>e.code==='INVALID_INPUT');
});
test('event retention, paging and read acknowledgment remain owner-scoped',async t=>{
 const f=setup(t),a=f.watch.add(null,{accountId:'alice.near',rules:{...DEFAULT_RULES,thresholds:{...DEFAULT_RULES.thresholds,NEAR:'0'}}});await f.watch.tick();
 for(let i=1;i<=105;i++){f.amount(String(i));f.advance();await f.watch.tick();}
 const state=f.watch.status(a.sessionToken);assert.equal(state.retainedEvents,100);assert.equal(state.events.length,20);assert.equal(state.unread,100);
 const older=f.watch.events(a.sessionToken,{before:state.events.at(-1).seq}).events;assert.equal(older.length,20);assert.ok(older[0].seq<state.events.at(-1).seq);
 assert.equal(f.watch.action(a.sessionToken,{action:'ack'}).unread,0);
});
test('file-backed snapshots and owner hashes survive a service restart',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'flowtrace-watch-')),path=join(dir,'watch.db');t.after(()=>rmSync(dir,{recursive:true,force:true}));let now=Date.now();
 const store=createWatchStore({path}),watch=createWatchService({store,service:{run:async()=>({data:snapshot('alice.near',1,now)})},clock:()=>now,autoStart:false});const a=watch.add(null,{accountId:'alice.near'});await watch.tick();await watch.close();
 assert.equal(statSync(path).mode&0o777,0o600);assert.equal(readFileSync(path).includes(Buffer.from(a.sessionToken)),false);
 const nextStore=createWatchStore({path});const next=createWatchService({store:nextStore,service:{},clock:()=>now,autoStart:false});assert.equal(next.status(a.sessionToken).watches[0].baseline.height,1);await next.close();
});
async function httpFixture(t){const f=setup(t);const server=createServer({basePath:'/collect',adapters:{},watchService:f.watch});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return {url:'http://127.0.0.1:'+server.address().port,watch:f.watch};}
const post=body=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('HTTP uses an HttpOnly session, keeps its token out of JSON and isolates anonymous readers',async t=>{
 const {url}=await httpFixture(t),r=await fetch(url+'/collect/api/watch/add',post({accountId:'alice.near'})),cookie=r.headers.get('set-cookie');assert.equal(r.status,200);assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Path=\/collect\//);
 const token=cookie.split(';')[0],body=await r.text();assert.ok(!body.includes(token.split('=')[1]));const mine=await(await fetch(url+'/collect/api/watch/status',{headers:{cookie:token}})).json();assert.equal(mine.data.watches.length,1);
 const stranger=await(await fetch(url+'/collect/api/watch/status')).json();assert.equal(stranger.data.hasSession,false);assert.equal(stranger.data.watches.length,0);
 assert.equal((await fetch(url+'/collect/api/watch/action',post({id:mine.data.watches[0].id,action:'delete'}))).status,401);
});
test('watch routes reject cross-origin writes and URL tokens before creating jobs',async t=>{
 const {url}=await httpFixture(t);assert.equal((await fetch(url+'/collect/api/watch/add',{...post({accountId:'alice.near'}),headers:{'content-type':'application/json',origin:'https://evil.example'}})).status,403);
 assert.equal((await fetch(url+'/collect/api/watch/status?token=not-accepted')).status,400);assert.equal((await fetch(url+'/collect/api/watch/add',post({accountId:'alice.near',ownerId:'other-owner'}))).status,400);
});
test('key and code changes are selected by rules, independently from balance thresholds',async t=>{
 let now=Date.now(),n=0;const watch=createWatchService({store:createWatchStore(),clock:()=>now,pollMs:100,autoStart:false,service:{run:async()=>{const s=snapshot('alice.near',++n,now);if(n>1){s.permissions.report.keys=[{publicKey:'ed25519:public-example',type:'FullAccess'}];s.native.codeHash=hash(2);}return {data:s};}}});t.after(()=>watch.close());
 const a=watch.add(null,{accountId:'alice.near',rules:{...DEFAULT_RULES,balances:false,keys:false,code:true}});await watch.tick();now+=100;await watch.tick();const event=changes(watch.status(a.sessionToken))[0];assert.deepEqual(event.report.findings.map(x=>x.kind),['contract_code_changed']);assert.equal(event.report.permissions.counts.added,1);
});
test('pause/resume cannot bypass minimum collection spacing and global account capacity is bounded',async t=>{
 const f=setup(t,{storeOptions:{maxAccounts:1}}),a=f.watch.add(null,{accountId:'alice.near'});await f.watch.tick();assert.throws(()=>f.watch.add(null,{accountId:'bob.near'}),e=>e.code==='WATCH_CAPACITY');assert.throws(()=>f.watch.action(a.sessionToken,{id:a.data.watches[0].id,action:'resume'}),e=>e.code==='WATCH_ALREADY_ACTIVE');
 f.watch.action(a.sessionToken,{id:a.data.watches[0].id,action:'pause'});f.advance(50);const state=f.watch.action(a.sessionToken,{id:a.data.watches[0].id,action:'resume'});assert.ok(Date.parse(state.watches[0].nextAt)-Date.parse(state.watches[0].lastCheckedAt)>=60000);
});
test('a newly added owner reuses a recent snapshot rather than forcing another upstream call',async t=>{
 const f=setup(t),a=f.watch.add(null,{accountId:'alice.near'});await f.watch.tick();f.advance(50);const b=f.watch.add(null,{accountId:'alice.near'});await f.watch.tick();assert.equal(f.calls(),1);assert.equal(f.watch.status(b.sessionToken).watches[0].baseline.hash,f.watch.status(a.sessionToken).watches[0].baseline.hash);
});
test('production-host session cookies are Secure without trusting client-forwarded headers',async t=>{
 const {url}=await httpFixture(t);const result=await new Promise((resolve,reject)=>{const req=httpRequest(url+'/collect/api/watch/add',{method:'POST',headers:{'content-type':'application/json',host:'www.darkchunk.win'}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,secure:(res.headers['set-cookie']||[]).some(value=>value.includes('; Secure'))}));});req.on('error',reject);req.end(JSON.stringify({accountId:'alice.near'}));});
 assert.equal(result.status,200);assert.equal(result.secure,true);
});
