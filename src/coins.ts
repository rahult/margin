// Coin economy for Margin. Earning is attached to the comprehension loop:
// finishing sections, writing notes, asking the companion, review answers, listening.
// 100 coins in a calendar month waives the $10 renewal; otherwise the fee applies.

export const RULES={section:5,note:10,ask:5,review:15,listen:10} as const;
export const WAIVER=100;
export const FEE=10;

export const monthKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const balanceKey=(m=monthKey())=>`margin.coins.${m}`;
const SETTLED_KEY='margin.coins.settled';

export function balance(m=monthKey()):number{
 try{return Number(localStorage.getItem(balanceKey(m)))||0}catch{return 0}
}

export function award(amount:number,m=monthKey()):number{
 const next=balance(m)+amount;
 try{localStorage.setItem(balanceKey(m),String(next))}catch{/* ignore */}
 return next;
}

// Anti-farm: a section pays out only the first time it is completed per document.
export function claimSection(docTitle:string,sectionId:string):boolean{
 const key=`margin.coins.claimed.${docTitle}`;
 try{
  const claimed=new Set<string>(JSON.parse(localStorage.getItem(key)??'[]'));
  if(claimed.has(sectionId))return false;
  claimed.add(sectionId);
  localStorage.setItem(key,JSON.stringify([...claimed]));
  return true;
 }catch{return true}
}

export type Settlement={month:string;coins:number;waived:boolean;charged:number};

export function settlePreview(coins:number,m=monthKey()):Settlement{
 const waived=coins>=WAIVER;
 return {month:m,coins,waived,charged:waived?0:FEE};
}

// On startup, settle any earlier month that has a balance but no verdict yet.
export function settleDue(now=new Date()):Settlement|null{
 const current=monthKey(now);
 try{
  const settled:string[]=JSON.parse(localStorage.getItem(SETTLED_KEY)??'[]');
  for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);
   if(!k?.startsWith('margin.coins.')||k===SETTLED_KEY||k.startsWith('margin.coins.claimed.'))continue;
   const m=k.replace('margin.coins.','');
   if(m>=current||settled.includes(m))continue;
   const verdict=settlePreview(balance(m),m);
   settled.push(m);
   localStorage.setItem(SETTLED_KEY,JSON.stringify(settled));
   return verdict;
  }
 }catch{/* ignore */}
 return null;
}

export function daysLeft(now=new Date()):number{
 return new Date(now.getFullYear(),now.getMonth()+1,0).getDate()-now.getDate();
}
