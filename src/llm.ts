export type LlmStatus={configured:boolean;model:string;baseUrl:string};
export type ChatMessage={role:'system'|'user'|'assistant';content:string};

async function request<T>(path:string,init?:RequestInit):Promise<T>{
 const r=await fetch(path,{headers:{'Content-Type':'application/json'},...init});
 const data=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error((data as {error?:string}).error??`Request failed (${r.status})`);
 return data as T;
}

export const getStatus=()=>request<LlmStatus>('/api/status');

export function saveConfig(cfg:{apiKey:string;baseUrl:string;model:string}){
 return request<LlmStatus>('/api/config',{method:'POST',body:JSON.stringify(cfg)});
}

export async function chat(messages:ChatMessage[],maxTokens=800):Promise<string>{
 const r=await request<{content:string}>('/api/chat',{method:'POST',body:JSON.stringify({messages,maxTokens})});
 return r.content;
}
