import {McpServer} from '@modelcontextprotocol/server';
import {z} from 'zod';
import {VERSION} from '../version.mjs';
export function createTaskMcpServer({wallet,principal}){
  const server=new McpServer({name:'flowtrace-private-tasks',version:VERSION},{instructions:'仅允许访问令牌所属会话的NEAR任务。没有签名、广播、创建任务或取消任务的能力。链上未知不能判断未到账；所有结果保留采集时间。'});
  const wrap=fn=>async input=>{try{const data=await fn(input);return {content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};}catch(e){return {isError:true,content:[{type:'text',text:JSON.stringify({error:{code:e.code||'QUERY_FAILED',message:e.code?e.message:'核验未完成'}})}]};}};
  server.registerTool('wallet_list_tasks',{description:'列出此访问令牌所属会话的已保存任务及后台追踪状态。',inputSchema:z.strictObject({}),annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},wrap(()=>wallet.status(principal)));
  server.registerTool('wallet_get_task',{description:'按任务UUID读取自己的任务参数和最近证据；不代表新鲜链上查询。',inputSchema:z.strictObject({id:z.string().uuid()}),annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}},wrap(x=>wallet.detail(principal,x)));
  server.registerTool('wallet_check_task',{description:'使用服务器已保存的参数重新核验自己的交易，更新本地核验报告。仅查询链上数据，不签名或广播。',inputSchema:z.strictObject({id:z.string().uuid()}),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}},wrap(async x=>{const t=wallet.detail(principal,x);return wallet.check(principal,{id:t.id,revision:t.revision});}));
  return server;
}
