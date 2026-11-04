import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createAuthStore,hash} from '../auth/store.mjs';
import {createGoogleProvider,validateGoogleClaims} from '../auth/google.mjs';
import {createWalletStore} from '../wallet/store.mjs';

const clientId='test.apps.googleusercontent.com',nonce='nonce-test';
const claims=()=>({iss:'https://accounts.google.com',aud:clientId,sub:'123456',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,nonce,email_verified:true,email:'demo@example.com',name:' Demo '});
test('Google claims require verified audience, issuer, time and per-attempt nonce',()=>{
  const options={clientId,nonceHash:hash(nonce)};
  assert.deepEqual(validateGoogleClaims(claims(),options),{subject:'123456',email:'demo@example.com',name:'Demo'});
  for(const change of [{aud:'other'},{iss:'https://attacker.test'},{exp:0},{iat:99999999999},{nonce:'other'},{email_verified:false},{sub:''},{email:'bad'}])assert.throws(()=>validateGoogleClaims({...claims(),...change},options),e=>e.code==='GOOGLE_IDENTITY');
});
test('provider requests only identity scopes with PKCE and verifies ID tokens through the official client',async()=>{
  let exchange,verification;
  const fake={generateCodeVerifierAsync:async()=>({codeVerifier:'verifier',codeChallenge:'challenge'}),generateAuthUrl:x=>x,getToken:async x=>{exchange=x;return {tokens:{id_token:'fixture-token'}};},verifyIdToken:async x=>{verification=x;return {getPayload:claims};}};
  const google=createGoogleProvider({clientId,clientSecret:'fixture-secret',basePath:'/collect',clientFactory:()=>fake});
  const p=await google.prepare(),url=google.authorizationUrl({...p,state:'state'});
  assert.deepEqual(url.scope,['openid','email','profile']);assert.equal(url.code_challenge_method,'S256');assert.equal(url.access_type,'online');assert.equal(url.code_challenge,'challenge');
  assert.equal((await google.redeem({code:'code',verifier:p.verifier,nonceHash:hash(nonce)})).subject,'123456');
  assert.equal(exchange.codeVerifier,'verifier');assert.equal(exchange.redirect_uri,'https://www.darkchunk.win/collect/auth/google/callback');assert.deepEqual(verification,{idToken:'fixture-token',audience:clientId});
  fake.verifyIdToken=async()=>{throw Error('SECRET_PROVIDER_ERROR');};await assert.rejects(()=>google.redeem({code:'code'}),e=>e.code==='GOOGLE_LOGIN_FAILED'&&!e.message.includes('SECRET'));
  assert.equal(createGoogleProvider({clientId:'',clientSecret:''}).available,false);
  assert.throws(()=>createGoogleProvider({publicOrigin:'http://example.com'}));
});
test('OAuth attempts are correlated, expire and cannot replay; sessions are hashed, rotate and revoke independently',async t=>{
  let now=Date.now();const dir=await mkdtemp(join(tmpdir(),'ft-auth-')),path=join(dir,'auth.sqlite'),store=createAuthStore({path,clock:()=>now});t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true});});
  const attempt=store.begin({nonce,verifier:'private-verifier'});
  assert.throws(()=>store.consume(attempt.state,'x'.repeat(43)),e=>e.code==='AUTH_STATE');
  assert.equal(store.consume(attempt.state,attempt.browser).nonceHash,hash(nonce));assert.throws(()=>store.consume(attempt.state,attempt.browser));
  const expired=store.begin({nonce,verifier:'v'});now+=600001;assert.throws(()=>store.consume(expired.state,expired.browser));
  const user=store.upsertUser({subject:'123',email:'demo@example.com',name:'Demo'}),a=store.createSession(user.id),b=store.createSession(user.id);
  const db=new DatabaseSync(path);assert.equal(db.prepare('SELECT COUNT(*) n FROM auth_sessions WHERE token_hash=?').get(a.token).n,0);db.close();
  const next=store.createSession(user.id,hash(a.token));assert.equal(store.userForSession(a.token),null);assert.equal(store.userForSession(next.token).id,user.id);
  assert.equal(store.upsertUser({subject:'123',email:'new@example.com',name:'New'}).id,user.id);
  store.logout(next.token);assert.equal(store.userForSession(next.token),null);assert.equal(store.userForSession(b.token).email,'new@example.com');now+=30*86400000+1;assert.equal(store.userForSession(b.token),null);
});
test('first login adopts guest history and revokes its old capabilities; devices share an isolated account workspace',t=>{
  const s=createWalletStore();t.after(()=>s.close());const a=randomUUID(),b=randomUUID(),guest=s.create(null,{state:'blocked',input:{amount:'1'}}),grant=s.createAccess(guest.sessionToken),oldPrincipal=s.authorizeAccess(grant.token);
  const workspace=s.account(a,{claimOwnerId:s.claimableOwner(guest.sessionToken)});assert.equal(workspace.adopted,true);assert.equal(s.read(workspace.principal,guest.data.id).id,guest.data.id);
  assert.deepEqual(s.list(guest.sessionToken),[]);assert.throws(()=>s.authorizeAccess(grant.token));assert.deepEqual(s.list(oldPrincipal),[]);
  assert.equal(s.list(s.account(a).principal)[0].id,guest.data.id);assert.deepEqual(s.list(s.account(b).principal),[]);assert.deepEqual(s.list({}),[]);
  const unrelated=s.create(null,{state:'blocked',input:{amount:'2'}}),existing=s.account(a,{claimOwnerId:s.claimableOwner(unrelated.sessionToken)});assert.equal(existing.adopted,false);assert.equal(s.list(existing.principal).length,1);assert.equal(s.list(unrelated.sessionToken)[0].id,unrelated.data.id);
});
test('a running guest turn prevents adoption and account workspaces obey the existing seven-day retention',t=>{
  let now=Date.now();const s=createWalletStore({clock:()=>now});t.after(()=>s.close());const turnId=randomUUID(),guest=s.beginTurn(null,turnId,'fingerprint'),uid=randomUUID();
  assert.throws(()=>s.account(uid,{claimOwnerId:s.claimableOwner(guest.token)}),e=>e.code==='AUTH_GUEST_BUSY');
  s.completeTurn(guest.token,turnId,guest.epoch,[],{});
  const p=s.account(uid,{claimOwnerId:s.claimableOwner(guest.token)}).principal;s.create(p,{state:'blocked'});now+=7*86400000+1;assert.deepEqual(s.list(s.account(uid).principal),[]);
});
