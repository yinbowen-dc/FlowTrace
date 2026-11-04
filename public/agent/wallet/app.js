var Ot=Object.create;var st=Object.defineProperty;var $t=Object.getOwnPropertyDescriptor;var Dt=Object.getOwnPropertyNames;var jt=Object.getPrototypeOf,qt=Object.prototype.hasOwnProperty;var f=(n,e)=>()=>{try{return e||n((e={exports:{}}).exports,e),e.exports}catch(t){throw e=0,t}};var Wt=(n,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of Dt(e))!qt.call(n,o)&&o!==t&&st(n,o,{get:()=>e[o],enumerable:!(s=$t(e,o))||s.enumerable});return n};var Rt=(n,e,t)=>(t=n!=null?Ot(jt(n)):{},Wt(e||!n||!n.__esModule?st(t,"default",{value:n,enumerable:!0}):t,n));var fe=f(B=>{"use strict";Object.defineProperty(B,"__esModule",{value:!0});B.LocalStorage=void 0;var pe=class{async get(e){return typeof window>"u"?null:localStorage.getItem(e)}async set(e,t){typeof window>"u"||localStorage.setItem(e,t)}async remove(e){typeof window>"u"||localStorage.removeItem(e)}};B.LocalStorage=pe});var rt=f(me=>{"use strict";Object.defineProperty(me,"__esModule",{value:!0});me.encodeBase58=Ft;var ot="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";function Ft(n){if(n.length===0)return"";let e=0,t=0;for(;t<n.length&&n[t]===0;)e++,t++;let s=[0];for(;t<n.length;t++){let r=n[t];for(let a=0;a<s.length;++a)r+=s[a]<<8,s[a]=r%58,r=r/58|0;for(;r>0;)s.push(r%58),r=r/58|0}for(;s.length>0&&s[s.length-1]===0;)s.pop();let o="";for(let r=0;r<e;r++)o+=ot[0];for(let r=s.length-1;r>=0;--r)o+=ot[s[r]];return o}});var j=f(z=>{"use strict";Object.defineProperty(z,"__esModule",{value:!0});z.nearActionsToConnectorActions=void 0;var Kt=rt(),Ut=n=>{try{return JSON.parse(new TextDecoder().decode(n))}catch{return n}},Ht=n=>n.enum!=null?n.enum==="fullAccess":"fullAccess"in n,Bt=n=>n.enum!=null?n.enum==="AccountId":"AccountId"in n,zt=n=>n.map(e=>{if("type"in e)return e;if(e.signedDelegate)throw new Error("SignedDelegate actions cannot be sent through the wallet connector; wallets sign delegates via signDelegateActions");if(e.functionCall)return{type:"FunctionCall",params:{methodName:e.functionCall.methodName,args:Ut(e.functionCall.args),gas:e.functionCall.gas.toString(),deposit:e.functionCall.deposit.toString()}};if(e.deployGlobalContract)return{type:"DeployGlobalContract",params:{code:e.deployGlobalContract.code,deployMode:Bt(e.deployGlobalContract.deployMode)?"AccountId":"CodeHash"}};if(e.createAccount)return{type:"CreateAccount"};if(e.useGlobalContract){let t=e.useGlobalContract.contractIdentifier;return{type:"UseGlobalContract",params:{contractIdentifier:t.AccountId!=null?{accountId:t.AccountId}:{codeHash:(0,Kt.encodeBase58)(t.CodeHash)}}}}if(e.deployContract)return{type:"DeployContract",params:{code:e.deployContract.code}};if(e.deleteAccount)return{type:"DeleteAccount",params:{beneficiaryId:e.deleteAccount.beneficiaryId}};if(e.deleteKey)return{type:"DeleteKey",params:{publicKey:e.deleteKey.publicKey.toString()}};if(e.transfer)return{type:"Transfer",params:{deposit:e.transfer.deposit.toString()}};if(e.stake)return{type:"Stake",params:{stake:e.stake.stake.toString(),publicKey:e.stake.publicKey.toString()}};if(e.addKey){let{permission:t}=e.addKey.accessKey,s;if(t.functionCall)s={receiverId:t.functionCall.receiverId,allowance:t.functionCall.allowance?.toString(),methodNames:t.functionCall.methodNames};else if(Ht(t))s="FullAccess";else throw new Error("Unsupported access-key permission on AddKey: only functionCall and fullAccess can be sent through the wallet connector (pass a ConnectorAction otherwise)");return{type:"AddKey",params:{publicKey:e.addKey.publicKey.toString(),accessKey:{nonce:Number(e.addKey.accessKey.nonce),permission:s}}}}throw new Error("Unsupported action type")});z.nearActionsToConnectorActions=zt});var q=f(L=>{"use strict";Object.defineProperty(L,"__esModule",{value:!0});L.isGasKeyAction=void 0;L.assertGasKeyActionsSupported=Gt;var Vt=n=>n.type==="TransferToGasKey"||n.type==="WithdrawFromGasKey"||n.type==="AddKey"&&n.params.gasKeyInfo!=null;L.isGasKeyAction=Vt;function Gt(n,e,t){if(n?.gasKeys)return;let s=e.filter(L.isGasKeyAction).map(o=>o.type);if(s.length!==0)throw new Error(`${t} does not advertise gas-key support (manifest features.gasKeys), so ${[...new Set(s)].join(", ")} cannot be sent through it; a wallet that does not know gasKeyInfo could add a plain key instead. Sign locally with a full-access key, or use a wallet whose manifest sets features.gasKeys.`)}});var G=f(V=>{"use strict";Object.defineProperty(V,"__esModule",{value:!0});V.uuid4=void 0;var Jt=()=>typeof window<"u"&&typeof window.crypto<"u"&&typeof window.crypto.randomUUID=="function"?window.crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(n){let e=Math.random()*16|0;return(n==="x"?e:e&3|8).toString(16)});V.uuid4=Jt});var be=f(J=>{"use strict";Object.defineProperty(J,"__esModule",{value:!0});J.ParentFrameWallet=void 0;var ge=j(),we=q(),Yt=G(),ye=class{connector;manifest;constructor(e,t){this.connector=e,this.manifest=t}callParentFrame(e,t){let s=(0,Yt.uuid4)();return window.parent.postMessage({type:"near-wallet-injected-request",id:s,method:e,params:t},"*"),new Promise((o,r)=>{let a=i=>{i.data.type==="near-wallet-injected-response"&&i.data.id===s&&(window.removeEventListener("message",a),i.data.success?o(i.data.result):r(i.data.error))};window.addEventListener("message",a)})}async signIn(e){let t=await this.callParentFrame("near:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey});return Array.isArray(t)?t:[t]}async signInAndSignMessage(e){let t=await this.callParentFrame("near:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams});return Array.isArray(t)?t:[t]}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.callParentFrame("near:signOut",t)}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.callParentFrame("near:getAccounts",t)}async signAndSendTransaction(e){let t=(0,ge.nearActionsToConnectorActions)(e.actions);(0,we.assertGasKeyActionsSupported)(this.manifest.features,t,this.manifest.name);let s={...e,actions:t,network:e.network??this.connector.network};return this.callParentFrame("near:signAndSendTransaction",s)}async signAndSendTransactions(e){let t=e.transactions.map(o=>({actions:(0,ge.nearActionsToConnectorActions)(o.actions),receiverId:o.receiverId}));(0,we.assertGasKeyActionsSupported)(this.manifest.features,t.flatMap(o=>o.actions),this.manifest.name);let s={...e,transactions:t,network:e.network??this.connector.network};return this.callParentFrame("near:signAndSendTransactions",s)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.callParentFrame("near:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(s=>({...s,actions:(0,ge.nearActionsToConnectorActions)(s.actions)})),network:e.network||this.connector.network};return(0,we.assertGasKeyActionsSupported)(this.manifest.features,t.delegateActions.flatMap(s=>s.actions),this.manifest.name),this.callParentFrame("near:signDelegateActions",t)}};J.ParentFrameWallet=ye});var ve=f(Y=>{"use strict";Object.defineProperty(Y,"__esModule",{value:!0});Y.parseUrl=void 0;var Zt=n=>{try{return new URL(n)}catch{return null}};Y.parseUrl=Zt});var at=f(Z=>{"use strict";Object.defineProperty(Z,"__esModule",{value:!0});Z.copyText=void 0;var Xt=async n=>{try{await navigator.clipboard.writeText(n);return}catch{}let e=document.createElement("textarea");e.value=n,e.setAttribute("readonly",""),e.style.position="fixed",e.style.opacity="0",document.body.appendChild(e),e.select();try{if(!document.execCommand("copy"))throw new Error("Copy failed")}finally{e.remove()}};Z.copyText=Xt});var ct=f(C=>{"use strict";Object.defineProperty(C,"__esModule",{value:!0});C.openExternalLink=C.openTelegramLink=C.isTelegramMiniApp=void 0;var xe=()=>{let n=window?.Telegram?.WebApp;return!n||!n.platform||n.platform==="unknown"?null:n},Qt=()=>{try{return location.hash.includes("tgWebAppData")?!0:!!sessionStorage.getItem("__telegram__initParams")}catch{return!1}},en=()=>typeof window>"u"?!1:!!xe()||!!window.TelegramWebviewProxy||Qt();C.isTelegramMiniApp=en;var it=(n,e)=>{let t=window.TelegramWebviewProxy;if(t?.postEvent)return t.postEvent(n,JSON.stringify(e));let s=window.external;if(s&&"notify"in s)return s.notify(JSON.stringify({eventType:n,eventData:e}));window.parent!==window&&window.parent.postMessage(JSON.stringify({eventType:n,eventData:e}),"https://web.telegram.org")},tn=n=>{let e=xe();if(e)return e.openTelegramLink(n.toString());it("web_app_open_tg_link",{path_full:n.pathname+n.search})};C.openTelegramLink=tn;var nn=n=>{let e=xe();if(e)return e.openLink(n.toString());it("web_app_open_link",{url:n.toString()})};C.openExternalLink=nn});var Ae=f(X=>{"use strict";Object.defineProperty(X,"__esModule",{value:!0});X.EventEmitter=void 0;var ke=class{events={};on(e,t){this.events[e]||(this.events[e]=[]),this.events[e].push(t)}emit(e,t){this.events[e]?.forEach(s=>s(t))}off(e,t){this.events[e]=this.events[e]?.filter(s=>s!==t)}once(e,t){let s=o=>{t(o),this.off(e,s)};this.on(e,s)}removeAllListeners(e){e?delete this.events[e]:this.events={}}};X.EventEmitter=ke});var ee=f(Q=>{"use strict";Object.defineProperty(Q,"__esModule",{value:!0});Q.escapeHtml=lt;Q.html=sn;function lt(n){return n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}var Se=Symbol("htmlTag");function sn(n,...e){let t=n[0];for(let s=0;s<e.length;s++){for(let o of Array.isArray(e[s])?e[s]:[e[s]]){let r=o?.[Se]?o[Se]:lt(String(o??""));t+=r}t+=n[s+1]}return Object.freeze({[Se]:t,get html(){return t}})}});var dt=f(te=>{"use strict";Object.defineProperty(te,"__esModule",{value:!0});te.css=void 0;var on=n=>`
${n} * {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  -ms-overflow-style: none;
  scrollbar-width: none;
  color: #fff;
}

${n} *::-webkit-scrollbar {
  display: none;
}

${n} p,
${n} h1,
${n} h2,
${n} h3,
${n} h4,
${n} h5,
${n} h6 {
  margin: 0;
}

${n} .modal-container {
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
  ${n} .modal-container {
    justify-content: flex-end;
  }
}

${n} .modal-content {
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
  ${n} .modal-content {
    max-width: 100%;
    width: 100%;
    max-height: 80%;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border: none;
    border-top: 1.5px solid rgba(255, 255, 255, 0.1);
  }
}


${n} .modal-header {
  display: flex;
  padding: 16px;
  gap: 16px;
  align-self: stretch;
  align-items: center;
  justify-content: center;
  position: relative;
}

${n} .modal-header button {
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

${n} .modal-header button:hover {
  background: rgba(255, 255, 255, 0.04);
}

${n} .modal-header p {
  color: #fff;
  text-align: center;
  font-size: 24px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  margin: 0;
}


${n} .modal-body {
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

${n} .modal-body textarea {
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

${n} .modal-body button {
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

${n} .footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 16px 24px;
  color: #fff;
  gap: 12px;
}

${n} .modal-body p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  letter-spacing: -0.8px;
}

${n} .footer img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

${n} .get-wallet-link {
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

${n} .get-wallet-link:hover {
  color: rgba(255, 255, 255, 1);
}


${n} .connect-item {
  display: flex;
  padding: 8px;
  align-items: center;
  gap: 12px;
  align-self: stretch;
  cursor: pointer;

  transition: background 0.2s ease-in-out;
  border-radius: 24px;
}

${n} .connect-item img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
  flex-shrink: 0;
}

${n} .connect-item-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  flex: 1;
  margin-top: -2px;
}

${n} .connect-item-info .wallet-address {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
}

${n} .connect-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

${n} .connect-item img {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  object-fit: cover;
}

${n} .connect-item p {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  font-size: 18px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  letter-spacing: -0.36px;
  margin: 0;
}
`;te.css=on});var Ce=f(ne=>{"use strict";Object.defineProperty(ne,"__esModule",{value:!0});ne.Popup=void 0;var rn=dt(),an=ee(),ut=`n${Math.random().toString(36).substring(2,15)}`;if(typeof document<"u"){let n=document.createElement("style");n.textContent=(0,rn.css)(`.${ut}`),document.head.append(n)}var Ee=class{delegate;isClosed=!1;root=document.createElement("div");state={};constructor(e){this.delegate=e}get dom(){return(0,an.html)``}disposables=[];addListener(e,t,s){let o=typeof e=="string"?this.root.querySelector(e):e;o&&(o.addEventListener(t,s),this.disposables.push(()=>o.removeEventListener(t,s)))}handlers(){this.disposables.forEach(o=>o()),this.disposables=[];let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.onclick=o=>o.stopPropagation(),e.onclick=()=>{this.delegate.onReject(),this.destroy()};let s=o=>{o.key==="Escape"&&(this.delegate.onReject(),this.destroy())};document.addEventListener("keydown",s),this.disposables.push(()=>document.removeEventListener("keydown",s))}update(e){this.state={...this.state,...e},this.root.innerHTML=this.dom.html,this.handlers()}create({show:e=!0}){this.root.className=`${ut} hot-connector-popup`,this.root.style.display="none",this.root.innerHTML=this.dom.html,document.body.append(this.root),this.handlers();let t=this.root.querySelector(".modal-container"),s=this.root.querySelector(".modal-content");s.style.transform="translateY(50px)",t.style.opacity="0",e&&setTimeout(()=>this.show(),10)}show(){let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.style.transform="translateY(50px)",e.style.opacity="0",this.root.style.display="block",setTimeout(()=>{t.style.transform="translateY(0)",e.style.opacity="1"},100)}hide(){let e=this.root.querySelector(".modal-container"),t=this.root.querySelector(".modal-content");t.style.transform="translateY(50px)",e.style.opacity="0",setTimeout(()=>{this.root.style.display="none"},200)}destroy(){this.isClosed||(this.isClosed=!0,this.disposables.forEach(e=>e()),this.disposables=[],this.hide(),setTimeout(()=>{this.root.remove()},200))}};ne.Popup=Ee});var ht=f(se=>{"use strict";Object.defineProperty(se,"__esModule",{value:!0});se.IframeWalletPopup=void 0;var _e=ee(),cn=Ce(),Ie=class extends cn.Popup{delegate;constructor(e){super(e),this.delegate=e}handlers(){super.handlers(),this.addListener("button","click",()=>this.delegate.onApprove())}create(){super.create({show:!1}),this.root.querySelector(".modal-body").appendChild(this.delegate.iframe),this.delegate.iframe.style.width="100%",this.delegate.iframe.style.height="720px",this.delegate.iframe.style.border="none"}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t}=this.delegate.footer;return(0,_e.html)`
      <div class="footer">
        ${e?(0,_e.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
      </div>
    `}get dom(){return(0,_e.html)`<div class="modal-container">
      <div class="modal-content">
        <div class="modal-body" style="padding: 0; overflow: auto;"></div>
        ${this.footer}
      </div>
    </div>`}};se.IframeWalletPopup=Ie});var pt=f(oe=>{"use strict";Object.defineProperty(oe,"__esModule",{value:!0});oe.NEAR_CONNECT_VERSION=void 0;oe.NEAR_CONNECT_VERSION="0.12.0"});var ft=f(Ne=>{"use strict";Object.defineProperty(Ne,"__esModule",{value:!0});var ln=pt();async function dn(n){let e=await n.executor.getAllStorage(),t=n.executor.connector.providers,s=n.executor.manifest,o=n.id,r=n.code.replaceAll(".localStorage",".sandboxedLocalStorage").replaceAll("window.top","window.selector").replaceAll("window.open","window.selector.open"),a=n.cspNonce?` nonce="${n.cspNonce.replace(/[^A-Za-z0-9+/=]/g,"")}"`:"";return`
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
            <img src="${s.icon}" />
            <h1>${s.name}</h1>
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
            if (event.data.origin !== "${o}") return;
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
        nearConnectVersion: "${ln.NEAR_CONNECT_VERSION}",

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
          wallet.manifest = ${JSON.stringify(s)};
          window.parent.postMessage({ method: "wallet-ready", origin: "${o}" }, "*");
          window.selector.wallet = wallet;
        },

        async call(method, params) {
          const id = window.selector.uuid();
          window.parent.postMessage({ method, params, id, origin: "${o}" }, "*");

          return new Promise((resolve, reject) => {
            const handler = (event) => {
              if (event.data.id !== id || event.data.origin !== "${o}") return;
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
            origin: "${o}",
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
        if (event.data.origin !== "${o}") return;
        if (!event.data.method?.startsWith("wallet:")) return;

        const wallet = window.selector.wallet;
        const method = event.data.method.replace("wallet:", "");
        const payload = { id: event.data.id, origin: "${o}", method };

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

      <script type="module"${a}>${r}<\/script>
    </body>
  </html>
    `}Ne.default=dn});var mt=f(W=>{"use strict";var un=W&&W.__importDefault||function(n){return n&&n.__esModule?n:{default:n}};Object.defineProperty(W,"__esModule",{value:!0});var hn=Ae(),pn=G(),fn=ht(),mn=un(ft()),Pe=class{executor;origin;disposed=!1;iframe=document.createElement("iframe");events=new hn.EventEmitter;popup;handler;readyPromiseResolve;readyPromise=new Promise(e=>{this.readyPromiseResolve=e});constructor(e,t,s,o){this.executor=e,this.origin=(0,pn.uuid4)(),this.handler=a=>{a.data.origin===this.origin&&(a.data.method==="wallet-ready"&&this.readyPromiseResolve(),s(this,a))},window.addEventListener("message",this.handler);let r=[];this.executor.checkPermissions("usb")&&r.push("usb *;"),this.executor.checkPermissions("hid")&&r.push("hid *;"),this.executor.checkPermissions("clipboardRead")&&r.push("clipboard-read;"),this.executor.checkPermissions("clipboardWrite")&&r.push("clipboard-write;"),this.executor.checkPermissions("bluetooth")&&r.push("bluetooth *;"),this.iframe.allow=r.join(" "),this.iframe.setAttribute("sandbox","allow-scripts"),(0,mn.default)({id:this.origin,executor:this.executor,code:t,cspNonce:o}).then(a=>{this.executor.connector.logger?.log("Iframe code injected"),this.iframe.srcdoc=a}),this.popup=new fn.IframeWalletPopup({footer:this.executor.connector.footerBranding,iframe:this.iframe,onApprove:()=>{},onReject:()=>{this.disposed=!0,window.removeEventListener("message",this.handler),this.events.emit("close",{}),this.popup.destroy()}}),this.popup.create()}on(e,t){this.events.on(e,t)}show(){this.popup.show()}hide(){this.popup.hide()}postMessage(e){if(this.disposed)return;let t=this.iframe.contentWindow;if(!t)throw new Error(`Iframe not loaded for ${e?.method??"unknown method"}`);t.postMessage({...e,origin:this.origin},"*")}dispose(){this.disposed=!0,window.removeEventListener("message",this.handler),this.popup.destroy()}};W.default=Pe});var gt=f(R=>{"use strict";var gn=R&&R.__importDefault||function(n){return n&&n.__esModule?n:{default:n}};Object.defineProperty(R,"__esModule",{value:!0});var I=ve(),Me=G(),wn=at(),Te=ct(),yn=gn(mt()),bn=(0,Me.uuid4)(),Le=class{connector;manifest;activePanels={};storageSpace;constructor(e,t){this.connector=e,this.manifest=t,this.storageSpace=t.id}checkPermissions(e,t){if(e==="walletConnect")return!!this.manifest.permissions.walletConnect;if(e==="external"){let s=this.manifest.permissions.external;return!s||!t?.entity?!1:s.includes(t.entity)}if(e==="allowsOpen"){let s=(0,I.parseUrl)(t?.url||""),o=this.manifest.permissions.allowsOpen;return!s||!o||!Array.isArray(o)||o.length===0?!1:o.some(a=>{let i=(0,I.parseUrl)(a);return!(!i||s.protocol!==i.protocol||i.hostname&&s.hostname!==i.hostname||i.pathname&&i.pathname!=="/"&&s.pathname!==i.pathname)})}return this.manifest.permissions[e]}assertPermissions(e,t,s){if(!this.checkPermissions(t,s.data.params))throw e.postMessage({...s.data,status:"failed",result:"Permission denied"}),new Error("Permission denied")}_onMessage=async(e,t)=>{let s=r=>{e.postMessage({...t.data,status:"success",result:r})},o=r=>{e.postMessage({...t.data,status:"failed",result:r})};if(t.data.method==="ui.showIframe"){e.show(),s(null);return}if(t.data.method==="ui.hideIframe"){e.hide(),s(null);return}if(t.data.method==="storage.set"){this.assertPermissions(e,"storage",t),localStorage.setItem(`${this.storageSpace}:${t.data.params.key}`,t.data.params.value),s(null);return}if(t.data.method==="storage.get"){this.assertPermissions(e,"storage",t);let r=localStorage.getItem(`${this.storageSpace}:${t.data.params.key}`);s(r);return}if(t.data.method==="storage.keys"){this.assertPermissions(e,"storage",t);let r=Object.keys(localStorage).filter(a=>a.startsWith(`${this.storageSpace}:`));s(r);return}if(t.data.method==="storage.remove"){this.assertPermissions(e,"storage",t),localStorage.removeItem(`${this.storageSpace}:${t.data.params.key}`),s(null);return}if(t.data.method==="panel.focus"){let r=this.activePanels[t.data.params.windowId];r&&r.focus(),s(null);return}if(t.data.method==="panel.postMessage"){let r=this.activePanels[t.data.params.windowId];r&&r.postMessage(t.data.params.data,"*"),s(null);return}if(t.data.method==="panel.close"){let r=this.activePanels[t.data.params.windowId];r&&r.close(),delete this.activePanels[t.data.params.windowId],s(null);return}if(t.data.method==="walletConnect.connect"){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");let a=await(await this.connector.walletConnect).connect(t.data.params);a.approval(),s({uri:a.uri})}catch(r){o(r)}return}if(t.data.method==="walletConnect.getProjectId"){if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");this.assertPermissions(e,"walletConnect",t);let r=await this.connector.walletConnect;s(r.core.projectId);return}if(t.data.method==="walletConnect.disconnect"){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");let a=await(await this.connector.walletConnect).disconnect(t.data.params);s(a)}catch(r){o(r)}return}if(t.data.method==="walletConnect.getSession"){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");let r=await this.connector.walletConnect,a=r.session.keys[r.session.keys.length-1],i=a?r.session.get(a):null;s(i?{topic:i.topic,namespaces:i.namespaces}:null)}catch(r){o(r)}return}if(t.data.method==="walletConnect.request"){this.assertPermissions(e,"walletConnect",t);try{if(!this.connector.walletConnect)throw new Error("WalletConnect is not configured");let a=await(await this.connector.walletConnect).request(t.data.params);s(a)}catch(r){o(r)}return}if(t.data.method==="clipboard.writeText"){this.assertPermissions(e,"clipboardWrite",t);try{await(0,wn.copyText)(t.data.params.text),s(null)}catch(r){o(r)}return}if(t.data.method==="external"){this.assertPermissions(e,"external",t);try{let{entity:r,key:a,args:i}=t.data.params,l=r.split(".").reduce((p,k)=>p[k],window);r==="nightly.near"&&a==="signTransaction"&&(i[0].encode=()=>i[0]);let u=typeof l[a]=="function"?await l[a](...i||[]):l[a];s(u)}catch(r){o(r)}return}if(t.data.method==="open"){this.assertPermissions(e,"allowsOpen",t);let r=(0,I.parseUrl)(t.data.params.url);if(r&&r.protocol==="https:"&&(0,Te.isTelegramMiniApp)()){r.hostname==="t.me"?(0,Te.openTelegramLink)(r):(0,Te.openExternalLink)(r),s(null);return}let a=window.open(t.data.params.url,"_blank",t.data.params.features),i=a?(0,Me.uuid4)():null,l=u=>{let p=(0,I.parseUrl)(t.data.params.url);p&&p.origin===u.origin&&e.postMessage(u.data)};if(s(i),window.addEventListener("message",l),a&&i){this.activePanels[i]=a;let u=setInterval(()=>{if(!a?.closed)return;window.removeEventListener("message",l);let p={method:"proxy-window:closed",windowId:i};delete this.activePanels[i],clearInterval(u);try{e.postMessage(p)}catch{}},500)}return}if(t.data.method==="open.nativeApp"){this.assertPermissions(e,"allowsOpen",t);let r=(0,I.parseUrl)(t.data.params.url);if(!r||["https","http","javascript:","file:","data:","blob:","about:"].includes(r.protocol))throw o("Invalid URL"),new Error("[open.nativeApp] Invalid URL");let i=document.createElement("iframe");i.src=t.data.params.url,i.style.display="none",document.body.appendChild(i),e.postMessage({...t.data,status:"success",result:null});return}};actualCode=null;async checkNewVersion(e,t){if(this.actualCode)return this.connector.logger?.log("New version of code already checked"),this.actualCode;let s=(0,I.parseUrl)(e.manifest.executor);if(s||(s=(0,I.parseUrl)(location.origin+e.manifest.executor)),!s)throw new Error("Invalid executor URL");s.searchParams.set("nonce",bn);let o=await fetch(s.toString()).then(r=>{if(!r.ok)throw new Error(`Failed to load executor: ${r.status}`);return r.text()});return this.connector.logger?.log("New version of code fetched"),this.actualCode=o,o===t?(this.connector.logger?.log("New version of code is the same as the current version"),this.actualCode):(await this.connector.db.setItem(`${this.manifest.id}:${this.manifest.version}`,o).then(()=>this.connector.logger?.log("New version of code saved to cache")).catch(r=>this.connector.logger?.log("Failed to cache new version of code",r)),o)}async loadCode(){let e=await this.connector.db.getItem(`${this.manifest.id}:${this.manifest.version}`).catch(()=>null);this.connector.logger?.log("Code loaded from cache",e!==null);let t=this.checkNewVersion(this,e);return e||await t}async call(e,t){this.connector.logger?.log("Add to queue",e,t),this.connector.logger?.log("Calling method",e,t);let s=await this.loadCode();this.connector.logger?.log("Code loaded, preparing");let o=new yn.default(this,s,this._onMessage,this.connector.cspNonce);this.connector.logger?.log("Code loaded, iframe initialized"),await o.readyPromise,this.connector.logger?.log("Iframe ready");let r=(0,Me.uuid4)();return new Promise((a,i)=>{try{let l=u=>{u.data.id!==r||u.data.origin!==o.origin||(o.dispose(),window.removeEventListener("message",l),this.connector.logger?.log("postMessage",{result:u.data,request:{method:e,params:t}}),u.data.status==="failed"?i(u.data.result):a(u.data.result))};window.addEventListener("message",l),o.postMessage({method:e,params:t,id:r}),o.on("close",()=>i(new Error("Wallet closed")))}catch(l){this.connector.logger?.log("Iframe error",l),i(l)}})}async getAllStorage(){let e=Object.keys(localStorage).filter(s=>s.startsWith(`${this.storageSpace}:`)),t={};for(let s of e)t[s.replace(`${this.storageSpace}:`,"")]=localStorage.getItem(s);return t}async clearStorage(){let e=Object.keys(localStorage).filter(t=>t.startsWith(`${this.storageSpace}:`));for(let t of e)localStorage.removeItem(t)}};R.default=Le});var De=f(N=>{"use strict";var vn=N&&N.__importDefault||function(n){return n&&n.__esModule?n:{default:n}};Object.defineProperty(N,"__esModule",{value:!0});N.SandboxWallet=void 0;var Oe=j(),$e=q(),xn=vn(gt()),re=class{connector;manifest;executor;constructor(e,t){this.connector=e,this.manifest=t,this.executor=new xn.default(e,t)}async signIn(e){return this.executor.call("wallet:signIn",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey})}async signInAndSignMessage(e){return this.executor.call("wallet:signInAndSignMessage",{network:e?.network??this.connector.network,addFunctionCallKey:e?.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){let t={...e,network:e?.network??this.connector.network};await this.executor.call("wallet:signOut",t),await this.executor.clearStorage()}async getAccounts(e){let t={...e,network:e?.network??this.connector.network};return this.executor.call("wallet:getAccounts",t)}async signAndSendTransaction(e){let t=(0,Oe.nearActionsToConnectorActions)(e.actions);(0,$e.assertGasKeyActionsSupported)(this.manifest.features,t,this.manifest.name);let s={...e,actions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransaction",s)}async signAndSendTransactions(e){let t=e.transactions.map(o=>({actions:(0,Oe.nearActionsToConnectorActions)(o.actions),receiverId:o.receiverId}));(0,$e.assertGasKeyActionsSupported)(this.manifest.features,t.flatMap(o=>o.actions),this.manifest.name);let s={...e,transactions:t,network:e.network??this.connector.network};return this.executor.call("wallet:signAndSendTransactions",s)}async signMessage(e){let t={...e,network:e.network??this.connector.network};return this.executor.call("wallet:signMessage",t)}async signDelegateActions(e){let t={...e,delegateActions:e.delegateActions.map(s=>({...s,actions:(0,Oe.nearActionsToConnectorActions)(s.actions)})),network:e.network??this.connector.network};return(0,$e.assertGasKeyActionsSupported)(this.manifest.features,t.delegateActions.flatMap(s=>s.actions),this.manifest.name),this.executor.call("wallet:signDelegateActions",t)}};N.SandboxWallet=re;N.default=re});var Re=f(ae=>{"use strict";Object.defineProperty(ae,"__esModule",{value:!0});ae.InjectedWallet=void 0;var je=j(),qe=q(),We=class{connector;wallet;constructor(e,t){this.connector=e,this.wallet=t}get manifest(){return this.wallet.manifest}async signIn({addFunctionCallKey:e,network:t}){return this.wallet.signIn({network:t??this.connector.network,addFunctionCallKey:e})}async signInAndSignMessage(e){return this.wallet.signInAndSignMessage({network:e?.network??this.connector.network,addFunctionCallKey:e.addFunctionCallKey,messageParams:e.messageParams})}async signOut(e){await this.wallet.signOut({network:e?.network??this.connector.network})}async getAccounts(e){return this.wallet.getAccounts({network:e?.network??this.connector.network})}async signAndSendTransaction(e){let t=(0,je.nearActionsToConnectorActions)(e.actions);(0,qe.assertGasKeyActionsSupported)(this.manifest.features,t,this.manifest.name);let s=e.network??this.connector.network,o=await this.wallet.signAndSendTransaction({...e,actions:t,network:s});if(!o)throw new Error("No result from wallet");return Array.isArray(o.transactions)?o.transactions[0]:o}async signAndSendTransactions(e){let t=e.network??this.connector.network,s=e.transactions.map(r=>({actions:(0,je.nearActionsToConnectorActions)(r.actions),receiverId:r.receiverId}));(0,qe.assertGasKeyActionsSupported)(this.manifest.features,s.flatMap(r=>r.actions),this.manifest.name);let o=await this.wallet.signAndSendTransactions({...e,transactions:s,network:t});if(!o)throw new Error("No result from wallet");return Array.isArray(o.transactions)?o.transactions:o}async signMessage(e){return this.wallet.signMessage({...e,network:e.network??this.connector.network})}async signDelegateActions(e){let t=e.delegateActions.map(s=>({...s,actions:(0,je.nearActionsToConnectorActions)(s.actions)}));return(0,qe.assertGasKeyActionsSupported)(this.manifest.features,t.flatMap(s=>s.actions),this.manifest.name),this.wallet.signDelegateActions({...e,delegateActions:t,network:e.network??this.connector.network})}};ae.InjectedWallet=We});var wt=f(ie=>{"use strict";Object.defineProperty(ie,"__esModule",{value:!0});ie.NearWalletsPopup=void 0;var O=ee(),kn=ve(),An=Ce(),Sn={id:"custom-wallet",name:"Custom Wallet",icon:"https://www.mynearwallet.com/images/webclip.png",description:"Custom wallet for NEAR.",website:"",version:"1.0.0",executor:"your-executor-url.js",type:"sandbox",platform:{},features:{signMessage:!0,signInWithoutAddKey:!0,signInAndSignMessage:!0,signAndSendTransaction:!0,signAndSendTransactions:!0,signDelegateActions:!0},permissions:{storage:!0,allowsOpen:[]}},Fe=class extends An.Popup{delegate;constructor(e){super(e),this.delegate=e,this.update({wallets:e.wallets,showSettings:!1})}handlers(){super.handlers(),this.addListener(".settings-button","click",()=>this.update({showSettings:!0})),this.addListener(".back-button","click",()=>this.update({showSettings:!1})),this.root.querySelectorAll(".connect-item").forEach(e=>{e instanceof HTMLDivElement&&this.addListener(e,"click",()=>this.delegate.onSelect(e.dataset.type))}),this.root.querySelectorAll(".remove-wallet-button").forEach(e=>{e instanceof SVGSVGElement&&this.addListener(e,"click",async t=>{t.stopPropagation(),await this.delegate.onRemoveDebugManifest(e.dataset.type);let s=this.state.wallets.filter(o=>o.id!==e.dataset.type);this.update({wallets:s})})}),this.addListener(".add-debug-manifest-button","click",async()=>{try{let e=this.root.querySelector("#debug-manifest-input")?.value??"",t=await this.delegate.onAddDebugManifest(e);this.update({showSettings:!1,wallets:[t,...this.state.wallets]})}catch(e){alert(`Something went wrong: ${e}`)}})}create(){super.create({show:!0})}walletDom(e){let t=(0,O.html)`
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
    `;return(0,O.html)`
      <div class="connect-item" data-type="${e.id}">
        <img style="background: #333" src="${e.icon}" alt="${e.name}" />
        <div class="connect-item-info">
          <span>${e.name}</span>
          <span class="wallet-address">${(0,kn.parseUrl)(e.website)?.hostname}</span>
        </div>
        ${e.debug?t:""}
      </div>
    `}get footer(){if(!this.delegate.footer)return"";let{icon:e,heading:t,link:s,linkText:o}=this.delegate.footer;return(0,O.html)`
      <div class="footer">
        ${e?(0,O.html)`<img src="${e}" alt="${t}" />`:""}
        <p>${t}</p>
        <a class="get-wallet-link" href="${s}" target="_blank">${o}</a>
      </div>
    `}get dom(){return this.state.showSettings?(0,O.html)`
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

              <textarea style="width: 100%;" id="debug-manifest-input" rows="10">${JSON.stringify(Sn,null,2)}</textarea>
              <button class="add-debug-manifest-button">Add</button>
            </div>

            ${this.footer}
          </div>
        </div>
      `:(0,O.html)`<div class="modal-container">
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
    </div>`}};ie.NearWalletsPopup=Fe});var yt=f(Ue=>{"use strict";Object.defineProperty(Ue,"__esModule",{value:!0});var Ke=class{dbName;storeName;version;constructor(e,t){this.dbName=e,this.storeName=t,this.version=1}getDb(){return new Promise((e,t)=>{if(typeof window>"u"||typeof indexedDB>"u"){t(new Error("IndexedDB is not available (SSR environment)"));return}let s=indexedDB.open(this.dbName,this.version);s.onerror=o=>{console.error("Error opening database:",o.target.error),t(new Error("Error opening database"))},s.onsuccess=o=>{e(s.result)},s.onupgradeneeded=o=>{let r=s.result;r.objectStoreNames.contains(this.storeName)||r.createObjectStore(this.storeName)}})}async getItem(e){let t=await this.getDb();if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Key must be a string");return new Promise((s,o)=>{if(!this.storeName){o(new Error("Store name not set"));return}let r=t.transaction(this.storeName,"readonly");r.onerror=l=>o(r.error);let i=r.objectStore(this.storeName).get(e);i.onerror=l=>o(i.error),i.onsuccess=()=>{s(i.result),t.close()}})}async setItem(e,t){let s=await this.getDb();if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Key must be a string");return new Promise((o,r)=>{if(!this.storeName){r(new Error("Store name not set"));return}let a=s.transaction(this.storeName,"readwrite");a.onerror=u=>r(a.error);let l=a.objectStore(this.storeName).put(t,e);l.onerror=u=>r(l.error),l.onsuccess=()=>{s.close(),o()}})}async removeItem(e){let t=await this.getDb();if(typeof e=="number"&&(e=e.toString()),typeof e!="string")throw new Error("Key must be a string");return new Promise((s,o)=>{if(!this.storeName){o(new Error("Store name not set"));return}let r=t.transaction(this.storeName,"readwrite");r.onerror=l=>o(r.error);let i=r.objectStore(this.storeName).delete(e);i.onerror=l=>o(i.error),i.onsuccess=()=>{t.close(),s()}})}async keys(){let e=await this.getDb();return new Promise((t,s)=>{if(!this.storeName){s(new Error("Store name not set"));return}let o=e.transaction(this.storeName,"readonly");o.onerror=i=>s(o.error);let a=o.objectStore(this.storeName).getAllKeys();a.onerror=i=>s(a.error),a.onsuccess=()=>{t(a.result),e.close()}})}async count(){let e=await this.getDb();return new Promise((t,s)=>{if(!this.storeName){s(new Error("Store name not set"));return}let o=e.transaction(this.storeName,"readonly");o.onerror=i=>s(o.error);let a=o.objectStore(this.storeName).count();a.onerror=i=>s(a.error),a.onsuccess=()=>{t(a.result),e.close()}})}async length(){return this.count()}async clear(){let e=await this.getDb();return new Promise((t,s)=>{if(!this.storeName){s(new Error("Store name not set"));return}let o=e.transaction(this.storeName,"readwrite");o.onerror=i=>s(o.error);let a=o.objectStore(this.storeName).clear();a.onerror=i=>s(a.error),a.onsuccess=()=>{e.close(),t()}})}};Ue.default=Ke});var vt=f($=>{"use strict";var En=$&&$.__importDefault||function(n){return n&&n.__esModule?n:{default:n}};Object.defineProperty($,"__esModule",{value:!0});$.NearConnector=void 0;var Cn=Ae(),_n=wt(),In=fe(),Nn=En(yt()),Pn=be(),Tn=Re(),bt=De(),Mn=["https://raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json","https://cdn.jsdelivr.net/gh/azbang/hot-connector/repository/manifest.json"];function Ln(n){return e=>Object.entries(n).length===0?!0:Object.entries(n).filter(([t,s])=>s===!0).every(([t])=>e.manifest.features?.[t]===!0)}var He=class{storage;events;db;logger;wallets=[];manifest={wallets:[],version:"1.0.0"};features={};network="mainnet";providers={mainnet:[],testnet:[]};walletConnect;footerBranding;excludedWallets=[];autoConnect;cspNonce;whenManifestLoaded;constructor(e){this.db=new Nn.default("hot-connector","wallets"),this.storage=e?.storage??new In.LocalStorage,this.events=e?.events??new Cn.EventEmitter,this.logger=e?.logger,this.cspNonce=e?.cspNonce,this.network=e?.network??"mainnet",this.walletConnect=e?.walletConnect,this.autoConnect=e?.autoConnect??!0,this.providers=e?.providers??{mainnet:[],testnet:[]},this.excludedWallets=e?.excludedWallets??[],this.features=e?.features??{},e?.footerBranding!==void 0?this.footerBranding=e?.footerBranding:this.footerBranding={icon:"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%20512%20512%22%20class%3D%22size-7%22%3E%3Crect%20width%3D%22512%22%20height%3D%22512%22%20fill%3D%22%2300ec97%22%20rx%3D%22110%22%2F%3E%3Cpath%20fill%3D%22%23000%22%20d%3D%22M373.89%20106.199a31.95%2031.95%200%200%200-27.213%2015.207l-62.631%2092.979a6.67%206.67%200%200%200-.989%205.001%206.66%206.66%200%200%200%202.837%204.235%206.67%206.67%200%200%200%208.032-.494l61.643-53.47c1.02-.924%202.599-.827%203.523.193.419.473.644%201.074.644%201.697v167.402a2.49%202.49%200%200%201-2.502%202.491%202.48%202.48%200%200%201-1.912-.891L168.976%20117.497a31.93%2031.93%200%200%200-24.356-11.298h-6.508c-17.623%200-31.917%2014.294-31.917%2031.917v235.767c0%2017.623%2014.294%2031.917%2031.917%2031.917a31.94%2031.94%200%200%200%2027.213-15.206l62.631-92.98a6.66%206.66%200%200%200-1.847-9.236%206.67%206.67%200%200%200-8.033.494l-61.643%2053.471c-1.02.923-2.599.826-3.522-.194a2.5%202.5%200%200%201-.634-1.697V173.008a2.49%202.49%200%200%201%202.502-2.492c.731%200%201.439.322%201.912.891l186.313%20223.096a31.95%2031.95%200%200%200%2024.357%2011.297h6.508c17.623%200%2031.927-14.272%2031.938-31.895V138.116c0-17.623-14.294-31.917-31.917-31.917%22%2F%3E%3C%2Fsvg%3E",heading:"NEAR Connector",link:"https://wallet.near.org",linkText:"Don't have a wallet?"},this.whenManifestLoaded=new Promise(async t=>{e?.manifest==null||typeof e.manifest=="string"?this.manifest=await this._loadManifest(e?.manifest).catch(()=>({wallets:[],version:"1.0.0"})):this.manifest=e?.manifest??{wallets:[],version:"1.0.0"};let s=new Set(this.excludedWallets);s.delete("hot-wallet"),this.manifest.wallets=this.manifest.wallets.filter(o=>!(o.permissions.walletConnect&&!this.walletConnect||s.has(o.id))),await new Promise(o=>setTimeout(o,100)),t()}),typeof window<"u"&&(window.addEventListener("near-wallet-injected",this._handleNearWalletInjected),window.dispatchEvent(new Event("near-selector-ready")),window.addEventListener("message",async t=>{t.data.type==="near-wallet-injected"&&(await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.filter(s=>s.manifest.id!==t.data.manifest.id),this.wallets.unshift(new Pn.ParentFrameWallet(this,t.data.manifest)),this.events.emit("selector:walletsChanged",{}),this.autoConnect&&this.connect({walletId:t.data.manifest.id}))})),this.whenManifestLoaded.then(()=>{typeof window<"u"&&window.parent.postMessage({type:"near-selector-ready"},"*"),this.manifest.wallets.forEach(t=>this.registerWallet(t)),this.storage.get("debug-wallets").then(t=>{JSON.parse(t??"[]").forEach(o=>this.registerDebugWallet(o))})})}get availableWallets(){return this.wallets.filter(t=>Object.entries(this.features).every(([s,o])=>!(o&&!t.manifest.features?.[s]))).filter(t=>!(this.network==="testnet"&&!t.manifest.features?.testnet))}_handleNearWalletInjected=e=>{this.wallets=this.wallets.filter(t=>t.manifest.id!==e.detail.manifest.id),this.wallets.unshift(new Tn.InjectedWallet(this,e.detail)),this.events.emit("selector:walletsChanged",{})};async _loadManifest(e){let t=e?[e]:Mn;for(let s of t){let o=await fetch(s).catch(()=>null);if(!(!o||!o.ok))return await o.json()}throw new Error("Failed to load manifest")}async switchNetwork(e,t){this.network!==e&&(await this.disconnect().catch(()=>{}),this.network=e,await this.connect(t))}async registerWallet(e){if(e.type!=="sandbox")throw new Error("Only sandbox wallets are supported");this.wallets.find(t=>t.manifest.id===e.id)||(this.wallets.push(new bt.SandboxWallet(this,e)),this.events.emit("selector:walletsChanged",{}))}async registerDebugWallet(e){let t=typeof e=="string"?JSON.parse(e):e;if(t.type!=="sandbox")throw new Error("Only sandbox wallets type are supported");if(!t.id)throw new Error("Manifest must have an id");if(!t.name)throw new Error("Manifest must have a name");if(!t.icon)throw new Error("Manifest must have an icon");if(!t.website)throw new Error("Manifest must have a website");if(!t.version)throw new Error("Manifest must have a version");if(!t.executor)throw new Error("Manifest must have an executor");if(!t.features)throw new Error("Manifest must have features");if(!t.permissions)throw new Error("Manifest must have permissions");if(this.wallets.find(o=>o.manifest.id===t.id))throw new Error("Wallet already registered");t.debug=!0,this.wallets.unshift(new bt.SandboxWallet(this,t)),this.events.emit("selector:walletsChanged",{});let s=this.wallets.filter(o=>o.manifest.debug).map(o=>o.manifest);return this.storage.set("debug-wallets",JSON.stringify(s)),t}async removeDebugWallet(e){this.wallets=this.wallets.filter(s=>s.manifest.id!==e);let t=this.wallets.filter(s=>s.manifest.debug).map(s=>s.manifest);this.storage.set("debug-wallets",JSON.stringify(t)),this.events.emit("selector:walletsChanged",{})}async selectWallet({features:e={}}={}){return await this.whenManifestLoaded.catch(()=>{}),new Promise((t,s)=>{let o=new _n.NearWalletsPopup({footer:this.footerBranding,wallets:this.availableWallets.filter(Ln(e)).map(r=>r.manifest),onRemoveDebugManifest:async r=>this.removeDebugWallet(r),onAddDebugManifest:async r=>this.registerDebugWallet(r),onReject:()=>(s(new Error("User rejected")),o.destroy()),onSelect:r=>(t(r),o.destroy())});o.create()})}async connect(e={}){let t=e.walletId,s=e.signMessageParams;await this.whenManifestLoaded.catch(()=>{}),t||(t=await this.selectWallet({features:{signInAndSignMessage:e.signMessageParams!=null?!0:void 0,signInWithFunctionCallKey:e.addFunctionCallKey!=null?!0:void 0}}));try{let o=await this.wallet(t);this.logger?.log("Wallet available to connect",o),await this.storage.set("selected-wallet",t),this.logger?.log(`Set preferred wallet, try to signIn${s!=null?" (with signed message)":""}`,t);let r;if(e.addFunctionCallKey!=null&&(this.logger?.log("Adding function call access key during sign in with params",e.addFunctionCallKey),r={...e.addFunctionCallKey,gasAllowance:e.addFunctionCallKey.gasAllowance??{amount:"250000000000000000000000",kind:"limited"}}),s!=null){let a=await o.signInAndSignMessage({addFunctionCallKey:r,messageParams:s,network:this.network});if(!a?.length)throw new Error("Failed to sign in");this.logger?.log("Signed in to wallet (with signed message)",t,a),this.events.emit("wallet:signInAndSignMessage",{wallet:o,accounts:a,success:!0}),this.events.emit("wallet:signIn",{wallet:o,accounts:a.map(i=>({accountId:i.accountId,publicKey:i.publicKey})),success:!0,source:"signInAndSignMessage"})}else{let a=await o.signIn({addFunctionCallKey:r,network:this.network});if(!a?.length)throw new Error("Failed to sign in");this.logger?.log("Signed in to wallet",t,a),this.events.emit("wallet:signIn",{wallet:o,accounts:a,success:!0,source:"signIn"})}return o}catch(o){throw this.logger?.log("Failed to connect to wallet",o),o}}async disconnect(e){e||(e=await this.wallet()),await e.signOut({network:this.network}),await this.storage.remove("selected-wallet"),this.events.emit("wallet:signOut",{success:!0})}async getConnectedWallet(){await this.whenManifestLoaded.catch(()=>{});let e=await this.storage.get("selected-wallet"),t=this.wallets.find(o=>o.manifest.id===e);if(!t)throw new Error("No wallet selected");let s=await t.getAccounts();if(!s?.length)throw new Error("No accounts found");return{wallet:t,accounts:s}}async wallet(e){if(await this.whenManifestLoaded.catch(()=>{}),!e)return this.getConnectedWallet().then(({wallet:s})=>s).catch(async()=>{throw await this.storage.remove("selected-wallet"),new Error("No accounts found")});let t=this.wallets.find(s=>s.manifest.id===e);if(!t)throw new Error("Wallet not found");return t}async use(e){await this.whenManifestLoaded.catch(()=>{}),this.wallets=this.wallets.map(t=>new Proxy(t,{get(s,o,r){let a=Reflect.get(s,o,r);if(o in e&&typeof a=="function"){let i=e[o];return function(...l){let u=()=>a.apply(s,l);return l.length>0?i.call(this,...l,u):i.call(this,void 0,u)}}return a}}))}on(e,t){this.events.on(e,t)}once(e,t){this.events.once(e,t)}off(e,t){this.events.off(e,t)}removeAllListeners(e){this.events.removeAllListeners(e)}};$.NearConnector=He});var kt=f(g=>{"use strict";Object.defineProperty(g,"__esModule",{value:!0});g.assertGasKeyActionsSupported=g.isGasKeyAction=g.nearActionsToConnectorActions=g.NearConnector=g.InjectedWallet=g.SandboxWallet=g.ParentFrameWallet=g.LocalStorage=void 0;var On=fe();Object.defineProperty(g,"LocalStorage",{enumerable:!0,get:function(){return On.LocalStorage}});var $n=be();Object.defineProperty(g,"ParentFrameWallet",{enumerable:!0,get:function(){return $n.ParentFrameWallet}});var Dn=De();Object.defineProperty(g,"SandboxWallet",{enumerable:!0,get:function(){return Dn.SandboxWallet}});var jn=Re();Object.defineProperty(g,"InjectedWallet",{enumerable:!0,get:function(){return jn.InjectedWallet}});var qn=vt();Object.defineProperty(g,"NearConnector",{enumerable:!0,get:function(){return qn.NearConnector}});var Wn=j();Object.defineProperty(g,"nearActionsToConnectorActions",{enumerable:!0,get:function(){return Wn.nearActionsToConnectorActions}});var xt=q();Object.defineProperty(g,"isGasKeyAction",{enumerable:!0,get:function(){return xt.isGasKeyAction}});Object.defineProperty(g,"assertGasKeyActionsSupported",{enumerable:!0,get:function(){return xt.assertGasKeyActionsSupported}})});var It=Rt(kt(),1);var Be=Object.freeze({USDC:{symbol:"USDC",decimals:6,contract:"17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1"},USDT:{symbol:"USDT",decimals:6,contract:"usdt.tether-token.near"},wNEAR:{symbol:"wNEAR",decimals:24,contract:"wrap.near"}}),ks=Object.freeze({matched:{label:"\u5230\u8D26\u4E00\u81F4",tone:"green"},underpaid:{label:"\u5230\u8D26\u4E0D\u8DB3",tone:"red"},overpaid:{label:"\u8D85\u989D\u5230\u8D26",tone:"amber"},merchant_gap:{label:"\u5546\u5BB6\u72B6\u6001\u672A\u540C\u6B65",tone:"amber"},provider_conflict:{label:"\u6E20\u9053\u4E0E\u6536\u636E\u51B2\u7A81",tone:"red"},refund_unverified:{label:"\u9000\u6B3E\u5F85\u6838\u9A8C",tone:"amber"},duplicate:{label:"\u6536\u636E\u91CD\u590D\u5173\u8054",tone:"red"},overdue:{label:"\u5904\u7406\u8D85\u65F6",tone:"amber"},pending:{label:"\u7B49\u5F85\u5904\u7406",tone:"blue"},unverified:{label:"\u8BC1\u636E\u5F85\u8865\u9F50",tone:"slate"},stale:{label:"\u67E5\u8BE2\u5DF2\u8FC7\u671F",tone:"amber"},failed:{label:"\u6E20\u9053\u62A5\u544A\u5931\u8D25",tone:"red"}}),Rn=(1n<<128n)-1n,F=n=>typeof n=="string"&&n.length>=2&&n.length<=64&&/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(n);function ze(n){if(typeof n!="string"||n.length<32||n.length>44||!/^[1-9A-HJ-NP-Za-km-z]+$/.test(n))return!1;let e=0n,t="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";for(let o of n)e=e*58n+BigInt(t.indexOf(o));return n.match(/^1*/)[0].length+(e===0n?0:Math.ceil(e.toString(16).length/2))===32}function Ve(n,e){if(typeof n!="string"||!/^\d{1,39}(?:\.\d+)?$/.test(n))throw Error("\u91D1\u989D\u8BF7\u586B\u5199\u5341\u8FDB\u5236\u5B57\u7B26\u4E32\uFF0C\u4E0D\u652F\u6301\u79D1\u5B66\u8BA1\u6570\u6CD5\u6216\u8D1F\u6570");let[t,s=""]=n.split(".");if(s.length>e)throw Error(`\u91D1\u989D\u6700\u591A\u652F\u6301${e}\u4F4D\u5C0F\u6570`);let o=BigInt(t)*10n**BigInt(e)+BigInt((s||"").padEnd(e,"0")||"0");if(o>Rn)throw Error("\u91D1\u989D\u8D85\u8FC7NEP-141\u8303\u56F4");return o.toString()}function At(n,e){let t=BigInt(n),s=t<0n?"-":"";t<0n&&(t=-t);let o=10n**BigInt(e),r=(t%o).toString().padStart(e,"0").replace(/0+$/,"");return s+(t/o).toString()+(r?"."+r:"")}var Fn=n=>String(n).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),Ge=n=>Fn(n).replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>").replace(/`([^`\n]+)`/g,"<code>$1</code>");function ce(n){let e=n.split(`
`),t=[];for(let s=0;s<e.length;s++)if(e[s].trim().startsWith("|")&&/^\s*\|?[\s:|-]+\|\s*$/.test(e[s+1]||"")&&/---/.test(e[s+1]||"")){let o=i=>i.trim().replace(/^\||\|$/g,"").split("|").map(l=>l.trim()),r=o(e[s]);s+=2;let a='<div class="chat-table-wrap"><table><thead><tr>'+r.map(i=>"<th>"+Ge(i)+"</th>").join("")+"</tr></thead><tbody>";for(;s<e.length&&e[s].trim().startsWith("|");)a+="<tr>"+o(e[s]).map(i=>"<td>"+Ge(i)+"</td>").join("")+"</tr>",s++;t.push(a+"</tbody></table></div>"),s--}else t.push(Ge(e[s])+`
`);return t.join("")}var Kn=["NEAR","USDC","USDT","wNEAR"],St=n=>typeof n=="string"&&/^\d{1,39}(?:\.\d{1,24})?$/.test(n);function Je(n,e=4){if(!St(n)||!Number.isInteger(e)||e<0||e>8)return{text:"\u672A\u77E5",approximate:!1};let[t,s=""]=n.split("."),o=s.padEnd(e,"0"),r=BigInt(t)*10n**BigInt(e)+BigInt(o.slice(0,e)||"0"),a=/[1-9]/.test(s.slice(e));if(r===0n&&a)return{text:"< "+(e?"0."+"0".repeat(e-1)+"1":"1"),approximate:!0};Number(s[e]||0)>=5&&r++;let i=r.toString().padStart(e+1,"0"),l=e?i.slice(0,-e):i,u=e?i.slice(-e).replace(/0+$/,""):"";return{text:l.replace(/\B(?=(\d{3})+(?!\d))/g,",")+(u?"."+u:""),approximate:a}}function Ye(n){if(n?.task!=="account_inspect")return null;let e=n.data,t=e?.anchor;if(!F(e?.accountId)||t?.network!=="mainnet"||!Number.isSafeInteger(t.height)||!t.hash||!Number.isFinite(Date.parse(t.fetchedAt)))return null;let s=[e.native,...Array.isArray(e.tokens)?e.tokens:[]],o=Kn.map(a=>{let i=s.find(p=>p?.symbol===a),l=a==="NEAR"||a==="wNEAR"?24:6,u=null;return i?.status==="verified"&&typeof i.amountAtomic=="string"&&/^\d{1,39}$/.test(i.amountAtomic)&&(u=At(i.amountAtomic,l)),{symbol:a,status:u===null?"unknown":"verified",amount:u}}),r=e.permissions?.status==="verified"?e.permissions.report:null;return{kind:"account",accountId:e.accountId,network:"mainnet",fetchedAt:t.fetchedAt,blockHeight:t.height,blockHash:t.hash,source:typeof t.source=="string"?t.source.slice(0,200):"",complete:o.every(a=>a.status==="verified"),assets:o,locked:e.native?.status==="verified"&&St(e.native.locked)?e.native.locked:null,permissions:r&&Array.isArray(r.keys)?{count:r.keys.length,fullAccessCount:r.keys.filter(a=>a.type==="FullAccess").length}:null}}function Et(n=[]){for(let e of[...n].reverse())if(e.name==="inspect_account"&&e.status==="completed"){let t=Ye(e.result);if(t)return t}return null}var _=(n,e)=>Object.assign(new Error(n),{code:e});async function Ct(n,e=()=>{}){if(!n.ok){let i=await n.json().catch(()=>({}));throw _(i.error?.message||"\u5BF9\u8BDD\u8BF7\u6C42\u672A\u5B8C\u6210",i.error?.code||"CHAT_HTTP")}if(!n.headers.get("content-type")?.includes("text/event-stream")){let i=await n.json();if(!i.ok)throw _(i.error?.message||"\u5BF9\u8BDD\u8BF7\u6C42\u672A\u5B8C\u6210",i.error?.code);return e({type:"complete",data:i.data}),i.data}if(!n.body)throw _("\u672A\u6536\u5230\u6D41\u5F0F\u54CD\u5E94\uFF0C\u8BF7\u6062\u590D\u672C\u8F6E\u7ED3\u679C\u3002","STREAM_INTERRUPTED");let t=n.body.getReader(),s=new TextDecoder,o="",r=null;function a(i){let l=i.split(`
`).filter(p=>p.startsWith("data:")).map(p=>p.slice(5).replace(/^ /,""));if(!l.length)return;let u;try{u=JSON.parse(l.join(`
`))}catch{throw _("\u54CD\u5E94\u683C\u5F0F\u672A\u5B8C\u6210\uFF0C\u8BF7\u6062\u590D\u672C\u8F6E\u7ED3\u679C\u3002","STREAM_INVALID")}if(u.type==="error")throw _(u.error?.message||"\u672C\u8F6E\u672A\u5B8C\u6210\uFF0C\u8BF7\u6062\u590D\u7ED3\u679C\u3002",u.error?.code||"STREAM_FAILED");if(u.type==="complete"){if(!u.data||typeof u.data.answer!="string")throw _("\u672C\u8F6E\u7F3A\u5C11\u5B8C\u6574\u7B54\u590D\uFF0C\u8BF7\u6062\u590D\u7ED3\u679C\u3002","STREAM_INVALID");r=u.data}e(u)}try{for(;;){let{done:i,value:l}=await t.read();if(o+=i?s.decode():s.decode(l,{stream:!0}),o=o.replace(/\r\n/g,`
`),o.length>1024*1024)throw _("\u672C\u8F6E\u7ED3\u679C\u8FC7\u5927\uFF0C\u8BF7\u67E5\u770B\u5DF2\u4FDD\u5B58\u7684\u4EFB\u52A1\u3002","STREAM_TOO_LARGE");let u;for(;(u=o.indexOf(`

`))>=0;){let p=o.slice(0,u);if(o=o.slice(u+2),a(p),r)return r}if(i)break}throw _("\u8FDE\u63A5\u4E2D\u65AD\uFF1B\u670D\u52A1\u5668\u53EF\u80FD\u4ECD\u5728\u5904\u7406\uFF0C\u8BF7\u6062\u590D\u672C\u8F6E\u7ED3\u679C\uFF0C\u4E0D\u8981\u91CD\u590D\u521B\u5EFA\u4EFB\u52A1\u3002","STREAM_INTERRUPTED")}finally{await t.cancel().catch(()=>{}),t.releaseLock()}}var d=n=>document.querySelector(n),Qe=new URL("../../",import.meta.url),v=async(n,e)=>{let t=await fetch(new URL("api/"+n,Qe),{method:e?"POST":"GET",headers:e?{"content-type":"application/json"}:{},body:e?JSON.stringify(e):void 0}),s=await t.json();if(!t.ok||!s.ok)throw Error(s.error?.message||"\u672C\u6B21\u64CD\u4F5C\u672A\u5B8C\u6210");return s.data},A,w="",P=[],S=[],le=!1,_t,de=null,K=!1,ue=null,c=(n,e,t)=>{let s=document.createElement(n);return e!==void 0&&(s.textContent=e),t&&(s.className=t),s},h=n=>d("#message").textContent=n,U=(n,e)=>n.elements.namedItem(e);function Ze(n){w=F(n)?n:"",d("#connected-account").textContent=w||"\u5C1A\u672A\u8FDE\u63A5\u94B1\u5305",d("#connect").textContent=w?"\u5207\u6362\uFF0F\u91CD\u65B0\u8FDE\u63A5 \u2197":"\u8FDE\u63A5 Meteor \u94B1\u5305 \u2197",d("#disconnect").hidden=!w,w&&(U(d("#transfer-form"),"accountId").value=w,U(d("#balance-form"),"accountId").value=w),Nt()}async function Un(){try{if(d("#connect").disabled=!0,h("\u6B63\u5728\u6253\u5F00 Meteor \u5B98\u65B9\u94B1\u5305\uFF0C\u8BF7\u5728\u94B1\u5305\u4E2D\u9009\u62E9\u8D26\u6237\u3002"),!A){let n=await(await fetch("./vendor/manifest.json")).json();for(let e of n.wallets)e.executor=new URL(e.executor,location.href).href,e.icon=new URL(e.icon,location.href).href;A=new It.NearConnector({network:"mainnet",manifest:n,autoConnect:!1,features:{signInWithoutAddKey:!0,signAndSendTransaction:!0},providers:{mainnet:["https://free.rpc.fastnear.com","https://rpc.mainnet.near.org"]},cspNonce:d("#wallet-bundle").nonce}),A.on("wallet:signIn",e=>{Ze(e.accounts?.[0]?.accountId),h("\u94B1\u5305\u5DF2\u8FDE\u63A5\uFF0C\u4E0B\u4E00\u6B65\u53EF\u67E5\u4F59\u989D\u6216\u51C6\u5907\u8F6C\u8D26\u3002")}),A.on("wallet:signOut",()=>Ze(""))}await A.connect({walletId:"meteor-wallet"})}catch{h("\u8FDE\u63A5\u5DF2\u53D6\u6D88\u6216\u672A\u5B8C\u6210\u3002\u53EF\u518D\u6B21\u8FDE\u63A5\uFF1B\u5982\u679C\u6CA1\u6709\u51FA\u73B0\u94B1\u5305\u754C\u9762\uFF0C\u8BF7\u68C0\u67E5\u6D4F\u89C8\u5668\u5F39\u7A97\u8BBE\u7F6E\u3002\u516C\u5F00\u8D26\u6237\u67E5\u8BE2\u4E0E\u9884\u68C0\u4ECD\u53EF\u4F7F\u7528\u3002")}finally{d("#connect").disabled=!1}}d("#connect").addEventListener("click",Un);d("#disconnect").addEventListener("click",async()=>{try{await A.disconnect(await A.wallet("meteor-wallet")),Ze(""),h("\u5DF2\u65AD\u5F00\u5F53\u524D\u94B1\u5305\u3002\u5DF2\u4FDD\u5B58\u4EFB\u52A1\u4ECD\u5728\u672C\u6D4F\u89C8\u5668\u4F1A\u8BDD\u4E2D\u3002")}catch{h("\u65AD\u5F00\u672A\u5B8C\u6210\uFF0C\u8BF7\u5728\u94B1\u5305\u4E2D\u68C0\u67E5\u8FDE\u63A5\u72B6\u6001\u3002")}});var Hn={ready:"\u5F85\u4F60\u786E\u8BA4",blocked:"\u9884\u68C0\u5DF2\u62E6\u622A",incomplete:"\u6761\u4EF6\u5F85\u8865\u67E5",wallet_open:"\u94B1\u5305\u5DF2\u6253\u5F00 \xB7 \u7B49\u5F85\u7ED3\u679C",needs_hash:"\u7ED3\u679C\u5F85\u786E\u8BA4 \xB7 \u9700\u8981\u4EA4\u6613\u54C8\u5E0C",submitted:"\u5DF2\u53D6\u5F97\u54C8\u5E0C \xB7 \u5F85 FINAL",unknown:"\u6838\u9A8C\u6682\u672A\u5B8C\u6210",completed:"\u94FE\u4E0A\u6838\u9A8C\u901A\u8FC7",failed:"\u94FE\u4E0A\u6267\u884C\u5931\u8D25",cancelled:"\u51C6\u5907\u4EFB\u52A1\u5DF2\u53D6\u6D88"};async function E(){try{let n=await v("wallet/status");P=n.tasks||[],de=n.focusTaskId||null,Nt(),Mt(),n.enabled||h("\u94B1\u5305\u4EFB\u52A1\u670D\u52A1\u5C1A\u672A\u542F\u7528\uFF1B\u4F59\u989D\u67E5\u8BE2\u4ECD\u53EF\u4F7F\u7528\u3002")}catch(n){h(n.message)}}function Bn(n,e){let t=c("details"),s=c("summary",n);return t.append(s,c("pre",JSON.stringify(e,null,2))),t}function D(n,e,t=""){let s=c("button",n,t);return s.type="button",s.addEventListener("click",e),s}function et(n){let e=c("section",void 0,"account-result");e.setAttribute("aria-label",n.accountId+" \u8D44\u4EA7\u67E5\u8BE2\u7ED3\u679C");let t=c("div",void 0,"account-result-head"),s=c("div",void 0,"account-result-identity");s.append(c("span","\u8D26\u6237\u8D44\u4EA7","result-eyebrow"),c("h3",n.accountId)),t.append(s,c("span",n.complete?"\u4E3B\u7F51\u5FEB\u7167":"\u90E8\u5206\u6570\u636E\u5F85\u67E5","result-badge"+(n.complete?"":" partial"))),e.append(t);let o=w===n.accountId?"\u5F53\u524D\u8FDE\u63A5\u7684\u94B1\u5305\u8D26\u6237":w?"\u516C\u5F00\u8D26\u6237 \xB7 \u4E0E\u5F53\u524D\u8FDE\u63A5\u94B1\u5305\u4E0D\u540C":"\u516C\u5F00\u8D26\u6237\u67E5\u8BE2 \xB7 \u65E0\u9700\u8FDE\u63A5\u94B1\u5305";e.append(c("p",o,"account-context"));let r=n.assets.find(m=>m.symbol==="NEAR"),a=c("div",void 0,"native-balance");a.append(c("span","NEAR","asset-symbol"));let i=Je(r?.amount),l=c("div",i.text,"native-value");i.approximate&&l.append(c("span","\u7EA6","approximate")),a.append(l,c("span","\u539F\u751F\u4EE3\u5E01\u4F59\u989D","asset-caption")),e.append(a);let u=c("div",void 0,"asset-list");for(let m of n.assets.filter(b=>b.symbol!=="NEAR")){let b=c("div",void 0,"asset-row"),H=c("div",void 0,"asset-identity"),Lt=c("span",m.symbol==="wNEAR"?"wN":"$","asset-mark "+m.symbol.toLowerCase());H.append(Lt,c("span",m.symbol));let tt=Je(m.amount),nt=c("span",tt.text,"asset-amount"+(m.status==="unknown"?" unknown":""));tt.approximate&&nt.append(c("small","\u7EA6")),b.append(H,nt),u.append(b)}e.append(u),n.complete||e.append(c("p","\u672A\u67E5\u5230\u7684\u8D44\u4EA7\u4FDD\u7559\u4E3A\u672A\u77E5\uFF0C\u4E0D\u80FD\u89C6\u4E3A\u96F6\u4F59\u989D\u3002","result-warning"));let p=new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:!1}).format(new Date(n.fetchedAt)),k=c("div",void 0,"result-footer");k.append(c("span","\u67E5\u8BE2\u4E8E "+p+" \xB7 \u5317\u4EAC\u65F6\u95F4"),c("span","final #"+n.blockHeight)),e.append(k);let x=c("details",void 0,"account-evidence");x.append(c("summary","\u7CBE\u786E\u4F59\u989D\u4E0E\u67E5\u8BE2\u4F9D\u636E"));let y=c("dl",void 0,"exact-balances");for(let m of n.assets)y.append(c("dt",m.symbol),c("dd",m.amount??"\u672A\u77E5"));return n.locked!==null&&y.append(c("dt","\u9501\u5B9A NEAR"),c("dd",n.locked)),n.permissions&&y.append(c("dt","\u8BBF\u95EE\u5BC6\u94A5"),c("dd",n.permissions.count+" \u4E2A\uFF0C\u5176\u4E2D FullAccess "+n.permissions.fullAccessCount+" \u4E2A\uFF1B\u4E0D\u6784\u6210\u8D26\u6237\u5B89\u5168\u7ED3\u8BBA\u3002")),y.append(c("dt","\u6570\u636E\u6E90"),c("dd",n.source),c("dt","\u91C7\u96C6\u65F6\u95F4"),c("dd",new Date(n.fetchedAt).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:!1})+" \u5317\u4EAC\u65F6\u95F4"),c("dt","\u533A\u5757\u54C8\u5E0C"),c("dd",n.blockHash)),x.append(y,c("p","\u5C55\u793A\u503C\u6700\u591A\u4FDD\u75594\u4F4D\u5C0F\u6570\uFF1B\u7CBE\u786E\u503C\u5982\u4E0A\u3002\u8303\u56F4\u4E3A\u539F\u751F NEAR\u3001USDC\u3001USDT\u3001wNEAR\uFF1B\u4E0D\u542B\u5176\u4ED6\u4EE3\u5E01\u3001NFT\u3001\u8D28\u62BC\u4EFD\u989D\u6216 Intents \u5185\u90E8\u4F59\u989D\u3002\u4F59\u989D\u4E0D\u7B49\u4E8E\u53EF\u81EA\u7531\u8F6C\u51FA\u7684\u91D1\u989D\u3002","evidence-note")),e.append(x),e}async function T(n,e,t={}){let s=await v("wallet/"+e,{id:n.id,revision:n.revision,...t});return await E(),s}function Nt(){let n=d("#tasks");if(n.replaceChildren(),d("#task-count").textContent=P.length,!P.length){let e=c("div",void 0,"empty");e.append(c("span","\u2197","empty-mark"),c("strong","\u64CD\u4F5C\u8FDB\u5EA6\uFF0C\u4E00\u5904\u8DDF\u8FDB"),c("span","\u51C6\u5907\u8F6C\u8D26\u540E\uFF0C\u5728\u8FD9\u91CC\u67E5\u770B\u9884\u68C0\u3001\u94B1\u5305\u786E\u8BA4\u548C\u5230\u8D26\u7ED3\u679C\u3002")),n.append(e);return}for(let e of P){let t=c("article",void 0,"task"),s=c("span",Hn[e.state]||e.state,"state"+(["blocked","incomplete","unknown","needs_hash","failed"].includes(e.state)?" bad":""));t.append(s,c("h3",e.input.amount+" "+e.input.asset)),e.id===de&&t.append(c("small","\u5F53\u524D\u5BF9\u8BDD\u4EFB\u52A1","focus-badge"));let o=c("dl");for(let[l,u]of[["\u4ED8\u6B3E\u65B9",e.input.accountId],["\u6536\u6B3E\u65B9",e.input.recipient],["\u91D1\u989D\u4E0A\u9650",e.input.maxAmount?e.input.maxAmount+" "+e.input.asset:"\u672A\u6307\u5B9A"],["\u521B\u5EFA\u65F6\u95F4",new Date(e.createdAt).toLocaleString("zh-CN",{hour12:!1})],["\u4EFB\u52A1\u7F16\u53F7",e.id.slice(0,8)]])o.append(c("dt",l),c("dd",u));t.append(o);let r=c("div",void 0,"step-list"),a=["ready","blocked","incomplete","cancelled"].includes(e.state)?1:["wallet_open","needs_hash"].includes(e.state)?2:e.state==="completed"?4:3;for(let l=0;l<4;l++)r.append(c("span",void 0,l<a?"done":""));t.append(r);for(let l of e.preflight.checks)t.append(c("p",l.detail,"check "+l.status));if(e.state==="ready"){let l=c("label",void 0,"review"),u=document.createElement("input");u.type="checkbox",l.append(u,c("span","\u6211\u5DF2\u6838\u5BF9\u4E3B\u7F51\u3001\u4ED8\u6B3E\u8D26\u6237\u3001\u6536\u6B3E\u8D26\u6237\u3001\u8D44\u4EA7\u4E0E\u91D1\u989D\uFF1B\u4E0B\u4E00\u6B65\u5C06\u6253\u5F00\u94B1\u5305\uFF0C\u53EF\u80FD\u4EA7\u751F\u771F\u5B9E\u8D44\u91D1\u8F6C\u79FB\u3002"));let p=D("\u6253\u5F00\u94B1\u5305\u786E\u8BA4\u8F6C\u8D26 \u2197",()=>Vn(e),"primary");p.disabled=!0,u.addEventListener("change",()=>p.disabled=!u.checked||!w||w!==e.input.accountId||le),t.append(l,p),(!w||w!==e.input.accountId)&&t.append(c("p","\u6267\u884C\u524D\u8BF7\u8FDE\u63A5\u4E0E\u4ED8\u6B3E\u65B9\u4E00\u81F4\u7684 Meteor \u4E3B\u7F51\u8D26\u6237\u3002","task-note"))}if(["wallet_open","needs_hash"].includes(e.state)){t.append(c("p","\u82E5\u4F60\u5DF2\u5728\u94B1\u5305\u63D0\u4EA4\uFF0C\u8BF7\u7C98\u8D34\u8BE5\u7B14\u4EA4\u6613\u54C8\u5E0C\u3002\u53D6\u6D88\u6216\u5173\u95ED\u5F39\u7A97\u4E5F\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\uFF1B\u5148\u5728\u94B1\u5305\u6838\u5BF9\u662F\u5426\u5DF2\u6709\u4EA4\u6613\u3002","task-note"));let l=c("form",void 0,"hash-form"),u=c("input");u.placeholder="\u7C98\u8D34\u94B1\u5305\u4E2D\u7684 NEAR \u4EA4\u6613\u54C8\u5E0C",u.required=!0,u.maxLength=44,u.setAttribute("aria-label","\u4EA4\u6613\u54C8\u5E0C");let p=c("button","\u5173\u8054\u54C8\u5E0C\u5E76\u6838\u9A8C");l.append(u,p),l.addEventListener("submit",async k=>{k.preventDefault();try{if(!ze(u.value.trim()))throw Error("\u4EA4\u6613\u54C8\u5E0C\u683C\u5F0F\u65E0\u6548");p.disabled=!0;let x=await T(e,"result",{attemptId:e.attemptId,txHash:u.value.trim()});await Xe(x),M()}catch(x){h(x.message),p.disabled=!1}}),t.append(l)}if(e.txHash){t.append(c("p","\u4EA4\u6613\uFF1A"+e.txHash,"task-note"));let l=c("a","\u5728 NEAR Explorer \u67E5\u770B \u2197");l.href="https://nearblocks.io/txns/"+encodeURIComponent(e.txHash),l.target="_blank",l.rel="noopener noreferrer",t.append(l)}if(e.tracking){let l={active:"\u540E\u53F0\u8FFD\u8E2A\u4E2D",paused:"\u540E\u53F0\u5DF2\u6682\u505C",expired:"\u8FFD\u8E2A\u5DF2\u5230\u671F",exhausted:"\u5DF2\u8FBE\u8FFD\u8E2A\u6B21\u6570\u4E0A\u9650"};t.append(c("p",(l[e.tracking.state]||e.tracking.state)+" \xB7 "+e.tracking.attempts+"/"+e.tracking.maxChecks+" \u6B21 \xB7 \u5230\u671F "+new Date(e.tracking.expiresAt).toLocaleString("zh-CN",{hour12:!1}),"tracking-note"))}e.report&&t.append(c("p",e.report.message||e.report.error?.message||"\u7B49\u5F85\u6838\u9A8C","task-note"));let i=c("div",void 0,"actions");i.append(D(e.id===de?"\u6B63\u5728\u8BA8\u8BBA\u8FD9\u7B14\u4EFB\u52A1":"\u5728\u5BF9\u8BDD\u91CC\u8BA8\u8BBA\u8FD9\u7B14",async()=>{try{await v("wallet/focus",{id:e.id}),await E(),d("#chat-input").value="\u770B\u770B\u8FD9\u7B14\u4EFB\u52A1\u73B0\u5728\u662F\u4EC0\u4E48\u72B6\u6001\u3002",d("#chat-input").focus()}catch(l){h(l.message)}})),e.txHash&&["submitted","unknown"].includes(e.state)&&i.append(D(e.tracking?.state==="active"?"\u6682\u505C\u540E\u53F0\u6838\u9A8C":"\u7EED\u671F24\u5C0F\u65F6\u540E\u53F0\u6838\u9A8C",async()=>{try{await T(e,"tracking",{action:e.tracking?.state==="active"?"pause":"resume"}),M()}catch(l){h(l.message)}})),["submitted","unknown"].includes(e.state)&&i.append(D("\u91CD\u65B0\u6838\u9A8C\u94FE\u4E0A\u7ED3\u679C \u21BB",async()=>{await Xe(e),M()})),["ready","blocked","incomplete"].includes(e.state)&&i.append(D("\u53D6\u6D88\u51C6\u5907\u4EFB\u52A1",async()=>{try{await T(e,"cancel"),h("\u5DF2\u53D6\u6D88\u6B64\u51C6\u5907\u4EFB\u52A1\u3002")}catch(l){h(l.message)}})),t.append(i,Bn("\u67E5\u770B\u9884\u68C0\u4E0E\u6267\u884C\u8BC1\u636E",{...e,scope:"\u4EFB\u52A1\u4F1A\u8BDD\u4E0D\u9A8C\u8BC1\u94B1\u5305\u6240\u6709\u6743\uFF1B\u6240\u6709\u8F6C\u8D26\u4EC5\u80FD\u7531\u94B1\u5305\u786E\u8BA4\u3002"})),n.append(t)}}function zn(n){let e=n.preflight.walletRequest,t=n.input,s=t.asset==="NEAR"?24:Be[t.asset]?.decimals,o=Ve(t.amount,s);if(!e||e.signerId!==w||e.signerId!==t.accountId||e.actions?.length!==1||Date.parse(n.preflight.expiresAt)<=Date.now())throw Error("\u94B1\u5305\u8D26\u6237\u3001\u4EFB\u52A1\u6216\u9884\u68C0\u65F6\u6548\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u6838\u5BF9");let r=e.actions[0];if(t.asset==="NEAR"){if(e.receiverId!==t.recipient||r.type!=="Transfer"||r.params.deposit!==o)throw Error("\u8F6C\u8D26\u53C2\u6570\u4E0D\u4E00\u81F4")}else if(e.receiverId!==Be[t.asset].contract||r.type!=="FunctionCall"||r.params.methodName!=="ft_transfer"||r.params.args.receiver_id!==t.recipient||r.params.args.amount!==o||r.params.deposit!=="1"||r.params.gas!=="30000000000000")throw Error("\u4EE3\u5E01\u8F6C\u8D26\u53C2\u6570\u4E0D\u4E00\u81F4");if(t.maxAmount&&BigInt(o)>BigInt(Ve(t.maxAmount,s)))throw Error("\u91D1\u989D\u8D85\u8FC7\u672C\u6B21\u4E0A\u9650");return e}async function Vn(n){if(le)return;le=!0;let e;try{if(!A||w!==n.input.accountId)throw Error("\u8BF7\u5148\u8FDE\u63A5\u76F8\u540C\u4ED8\u6B3E\u8D26\u6237\u7684\u94B1\u5305");h("\u6B63\u5728\u91CD\u65B0\u68C0\u67E5\u94FE\u4E0A\u6761\u4EF6\u2026");let t=await A.wallet("meteor-wallet");if(!(await t.getAccounts({network:"mainnet"})).some(l=>l.accountId===n.input.accountId))throw Error("\u94B1\u5305\u5F53\u524D\u8D26\u6237\u4E0E\u4EFB\u52A1\u4E0D\u4E00\u81F4");if(e=await T(n,"open",{accountId:w}),e.state!=="wallet_open"){h("\u6700\u65B0\u9884\u68C0\u672A\u901A\u8FC7\uFF0C\u8BF7\u67E5\u770B\u4EFB\u52A1\u68C0\u67E5\u9879\u3002");return}let o=zn(e);h("\u8BF7\u5728 Meteor \u94B1\u5305\u4E2D\u6838\u5BF9\u5E76\u51B3\u5B9A\u662F\u5426\u7B7E\u540D\u3002\u7F51\u9875\u4E0D\u4F1A\u66FF\u4F60\u786E\u8BA4\u3002");let a=(await t.signAndSendTransaction({...o,network:"mainnet"}))?.transaction?.hash;if(!ze(a))throw Error("\u94B1\u5305\u672A\u8FD4\u56DE\u53EF\u6838\u9A8C\u7684\u4EA4\u6613\u54C8\u5E0C");let i=await T(e,"result",{attemptId:e.attemptId,txHash:a});h("\u94B1\u5305\u8FD4\u56DE\u4E86\u4EA4\u6613\u54C8\u5E0C\uFF0C\u6B63\u5728\u72EC\u7ACB\u6838\u9A8C\u94FE\u4E0A\u7ED3\u679C\u2026"),await Xe(i),M()}catch(t){if(e?.state==="wallet_open"){try{await T(e,"result",{attemptId:e.attemptId})}catch{}h("\u94B1\u5305\u64CD\u4F5C\u7ED3\u679C\u672A\u786E\u8BA4\u3002\u8BF7\u5148\u68C0\u67E5\u94B1\u5305\u4EA4\u6613\u8BB0\u5F55\uFF0C\u5DF2\u63D0\u4EA4\u65F6\u7C98\u8D34\u4EA4\u6613\u54C8\u5E0C\uFF1B\u672C\u4EFB\u52A1\u4E0D\u4F1A\u81EA\u52A8\u91CD\u53D1\u3002")}else h(t.message||"\u94B1\u5305\u64CD\u4F5C\u672A\u5B8C\u6210")}finally{le=!1,await E()}}async function Xe(n){try{await T(n,"check")}catch(e){h(e.message)}}function M(){clearTimeout(_t),P.some(n=>["submitted","unknown"].includes(n.state)&&n.tracking?.state==="active")&&(_t=setTimeout(Gn,1e4))}async function Gn(){await E(),M()}d("#refresh").addEventListener("click",async()=>{await E(),M()});function Pt(n){d("#transfer-form").hidden=!n,d("#balance-form").hidden=n,d("#balances").hidden=n,d("#transfer-tab").classList.toggle("selected",n),d("#balance-tab").classList.toggle("selected",!n)}d("#balance-tab").addEventListener("click",()=>Pt(!1));d("#transfer-tab").addEventListener("click",()=>Pt(!0));d("#balance-example").addEventListener("click",()=>U(d("#balance-form"),"accountId").value="wrap.near");d("#blocked-demo").addEventListener("click",()=>{let n=d("#transfer-form");for(let[e,t]of Object.entries({accountId:"wrap.near",recipient:"v2.ref-finance.near",asset:"NEAR",amount:"0.01",maxAmount:"0.001"}))U(n,e).value=t;h("\u8FD9\u662F\u516C\u5F00\u8D26\u6237\u7684\u53EA\u8BFB\u62E6\u622A\u793A\u4F8B\uFF0C\u4E0D\u4EE3\u8868\u4F60\u62E5\u6709\u8BE5\u8D26\u6237\u3002\u70B9\u51FB\u68C0\u67E5\u540E\u4F1A\u770B\u5230\u91D1\u989D\u8D85\u8FC7\u4E0A\u9650\u3002")});d("#balance-form").addEventListener("submit",async n=>{n.preventDefault();let e=n.currentTarget,t=e.querySelector("button");t.disabled=!0;try{let s=U(e,"accountId").value.trim();if(!F(s))throw Error("\u8BF7\u8F93\u5165\u6709\u6548 NEAR \u516C\u5F00\u8D26\u6237");h("\u6B63\u5728\u8BFB\u53D6\u4E3B\u7F51 final \u533A\u5757\u4E2D\u7684\u4F59\u989D\u2026");let o=await v("agent/run",{task:"account_inspect",input:{accountId:s}}),r=d("#balances");r.replaceChildren();let a=Ye(o);if(a)r.append(et(a));else throw Error("\u672C\u6B21\u7ED3\u679C\u7F3A\u5C11\u53EF\u5C55\u793A\u7684\u8D26\u6237\u6570\u636E\uFF0C\u8BF7\u91CD\u65B0\u67E5\u8BE2");h("\u4F59\u989D\u67E5\u8BE2\u5B8C\u6210\uFF1B\u5931\u8D25\u9879\u76EE\u4FDD\u7559\u672A\u77E5\u72B6\u6001\u3002")}catch(s){h(s.message)}finally{t.disabled=!1}});d("#transfer-form").addEventListener("submit",async n=>{n.preventDefault();let e=n.currentTarget,t=e.querySelector("button");t.disabled=!0;try{let s=Object.fromEntries([...new FormData(e)].map(([o,r])=>[o,r.trim()]));s.maxAmount||delete s.maxAmount,h("\u6B63\u5728\u68C0\u67E5\u94FE\u4E0A\u6761\u4EF6\u5E76\u4FDD\u5B58\u4EFB\u52A1\u2026"),await v("wallet/prepare",s),await E(),h("\u4EFB\u52A1\u5DF2\u4FDD\u5B58\u3002\u8BF7\u67E5\u770B\u68C0\u67E5\u7ED3\u679C\uFF1B\u901A\u8FC7\u540E\u7531\u4F60\u4E3B\u52A8\u6253\u5F00\u94B1\u5305\u3002")}catch(s){h(s.message)}finally{t.disabled=!1}});document.querySelectorAll("[data-prompt]").forEach(n=>n.addEventListener("click",()=>{d("#chat-input").value=n.dataset.prompt,d("#chat-input").focus()}));function he(n,e,t={}){let s=c("article",void 0,n),o=c("div",void 0,"reply-text");if(n==="assistant"&&t.accountView)if(s.classList.add("has-account"),s.append(et(t.accountView)),o.innerHTML=ce(e),e.length<=450)o.classList.add("account-summary"),s.append(o);else{let r=c("details",void 0,"agent-explanation");r.append(c("summary","\u67E5\u770B Agent \u8BF4\u660E")),r.append(o),s.append(r)}else n==="assistant"?(o.innerHTML=ce(e),s.append(o)):s.append(c("div",e,"reply-text"));if(t.tools?.length){let r=c("details",void 0,"tool-evidence");r.append(c("summary","\u672C\u6B21\u4F7F\u7528\u7684\u5DE5\u5177"),c("p",t.tools.map(a=>a.name+(a.status==="failed"?"\uFF08\u672A\u5B8C\u6210\uFF09":"")).join(" \u2192 "))),s.append(r)}return d("#chat-log").append(s),d("#chat-log").scrollTop=d("#chat-log").scrollHeight,s}var Jn={inspect_account:"\u8BFB\u53D6\u4E3B\u7F51\u4F59\u989D\u4E0E\u8D26\u6237\u6743\u9650",compare_account:"\u6838\u5BF9\u8D26\u6237\u53D8\u5316",prepare_wallet_transfer:"\u68C0\u67E5\u6761\u4EF6\u5E76\u4FDD\u5B58\u4EFB\u52A1",get_wallet_task:"\u8BFB\u53D6\u5F53\u524D\u8BA8\u8BBA\u4EFB\u52A1",list_wallet_tasks:"\u8BFB\u53D6\u4EFB\u52A1\u5217\u8868",check_wallet_task:"\u6838\u9A8C\u94FE\u4E0A\u6267\u884C\u7ED3\u679C",cancel_wallet_task:"\u53D6\u6D88\u5C1A\u672A\u6253\u5F00\u94B1\u5305\u7684\u4EFB\u52A1",network_status:"\u67E5\u8BE2\u4E3B\u7F51\u533A\u5757",verify_receipt:"\u6838\u5BF9\u5230\u8D26\u6536\u636E",investigate_payment:"\u6392\u67E5\u6536\u6B3E\u8BC1\u636E",provider_status:"\u67E5\u8BE2\u5151\u6362\u6E20\u9053\u72B6\u6001",preflight_transfer:"\u68C0\u67E5\u8F6C\u8D26\u6761\u4EF6"};async function Tt(n,e){if(K)return;K=!0,d("#chat-send").disabled=!0,d("#clear-chat").disabled=!0,d("#chat-log").setAttribute("aria-busy","true"),h("");let t=e||c("article",void 0,"assistant");t.className="assistant is-streaming";let s=c("div","\u6B63\u5728\u8FDE\u63A5 Agent\u2026","stream-status"),o=c("div",void 0,"stream-card"),r=c("div",void 0,"reply-text stream-answer");r.hidden=!0,t.replaceChildren(s,o,r),e||d("#chat-log").append(t);let a="",i=null,l=null,u=()=>{let y=d("#chat-log");return y.scrollHeight-y.scrollTop-y.clientHeight<180},p=y=>{if(y){let m=d("#chat-log");m.scrollTop=m.scrollHeight}},k=()=>{l=null;let y=u();r.hidden=!a,r.innerHTML=ce(a),p(y)},x=()=>{l===null&&(l=requestAnimationFrame(k))};try{let y=await fetch(new URL("api/wallet/chat",Qe),{method:"POST",headers:{"content-type":"application/json",accept:"text/event-stream"},body:JSON.stringify(n),signal:AbortSignal.timeout(85e3)}),m=await Ct(y,b=>{if(b.type==="accepted"&&(s.textContent="\u5DF2\u6536\u5230\uFF0C\u6B63\u5728\u7406\u89E3\u4F60\u7684\u9700\u6C42\u2026"),b.type==="text_reset"&&(a="",x()),b.type==="text_delta"&&typeof b.delta=="string"&&(a+=b.delta,s.textContent="\u6B63\u5728\u751F\u6210\u56DE\u7B54\u2026",x()),b.type==="tool_start"&&(s.textContent="\u6B63\u5728"+(Jn[b.name]||"\u67E5\u8BE2\u6570\u636E")+"\u2026"),b.type==="tool_result"){if(s.textContent=b.status==="completed"?"\u67E5\u8BE2\u7ED3\u679C\u5DF2\u8FD4\u56DE\uFF0C\u6B63\u5728\u6574\u7406\u8BF4\u660E\u2026":"\u8BE5\u6B65\u9AA4\u672A\u5B8C\u6210\uFF0C\u6B63\u5728\u8BF4\u660E\u539F\u56E0\u2026",b.accountView){let H=u();i=b.accountView,o.replaceChildren(et(i)),p(H)}b.taskUpdated&&E()}});l!==null&&(cancelAnimationFrame(l),l=null),t.remove(),S.push({role:"assistant",content:m.answer.slice(0,2e3)}),he("assistant",m.answer,{accountView:m.accountView||i||Et(m.tools),tools:m.tools})}catch(y){l!==null&&(cancelAnimationFrame(l),k()),t.classList.remove("is-streaming"),s.classList.add("stream-error"),s.textContent=y.message||"\u8FDE\u63A5\u4E2D\u65AD\uFF0C\u672C\u8F6E\u5C1A\u672A\u786E\u8BA4\u5B8C\u6210\u3002";let m=D("\u6062\u590D\u672C\u8F6E\u7ED3\u679C",()=>Tt(n,t),"recover-turn");t.append(m,c("small","\u6062\u590D\u4F1A\u4F7F\u7528\u540C\u4E00\u8BF7\u6C42\u7F16\u53F7\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u91CD\u653E\u6216\u65B0\u5EFA\u8F6C\u8D26\u3002","stream-recovery-note")),h("\u53EF\u4EE5\u6062\u590D\u672C\u8F6E\u7ED3\u679C\uFF0C\u6216\u5237\u65B0\u9875\u9762\u67E5\u770B\u5DF2\u4FDD\u5B58\u7684\u5BF9\u8BDD\u548C\u4EFB\u52A1\u3002")}finally{await E(),d("#chat-send").disabled=!1,K=!1,d("#clear-chat").disabled=!1,d("#chat-log").setAttribute("aria-busy","false"),Mt()}}d("#chat-form").addEventListener("submit",async n=>{n.preventDefault();let e=d("#chat-input"),t=e.value.trim();if(!(!t||K)){if(/sk-[\w-]{16,}|ed25519:[1-9A-HJ-NP-Za-km-z]{80,}|(?:私钥|助记词|seed phrase|mnemonic|private key)\s*[:：=]\s*\S+/i.test(t)){h("\u8BF7\u79FB\u9664\u5BC6\u94A5\u6216\u52A9\u8BB0\u8BCD\u540E\u518D\u53D1\u9001\u3002");return}S.push({role:"user",content:t}),S=S.slice(-9),he("user",t),e.value="",await Tt({messages:[{role:"user",content:t}],requestId:crypto.randomUUID(),...w?{walletAccountId:w}:{}})}});d("#chat-input").addEventListener("keydown",n=>{n.key==="Enter"&&!n.shiftKey&&!n.isComposing&&(n.preventDefault(),d("#chat-send").disabled||d("#chat-form").requestSubmit())});function Mt(){let n=P.find(e=>e.id===de);d("#conversation-focus").hidden=!n,d("#conversation-focus").textContent=n?"\u6B63\u5728\u8BA8\u8BBA "+n.input.amount+" "+n.input.asset+" \u2192 "+n.input.recipient:""}async function Yn(){try{if(S=(await v("wallet/conversation")).messages||[],S.length){d("#chat-log").replaceChildren();for(let e of S)he(e.role,e.content,{accountView:e.accountView})}d("#conversation-status").textContent=S.length?"\u5DF2\u6062\u590D\u6700\u8FD1\u5BF9\u8BDD":"\u53EF\u4EE5\u76F4\u63A5\u67E5\u8BE2\u516C\u5F00\u8D26\u6237"}catch{d("#conversation-status").textContent="\u5BF9\u8BDD\u8BB0\u5F55\u6682\u672A\u6062\u590D\uFF0C\u53EF\u91CD\u8BD5\u5237\u65B0"}}d("#clear-chat").addEventListener("click",async()=>{if(!(K||!confirm("\u6E05\u7A7A\u5F53\u524D\u670D\u52A1\u5668\u5BF9\u8BDD\u4E0D\u53EF\u6062\u590D\uFF0C\u4EFB\u52A1\u8BB0\u5F55\u4ECD\u4FDD\u7559\u3002\u786E\u5B9A\u6E05\u7A7A\uFF1F")))try{await v("wallet/conversation/reset",{}),S=[],d("#chat-log").replaceChildren(),he("assistant","\u5DF2\u6E05\u7A7A\u5BF9\u8BDD\uFF0C\u4EFB\u52A1\u8BB0\u5F55\u4ECD\u4FDD\u7559\u3002"),h("\u5BF9\u8BDD\u5DF2\u6E05\u7A7A\u3002")}catch(n){h(n.message)}});d("#create-access").addEventListener("click",async()=>{let n=d("#create-access");n.disabled=!0;try{let e=await v("wallet/access/create",{});ue={mcpServers:{flowtraceTasks:{url:new URL("mcp/tasks",Qe).href,headers:{Authorization:"Bearer "+e.token}}}},d("#access-value").value=e.token,d("#access-value-label").hidden=!1,d("#copy-access").disabled=!1,d("#access-status").textContent="\u65B0\u4EE4\u724C\u4E8E "+new Date(e.expiresAt).toLocaleString("zh-CN",{hour12:!1})+" \u5230\u671F\u3002\u4EC5\u672C\u6B21\u53EF\u590D\u5236\uFF0C\u8BF7\u4FDD\u5B58\u5230\u81EA\u5DF1\u7684 Agent \u79C1\u5BC6\u914D\u7F6E\u4E2D\u3002"}catch(e){h(e.message)}finally{n.disabled=!1}});d("#copy-access").addEventListener("click",async()=>{if(ue)try{await navigator.clipboard.writeText(JSON.stringify(ue,null,2)),d("#access-status").textContent="MCP \u914D\u7F6E\u5DF2\u590D\u5236\uFF0C\u8BF7\u4FDD\u5B58\u5728\u81EA\u5DF1\u7684\u79C1\u5BC6\u914D\u7F6E\u6587\u4EF6\u4E2D\uFF0C\u4E0D\u8981\u8D34\u5230\u516C\u5F00\u804A\u5929\u6216\u4ED3\u5E93\u3002"}catch{h("\u590D\u5236\u672A\u5B8C\u6210\uFF0C\u8BF7\u68C0\u67E5\u6D4F\u89C8\u5668\u526A\u8D34\u677F\u6743\u9650\u3002")}});d("#revoke-access").addEventListener("click",async()=>{try{await v("wallet/access/revoke",{}),ue=null,d("#access-value").value="",d("#access-value-label").hidden=!0,d("#copy-access").disabled=!0,d("#access-status").textContent="\u672C\u4F1A\u8BDD\u5168\u90E8\u5916\u90E8\u8BBF\u95EE\u4EE4\u724C\u5DF2\u64A4\u9500\u3002"}catch(n){h(n.message)}});v("wallet/access/status").then(n=>{n.active&&(d("#access-status").textContent="\u5F53\u524D\u6709 "+n.active+" \u4E2A\u6709\u6548\u4EE4\u724C\uFF0C\u6743\u9650\u4EC5\u9650\u672C\u4F1A\u8BDD\u4EFB\u52A1\u8BFB\u53D6\u4E0E\u6838\u9A8C\u3002")}).catch(()=>{});await Yn();await E();v("agent/chat/status").then(n=>{d("#model-status").textContent=n.available?"Agent \u5DF2\u5C31\u7EEA":"\u53EF\u4F7F\u7528\u76F4\u63A5\u64CD\u4F5C",d("#model-status").classList.toggle("offline",!n.available),d("#chat-send").disabled=!n.available}).catch(()=>d("#model-status").textContent="\u6A21\u578B\u72B6\u6001\u672A\u77E5");P.some(n=>["submitted","unknown"].includes(n.state))&&M();
