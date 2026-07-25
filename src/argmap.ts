// Argument maps: the structured "firm up ideas" artifact for ADR/RFC-shaped
// documents — decision, reasons, rejected alternatives, trade-offs.
export type ArgumentMap={decision:string;reasons:string[];alternatives:string[];tradeoffs:string[]};

const EMPTY:ArgumentMap={decision:'',reasons:[],alternatives:[],tradeoffs:[]};

// Tolerantly extract an ArgumentMap from an LLM reply (may wrap JSON in prose).
export function parseArgumentMap(raw:string):ArgumentMap|null{
 const match=raw.match(/\{[\s\S]*\}/);
 if(!match)return null;
 let parsed:unknown;
 try{parsed=JSON.parse(match[0])}catch{return null}
 if(typeof parsed!=='object'||parsed===null)return null;
 const p=parsed as Record<string,unknown>;
 const strings=(v:unknown,max=4):string[]=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&x.trim().length>0).slice(0,max):[];
 const map:ArgumentMap={
  decision:typeof p.decision==='string'?p.decision:'',
  reasons:strings(p.reasons),
  alternatives:strings(p.alternatives),
  tradeoffs:strings(p.tradeoffs),
 };
 return map.decision||map.reasons.length?map:null;
}

export const emptyArgumentMap=():ArgumentMap=>({...EMPTY,reasons:[],alternatives:[],tradeoffs:[]});
