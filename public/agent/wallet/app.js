var gt=Object.create;var Ue=Object.defineProperty;var wt=Object.getOwnPropertyDescriptor;var yt=Object.getOwnPropertyNames;var bt=Object.getPrototypeOf,vt=Object.prototype.hasOwnProperty;var f=(s,e)=>()=>{try{return e||s((e={exports:{}}).exports,e),e.exports}catch(t){throw e=0,t}};var xt=(s,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of yt(e))!vt.call(s,r)&&r!==t&&Ue(s,r,{get:()=>e[r],enumerable:!(n=wt(e,r))||n.enumerable});return s};var kt=(s,e,t)=>(t=s!=null?gt(bt(s)):{},xt(e||!s||!s.__esModule?Ue(t,"default",{value:s,enumerable:!0}):t,s));var re=f(j=>{"use strict";Object.defineProperty(j,"__esModule",{value:!0});j.LocalStorage=void 0;var se=class{async get(e){return typeof window>"u"?null:localStorage.getItem(e)}async set(e,t){typeof window>"u"||localStorage.setItem(e,t)}async remove(e){typeof window>"u"||localStorage.removeItem(e)}};j.LocalStorage=se});var Be=f(oe=>{"use strict";Object.defineProperty(oe,"__esModule",{value:!0});oe.encodeBase58=At;var He="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";function At(s){if(s.length===0)return"";let e=0,t=0;for(;t<s.length&&s[t]===0;)e++,t++;let n=[0];for(;t<s.length;t++){let o=s[t];for(let a=0;a<n.length;++a)o+=n[a]<<8,n[a]=o%58,o=o/58|0;for(;o>0;)n.push(o%58),o=o/58|0}for(;n.length>0&&n[n.length-1]===0;)n.pop();let r="";for(let o=0;o<e;o++)r+=He[0];for(let o=n.length-1;o>=0;--o)r+=He[n[o]];return r}});var _=f(L=>{"use strict";Object.defineProperty(L,"__esModule",{value:!0});L.nearActionsToConnectorActions=void 0;var St=Be(),Et=s=>{try{return JSON.parse(new TextDecoder().decode(s))}catch{return s}},Ct=s=>s.enum!=null?s.enum==="fullAccess":"fullAccess"in s,It=s=>s.enum!=null?s.enum==="AccountId":"AccountId"in s,_t=s=>s.map(e=>{if("type"in e)return e;if(e.signedDelegate)throw new Error("SignedDelegate actions cannot be sent through the wallet connector; wallets sign delegates via signDelegateActions");if(e.functionCall)return{type:"FunctionCall",params:{methodName:e.functionCall.methodName,args:Et(e.functionCall.args),gas:e.functionCall.gas.toString(),deposit:e.functionCall.deposit.toString()}};if(e.deployGlobalContract)return{type:"DeployGlobalContract",params:{code:e.deployGlobalContract.code,deployMode:It(e.deployGlobalContract.deployMode)?"AccountId":"CodeHash"}};if(e.createAccount)return{type:"CreateAccount"};if(e.useGlobalContract){let t=e.useGlobalContract.contractIdentifier;return{type:"UseGlobalContract",params:{contractIdentifier:t.AccountId!=null?{accountId:t.AccountId}:{codeHash:(0,St.encodeBase58)(t.CodeHash)}}}}if(e.deployContract)return{type:"DeployContract",params:{code:e.deployContract.code}};if(e.deleteAccount)return{type:"DeleteAccount",params:{beneficiaryId:e.deleteAccount.beneficiaryId}};if(e.deleteKey)return{type:"DeleteKey",params:{publicKey:e.deleteKey.publicKey.toString()}};if(e.transfer)return{type:"Transfer",params:{deposit:e.transfer.deposit.toString()}};if(e.stake)return{type:"Stake",params:{stake:e.stake.stake.toString(),publicKey:e.stake.publicKey.toString()}};if(e.addKey){let{permission:t}=e.addKey.accessKey,n;if(t.functionCall)n={receiverId:t.functionCall.receiverId,allowance:t.functionCall.allowance?.toString(),methodNames:t.functionCall.methodNames};else if(Ct(t))n="FullAccess";else throw new Error("Unsupported access-key permission on AddKey: only functionCall and fullAccess can be sent through the wallet connector (pass a ConnectorAction otherwise)");return{type:"AddKey",params:{publicKey:e.addKey.publicKey.toString(),accessKey:{nonce:Number(e.addKey.accessKey.nonce),permission:n}}}}throw new Error("Unsupported action type")});L.nearActionsToConnectorActions=_t});var P=f(k=>{"use strict";Object.defineProperty(k,"__esModule",{value:!0});k.isGasKeyAction=void 0;k.assertGasKeyActionsSupported=Nt;var Pt=s=>s.type==="TransferToGasKey"||s.type==="WithdrawFromGasKey"||s.type==="AddKey"&&s.params.gasKeyInfo!=null;k.isGasKeyAction=Pt;function Nt(s,e,t){if(s?.gasKeys)return;let n=e.filter(k.isGasKeyAction).map(r=>r.type);if(n.length!==0)throw new Error(`${t} does not advertise gas-key support (manifest features.gasKeys), so ${[...new Set(n)].join(", ")} cannot be sent through it; a wallet that does not know gasKeyInfo could add a plain key instead. Sign locally with a full-access key, or use a wallet whose manifest sets features.gasKeys.`)}});var q=f(D=>{"use strict";Object.defineProperty(D,"__esModule",{value:!0});D.uuid4=void 0;var Mt=()=>typeof window<"u"&&typeof window.crypto<"u"&&typeof window.crypto.randomUUID=="function"?window.crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(s){let e=Math.random()*16|0;return(s==="x"?e:e&3|8).toString(16)});D.uuid4=Mt});var le=f(W=>{"use strict";Object.defineProperty(W,"__esModule",{value:!0});W.ParentFrameWallet=void 0;var ae=_(),ie=P(),Tt=q(),ce=class{connector;manifest;constructor(e,t){this.connector=e,this.manifest=t}callParentFrame(e,t){let n=(0,Tt.uuid4)();return window.parent.postMessage({type:"near-wallet-injected-request",id:n,method:e,params:t},"*"),new Promise((r,o)=>{let a=i=>{i.data.type==="near-wallet-injected-response"&&i.data.id===n&&(window.removeEventListener("message",a),i.data.success?r(i.data.result):o(i.data.error))};window.addEventListener("message",a)})}async signIn(e){let t=await this.callParentFrame("near:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey});return Array.isArray(t)?t:[t]}async signInAndSignMessage(e){let t=await this.callParentFrame("near:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams});return Array.isArray(t)?t:[t]}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.callParentFrame("near:signOut",t)}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.callParentFrame("near:getAccounts",t)}async signAndSendTransaction(e){let t=(0,ae.nearActionsToConnectorActions)(e.actions);(0,ie.assertGasKeyActionsSupported)(this.manifest.features,t,this.manifest.name);let n={...e,actions:t,network:e.network??this.connector.network};return this.callParentFrame("near:signAndSendTransaction",n)}async signAndSendTransactions(e){let t=e.transactions.map(r=>({actions:(0,ae.nearActionsToConnectorActions)(r.actions),receiverId:r.receiverId}));(0,ie.assertGasKeyActionsSupported)(this.manifest.features,t.flatMap(r=>r.actions),this.manifest.name);let n={...e,transactions:t,network:e.network??this.connector.network};return this.callParentFrame("near:signAndSendTransactions",n)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.callParentFrame("near:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(n=>({...n,actions:(0,ae.nearActionsToConnectorActions)(n.actions)})),network:e.network||this.connector.network};return(0,ie.assertGasKeyActionsSupported)(this.manifest.features,t.delegateActions.flatMap(n=>n.actions),this.manifest.name),this.callParentFrame("near:signDelegateActions",t)}};W.ParentFrameWallet=ce});var de=f(F=>{"use strict";Object.defineProperty(F,"__esModule",{value:!0});F.parseUrl=void 0;var Ot=s=>{try{return new URL(s)}catch{return null}};F.parseUrl=Ot});var ze=f(K=>{"use strict";Object.defineProperty(K,"__esModule",{value:!0});K.copyText=void 0;var $t=async s=>{try{await navigator.clipboard.writeText(s);return}catch{}let e=document.createElement("textarea");e.value=s,e.setAttribute("readonly",""),e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select();try{if(!document.execCommand("copy"))throw new Error("Copy failed")}finally{e.remove()}};K.copyText=$t});var Ve=f(y=>{"use strict";Object.defineProperty(y,"__esModule",{value:!0});y.openExternalLink=y.openTelegramLink=y.isTelegramMiniApp=void 0;var ue=()=>{let s=window?.Telegram?.WebApp;return!s||!s.platform||s.platform==="unknown"?null:s},jt=()=>{try{return location.hash.includes("tgWebAppData")?!0:!!sessionStorage.getItem("__telegram__initParams")}catch{return!1}},Lt=()=>typeof window>"u"?!1:!!ue()||!!window.TelegramWebviewProxy||jt();y.isTelegramMiniApp=Lt;var Ge=(s,e)=>{let t=window.TelegramWebviewProxy;if(t?.postEvent)return t.postEvent(s,JSON.stringify(e));let n=window.external;if(n&&"notify"in n)return n.notify(JSON.stringify({eventType:s,eventData:e}));window.parent!==window&&window.parent.postMessage(JSON.stringify({eventType:s,eventData:e}),"https://web.telegram.org")},Dt=s=>{let e=ue();if(e)return e.openTelegramLink(s.toString());Ge("web_app_open_tg_link",{path_full:s.pathname+s.search})};y.openTelegramLink=Dt;var qt=s=>{let e=ue();if(e)return e.openLink(s.toString());Ge("web_app_open_link",{url:s.toString()})};y.openExternalLink=qt});var fe=f(R=>{"use strict";Object.defineProperty(R,"__esModule",{value:!0});R.EventEmitter=void 0;var he=class{events={};on(e,t){this.events[e]||(this.events[e]=[]),this.events[e].push(t)}emit(e,t){this.events[e]?.forEach(n=>n(t))}off(e,t){this.events[e]=this.events[e]?.filter(n=>n!==t)}once(e,t){let n=r=>{t(r),this.off(e,n)};this.on(e,n)}removeAllListeners(e){e?delete this.events[e]:this.events={}}};R.EventEmitter=he});var H=f(U=>{"use strict";Object.defineProperty(U,"__esModule",{value:!0});U.escapeHtml=Je;U.html=Wt;function Je(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}var pe=Symbol("htmlTag");function Wt(s,...e){let t=s[0];for(let n=0;n<e.length;n++){for(let r of Array.isArray(e[n])?e[n]:[e[n]]){let o=r?.[pe]?r[pe]:Je(String(r??""));t+=o}t+=s[n+1]}return Object.freeze({[pe]:t,get html(){return t}})}});var Ye=f(B=>{"use strict";Object.defineProperty(B,"__esModule",{value:!0});B.css=void 0;var Ft=s=>`
${s} * {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  -ms-overflow-style: none; 
  scrollbar-width: none; 
  color: #fff;
}

${s} *::-webkit-scrollbar { 
  display: none;
}

${s} p,
${s} h1,
${s} h2,
${s} h3,
${s} h4,
${s} h5,
${s} h6 {
  margin: 0;
}

${s} .modal-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 100000000;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    transition: opacity 0.2s ease-in-out;
}

@media (max-width: 600px) {
  ${s} .modal-container {
    justify-content: flex-end;
  }
}

${s} .modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;

  max-width: 420px;
  max-height: 615px;
  width: 100%;
  border-radius: 24px;
  background: #0d0d0d;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.2s ease-in-out;
}

