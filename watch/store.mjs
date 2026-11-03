import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {QueryError} from '../adapters.mjs';
const hash=token=>createHash('sha256').update(token).digest('hex');
export function createWatchStore({path=':memory:',ownerTtlMs=7*86400000,maxOwners=100,maxPerOwner=3,maxAccounts=10,maxWatches=50,maxEvents=100}={}){
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const db=new DatabaseSync(path,{timeout:1500});
  if(path!==':memory:')chmodSync(path,0o600);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS owners(id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, expires_at INTEGER NOT NULL, seen_seq INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS watches(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE, account_id TEXT NOT NULL, rules TEXT NOT NULL, state TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, next_at INTEGER NOT NULL, last_attempt_at INTEGER, baseline TEXT, failures INTEGER NOT NULL DEFAULT 0, error_code TEXT, last_state TEXT NOT NULL DEFAULT 'pending', generation INTEGER NOT NULL DEFAULT 0, UNIQUE(owner_id,account_id));
    CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE, watch_id TEXT NOT NULL REFERENCES watches(id) ON DELETE CASCADE, account_id TEXT NOT NULL, at INTEGER NOT NULL, kind TEXT NOT NULL, report TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS watches_due ON watches(state,next_at,expires_at);
    CREATE INDEX IF NOT EXISTS events_owner ON events(owner_id,seq DESC);`);
  const get=(sql,...args)=>db.prepare(sql).get(...args),all=(sql,...args)=>db.prepare(sql).all(...args),run=(sql,...args)=>db.prepare(sql).run(...args);
  function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
  function owner(token,now){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return get('SELECT * FROM owners WHERE token_hash=? AND expires_at>?',hash(token),now)??null;}
  function cleanup(now){run('DELETE FROM owners WHERE expires_at<=?',now);}
  function capacity(ownerId,accountId,now,excludeId=''){
    if(get('SELECT count(*) AS n FROM watches WHERE owner_id=? AND id<>?',ownerId,excludeId).n>=maxPerOwner)throw new QueryError('WATCH_OWNER_LIMIT',`每个浏览器最多保存${maxPerOwner}个观察账户`,409);
    if(get("SELECT count(*) AS n FROM watches WHERE id<>?",excludeId).n>=maxWatches)throw new QueryError('WATCH_CAPACITY','公共演示观察名额暂满',503);
    const active=all("SELECT DISTINCT account_id FROM watches WHERE state='active' AND expires_at>? AND id<>?",now,excludeId).map(x=>x.account_id);
    if(!active.includes(accountId)&&active.length>=maxAccounts)throw new QueryError('WATCH_CAPACITY','公共演示的后台采集名额暂满',503);
  }
  function add(token,input,now,leaseMs){return transaction(()=>{
    cleanup(now);let o=owner(token,now);
    if(!o){if(get('SELECT count(*) AS n FROM owners').n>=maxOwners)throw new QueryError('WATCH_CAPACITY','公共演示会话名额暂满',503);o={id:randomUUID()};run('INSERT INTO owners(id,token_hash,expires_at) VALUES(?,?,?)',o.id,hash(token),now+ownerTtlMs);}
    if(get('SELECT id FROM watches WHERE owner_id=? AND account_id=?',o.id,input.accountId))throw new QueryError('WATCH_DUPLICATE','这个账户已在当前观察列表中',409);
    capacity(o.id,input.accountId,now);
    const id=randomUUID();run("INSERT INTO watches(id,owner_id,account_id,rules,state,created_at,expires_at,next_at) VALUES(?,?,?,?,'active',?,?,?)",id,o.id,input.accountId,JSON.stringify(input.rules),now,now+leaseMs,now);
    run('UPDATE owners SET expires_at=? WHERE id=?',now+ownerTtlMs,o.id);
    return {id,ownerId:o.id};
  });}
  function eventRows(ownerId,before=Number.MAX_SAFE_INTEGER){return all('SELECT seq,watch_id,account_id,at,kind,report FROM events WHERE owner_id=? AND seq<? ORDER BY seq DESC LIMIT 20',ownerId,before).map(x=>({seq:x.seq,watchId:x.watch_id,accountId:x.account_id,at:new Date(x.at).toISOString(),kind:x.kind,report:JSON.parse(x.report)}));}
  function read(token,now){const o=owner(token,now);if(!o)return {hasSession:false,watches:[],events:[],unread:0,retainedEvents:0};
    run('UPDATE owners SET expires_at=? WHERE id=?',now+ownerTtlMs,o.id);
    const watches=all('SELECT * FROM watches WHERE owner_id=? ORDER BY created_at,id',o.id).map(w=>({id:w.id,accountId:w.account_id,rules:JSON.parse(w.rules),state:w.state==='active'&&w.expires_at<=now?'expired':w.state,lastState:w.last_state,errorCode:w.error_code,createdAt:new Date(w.created_at).toISOString(),expiresAt:new Date(w.expires_at).toISOString(),nextAt:new Date(w.next_at).toISOString(),lastCheckedAt:w.last_attempt_at?new Date(w.last_attempt_at).toISOString():null,baseline:w.baseline?JSON.parse(w.baseline).anchor:null}));
    return {hasSession:true,watches,events:eventRows(o.id),unread:get('SELECT count(*) AS n FROM events WHERE owner_id=? AND seq>?',o.id,o.seen_seq).n,retainedEvents:get('SELECT count(*) AS n FROM events WHERE owner_id=?',o.id).n};
  }
  function events(token,before,now){const o=owner(token,now);if(!o)throw new QueryError('WATCH_SESSION','请先在当前浏览器建立观察列表',401);return eventRows(o.id,before);}
  function action(token,{id,action},now,leaseMs){return transaction(()=>{
    const o=owner(token,now);if(!o)throw new QueryError('WATCH_SESSION','当前观察会话已失效，请重新建立列表',401);
    if(action==='ack'){run('UPDATE owners SET seen_seq=(SELECT COALESCE(MAX(seq),0) FROM events WHERE owner_id=?) WHERE id=?',o.id,o.id);return;}
    const w=get('SELECT * FROM watches WHERE id=? AND owner_id=?',id,o.id);if(!w)throw new QueryError('WATCH_NOT_FOUND','未找到这个观察账户',404);
    if(action==='delete'){run('DELETE FROM watches WHERE id=? AND owner_id=?',id,o.id);return;}
    if(action==='pause'){run("UPDATE watches SET state='paused',generation=generation+1 WHERE id=?",id);return;}
    if(action==='resume'){
      if(w.state==='active'&&w.expires_at>now)throw new QueryError('WATCH_ALREADY_ACTIVE','这个账户正在观察中',409);
      capacity(o.id,w.account_id,now,id);
      run("UPDATE watches SET state='active',expires_at=?,next_at=?,baseline=NULL,failures=0,error_code=NULL,last_state='pending',generation=generation+1 WHERE id=?",now+leaseMs,Math.max(now,(w.last_attempt_at??(now-60000))+60000),id);return;
    }
    if(action==='extend'){
      if(w.state!=='active'||w.expires_at<=now)throw new QueryError('WATCH_PAUSED','请先恢复观察，再续期',409);
      run('UPDATE watches SET expires_at=? WHERE id=?',now+leaseMs,id);return;
    }
    if(action==='check'){
      if(w.state!=='active'||w.expires_at<=now)throw new QueryError('WATCH_PAUSED','请先恢复这个观察账户',409);
      if(w.last_attempt_at!==null&&now-w.last_attempt_at<60000)throw new QueryError('WATCH_TOO_SOON','两次采集至少间隔60秒，请稍后再查',429);
      run('UPDATE watches SET next_at=? WHERE id=?',now,id);
    }
  });}
  function claim(now,limit=2){return transaction(()=>{
    cleanup(now);
    const accounts=all("SELECT account_id,MIN(next_at) AS due FROM watches WHERE state='active' AND expires_at>? AND next_at<=? GROUP BY account_id ORDER BY due LIMIT ?",now,now,limit);
    return accounts.map(({account_id})=>{
      const rows=all("SELECT * FROM watches WHERE account_id=? AND state='active' AND expires_at>? AND next_at<=?",account_id,now,now);
      for(const row of rows)run('UPDATE watches SET next_at=?,last_attempt_at=? WHERE id=?',now+60000,now,row.id);
      return {accountId:account_id,watches:rows.map(w=>({...w,rules:JSON.parse(w.rules),baseline:w.baseline?JSON.parse(w.baseline):null}))};
    });
  });}
  function finish(w,{snapshot,state,errorCode=null,nextAt,events=[]},now){return transaction(()=>{
    const current=get("SELECT * FROM watches WHERE id=? AND owner_id=? AND generation=? AND state='active' AND expires_at>?",w.id,w.owner_id,w.generation,now);
    if(!current)return false;
    const baseline=snapshot?JSON.stringify(snapshot):current.baseline;
    run('UPDATE watches SET baseline=?,last_state=?,error_code=?,failures=?,next_at=? WHERE id=?',baseline,state,errorCode,errorCode?current.failures+1:0,nextAt,w.id);
    for(const event of events){const report=JSON.stringify(event.report);if(Buffer.byteLength(report)>32768)throw new QueryError('WATCH_REPORT_SIZE','观察报告超过存储上限');run('INSERT INTO events(owner_id,watch_id,account_id,at,kind,report) VALUES(?,?,?,?,?,?)',w.owner_id,w.id,w.account_id,now,event.kind,report);}
    run('DELETE FROM events WHERE owner_id=? AND seq NOT IN (SELECT seq FROM events WHERE owner_id=? ORDER BY seq DESC LIMIT ?)',w.owner_id,w.owner_id,maxEvents);
    return true;
  });}
  return {owner,add,read,events,action,claim,finish,cleanup,limits:{maxPerOwner,maxAccounts,maxWatches,maxEvents,ownerTtlMs},close:()=>db.close()};
}
