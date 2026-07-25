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

// Knowledge store (file-backed via the local proxy; shared with the MCP server).
export type StoredDoc={title:string;md:string;addedAt:number;words:number};
export type LibraryEntry={title:string;addedAt:number;words:number;notes:number};
export type Note={id:string;text:string;sectionId?:string;createdAt:number;links?:{docTitle:string;noteId:string;excerpt:string}[]};

export const library=()=>request<{documents:LibraryEntry[]}>('/api/library');
export const getDocument=(title:string)=>request<StoredDoc>(`/api/document?title=${encodeURIComponent(title)}`);
export const putDocument=(title:string,md:string)=>request<{ok:boolean}>('/api/document',{method:'PUT',body:JSON.stringify({title,md})});
export const getNotes=(title:string)=>request<{notes:Note[]}>(`/api/notes?title=${encodeURIComponent(title)}`);
export const putNotes=(title:string,notes:Note[])=>request<{ok:boolean}>(`/api/notes?title=${encodeURIComponent(title)}`,{method:'PUT',body:JSON.stringify({notes})});
export const getReview=(title:string)=>request<{answers:string[]}>(`/api/review?title=${encodeURIComponent(title)}`);
export const putReview=(title:string,answers:string[])=>request<{ok:boolean}>(`/api/review?title=${encodeURIComponent(title)}`,{method:'PUT',body:JSON.stringify({answers})});
export const getMap=(title:string)=>request<{map:unknown}>(`/api/map?title=${encodeURIComponent(title)}`);
export const putMap=(title:string,map:unknown)=>request<{ok:boolean}>(`/api/map?title=${encodeURIComponent(title)}`,{method:'PUT',body:JSON.stringify({map})});
