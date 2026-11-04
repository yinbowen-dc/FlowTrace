import {MemorySession} from '@openai/agents';
import {createHash} from 'node:crypto';
import {QueryError} from '../adapters.mjs';
export function dialogMessages(items){return items.filter(i=>['user','assistant'].includes(i.role)).map(i=>({role:i.role,content:typeof i.content==='string'?i.content:(i.content||[]).filter(x=>['input_text','output_text','text'].includes(x.type)).map(x=>x.text||'').join('\n')})).filter(i=>i.content.trim()).map(i=>({...i,content:i.content.slice(0,2000)}));}
export function boundedHistory(items){let kept=items.slice();const user=i=>i.role==='user';while(kept.filter(user).length>6||Buffer.byteLength(JSON.stringify(kept))>96000){const next=kept.findIndex((i,n)=>n>0&&user(i));if(next<0)throw new QueryError('CHAT_HISTORY_LIMIT','本轮上下文过大，请缩小查询范围',413);kept=kept.slice(next);}return kept;}
export function publicConversation(store,token){const c=store.conversation(token);return {messages:dialogMessages(c.items),focusTaskId:c.focusTaskId,retentionDays:7,retainedTurns:6};}
export const conversationFingerprint=body=>createHash('sha256').update(JSON.stringify({message:body.messages.at(-1).content,walletAccountId:body.walletAccountId||null})).digest('hex');
export async function prepareConversation(store,token,body,requestId){
  const last=body.messages.at(-1),fingerprint=conversationFingerprint(body);
  const turn=store.beginTurn(token,requestId,fingerprint);if(turn.cached)return {...turn,cached:turn.cached};
  const session=new MemorySession({sessionId:turn.sessionId,initialItems:turn.items}),messages=[...dialogMessages(turn.items),last];
  return {...turn,session,messages,assertCurrent:()=>store.assertEpoch(turn.token,turn.epoch),
    async commit(result){store.completeTurn(turn.token,requestId,turn.epoch,boundedHistory(await session.getItems()),result);},
    fail(error){const items=boundedHistory([...turn.items,{role:'user',content:last.content},{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'本轮处理未完成。已创建任务可在任务列表中核对；不能据此判断链上交易结果。'}]}]);store.failTurn(turn.token,requestId,turn.epoch,items,error);}
  };
}
