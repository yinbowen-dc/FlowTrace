const failure=(message,code)=>Object.assign(new Error(message),{code});

// POST + fetch keeps the existing cookie, strict JSON validation and requestId.
// A retry reuses the same input; this reader never resubmits a request itself.
export async function consumeChatResponse(response,onEvent=()=>{}){
  if(!response.ok){const body=await response.json().catch(()=>({}));throw failure(body.error?.message||'对话请求未完成',body.error?.code||'CHAT_HTTP');}
  if(!response.headers.get('content-type')?.includes('text/event-stream')){
    const body=await response.json();if(!body.ok)throw failure(body.error?.message||'对话请求未完成',body.error?.code);
    onEvent({type:'complete',data:body.data});return body.data;
  }
  if(!response.body)throw failure('未收到流式响应，请恢复本轮结果。','STREAM_INTERRUPTED');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',complete=null;
  function frame(raw){
    const lines=raw.split('\n').filter(x=>x.startsWith('data:')).map(x=>x.slice(5).replace(/^ /,''));if(!lines.length)return;
    let event;try{event=JSON.parse(lines.join('\n'));}catch{throw failure('响应格式未完成，请恢复本轮结果。','STREAM_INVALID');}
    if(event.type==='error')throw failure(event.error?.message||'本轮未完成，请恢复结果。',event.error?.code||'STREAM_FAILED');
    if(event.type==='complete'){if(!event.data||typeof event.data.answer!=='string')throw failure('本轮缺少完整答复，请恢复结果。','STREAM_INVALID');complete=event.data;}
    onEvent(event);
  }
  try{
    for(;;){
      const {done,value}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});buffer=buffer.replace(/\r\n/g,'\n');
      if(buffer.length>1024*1024)throw failure('本轮结果过大，请查看已保存的任务。','STREAM_TOO_LARGE');
      let end;while((end=buffer.indexOf('\n\n'))>=0){const next=buffer.slice(0,end);buffer=buffer.slice(end+2);frame(next);if(complete)return complete;}
      if(done)break;
    }
    throw failure('连接中断；服务器可能仍在处理，请恢复本轮结果，不要重复创建任务。','STREAM_INTERRUPTED');
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
