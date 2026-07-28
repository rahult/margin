// Local neural TTS playback: sentence chunks → local speech server → audio.
// Prefers a running Chirp app (127.0.0.1:8789) so one speech engine is shared
// across apps; falls back to Margin's embedded proxy (8787). Fully local:
// the server runs a Kokoro model on-device; no audio leaves the machine.

export function chunkText(t:string):string[]{
 return t.replace(/\s+/g,' ').match(/[^.!?]+[.!?]+[\]"'”’)]*\s*|\S[^.!?]*$/g)?.map(s=>s.trim()).filter(Boolean)??[];
}

const IN_TAURI=typeof window!=='undefined'&&window.location.protocol==='tauri:';
const CANDIDATES=IN_TAURI?['http://127.0.0.1:8789','http://127.0.0.1:8787']:[''];
let resolved:string|null=null;

async function ttsBase(signal:AbortSignal):Promise<string>{
 if(resolved!==null)return resolved;
 for(const b of CANDIDATES){
  if(!b)return b; // browser dev: same origin
  try{const r=await fetch(b+'/api/health',{signal});if(r.ok){resolved=b;return b}}catch{/* try next */}
 }
 resolved=CANDIDATES[CANDIDATES.length-1];
 return resolved;
}

export function createNarrator(){
 let audio:HTMLAudioElement|null=null;
 let abort:AbortController|null=null;

 const stop=()=>{
  abort?.abort();
  audio?.pause();
  audio=null; abort=null;
 };

 const fetchWav=async(text:string,signal:AbortSignal):Promise<string>=>{
  const base=await ttsBase(signal);
  const r=await fetch(base+'/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal});
  if(!r.ok){
   const data=await r.json().catch(()=>({}));
   throw new Error((data as {error?:string}).error??`TTS request failed (${r.status})`);
  }
  return URL.createObjectURL(await r.blob());
 };

 const play=(url:string,signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{
  const el=new Audio(url);
  audio=el;
  el.onended=()=>{URL.revokeObjectURL(url);resolve()};
  el.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Audio playback failed.'))};
  signal.addEventListener('abort',()=>{el.pause();URL.revokeObjectURL(url);resolve()},{once:true});
  el.play().catch(reject);
 });

 // Narrate the whole text chunk by chunk, prefetching one chunk ahead.
 // Resolves when finished or when aborted via stop().
 const narrate=async(text:string,isCurrent:()=>boolean)=>{
  abort=new AbortController();
  const {signal}=abort;
  const chunks=chunkText(text);
  if(!chunks.length)return;
  let next=fetchWav(chunks[0],signal);
  for(let i=0;i<chunks.length;i++){
   const url=await next;
   if(signal.aborted||!isCurrent())return;
   next=i+1<chunks.length?fetchWav(chunks[i+1],signal):Promise.resolve('');
   await play(url,signal);
   if(signal.aborted||!isCurrent())return;
  }
 };

 return {stop,narrate};
}
