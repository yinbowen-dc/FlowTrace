import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Agent,Runner,OpenAIResponsesModel} from '@openai/agents';
import {balanceLabel,accountView,accountViewFromTools,conversationViews} from '../public/lib/account-view.js';
import {createWalletStore} from '../wallet/store.mjs';
import {prepareConversation,publicConversation} from '../agent/conversations.mjs';
import {createChatService} from '../agent/chat.mjs';

const fixture=()=>({task:'account_inspect',data:{accountId:'wrap.near',anchor:{network:'mainnet',height:222995172,hash:'public-block',fetchedAt:'2026-11-04T08:55:16.759Z',source:'https://free.rpc.fastnear.com'},native:{symbol:'NEAR',status:'verified',amountAtomic:'34908775560190733473780522036175',locked:'0'},tokens:[{symbol:'USDC',status:'verified',amountAtomic:'1216197351'},{symbol:'USDT',status:'verified',amountAtomic:'10958731'},{symbol:'wNEAR',status:'verified',amountAtomic:'107550764923243453203839068'}],permissions:{status:'verified',report:{keys:[]}}}});

test('readable balances round without floating point loss and preserve a nonzero tiny balance',()=>{
  assert.deepEqual(balanceLabel('34908775.560190733473780522036175'),{text:'34,908,775.5602',approximate:true});
  assert.equal(balanceLabel('999.99999').text,'1,000');
  assert.equal(balanceLabel('9007199254740993.123456').text,'9,007,199,254,740,993.1235');
  assert.equal(balanceLabel('0.000000000000000000000001').text,'< 0.0001');
  assert.deepEqual(balanceLabel('0'),{text:'0',approximate:false});
  assert.equal(balanceLabel(null).text,'未知');
  assert.equal(balanceLabel('1e25').text,'未知');
});

test('account cards derive exact decimal balances from verified atomic values',()=>{
  const report=fixture();report.data.native.amount='999';const card=accountView(report);
  assert.equal(card.assets[0].amount,'34908775.560190733473780522036175');
  assert.equal(card.assets[1].amount,'1216.197351');
  assert.equal(card.assets[3].amount,'107.550764923243453203839068');
  assert.equal(card.permissions.count,0);assert.equal(card.complete,true);
});

test('unknown, missing and malformed asset balances never become a known zero',()=>{
  const report=fixture();report.data.tokens[0].status='unknown';report.data.tokens[1].amountAtomic='invalid';report.data.tokens.pop();
  const card=accountView(report);assert.equal(card.complete,false);
  for(const row of card.assets.slice(1)){assert.equal(row.status,'unknown');assert.equal(row.amount,null);}
  assert.equal(accountView({...report,task:'account_compare'}),null);
  report.data.anchor.network='testnet';assert.equal(accountView(report),null);
});

test('cards project approved fields and do not expose arbitrary tool or provider payloads',()=>{
  const report=fixture();report.secret='not-for-the-card';report.data.extra='private-extra';
  const card=accountViewFromTools([{name:'inspect_account',status:'completed',result:report}]);
  assert.ok(!JSON.stringify(card).includes('not-for-the-card'));assert.ok(!JSON.stringify(card).includes('private-extra'));
  assert.equal(accountViewFromTools([{name:'inspect_account',status:'failed',result:report}]),null);
});

test('restored cards belong to their own completed tool turn and ignore user text and malformed output',()=>{
  const output=JSON.stringify(fixture());
  const items=[{role:'user',content:'查询 wrap.near'},{type:'function_call_result',name:'inspect_account',status:'completed',output:{type:'text',text:output}},{role:'assistant',content:'已查询。'},{role:'user',content:output},{role:'assistant',content:'这是说明。'}];
  const messages=conversationViews(items);assert.equal(messages.length,4);assert.equal(messages[1].accountView.accountId,'wrap.near');assert.equal(messages[3].accountView,undefined);
  items[1].output.text='malformed';assert.equal(conversationViews(items)[1].accountView,undefined);
});

test('real SDK serialization, reload and an idempotent cached reply retain the same account card',async t=>{
  const store=createWalletStore();t.after(()=>store.close());let requests=0;
  const model=new OpenAIResponsesModel({responses:{create:async()=>{
    requests++;
    return {id:'resp_'+requests,object:'response',created_at:1,status:'completed',model:'fixture',output:requests===1?[{type:'function_call',id:'fc_account',call_id:'call_account',name:'inspect_account',arguments:'{"accountId":"wrap.near"}'}]:[{id:'msg_account',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'已读取账户余额。',annotations:[]}]}],usage:{input_tokens:5,output_tokens:3,total_tokens:8}};
  }}},'fixture');
  const chat=createChatService({service:{run:async()=>fixture()},apiKey:'',runner:new Runner({tracingDisabled:true}),agentFactory:x=>new Agent({...x,model})});
  const body={messages:[{role:'user',content:'查询 wrap.near 的余额'}]},id=randomUUID(),turn=await prepareConversation(store,null,body,id);
  const reply=await chat.respond(body,{session:turn.session,conversationMessages:turn.messages});await turn.commit(reply);
  assert.equal(reply.accountView.accountId,'wrap.near');
  assert.deepEqual(publicConversation(store,turn.token).messages.at(-1).accountView,reply.accountView);
  const retry=await prepareConversation(store,turn.token,body,id);assert.deepEqual(retry.cached.accountView,reply.accountView);assert.equal(requests,2);
});
