// Local neural TTS playback: sentence chunks → local proxy (/api/tts) → audio.
// Fully local: the proxy runs a Kokoro model on-device; no audio leaves the machine.

export function chunkText(t:string):string[]{
 return t.replace(/\s+/g,' ').match(/[^.!?]+[.!?]+[\]"'”’)]*\s*|\S[^.!?]*$/g)?.map(s=>s.trim()).filter(Boolean)??[];
}

export function createNarrator(){
 let audio:HTMLAudioElement|null=null;
 let abort:AbortController|null=null;
 const BASE=typeof window!=='undefined'&&window.location.protocol==='tauri:'?'http://127.0.0.1:8787':'';

 const stop=()=>{
  abort?.abort();
  audio?.pause();
  audio=null; abort=null;
 };

 const fetchWav=async(text:string,signal:AbortSignal):Promise<string>=>{
  const r=await fetch(BASE+'/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal});
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
