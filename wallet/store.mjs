import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {QueryError} from '../adapters.mjs';
const digest=s=>createHash('sha256').update(s).digest('hex'),ttl=7*86400000;
export function createWalletStore({path=':memory:',clock=()=>Date.now()}={}){
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const db=new DatabaseSync(path,{timeout:1500});if(path!==':memory:')chmodSync(path,0o600);
  db.exec(`PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS wallet_sessions(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS wallet_tasks(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES wallet_sessions(id) ON DELETE CASCADE,revision INTEGER NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,body TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS wallet_owner ON wallet_tasks(owner,created DESC);`);
  const get=(sql,...a)=>db.prepare(sql).get(...a),run=(sql,...a)=>db.prepare(sql).run(...a),all=(sql,...a)=>db.prepare(sql).all(...a);
  function owner(token){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return get('SELECT * FROM wallet_sessions WHERE token_hash=? AND expires>?',digest(token),clock());}
  function requireOwner(token){const o=owner(token);if(!o)throw new QueryError('WALLET_SESSION','请先创建转账任务',401);run('UPDATE wallet_sessions SET expires=? WHERE id=?',clock()+ttl,o.id);return o;}
  const unpack=r=>r?{...JSON.parse(r.body),id:r.id,revision:r.revision,createdAt:new Date(r.created).toISOString(),updatedAt:new Date(r.updated).toISOString()}:null;
  function list(token){const o=owner(token);if(!o)return [];run('UPDATE wallet_sessions SET expires=? WHERE id=?',clock()+ttl,o.id);return all('SELECT * FROM wallet_tasks WHERE owner=? ORDER BY created DESC LIMIT 20',o.id).map(unpack);}
  function create(token,body){
    run('DELETE FROM wallet_sessions WHERE expires<=?',clock());let o=owner(token),sessionToken;
    if(!o){if(get('SELECT COUNT(*) n FROM wallet_sessions').n>=100)throw new QueryError('WALLET_CAPACITY','演示会话已满，请稍后重试',503);sessionToken=randomBytes(32).toString('base64url');o={id:randomUUID()};run('INSERT INTO wallet_sessions VALUES(?,?,?)',o.id,digest(sessionToken),clock()+ttl);}
    if(get('SELECT COUNT(*) n FROM wallet_tasks WHERE owner=?',o.id).n>=20||get('SELECT COUNT(*) n FROM wallet_tasks').n>=200)throw new QueryError('WALLET_CAPACITY','任务数量已达演示上限；会话保存7天',429);
    const id=randomUUID(),now=clock();run('INSERT INTO wallet_tasks VALUES(?,?,1,?,?,?)',id,o.id,now,now,JSON.stringify(body));return {sessionToken,data:read(sessionToken||token,id)};
  }
  function read(token,id){const o=requireOwner(token),r=get('SELECT * FROM wallet_tasks WHERE id=? AND owner=?',id,o.id);if(!r)throw new QueryError('WALLET_NOT_FOUND','没有找到此转账任务',404);return unpack(r);}
  function update(token,id,revision,body){const o=requireOwner(token),r=read(token,id);if(r.revision!==revision)throw new QueryError('WALLET_CONFLICT','任务已更新，请刷新后继续',409);const {createdAt,updatedAt,revision:unused,id:unusedId,...safe}=body;const res=run('UPDATE wallet_tasks SET body=?,revision=revision+1,updated=? WHERE id=? AND owner=? AND revision=?',JSON.stringify(safe),clock(),id,o.id,revision);if(!res.changes)throw new QueryError('WALLET_CONFLICT','任务正在更新',409);return read(token,id);}
  function claimed(token,hash,except){return list(token).some(t=>t.id!==except&&t.txHash===hash);}
  return {list,create,read,update,claimed,close:()=>db.close()};
}
