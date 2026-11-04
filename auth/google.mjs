import {OAuth2Client} from 'google-auth-library';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {QueryError} from '../adapters.mjs';
import {hash} from './store.mjs';

export function validateGoogleClaims(claims,{clientId,nonceHash,now=Date.now()}){
  const nonce=typeof claims?.nonce==='string'?hash(claims.nonce):'';
  const nonceValid=typeof nonceHash==='string'&&nonce.length===nonceHash.length&&timingSafeEqual(Buffer.from(nonce),Buffer.from(nonceHash));
  if(!claims||!['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||claims.aud!==clientId||typeof claims.sub!=='string'||!/^[A-Za-z0-9_-]{1,255}$/.test(claims.sub)||!Number.isFinite(claims.exp)||claims.exp*1000<=now||!Number.isFinite(claims.iat)||claims.iat*1000>now+300000||!nonceValid||claims.email_verified!==true||typeof claims.email!=='string'||claims.email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(claims.email))throw new QueryError('GOOGLE_IDENTITY','无法验证 Google 身份，请重新登录',401);
  return {subject:claims.sub,email:claims.email,name:typeof claims.name==='string'&&claims.name.trim()?claims.name.trim().slice(0,120):claims.email.split('@')[0]};
}

export function createGoogleProvider({clientId=process.env.GOOGLE_CLIENT_ID,clientSecret=process.env.GOOGLE_CLIENT_SECRET,publicOrigin=process.env.AUTH_PUBLIC_ORIGIN||'https://www.darkchunk.win',basePath='',clientFactory=options=>new OAuth2Client({...options,transporterOptions:{timeout:12000,retry:false}}),clock=()=>Date.now()}={}){
  let origin;try{const u=new URL(publicOrigin);if(u.origin!==publicOrigin||!(u.protocol==='https:'||u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw Error();origin=u.origin;}catch{throw new QueryError('AUTH_CONFIG','登录站点地址配置不正确',503);}
  const redirectUri=origin+basePath+'/auth/google/callback';
  const available=typeof clientId==='string'&&/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId)&&typeof clientSecret==='string'&&clientSecret.trim().length>=8;
  const client=available?clientFactory({clientId,clientSecret,redirectUri}):null;
  function requireClient(){if(!client)throw new QueryError('GOOGLE_NOT_CONFIGURED','Google 登录正在配置中，请先使用访客模式',503);}
  async function prepare(){requireClient();const {codeVerifier,codeChallenge}=await client.generateCodeVerifierAsync();return {nonce:randomBytes(32).toString('base64url'),verifier:codeVerifier,challenge:codeChallenge};}
  function authorizationUrl({state,nonce,challenge}){requireClient();return client.generateAuthUrl({response_type:'code',scope:['openid','email','profile'],access_type:'online',prompt:'select_account',state,nonce,code_challenge:challenge,code_challenge_method:'S256'});}
  async function redeem({code,verifier,nonceHash}){
    requireClient();try{
      const {tokens}=await client.getToken({code,codeVerifier:verifier,redirect_uri:redirectUri});
      if(!tokens.id_token)throw Error('missing identity token');
      const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:clientId});
      return validateGoogleClaims(ticket.getPayload(),{clientId,nonceHash,now:clock()});
    }catch(e){if(e instanceof QueryError)throw e;throw new QueryError('GOOGLE_LOGIN_FAILED','Google 登录未完成，请重新尝试',401);}
  }
  return {available,redirectUri,publicOrigin:origin,prepare,authorizationUrl,redeem};
}
