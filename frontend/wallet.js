import {NearConnector} from '@hot-labs/near-connect';
import {accountId,txHash,ASSETS,atomic} from '../public/lib/core.js';
import {formatReply} from '../public/agent/chat-ui.js';
import {accountView,accountViewFromTools,balanceLabel} from '../public/lib/account-view.js';
const $=s=>document.querySelector(s),base=new URL('../../',import.meta.url),api=async(path,body)=>{const r=await fetch(new URL('api/'+path,base),{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const v=await r.json();if(!r.ok||!v.ok)throw Error(v.error?.message||'本次操作未完成');return v.data;};
let connector,connected='',tasks=[],history=[],active=false,pollTimer,focusedTaskId=null,chatBusy=false,externalConfig=null;
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const tell=text=>$('#message').textContent=text;
const formInput=(f,name)=>f.elements.namedItem(name);
function accountChanged(id){connected=accountId(id)?id:'';$('#connected-account').textContent=connected||'尚未连接钱包';$('#connect').textContent=connected?'切换／重新连接 ↗':'连接 Meteor 钱包 ↗';$('#disconnect').hidden=!connected;if(connected){formInput($('#transfer-form'),'accountId').value=connected;formInput($('#balance-form'),'accountId').value=connected;}render();}
async function connect(){try{$('#connect').disabled=true;tell('正在打开 Meteor 官方钱包，请在钱包中选择账户。');if(!connector){const manifest=await (await fetch('./vendor/manifest.json')).json();for(const m of manifest.wallets){m.executor=new URL(m.executor,location.href).href;m.icon=new URL(m.icon,location.href).href;}connector=new NearConnector({network:'mainnet',manifest,autoConnect:false,features:{signInWithoutAddKey:true,signAndSendTransaction:true},providers:{mainnet:['https://free.rpc.fastnear.com','https://rpc.mainnet.near.org']},cspNonce:$('#wallet-bundle').nonce});connector.on('wallet:signIn',e=>{accountChanged(e.accounts?.[0]?.accountId);tell('钱包已连接，下一步可查余额或准备转账。');});connector.on('wallet:signOut',()=>accountChanged(''));}await connector.connect({walletId:'meteor-wallet'});}catch{tell('连接已取消或未完成。可再次连接；如果没有出现钱包界面，请检查浏览器弹窗设置。公开账户查询与预检仍可使用。');}finally{$('#connect').disabled=false;}}
$('#connect').addEventListener('click',connect);$('#disconnect').addEventListener('click',async()=>{try{await connector.disconnect(await connector.wallet('meteor-wallet'));accountChanged('');tell('已断开当前钱包。已保存任务仍在本浏览器会话中。');}catch{tell('断开未完成，请在钱包中检查连接状态。');}});
const states={ready:'待你确认',blocked:'预检已拦截',incomplete:'条件待补查',wallet_open:'钱包已打开 · 等待结果',needs_hash:'结果待确认 · 需要交易哈希',submitted:'已取得哈希 · 待 FINAL',unknown:'核验暂未完成',completed:'链上核验通过',failed:'链上执行失败',cancelled:'准备任务已取消'};
async function refresh(){try{const r=await api('wallet/status');tasks=r.tasks||[];focusedTaskId=r.focusTaskId||null;render();updateFocus();if(!r.enabled)tell('钱包任务服务尚未启用；余额查询仍可使用。');}catch(e){tell(e.message);}}
function details(label,value){const d=node('details'),s=node('summary',label);d.append(s,node('pre',JSON.stringify(value,null,2)));return d;}
function button(text,fn,cls=''){const b=node('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;}
function renderAccountCard(view){
  const card=node('section',undefined,'account-result');card.setAttribute('aria-label',view.accountId+' 资产查询结果');
  const head=node('div',undefined,'account-result-head'),identity=node('div',undefined,'account-result-identity');
  identity.append(node('span','账户资产','result-eyebrow'),node('h3',view.accountId));
  head.append(identity,node('span',view.complete?'主网快照':'部分数据待查','result-badge'+(view.complete?'':' partial')));card.append(head);
  const ownership=connected===view.accountId?'当前连接的钱包账户':connected?'公开账户 · 与当前连接钱包不同':'公开账户查询 · 无需连接钱包';
  card.append(node('p',ownership,'account-context'));
  const native=view.assets.find(a=>a.symbol==='NEAR'),hero=node('div',undefined,'native-balance');
  hero.append(node('span','NEAR','asset-symbol'));const label=balanceLabel(native?.amount),value=node('div',label.text,'native-value');
  if(label.approximate)value.append(node('span','约','approximate'));hero.append(value,node('span','原生代币余额','asset-caption'));card.append(hero);
  const list=node('div',undefined,'asset-list');
  for(const asset of view.assets.filter(a=>a.symbol!=='NEAR')){
    const row=node('div',undefined,'asset-row'),identity=node('div',undefined,'asset-identity'),mark=node('span',asset.symbol==='wNEAR'?'wN':'$','asset-mark '+asset.symbol.toLowerCase());
    identity.append(mark,node('span',asset.symbol));const amount=balanceLabel(asset.amount),balance=node('span',amount.text,'asset-amount'+(asset.status==='unknown'?' unknown':''));
    if(amount.approximate)balance.append(node('small','约'));row.append(identity,balance);list.append(row);
  }
  card.append(list);
  if(!view.complete)card.append(node('p','未查到的资产保留为未知，不能视为零余额。','result-warning'));
  const when=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(view.fetchedAt));
  const footer=node('div',undefined,'result-footer');footer.append(node('span','查询于 '+when+' · 北京时间'),node('span','final #'+view.blockHeight));card.append(footer);
  const proof=node('details',undefined,'account-evidence');proof.append(node('summary','精确余额与查询依据'));
  const exact=node('dl',undefined,'exact-balances');for(const a of view.assets)exact.append(node('dt',a.symbol),node('dd',a.amount??'未知'));
  if(view.locked!==null)exact.append(node('dt','锁定 NEAR'),node('dd',view.locked));
  if(view.permissions)exact.append(node('dt','访问密钥'),node('dd',view.permissions.count+' 个，其中 FullAccess '+view.permissions.fullAccessCount+' 个；不构成账户安全结论。'));
  exact.append(node('dt','数据源'),node('dd',view.source),node('dt','采集时间'),node('dd',new Date(view.fetchedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})+' 北京时间'),node('dt','区块哈希'),node('dd',view.blockHash));proof.append(exact,node('p','展示值最多保留4位小数；精确值如上。范围为原生 NEAR、USDC、USDT、wNEAR；不含其他代币、NFT、质押份额或 Intents 内部余额。余额不等于可自由转出的金额。','evidence-note'));card.append(proof);
  return card;
}
async function action(task,kind,more={}){const r=await api('wallet/'+kind,{id:task.id,revision:task.revision,...more});await refresh();return r;}
function render(){const root=$('#tasks');root.replaceChildren();$('#task-count').textContent=tasks.length;if(!tasks.length){const empty=node('div',undefined,'empty');empty.append(node('span','↗','empty-mark'),node('strong','操作进度，一处跟进'),node('span','准备转账后，在这里查看预检、钱包确认和到账结果。'));root.append(empty);return;}
  for(const t of tasks){const card=node('article',undefined,'task'),badge=node('span',states[t.state]||t.state,'state'+(['blocked','incomplete','unknown','needs_hash','failed'].includes(t.state)?' bad':''));card.append(badge,node('h3',t.input.amount+' '+t.input.asset));if(t.id===focusedTaskId)card.append(node('small','当前对话任务','focus-badge'));const dl=node('dl');for(const [k,v] of [['付款方',t.input.accountId],['收款方',t.input.recipient],['金额上限',t.input.maxAmount? t.input.maxAmount+' '+t.input.asset:'未指定'],['创建时间',new Date(t.createdAt).toLocaleString('zh-CN',{hour12:false})],['任务编号',t.id.slice(0,8)]])dl.append(node('dt',k),node('dd',v));card.append(dl);const progress=node('div',undefined,'step-list');const step=['ready','blocked','incomplete','cancelled'].includes(t.state)?1:['wallet_open','needs_hash'].includes(t.state)?2:t.state==='completed'?4:3;for(let i=0;i<4;i++)progress.append(node('span',undefined,i<step?'done':''));card.append(progress);
    for(const c of t.preflight.checks)card.append(node('p',c.detail,'check '+c.status));
    if(t.state==='ready'){const review=node('label',undefined,'review'),check=document.createElement('input');check.type='checkbox';review.append(check,node('span','我已核对主网、付款账户、收款账户、资产与金额；下一步将打开钱包，可能产生真实资金转移。'));const send=button('打开钱包确认转账 ↗',()=>sign(t),'primary');send.disabled=true;check.addEventListener('change',()=>send.disabled=!check.checked||!connected||connected!==t.input.accountId||active);card.append(review,send);if(!connected||connected!==t.input.accountId)card.append(node('p','执行前请连接与付款方一致的 Meteor 主网账户。','task-note'));}
    if(['wallet_open','needs_hash'].includes(t.state)){card.append(node('p','若你已在钱包提交，请粘贴该笔交易哈希。取消或关闭弹窗也不会自动重发；先在钱包核对是否已有交易。','task-note'));const f=node('form',undefined,'hash-form'),i=node('input');i.placeholder='粘贴钱包中的 NEAR 交易哈希';i.required=true;i.maxLength=44;i.setAttribute('aria-label','交易哈希');const b=node('button','关联哈希并核验');f.append(i,b);f.addEventListener('submit',async e=>{e.preventDefault();try{if(!txHash(i.value.trim()))throw Error('交易哈希格式无效');b.disabled=true;const next=await action(t,'result',{attemptId:t.attemptId,txHash:i.value.trim()});await checkTask(next);startPolling();}catch(e){tell(e.message);b.disabled=false;}});card.append(f);}
    if(t.txHash){card.append(node('p','交易：'+t.txHash,'task-note'));const a=node('a','在 NEAR Explorer 查看 ↗');a.href='https://nearblocks.io/txns/'+encodeURIComponent(t.txHash);a.target='_blank';a.rel='noopener noreferrer';card.append(a);}
    if(t.tracking){const names={active:'后台追踪中',paused:'后台已暂停',expired:'追踪已到期',exhausted:'已达追踪次数上限'};card.append(node('p',(names[t.tracking.state]||t.tracking.state)+' · '+t.tracking.attempts+'/'+t.tracking.maxChecks+' 次 · 到期 '+new Date(t.tracking.expiresAt).toLocaleString('zh-CN',{hour12:false}),'tracking-note'));}if(t.report)card.append(node('p',t.report.message||t.report.error?.message||'等待核验','task-note'));
    const actions=node('div',undefined,'actions');actions.append(button(t.id===focusedTaskId?'正在讨论这笔任务':'在对话里讨论这笔',async()=>{try{await api('wallet/focus',{id:t.id});await refresh();$('#chat-input').value='看看这笔任务现在是什么状态。';$('#chat-input').focus();}catch(e){tell(e.message);}}));if(t.txHash&&['submitted','unknown'].includes(t.state))actions.append(button(t.tracking?.state==='active'?'暂停后台核验':'续期24小时后台核验',async()=>{try{await action(t,'tracking',{action:t.tracking?.state==='active'?'pause':'resume'});startPolling();}catch(e){tell(e.message);}}));if(['submitted','unknown'].includes(t.state))actions.append(button('重新核验链上结果 ↻',async()=>{await checkTask(t);startPolling();}));if(['ready','blocked','incomplete'].includes(t.state))actions.append(button('取消准备任务',async()=>{try{await action(t,'cancel');tell('已取消此准备任务。');}catch(e){tell(e.message);}}));card.append(actions,details('查看预检与执行证据',{...t,scope:'任务会话不验证钱包所有权；所有转账仅能由钱包确认。'}));root.append(card);
  }
}
function assertRequest(task){const p=task.preflight.walletRequest,i=task.input,d=i.asset==='NEAR'?24:ASSETS[i.asset]?.decimals,amount=atomic(i.amount,d);if(!p||p.signerId!==connected||p.signerId!==i.accountId||p.actions?.length!==1||Date.parse(task.preflight.expiresAt)<=Date.now())throw Error('钱包账户、任务或预检时效已改变，请重新核对');const a=p.actions[0];if(i.asset==='NEAR'){if(p.receiverId!==i.recipient||a.type!=='Transfer'||a.params.deposit!==amount)throw Error('转账参数不一致');}else if(p.receiverId!==ASSETS[i.asset].contract||a.type!=='FunctionCall'||a.params.methodName!=='ft_transfer'||a.params.args.receiver_id!==i.recipient||a.params.args.amount!==amount||a.params.deposit!=='1'||a.params.gas!=='30000000000000')throw Error('代币转账参数不一致');if(i.maxAmount&&BigInt(amount)>BigInt(atomic(i.maxAmount,d)))throw Error('金额超过本次上限');return p;}
async function sign(task){if(active)return;active=true;let opened;try{if(!connector||connected!==task.input.accountId)throw Error('请先连接相同付款账户的钱包');tell('正在重新检查链上条件…');const wallet=await connector.wallet('meteor-wallet'),accounts=await wallet.getAccounts({network:'mainnet'});if(!accounts.some(a=>a.accountId===task.input.accountId))throw Error('钱包当前账户与任务不一致');opened=await action(task,'open',{accountId:connected});if(opened.state!=='wallet_open'){tell('最新预检未通过，请查看任务检查项。');return;}const request=assertRequest(opened);tell('请在 Meteor 钱包中核对并决定是否签名。网页不会替你确认。');const result=await wallet.signAndSendTransaction({...request,network:'mainnet'});const hash=result?.transaction?.hash;if(!txHash(hash))throw Error('钱包未返回可核验的交易哈希');const submitted=await action(opened,'result',{attemptId:opened.attemptId,txHash:hash});tell('钱包返回了交易哈希，正在独立核验链上结果…');await checkTask(submitted);startPolling();}catch(e){if(opened?.state==='wallet_open'){try{await action(opened,'result',{attemptId:opened.attemptId});}catch{}tell('钱包操作结果未确认。请先检查钱包交易记录，已提交时粘贴交易哈希；本任务不会自动重发。');}else tell(e.message||'钱包操作未完成');}finally{active=false;await refresh();}}
async function checkTask(t){try{await action(t,'check');}catch(e){tell(e.message);}}
function startPolling(){clearTimeout(pollTimer);if(tasks.some(t=>['submitted','unknown'].includes(t.state)&&t.tracking?.state==='active'))pollTimer=setTimeout(poll,10000);}
async function poll(){await refresh();startPolling();}
$('#refresh').addEventListener('click',async()=>{await refresh();startPolling();});
function switchTab(transfer){$('#transfer-form').hidden=!transfer;$('#balance-form').hidden=transfer;$('#balances').hidden=transfer;$('#transfer-tab').classList.toggle('selected',transfer);$('#balance-tab').classList.toggle('selected',!transfer);}
$('#balance-tab').addEventListener('click',()=>switchTab(false));$('#transfer-tab').addEventListener('click',()=>switchTab(true));$('#balance-example').addEventListener('click',()=>formInput($('#balance-form'),'accountId').value='wrap.near');
$('#blocked-demo').addEventListener('click',()=>{const f=$('#transfer-form');for(const [k,v] of Object.entries({accountId:'wrap.near',recipient:'v2.ref-finance.near',asset:'NEAR',amount:'0.01',maxAmount:'0.001'}))formInput(f,k).value=v;tell('这是公开账户的只读拦截示例，不代表你拥有该账户。点击检查后会看到金额超过上限。');});
$('#balance-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,b=form.querySelector('button');b.disabled=true;try{const id=formInput(form,'accountId').value.trim();if(!accountId(id))throw Error('请输入有效 NEAR 公开账户');tell('正在读取主网 final 区块中的余额…');const r=await api('agent/run',{task:'account_inspect',input:{accountId:id}}),root=$('#balances');root.replaceChildren();const view=accountView(r);if(view)root.append(renderAccountCard(view));else throw Error('本次结果缺少可展示的账户数据，请重新查询');tell('余额查询完成；失败项目保留未知状态。');}catch(e){tell(e.message);}finally{b.disabled=false;}});
$('#transfer-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;try{const input=Object.fromEntries([...new FormData(f)].map(([k,v])=>[k,v.trim()]));if(!input.maxAmount)delete input.maxAmount;tell('正在检查链上条件并保存任务…');await api('wallet/prepare',input);await refresh();tell('任务已保存。请查看检查结果；通过后由你主动打开钱包。');}catch(e){tell(e.message);}finally{b.disabled=false;}});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{$('#chat-input').value=b.dataset.prompt;$('#chat-input').focus();}));
function chatMessage(role,text,options={}){
  const n=node('article',undefined,role),body=node('div',undefined,'reply-text');
  if(role==='assistant'&&options.accountView){
    n.classList.add('has-account');n.append(renderAccountCard(options.accountView));
    const explanation=node('details',undefined,'agent-explanation');explanation.append(node('summary','查看 Agent 说明'));body.innerHTML=formatReply(text);explanation.append(body);n.append(explanation);
  }else if(role==='assistant'){body.innerHTML=formatReply(text);n.append(body);}else n.append(node('div',text,'reply-text'));
  if(options.tools?.length){const evidence=node('details',undefined,'tool-evidence');evidence.append(node('summary','本次使用的工具'),node('p',options.tools.map(t=>t.name+(t.status==='failed'?'（未完成）':'')).join(' → ')));n.append(evidence);}
  $('#chat-log').append(n);$('#chat-log').scrollTop=$('#chat-log').scrollHeight;return n;
}
$('#chat-form').addEventListener('submit',async e=>{
  e.preventDefault();const input=$('#chat-input'),send=$('#chat-send'),content=input.value.trim();if(!content||chatBusy)return;
  if(/sk-[\w-]{16,}|ed25519:[1-9A-HJ-NP-Za-km-z]{80,}|(?:私钥|助记词|seed phrase|mnemonic|private key)\s*[:：=]\s*\S+/i.test(content)){tell('请移除密钥或助记词后再发送。');return;}
  send.disabled=true;chatBusy=true;$('#clear-chat').disabled=true;history.push({role:'user',content});history=history.slice(-9);chatMessage('user',content);input.value='';
  $('#chat-log').setAttribute('aria-busy','true');const pending=chatMessage('assistant','正在理解需求并查询数据…');pending.classList.add('agent-thinking');tell('');
  try{
    const r=await api('wallet/chat',{messages:[{role:'user',content}],requestId:crypto.randomUUID(),...(connected?{walletAccountId:connected}:{})});
    pending.remove();history.push({role:'assistant',content:r.answer.slice(0,2000)});chatMessage('assistant',r.answer,{accountView:r.accountView||accountViewFromTools(r.tools),tools:r.tools});
  }catch(e){pending.remove();chatMessage('assistant',e.message);tell('对话未完成；可以重试或使用下方手动操作。');}
  finally{await refresh();send.disabled=false;chatBusy=false;$('#clear-chat').disabled=false;$('#chat-log').setAttribute('aria-busy','false');updateFocus();}
});
$('#chat-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!$('#chat-send').disabled)$('#chat-form').requestSubmit();}});
function updateFocus(){const t=tasks.find(t=>t.id===focusedTaskId);$('#conversation-focus').hidden=!t;$('#conversation-focus').textContent=t?'正在讨论 '+t.input.amount+' '+t.input.asset+' → '+t.input.recipient:'';}
async function loadConversation(){
  try{const r=await api('wallet/conversation');history=r.messages||[];if(history.length){$('#chat-log').replaceChildren();for(const m of history)chatMessage(m.role,m.content,{accountView:m.accountView});}$('#conversation-status').textContent=history.length?'已恢复最近对话':'可以直接查询公开账户';}
  catch{$('#conversation-status').textContent='对话记录暂未恢复，可重试刷新';}
}
$('#clear-chat').addEventListener('click',async()=>{if(chatBusy||!confirm('清空当前服务器对话不可恢复，任务记录仍保留。确定清空？'))return;try{await api('wallet/conversation/reset',{});history=[];$('#chat-log').replaceChildren();chatMessage('assistant','已清空对话，任务记录仍保留。');tell('对话已清空。');}catch(e){tell(e.message);}});
$('#create-access').addEventListener('click',async()=>{const b=$('#create-access');b.disabled=true;try{const r=await api('wallet/access/create',{});externalConfig={mcpServers:{flowtraceTasks:{url:new URL('mcp/tasks',base).href,headers:{Authorization:'Bearer '+r.token}}}};$('#access-value').value=r.token;$('#access-value-label').hidden=false;$('#copy-access').disabled=false;$('#access-status').textContent='新令牌于 '+new Date(r.expiresAt).toLocaleString('zh-CN',{hour12:false})+' 到期。仅本次可复制，请保存到自己的 Agent 私密配置中。';}catch(e){tell(e.message);}finally{b.disabled=false;}});
$('#copy-access').addEventListener('click',async()=>{if(!externalConfig)return;try{await navigator.clipboard.writeText(JSON.stringify(externalConfig,null,2));$('#access-status').textContent='MCP 配置已复制，请保存在自己的私密配置文件中，不要贴到公开聊天或仓库。';}catch{tell('复制未完成，请检查浏览器剪贴板权限。');}});
$('#revoke-access').addEventListener('click',async()=>{try{await api('wallet/access/revoke',{});externalConfig=null;$('#access-value').value='';$('#access-value-label').hidden=true;$('#copy-access').disabled=true;$('#access-status').textContent='本会话全部外部访问令牌已撤销。';}catch(e){tell(e.message);}});
api('wallet/access/status').then(r=>{if(r.active)$('#access-status').textContent='当前有 '+r.active+' 个有效令牌，权限仅限本会话任务读取与核验。';}).catch(()=>{});
await loadConversation();
await refresh();api('agent/chat/status').then(r=>{$('#model-status').textContent=r.available?'Agent 已就绪':'可使用直接操作';$('#model-status').classList.toggle('offline',!r.available);$('#chat-send').disabled=!r.available;}).catch(()=>$('#model-status').textContent='模型状态未知');if(tasks.some(t=>['submitted','unknown'].includes(t.state)))startPolling();
