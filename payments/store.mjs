import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {QueryError} from '../adapters.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function createPaymentStore({path=':memory:',ownerTtlMs=7*86400000,maxOwners=100,maxPerOwner=20,maxOrders=200,maxChecks=10,cooldownMs=30000}={}){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path,{timeout:1500});if(path!==':memory:')chmodSync(path,0o600);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS payment_owners(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS payment_orders(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES payment_owners(id) ON DELETE CASCADE,reference TEXT NOT NULL,terms TEXT NOT NULL,links TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'active',revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,last_attempt_at INTEGER,checking_token TEXT,checking_until INTEGER,latest_report TEXT,checked_at INTEGER,UNIQUE(owner_id,reference));
 CREATE TABLE IF NOT EXISTS payment_checks(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES payment_owners(id) ON DELETE CASCADE,order_id TEXT NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,at INTEGER NOT NULL,revision INTEGER NOT NULL,report TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS payment_audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,order_id TEXT NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,at INTEGER NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS payment_claims(owner_id TEXT NOT NULL REFERENCES payment_owners(id) ON DELETE CASCADE,order_id TEXT NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,recipient TEXT NOT NULL,asset TEXT NOT NULL,claim_key TEXT NOT NULL,PRIMARY KEY(order_id,claim_key));
 CREATE INDEX IF NOT EXISTS payment_claim_lookup ON payment_claims(owner_id,recipient,asset,claim_key);
 CREATE INDEX IF NOT EXISTS payment_history ON payment_checks(order_id,at DESC);`);
 const get=(sql,...args)=>db.prepare(sql).get(...args),all=(sql,...args)=>db.prepare(sql).all(...args),run=(sql,...args)=>db.prepare(sql).run(...args);
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
 function owner(token,now){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return get('SELECT * FROM payment_owners WHERE token_hash=? AND expires_at>?',hash(token),now)??null;}
 function requireOwner(token,now){const o=owner(token,now);if(!o)throw new QueryError('PAYMENT_SESSION','请先在当前浏览器保存一张订单',401);run('UPDATE payment_owners SET expires_at=? WHERE id=?',now+ownerTtlMs,o.id);return o;}
 function requireOrder(ownerId,id){const row=get('SELECT * FROM payment_orders WHERE id=? AND owner_id=?',id,ownerId);if(!row)throw new QueryError('PAYMENT_NOT_FOUND','没有找到这张订单',404);return row;}
 function version(row,revision){if(row.revision!==revision)throw new QueryError('PAYMENT_CONFLICT','订单已在其他页面更新，请刷新后再操作',409);}
 function audit(id,kind,detail,now){run('INSERT INTO payment_audit(order_id,at,kind,detail) VALUES(?,?,?,?)',id,now,kind,JSON.stringify(detail));run('DELETE FROM payment_audit WHERE order_id=? AND seq NOT IN(SELECT seq FROM payment_audit WHERE order_id=? ORDER BY seq DESC LIMIT 30)',id,id);}
 function conflicts(row){return all(`SELECT DISTINCT other.id,other.reference FROM payment_claims mine JOIN payment_claims theirs ON mine.owner_id=theirs.owner_id AND mine.recipient=theirs.recipient AND mine.asset=theirs.asset AND mine.claim_key=theirs.claim_key JOIN payment_orders other ON other.id=theirs.order_id WHERE mine.order_id=? AND theirs.order_id<>? ORDER BY other.reference`,row.id,row.id);}
 function shape(row){return {id:row.id,reference:row.reference,terms:JSON.parse(row.terms),links:JSON.parse(row.links),state:row.state,revision:row.revision,createdAt:new Date(row.created_at).toISOString(),lastAttemptAt:row.last_attempt_at===null?null:new Date(row.last_attempt_at).toISOString(),checkingUntil:row.checking_until?new Date(row.checking_until).toISOString():null,checkedAt:row.checked_at?new Date(row.checked_at).toISOString():null,report:row.latest_report?JSON.parse(row.latest_report):null,conflicts:conflicts(row)};}
 function list(token,now){const o=owner(token,now);if(!o)return {hasSession:false,orders:[]};run('UPDATE payment_owners SET expires_at=? WHERE id=?',now+ownerTtlMs,o.id);return {hasSession:true,orders:all('SELECT * FROM payment_orders WHERE owner_id=? ORDER BY created_at DESC,id',o.id).map(shape)};}
 function detail(token,id,now){const o=requireOwner(token,now),row=requireOrder(o.id,id);return {...shape(row),history:all('SELECT id,at,revision,report FROM payment_checks WHERE order_id=? ORDER BY at DESC,rowid DESC LIMIT ?',id,maxChecks).map(r=>({id:r.id,at:new Date(r.at).toISOString(),revision:r.revision,report:JSON.parse(r.report)})),audit:all('SELECT seq,at,kind,detail FROM payment_audit WHERE order_id=? ORDER BY seq DESC LIMIT 30',id).map(r=>({seq:r.seq,at:new Date(r.at).toISOString(),kind:r.kind,detail:JSON.parse(r.detail)}))};}
 function create(token,{reference,terms,links},now){return transaction(()=>{
  run('DELETE FROM payment_owners WHERE expires_at<=?',now);let o=owner(token,now),sessionToken=token;
  if(!o){if(get('SELECT count(*) n FROM payment_owners').n>=maxOwners)throw new QueryError('PAYMENT_CAPACITY','公共演示会话名额暂满',503);o={id:randomUUID()};sessionToken=randomBytes(32).toString('base64url');run('INSERT INTO payment_owners VALUES(?,?,?)',o.id,hash(sessionToken),now+ownerTtlMs);}
  if(get('SELECT count(*) n FROM payment_orders WHERE owner_id=?',o.id).n>=maxPerOwner)throw new QueryError('PAYMENT_OWNER_LIMIT',`每个浏览器最多保存${maxPerOwner}张订单（含归档）`,409);
  if(get('SELECT count(*) n FROM payment_orders').n>=maxOrders)throw new QueryError('PAYMENT_CAPACITY','公共演示订单名额暂满',503);
  if(get('SELECT id FROM payment_orders WHERE owner_id=? AND reference=?',o.id,reference))throw new QueryError('PAYMENT_REFERENCE','当前列表中已存在这个订单编号',409);
  const id=randomUUID();run('INSERT INTO payment_orders(id,owner_id,reference,terms,links,created_at) VALUES(?,?,?,?,?,?)',id,o.id,reference,JSON.stringify(terms),JSON.stringify(links),now);audit(id,'created',{reference,terms,links},now);run('UPDATE payment_owners SET expires_at=? WHERE id=?',now+ownerTtlMs,o.id);return {id,sessionToken};
 });}
 function link(token,{id,revision,links},now){return transaction(()=>{const o=requireOwner(token,now),r=requireOrder(o.id,id);version(r,revision);if(r.state!=='active')throw new QueryError('PAYMENT_ARCHIVED','请先恢复这张订单',409);run('UPDATE payment_orders SET links=?,revision=revision+1,latest_report=NULL,checked_at=NULL,checking_token=NULL,checking_until=NULL WHERE id=?',JSON.stringify(links),id);run('DELETE FROM payment_claims WHERE order_id=?',id);audit(id,'linked',{revision:revision+1,links},now);});}
 function archive(token,{id,revision,archived},now){return transaction(()=>{const o=requireOwner(token,now),r=requireOrder(o.id,id);version(r,revision);run('UPDATE payment_orders SET state=?,revision=revision+1,checking_token=NULL,checking_until=NULL WHERE id=?',archived?'archived':'active',id);audit(id,archived?'archived':'restored',{},now);});}
 function beginCheck(token,{id,revision},now){return transaction(()=>{const o=requireOwner(token,now),r=requireOrder(o.id,id);version(r,revision);if(r.state!=='active')throw new QueryError('PAYMENT_ARCHIVED','归档订单不会发起查询，请先恢复',409);if(r.checking_until>now)throw new QueryError('PAYMENT_BUSY','这张订单正在核验，请稍后刷新',409);if(r.last_attempt_at!==null&&now-r.last_attempt_at<cooldownMs)throw new QueryError('PAYMENT_TOO_SOON','同一订单两次核验至少间隔30秒',429);const attempt=randomUUID();run('UPDATE payment_orders SET last_attempt_at=?,checking_token=?,checking_until=? WHERE id=?',now,attempt,now+90000,id);return {...shape(r),ownerId:o.id,attempt};});}
 function finishCheck(job,report,keys,now){return transaction(()=>{
  const r=get(`SELECT * FROM payment_orders WHERE id=? AND owner_id=? AND revision=? AND checking_token=? AND state='active'`,job.id,job.ownerId,job.revision,job.attempt);if(!r)return false;
  let encoded=JSON.stringify(report);if(Buffer.byteLength(encoded)>98304||keys.length>100)throw new QueryError('PAYMENT_REPORT_SIZE','核验结果超过工作台存储范围，请使用单次核验工具',502);
  if(report.near?.verified){run('DELETE FROM payment_claims WHERE order_id=?',job.id);for(const key of new Set(keys))run('INSERT INTO payment_claims VALUES(?,?,?,?,?)',job.ownerId,job.id,job.terms.recipient,job.terms.asset,key);}
  encoded=JSON.stringify({...report,conflictsAtCheck:conflicts(r)});if(Buffer.byteLength(encoded)>98304)throw new QueryError('PAYMENT_REPORT_SIZE','核验结果超过工作台存储范围',502);
  run('UPDATE payment_orders SET latest_report=?,checked_at=?,checking_token=NULL,checking_until=NULL WHERE id=?',encoded,now,job.id);
  run('INSERT INTO payment_checks VALUES(?,?,?,?,?,?)',randomUUID(),job.ownerId,job.id,now,job.revision,encoded);run('DELETE FROM payment_checks WHERE order_id=? AND id NOT IN(SELECT id FROM payment_checks WHERE order_id=? ORDER BY at DESC,rowid DESC LIMIT ?)',job.id,job.id,maxChecks);audit(job.id,'checked',{revision:job.revision,state:report.state},now);return true;
 });}
 let closed=false;return {list,detail,create,link,archive,beginCheck,finishCheck,limits:{maxPerOwner,maxOrders,maxChecks,ownerTtlMs,cooldownMs},close:()=>{if(!closed){closed=true;db.close();}}};
}
