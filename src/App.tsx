import {useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@astryxdesign/core/Button';
import {BookOpen,Brain,ChevronRight,Focus,Headphones,MessageSquareText,Pause,Sparkles,Target} from 'lucide-react';
import {documentHtml,sections} from './data/rfc';
import {Onboarding} from './Onboarding';
import {chat,getStatus} from './llm';

type Mode='read'|'focus'|'review';
type SavedProgress={active:number;notes:string[]};
function loadProgress():SavedProgress|null{try{const raw=localStorage.getItem('margin.progress');if(!raw)return null;const p=JSON.parse(raw);return typeof p?.active==='number'&&p.active>=0&&p.active<sections.length?{active:p.active,notes:Array.isArray(p.notes)?p.notes.filter((n:unknown)=>typeof n==='string'):[]}:null}catch{return null}}

export function App(){
 const [saved]=useState(loadProgress);
 const [active,setActive]=useState(saved?.active??0); const [mode,setMode]=useState<Mode>('read'); const [speaking,setSpeaking]=useState(false); const [note,setNote]=useState(''); const [notes,setNotes]=useState<string[]>(saved?.notes??[]); const article=useRef<HTMLElement>(null);
 const [ready,setReady]=useState(false); const [checking,setChecking]=useState(true); const [model,setModel]=useState(''); const [question,setQuestion]=useState(''); const [answer,setAnswer]=useState(''); const [asking,setAsking]=useState(false);
 const resumed=Boolean(saved&&saved.active>0);
 const progress=Math.round(((active+1)/sections.length)*100); const current=sections[active]; const remaining=sections.length-1-active;
 const invested=sections.slice(0,active+1).reduce((a,s)=>a+s.minutes,0); const totalMin=sections.reduce((a,s)=>a+s.minutes,0);
 useEffect(()=>{const el=document.getElementById(current.id); el?.scrollIntoView({behavior:'smooth',block:'start'});},[active]);
 useEffect(()=>{if(mode==='review')document.querySelector('.reader-shell')?.scrollTo({top:0});},[mode]);
 useEffect(()=>{localStorage.setItem('margin.progress',JSON.stringify({active,notes}))},[active,notes]);
 const speak=()=>{if(!('speechSynthesis'in window))return;if(speaking){speechSynthesis.cancel();setSpeaking(false);return;}const text=article.current?.innerText??'';const u=new SpeechSynthesisUtterance(text);u.rate=.95;u.onend=()=>setSpeaking(false);speechSynthesis.speak(u);setSpeaking(true)};
 const addNote=()=>{if(!note.trim())return;setNotes(v=>[note.trim(),...v]);setNote('')};
 const next=()=>active===sections.length-1?setMode('review'):setActive(v=>Math.min(sections.length-1,v+1));
 const prev=()=>setActive(v=>Math.max(0,v-1));
 useEffect(()=>{const h=(e:KeyboardEvent)=>{const t=e.target as HTMLElement;if(t.tagName==='TEXTAREA'||t.tagName==='INPUT'||t.isContentEditable)return;if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)});
 useEffect(()=>{getStatus().then(s=>{setModel(s.model);setReady(s.configured&&localStorage.getItem('margin.onboarded')==='1');setChecking(false)}).catch(()=>setChecking(false));},[]);
 const ask=async()=>{if(!question.trim())return;setAsking(true);setAnswer('');try{const doc=article.current?.innerText.slice(0,6000)??'';const reply=await chat([{role:'system',content:'You are a reading companion inside Margin. Answer concisely, in under 120 words, grounding every claim in the document excerpt.'},{role:'user',content:`Document excerpt:\n${doc}\n\nCurrent section: ${current.number} — ${current.title}\nReader question: ${question}`}]);setAnswer(reply)}catch(e){setAnswer(e instanceof Error?e.message:String(e))}finally{setAsking(false)}};
 const summary=useMemo(()=>['The problem is inconsistent cross-team delivery contracts, not raw throughput.','NATS JetStream is preferred because organisational fit outweighs maximal capability.','The decision is reversible: Kafka remains an escalation path for demonstrated log-processing needs.'],[]);
 if(checking)return null;
 if(!ready)return <Onboarding onDone={m=>{setModel(m);setReady(true)}}/>;
 return <div className={`app mode-${mode}`}>
  <header className="topbar"><div className="brand"><div className="mark">M</div><span>Margin</span><em>{model||'local proxy'}</em></div><div className="doc-title"><BookOpen size={15}/> RFC-014 · Event backbone selection</div><div className="top-actions"><Button label={mode==='focus'?'Exit focus':'Focus'} variant="secondary" onClick={()=>setMode(mode==='focus'?'read':'focus')}/></div></header>
  <main className="workspace">
   <aside className="left-rail"><div className="rail-heading"><span>Reading map</span></div><div className="mission"><Target size={17}/><div><b>Your mission</b><p>Test whether this decision still works at 40 teams.</p></div></div>{resumed&&<p className="resume">Picking up where you left off.</p>}<nav>{sections.map((s,i)=><button key={s.id} onClick={()=>setActive(i)} className={i===active?'active':''}><span className="step">{i<active?'✓':s.number}</span><span><b>{s.title}</b><small>{s.kind} · {s.minutes} min</small></span></button>)}</nav><div className="momentum"><div><span>Argument progress</span><b>{progress}%</b></div><div className="progress"><i style={{width:`${progress}%`}}/></div><small>{invested} of ~{totalMin} min invested</small></div></aside>
   <section className="reader-shell"><div className="reader-toolbar"><div className="mode-tabs"><button className={mode==='read'?'active':''} onClick={()=>setMode('read')}>Read</button><button className={mode==='review'?'active':''} onClick={()=>setMode('review')}>Review</button></div><div><button className={`tool ${speaking?'active':''}`} onClick={speak}>{speaking?<Pause size={16}/>:<Headphones size={16}/>} {speaking?'Pause':'Listen'}</button></div></div>
    {mode==='review'?<div className="review-screen"><div className="review-header"><h1>Check your understanding</h1><p>Answer from memory — retrieval is what makes the reading stick.</p></div>{['Why is Kafka not the default despite its stronger ecosystem?','What behaviour must every consumer implement?','What evidence would trigger reconsidering this decision?'].map((q,i)=><div className="challenge" key={q}><span>0{i+1}</span><div><b>{q}</b><textarea placeholder="Answer in your own words…"/></div></div>)}</div>:<article ref={article} className="document" dangerouslySetInnerHTML={{__html:documentHtml}}/>}
    <div className="section-nav"><button disabled={active===0} onClick={prev}>Previous</button><span>{remaining===0?'Final idea':`${remaining} idea${remaining>1?'s':''} to go`}</span><button className="next" onClick={next}>{active===sections.length-1?'Start review':'Next idea'} <ChevronRight size={16}/></button></div>
   </section>
   <aside className="right-rail"><div className="rail-heading"><span>Thinking companion</span></div><section className="prompt-card"><div className="label"><Sparkles size={15}/> Before this section</div><h3>{current.question}</h3><button onClick={()=>setNote(current.question+' ')}>Capture a thought <ChevronRight size={14}/></button></section><section className="ask"><div className="label"><MessageSquareText size={15}/> Ask the companion</div>{answer&&<p className="answer">{answer}</p>}<textarea value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask anything about this section…"/><button onClick={ask} disabled={asking||!question.trim()}>{asking?'Thinking…':'Ask'}</button></section><section className="lens"><div className="label"><Brain size={15}/> Reasoning lens</div><div className="lens-row"><span className="dot claim"/><div><b>Claim</b><p>NATS is the best organisational fit.</p></div></div><div className="lens-row"><span className="dot evidence"/><div><b>Evidence</b><p>Small platform team; moderate scale.</p></div></div><div className="lens-row"><span className="dot risk"/><div><b>Risk</b><p>Ease of entry can hide contract complexity.</p></div></div></section><section className="notes"><div className="label"><MessageSquareText size={15}/> Margin notes</div><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Write what you think, not what the document says…"/><button onClick={addNote}>Save note</button>{notes.map((n,i)=><p key={i}>{n}</p>)}</section><section className="takeaways"><div className="label"><Focus size={15}/> Emerging model</div>{summary.map(s=><div className="takeaway" key={s}><span>•</span>{s}</div>)}</section></aside>
  </main>
 </div>
}
