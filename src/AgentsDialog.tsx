import {useState} from 'react';
import {Check,Copy,Plug,X} from 'lucide-react';

function CopyCmd({label,cmd}:{label:string;cmd:string}){
 const [copied,setCopied]=useState(false);
 const copy=async()=>{try{await navigator.clipboard.writeText(cmd);setCopied(true);setTimeout(()=>setCopied(false),1500)}catch{/* clipboard blocked */}};
 return <div className="agent-cmd"><div className="agent-cmd-label">{label}</div><div className="agent-cmd-row"><code>{cmd}</code><button onClick={copy} title="Copy">{copied?<Check size={14}/>:<Copy size={14}/>}</button></div></div>;
}

export function AgentsDialog({onClose}:{onClose:()=>void}){
 return <div className="verdict-backdrop" onClick={onClose}>
  <div className="verdict-card agents-dialog" onClick={e=>e.stopPropagation()}>
   <button className="agents-close" onClick={onClose}><X size={16}/></button>
   <div className="label"><Plug size={14}/> Connect coding agents</div>
   <h2>Let your agent review documents in Margin</h2>
   <p>Install the Margin skill so Claude Code, Cursor, Codex, and other agents can push any markdown file into Margin for guided review — and read back your notes, review answers, and argument maps.</p>
   <CopyCmd label="Install the agent skill (skills.sh)" cmd="npx skills add rahult/margin --skill margin"/>
   <CopyCmd label="Or register the MCP server directly" cmd="claude mcp add margin -- node /absolute/path/to/margin/server/mcp.mjs"/>
   <div className="agents-note">Margin must be running (npm start or the desktop app). Agents talk only to your local backend — documents never leave the machine.</div>
  </div>
 </div>;
}
