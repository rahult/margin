// Anonymous usage telemetry (GA4 via gtag.js, loaded only after an explicit
// opt-in). Never sends document content, titles, or API keys.
const GA_ID='G-58CY9FQ3NE';
const CONSENT_KEY='margin.analyticsConsent';
const CID_KEY='margin.analyticsCid';

export type Consent='yes'|'no'|null;
export const getConsent=():Consent=>{const v=localStorage.getItem(CONSENT_KEY);return v==='yes'||v==='no'?v:null};
export const setConsent=(v:'yes'|'no')=>localStorage.setItem(CONSENT_KEY,v);

declare global{interface Window{dataLayer?:unknown[];gtag?:(...args:unknown[])=>void}}

function clientId():string{
 let id=localStorage.getItem(CID_KEY);
 if(!id){id=crypto.randomUUID();localStorage.setItem(CID_KEY,id)}
 return id;
}

let loaded=false;
function loadAnalytics(){
 if(loaded)return;
 loaded=true;
 const s=document.createElement('script');
 s.async=true;
 s.src=`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
 document.head.appendChild(s);
 window.dataLayer=window.dataLayer||[];
 window.gtag=(...args:unknown[])=>{window.dataLayer!.push(args)};
 window.gtag('js',new Date());
 // Persisted client id keeps sessions stitched even though tauri:// cookies don't.
 window.gtag('config',GA_ID,{client_id:clientId(),anonymize_ip:true});
}

export function track(event:string,params:Record<string,string|number>={}){
 if(getConsent()!=='yes')return;
 loadAnalytics();
 window.gtag?.('event',event,{app:'margin',...params});
}
