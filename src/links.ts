// Cross-document link suggestions: parse the companion's raw reply into
// suggestions that reference notes which actually exist in the corpus.
export type NoteRef={title:string;id:string;text:string};
export type Suggestion={title:string;noteId:string;excerpt:string;reason:string};

export function parseSuggestions(raw:string,candidates:NoteRef[],max=2):Suggestion[]{
 const match=raw.match(/\[[\s\S]*\]/);
 if(!match)return [];
 let parsed:unknown;
 try{parsed=JSON.parse(match[0])}catch{return []}
 if(!Array.isArray(parsed))return [];
 const byKey=new Map(candidates.map(c=>[`${c.title}${c.id}`,c]));
 const out:Suggestion[]=[];
 for(const item of parsed){
  if(out.length>=max)break;
  if(typeof item!=='object'||item===null)continue;
  const {title,noteId,reason}=item as {title?:unknown;noteId?:unknown;reason?:unknown};
  if(typeof title!=='string'||typeof noteId!=='string')continue;
  const hit=byKey.get(`${title}${noteId}`);
  if(!hit)continue; // never link to a note the model invented
  out.push({title:hit.title,noteId:hit.id,excerpt:hit.text.slice(0,90),reason:typeof reason==='string'?reason:'Related note'});
 }
 return out;
}
