import {QueryError} from '../adapters.mjs';
export function createAuthService({store,google,walletStore}={}){
  const identity=raw=>store.userForSession(raw);
  function status(raw){const user=identity(raw);return {available:google.available,authenticated:!!user,user:user?{id:user.id,name:user.name,email:user.email}:null,provider:'google',syncScope:'wallet_assistant',sessionDays:30,workspaceRetentionDays:7};}
  async function start({sessionToken,guestToken}){
    const user=identity(sessionToken),parameters=await google.prepare();
    const attempt=store.begin({...parameters,guestOwner:user?null:walletStore.claimableOwner(guestToken),previousSession:sessionToken});
    return {url:google.authorizationUrl({...parameters,state:attempt.state}),browserToken:attempt.browser};
  }
  async function callback(params,browserToken){
    if(params.getAll('state').length!==1||params.getAll('code').length>1||params.getAll('error').length>1)throw new QueryError('AUTH_STATE','登录回调无效，请重新登录',400);
    const attempt=store.consume(params.get('state'),browserToken);
    if(params.has('error'))return {cancelled:true};
    const code=params.get('code');if(typeof code!=='string'||!code||code.length>4096)throw new QueryError('AUTH_CODE','登录回调无效，请重新登录',400);
    const claims=await google.redeem({code,verifier:attempt.verifier,nonceHash:attempt.nonceHash});
    const user=store.upsertUser(claims),workspace=walletStore.account(user.id,{claimOwnerId:attempt.guestOwner}),session=store.createSession(user.id,attempt.previousSessionHash);
    return {...session,adopted:workspace.adopted};
  }
  return {identity,status,start,callback,logout:store.logout,owner:(user,guestToken)=>user?walletStore.account(user.id).principal:guestToken,close:store.close,secure:google.publicOrigin.startsWith('https:'),redirectUri:google.redirectUri};
}
