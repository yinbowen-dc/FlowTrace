// This stream observes a bounded run. Losing the connection must never replay a
// tool or cancel a server-side commit that the user already requested.
export function openChatStream(res,requestId){
  let closed=false,sequence=0;
  res.writeHead(200,{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store, no-transform','connection':'keep-alive','x-accel-buffering':'no'});
  res.flushHeaders();
  function send(event){
    if(closed||res.destroyed||res.writableEnded)return false;
    if(res.writableLength>256*1024){res.destroy();return false;}
    try{return res.write('id: '+(++sequence)+'\ndata: '+JSON.stringify(event)+'\n\n');}catch{return false;}
  }
  const heartbeat=setInterval(()=>{if(!closed&&!res.destroyed&&!res.writableEnded)res.write(': keepalive\n\n');},10000);heartbeat.unref();
  function close(){closed=true;clearInterval(heartbeat);if(!res.destroyed&&!res.writableEnded)res.end();}
  res.once('close',()=>{closed=true;clearInterval(heartbeat);});
  send({type:'accepted',requestId});
  return {send,complete(data){send({type:'complete',requestId,data});close();},fail(error){send({type:'error',requestId,error});close();}};
}
