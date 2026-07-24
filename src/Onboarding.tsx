import {useState} from 'react';
import {BookOpen,KeyRound,Loader2,Sparkles} from 'lucide-react';
import {chat,saveConfig} from './llm';

type TestState='idle'|'testing'|'ok'|'error';

export function Onboarding({onDone}:{onDone:(model:string)=>void}){
 const [apiKey,setApiKey]=useState('');
 const [baseUrl,setBaseUrl]=useState('https://api.openai.com/v1');
 const [model,setModel]=useState('gpt-4o-mini');
 const [test,setTest]=useState<TestState>('idle');
 const [error,setError]=useState('');

 const persist=()=>saveConfig({apiKey,baseUrl,model});

 const testConnection=async()=>{
  setTest('testing'); setError('');
  try{
   await persist();
   const reply=await chat([{role:'user',content:'Reply with the single word: ready'}],16);
   if(!reply.trim())throw new Error('The model returned an empty reply.');
   setTest('ok');
  }catch(e){setTest('error');setError(e instanceof Error?e.message:String(e))}
 };

 const start=async()=>{
  try{
   if(test!=='ok')await persist();
   localStorage.setItem('margin.onboarded','1');
   onDone(model);
  }catch(e){setTest('error');setError(e instanceof Error?e.message:String(e))}
 };

 return <div className="onboarding">
  <div className="onboarding-card">
   <div className="brand"><div className="mark">M</div><span>Margin</span></div>
   <h1>Read what matters, with a companion that thinks alongside you.</h1>
   <p className="lede">Margin turns dense documents into a guided argument. To power the thinking companion, connect your own model — your key stays on this machine, inside a local proxy.</p>
   <div className="field"><label htmlFor="ob-key"><KeyRound size={13}/> API key</label>
    <input id="ob-key" type="password" value={apiKey} onChange={e=>{setApiKey(e.target.value);setTest('idle')}} placeholder="sk-…" autoComplete="off"/></div>
   <div className="field-row">
    <div className="field"><label htmlFor="ob-url">Base URL</label>
     <input id="ob-url" value={baseUrl} onChange={e=>{setBaseUrl(e.target.value);setTest('idle')}} placeholder="https://api.openai.com/v1"/></div>
    <div className="field"><label htmlFor="ob-model">Model</label>
     <input id="ob-model" value={model} onChange={e=>{setModel(e.target.value);setTest('idle')}} placeholder="gpt-4o-mini"/></div>
   </div>
   {test==='ok'&&<p className="test-result ok"><Sparkles size={14}/> Connected — the companion is ready.</p>}
   {test==='error'&&<p className="test-result error">{error}</p>}
   <div className="onboarding-actions">
    <button className="secondary" disabled={!apiKey.trim()||test==='testing'} onClick={testConnection}>
     {test==='testing'?<Loader2 size={15} className="spin"/>:null} Test connection</button>
    <button className="primary" disabled={!apiKey.trim()||test==='testing'} onClick={start}>
     <BookOpen size={15}/> Start reading</button>
   </div>
   <p className="hint">Works with any OpenAI-compatible endpoint — OpenAI, Anthropic proxies, or a local server such as Ollama. Credentials are written to <code>.env</code> and served only via the local proxy.</p>
  </div>
 </div>;
}
