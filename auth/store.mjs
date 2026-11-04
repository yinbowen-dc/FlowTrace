import {DatabaseSync} from 'node:sqlite';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {QueryError} from '../adapters.mjs';

export const hash=value=>createHash('sha256').update(value).digest('hex');
const secret=()=>randomBytes(32).toString('base64url');
const token=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value);
export function createAuthStore({path=':memory:',clock=()=>Date.now()}={}){
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const db=new DatabaseSync(path,{timeout:1500});if(path!==':memory:')chmodSync(path,0o600);
  db.exec(`PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;
    CREATE TABLE IF NOT EXISTS auth_users(id TEXT PRIMARY KEY,google_sub TEXT NOT NULL UNIQUE,email TEXT NOT NULL,name TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,expires INTEGER NOT NULL,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS auth_attempts(state_hash TEXT PRIMARY KEY,browser_hash TEXT NOT NULL,nonce_hash TEXT NOT NULL,verifier TEXT NOT NULL,guest_owner TEXT,previous_session_hash TEXT,expires INTEGER NOT NULL);`);
  const get=(sql,...args)=>db.prepare(sql).get(...args),run=(sql,...args)=>db.prepare(sql).run(...args);
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const v=fn();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
  function userForSession(raw){
    if(!token(raw))return null;
    const row=get('SELECT u.id,u.email,u.name,s.expires FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?',hash(raw),clock());
    return row?{id:row.id,email:row.email,name:row.name,expiresAt:new Date(row.expires).toISOString()}:null;
  }
  function begin({nonce,verifier,guestOwner=null,previousSession=null}){
    return transaction(()=>{
      run('DELETE FROM auth_attempts WHERE expires<=?',clock());run('DELETE FROM auth_sessions WHERE expires<=?',clock());
      if(get('SELECT COUNT(*) n FROM auth_attempts').n>=500)throw new QueryError('AUTH_BUSY','登录请求较多，请稍后重试',429);
      const state=secret(),browser=secret();
      run('INSERT INTO auth_attempts VALUES(?,?,?,?,?,?,?)',hash(state),hash(browser),hash(nonce),verifier,guestOwner,token(previousSession)?hash(previousSession):null,clock()+600000);
      return {state,browser};
    });
  }
  function consume(state,browser){
    if(!token(state)||!token(browser))throw new QueryError('AUTH_STATE','登录验证已失效，请从本站重新发起登录',400);
    return transaction(()=>{
      const row=get('SELECT * FROM auth_attempts WHERE state_hash=? AND browser_hash=? AND expires>?',hash(state),hash(browser),clock());
      if(!row)throw new QueryError('AUTH_STATE','登录验证已失效，请从本站重新发起登录',400);
      run('DELETE FROM auth_attempts WHERE state_hash=?',hash(state));
      return {nonceHash:row.nonce_hash,verifier:row.verifier,guestOwner:row.guest_owner,previousSessionHash:row.previous_session_hash};
    });
  }
  function upsertUser({subject,email,name}){
    const now=clock(),known=get('SELECT id FROM auth_users WHERE google_sub=?',subject),id=known?.id||randomUUID();
    if(known)run('UPDATE auth_users SET email=?,name=?,updated=? WHERE id=?',email,name,now,id);
    else run('INSERT INTO auth_users VALUES(?,?,?,?,?,?)',id,subject,email,name,now,now);
    return {id,email,name};
  }
  function createSession(userId,previousSessionHash=null){
    return transaction(()=>{
      const raw=secret(),expires=clock()+30*86400000;
      if(previousSessionHash)run('DELETE FROM auth_sessions WHERE token_hash=?',previousSessionHash);
      run('INSERT INTO auth_sessions VALUES(?,?,?,?)',hash(raw),userId,expires,clock());
      return {token:raw,expiresAt:new Date(expires).toISOString()};
    });
  }
  function logout(raw){if(token(raw))run('DELETE FROM auth_sessions WHERE token_hash=?',hash(raw));}
  return {userForSession,begin,consume,upsertUser,createSession,logout,close:()=>db.close()};
}
