import {useEffect,useState} from 'react';
import {Check,KeyRound,Settings as SettingsIcon,X} from 'lucide-react';
import {getStatus,saveConfig} from './llm';
import {getConsent,setConsent,track} from './telemetry';

export function SettingsDialog({model,onClose,onSaved}:{model:string;onClose:()=>void;onSaved:(model:string)=>void}){
 const [apiKey,setApiKey]=useState('');
 const [baseUrl,setBaseUrl]=useState('');
 const [modelName,setModelName]=useState(model);
 const [telemetry,setTelemetry]=useState(getConsent()==='yes');
 const [saved,setSaved]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{getStatus().then(s=>{setBaseUrl(s.baseUrl);setModelName(s.model)}).catch(()=>{})},[]);
 const save=async()=>{
  setError('');
  try{
   const s=await saveConfig({apiKey,baseUrl,model:modelName});
   const was=getConsent();
   setConsent(telemetry?'yes':'no');
   if(telemetry&&was!=='yes')track('app_start');
   setSaved(true); onSaved(s.model);
   setTimeout(onClose,900);
  }catch(e){setError(e instanceof Error?e.message:String(e))}
 };
 return <div className="verdict-backdrop" onClick={onClose}>
  <div className="verdict-card agents-dialog" onClick={e=>e.stopPropagation()}>
   <button className="agents-close" onClick={onClose}><X size={16}/></button>
   <div className="label"><SettingsIcon size={14}/> Settings</div>
   <h2>Companion connection</h2>
   <div className="field"><label htmlFor="set-key"><KeyRound size={13}/> API key</label>
    <input id="set-key" type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="Leave blank to keep the current key" autoComplete="off"/></div>
   <div className="field-row">
    <div className="field"><label htmlFor="set-url">Base URL</label>
     <input id="set-url" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1"/></div>
    <div className="field"><label htmlFor="set-model">Model</label>
     <input id="set-model" value={modelName} onChange={e=>setModelName(e.target.value)} placeholder="gpt-4o-mini"/></div>
   </div>
   <label className="settings-telemetry"><input type="checkbox" checked={telemetry} onChange={e=>setTelemetry(e.target.checked)}/> Share anonymous usage stats — never document content, titles, or keys.</label>
   {error&&<p className="test-result error">{error}</p>}
   <div className="onboarding-actions">
    <button className="primary" onClick={save}>{saved?<Check size={15}/>:null} {saved?'Saved':'Save'}</button>
   </div>
  </div>
 </div>;
}
