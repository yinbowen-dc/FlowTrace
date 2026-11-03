import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {createAdapters,QueryError} from './adapters.mjs';
import {createMcpHandler} from '@modelcontextprotocol/server';
import {toNodeHandler} from '@modelcontextprotocol/node';
import {createMcpServer} from './mcp/server.mjs';
import {createAgentService} from './agent/service.mjs';
import {createChatService,validateChat} from './agent/chat.mjs';
import {VERSION} from './version.mjs';
import {createWatchStore} from './watch/store.mjs';
import {createWatchService} from './watch/service.mjs';
export {VERSION};
const root=fileURLToPath(new URL('./public/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.yaml':'text/plain; charset=utf-8'};
export function createServer({adapters=createAdapters(),basePath=process.env.BASE_PATH||'',limit=60,allowedHosts=(process.env.ALLOWED_HOSTS||'localhost,127.0.0.1,[::1],www.darkchunk.win').split(','),chatService,watchService,watchDbPath=process.env.WATCH_DB_PATH,chatDailyLimit=Math.max(1,Number.parseInt(process.env.CHAT_DAILY_LIMIT)||40)}={}){
  const buckets=new Map(),chatBuckets=new Map();let concurrent=0,chatActive=false,chatDay='',chatCount=0;
  const service=createAgentService({adapters}),mcp=createMcpHandler(()=>createMcpServer({service}),{legacy:'stateless',responseMode:'json',maxRequestBodySize:8192,maxSubscriptions:0});
  const chat=chatService||createChatService({service});
  const watch=watchService||(watchDbPath?createWatchService({store:createWatchStore({path:watchDbPath}),service}):null);
  const mcpRequest=toNodeHandler(mcp,{maxRequestBodySize:8192});
  const server=http.createServer(async(req,res)=>{
    const requestId=crypto.randomUUID();res.setHeader('X-Request-Id',requestId);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const json=(status,value)=>{if(res.writableEnded)return;res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value));};
    let path;
    try{
      let hostname;try{hostname=new URL('http://'+req.headers.host).hostname;}catch{}if(!allowedHosts.includes(hostname))throw new QueryError('HOST','请求主机未被允许',403);
      const url=new URL(req.url,'http://localhost');path=decodeURIComponent(url.pathname);
      if(basePath){if(path===basePath){res.writeHead(308,{location:basePath+'/'});res.end();return;}if(!path.startsWith(basePath+'/'))throw new QueryError('NOT_FOUND','页面不存在',404);path=path.slice(basePath.length);}
      if(path==='/api/health'){if(req.method!=='GET')throw new QueryError('METHOD','仅支持GET',405);json(200,{ok:true,version:VERSION,service:'FlowTrace',time:new Date().toISOString()});return;}
      if(path.startsWith('/api/')||path==='/mcp'){
        const isMcp=path==='/mcp',get=['/api/network','/api/public-sample','/api/agent/catalog','/api/agent/chat/status','/api/watch/status'].includes(path);
        if(!isMcp&&!['/api/network','/api/public-sample','/api/provider-status','/api/near-receipt','/api/agent/catalog','/api/agent/run','/api/agent/chat','/api/agent/chat/status','/api/watch/status','/api/watch/add','/api/watch/action','/api/watch/events'].includes(path))throw new QueryError('NOT_FOUND','接口不存在',404);
        if(req.method!==(get?'GET':'POST'))throw new QueryError('METHOD',get?'仅支持GET':'仅支持POST只读查询',405);
        if([...url.searchParams].length)throw new QueryError('INVALID_INPUT','请勿在URL中传递查询字段',400);
        const origin=req.headers.origin;
        if(origin){let host;try{host=new URL(origin).host;}catch{throw new QueryError('ORIGIN','请求来源格式不正确',403);}if(host!==req.headers.host)throw new QueryError('ORIGIN','请从本站发起查询',403);}
        const ip=process.env.TRUST_PROXY==='1'?(req.headers['x-real-ip']||req.socket.remoteAddress):req.socket.remoteAddress;
        const minute=Math.floor(Date.now()/60000),key=ip+':'+minute,count=(buckets.get(key)||0)+1;buckets.set(key,count);if(buckets.size>2000)for(const k of buckets.keys())if(!k.endsWith(':'+minute))buckets.delete(k);
        if(count>limit){res.setHeader('Retry-After','60');throw new QueryError('RATE_LIMIT','查询次数达到每分钟上限，请稍后重试',429);}
        if(concurrent>=4)throw new QueryError('BUSY','服务正在处理其他查询，请稍后重试',503);
        if(isMcp){concurrent++;try{await mcpRequest(req,res);}finally{concurrent--;}return;}
        let body={};if(!get){if(!req.headers['content-type']?.startsWith('application/json'))throw new QueryError('CONTENT_TYPE','请求体需要application/json',415);
          let size=0,parts=[];for await(const chunk of req){size+=chunk.length;if(size>8192)throw new QueryError('TOO_LARGE','查询请求过大',413);parts.push(chunk);}try{body=JSON.parse(Buffer.concat(parts).toString());}catch{throw new QueryError('INVALID_JSON','查询JSON格式不正确',400);}
          if(!body||typeof body!=='object'||Array.isArray(body))throw new QueryError('INVALID_INPUT','查询字段应为对象',400);
          const fields=path==='/api/watch/add'?['accountId','rules']:path==='/api/watch/action'?['id','action']:path==='/api/watch/events'?['before']:path==='/api/agent/chat'?['messages']:path==='/api/agent/run'?['task','input']:path==='/api/provider-status'?['depositAddress','depositMemo']:['txHash','senderAccountId','recipient','tokenContract'];if(Object.keys(body).some(k=>!fields.includes(k)))throw new QueryError('INVALID_INPUT','包含不支持的查询字段',400);
        }
        if(path.startsWith('/api/watch/')){
          if(!watch){if(path==='/api/watch/status'){json(200,{ok:true,data:{enabled:false,hasSession:false,watches:[],events:[]}});return;}throw new QueryError('WATCH_DISABLED','后台观察服务未启用',503);}
          const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('flowtrace_watch='))?.slice(16);
          let data,sessionToken;
          if(path==='/api/watch/status')data=watch.status(token);
          else if(path==='/api/watch/add')({data,sessionToken}=watch.add(token,body));
          else if(path==='/api/watch/events')data=watch.events(token,body);
          else data=watch.action(token,body);
          if(sessionToken||data.hasSession){const value=sessionToken||token;res.setHeader('Set-Cookie',`flowtrace_watch=${value}; Path=${basePath||''}/; HttpOnly; SameSite=Strict; Max-Age=604800${['localhost','127.0.0.1','[::1]'].includes(hostname)?'':'; Secure'}`);}
          json(200,{ok:true,requestId,data});return;
        }
        if(path==='/api/agent/chat/status'){json(200,{ok:true,data:{...chat.status(),limits:{perIpPerMinute:2,dailyRequests:chatDailyLimit,concurrent:1},quotaScope:'进程内计数，服务重启后重置'}});return;}
        if(path==='/api/agent/chat'){
          validateChat(body);if(!chat.status().available)throw new QueryError('MODEL_NOT_CONFIGURED','对话模型暂未启用，请使用手动操作。',503);
          const day=new Date().toISOString().slice(0,10);if(day!==chatDay){chatDay=day;chatCount=0;}
          if(chatCount>=chatDailyLimit)throw new QueryError('CHAT_DAILY_LIMIT','今日演示对话已达次数上限，仍可使用手动查询。',429);
          const chatKey=String(ip)+':'+minute;
          if((chatBuckets.get(chatKey)||0)>=2)throw new QueryError('CHAT_RATE_LIMIT','对话每分钟最多2条，请稍后发送；手动查询仍可使用。',429);
          if(chatActive)throw new QueryError('CHAT_BUSY','正在处理其他对话，请稍后再试或使用手动操作。',503);
          for(const k of chatBuckets.keys())if(!k.endsWith(':'+minute))chatBuckets.delete(k);
          chatBuckets.set(chatKey,(chatBuckets.get(chatKey)||0)+1);chatCount++;chatActive=true;concurrent++;
          try{json(200,{ok:true,requestId,data:await chat.respond(body)});}finally{chatActive=false;concurrent--;}return;
        }
        concurrent++;try{const data=path==='/api/agent/catalog'?service.catalog():path==='/api/agent/run'?await service.run(body):path==='/api/network'?await adapters.network():path==='/api/public-sample'?await adapters.findSample():path==='/api/provider-status'?await adapters.provider(body):await adapters.receipt(body);json(200,{ok:true,requestId,data});}finally{concurrent--;}return;
      }
      if(!['GET','HEAD'].includes(req.method))throw new QueryError('METHOD','仅支持GET',405);
      if(path.includes('\0')||path.includes('\\'))throw new QueryError('NOT_FOUND','页面不存在',404);
      const file=resolve(root,'.'+(path.endsWith('/')?path+'index.html':path));if(!file.startsWith(root.endsWith(sep)?root:root+sep)||!mime[extname(file)])throw new QueryError('NOT_FOUND','页面不存在',404);
      let buffer;try{buffer=await readFile(file);}catch{throw new QueryError('NOT_FOUND','页面不存在',404);}
      res.writeHead(200,{'content-type':mime[extname(file)],'cache-control':'no-cache'});res.end(req.method==='HEAD'?undefined:buffer);
    }catch(e){json(e instanceof QueryError?e.status:500,{ok:false,requestId,error:{code:e.code||'INTERNAL',message:e instanceof QueryError?e.message:'查询未完成，请稍后重试'}});}
  });
  server.on('close',()=>{void mcp.close();void chat.close?.();void watch?.close();});
  return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8804);const server=createServer();server.requestTimeout=30000;server.headersTimeout=15000;
  server.listen(port,host,()=>console.log(`FlowTrace ${VERSION} http://${host}:${port}${process.env.BASE_PATH||''}/`));
}