@media (max-width: 600px) {
  ${s} .modal-content {
    max-width: 100%;
    width: 100%;
    max-height: 80%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: none;
    border-top: 1.5px solid rgba(255, 255, 255, 0.1);
  }
}


${s} .modal-header {
  display: flex;
  padding: 16px;
  gap: 16px;
  align-self: stretch;
  align-items: center;
  justify-content: center;
  position: relative;
}

${s} .modal-header button {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

${s} .modal-header button:hover {
  background: rgba(255, 255, 255, 0.04);
}
  
${s} .modal-header p {
  color: #fff;
  text-align: center;
  font-size: 24px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  margin: 0;
}


${s} .modal-body {
  display: flex;
  padding: 16px;
  flex-direction: column;
  align-items: flex-start;
  text-align: center;
  gap: 8px;
  overflow: auto;

  border-radius: 24px;
  background: rgba(255, 255, 255, 0.08);
  width: 100%;
  flex: 1;
}

${s} .modal-body textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #0d0d0d;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  outline: none;
  font-size: 16px;
  transition: background 0.2s ease-in-out;
  font-family: monospace;
  font-size: 12px;
}

${s} .modal-body button {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: #fff;
  color: #000;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s ease-in-out;
  margin-top: 16px;
}

${s} .footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 16px 24px;
  color: #fff;
  gap: 12px;
}

${s} .modal-body p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  letter-spacing: -0.8px;
}

${s} .footer img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

${s} .get-wallet-link {
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  margin-left: auto;
  text-decoration: none;
  transition: color 0.2s ease-in-out;
  cursor: pointer;
}
  
${s} .get-wallet-link:hover {
  color: rgba(255, 255, 255, 1);
}


${s} .connect-item {
  display: flex;
  padding: 8px;
  align-items: center;
  gap: 12px;
  align-self: stretch;
  cursor: pointer;

  transition: background 0.2s ease-in-out;
  border-radius: 24px;
}

${s} .connect-item img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
  flex-shrink: 0;
}

${s} .connect-item-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  flex: 1;
  margin-top: -2px;
}

${s} .connect-item-info .wallet-address {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

${s} .connect-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

${s} .connect-item img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
}

