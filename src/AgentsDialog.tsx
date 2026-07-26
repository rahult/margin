import {useEffect,useState} from 'react';
import {Check,CircleCheck,CircleAlert,Copy,Plug,RefreshCw,X} from 'lucide-react';
import {getSkillStatus,type SkillStatus} from './llm';

function CopyCmd({label,cmd}:{label:string;cmd:string}){
 const [copied,setCopied]=useState(false);
 const copy=async()=>{try{await navigator.clipboard.writeText(cmd);setCopied(true);setTimeout(()=>setCopied(false),1500)}catch{/* clipboard blocked */}};
 return <div className="agent-cmd"><div className="agent-cmd-label">{label}</div><div className="agent-cmd-row"><code>{cmd}</code><button onClick={copy} title="Copy">{copied?<Check size={14}/>:<Copy size={14}/>}</button></div></div>;
}

export function AgentsDialog({onClose}:{onClose:()=>void}){
 const [status,setStatus]=useState<SkillStatus|'error'|null>(null);
 const [checking,setChecking]=useState(false);
 const refresh=()=>{setChecking(true);getSkillStatus().then(setStatus).catch(()=>setStatus('error')).finally(()=>setChecking(false))};
 useEffect(refresh,[]);
 const installed=status!==null&&status!=='error'&&status.installed;
 return <div className="verdict-backdrop" onClick={onClose}>
  <div className="verdict-card agents-dialog" onClick={e=>e.stopPropagation()}>
   <button className="agents-close" onClick={onClose}><X size={16}/></button>
   <div className="label"><Plug size={14}/> Connect coding agents</div>
   <h2>Let your agent review documents in Margin</h2>
   <div className={`skill-status ${installed?'ok':'warn'}`}>
    {checking||status===null?<>Checking for installed skills…</>
     :status==='error'?<><CircleAlert size={15}/> Couldn't check — the running backend is older than this feature or unreachable.</>
     :installed?<><CircleCheck size={15}/> Skill installed — detected for {status.locations.map(l=>l.agent).join(', ')}.</>
     :<><CircleAlert size={15}/> Skill not installed on this machine yet.</>}
    {!checking&&status!==null&&<button className="recheck" onClick={refresh} title="Re-check"><RefreshCw size={13}/></button>}
   </div>
   {!installed&&<p>Install the Margin skill so Claude Code, Cursor, Codex, and other agents can push any markdown file into Margin for guided review — and read back your notes, review answers, and argument maps.</p>}
   <CopyCmd label="Install the agent skill (skills.sh)" cmd="npx skills add rahult/margin --skill margin"/>
   <CopyCmd label="Or register the MCP server directly" cmd="claude mcp add margin -- node /absolute/path/to/margin/server/mcp.mjs"/>
   <div className="agents-note">Margin must be running (npm start or the desktop app). Agents talk only to your local backend — documents never leave the machine.</div>
  </div>
 </div>;
}
