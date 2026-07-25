import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Coins} from 'lucide-react';
import {award,balance,daysLeft,FEE,settleDue,settlePreview,WAIVER,type Settlement} from './coins';

type Burst={id:number;x:number;y:number;amount:number};

export function useCoins(){
 const [coins,setCoins]=useState(()=>balance());
 const [bursts,setBursts]=useState<Burst[]>([]);
 const [verdict,setVerdict]=useState<Settlement|null>(null);
 const idRef=useRef(0);
 useEffect(()=>{const due=settleDue(); if(due)setVerdict(due)},[]);
 const earn=(amount:number,x?:number,y?:number)=>{
  setCoins(award(amount));
  const id=++idRef.current;
  setBursts(b=>[...b,{id,x:x??window.innerWidth/2,y:y??window.innerHeight/2,amount}]);
  setTimeout(()=>setBursts(b=>b.filter(v=>v.id!==id)),1100);
 };
 return {coins,earn,bursts,verdict,setVerdict};
}

// Floating "+N" that flies from the earning action into the wallet pill.
export function CoinLayer({bursts}:{bursts:Burst[]}){
 const target=document.querySelector('.wallet-pill')?.getBoundingClientRect();
 return <div className="coin-layer">{bursts.map(b=>{
  const tx=target?target.left+target.width/2-b.x:0;
  const ty=target?target.top+target.height/2-b.y:0;
  return <span key={b.id} className="coin-fly" style={{left:b.x,top:b.y,'--tx':`${tx}px`,'--ty':`${ty}px`} as CSSProperties}><i/>+{b.amount}</span>;
 })}</div>;
}

export function WalletPill({coins}:{coins:number}){
 // key remounts on change so the bump animation replays on every earn.
 return <div className="wallet-pill" key={coins} title="Gold coins"><span className="coin-icon"/><b>{coins}</b></div>;
}

export function RenewalPanel({coins,onPreview}:{coins:number;onPreview:()=>void}){
 const month=new Date().toLocaleString('en',{month:'long'});
 const waived=coins>=WAIVER;
 return <section className="renewal">
  <div className="label"><Coins size={14}/> {month} renewal</div>
  <div className="renewal-status">{waived?<b>Covered — no ${FEE} charge.</b>:<span><b>{coins}</b> of {WAIVER} coins · {daysLeft()} days left</span>}</div>
  <div className="progress gold"><i style={{width:`${Math.min(100,coins)}%`}}/></div>
  <small>{waived?'This month is on the house. Keep the streak anyway.':`Short of ${WAIVER} on the 1st and the $${FEE} renewal applies.`}</small>
  <button onClick={onPreview}>Preview settlement</button>
 </section>;
}

export function VerdictOverlay({verdict,onClose}:{verdict:Settlement;onClose:()=>void}){
 const [y,mo]=verdict.month.split('-').map(Number);
 const monthLabel=new Date(y,mo-1,1).toLocaleString('en',{month:'long',year:'numeric'});
 return <div className="verdict-backdrop" onClick={onClose}>
  <div className={`verdict-card ${verdict.waived?'waived':'due'}`} onClick={e=>e.stopPropagation()}>
   <div className="coin-rain">{Array.from({length:verdict.waived?14:5},(_,i)=><span key={i} style={{'--d':`${(i%7)*0.14}s`,'--x':`${8+(i*61)%84}%`} as CSSProperties}/>)}</div>
   <h2>{verdict.waived?'Renewal waived':'Renewal due'}</h2>
   <p>{verdict.waived
    ?`${verdict.coins} coins pour into the meter — the $${FEE} fee for ${monthLabel} is covered.`
    :`${verdict.coins} coins — short of ${WAIVER}. The $${FEE} renewal for ${monthLabel} is charged.`}</p>
   <button onClick={onClose}>{verdict.waived?'Keep reading':'Back to reading'}</button>
  </div>
 </div>;
}

export type {Settlement};
