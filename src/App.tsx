import {useEffect,useRef,useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {BookOpen,Brain,ChevronRight,Focus,FolderOpen,Headphones,MessageSquareText,Plug,Square,Sparkles,Target,X} from 'lucide-react';
import {defaultDoc} from './data/rfc';
import {parseMarkdown,type ParsedDoc} from './data/markdown';
import {Onboarding} from './Onboarding';
import {AgentsDialog} from './AgentsDialog';
import {chat,getMap,getNotes,getReview,getStatus,library,getDocument,putDocument,putMap,putNotes,putReview,type Note} from './llm';
import {parseArgumentMap,type ArgumentMap} from './argmap';
import {createNarrator} from './tts';
import {CoinLayer,RenewalPanel,VerdictOverlay,WalletPill,useCoins} from './Wallet';
import {claimSection,RULES,settlePreview} from './coins';
import {parseSuggestions,type NoteRef,type Suggestion} from './links';

type Mode='read'|'focus'|'review';
type SavedProgress={active:number};
const progressKey=(title:string)=>`margin.progress.${title}`;
function loadProgress(title:string,sectionCount:number):SavedProgress|null{try{const raw=localStorage.getItem(progressKey(title));if(!raw)return null;const p=JSON.parse(raw);return typeof p?.active==='number'&&p.active>=0&&p.active<sectionCount?{active:p.active}:null}catch{return null}}
function seedMap(d:ParsedDoc):ArgumentMap|null{return d.lens?{decision:d.lens.find(r=>r.kind==='claim')?.text??'',reasons:d.lens.filter(r=>r.kind==='evidence').map(r=>r.text),alternatives:[],tradeoffs:d.lens.filter(r=>r.kind==='risk').map(r=>r.text)}:null}

export function App(){
 const [doc,setDoc]=useState<ParsedDoc>(defaultDoc);
 const [saved,setSaved]=useState<SavedProgress|null>(()=>loadProgress(defaultDoc.title,defaultDoc.sections.length));
 const [active,setActive]=useState(saved?.active??0); const [mode,setMode]=useState<Mode>('read'); const [listening,setListening]=useState(false); const [note,setNote]=useState(''); const [notes,setNotes]=useState<Note[]>([]); const [answers,setAnswers]=useState<string[]>([]); const article=useRef<HTMLElement>(null); const fileInput=useRef<HTMLInputElement>(null); const speechGen=useRef(0);
 const [ready,setReady]=useState(false); const [checking,setChecking]=useState(true); const [model,setModel]=useState(''); const [question,setQuestion]=useState(''); const [answer,setAnswer]=useState(''); const [asking,setAsking]=useState(false); const [showAgents,setShowAgents]=useState(false);
 const [narrator]=useState(createNarrator);
 const {coins,earn,bursts,verdict,setVerdict}=useCoins();
 const listenStart=useRef(0); const listeningRef=useRef(false); const reviewClaimed=useRef(new Set<string>());
 const earnFromEl=(amount:number,sel:string)=>{const r=document.querySelector(sel)?.getBoundingClientRect();earn(amount,r?r.left+r.width/2:undefined,r?r.top+r.height/2:undefined)};
 const resumed=Boolean(saved&&saved.active>0);
 const sections=doc.sections;
 const progress=Math.round(((active+1)/sections.length)*100); const current=sections[active]; const remaining=sections.length-1-active;
 const invested=sections.slice(0,active+1).reduce((a,s)=>a+s.minutes,0); const totalMin=sections.reduce((a,s)=>a+s.minutes,0);
 const stopListening=()=>{speechGen.current++;narrator.stop();if(listeningRef.current&&Date.now()-listenStart.current>=8000)earnFromEl(RULES.listen,'.reader-toolbar .tool');listeningRef.current=false;setListening(false)};
 const sectionText=(i:number):string=>{
  const start=document.getElementById(sections[i].id); if(!start)return '';
  const endId=i+1<sections.length?sections[i+1].id:null;
  let text=''; let el:Element|null=start;
  while(el){if(endId&&el.id===endId)break;text+=(el.textContent??'')+' ';el=el.nextElementSibling}
  return text;
 };
 useEffect(()=>{const el=document.getElementById(current.id); el?.scrollIntoView({behavior:'smooth',block:'start'});},[active]);
 useEffect(()=>{if(mode==='review'){stopListening();document.querySelector('.reader-shell')?.scrollTo({top:0})}},[mode]);
 useEffect(()=>{localStorage.setItem(progressKey(doc.title),JSON.stringify({active}))},[doc.title,active]);
 // Local neural TTS (Kokoro via the local proxy): narrate the current section,
 // then follow the reading map forward.
 useEffect(()=>{
  if(!listening)return;
  const gen=++speechGen.current;
  const isCurrent=()=>speechGen.current===gen;
  narrator.narrate(sectionText(active),isCurrent)
   .then(()=>{if(!isCurrent())return; if(active+1<sections.length)setActive(active+1); else setListening(false)})
   .catch(e=>{console.error('narration failed:',e); if(isCurrent())setListening(false)});
 },[active,listening]);
 const loadDoc=async(d:ParsedDoc,md?:string)=>{
  stopListening();
  const s=loadProgress(d.title,d.sections.length);
  setDoc(d); setSaved(s); setActive(s?.active??0); setNotes([]); setAnswers([]); setSuggestions({}); setMode('read'); setNote(''); setQuestion(''); setAnswer('');
  if(md)putDocument(d.title,md).catch(()=>{/* proxy offline — doc lives for this session only */});
  const seeded=seedMap(d);
  try{const [n,r,m]=await Promise.all([getNotes(d.title),getReview(d.title),getMap(d.title)]);setNotes(n.notes);setAnswers(r.answers);setArgMap((m.map as ArgumentMap|null)??seeded)}catch{setArgMap(seeded)}
 };
 const openFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;const text=await f.text();loadDoc(parseMarkdown(text,f.name.replace(/\.(md|markdown|txt)$/i,'')),text)};
 const addNote=()=>{if(!note.trim())return;const n:Note={id:crypto.randomUUID(),text:note.trim(),sectionId:current.id,createdAt:Date.now()};setNotes(v=>{const next=[n,...v];putNotes(doc.title,next).catch(()=>{});return next});setNote('');earnFromEl(RULES.note,'.notes button');suggestLinks(n)};
 const [suggestions,setSuggestions]=useState<Record<string,Suggestion[]>>({});
 const [argMap,setArgMap]=useState<ArgumentMap|null>(()=>seedMap(defaultDoc)); const [mapping,setMapping]=useState(false);
 const saveMap=(m:ArgumentMap)=>{setArgMap(m);putMap(doc.title,m).catch(()=>{})};
 const editMapField=(field:'decision',value:string)=>{if(argMap)setArgMap({...argMap,[field]:value})};
 const editMapItem=(field:'reasons'|'alternatives'|'tradeoffs',i:number,value:string)=>{if(argMap)setArgMap({...argMap,[field]:argMap[field].map((x,j)=>j===i?value:x)})};
 const generateMap=async()=>{
  setMapping(true);
  try{
   const text=article.current?.innerText.slice(0,6000)??'';
   const raw=await chat([{role:'system',content:'Extract the argument map of the document as strict JSON only: {"decision":string,"reasons":string[],"alternatives":string[],"tradeoffs":string[]}. Decision = what the document concludes or asks of the reader. Reasons = why. Alternatives = options considered and set aside. Tradeoffs = costs and risks accepted. Max 4 short items per array.'},{role:'user',content:text}],500);
   const map=parseArgumentMap(raw);
   if(map)saveMap(map); else setAnswer('Could not extract an argument map from that reply.');
  }catch(e){setAnswer(e instanceof Error?e.message:String(e))}finally{setMapping(false)}
 };
 const suggestLinks=async(n:Note)=>{
  try{
   const lib=await library();
   const others=lib.documents.filter(d=>d.title!==doc.title&&d.notes>0).slice(-5);
   const candidates:NoteRef[]=[];
   for(const o of others){const {notes:ns}=await getNotes(o.title);for(const cn of ns.slice(0,12))candidates.push({title:o.title,id:cn.id,text:cn.text})}
   if(!candidates.length)return;
   const list=candidates.slice(0,40).map(c=>`- title=${JSON.stringify(c.title)} noteId=${c.id} text=${JSON.stringify(c.text.slice(0,140))}`).join('\n');
   const raw=await chat([{role:'system',content:'You connect ideas across documents. Reply ONLY with a JSON array (max 2 items) of the most meaningful cross-document links for the new note, or [] if none. Each item: {"title":string,"noteId":string,"reason":string}. Only reference notes from the provided list.'},{role:'user',content:`New note in "${doc.title}": ${JSON.stringify(n.text)}\n\nExisting notes in other documents:\n${list}`}],300);
   const parsed=parseSuggestions(raw,candidates);
   if(parsed.length)setSuggestions(s=>({...s,[n.id]:parsed}));
  }catch{/* link suggestions are best-effort */}
 };
 const confirmLink=(noteId:string,s:Suggestion)=>{setNotes(v=>{const next=v.map(n=>n.id===noteId?{...n,links:[...(n.links??[]),{docTitle:s.title,noteId:s.noteId,excerpt:s.excerpt}]}:n);putNotes(doc.title,next).catch(()=>{});return next});setSuggestions(v=>{const {[noteId]:_,...rest}=v;return rest})};
 const dismissLink=(noteId:string)=>setSuggestions(v=>{const {[noteId]:_,...rest}=v;return rest});
 const next=()=>{if(claimSection(doc.title,current.id))earnFromEl(RULES.section,'.section-nav .next');if(active===sections.length-1){setMode('review');return}setActive(v=>Math.min(sections.length-1,v+1))};
 const prev=()=>setActive(v=>Math.max(0,v-1));
 const startListening=()=>{listeningRef.current=true;listenStart.current=Date.now();setListening(true)};
 const blurAnswer=(i:number,value:string)=>{
  const nextAnswers=doc.review.map((_,j)=>j===i?value:(answers[j]??''));
  setAnswers(nextAnswers); putReview(doc.title,nextAnswers).catch(()=>{});
  const k=`${doc.title}:${i}`;
  if(value.trim().length>=30&&!reviewClaimed.current.has(k)){reviewClaimed.current.add(k);earnFromEl(RULES.review,'.challenge textarea')}
 };
 useEffect(()=>{const h=(e:KeyboardEvent)=>{const t=e.target as HTMLElement;if(t.tagName==='TEXTAREA'||t.tagName==='INPUT'||t.isContentEditable)return;if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)});
 useEffect(()=>{(async()=>{
  try{
   const s=await getStatus(); setModel(s.model); setReady(s.configured&&localStorage.getItem('margin.onboarded')==='1');
   const lib=await library(); const latest=lib.documents.at(-1);
   if(latest){const stored=await getDocument(latest.title);await loadDoc(parseMarkdown(stored.md,stored.title))}
   else{const [n,r,m]=await Promise.all([getNotes(defaultDoc.title),getReview(defaultDoc.title),getMap(defaultDoc.title)]);setNotes(n.notes);setAnswers(r.answers);setArgMap((m.map as ArgumentMap|null)??seedMap(defaultDoc))}
  }catch{/* proxy offline — stay on the sample doc */}
  setChecking(false);
 })()},[]);
 const ask=async()=>{if(!question.trim())return;setAsking(true);setAnswer('');try{const text=article.current?.innerText.slice(0,6000)??'';const reply=await chat([{role:'system',content:'You are a reading companion inside Margin. Answer concisely, in under 120 words, grounding every claim in the document excerpt.'},{role:'user',content:`Document excerpt:\n${text}\n\nCurrent section: ${current.number} — ${current.title}\nReader question: ${question}`}]);setAnswer(reply);earnFromEl(RULES.ask,'.ask button')}catch(e){setAnswer(e instanceof Error?e.message:String(e))}finally{setAsking(false)}};
 if(checking)return null;
 if(!ready)return <Onboarding onDone={m=>{setModel(m);setReady(true)}}/>;
 return <div className={`app mode-${mode}`}>
  <input ref={fileInput} type="file" accept=".md,.markdown,.txt,text/markdown" hidden onChange={openFile}/>
  <header className="topbar"><div className="brand"><div className="mark">M</div><span>Margin</span><em>{model||'local proxy'}</em></div><div className="doc-title"><BookOpen size={15}/> {doc.title}</div><div className="top-actions"><WalletPill coins={coins}/>{doc!==defaultDoc&&<button className="tool" onClick={()=>loadDoc(defaultDoc)}><X size={15}/> Close</button>}<button className="tool" onClick={()=>fileInput.current?.click()}><FolderOpen size={15}/> Open</button><button className="tool" title="Connect coding agents" onClick={()=>setShowAgents(true)}><Plug size={15}/> Agents</button><Button label={mode==='focus'?'Exit focus':'Focus'} variant="secondary" onClick={()=>setMode(mode==='focus'?'read':'focus')}/></div></header>
  <main className="workspace">
   <aside className="left-rail"><div className="rail-heading"><span>Reading map</span></div><div className="mission"><Target size={17}/><div><b>Your mission</b><p>{doc.mission}</p></div></div>{resumed&&<p className="resume">Picking up where you left off.</p>}<nav>{sections.map((s,i)=><button key={s.id} onClick={()=>setActive(i)} className={i===active?'active':''}><span className="step">{i<active?'✓':s.number}</span><span><b>{s.title}</b><small>{s.kind} · {s.minutes} min</small></span></button>)}</nav><div className="momentum"><div><span>Argument progress</span><b>{progress}%</b></div><div className="progress"><i style={{width:`${progress}%`}}/></div><small>{invested} of ~{totalMin} min invested</small></div><RenewalPanel coins={coins} onPreview={()=>setVerdict(settlePreview(coins))}/></aside>
   <section className="reader-shell"><div className="reader-toolbar"><div className="mode-tabs"><button className={mode==='read'?'active':''} onClick={()=>setMode('read')}>Read</button><button className={mode==='review'?'active':''} onClick={()=>setMode('review')}>Review</button></div><div><button className={`tool ${listening?'active':''}`} onClick={()=>listening?stopListening():startListening()}>{listening?<Square size={15}/>:<Headphones size={16}/>} {listening?'Stop':'Listen'}</button></div></div>
    {mode==='review'?<div className="review-screen"><div className="review-header"><h1>Check your understanding</h1><p>Answer from memory — retrieval is what makes the reading stick.</p></div>{doc.review.map((q,i)=><div className="challenge" key={q}><span>0{i+1}</span><div><b>{q}</b><textarea value={answers[i]??''} onChange={e=>setAnswers(v=>doc.review.map((_,j)=>j===i?e.target.value:(v[j]??'')))} onBlur={e=>blurAnswer(i,e.target.value)} placeholder="Answer in your own words…"/></div></div>)}</div>:<article ref={article} className="document" dangerouslySetInnerHTML={{__html:doc.html}}/>}
    <div className="section-nav"><button disabled={active===0} onClick={prev}>Previous</button><span>{remaining===0?'Final idea':`${remaining} idea${remaining>1?'s':''} to go`}</span><button className="next" onClick={next}>{active===sections.length-1?'Start review':'Next idea'} <ChevronRight size={16}/></button></div>
   </section>
   <aside className="right-rail"><div className="rail-heading"><span>Thinking companion</span></div><section className="prompt-card"><div className="label"><Sparkles size={15}/> Before this section</div><h3>{current.question}</h3><button onClick={()=>setNote(current.question+' ')}>Capture a thought <ChevronRight size={14}/></button></section><section className="ask"><div className="label"><MessageSquareText size={15}/> Ask the companion</div>{answer&&<p className="answer">{answer}</p>}<textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask anything about this section…"/><button onClick={ask} disabled={asking||!question.trim()}>{asking?'Thinking…':'Ask'}</button></section><section className="argmap"><div className="label"><Brain size={15}/> Argument map</div>{argMap?<div className="map-body"><div className="map-row"><b>Decision</b><input value={argMap.decision} onChange={e=>editMapField('decision',e.target.value)} onBlur={()=>saveMap(argMap)} placeholder="What the document concludes…"/></div>{([['reasons','Reasons'],['alternatives','Set aside'],['tradeoffs','Trade-offs']] as const).map(([f,label])=><div className="map-row" key={f}><b>{label}</b>{argMap[f].length===0&&<span className="map-empty">—</span>}{argMap[f].map((item,i)=><input key={i} value={item} onChange={e=>editMapItem(f,i,e.target.value)} onBlur={()=>saveMap(argMap)}/>)}</div>)}<button className="ghost" onClick={generateMap} disabled={mapping}>{mapping?'Mapping…':'Regenerate'}</button></div>:<button onClick={generateMap} disabled={mapping}>{mapping?'Mapping the argument…':'Map the argument'}</button>}</section><section className="notes"><div className="label"><MessageSquareText size={15}/> Margin notes</div><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Write what you think, not what the document says…"/><button onClick={addNote}>Save note</button>{notes.map(n=><div className="note-card" key={n.id}><p>{n.text}</p>{n.sectionId&&<small>on {sections.find(s=>s.id===n.sectionId)?.title??'this section'}</small>}{(n.links??[]).map(l=><span className="note-link" key={l.docTitle+l.noteId} title={l.excerpt}>↔ {l.docTitle}</span>)}{(suggestions[n.id]??[]).map(s=><div className="link-suggestion" key={s.noteId}><span>Link to <b>{s.title}</b>: “{s.excerpt}…” — {s.reason}</span><div><button onClick={()=>confirmLink(n.id,s)}>Link</button><button className="ghost" onClick={()=>dismissLink(n.id)}>Dismiss</button></div></div>)}</div>)}</section>{doc.takeaways&&<section className="takeaways"><div className="label"><Focus size={15}/> Emerging model</div>{doc.takeaways.map(s=><div className="takeaway" key={s}><span>•</span>{s}</div>)}</section>}</aside>
  </main>
  <CoinLayer bursts={bursts}/>
  {verdict&&<VerdictOverlay verdict={verdict} onClose={()=>setVerdict(null)}/>}
  {showAgents&&<AgentsDialog onClose={()=>setShowAgents(false)}/>}
 </div>
}
