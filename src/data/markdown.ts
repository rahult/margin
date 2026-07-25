import {marked} from 'marked';

export type Section={id:string;number:string;title:string;kind:string;minutes:number;question:string};
export type LensRow={kind:'claim'|'evidence'|'risk';text:string};
export type ParsedDoc={
 title:string;
 sections:Section[];
 html:string;
 mission:string;
 review:string[];
 lens?:LensRow[];
 takeaways?:string[];
};

const QUESTION_TEMPLATES=[
 (t:string)=>`What is the main claim of “${t}”?`,
 (t:string)=>`What would make “${t}” wrong or incomplete?`,
 (t:string)=>`What does “${t}” ask the reader to believe or do?`,
 (t:string)=>`What is easy to miss in “${t}”?`,
];

const slugify=(s:string)=>s.toLowerCase().replace(/<[^>]+>/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'section';

function kindOf(chunk:string):string{
 if(/```/.test(chunk))return 'Technical';
 if(/^\s*\|.+\|/m.test(chunk))return 'Reference';
 if((chunk.match(/^\s*[-*]\s/gm)??[]).length>=3)return 'Notes';
 return 'Prose';
}

// Browser-side allowlist sanitiser for marked output. No-ops outside the DOM (eval runs).
export function sanitizeHtml(html:string):string{
 if(typeof document==='undefined')return html;
 const tpl=document.createElement('template');
 tpl.innerHTML=html;
 const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','LINK','META','FORM','INPUT','BUTTON']);
 const walk=(parent:Element|DocumentFragment)=>{
  for(const child of [...parent.children]){
   if(blocked.has(child.tagName)){child.remove();continue}
   for(const attr of [...child.attributes]){
    if(/^on/i.test(attr.name)||((attr.name==='href'||attr.name==='src')&&/^\s*javascript:/i.test(attr.value)))child.removeAttribute(attr.name);
   }
   walk(child);
  }
 };
 walk(tpl.content);
 return tpl.innerHTML;
}

export function parseMarkdown(md:string,fallbackTitle='Untitled document'):ParsedDoc{
 const lines=md.split('\n');
 const h1=lines.findIndex(l=>/^#\s+/.test(l));
 const title=(h1>=0?lines[h1].replace(/^#\s+/,'').trim():fallbackTitle)||fallbackTitle;
 const heads:number[]=[];
 lines.forEach((l,i)=>{if(/^##\s+/.test(l))heads.push(i)});
 const introEnd=heads[0]??lines.length;
 const intro=(h1>=0?lines.slice(h1+1,introEnd):lines.slice(0,introEnd)).join('\n');

 const parts:string[]=[`<h1>${marked.parseInline(title,{async:false})}</h1>`];
 if(intro.trim())parts.push(marked.parse(intro,{async:false}));

 const sections:Section[]=[];
 if(heads.length===0){
  const words=md.split(/\s+/).filter(Boolean).length;
  sections.push({id:'document',number:'01',title,kind:kindOf(md),minutes:Math.max(1,Math.round(words/180)),question:QUESTION_TEMPLATES[0](title)});
 }else{
  heads.forEach((h,i)=>{
   const raw=lines[h].replace(/^##\s+/,'').trim();
   const clean=raw.replace(/<[^>]+>/g,'');
   const id=`${String(i+1).padStart(2,'0')}-${slugify(clean)}`;
   const chunk=lines.slice(h+1,heads[i+1]??lines.length).join('\n');
   const words=chunk.split(/\s+/).filter(Boolean).length;
   sections.push({
    id,
    number:String(i+1).padStart(2,'0'),
    title:clean,
    kind:kindOf(chunk),
    minutes:Math.max(1,Math.round(words/180)),
    question:QUESTION_TEMPLATES[i%QUESTION_TEMPLATES.length](clean),
   });
   parts.push(`<h2 id="${id}">${marked.parseInline(raw,{async:false})}</h2>${marked.parse(chunk,{async:false})}`);
  });
 }

 return {
  title,
  sections,
  html:sanitizeHtml(parts.join('\n')),
  mission:'Read with intent — answer the question before each section, then prove it stuck.',
  review:sections.slice(0,3).map(s=>s.question),
 };
}