${s} .connect-item p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: 18px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  letter-spacing: -0.36px;
  margin: 0;
}
`;B.css=Ft});var ge=f(z=>{"use strict";Object.defineProperty(z,"__esModule",{value:!0});z.Popup=void 0;var Kt=Ye(),Rt=H(),Xe=`n${Math.random().toString(36).substring(2,15)}`;if(typeof document<"u"){let s=document.createElement("style");s.textContent=(0,Kt.css)(`.${Xe}`),document.head.append(s)}var me=class{delegate;isClosed=!1;root=document.createElement("div");state={};constructor(e){this.delegate=e}get dom(){return(0,Rt.html)``}disposables=[];addListener(e,t,n){let r=typeof e=="string"?this.root.querySelector(e):e;r&&(r.addEventListener(t,n),this.disposables.push(()=>r.removeEventListener(t,n)))}handlers(){this.disposables.forEach(r=>r()),this.disposables=[];let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.onclick=r=>r.stopPropagation(),e.onclick=()=>{this.delegate.onReject(),this.destroy()};let n=r=>{r.key==="Escape"&&(this.delegate.onReject(),this.destroy())};document.addEventListener("keydown",n),this.disposables.push(()=>document.removeEventListener("keydown",n))}update(e){this.state={...this.state,...e},this.root.innerHTML=this.dom.html,this.handlers()}create({show:e=!0}){this.root.className=`${Xe} hot-connector-popup`,this.root.style.display="none",this.root.innerHTML=this.dom.html,document.body.append(this.root),this.handlers();let t=this.root.querySelector(".modal-container"),n=this.root.querySelector(".modal-content");n.style.transform="translateY(50px)",t.style.opacity="0",e&&setTimeout(()=>this.show(),10)}show(){let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.style.transform="translateY(50px)",e.style.opacity="0",this.root.style.display="block",setTimeout(()=>{t.style.transform="translateY(0)",e.style.opacity="1"},100)}hide(){let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.style.transform="translateY(50px)",e.style.opacity="0",setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.isClosed||(this.isClosed=!0,this.disposables.forEach(e=>e()),this.disposables=[],this.hide(),setTimeout(()=>{this.root.remove()},200))}};z.Popup=me});var Ze=f(G=>{"use strict";Object.defineProperty(G,"__esModule",{value:!0});G.IframeWalletPopup=void 0;var we=H(),Ut=ge(),ye=class extends Ut.Popup{delegate;constructor(e){super(e),this.delegate=e}handlers(){super.handlers(),this.addListener("button","click",()=>this.delegate.onApprove())}create(){super.create({show:!1}),this.root.querySelector(".modal-body").appendChild(this.delegate.iframe),this.delegate.iframe.style.width="100%",this.delegate.iframe.style.height="720px",this.delegate.iframe.style.border="none"}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t}=this.delegate.footer;return(0,we.html)`
      <div class="footer">
        ${e?(0,we.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
      </div>
    `}get dom(){return(0,we.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-body" style="padding: 0; overflow: auto;"></div>
        ${this.footer}
      </div>
    </div>`}};G.IframeWalletPopup=ye});var Qe=f(V=>{"use strict";Object.defineProperty(V,"__esModule",{value:!0});V.NEAR_CONNECT_VERSION=void 0;V.NEAR_CONNECT_VERSION="0.12.0"});var et=f(be=>{"use strict";Object.defineProperty(be,"__esModule",{value:!0});var Ht=Qe();async function Bt(s){let e=await s.executor.getAllStorage(),t=s.executor.connector.providers,n=s.executor.manifest,r=s.id,o=s.code.replaceAll(".localStorage",".sandboxedLocalStorage").replaceAll("window.top","window.selector").replaceAll("window.open","window.selector.open"),a=s.cspNonce?` nonce="${s.cspNonce.replace(/[^A-Za-z0-9+/=]/g,"")}"`:"";return`
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <div id="root"></div>

      <style>
        :root {
          --background-color: rgb(40, 40, 40);
          --text-color: rgb(255, 255, 255);
          --border-color: rgb(209, 209, 209);
        }

        * {
          font-family: system-ui, Avenir, Helvetica, Arial, sans-serif
        }

        body, html {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          background-color: var(--background-color);
          color: var(--text-color);
        }

        #root {
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at center, #2c2c2c 0%, #1a1a1a 100%);
          text-align: center;
        }

        #root * {
          box-sizing: border-box;
          font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          color-scheme: light dark;
          color: rgb(255, 255, 255);
          font-synthesis: none;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .prompt-container img {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 12px;
        }

        .prompt-container h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          margin-top: 16px;
        }

        .prompt-container p {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: rgb(209, 209, 209);
        }

        .prompt-container button {
          background-color: #131313;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          cursor: pointer;
          transition: border-color 0.25s;
          color: #fff;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          margin-top: 16px;
        }
      </style>


      <script${a}>
      window.sandboxedLocalStorage = (() => {
        let storage = ${JSON.stringify(e)}

        return {
          setItem: function(key, value) {
            window.selector.storage.set(key, value)
            storage[key] = value || '';
          },
          getItem: function(key) {
            return key in storage ? storage[key] : null;
          },
          removeItem: function(key) {
            window.selector.storage.remove(key)
            delete storage[key];
          },
          get length() {
            return Object.keys(storage).length;
          },
          key: function(i) {
            const keys = Object.keys(storage);
            return keys[i] || null;
          },
        };
      })();

      const showPrompt = async (args) => {
        const root = document.getElementById("root");   
        root.style.display = "flex";
        root.innerHTML = \`
          <div class="prompt-container">
            <img src="${n.icon}" />
            <h1>${n.name}</h1>
            <p>\${args.title}</p>
            <button>\${args.button}</button>
          </div>
        \`;

        return new Promise((resolve) => {
          root.querySelector("button")?.addEventListener("click", () => {
            root.innerHTML = "";
            resolve(true);
          });
        });
      }

      class ProxyWindow {
        constructor(url, features) {
          this.closed = false;
          this.windowIdPromise = window.selector.call("open", { url, features });

          window.addEventListener("message", async (event) => {            
            if (event.data.origin !== "${r}") return;
            if (!event.data.method?.startsWith("proxy-window:")) return;
            const method = event.data.method.replace("proxy-window:", "");
            if (method === "closed" && event.data.windowId === await this.id()) this.closed = true;
          });
        } 

        async id() {
          return await this.windowIdPromise;
        }

        async focus() {
          await window.selector.call("panel.focus", { windowId: await this.id() });
        }

        async postMessage(data) {
          window.selector.call("panel.postMessage", { windowId: await this.id(), data });
        }

        async close() {
          await window.selector.call("panel.close", { windowId: await this.id() });
        }
      }

      window.selector = {
        wallet: null,
        location: "${window.location.href}",
        nearConnectVersion: "${Ht.NEAR_CONNECT_VERSION}",
        
        outerHeight: ${window.outerHeight},
        screenY: ${window.screenY},
        outerWidth: ${window.outerWidth},
        screenX: ${window.screenX},

        providers: {
          mainnet: ${JSON.stringify(t.mainnet)},
          testnet: ${JSON.stringify(t.testnet)},
        },

        uuid() {
          return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        },

        walletConnect: {
          connect(params) {
            return window.selector.call("walletConnect.connect", params);
          },
          disconnect(params) {
            return window.selector.call("walletConnect.disconnect", params);
          },
          request(params) {
            return window.selector.call("walletConnect.request", params);
          },
          getProjectId() {
            return window.selector.call("walletConnect.getProjectId", {});
          },
          getSession() {
            return window.selector.call("walletConnect.getSession", {});
          },
        },
      
        async ready(wallet) {
          wallet.manifest = ${JSON.stringify(n)};
          window.parent.postMessage({ method: "wallet-ready", origin: "${r}" }, "*");
          window.selector.wallet = wallet;
        },

        async call(method, params) {
          const id = window.selector.uuid();
          window.parent.postMessage({ method, params, id, origin: "${r}" }, "*");

          return new Promise((resolve, reject) => {
            const handler = (event) => {
              if (event.data.id !== id || event.data.origin !== "${r}") return;
              window.removeEventListener("message", handler);

              if (event.data.status === "failed") reject(event.data.result);
              else resolve(event.data.result);
            };

            window.addEventListener("message", handler);
          });
        },

        panelClosed(windowId) {
          window.parent.postMessage({ 
            method: "panel.closed", 
            origin: "${r}", 
            result: { windowId } 
          }, "*");
        },

        open(url, _, params) {
          return new ProxyWindow(url, params)
        },

        external(entity, key, ...args) {
          return window.selector.call("external", { entity, key, args: args || [] });
        },

        openNativeApp(url) {
          return window.selector.call("open.nativeApp", { url });
        },

        ui: {
          async whenApprove(options) {
            window.selector.ui.showIframe();
            await showPrompt(options);
            window.selector.ui.hideIframe();
          },

          async showIframe() {
            return await window.selector.call("ui.showIframe");
          },

          async hideIframe() {
            return await window.selector.call("ui.hideIframe");
          },
        },

        storage: {
          async set(key, value) {
            await window.selector.call("storage.set", { key, value });
          },
      
          async get(key) {
            return await window.selector.call("storage.get", { key });
          },
      
          async remove(key) {
            await window.selector.call("storage.remove", { key });
          },

          async keys() {
            return await window.selector.call("storage.keys", {});
          },
        },
      };

      // Clipboard API often rejects inside the sandbox (Android WebView), copy through the dApp page then.
      // Plain assignment to navigator.clipboard is a no-op (getter on the prototype), so redefine the method
      const clipboard = navigator.clipboard || {};
      const nativeWriteText = clipboard.writeText ? clipboard.writeText.bind(clipboard) : null;
      Object.defineProperty(clipboard, "writeText", {
        configurable: true,
        value: async (text) => {
          try {
            if (nativeWriteText) return await nativeWriteText(text);
          } catch {}
          await window.selector.call("clipboard.writeText", { text });
        },
      });
      if (!navigator.clipboard) Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard });

      window.addEventListener("message", async (event) => {
        if (event.data.origin !== "${r}") return;
        if (!event.data.method?.startsWith("wallet:")) return;
      
        const wallet = window.selector.wallet;
        const method = event.data.method.replace("wallet:", "");
        const payload = { id: event.data.id, origin: "${r}", method };
      
        if (wallet == null || typeof wallet[method] !== "function") {
          const data = { ...payload, status: "failed", result: "Method not found" };
          window.parent.postMessage(data, "*");
          return;
        }
        
        try {
          const result = await wallet[method](event.data.params);
          window.parent.postMessage({ ...payload, status: "success", result }, "*");
        } catch (error) {
          const data = { ...payload, status: "failed", result: error };
          window.parent.postMessage(data, "*");
        }
      });
      <\/script>

      <script type="module"${a}>${o}<\/script>
    </body>
  </html>
    `}be.default=Bt});var tt=f(N=>{"use strict";var zt=N&&N.__importDefault||function(s){return s&&s.__esModule?s:{default:s}};Object.defineProperty(N,"__esModule",{value:!0});var Gt=fe(),Vt=q(),Jt=Ze(),Yt=zt(et()),ve=class{executor;origin;disposed=!1;iframe=document.createElement("iframe");events=new Gt.EventEmitter;popup;handler;readyPromiseResolve;readyPromise=new Promise(e=>{this.readyPromiseResolve=e});constructor(e,t,n,r){this.executor=e,this.origin=(0,Vt.uuid4)(),this.handler=a=>{a.data.origin===this.origin&&(a.data.method==="wallet-ready"&&this.readyPromiseResolve(),n(this,a))},window.addEventListener("message",this.handler);let o=[];this.executor.checkPermissions("usb")&&o.push("usb *;"),this.executor.checkPermissions("hid")&&o.push("hid *;"),this.executor.checkPermissions("clipboardRead")&&o.push("clipboard-read;"),this.executor.checkPermissions("clipboardWrite")&&o.push("clipboard-write;"),this.executor.checkPermissions("bluetooth")&&o.push("bluetooth *;"),this.iframe.allow=o.join(" "),this.iframe.setAttribute("sandbox","allow-scripts"),(0,Yt.default)({id:this.origin,executor:this.executor,code:t,cspNonce:r}).then(a=>{this.executor.connector.logger?.log("Iframe code injected"),this.iframe.srcdoc=a}),this.popup=new Jt.IframeWalletPopup({footer:this.executor.connector.footerBranding,iframe:this.iframe,onApprove:()=>{},onReject:()=>{this.disposed=!0,window.removeEventListener("message",this.handler),this.events.emit("close",{}),this.popup.destroy()}}),this.popup.create()}on(e,t){this.events.on(e,t)}show(){this.popup.show()}hide(){this.popup.hide()}postMessage(e){if(this.disposed)return;let t=this.iframe.contentWindow;if(!t)throw new Error(`Iframe not loaded for ${e?.method??"unknown method"}`);t.postMessage({...e,origin:this.origin},"*")}dispose(){this.disposed=!0,window.removeEventListener("message",this.handler),this.popup.destroy()}};N.default=ve});var nt=f(M=>{"use strict";var Xt=M&&M.__importDefault||function(s){return s&&s.__esModule?s:{default:s}};Object.defineProperty(M,"__esModule",{value:!0});var b=de(),ke=q(),Zt=ze(),xe=Ve(),Qt=Xt(tt()),en=(0,ke.uuid4)(),Ae=class{connector;manifest;activePanels={};storageSpace;constructor(e,t){this.connector=e,this.manifest=t,this.storageSpace=t.id}checkPermissions(e,t){if(e==="walletConnect")return!!this.manifest.permissions.walletConnect;if(e==="external"){let n=this.manifest.permissions.external;return!n||!t?.entity?!1:n.includes(t.entity)}if(e==="allowsOpen"){let n=(0,b.parseUrl)(t?.url||""),r=this.manifest.permissions.allowsOpen;return!n||!r||!Array.isArray(r)||r.length===0?!1:r.some(a=>{let i=(0,b.parseUrl)(a);return!(!i||n.protocol!==i.protocol||i.hostname&&n.hostname!==i.hostname||i.pathname&&i.pathname!=="/"&&n.pathname!==i.pathname)})}return this.manifest.permissions[e]}assertPermissions(e,t,n){if(!this.checkPermissions(t,n.data.params))throw e.postMessage({...n.data,status:"failed",result:"Permission denied"}),new Error("Permission denied")}_onMessage=async(e,t)=>{let n=o=>{e.postMessage({...t.data,status:"success",result:o})},r=o=>{e.postMessage({...t.data,status:"failed",result:o})};if(t.data.method==="ui.showIframe"){e.show(),n(null);return}if(t.data.method==="ui.hideIframe"){e.hide(),n(null);return}if(t.data.method==="storage.set"){this.assertPermissions(e,"storage",t),localStorage.setItem(`${this.storageSpace}:${t.data.params.key}`,t.data.params.value),n(null);return}if(t.data.method==="storage.get"){this.assertPermissions(e,"storage",t);let o=localStorage.getItem(`${this.storageSpace}:${t.data.params.key}`);n(o);return}if(t.data.method==="storage.keys"){this.assertPermissions(e,"storage",t);let o=Object.keys(localStorage).filter(a=>a.startsWith(`${this.storageSpace}:`));n(o);return}if(t.data.method==="storage.remove"){this.assertPermissions(e,"storage",t),localStorage.removeItem(`${this.storageSpace}:${t.data.params.key}`),n(null);return}if(t.data.method==="panel.focus"){let o=this.activePanels[t.data.params.windowId];o&&o.focus(),n(null);return}if(t.data.method==="panel.postMessage"){let o=this.activePanels[t.data.params.windowId];o&&o.postMessage(t.data.params.data,"*"),n(null);return}if(t.data.method==="panel.close"){let o=this.activePanels[t.data.params.windowId];o&&o.close(),delete this.activePanels[t.data.params.windowId],n(null);return}if(t.data.method==="walletConnect.connect"){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");let a=await(await this.connector.walletConnect).connect(t.data.params);a.approval(),n({uri:a.uri})}catch(o){r(o)}return}if(t.data.method==="walletConnect.getProjectId"){if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");this.assertPermissions(e,"walletConnect",t);let o=await this.connector.walletConnect;n(o.core.projectId);return}if(t.data.method==="walletConnect.disconnect"){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");let a=await(await this.connector.walletConnect).disconnect(t.data.params);n(a)}catch(o){r(o)}return}if(t.data.method==="walletConnect.getSession"){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");let o=await this.connector.walletConnect,a=o.session.keys[o.session.keys.length-1],i=a?o.session.get(a):null;n(i?{topic:i.topic,namespaces:i.namespaces}:null)}catch(o){r(o)}return}if(t.data.method==="walletConnect.request"){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");let a=await(await this.connector.walletConnect).request(t.data.params);n(a)}catch(o){r(o)}return}if(t.data.method==="clipboard.writeText"){this.assertPermissions(e,"clipboardWrite",t);try{await(0,Zt.copyText)(t.data.params.text),n(null)}catch(o){r(o)}return}if(t.data.method==="external"){this.assertPermissions(e,"external",t);try{let{entity:o,key:a,args:i}=t.data.params,c=o.split(".").reduce((g,te)=>g[te],window);o==="nightly.near"&&a==="signTransaction"&&(i[0].encode=()=>i[0]);let d=typeof c[a]=="function"?await c[a](...i||[]):c[a];n(d)}catch(o){r(o)}return}if(t.data.method==="open"){this.assertPermissions(e,"allowsOpen",t);let o=(0,b.parseUrl)(t.data.params.url);if(o&&o.protocol==="https:"&&(0,xe.isTelegramMiniApp)()){o.hostname==="t.me"?(0,xe.openTelegramLink)(o):(0,xe.openExternalLink)(o),n(null);return}let a=window.open(t.data.params.url,"_blank",t.data.params.features),i=a?(0,ke.uuid4)():null,c=d=>{let g=(0,b.parseUrl)(t.data.params.url);g&&g.origin===d.origin&&e.postMessage(d.data)};if(n(i),window.addEventListener("message",c),a&&i){this.activePanels[i]=a;let d=setInterval(()=>{if(!a?.closed)return;window.removeEventListener("message",c);let g={method:"proxy-window:closed",windowId:i};delete this.activePanels[i],clearInterval(d);try{e.postMessage(g)}catch{}},500)}return}if(t.data.method==="open.nativeApp"){this.assertPermissions(e,"allowsOpen",t);let o=(0,b.parseUrl)(t.data.params.url);if(!o||["https","http","javascript:","file:","data:","blob:","about:"].includes(o.protocol))throw r("Invalid URL"),new Error("[open.nativeApp] Invalid URL");let i=document.createElement("iframe");i.src=t.data.params.url,i.style.display="none",document.body.appendChild(i),e.postMessage({...t.data,status:"success",result:null});return}};actualCode=null;async checkNewVersion(e,t){if(this.actualCode)return this.connector.logger?.log("New version of code already checked"),this.actualCode;let n=(0,b.parseUrl)(e.manifest.executor);if(n||(n=(0,b.parseUrl)(location.origin+e.manifest.executor)),!n)throw new Error("Invalid executor URL");n.searchParams.set("nonce",en);let r=await fetch(n.toString()).then(o=>{if(!o.ok)throw new Error(`Failed to load executor: ${o.status}`);return o.text()});return this.connector.logger?.log("New version of code fetched"),this.actualCode=r,r===t?(this.connector.logger?.log("New version of code is the same as the current version"),this.actualCode):(await this.connector.db.setItem(`${this.manifest.id}:${this.manifest.version}`,r).then(()=>this.connector.logger?.log("New version of code saved to cache")).catch(o=>this.connector.logger?.log("Failed to cache new version of code",o)),r)}async loadCode(){let e=await this.connector.db.getItem(`${this.manifest.id}:${this.manifest.version}`).catch(()=>null);this.connector.logger?.log("Code loaded from cache",e!==null);let t=this.checkNewVersion(this,e);return e||await t}async call(e,t){this.connector.logger?.log("Add to queue",e,t),this.connector.logger?.log("Calling method",e,t);let n=await this.loadCode();this.connector.logger?.log("Code loaded, preparing");let r=new Qt.default(this,n,this._onMessage,this.connector.cspNonce);this.connector.logger?.log("Code loaded, iframe initialized"),await r.readyPromise,this.connector.logger?.log("Iframe ready");let o=(0,ke.uuid4)();return new Promise((a,i)=>{try{let c=d=>{d.data.id!==o||d.data.origin!==r.origin||(r.dispose(),window.removeEventListener("message",c),this.connector.logger?.log("postMessage",{result:d.data,request:{method:e,params:t}}),d.data.status==="failed"?i(d.data.result):a(d.data.result))};window.addEventListener("message",c),r.postMessage({method:e,params:t,id:o}),r.on("close",()=>i(new Error("Wallet closed")))}catch(c){this.connector.logger?.log("Iframe error",c),i(c)}})}async getAllStorage(){let e=Object.keys(localStorage).filter(n=>n.startsWith(`${this.storageSpace}:`)),t={};for(let n of e)t[n.replace(`${this.storageSpace}:`,"")]=localStorage.getItem(n);return t}async clearStorage(){let e=Object.keys(localStorage).filter(t=>t.startsWith(`${this.storageSpace}:`));for(let t of e)localStorage.removeItem(t)}};M.default=Ae});var Ce=f(v=>{"use strict";var tn=v&&v.__importDefault||function(s){return s&&s.__esModule?s:{default:s}};Object.defineProperty(v,"__esModule",{value:!0});v.SandboxWallet=void 0;var Se=_(),Ee=P(),nn=tn(nt()),J=class{connector;manifest;executor;constructor(e,t){this.connector=e,this.manifest=t,this.executor=new nn.default(e,t)}async signIn(e){return this.executor.call("wallet:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey})}async signInAndSignMessage(e){return this.executor.call("wallet:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.executor.call("wallet:signOut",t),await this.executor.clearStorage()}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.executor.call("wallet:getAccounts",t)}async signAndSendTransaction(e){let t=(0,Se.nearActionsToConnectorActions)(e.actions);(0,Ee.assertGasKeyActionsSupported)(this.manifest.features,t,this.manifest.name);let n={...e,actions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransaction",n)}async signAndSendTransactions(e){let t=e.transactions.map(r=>({actions:(0,Se.nearActionsToConnectorActions)(r.actions),receiverId:r.receiverId}));(0,Ee.assertGasKeyActionsSupported)(this.manifest.features,t.flatMap(r=>r.actions),this.manifest.name);let n={...e,transactions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransactions",n)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.executor.call("wallet:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(n=>({...n,actions:(0,Se.nearActionsToConnectorActions)(n.actions)})),network:e.network??this.connector.network};return(0,Ee.assertGasKeyActionsSupported)(this.manifest.features,t.delegateActions.flatMap(n=>n.actions),this.manifest.name),this.executor.call("wallet:signDelegateActions",t)}};v.SandboxWallet=J;v.default=J});var Ne=f(Y=>{"use strict";Object.defineProperty(Y,"__esModule",{value:!0});Y.InjectedWallet=void 0;var Ie=_(),_e=P(),Pe=class{connector;wallet;constructor(e,t){this.connector=e,this.wallet=t}get manifest(){return this.wallet.manifest}async signIn({addFunctionCallKey:e,network:t}){return this.wallet.signIn({network:t??this.connector.network,addFunctionCallKey:e})}async signInAndSignMessage(e){return this.wallet.signInAndSignMessage({network:e?.network??this.connector.network,addFunctionCallKey:e.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){await this.wallet.signOut({network:e?.network??this.connector.network})}async getAccounts(e){return this.wallet.getAccounts({network:e?.network??this.connector.network})}async signAndSendTransaction(e){let t=(0,Ie.nearActionsToConnectorActions)(e.actions);(0,_e.assertGasKeyActionsSupported)(this.manifest.features,t,this.manifest.name);let n=e.network??this.connector.network,r=await this.wallet.signAndSendTransaction({...e,actions:t,network:n});if(!r)throw new Error("No result from wallet");return Array.isArray(r.transactions)?r.transactions[0]:r}async signAndSendTransactions(e){let t=e.network??this.connector.network,n=e.transactions.map(o=>({actions:(0,Ie.nearActionsToConnectorActions)(o.actions),receiverId:o.receiverId}));(0,_e.assertGasKeyActionsSupported)(this.manifest.features,n.flatMap(o=>o.actions),this.manifest.name);let r=await this.wallet.signAndSendTransactions({...e,transactions:n,network:t});if(!r)throw new Error("No result from wallet");return Array.isArray(r.transactions)?r.transactions:r}async signMessage(e){return this.wallet.signMessage({...e,network:e.network??this.connector.network})}async signDelegateActions(e){let t=e.delegateActions.map(n=>({...n,actions:(0,Ie.nearActionsToConnectorActions)(n.actions)}));return(0,_e.assertGasKeyActionsSupported)(this.manifest.features,t.flatMap(n=>n.actions),this.manifest.name),this.wallet.signDelegateActions({...e,delegateActions:t,network:e.network??this.connector.network})}};Y.InjectedWallet=Pe});var st=f(X=>{"use strict";Object.defineProperty(X,"__esModule",{value:!0});X.NearWalletsPopup=void 0;var A=H(),sn=de(),rn=ge(),on={id:"custom-wallet",name:"Custom Wallet",icon:"https://www.mynearwallet.com/images/webclip.png",description:"Custom wallet for NEAR.",website:"",version:"1.0.0",executor:"your-executor-url.js",type:"sandbox",platform:{},features:{signMessage:!0,signInWithoutAddKey:!0,signInAndSignMessage:!0,signAndSendTransaction:!0,signAndSendTransactions:!0,signDelegateActions:!0},permissions:{storage:!0,allowsOpen:[]}},Me=class extends rn.Popup{delegate;constructor(e){super(e),this.delegate=e,this.update({wallets:e.wallets,showSettings:!1})}handlers(){super.handlers(),this.addListener(".settings-button","click",()=>this.update({showSettings:!0})),this.addListener(".back-button","click",()=>this.update({showSettings:!1})),this.root.querySelectorAll(".connect-item").forEach(e=>{e instanceof HTMLDivElement&&this.addListener(e,"click",()=>this.delegate.onSelect(e.dataset.type))}),this.root.querySelectorAll(".remove-wallet-button").forEach(e=>{e instanceof SVGSVGElement&&this.addListener(e,"click",async t=>{t.stopPropagation(),await this.delegate.onRemoveDebugManifest(e.dataset.type);let n=this.state.wallets.filter(r=>r.id!==e.dataset.type);this.update({wallets:n})})}),this.addListener(".add-debug-manifest-button","click",async()=>{try{let e=this.root.querySelector("#debug-manifest-input")?.value??"",t=await this.delegate.onAddDebugManifest(e);this.update({showSettings:!1,wallets:[t,...this.state.wallets]})}catch(e){alert(`Something went wrong: ${e}`)}})}create(){super.create({show:!0})}walletDom(e){let t=(0,A.html)`
      <svg
        class="remove-wallet-button"
        data-type="${e.id}"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style="margin-right: 4px;"
      >
        <path d="M18 6L6 18" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M6 6L18 18" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;return(0,A.html)`
      <div class="connect-item" data-type="${e.id}">
        <img style="background: #333" src="${e.icon}" alt="${e.name}" />
        <div class="connect-item-info">
          <span>${e.name}</span>
          <span class="wallet-address">${(0,sn.parseUrl)(e.website)?.hostname}</span>
        </div>
        ${e.debug?t:""}
      </div>
    `}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t,link:n,linkText:r}=this.delegate.footer;return(0,A.html)`
      <div class="footer">
        ${e?(0,A.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
        <a class="get-wallet-link" href="${n}" target="_blank">${r}</a>
      </div>
    `}get dom(){return this.state.showSettings?(0,A.html)`
        <div class="modal-container">
          <div class="modal-content">
            <div class="modal-header">
              <button class="back-button" style="left: 16px; right: unset;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="rgba(255,255,255,0.5)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <p>Settings</p>
            </div>

            <div class="modal-body">
              <p style="text-align: left;">
                You can add your wallet to dapp for debug,
                <a href="https://github.com/azbang/hot-connector" target="_blank">read the documentation.</a> Paste your manifest and click "Add".
              </p>

              <textarea style="width: 100%;" id="debug-manifest-input" rows="10">${JSON.stringify(on,null,2)}</textarea>
              <button class="add-debug-manifest-button">Add</button>
            </div>

            ${this.footer}
          </div>
        </div>
      `:(0,A.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-header">
          <p>Select wallet</p>
          <button class="settings-button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
              <circle cx="19" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
              <circle cx="5" cy="12" r="2" fill="rgba(255,255,255,0.5)" />
            </svg>
          </button>
        </div>

        <div class="modal-body">${this.state.wallets.map(e=>this.walletDom(e))}</div>

        ${this.footer}
      </div>
    </div>`}};X.NearWalletsPopup=Me});var rt=f(Oe=>{"use strict";Object.defineProperty(Oe,"__esModule",{value:!0});var Te=class{dbName;storeName;version;constructor(e,t){this.dbName=e,this.storeName=t,this.version=1}getDb(){return new Promise((e,t)=>{if(typeof window>"u"||typeof indexedDB>"u"){t(new Error("IndexedDB is not available (SSR environment)"));return}let n=indexedDB.open(this.dbName,this.version);n.onerror=r=>{console.error("Error opening database:",r.target.error),t(new Error("Error opening database"))},n.onsuccess=r=>{e(n.result)},n.onupgradeneeded=r=>{let o=n.result;o.objectStoreNames.contains(this.storeName)||o.createObjectStore(this.storeName)}})}async getItem(e){let t=await this.getDb();if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Key must be a string");return new Promise((n,r)=>{if(!this.storeName){r(new Error("Store name not set"));return}let o=t.transaction(this.storeName,"readonly");o.onerror=c=>r(o.error);let i=o.objectStore(this.storeName).get(e);i.onerror=c=>r(i.error),i.onsuccess=()=>{n(i.result),t.close()}})}async setItem(e,t){let n=await this.getDb();if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Key must be a string");return new Promise((r,o)=>{if(!this.storeName){o(new Error("Store name not set"));return}let a=n.transaction(this.storeName,"readwrite");a.onerror=d=>o(a.error);let c=a.objectStore(this.storeName).put(t,e);c.onerror=d=>o(c.error),c.onsuccess=()=>{n.close(),r()}})}async removeItem(e){let t=await this.getDb();if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Key must be a string");return new Promise((n,r)=>{if(!this.storeName){r(new Error("Store name not set"));return}let o=t.transaction(this.storeName,"readwrite");o.onerror=c=>r(o.error);let i=o.objectStore(this.storeName).delete(e);i.onerror=c=>r(i.error),i.onsuccess=()=>{t.close(),n()}})}async keys(){let e=await this.getDb();return new Promise((t,n)=>{if(!this.storeName){n(new Error("Store name not set"));return}let r=e.transaction(this.storeName,"readonly");r.onerror=i=>n(r.error);let a=r.objectStore(this.storeName).getAllKeys();a.onerror=i=>n(a.error),a.onsuccess=()=>{t(a.result),e.close()}})}async count(){let e=await this.getDb();return new Promise((t,n)=>{if(!this.storeName){n(new Error("Store name not set"));return}let r=e.transaction(this.storeName,"readonly");r.onerror=i=>n(r.error);let a=r.objectStore(this.storeName).count();a.onerror=i=>n(a.error),a.onsuccess=()=>{t(a.result),e.close()}})}async length(){return this.count()}async clear(){let e=await this.getDb();return new Promise((t,n)=>{if(!this.storeName){n(new Error("Store name not set"));return}let r=e.transaction(this.storeName,"readwrite");r.onerror=i=>n(r.error);let a=r.objectStore(this.storeName).clear();a.onerror=i=>n(a.error),a.onsuccess=()=>{e.close(),t()}})}};Oe.default=Te});var at=f(S=>{"use strict";var an=S&&S.__importDefault||function(s){return s&&s.__esModule?s:{default:s}};Object.defineProperty(S,"__esModule",{value:!0});S.NearConnector=void 0;var cn=fe(),ln=st(),dn=re(),un=an(rt()),hn=le(),fn=Ne(),ot=Ce(),pn=["https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json","https://cdn.jsdelivr.net/gh/azbang/hot-connector/repository/manifest.json"];function mn(s){return e=>Object.entries(s).length===0?!0:Object.entries(s).filter(([t,n])=>n===!0).every(([t])=>e.manifest.features?.[t]===!0)}var $e=class{storage;events;db;logger;wallets=[];manifest={wallets:[],version:"1.0.0"};features={};network="mainnet";providers={mainnet:[],testnet:[]};walletConnect;footerBranding;excludedWallets=[];autoConnect;cspNonce;whenManifestLoaded;constructor(e){this.db=new un.default("hot-connector","wallets"),this.storage=e?.storage??new dn.LocalStorage,this.events=e?.events??new cn.EventEmitter,this.logger=e?.logger,this.cspNonce=e?.cspNonce,this.network=e?.network??"mainnet",this.walletConnect=e?.walletConnect,this.autoConnect=e?.autoConnect??!0,this.providers=e?.providers??{mainnet:[],testnet:[]},this.excludedWallets=e?.excludedWallets??[],this.features=e?.features??{},e?.footerBranding!==void 0?this.footerBranding=e?.footerBranding:this.footerBranding={icon:"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%20512%20512%22%20class%3D%22size-7%22%3E%3Crect%20width%3D%22512%22%20height%3D%22512%22%20fill%3D%22%2300ec97%22%20rx%3D%22110%22%2F%3E%3Cpath%20fill%3D%22%23000%22%20d%3D%22M373.89%20106.199a31.95%2031.95%200%200%200-27.213%2015.207l-62.631%2092.979a6.67%206.67%200%200%200-.989%205.001%206.66%206.66%200%200%200%202.837%204.235%206.67%206.67%200%200%200%208.032-.494l61.643-53.47c1.02-.924%202.599-.827%203.523.193.419.473.644%201.074.644%201.697v167.402a2.49%202.49%200%200%201-2.502%202.491%202.48%202.48%200%200%201-1.912-.891L168.976%20117.497a31.93%2031.93%200%200%200-24.356-11.298h-6.508c-17.623%200-31.917%2014.294-31.917%2031.917v235.767c0%2017.623%2014.294%2031.917%2031.917%2031.917a31.94%2031.94%200%200%200%2027.213-15.206l62.631-92.98a6.66%206.66%200%200%200-1.847-9.236%206.67%206.67%200%200%200-8.033.494l-61.643%2053.471c-1.02.923-2.599.826-3.522-.194a2.5%202.5%200%200%201-.634-1.697V173.008a2.49%202.49%200%200%201%202.502-2.492c.731%200%201.439.322%201.912.891l186.313%20223.096a31.95%2031.95%200%200%200%2024.357%2011.297h6.508c17.623%200%2031.927-14.272%2031.938-31.895V138.116c0-17.623-14.294-31.917-31.917-31.917%22%2F%3E%3C%2Fsvg%3E",heading:"NEAR Connector",link:"https://wallet.near.org",linkText:"Don't have a wallet?"},this.whenManifestLoaded=new Promise(async t=>{e?.manifest==null||typeof e.manifest=="string"?this.manifest=await this._loadManifest(e?.manifest).catch(()=>({wallets:[],version:"1.0.0"})):this.manifest=e?.manifest??{wallets:[],version:"1.0.0"};let n=new Set(this.excludedWallets);n.delete("hot-wallet"),this.manifest.wallets=this.manifest.wallets.filter(r=>!(r.permissions.walletConnect&&!this.walletConnect||n.has(r.id))),await new Promise(r=>setTimeout(r,100)),t()}),typeof window<"u"&&(window.addEventListener("near-wallet-injected",this._handleNearWalletInjected),window.dispatchEvent(new Event("near-selector-ready")),window.addEventListener("message",async t=>{t.data.type==="near-wallet-injected"&&(await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.filter(n=>n.manifest.id!==t.data.manifest.id),this.wallets.unshift(new hn.ParentFrameWallet(this,t.data.manifest)),this.events.emit("selector:walletsChanged",{}),this.autoConnect&&this.connect({walletId:t.data.manifest.id}))})),this.whenManifestLoaded.then(()=>{typeof window<"u"&&window.parent.postMessage({type:"near-selector-ready"},"*"),this.manifest.wallets.forEach(t=>this.registerWallet(t)),this.storage.get("debug-wallets").then(t=>{JSON.parse(t??"[]").forEach(r=>this.registerDebugWallet(r))})})}get availableWallets(){return this.wallets.filter(t=>Object.entries(this.features).every(([n,r])=>!(r&&!t.manifest.features?.[n]))).filter(t=>!(this.network==="testnet"&&!t.manifest.features?.testnet))}_handleNearWalletInjected=e=>{this.wallets=this.wallets.filter(t=>t.manifest.id!==e.detail.manifest.id),this.wallets.unshift(new fn.InjectedWallet(this,e.detail)),this.events.emit("selector:walletsChanged",{})};async _loadManifest(e){let t=e?[e]:pn;for(let n of t){let r=await fetch(n).catch(()=>null);if(!(!r||!r.ok))return await r.json()}throw new Error("Failed to load manifest")}async switchNetwork(e,t){this.network!==e&&(await this.disconnect().catch(()=>{}),this.network=e,await this.connect(t))}async registerWallet(e){if(e.type!=="sandbox")throw new Error("Only sandbox wallets are supported");this.wallets.find(t=>t.manifest.id===e.id)||(this.wallets.push(new ot.SandboxWallet(this,e)),this.events.emit("selector:walletsChanged",{}))}async registerDebugWallet(e){let t=typeof e=="string"?JSON.parse(e):e;if(t.type!=="sandbox")throw new Error("Only sandbox wallets type are supported");if(!t.id)throw new Error("Manifest must have an id");if(!t.name)throw new Error("Manifest must have a name");if(!t.icon)throw new Error("Manifest must have an icon");if(!t.website)throw new Error("Manifest must have a website");if(!t.version)throw new Error("Manifest must have a version");if(!t.executor)throw new Error("Manifest must have an executor");if(!t.features)throw new Error("Manifest must have features");if(!t.permissions)throw new Error("Manifest must have permissions");if(this.wallets.find(r=>r.manifest.id===t.id))throw new Error("Wallet already registered");t.debug=!0,this.wallets.unshift(new ot.SandboxWallet(this,t)),this.events.emit("selector:walletsChanged",{});let n=this.wallets.filter(r=>r.manifest.debug).map(r=>r.manifest);return this.storage.set("debug-wallets",JSON.stringify(n)),t}async removeDebugWallet(e){this.wallets=this.wallets.filter(n=>n.manifest.id!==e);let t=this.wallets.filter(n=>n.manifest.debug).map(n=>n.manifest);this.storage.set("debug-wallets",JSON.stringify(t)),this.events.emit("selector:walletsChanged",{})}async selectWallet({features:e={}}={}){return await this.whenManifestLoaded.catch(()=>{}),new Promise((t,n)=>{let r=new ln.NearWalletsPopup({footer:this.footerBranding,wallets:this.availableWallets.filter(mn(e)).map(o=>o.manifest),onRemoveDebugManifest:async o=>this.removeDebugWallet(o),onAddDebugManifest:async o=>this.registerDebugWallet(o),onReject:()=>(n(new Error("User rejected")),r.destroy()),onSelect:o=>(t(o),r.destroy())});r.create()})}async connect(e={}){let t=e.walletId,n=e.signMessageParams;await this.whenManifestLoaded.catch(()=>{}),t||(t=await this.selectWallet({features:{signInAndSignMessage:e.signMessageParams!=null?!0:void 0,signInWithFunctionCallKey:e.addFunctionCallKey!=null?!0:void 0}}));try{let r=await this.wallet(t);this.logger?.log("Wallet available to connect",r),await this.storage.set("selected-wallet",t),this.logger?.log(`Set preferred wallet, try to signIn${n!=null?" (with signed message)":""}`,t);let o;if(e.addFunctionCallKey!=null&&(this.logger?.log("Adding function call access key during sign in with params",e.addFunctionCallKey),o={...e.addFunctionCallKey,gasAllowance:e.addFunctionCallKey.gasAllowance??{amount:"250000000000000000000000",kind:"limited"}}),n!=null){let a=await r.signInAndSignMessage({addFunctionCallKey:o,messageParams:n,network:this.network});if(!a?.length)throw new Error("Failed to sign in");this.logger?.log("Signed in to wallet (with signed message)",t,a),this.events.emit("wallet:signInAndSignMessage",{wallet:r,accounts:a,success:!0}),this.events.emit("wallet:signIn",{wallet:r,accounts:a.map(i=>({accountId:i.accountId,publicKey:i.publicKey})),success:!0,source:"signInAndSignMessage"})}else{let a=await r.signIn({addFunctionCallKey:o,network:this.network});if(!a?.length)throw new Error("Failed to sign in");this.logger?.log("Signed in to wallet",t,a),this.events.emit("wallet:signIn",{wallet:r,accounts:a,success:!0,source:"signIn"})}return r}catch(r){throw this.logger?.log("Failed to connect to wallet",r),r}}async disconnect(e){e||(e=await this.wallet()),await e.signOut({network:this.network}),await this.storage.remove("selected-wallet"),this.events.emit("wallet:signOut",{success:!0})}async getConnectedWallet(){await this.whenManifestLoaded.catch(()=>{});let e=await this.storage.get("selected-wallet"),t=this.wallets.find(r=>r.manifest.id===e);if(!t)throw new Error("No wallet selected");let n=await t.getAccounts();if(!n?.length)throw new Error("No accounts found");return{wallet:t,accounts:n}}async wallet(e){if(await this.whenManifestLoaded.catch(()=>{}),!e)return this.getConnectedWallet().then(({wallet:n})=>n).catch(async()=>{throw await this.storage.remove("selected-wallet"),new Error("No accounts found")});let t=this.wallets.find(n=>n.manifest.id===e);if(!t)throw new Error("Wallet not found");return t}async use(e){await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.map(t=>new Proxy(t,{get(n,r,o){let a=Reflect.get(n,r,o);if(r in e&&typeof a=="function"){let i=e[r];return function(...c){let d=()=>a.apply(n,c);return c.length>0?i.call(this,...c,d):i.call(this,void 0,d)}}return a}}))}on(e,t){this.events.on(e,t)}once(e,t){this.events.once(e,t)}off(e,t){this.events.off(e,t)}removeAllListeners(e){this.events.removeAllListeners(e)}};S.NearConnector=$e});var ct=f(p=>{"use strict";Object.defineProperty(p,"__esModule",{value:!0});p.assertGasKeyActionsSupported=p.isGasKeyAction=p.nearActionsToConnectorActions=p.NearConnector=p.InjectedWallet=p.SandboxWallet=p.ParentFrameWallet=p.LocalStorage=void 0;var gn=re();Object.defineProperty(p,"LocalStorage",{enumerable:!0,get:function(){return gn.LocalStorage}});var wn=le();Object.defineProperty(p,"ParentFrameWallet",{enumerable:!0,get:function(){return wn.ParentFrameWallet}});var yn=Ce();Object.defineProperty(p,"SandboxWallet",{enumerable:!0,get:function(){return yn.SandboxWallet}});var bn=Ne();Object.defineProperty(p,"InjectedWallet",{enumerable:!0,get:function(){return bn.InjectedWallet}});var vn=at();Object.defineProperty(p,"NearConnector",{enumerable:!0,get:function(){return vn.NearConnector}});var xn=_();Object.defineProperty(p,"nearActionsToConnectorActions",{enumerable:!0,get:function(){return xn.nearActionsToConnectorActions}});var it=P();Object.defineProperty(p,"isGasKeyAction",{enumerable:!0,get:function(){return it.isGasKeyAction}});Object.defineProperty(p,"assertGasKeyActionsSupported",{enumerable:!0,get:function(){return it.assertGasKeyActionsSupported}})});var ut=kt(ct(),1);var je=Object.freeze({USDC:{symbol:"USDC",decimals:6,contract:"17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"},USDT:{symbol:"USDT",decimals:6,contract:"usdt.tether-token.near"},wNEAR:{symbol:"wNEAR",decimals:24,contract:"wrap.near"}}),ts=Object.freeze({matched:{label:"\u5230\u8D26\u4E00\u81F4",tone:"green"},underpaid:{label:"\u5230\u8D26\u4E0D\u8DB3",tone:"red"},overpaid:{label:"\u8D85\u989D\u5230\u8D26",tone:"amber"},merchant_gap:{label:"\u5546\u5BB6\u72B6\u6001\u672A\u540C\u6B65",tone:"amber"},provider_conflict:{label:"\u6E20\u9053\u4E0E\u6536\u636E\u51B2\u7A81",tone:"red"},refund_unverified:{label:"\u9000\u6B3E\u5F85\u6838\u9A8C",tone:"amber"},duplicate:{label:"\u6536\u636E\u91CD\u590D\u5173\u8054",tone:"red"},overdue:{label:"\u5904\u7406\u8D85\u65F6",tone:"amber"},pending:{label:"\u7B49\u5F85\u5904\u7406",tone:"blue"},unverified:{label:"\u8BC1\u636E\u5F85\u8865\u9F50",tone:"slate"},stale:{label:"\u67E5\u8BE2\u5DF2\u8FC7\u671F",tone:"amber"},failed:{label:"\u6E20\u9053\u62A5\u544A\u5931\u8D25",tone:"red"}}),kn=(1n<<128n)-1n,Le=s=>typeof s=="string"&&s.length>=2&&s.length<=64&&/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(s);function De(s){if(typeof s!="string"||s.length<32||s.length>44||!/^[1-9A-HJ-NP-Za-km-z]+$/.test(s))return!1;let e=0n,t="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";for(let r of s)e=e*58n+BigInt(t.indexOf(r));return s.match(/^1*/)[0].length+(e===0n?0:Math.ceil(e.toString(16).length/2))===32}function qe(s,e){if(typeof s!="string"||!/^\d{1,39}(?:\.\d+)?$/.test(s))throw Error("\u91D1\u989D\u8BF7\u586B\u5199\u5341\u8FDB\u5236\u5B57\u7B26\u4E32\uFF0C\u4E0D\u652F\u6301\u79D1\u5B66\u8BA1\u6570\u6CD5\u6216\u8D1F\u6570");let[t,n=""]=s.split(".");if(n.length>e)throw Error(`\u91D1\u989D\u6700\u591A\u652F\u6301${e}\u4F4D\u5C0F\u6570`);let r=BigInt(t)*10n**BigInt(e)+BigInt((n||"").padEnd(e,"0")||"0");if(r>kn)throw Error("\u91D1\u989D\u8D85\u8FC7NEP-141\u8303\u56F4");return r.toString()}function lt(s){let e=s.slice(-10);for(;e.length>1&&new TextEncoder().encode(JSON.stringify({messages:e})).length>7500;)e.shift();return e}var An=s=>String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),We=s=>An(s).replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>").replace(/`([^`\n]+)`/g,"<code>$1</code>");function dt(s){let e=s.split(`
`),t=[];for(let n=0;n<e.length;n++)if(e[n].trim().startsWith("|")&&/^\s*\|?[\s:|-]+\|\s*$/.test(e[n+1]||"")&&/---/.test(e[n+1]||"")){let r=i=>i.trim().replace(/^\||\|$/g,"").split("|").map(c=>c.trim()),o=r(e[n]);n+=2;let a='<div class="chat-table-wrap"><table><thead><tr>'+o.map(i=>"<th>"+We(i)+"</th>").join("")+"</tr></thead><tbody>";for(;n<e.length&&e[n].trim().startsWith("|");)a+="<tr>"+r(e[n]).map(i=>"<td>"+We(i)+"</td>").join("")+"</tr>",n++;t.push(a+"</tbody></table></div>"),n--}else t.push(We(e[n])+`
`);return t.join("")}var l=s=>document.querySelector(s),Sn=new URL("../../",import.meta.url),C=async(s,e)=>{let t=await fetch(new URL("api/"+s,Sn),{method:e?"POST":"GET",headers:e?{"content-type":"application/json"}:{},body:e?JSON.stringify(e):void 0}),n=await t.json();if(!t.ok||!n.ok)throw Error(n.error?.message||"\u672C\u6B21\u64CD\u4F5C\u672A\u5B8C\u6210");return n.data},w,m="",x=[],T=[],Q=!1,Ke,ht=0,u=(s,e,t)=>{let n=document.createElement(s);return e!==void 0&&(n.textContent=e),t&&(n.className=t),n},h=s=>l("#message").textContent=s,O=(s,e)=>s.elements.namedItem(e);function Re(s){m=Le(s)?s:"",l("#connected-account").textContent=m||"\u5C1A\u672A\u8FDE\u63A5\u94B1\u5305",l("#connect").textContent=m?"\u5207\u6362\uFF0F\u91CD\u65B0\u8FDE\u63A5 \u2197":"\u8FDE\u63A5 Meteor \u94B1\u5305 \u2197",l("#disconnect").hidden=!m,m&&(O(l("#transfer-form"),"accountId").value=m,O(l("#balance-form"),"accountId").value=m),ft()}async function En(){try{if(l("#connect").disabled=!0,h("\u6B63\u5728\u6253\u5F00 Meteor \u5B98\u65B9\u94B1\u5305\uFF0C\u8BF7\u5728\u94B1\u5305\u4E2D\u9009\u62E9\u8D26\u6237\u3002"),!w){let s=await(await fetch("./vendor/manifest.json")).json();for(let e of s.wallets)e.executor=new URL(e.executor,location.href).href,e.icon=new URL(e.icon,location.href).href;w=new ut.NearConnector({network:"mainnet",manifest:s,autoConnect:!1,features:{signInWithoutAddKey:!0,signAndSendTransaction:!0},providers:{mainnet:["https://free.rpc.fastnear.com","https://rpc.mainnet.near.org"]},cspNonce:l("#wallet-bundle").nonce}),w.on("wallet:signIn",e=>{Re(e.accounts?.[0]?.accountId),h("\u94B1\u5305\u5DF2\u8FDE\u63A5\uFF0C\u4E0B\u4E00\u6B65\u53EF\u67E5\u4F59\u989D\u6216\u51C6\u5907\u8F6C\u8D26\u3002")}),w.on("wallet:signOut",()=>Re(""))}await w.connect({walletId:"meteor-wallet"})}catch{h("\u8FDE\u63A5\u5DF2\u53D6\u6D88\u6216\u672A\u5B8C\u6210\u3002\u53EF\u518D\u6B21\u8FDE\u63A5\uFF1B\u5982\u679C\u6CA1\u6709\u51FA\u73B0\u94B1\u5305\u754C\u9762\uFF0C\u8BF7\u68C0\u67E5\u6D4F\u89C8\u5668\u5F39\u7A97\u8BBE\u7F6E\u3002\u516C\u5F00\u8D26\u6237\u67E5\u8BE2\u4E0E\u9884\u68C0\u4ECD\u53EF\u4F7F\u7528\u3002")}finally{l("#connect").disabled=!1}}l("#connect").addEventListener("click",En);l("#disconnect").addEventListener("click",async()=>{try{await w.disconnect(await w.wallet("meteor-wallet")),Re(""),h("\u5DF2\u65AD\u5F00\u5F53\u524D\u94B1\u5305\u3002\u5DF2\u4FDD\u5B58\u4EFB\u52A1\u4ECD\u5728\u672C\u6D4F\u89C8\u5668\u4F1A\u8BDD\u4E2D\u3002")}catch{h("\u65AD\u5F00\u672A\u5B8C\u6210\uFF0C\u8BF7\u5728\u94B1\u5305\u4E2D\u68C0\u67E5\u8FDE\u63A5\u72B6\u6001\u3002")}});var Cn={ready:"\u5F85\u4F60\u786E\u8BA4",blocked:"\u9884\u68C0\u5DF2\u62E6\u622A",incomplete:"\u6761\u4EF6\u5F85\u8865\u67E5",wallet_open:"\u94B1\u5305\u5DF2\u6253\u5F00 \xB7 \u7B49\u5F85\u7ED3\u679C",needs_hash:"\u7ED3\u679C\u5F85\u786E\u8BA4 \xB7 \u9700\u8981\u4EA4\u6613\u54C8\u5E0C",submitted:"\u5DF2\u53D6\u5F97\u54C8\u5E0C \xB7 \u5F85 FINAL",unknown:"\u6838\u9A8C\u6682\u672A\u5B8C\u6210",completed:"\u94FE\u4E0A\u6838\u9A8C\u901A\u8FC7",failed:"\u94FE\u4E0A\u6267\u884C\u5931\u8D25",cancelled:"\u51C6\u5907\u4EFB\u52A1\u5DF2\u53D6\u6D88"};async function I(){try{let s=await C("wallet/status");x=s.tasks||[],ft(),s.enabled||h("\u94B1\u5305\u4EFB\u52A1\u670D\u52A1\u5C1A\u672A\u542F\u7528\uFF1B\u4F59\u989D\u67E5\u8BE2\u4ECD\u53EF\u4F7F\u7528\u3002")}catch(s){h(s.message)}}function In(s,e){let t=u("details"),n=u("summary",s);return t.append(n,u("pre",JSON.stringify(e,null,2))),t}function Fe(s,e,t=""){let n=u("button",s,t);return n.type="button",n.addEventListener("click",e),n}async function E(s,e,t={}){let n=await C("wallet/"+e,{id:s.id,revision:s.revision,...t});return await I(),n}function ft(){let s=l("#tasks");if(s.replaceChildren(),l("#task-count").textContent=x.length,!x.length){s.append(u("div","\u51C6\u5907\u4E00\u7B14\u8F6C\u8D26\uFF0C\u8FD9\u91CC\u4F1A\u51FA\u73B0\u5B83\u7684\u6267\u884C\u6B65\u9AA4\u3002","empty"));return}for(let e of x){let t=u("article",void 0,"task"),n=u("span",Cn[e.state]||e.state,"state"+(["blocked","incomplete","unknown","needs_hash","failed"].includes(e.state)?" bad":""));t.append(n,u("h3",e.input.amount+" "+e.input.asset));let r=u("dl");for(let[c,d]of[["\u4ED8\u6B3E\u65B9",e.input.accountId],["\u6536\u6B3E\u65B9",e.input.recipient],["\u91D1\u989D\u4E0A\u9650",e.input.maxAmount?e.input.maxAmount+" "+e.input.asset:"\u672A\u6307\u5B9A"],["\u521B\u5EFA\u65F6\u95F4",new Date(e.createdAt).toLocaleString("zh-CN",{hour12:!1})],["\u4EFB\u52A1\u7F16\u53F7",e.id.slice(0,8)]])r.append(u("dt",c),u("dd",d));t.append(r);let o=u("div",void 0,"step-list"),a=["ready","blocked","incomplete","cancelled"].includes(e.state)?1:["wallet_open","needs_hash"].includes(e.state)?2:e.state==="completed"?4:3;for(let c=0;c<4;c++)o.append(u("span",void 0,c<a?"done":""));t.append(o);for(let c of e.preflight.checks)t.append(u("p",c.detail,"check "+c.status));if(e.state==="ready"){let c=u("label",void 0,"review"),d=document.createElement("input");d.type="checkbox",c.append(d,u("span","\u6211\u5DF2\u6838\u5BF9\u4E3B\u7F51\u3001\u4ED8\u6B3E\u8D26\u6237\u3001\u6536\u6B3E\u8D26\u6237\u3001\u8D44\u4EA7\u4E0E\u91D1\u989D\uFF1B\u4E0B\u4E00\u6B65\u5C06\u6253\u5F00\u94B1\u5305\uFF0C\u53EF\u80FD\u4EA7\u751F\u771F\u5B9E\u8D44\u91D1\u8F6C\u79FB\u3002"));let g=Fe("\u6253\u5F00\u94B1\u5305\u786E\u8BA4\u8F6C\u8D26 \u2197",()=>Pn(e),"primary");g.disabled=!0,d.addEventListener("change",()=>g.disabled=!d.checked||!m||m!==e.input.accountId||Q),t.append(c,g),(!m||m!==e.input.accountId)&&t.append(u("p","\u6267\u884C\u524D\u8BF7\u8FDE\u63A5\u4E0E\u4ED8\u6B3E\u65B9\u4E00\u81F4\u7684 Meteor \u4E3B\u7F51\u8D26\u6237\u3002","task-note"))}if(["wallet_open","needs_hash"].includes(e.state)){t.append(u("p","\u82E5\u4F60\u5DF2\u5728\u94B1\u5305\u63D0\u4EA4\uFF0C\u8BF7\u7C98\u8D34\u8BE5\u7B14\u4EA4\u6613\u54C8\u5E0C\u3002\u53D6\u6D88\u6216\u5173\u95ED\u5F39\u7A97\u4E5F\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\uFF1B\u5148\u5728\u94B1\u5305\u6838\u5BF9\u662F\u5426\u5DF2\u6709\u4EA4\u6613\u3002","task-note"));let c=u("form",void 0,"hash-form"),d=u("input");d.placeholder="\u7C98\u8D34\u94B1\u5305\u4E2D\u7684 NEAR \u4EA4\u6613\u54C8\u5E0C",d.required=!0,d.maxLength=44,d.setAttribute("aria-label","\u4EA4\u6613\u54C8\u5E0C");let g=u("button","\u5173\u8054\u54C8\u5E0C\u5E76\u6838\u9A8C");c.append(d,g),c.addEventListener("submit",async te=>{te.preventDefault();try{if(!De(d.value.trim()))throw Error("\u4EA4\u6613\u54C8\u5E0C\u683C\u5F0F\u65E0\u6548");g.disabled=!0;let ne=await E(e,"result",{attemptId:e.attemptId,txHash:d.value.trim()});await ee(ne),$()}catch(ne){h(ne.message),g.disabled=!1}}),t.append(c)}if(e.txHash){t.append(u("p","\u4EA4\u6613\uFF1A"+e.txHash,"task-note"));let c=u("a","\u5728 NEAR Explorer \u67E5\u770B \u2197");c.href="https://nearblocks.io/txns/"+encodeURIComponent(e.txHash),c.target="_blank",c.rel="noopener noreferrer",t.append(c)}e.report&&t.append(u("p",e.report.message||e.report.error?.message||"\u7B49\u5F85\u6838\u9A8C","task-note"));let i=u("div",void 0,"actions");["submitted","unknown"].includes(e.state)&&i.append(Fe("\u91CD\u65B0\u6838\u9A8C\u94FE\u4E0A\u7ED3\u679C \u21BB",async()=>{await ee(e),$()})),["ready","blocked","incomplete"].includes(e.state)&&i.append(Fe("\u53D6\u6D88\u51C6\u5907\u4EFB\u52A1",async()=>{try{await E(e,"cancel"),h("\u5DF2\u53D6\u6D88\u6B64\u51C6\u5907\u4EFB\u52A1\u3002")}catch(c){h(c.message)}})),t.append(i,In("\u67E5\u770B\u9884\u68C0\u4E0E\u6267\u884C\u8BC1\u636E",{...e,scope:"\u4EFB\u52A1\u4F1A\u8BDD\u4E0D\u9A8C\u8BC1\u94B1\u5305\u6240\u6709\u6743\uFF1B\u6240\u6709\u8F6C\u8D26\u4EC5\u80FD\u7531\u94B1\u5305\u786E\u8BA4\u3002"})),s.append(t)}}function _n(s){let e=s.preflight.walletRequest,t=s.input,n=t.asset==="NEAR"?24:je[t.asset]?.decimals,r=qe(t.amount,n);if(!e||e.signerId!==m||e.signerId!==t.accountId||e.actions?.length!==1||Date.parse(s.preflight.expiresAt)<=Date.now())throw Error("\u94B1\u5305\u8D26\u6237\u3001\u4EFB\u52A1\u6216\u9884\u68C0\u65F6\u6548\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");let o=e.actions[0];if(t.asset==="NEAR"){if(e.receiverId!==t.recipient||o.type!=="Transfer"||o.params.deposit!==r)throw Error("\u8F6C\u8D26\u53C2\u6570\u4E0D\u4E00\u81F4")}else if(e.receiverId!==je[t.asset].contract||o.type!=="FunctionCall"||o.params.methodName!=="ft_transfer"||o.params.args.receiver_id!==t.recipient||o.params.args.amount!==r||o.params.deposit!=="1"||o.params.gas!=="30000000000000")throw Error("\u4EE3\u5E01\u8F6C\u8D26\u53C2\u6570\u4E0D\u4E00\u81F4");if(t.maxAmount&&BigInt(r)>BigInt(qe(t.maxAmount,n)))throw Error("\u91D1\u989D\u8D85\u8FC7\u672C\u6B21\u4E0A\u9650");return e}async function Pn(s){if(Q)return;Q=!0;let e;try{if(!w||m!==s.input.accountId)throw Error("\u8BF7\u5148\u8FDE\u63A5\u76F8\u540C\u4ED8\u6B3E\u8D26\u6237\u7684\u94B1\u5305");h("\u6B63\u5728\u91CD\u65B0\u68C0\u67E5\u94FE\u4E0A\u6761\u4EF6\u2026");let t=await w.wallet("meteor-wallet");if(!(await t.getAccounts({network:"mainnet"})).some(c=>c.accountId===s.input.accountId))throw Error("\u94B1\u5305\u5F53\u524D\u8D26\u6237\u4E0E\u4EFB\u52A1\u4E0D\u4E00\u81F4");if(e=await E(s,"open",{accountId:m}),e.state!=="wallet_open"){h("\u6700\u65B0\u9884\u68C0\u672A\u901A\u8FC7\uFF0C\u8BF7\u67E5\u770B\u4EFB\u52A1\u68C0\u67E5\u9879\u3002");return}let r=_n(e);h("\u8BF7\u5728 Meteor \u94B1\u5305\u4E2D\u6838\u5BF9\u5E76\u51B3\u5B9A\u662F\u5426\u7B7E\u540D\u3002\u7F51\u9875\u4E0D\u4F1A\u66FF\u4F60\u786E\u8BA4\u3002");let a=(await t.signAndSendTransaction({...r,network:"mainnet"}))?.transaction?.hash;if(!De(a))throw Error("\u94B1\u5305\u672A\u8FD4\u56DE\u53EF\u6838\u9A8C\u7684\u4EA4\u6613\u54C8\u5E0C");let i=await E(e,"result",{attemptId:e.attemptId,txHash:a});h("\u94B1\u5305\u8FD4\u56DE\u4E86\u4EA4\u6613\u54C8\u5E0C\uFF0C\u6B63\u5728\u72EC\u7ACB\u6838\u9A8C\u94FE\u4E0A\u7ED3\u679C\u2026"),await ee(i),$()}catch(t){if(e?.state==="wallet_open"){try{await E(e,"result",{attemptId:e.attemptId})}catch{}h("\u94B1\u5305\u64CD\u4F5C\u7ED3\u679C\u672A\u786E\u8BA4\u3002\u8BF7\u5148\u68C0\u67E5\u94B1\u5305\u4EA4\u6613\u8BB0\u5F55\uFF0C\u5DF2\u63D0\u4EA4\u65F6\u7C98\u8D34\u4EA4\u6613\u54C8\u5E0C\uFF1B\u672C\u4EFB\u52A1\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\u3002")}else h(t.message||"\u94B1\u5305\u64CD\u4F5C\u672A\u5B8C\u6210")}finally{Q=!1,await I()}}async function ee(s){try{await E(s,"check")}catch(e){h(e.message)}}function $(){ht=Date.now()+12e4,clearTimeout(Ke),Ke=setTimeout(pt,8e3)}async function pt(){if(Date.now()>ht)return;let s=x.find(e=>["submitted","unknown"].includes(e.state)&&e.txHash);s&&await ee(s),x.some(e=>["submitted","unknown"].includes(e.state)&&e.txHash)&&(Ke=setTimeout(pt,8e3))}l("#refresh").addEventListener("click",async()=>{await I(),$()});function mt(s){l("#transfer-form").hidden=!s,l("#balance-form").hidden=s,l("#balances").hidden=s,l("#transfer-tab").classList.toggle("selected",s),l("#balance-tab").classList.toggle("selected",!s)}l("#balance-tab").addEventListener("click",()=>mt(!1));l("#transfer-tab").addEventListener("click",()=>mt(!0));l("#balance-example").addEventListener("click",()=>O(l("#balance-form"),"accountId").value="wrap.near");l("#blocked-demo").addEventListener("click",()=>{let s=l("#transfer-form");for(let[e,t]of Object.entries({accountId:"wrap.near",recipient:"v2.ref-finance.near",asset:"NEAR",amount:"0.01",maxAmount:"0.001"}))O(s,e).value=t;h("\u8FD9\u662F\u516C\u5F00\u8D26\u6237\u7684\u53EA\u8BFB\u62E6\u622A\u793A\u4F8B\uFF0C\u4E0D\u4EE3\u8868\u4F60\u62E5\u6709\u8BE5\u8D26\u6237\u3002\u70B9\u51FB\u68C0\u67E5\u540E\u4F1A\u770B\u5230\u91D1\u989D\u8D85\u8FC7\u4E0A\u9650\u3002")});l("#balance-form").addEventListener("submit",async s=>{s.preventDefault();let e=s.currentTarget,t=e.querySelector("button");t.disabled=!0;try{let n=O(e,"accountId").value.trim();if(!Le(n))throw Error("\u8BF7\u8F93\u5165\u6709\u6548 NEAR \u516C\u5F00\u8D26\u6237");h("\u6B63\u5728\u8BFB\u53D6\u4E3B\u7F51 final \u533A\u5757\u4E2D\u7684\u4F59\u989D\u2026");let r=await C("agent/run",{task:"account_inspect",input:{accountId:n}}),o=r.data,a=l("#balances");a.replaceChildren();let i=u("div",void 0,"balance-grid");for(let c of[o.native,...o.tokens]){let d=u("div",c.symbol);d.append(u("b",c.status==="verified"?c.amount:"\u672A\u77E5")),i.append(d)}a.append(i,u("small","\u91C7\u96C6\u4E8E "+o.anchor.fetchedAt+" \xB7 final #"+o.anchor.height+"\u3002\u4F59\u989D\u4E0D\u7B49\u4E8E\u53EF\u81EA\u7531\u8F6C\u51FA\u989D\uFF1B\u8303\u56F4\u4E3ANEAR\u53CA\u4E09\u4E2AFT\u3002")),h("\u4F59\u989D\u67E5\u8BE2\u5B8C\u6210\uFF1B\u5931\u8D25\u9879\u76EE\u4FDD\u7559\u672A\u77E5\u72B6\u6001\u3002")}catch(n){h(n.message)}finally{t.disabled=!1}});l("#transfer-form").addEventListener("submit",async s=>{s.preventDefault();let e=s.currentTarget,t=e.querySelector("button");t.disabled=!0;try{let n=Object.fromEntries([...new FormData(e)].map(([r,o])=>[r,o.trim()]));n.maxAmount||delete n.maxAmount,h("\u6B63\u5728\u68C0\u67E5\u94FE\u4E0A\u6761\u4EF6\u5E76\u4FDD\u5B58\u4EFB\u52A1\u2026"),await C("wallet/prepare",n),await I(),h("\u4EFB\u52A1\u5DF2\u4FDD\u5B58\u3002\u8BF7\u67E5\u770B\u68C0\u67E5\u7ED3\u679C\uFF1B\u901A\u8FC7\u540E\u7531\u4F60\u4E3B\u52A8\u6253\u5F00\u94B1\u5305\u3002")}catch(n){h(n.message)}finally{t.disabled=!1}});document.querySelectorAll("[data-prompt]").forEach(s=>s.addEventListener("click",()=>{l("#chat-input").value=s.dataset.prompt,l("#chat-input").focus()}));function Z(s,e){let t=u("article",e,s);s==="assistant"&&(t.innerHTML=dt(e)),l("#chat-log").append(t),t.scrollIntoView({block:"nearest"})}l("#chat-form").addEventListener("submit",async s=>{s.preventDefault();let e=l("#chat-input"),t=l("#chat-send"),n=e.value.trim();if(n){if(/sk-[\w-]{16,}|ed25519:[1-9A-HJ-NP-Za-km-z]{80,}|(?:私钥|助记词|seed phrase|mnemonic|private key)\s*[:：=]\s*\S+/i.test(n)){h("\u8BF7\u79FB\u9664\u5BC6\u94A5\u6216\u52A9\u8BB0\u8BCD\u540E\u518D\u53D1\u9001\u3002");return}t.disabled=!0,T.push({role:"user",content:n}),T=T.slice(-9),Z("user",n),e.value="",h("Agent \u6B63\u5728\u7406\u89E3\u9700\u6C42\u5E76\u8C03\u7528\u5DE5\u5177\u2026");try{let r=await C("wallet/chat",{messages:lt(T),...m?{walletAccountId:m}:{}});T.push({role:"assistant",content:r.answer.slice(0,2e3)}),Z("assistant",r.answer),r.tools?.length&&Z("tool","\u8C03\u7528\u5DE5\u5177\uFF1A"+r.tools.map(o=>o.name+(o.status==="failed"?"\uFF08\u672A\u5B8C\u6210\uFF09":"")).join(" \u2192 ")),h("\u672C\u8F6E\u5904\u7406\u5B8C\u6210\u3002\u8F6C\u8D26\u4EFB\u52A1\u4EE5\u53F3\u4FA7\u5361\u7247\u4E3A\u51C6\u3002")}catch(r){Z("assistant",r.message),h("\u5BF9\u8BDD\u672A\u5B8C\u6210\uFF1B\u8BF7\u67E5\u770B\u4EFB\u52A1\u5217\u8868\uFF0C\u6216\u4F7F\u7528\u76F4\u63A5\u64CD\u4F5C\u3002")}finally{await I(),t.disabled=!1}}});await I();C("agent/chat/status").then(s=>{l("#model-status").textContent=s.available?"Agent \u5DF2\u5C31\u7EEA":"\u53EF\u4F7F\u7528\u76F4\u63A5\u64CD\u4F5C",l("#chat-send").disabled=!s.available}).catch(()=>l("#model-status").textContent="\u6A21\u578B\u72B6\u6001\u672A\u77E5");x.some(s=>["submitted","unknown"].includes(s.state))&&$();
