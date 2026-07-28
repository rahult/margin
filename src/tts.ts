// Local neural TTS playback via Chirp — the shared on-device speech server
// (127.0.0.1:8789, chirp.rahultrikha.com). Sentence chunks → /api/tts → audio.
// No audio leaves the machine.

export function chunkText(t:string):string[]{
 return t.replace(/\s+/g,' ').match(/[^.!?]+[.!?]+[\]"'”’)]*\s*|\S[^.!?]*$/g)?.map(s=>s.trim()).filter(Boolean)??[];
}

const BASE=typeof window!=='undefined'&&window.location.protocol==='tauri:'?'http://127.0.0.1:8789':'';

// Is the Chirp app up? Fast probe — drives the Listen button's install prompt.
export async function chirpAvailable():Promise<boolean>{
 if(!BASE)return true; // browser dev: same-origin proxy
 try{
  const r=await fetch(BASE+'/api/health',{signal:AbortSignal.timeout(800)});
  return r.ok;
 }catch{return false}
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
  const r=await fetch(BASE+'/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal})
   .catch(()=>{throw new Error('Chirp isn’t running. Install it from chirp.rahultrikha.com to listen.')});
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
