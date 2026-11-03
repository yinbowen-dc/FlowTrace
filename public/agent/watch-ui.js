const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>value?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'等待采集';
export function mountWatch({api}){
  const $=s=>document.querySelector(s);let data=null,busy=false,loadedEvents=new Map(),cursor=null,readEpoch=0,connectionFailed=false;
  async function request(path,body){const response=await fetch(new URL('../watch/'+path,api),{...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});const json=await response.json();if(!response.ok||!json.ok)throw Error(json.error?.message||'观察服务暂时不可用');return json.data;}
  function note(message,error=false){$('#watch-message').textContent=message;$('#watch-message').className='watch-message'+(error?' error':'');}
  function eventsHtml(){const ordered=[...loadedEvents.values()].sort((a,b)=>b.seq-a.seq);for(const old of ordered.slice(100))loadedEvents.delete(old.seq);const events=ordered.slice(0,100);cursor=events.at(-1)?.seq??null;
    $('#watch-events').innerHTML=events.length?events.map(event=>{
      const names={changes:'发现待核对变化',baseline:'已建立基线',query_unknown:'本轮查询未知',recovered:'查询已恢复'},r=event.report;
      const details=event.kind==='changes'?r.findings.map(f=>f.detail).join(' '):r.message;
      return `<article class="watch-event ${event.kind}"><div><strong>${esc(names[event.kind]||event.kind)}</strong><time>${esc(date(event.at))}</time></div><span>${esc(event.accountId)}</span><p>${esc(details)}</p>${r.from?`<small>final #${esc(r.from.height)} → #${esc(r.to.height)} · 两端净变化</small>`:''}<details><summary>查看区块与报告</summary><pre>${esc(JSON.stringify(r,null,2))}</pre></details></article>`;
    }).join(''):'<div class="watch-empty">还没有观察事件。建立完整基线后，达到规则的变化会出现在这里。</div>';
    $('#watch-more').disabled=!cursor||events.length>=data.retainedEvents;
  }
  function render(next){
    data=next;$('#watch-service-status').textContent=next.enabled?'后台服务已启用':'后台服务未启用';$('#watch-service-status').className='badge'+(next.enabled?'':' amber');$('#watch-start').disabled=!next.enabled;
    if(!next.enabled){note('当前服务未启用后台观察；下方单次查询仍可使用。');return;}
    const ids=new Set(next.watches.map(w=>w.id));if(!next.hasSession)loadedEvents.clear();
    for(const [id,event]of loadedEvents)if(!ids.has(event.watchId))loadedEvents.delete(id);
    if(loadedEvents.size&&next.events.length&&!next.events.some(event=>loadedEvents.has(event.seq))&&next.events[0].seq>Math.max(...loadedEvents.keys()))loadedEvents.clear();
    for(const event of next.events)loadedEvents.set(event.seq,event);
    $('#watch-count').textContent=`${next.watches.length} / ${next.limits.maxPerOwner} 个账户`;
    $('#watch-unread').textContent=next.unread?String(next.unread):'';$('#watch-read').disabled=!next.unread;
    $('#watch-list').innerHTML=next.watches.length?next.watches.map(w=>{
      const active=w.state==='active',overdue=active&&Date.parse(next.now)-Date.parse(w.nextAt)>60000,labels={pending:'等待首次采集',observing:'正在观察',unknown:'查询未知'},label=active?(w.lastState==='unknown'?'查询未知':overdue?'采集延后':(labels[w.lastState]||w.lastState)):(w.state==='paused'?'已暂停':'观察已到期');
      return `<article class="watch-account"><div class="watch-account-head"><h3>${esc(w.accountId)}</h3><span class="badge ${(w.lastState==='unknown'&&active)||overdue?'amber':''}">${esc(label)}</span></div><p>最近尝试：${esc(date(w.lastCheckedAt))}<br>${active?'下次计划：'+esc(date(w.nextAt)):'恢复后会重新建立基线'}<br>观察截止：${esc(date(w.expiresAt))}</p>${w.baseline?`<small>完整基线 final #${esc(w.baseline.height)} · ${esc(date(w.baseline.blockTime))}</small>`:''}${w.errorCode&&active?`<p class="watch-error">${esc(w.errorCode)} · 保留上次完整基线，不据此判断没有变化。</p>`:''}<details><summary>观察规则</summary><p>余额：${w.rules.balances?'开启':'关闭'} · 权限：${w.rules.keys?'开启':'关闭'} · 代码：${w.rules.code?'开启':'关闭'}</p><p>净差额阈值：${Object.entries(w.rules.thresholds).map(([symbol,amount])=>esc(amount)+' '+esc(symbol)).join(' / ')}</p></details><div class="watch-account-actions">${active?`<button type="button" data-watch-action="check" data-watch-id="${esc(w.id)}">立即核对</button><button type="button" data-watch-action="extend" data-watch-id="${esc(w.id)}">续期24小时</button><button type="button" data-watch-action="pause" data-watch-id="${esc(w.id)}">暂停</button>`:`<button type="button" data-watch-action="resume" data-watch-id="${esc(w.id)}">恢复观察</button>`}<button type="button" class="watch-delete" data-watch-action="delete" data-watch-id="${esc(w.id)}">移除</button></div></article>`;
    }).join(''):'<div class="watch-empty">把常看的账户放进来。只读观察，不需要连接钱包。</div>';
    eventsHtml();
  }
  async function refresh(){if(busy)return;const epoch=readEpoch;try{const next=await request('status');if(epoch!==readEpoch||busy)return;render(next);if(connectionFailed){note('观察状态已恢复。');connectionFailed=false;}}catch(e){if(epoch!==readEpoch)return;connectionFailed=true;$('#watch-service-status').textContent='观察状态未读取';note(e.message,true);}}
  $('#watch-example').addEventListener('click',()=>{$('#watch-account').value='wrap.near';note('已填入公开账户；点击开始后才建立后台观察。');});
  $('#watch-add').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;readEpoch++;busy=true;$('#watch-start').disabled=true;
    try{const form=event.target,body={accountId:form.elements.accountId.value.trim(),rules:{balances:form.elements.balances.checked,keys:form.elements.keys.checked,code:form.elements.code.checked,thresholds:Object.fromEntries(['NEAR','USDC','USDT','wNEAR'].map(s=>[s,form.elements['threshold_'+s].value.trim()]))}};render(await request('add',body));note('已开始后台观察。首次完整采集后建立基线，随后按规则核对。');}
    catch(e){note(e.message,true);}finally{busy=false;$('#watch-start').disabled=!data?.enabled;}
  });
  $('#watch-list').addEventListener('click',async event=>{const button=event.target.closest('button[data-watch-action]');if(!button||busy)return;
    const action=button.dataset.watchAction;if(action==='delete'&&!confirm('移除这个观察账户及它的站内事件记录？'))return;
    readEpoch++;busy=true;button.disabled=true;try{render(await request('action',{id:button.dataset.watchId,action}));note(({check:'已安排核对；后台采集后会更新结果。',extend:'观察已续期24小时。',pause:'已暂停后台采集。',resume:'已恢复观察，下一次采集会建立新的完整基线。',delete:'已移除观察账户及其事件。'})[action]);}catch(e){note(e.message,true);button.disabled=false;}finally{busy=false;}
  });
  $('#watch-refresh').addEventListener('click',()=>{void refresh();});
  $('#watch-read').addEventListener('click',async()=>{try{render(await request('action',{action:'ack'}));note('当前事件已标记为已读。');}catch(e){note(e.message,true);}});
  $('#watch-more').addEventListener('click',async()=>{if(!cursor)return;try{const result=await request('events',{before:cursor});for(const event of result.events)loadedEvents.set(event.seq,event);eventsHtml();}catch(e){note(e.message,true);}});
  $('#watch-export').addEventListener('click',()=>{if(!data)return;const report={service:'FlowTrace',exportedAt:new Date().toISOString(),scope:'当前观察状态与已加载的最近事件；不是完整交易流水。不包含会话Cookie。',watches:data.watches,events:[...loadedEvents.values()].sort((a,b)=>b.seq-a.seq)};const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='flowtrace-watch-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refresh();});
  setInterval(()=>{if(document.visibilityState==='visible'&&!busy)void refresh();},15000);
  void refresh();
}
