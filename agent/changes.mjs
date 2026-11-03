import {ASSETS,decimal,accountId,txHash} from '../public/lib/core.js';

const validAmount=x=>typeof x==='string'&&/^\d{1,39}$/.test(x)&&BigInt(x)<(1n<<128n);
function keyMap(snapshot){
  if(snapshot.permissions?.status!=='verified')return null;
  const keys=snapshot.permissions.report?.keys;if(!Array.isArray(keys))return null;
  const result=new Map();
  for(const key of keys){
    if(typeof key.publicKey!=='string'||result.has(key.publicKey))return null;
    let permission;
    if(key.type==='FullAccess')permission={type:'FullAccess'};
    else if(key.type==='FunctionCall'&&accountId(key.receiverId)&&Array.isArray(key.methodNames)&&key.methodNames.every(x=>typeof x==='string')&&(key.gasAllowanceAtomic===null||validAmount(key.gasAllowanceAtomic))){
      permission={type:'FunctionCall',receiverId:key.receiverId,methodNames:[...new Set(key.methodNames)].sort(),gasAllowanceAtomic:key.gasAllowanceAtomic};
    }else return null;
    result.set(key.publicKey,permission);
  }
  return result;
}

// Snapshots are reread from RPC by the service, never accepted from clients.
export function compareAccountSnapshots(before,after){
  const findings=[],balances=[];
  const add=(kind,detail,extra={})=>findings.push({kind,detail,...extra});
  function balance(symbol,decimals,left,right,field='amountAtomic'){
    if(left?.status!=='verified'||right?.status!=='verified'||!validAmount(left[field])||!validAmount(right[field])){balances.push({symbol,status:'unknown',reason:'至少一个区块的余额查询未完成或格式无效。'});return;}
    const delta=(BigInt(right[field])-BigInt(left[field])).toString();
    balances.push({symbol,status:'verified',beforeAtomic:left[field],afterAtomic:right[field],deltaAtomic:delta,before:decimal(left[field],decimals),after:decimal(right[field],decimals),delta:decimal(delta,decimals)});
    if(delta!=='0')add('balance_change',`${symbol} 净变化 ${decimal(delta,decimals)}；不代表一笔转账，也不自动归因手续费。`,{symbol,deltaAtomic:delta});
  }
  balance('NEAR',24,before.native,after.native);
  balance('NEAR locked',24,before.native,after.native,'lockedAtomic');
  for(const asset of Object.values(ASSETS))balance(asset.symbol,asset.decimals,before.tokens?.find(x=>x.contract===asset.contract),after.tokens?.find(x=>x.contract===asset.contract));
  const left=keyMap(before),right=keyMap(after),permissions={status:left&&right?'verified':'unknown',added:[],removed:[],changed:[]};
  if(left&&right){
    for(const [publicKey,permission]of right){
      if(!left.has(publicKey)){permissions.added.push({publicKey,permission});add('key_added',`新增 ${permission.type} 公钥，需结合你的实际操作确认。`,{publicKey});}
      else if(JSON.stringify(left.get(publicKey))!==JSON.stringify(permission)){permissions.changed.push({publicKey,before:left.get(publicKey),after:permission});add('key_permission_changed','公钥权限发生变化，需人工核对授权范围。',{publicKey});}
    }
    for(const [publicKey,permission]of left)if(!right.has(publicKey)){permissions.removed.push({publicKey,permission});add('key_removed',`移除 ${permission.type} 公钥，需核对是否为预期的密钥调整。`,{publicKey});}
  }
  const codeKnown=before.native?.status==='verified'&&after.native?.status==='verified'&&txHash(before.native.codeHash)&&txHash(after.native.codeHash);
  const contract={status:codeKnown?'verified':'unknown',before:codeKnown?before.native.codeHash:null,after:codeKnown?after.native.codeHash:null,changed:codeKnown?before.native.codeHash!==after.native.codeHash:null};
  if(contract.changed)add('contract_code_changed','账户部署的合约代码哈希发生变化；此结果不能判断新代码是否安全。');
  const quality=balances.every(x=>x.status==='verified')&&permissions.status==='verified'&&codeKnown?'complete_within_scope':'partial';
  return {state:quality==='partial'?'incomplete':findings.length?'changes_found':'no_changes',quality,balances,permissions,contract,findings};
}
