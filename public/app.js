import {ASSETS,STATES,RULE_VERSION,normalizeOrder,importOrders,evaluateAll,contextFor,diagnose,decimal,csvCell,makeBundle,replayBundle,canonical} from './lib/core.js';
import {demoRecords,DEMO_AS_OF} from './lib/demo.js';
const $=s=>document.querySelector(s),h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='flowtrace.orders.v1',names={demo:'演示工作区',orders:'我的订单',verify:'主网收据核验',guide:'接入与说明'};
let workspace=Object.hasOwn(names,location.hash.slice(1))?location.hash.slice(1):'demo',filter='all',search='',records=[],editing=null,selected=null,verification=null,storageIssue='',generation=0,toastTimer,networkInfo=null;
const busy=new Set();
try{const saved=JSON.parse(localStorage.getItem(STORE)||'[]');if(!Array.isArray(saved)||saved.length>200)throw Error('订单存储格式不正确');records=saved.map(r=>({order:normalizeOrder(r.order),evidence:r.evidence||{}}));if(new Set(records.map(r=>r.order.id)).size!==records.length)throw Error('存在重复订单编号');}catch{storageIssue='本机存储无法读取，未载入旧订单。请从备份重新导入；旧存储未自动删除。';}
const demo=demoRecords();
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,5000);}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(records));storageIssue='';return true;}catch{storageIssue='浏览器未能保存订单。当前修改仅留在本次页面，请导出备份。';toast(storageIssue);return false;}}
function time(s){const n=Date.parse(s);return Number.isFinite(n)?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(n)+' 北京时间':'未记录';}
function badge(code,label){const x=STATES[code]||STATES.unverified;return `<span class="badge ${x.tone}"><i></i>${h(label||x.label)}</span>`;}
const money=(n,order)=>n===null||n===undefined?'<span class="faint">待核验</span>':`<span class="money">${h(decimal(n,order.decimals))}<small>${h(order.asset)}</small></span>`;
function currentRecords(){return workspace==='demo'?demo:records;}
function nowFor(){return workspace==='demo'?DEMO_AS_OF:new Date().toISOString();}
function evaluated(){return evaluateAll(currentRecords(),nowFor());}
function filtered(rows){return rows.filter(r=>(filter==='all'||(filter==='issues'&&r.result.code!=='matched')||(filter==='critical'&&r.result.tone==='red')||(filter==='missing'&&['unverified','stale','refund_unverified'].includes(r.result.code)))&&(!search||(r.order.id+' '+r.order.customer+' '+r.order.recipient).toLowerCase().includes(search.toLowerCase())));}
function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const jsonDownload=(name,value)=>download(name,JSON.stringify(value,null,2));
async function query(path,body){
  const response=await fetch('./api/'+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(path==='public-sample'?75000:45000)});
  const result=await response.json();if(!response.ok||!result.ok)throw Object.assign(Error(result.error?.message||'查询未完成'),{code:result.error?.code||'HTTP_'+response.status});return result.data;
}
function render(){
  document.querySelectorAll('[data-workspace]').forEach(b=>b.classList.toggle('active',b.dataset.workspace===workspace));
  $('#breadcrumb-current').textContent=names[workspace];
  $('#page-title').innerHTML=workspace==='verify'?'让每份收据，说清到账事实<span>。</span>':workspace==='guide'?'从一笔订单，接入你的业务<span>。</span>':'每笔到账，都有来龙去脉<span>。</span>';
  $('#page-description').textContent=workspace==='demo'?'从十笔合成订单看懂：到账不足、记录不同步、退款待核实，以及重复关联。':workspace==='orders'?'你的订单保存在当前浏览器；核验时只发送必要的公开查询字段。':workspace==='verify'?'读取NEAR主网的最终执行收据，核对指定资产向指定账户的净转账。':'字段模板、数据来源、只读接口与这版产品的实际边界。';
  $('#heading-actions').innerHTML=workspace==='demo'?'<button class="button secondary" data-action="replay">↻ 复核证据文件</button><button class="button primary" data-workspace="orders">接入我的订单 ↗</button>':workspace==='orders'?'<button class="button secondary" data-action="import">↥ 导入订单</button><button class="button primary" data-action="new">＋ 新增订单</button>'+(lastRemoved?'<button class="button secondary" data-action="undo">撤销移出</button>':''):workspace==='guide'?'<button class="button secondary" data-action="template">↓ 下载订单模板</button>':'<button class="button secondary" data-action="sample">⌁ 读取公开主网样本</button>';
  if(workspace==='orders'&&records.length)$('#heading-actions').insertAdjacentHTML('afterbegin','<button class="button secondary" data-action="backup">↓ 备份订单</button>');
  $('#workspace-banner').innerHTML=workspace==='demo'?`<div class="banner"><div><strong>◉ 合成演示数据</strong>订单、渠道与收据均为构造案例。不会查询节点，也不会发起交易。</div><span class="clock">固定案例时钟：${h(time(DEMO_AS_OF))}</span></div>`:workspace==='orders'?`<div class="banner real"><div><strong>◉ 我的本机订单</strong>${h(storageIssue||'订单关联由商家提供；渠道成功与链上到账分别核对。请定期导出备份。')}</div><span class="clock">浏览器存储 · 无账户同步</span></div>`:workspace==='verify'?'<div class="banner real"><div><strong>◉ 真实主网只读查询</strong>公开样本不属于你的订单；核验历史转账不代表当前余额。</div></div>':'';
  if(workspace==='demo'||workspace==='orders')renderOrders();else if(workspace==='verify')renderVerify();else renderGuide();
}
function renderOrders(){
  const rows=evaluated(),issues=rows.filter(r=>r.result.code!=='matched').length,critical=rows.filter(r=>r.result.tone==='red').length,missing=rows.filter(r=>['unverified','stale','refund_unverified'].includes(r.result.code)).length;
  const stats=[['全部订单',rows.length,'笔','当前工作区的订单数量','◫',''],['到账一致',rows.length-issues,'笔','资产、收款方与金额相符','✓','green'],['需要排查',issues,'笔',`${critical}笔存在严重差异`,'↗','amber'],['证据待补',missing,'笔','缺少收据、查询过期或退款未核实','⌁','']];
  $('#workspace-content').innerHTML=`<div class="stats-grid">${stats.map(([title,n,unit,foot,icon,tone])=>`<article class="stat-card ${tone}"><div class="stat-head">${title}<span class="stat-symbol">${icon}</span></div><div class="stat-number">${n}<small>${unit}</small></div><div class="stat-foot">${foot}</div></article>`).join('')}</div>
    <div class="section-heading"><div><h2>收款排查台</h2><p>${workspace==='demo'?'每笔订单都能打开查看证据和处理建议。':'先导入订单，再按需读取渠道和目标链证据。'}</p></div><button class="text-button" data-action="export">导出列表 ↓</button></div>
    <section class="panel"><div class="table-toolbar"><div class="filter-tabs">${[['all','全部订单',rows.length],['issues','需要排查',issues],['critical','严重差异',critical],['missing','证据待补',missing]].map(([key,title,n])=>`<button class="filter-tab ${filter===key?'active':''}" data-filter="${key}">${title} <span>${n}</span></button>`).join('')}</div><label class="search-box"><span>⌕</span><input id="search" value="${h(search)}" placeholder="搜索订单、客户或收款账户" aria-label="搜索订单"></label></div><div id="orders-table"></div></section>
    <div class="bottom-grid"><article class="panel info-panel"><span class="eyebrow">ONE ORDER · FOUR SOURCES</span><h3>把“说已付款”和“查到到账”分开。</h3><p>订单约定、渠道报告、目标链收据、商家记账相互核对。无法核验时保留缺口，不猜测钱去了哪里。</p><div class="flow-strip"><div class="flow-step">订单应收</div><span>→</span><div class="flow-step">渠道状态</div><span>→</span><div class="flow-step">链上净到账</div><span>→</span><div class="flow-step">商家记录</div></div></article>
    <article class="panel info-panel"><span class="eyebrow">COVERAGE & BOUNDARIES</span><div class="coverage-row"><span class="coverage-icon">N</span><div><strong>首版：1Click渠道，目标链NEAR</strong><small>USDC · USDT · wNEAR，以合约识别资产</small></div></div><div class="coverage-row"><span class="coverage-icon">⌁</span><div><strong>退款需要来源链的额外证据</strong><small>展示渠道退款报告，不直接标为核验完成</small></div></div><div class="coverage-row"><span class="coverage-icon">↳</span><div><strong>只读排查，处理动作回到原系统</strong><small>不签名、不转账、不修改商家数据库</small></div></div></article></div>`;
  renderTable(rows);
  $('#search').addEventListener('input',e=>{search=e.target.value;renderTable(evaluated());});
}
function renderTable(rows){
  const list=filtered(rows);
  $('#orders-table').innerHTML=!rows.length?`<div class="empty"><div class="empty-icon">▤</div><h2>接入你的第一批订单</h2><p>导入CSV或JSON，或先新增一笔。你提供订单与查询标识，FlowTrace把差异和证据整理到一起。</p><button class="button primary" data-action="import">导入订单</button><button class="button secondary" data-action="new">手动新增</button><button class="button secondary" data-action="template">下载模板</button></div>`:!list.length?'<div class="empty"><h2>没有符合条件的订单</h2><p>调整筛选或搜索关键词。</p></div>':`<div class="table-scroll"><table><thead><tr><th>订单 / 客户</th><th>支付路径</th><th>应收金额</th><th>核验净到账</th><th>差额</th><th>排查状态</th><th>操作</th></tr></thead><tbody>${list.map(({order:o,result:r})=>`<tr class="order-row"><td><button class="order-id" data-action="detail" data-id="${h(o.id)}" aria-label="查看订单 ${h(o.id)}">${h(o.id)}</button><span class="order-customer">${h(o.customer)}</span></td><td><div class="route"><span class="chain-chip ${h(o.sourceChain.toLowerCase())}">${h(o.sourceChain.slice(0,1))}</span>${h(o.sourceChain)}<span class="route-arrow">→</span><span class="chain-chip near">N</span>NEAR</div></td><td>${money(o.expectedAtomic,o)}</td><td>${money(r.receivedAtomic,o)}</td><td class="${r.differenceAtomic!==null&&BigInt(r.differenceAtomic)<0n?'delta-negative':r.differenceAtomic!==null&&BigInt(r.differenceAtomic)>0n?'delta-positive':''}">${r.differenceAtomic===null?'<span class="faint">—</span>':BigInt(r.differenceAtomic)===0n?'<span class="faint">—</span>':(BigInt(r.differenceAtomic)>0n?'+':'')+h(decimal(r.differenceAtomic,o.decimals))}</td><td>${badge(r.code)}</td><td><button class="table-action" data-action="detail" data-id="${h(o.id)}">排查 ↗</button></td></tr>`).join('')}</tbody></table></div><div class="table-bottom"><span>显示 ${list.length} / ${rows.length} 笔订单${workspace==='demo'?' · 全部为合成案例':' · 金额按各订单资产展示，未做美元换算'}</span><span class="page-pill">01</span></div>`;
}
function detail(id){
  const record=currentRecords().find(r=>r.order.id===id);if(!record)return;selected=id;
  const r=diagnose(record.order,record.evidence,contextFor(currentRecords()),nowFor()),o=record.order,e=record.evidence;
  const timeline=[{title:'订单应收',when:o.createdAt,body:`${o.expectedAmount} ${o.asset} → ${o.recipient}；关联标识由商家提供。`},
    {title:'1Click渠道报告',when:e.provider?.fetchedAt,body:e.provider?.ok?`${r.providerStatus}；${r.providerFresh?'查询仍在3分钟有效期内':'当前渠道查询已过期'}。渠道签名未独立核验。`:e.provider?.error?.message||'尚未读取渠道状态。'},
    ...r.facts.events.map(x=>({title:`NEAR ${x.kind==='ft_transfer'?'转账':x.kind==='ft_mint'?'铸币':'销毁'}事件 · ${x.deltaAtomic.startsWith('-')?'净流出':'流入'}${decimal(x.deltaAtomic,o.decimals)} ${o.asset}`,when:x.time,body:`区块 #${x.blockHeight} · 收据 ${x.receiptId}`})),
    ...(!r.facts.verified?[{title:'目标链核验待完成',when:e.chain?.fetchedAt,body:r.facts.issues.join('；')}]:[]),
    {title:'商家记账记录',when:null,body:`${{paid:'已支付',unpaid:'未支付',refunded:'已退款',unknown:'未知'}[o.merchantStatus]}；来自导入或手动录入，不直接读取商家数据库。`}];
  $('#detail-content').innerHTML=`<div class="detail-head"><div><span class="eyebrow">ORDER INVESTIGATION</span><h2>${h(o.id)}</h2><p>${h(o.customer)} · ${h(o.sourceChain)} → NEAR</p></div><div class="form-actions">${badge(r.code)}<button class="icon-button" data-close="detail-dialog" aria-label="关闭订单详情">×</button></div></div><div class="detail-body">
    ${workspace==='demo'?'<div class="detail-notice">合成测试案例 · 所有订单、渠道响应和收据均为构造数据，按固定案例时钟重跑。</div>':'<div class="detail-notice">订单与收据的关联由商家提供。final收据证明本交易的历史净变化，不证明当前余额。</div>'}
    <div class="detail-money"><div><small>订单应收</small><strong>${h(o.expectedAmount)}</strong><em>${h(o.asset)}</em></div><div><small>本交易核验净到账</small><strong>${r.receivedAtomic===null?'—':h(decimal(r.receivedAtomic,o.decimals))}</strong><em>${h(o.asset)}</em></div><div><small>与应收差额</small><strong class="${r.differenceAtomic!==null&&BigInt(r.differenceAtomic)<0n?'delta-negative':''}">${r.differenceAtomic===null?'—':h(decimal(r.differenceAtomic,o.decimals))}</strong><em>${h(o.asset)}</em></div></div>
    ${r.findings.length?r.findings.map(f=>`<div class="finding ${h(f.tone)}"><h3>${h(f.title)}</h3><p>${h(f.detail)}</p><p class="next-step">下一步：${h(f.action)}</p></div>`).join(''):`<div class="finding"><h3>指定收据与应收金额一致</h3><p>${h(r.explanation)}</p></div>`}
    <div class="detail-section"><h3>四方记录与证据时间线</h3><ol class="timeline">${timeline.map((t,i)=>`<li><span class="timeline-dot">${i+1}</span><div><strong>${h(t.title)}</strong><small>${t.when?h(time(t.when)):'由商家提供，未声明独立更新时间'}</small><p>${h(t.body)}</p></div></li>`).join('')}</ol></div>
    <div class="detail-section"><h3>关联标识</h3><dl class="key-values"><dt>收款账户</dt><dd>${h(o.recipient)}</dd><dt>资产合约</dt><dd>${h(o.tokenContract)}</dd><dt>入金地址 / Memo</dt><dd>${h(o.depositAddress||'未填写')}${o.depositMemo?' / '+h(o.depositMemo):''}</dd><dt>目标交易哈希</dt><dd>${h(o.txHash||'未填写')}${o.txHash&&workspace!=='demo'?` <a href="https://nearblocks.io/txns/${encodeURIComponent(o.txHash)}" target="_blank" rel="noopener noreferrer">打开浏览器 ↗</a>`:''}</dd><dt>签名账户</dt><dd>${h(o.senderAccountId||'未填写')}</dd><dt>商家到期时间</dt><dd>${h(time(o.dueAt))}，不是渠道SLA</dd><dt>评估时刻</dt><dd>${h(time(r.asOf))} · ${RULE_VERSION}</dd><dt>备注</dt><dd>${h(o.note||'—')}</dd></dl></div>
    <details class="detail-section"><summary class="details-summary">展开原始查询响应及来源</summary><pre>${h(JSON.stringify(e,null,2).slice(0,160000))}</pre></details>
    <div class="detail-actions"><div>${workspace==='orders'?`<button class="button primary" data-action="refresh" data-id="${h(id)}" ${busy.has(id)?'disabled':''}>${busy.has(id)?'正在读取…':'读取真实查询'}</button><button class="button secondary" data-action="edit" data-id="${h(id)}">编辑标识</button>`:''}<button class="button secondary" data-action="bundle" data-id="${h(id)}">下载证据</button><button class="button secondary" data-action="verify-bundle" data-id="${h(id)}">本机重跑</button></div>${workspace==='orders'?`<button class="button danger" data-action="delete" data-id="${h(id)}">移出订单</button>`:''}</div><p id="detail-replay-status" class="muted" role="status"></p>
    <p class="muted">摘要核验内容一致性，不独立证明RPC或渠道响应真实性。来源链退款与其他目标链不在本版核验范围。</p></div>`;
  if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
}
function openOrder(id,seed){
  editing=id||null;$('#order-form').reset();$('#order-form-error').textContent='';$('#order-form-title').textContent=editing?'编辑订单与查询标识':'新增订单';
  const o=seed||records.find(r=>r.order.id===id)?.order;
  const localTime=s=>{const d=new Date(s);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  if(o)for(const [key,value] of Object.entries(o)){const input=$('#order-form').elements.namedItem(key);if(input)input.value=['createdAt','dueAt'].includes(key)?localTime(value):value;}
  else {$('#order-form').elements.createdAt.value=localTime(new Date().toISOString());$('#order-form').elements.dueAt.value=localTime(new Date(Date.now()+3600000).toISOString());}
  $('#order-form').elements.id.readOnly=!!editing;$('#order-dialog').showModal();
}
async function refresh(id){
  const record=records.find(r=>r.order.id===id);if(!record||busy.has(id))return;
  const o=record.order;if(!o.depositAddress&&!(o.txHash&&o.senderAccountId)){toast('先填写渠道入金标识，或目标NEAR交易哈希与签名账户。');openOrder(id);return;}
  const fingerprint=canonical(o),gen=generation;busy.add(id);if(selected===id&&$('#detail-dialog').open)detail(id);
  const tasks=[];if(o.depositAddress)tasks.push(['provider','provider-status',{depositAddress:o.depositAddress,depositMemo:o.depositMemo}]);
  if(o.txHash&&o.senderAccountId)tasks.push(['chain','near-receipt',{txHash:o.txHash,senderAccountId:o.senderAccountId,recipient:o.recipient,tokenContract:o.tokenContract}]);
  const results=await Promise.all(tasks.map(async([key,path,body])=>{try{return [key,await query(path,body)];}catch(e){return [key,{ok:false,fetchedAt:new Date().toISOString(),error:{code:e.code||'NETWORK_ERROR',message:e.message||'查询未完成'}}];}}));
  busy.delete(id);const current=records.find(r=>r.order.id===id);if(gen!==generation||!current||canonical(current.order)!==fingerprint){toast('订单已修改，旧查询结果未写入。');return;}
  current.evidence={...current.evidence,...Object.fromEntries(results)};persist();if(workspace==='orders'){render();if(selected===id&&$('#detail-dialog').open)detail(id);}toast('查询已完成，请查看证据和缺口。');
}
function renderVerify(){
  $('#workspace-content').innerHTML=`<div class="verify-layout"><article class="panel form-panel"><span class="eyebrow">READ-ONLY RECEIPT CHECK</span><h2>核对一笔NEAR历史转账</h2><p class="muted">支持USDC、USDT、wNEAR的标准事件。填写交易的签名账户，通常不是客户的来源链地址。</p><form id="receipt-form"><div class="form-grid"><label class="full">NEAR交易哈希<input name="txHash" required placeholder="目标NEAR交易哈希"></label><label class="full">交易签名账户<input name="senderAccountId" required placeholder="signer_id"></label><label class="full">NEAR收款账户<input name="recipient" required placeholder="recipient.near"></label><label>目标资产<select name="asset"><option>USDC</option><option>USDT</option><option>wNEAR</option></select></label><label>用于比较的金额<input name="expectedAmount" required value="1" inputmode="decimal"></label></div><p class="muted">比较金额由你填写，不能据此认定这笔转账属于某个商家订单。</p><p id="receipt-error" class="form-error" role="alert"></p><div class="form-actions"><button class="button primary" id="check-receipt" type="submit">读取真实收据</button><button class="button secondary" type="button" data-action="sample">读取公开样本</button></div></form></article>
    <article class="panel form-panel"><span class="eyebrow">NEAR · FINALITY</span><h2>从链上确认，保留边界。</h2><p class="muted">只计算指定合约在最终成功收据里，对收款账户产生的净变化。初始转入、后续退款和转出一并核对。</p><div class="coverage-row"><span class="coverage-icon">✓</span><div><strong>核对资产、账户、金额和最终执行</strong><small>只确认本交易的历史净变化</small></div></div><div class="coverage-row"><span class="coverage-icon">?</span><div><strong>未知交易不等于没有付款</strong><small>可能是哈希、签名账户或节点历史范围问题</small></div></div><div class="coverage-row"><span class="coverage-icon">↳</span><div><strong>来源和原始响应可以下载复核</strong><small>上游查询失败时，不生成替代数据</small></div></div><button class="text-button" data-action="network">检查主网连接 ↗</button><div id="network-status">${networkInfo?networkHTML(networkInfo):''}</div></article></div><div id="verification-output" class="verify-result"></div>`;
  $('#receipt-form').addEventListener('submit',runReceipt);if(verification){fillReceiptForm(verification.order);renderVerification();}
}
function fillReceiptForm(order){for(const key of ['txHash','senderAccountId','recipient','asset','expectedAmount'])$('#receipt-form').elements[key].value=order[key]||'';}
function networkHTML(d){return `<dl class="key-values"><dt>网络</dt><dd>NEAR ${h(d.network)}</dd><dt>final高度</dt><dd>#${h(d.height)}</dd><dt>区块时间</dt><dd>${h(time(d.blockTime))}</dd><dt>查询时间</dt><dd>${h(time(d.fetchedAt))}</dd><dt>来源</dt><dd>${h(d.source)}</dd></dl>`;}
async function runReceipt(event){event.preventDefault();$('#receipt-error').textContent='';const button=$('#check-receipt');button.disabled=true;button.textContent='正在读取…';
  try{const input=Object.fromEntries(new FormData(event.target)),now=new Date().toISOString();const order=normalizeOrder({...input,id:'PUBLIC-CHECK',customer:'公开收据核验',sourceChain:'待核实',merchantStatus:'paid',createdAt:new Date(Date.now()-60000).toISOString(),dueAt:new Date(Date.now()+3600000).toISOString()});
    const chain=await query('near-receipt',{txHash:order.txHash,senderAccountId:order.senderAccountId,recipient:order.recipient,tokenContract:order.tokenContract});verification={order,evidence:{chain},dataMode:'public-query',notice:'公开收据查询，比较金额由使用者提供，不是商家订单。'};if(workspace==='verify')renderVerification();
  }catch(e){if($('#receipt-error'))$('#receipt-error').textContent=e.message;}finally{if($('#check-receipt')){button.disabled=false;button.textContent='读取真实收据';}}
}
async function sample(){
  if(busy.has('sample'))return;busy.add('sample');document.querySelectorAll('[data-action="sample"]').forEach(b=>{b.disabled=true;b.textContent='正在查询公开样本…';});
  try{const data=await query('public-sample');verification=data;if(workspace!=='verify'){workspace='verify';location.hash='verify';render();}else{fillReceiptForm(data.order);renderVerification();}toast('已读取真实主网样本；它不代表你的商家订单。');}
  catch(e){toast(e.message);if($('#receipt-error'))$('#receipt-error').textContent=e.message;}
  finally{busy.delete('sample');document.querySelectorAll('[data-action="sample"]').forEach(b=>{b.disabled=false;b.textContent='读取公开主网样本';});}
}
function renderVerification(){
  if(!verification||!$('#verification-output'))return;const {order:o,evidence:e}=verification,r=diagnose(o,e,[],new Date().toISOString());
  $('#verification-output').innerHTML=`<article class="panel form-panel"><div class="section-heading"><div><span class="eyebrow">PUBLIC MAINNET EVIDENCE</span><h2>本次收据核验</h2></div>${badge(r.code,r.code==='matched'?'比较金额一致':undefined)}</div><div class="sample-note">${h(verification.notice)} 未查询1Click时，不证明跨链兑换流程已完成。</div><div class="detail-money"><div><small>比较金额</small><strong>${h(o.expectedAmount)}</strong><em>${h(o.asset)}</em></div><div><small>本交易净变化</small><strong>${r.receivedAtomic===null?'—':h(decimal(r.receivedAtomic,o.decimals))}</strong><em>${h(o.asset)}</em></div><div><small>最终收据事件</small><strong>${r.facts.events.length}</strong><em>${r.facts.verified?'FINAL已核验':'待核实'}</em></div></div><p class="muted">${h(r.facts.verified?'该交易中的标准事件已按合约和收款人核对。':r.facts.issues.join('；'))}</p><dl class="key-values"><dt>交易哈希</dt><dd>${h(o.txHash)} <a href="https://nearblocks.io/txns/${encodeURIComponent(o.txHash)}" target="_blank" rel="noopener noreferrer">查看 ↗</a></dd><dt>收款账户</dt><dd>${h(o.recipient)}</dd><dt>资产合约</dt><dd>${h(o.tokenContract)}</dd><dt>签名账户</dt><dd>${h(o.senderAccountId)}</dd><dt>查询来源</dt><dd>${h(e.chain.source)}</dd><dt>读取时间</dt><dd>${h(time(e.chain.fetchedAt))}</dd></dl><div class="form-actions"><button class="button secondary" data-action="sample-bundle">下载查询证据 ↓</button><button class="button secondary" data-action="sample-replay">在本机复核</button></div><p id="sample-replay-status" class="muted" role="status"></p><details class="detail-section"><summary class="details-summary">原始RPC响应</summary><pre>${h(JSON.stringify(e.chain,null,2).slice(0,160000))}</pre></details></article>`;
}
function renderGuide(){
  $('#workspace-content').innerHTML=`<div class="guide-grid"><article class="panel guide-card"><span class="eyebrow">01 · CONNECT YOUR RECORDS</span><h2>先接一份商家订单。</h2><ol><li>下载模板，保留字段名；金额填写字符串，例如100.25。</li><li>填写NEAR收款账户、资产、订单期限和商家记账状态。</li><li>1Click查询需要原报价的入金地址，存在Memo时必须一并填写。</li><li>链上核验需要目标NEAR交易哈希和交易签名账户。</li><li>导入后打开订单详情，点击“读取真实查询”。编辑标识会清除旧查询证据。</li></ol><button class="button secondary" data-action="template">下载CSV模板 ↓</button></article>
    <article class="panel guide-card"><span class="eyebrow">02 · READ A RESULT</span><h2>先看证据，再看结论。</h2><p>应收100 USDC，指定交易净到账98.5，得到“到账不足”。差异可能来自金额约定、费用、分笔支付或退款，需要原始业务记录继续判断。</p><p>渠道SUCCESS只是渠道报告。REFUNDED也需要来源链证明。本工具会保留“待核实”，不把缺数据变成确定结论。</p><button class="text-button" data-workspace="demo">打开演示案例 ↗</button></article>
    <article class="panel guide-card full"><span class="eyebrow">03 · INTEGRATION CONTRACT</span><h2>公开只读查询接口</h2><p>路径相对于本应用部署地址。POST只用于提交公开查询字段，不接收签名或资金操作。</p><table class="api-table"><thead><tr><th>接口</th><th>输入或内容</th></tr></thead><tbody><tr><td><code>GET api/health</code></td><td>版本及服务时间</td></tr><tr><td><code>GET api/network</code></td><td>已同步主网的final高度、时间和来源</td></tr><tr><td><code>POST api/provider-status</code></td><td>depositAddress、可选depositMemo；返回原始1Click状态</td></tr><tr><td><code>POST api/near-receipt</code></td><td>txHash、senderAccountId、recipient、tokenContract；读取NEAR最终执行及相关区块</td></tr><tr><td><code>GET api/public-sample</code></td><td>有限范围内查找支持的真实公开转账；没有样本会明确报错</td></tr></tbody></table><pre>curl -X POST '${h(new URL('./api/provider-status',location.href).href)}' \
  -H 'Content-Type: application/json' \
  -d '{"depositAddress":"你的原渠道入金地址"}'</pre><p>仅支持USDC、USDT、wNEAR三个固定NEAR资产合约。服务固定查询1Click和公开NEAR RPC，不提供任意URL或任意RPC方法代理。</p></article>
    <article class="panel guide-card"><span class="eyebrow">04 · PRIVACY & STORAGE</span><h2>你的订单，保存在你的浏览器。</h2><p>CSV/JSON文件在本机解析。服务端不保存商家订单、客户简称或备注；查询时仅发送入金标识或公开链上查询字段。</p><p>浏览器localStorage不是加密保险箱；共用设备上的其他使用者可能读取订单。无跨设备同步，请导出备份。清除站点数据会移除本机记录。</p><button class="button secondary" data-action="replay">复核下载的证据文件</button></article>
    <article class="panel guide-card"><span class="eyebrow">05 · WHAT THIS VERSION COVERS</span><h2>把验证范围写清楚。</h2><ul><li>首版核验目标NEAR链的NEP-141标准事件，不核验来源链退款。</li><li>公开RPC响应是信任来源，未实现独立轻客户端证明。</li><li>只比较所关联的一笔交易，暂不自动聚合多笔到账。</li><li>没有商家系统直连、已签名Webhook接入、账户体系或站外通知。</li><li>不签名、不代客兑换、不发起退款。未提供商用SLA。</li></ul></article>
    <article class="panel guide-card full"><span class="eyebrow">SOURCES & REPLAY</span><h2>可核对的来源，可重复的判断。</h2><p>证据包保留订单、原始查询、比较上下文、规则版本及评估时刻。SHA256检查文件一致性；浏览器与CLI使用同一份规则重跑。旧文件重跑不能代表现在的订单状态。当前规则版本：${RULE_VERSION}。</p><div class="inline-links"><a href="https://docs.near-intents.org/api-reference/oneclick/check-swap-execution-status" target="_blank" rel="noopener noreferrer">1Click状态接口 ↗</a><a href="https://docs.near.org/api/rpc/transactions" target="_blank" rel="noopener noreferrer">NEAR交易与finality ↗</a><a href="https://github.com/near/NEPs/blob/master/neps/nep-0141.md" target="_blank" rel="noopener noreferrer">NEP-141事件规范 ↗</a><a href="https://nearhackathon.com/" target="_blank" rel="noopener noreferrer">NEAR Hackathon ↗</a></div></article></div>`;
}
function template(){
  const cols=['id','customer','sourceChain','asset','expectedAmount','recipient','createdAt','dueAt','merchantStatus','depositAddress','depositMemo','txHash','senderAccountId','note'];
  const now=new Date().toISOString(),row=['EXAMPLE-001','请替换为客户简称','Base','USDC','100','请填写收款账户.near',now,new Date(Date.now()+3600000).toISOString(),'unpaid','','','','','请替换示例内容，勿填写私钥'];
  download('flowtrace-orders-template.csv','\uFEFF'+[cols,row].map(x=>x.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
document.addEventListener('click',async event=>{
  const b=event.target.closest('button,a');if(!b)return;
  if(b.dataset.workspace){workspace=b.dataset.workspace;filter='all';search='';location.hash=workspace;render();return;}
  if(b.dataset.close){$('#'+b.dataset.close).close();return;}
  if(b.dataset.filter){filter=b.dataset.filter;renderOrders();return;}
  const action=b.dataset.action,id=b.dataset.id;
  if(action==='detail'){detail(id);return;}if(action==='new'){openOrder();return;}if(action==='edit'){openOrder(id);return;}
  if(action==='import'){$('#import-error').textContent='';$('#order-file').value='';$('#import-dialog').showModal();return;}
  if(action==='template'){template();return;}if(action==='refresh'){await refresh(id);return;}if(action==='sample'){await sample();return;}
  if(action==='backup'){jsonDownload('flowtrace-orders-backup.json',records.map(r=>r.order));toast('已导出订单字段；查询证据请在详情中单独下载。');return;}
  if(action==='replay'){$('#replay-result').textContent='';$('#replay-file').value='';$('#replay-dialog').showModal();return;}
  if(action==='delete'){
    const previous=records.find(r=>r.order.id===id);records=records.filter(r=>r.order.id!==id);generation++;persist();$('#detail-dialog').close();render();
    if(previous){lastRemoved=previous;render();toast('已移出本机列表。可以按撤销恢复。');}return;
  }
  if(action==='undo'&&lastRemoved){if(!records.some(r=>r.order.id===lastRemoved.order.id)){records.push(lastRemoved);generation++;persist();}lastRemoved=null;render();toast('订单已恢复');return;}
  if(action==='export'){
    const rows=filtered(evaluated());if(!rows.length){toast('没有可导出的订单');return;}
    const header=['dataMode','id','customer','asset','expectedAmount','verifiedNet','difference','result','asOf'];
    download('flowtrace-findings.csv','\uFEFF'+[header,...rows.map(({order:o,result:r})=>[workspace==='demo'?'synthetic':'merchant-local',o.id,o.customer,o.asset,o.expectedAmount,r.receivedAtomic===null?'':decimal(r.receivedAtomic,o.decimals),r.differenceAtomic===null?'':decimal(r.differenceAtomic,o.decimals),r.label,r.asOf])].map(x=>x.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');return;
  }
  if(action==='bundle'||action==='verify-bundle'){
    const record=currentRecords().find(r=>r.order.id===id);if(!record)return;
    try{const bundle=await makeBundle(record,contextFor(currentRecords()),nowFor(),workspace==='demo'?'synthetic':'merchant-local');
      if(action==='bundle')jsonDownload(`flowtrace-${id}-evidence.json`,bundle);
      else{const result=await replayBundle(bundle);$('#detail-replay-status').textContent=`复核通过 · ${result.label} · ${result.events}个收据事件 · ${result.dataMode==='synthetic'?'合成测试':'记录时刻快照'}`;}
    }catch(e){toast(e.message);}return;
  }
  if(action==='sample-bundle'||action==='sample-replay'){
    if(!verification)return;try{const bundle=await makeBundle(verification,[],new Date().toISOString(),verification.dataMode);
      if(action==='sample-bundle')jsonDownload('flowtrace-public-receipt-evidence.json',bundle);else{const result=await replayBundle(bundle);$('#sample-replay-status').textContent=`复核通过 · ${result.events}个收据事件 · ${result.label}。仅核验文件记录时刻。`;}
    }catch(e){toast(e.message);}return;
  }
  if(action==='network'){b.disabled=true;try{networkInfo=await query('network');if($('#network-status'))$('#network-status').innerHTML=networkHTML(networkInfo);}catch(e){toast(e.message);}finally{b.disabled=false;}}
});
let lastRemoved=null;
$('#order-form').addEventListener('submit',event=>{
  event.preventDefault();try{const values=Object.fromEntries(new FormData(event.target));for(const key of ['createdAt','dueAt'])values[key]=new Date(values[key]).toISOString();const order=normalizeOrder(values);
    if(records.some(r=>r.order.id===order.id&&r.order.id!==editing))throw Error('订单编号已经存在');if(!editing&&records.length>=200)throw Error('本机工作区最多200笔，请先备份并整理旧记录');
    if(editing)records=records.map(r=>r.order.id===editing?{order,evidence:{}}:r);else records.push({order,evidence:{}});generation++;const saved=persist();$('#order-dialog').close();if($('#detail-dialog').open)$('#detail-dialog').close();workspace='orders';location.hash='orders';render();toast(saved?(editing?'订单已更新，旧查询证据已清除':'订单已保存到本机浏览器'):storageIssue);
  }catch(e){$('#order-form-error').textContent=e.message;}
});
$('#confirm-import').addEventListener('click',async()=>{
  try{const file=$('#order-file').files[0];if(!file)throw Error('请选择CSV或JSON文件');if(file.size>1048576)throw Error('文件最大1MB');const imported=importOrders(await file.text(),file.name.toLowerCase().endsWith('.csv')?'csv':'json');
    if(records.length+imported.length>200)throw Error('本机工作区最多200笔，请先导出并整理旧记录');const dup=imported.find(x=>records.some(r=>r.order.id===x.id));if(dup)throw Error(`订单${dup.id}已存在，本次未写入任何订单`);
    records.push(...imported.map(order=>({order,evidence:{}})));generation++;const saved=persist();$('#import-dialog').close();workspace='orders';location.hash='orders';render();toast(saved?`已导入${imported.length}笔订单，未自动发起查询。`:storageIssue);
  }catch(e){$('#import-error').textContent=e.message;}
});
$('#download-template').addEventListener('click',template);
$('#run-replay').addEventListener('click',async()=>{
  const result=$('#replay-result');try{const file=$('#replay-file').files[0];if(!file)throw Error('请选择证据JSON文件');if(file.size>8*1024*1024)throw Error('证据文件最大8MB');const r=await replayBundle(JSON.parse(await file.text()));result.className='replay-success';result.textContent=`本机复核通过 · ${r.label} · ${r.events}个事件 · ${r.dataMode==='synthetic'?'合成测试':'历史快照'} · 评估于${time(r.asOf)}`;}catch(e){result.className='replay-error';result.textContent=e.message;}
});
addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(Object.hasOwn(names,next)&&workspace!==next){workspace=next;filter='all';search='';render();}});
setInterval(()=>{if(workspace==='orders'&&!document.hidden&&document.activeElement?.id!=='search'&&!$('#order-dialog').open&&!$('#import-dialog').open){renderOrders();if(selected&&$('#detail-dialog').open)detail(selected);}},15000);
render();
