import type {Campaign} from './campaign.ts';
import {SPECIALISTS,activeCrew} from './campaign.ts';
import {owns,PROPERTIES} from './expansion.ts';
import {atPoint} from './navigation.ts';
export const RACES=[
 {id:'canal',name:'Canal Midnight Circuit',fee:75,pay:600,duration:130,par:95,points:[{x:2.7,z:-111},{x:62.7,z:-111},{x:62.7,z:-51},{x:2.7,z:-51},{x:2.7,z:-111}]},
 {id:'levee',name:'Levee Freight Sprint',fee:100,pay:850,duration:150,par:110,points:[{x:62.7,z:9},{x:122.7,z:9},{x:122.7,z:69},{x:62.7,z:129},{x:2.7,z:129}]},
] as const;
export const FARES=[{id:'jazz',name:'Musician after the show',x:0,z:-60,dropX:-180,dropZ:-60,pay:320},{id:'gallery',name:'Gallery collector',x:-120,z:180,dropX:60,dropZ:-60,pay:420},{id:'port',name:'Night-shift dockworker',x:120,z:180,dropX:-120,dropZ:120,pay:380}] as const;
export const BOUNTIES=[{id:'lark',name:'Lark · missing relief crates',x:-120,z:-180,pay:700},{id:'moss',name:'Moss · workshop extortionist',x:180,z:120,pay:900},{id:'vale',name:'Vale · riverfront fence',x:0,z:180,pay:1200}] as const;
export const FISHING_SPOT={x:35,z:196};
export const OUTFITS=[{id:'river',name:'Riverboat evening coat',cost:250,outfit:3,hair:4,accent:0xd9bb73},{id:'racer',name:'Canal racing jacket',cost:350,outfit:0,hair:0,accent:0xe8e5cf},{id:'dock',name:'Dockworker field jacket',cost:200,outfit:4,hair:1,accent:0xe5b456}] as const;
export const APARTMENTS=[{id:'home-quarter',name:'French Quarter Courtyard Home',cost:1800},{id:'home-uptown',name:'Uptown Shotgun Home',cost:2200},{id:'home-bywater',name:'Bywater Artist Loft',cost:2600}] as const;
export const LIVERIES=['none','rally','checker','sunset'] as const;
export type PursuitJob={kind:'race'|'taxi'|'bounty'|'fishing'|'rival';id:string;step:number;remaining:number;elapsed:number;condition:number;spawned:boolean;resolved:boolean;boarded:boolean;cast:number;window:number;vehicleKey:string};
export type Pursuits={active:PursuitJob|null;cooldown:number;wins:string[];bounties:string[];fish:number;best:Record<string,number>;wardrobe:string[];wearing:string;apartments:string[];decor:Record<string,number>;liveries:Record<string,string>;bond:Record<string,number>;bondCooldown:number;rivalry:Record<string,number>;rivalClock:number;report:string};
export function newPursuits():Pursuits{return {active:null,cooldown:0,wins:[],bounties:[],fish:0,best:{},wardrobe:[],wearing:'',apartments:[],decor:{},liveries:{},bond:{},bondCooldown:0,rivalry:{},rivalClock:0,report:''};}
const n=(v:unknown,f=0,max=1e9)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,v)):f;
export function restorePursuits(v:any):Pursuits{
 const s=newPursuits();if(!v||typeof v!=='object')return s;
 const list=(value:any,ids:readonly string[])=>ids.filter(id=>Array.isArray(value)&&value.includes(id));
 s.wins=list(v.wins,RACES.map(m=>m.id));s.bounties=list(v.bounties,BOUNTIES.map(m=>m.id));s.wardrobe=list(v.wardrobe,OUTFITS.map(m=>m.id));s.apartments=list(v.apartments,APARTMENTS.map(m=>m.id));s.wearing=s.wardrobe.includes(v.wearing)?v.wearing:'';
 s.cooldown=n(v.cooldown,0,90);s.bondCooldown=n(v.bondCooldown,0,180);s.fish=Math.floor(n(v.fish,0,1e6));s.rivalClock=n(v.rivalClock,0,180);s.report=typeof v.report==='string'?v.report.slice(0,500):'';
 for(const race of RACES)if(v.best?.[race.id]!==undefined)s.best[race.id]=n(v.best[race.id],0,3600);
 for(const id of s.apartments)s.decor[id]=Math.floor(n(v.decor?.[id],0,2));for(let i=0;i<8;i++)if(LIVERIES.includes(v.liveries?.[i]))s.liveries[i]=v.liveries[i];
 for(const m of SPECIALISTS)if(v.bond?.[m.id]!==undefined)s.bond[m.id]=Math.floor(n(v.bond?.[m.id],0,100));for(const p of PROPERTIES)if(v.rivalry?.[p.id]!==undefined)s.rivalry[p.id]=n(v.rivalry?.[p.id],0,100);
 const a=v.active;const valid=a&&(a.kind==='race'?RACES.some(m=>m.id===a.id):a.kind==='taxi'?FARES.some(m=>m.id===a.id):a.kind==='bounty'?BOUNTIES.some(m=>m.id===a.id)&&!s.bounties.includes(a.id):a.kind==='fishing'?a.id==='river':a.kind==='rival'?PROPERTIES.some(p=>p.id===a.id):false);
 if(valid&&a.kind==='race'){s.report='Interrupted street race cancelled on reload. Entry fee was not refunded; no result or payout was granted.';s.cooldown=Math.max(20,s.cooldown);}
 if(valid&&a.kind!=='race'){const max=a.kind==='race'?RACES.find(m=>m.id===a.id)!.points.length-1:a.kind==='fishing'?0:1;s.active={kind:a.kind,id:a.id,step:Math.floor(n(a.step,0,max)),remaining:n(a.remaining,180,300),elapsed:n(a.elapsed,0,300),condition:n(a.condition,100,100),spawned:a.spawned===true,resolved:a.resolved===true,boarded:false,cast:0,window:0,vehicleKey:''};}
 return s;
}
export function cityActivityBusy(c:Campaign){return !!(c.pursuits.active||c.kingpin.active||c.living.active||c.cityStories.active||c.expansion.mission||c.lifestyle.work||(c.legacy.daily&&!c.legacy.daily.finished));}
export function startPursuit(c:Campaign,kind:PursuitJob['kind'],id:string){
 if(c.legacy.tutorial<3||cityActivityBusy(c)||c.pursuits.cooldown>0)return false;
 let duration=180,fee=0;
 if(kind==='race'){const m=RACES.find(m=>m.id===id);if(!m)return false;duration=m.duration;fee=m.fee;}
 else if(kind==='taxi'){if(!FARES.some(m=>m.id===id))return false;duration=200;}
 else if(kind==='bounty'){if(!BOUNTIES.some(m=>m.id===id)||c.pursuits.bounties.includes(id))return false;duration=240;}
 else if(kind==='fishing'){if(id!=='river')return false;duration=90;fee=15;}
 else if(kind==='rival'){if(!owns(c,id)||(c.pursuits.rivalry[id]??0)<20)return false;duration=240;}
 else return false;
 if(c.clean<fee)return false;c.clean-=fee;c.pursuits.active={kind,id,step:0,remaining:duration,elapsed:0,condition:100,spawned:false,resolved:false,boarded:false,cast:0,window:0,vehicleKey:''};return true;
}
export function pursuitObjective(c:Campaign){const a=c.pursuits.active;if(!a)return null;
 if(a.kind==='race'){const m=RACES.find(m=>m.id===a.id)!;return {...m.points[a.step]!,name:`${m.name} · checkpoint ${a.step+1}/${m.points.length} · ${Math.ceil(a.remaining)}s`};}
 if(a.kind==='taxi'){const m=FARES.find(m=>m.id===a.id)!;return {x:a.step?m.dropX:m.x,z:a.step?m.dropZ:m.z,name:`Taxi · ${m.name} · ${a.step?'passenger on board: stop and Interact to deliver':'stop a taxi and Interact to pick up'} · fare care ${Math.ceil(a.condition)}%`};}
 if(a.kind==='bounty'){const m=BOUNTIES.find(m=>m.id===a.id)!;return {x:a.step?30:m.x,z:a.step?4:m.z,name:`Bounty · ${m.name} · ${a.step?'return proof to Mama Nola':'locate target, defeat/subdue then Interact'}`};}
 if(a.kind==='fishing')return {...FISHING_SPOT,name:a.cast===0?'River fishing · Interact on foot to cast':a.window>0?'BITE! Interact now to land the fish':'Line cast · wait for a bite'};
 const p=PROPERTIES.find(p=>p.id===a.id)!;return {x:p.x,z:p.z,name:`Business rivalry · ${p.name} · ${a.step?'settle with your staff':'resolve the rival crew, then Interact'}`};
}
export type PursuitContext={x:number;z:number;driving:boolean;taxi:boolean;speed:number;vehicleKey:string;condition:number;guards:number;fired:boolean};
export function pursuitInteract(c:Campaign,ctx:PursuitContext){
 const a=c.pursuits.active,p=pursuitObjective(c);if(!a||!p)return null;const radius=a.kind==='race'?7:6;
 const near=a.kind==='race'||a.kind==='fishing'?Math.hypot(ctx.x-p.x,ctx.z-p.z)<=radius:atPoint(ctx.x,ctx.z,p,radius);if(!near)return null;
 if(a.remaining<=0||a.condition<=0){c.pursuits.active=null;c.pursuits.cooldown=30;return 'City activity failed. No payout; entry fees are not refunded.';}
 if(a.kind==='race'){
  if(!ctx.driving)return 'Enter a road vehicle before taking the checkpoint.';
  if(!a.vehicleKey)a.vehicleKey=ctx.vehicleKey;if(a.vehicleKey!==ctx.vehicleKey)return 'Finish the circuit in the vehicle you started in.';
  const m=RACES.find(m=>m.id===a.id)!;if(a.step<m.points.length-1){a.step++;return 'Race checkpoint cleared.';}
  const win=a.elapsed<=m.par;if(!c.pursuits.wins.includes(m.id)&&win)c.pursuits.wins.push(m.id);c.pursuits.best[m.id]=Math.min(c.pursuits.best[m.id]??Infinity,a.elapsed);const pay=win?m.pay:Math.round(m.pay*.4);c.clean+=pay;c.pursuits.active=null;c.pursuits.cooldown=60;return `${win?'RACE WON':'RACE FINISHED'} · ${a.elapsed.toFixed(1)}s vs ${m.par}s rival pace · +$${pay} clean.`;
 }
 if(a.kind==='taxi'){
  if(!ctx.driving||!ctx.taxi)return 'Use a Crescent City Taxi, not another vehicle.';if(Math.abs(ctx.speed)>1.5)return 'Stop the taxi for pickup or drop-off.';
  if(a.step===0){a.step=1;a.boarded=true;a.vehicleKey=ctx.vehicleKey;return 'Passenger boarded. Drive carefully; gunfire or crashes reduce fare care.';}
  if(!a.boarded||a.vehicleKey!==ctx.vehicleKey)return 'Return to the pickup in your taxi and collect the passenger again.';
  const m=FARES.find(m=>m.id===a.id)!,pay=Math.round(m.pay*(.5+Math.max(0,a.condition-(ctx.fired?25:0))/200));c.clean+=pay;c.pursuits.active=null;c.pursuits.cooldown=45;return `FARE COMPLETE · +$${pay} clean · care ${Math.ceil(a.condition)}%.`;
 }
 if(a.kind==='fishing'){
  if(ctx.driving)return 'Exit your vehicle before casting.';
  if(a.cast===0){a.cast=3+(c.pursuits.fish%4);return 'Line cast. Watch the bite prompt; Interact during its 1.8s window.';}
  if(a.window<=0)return 'No bite yet. Wait for the prompt.';
  const pay=[65,95,140][c.pursuits.fish%3]!;c.pursuits.fish++;c.clean+=pay;c.pursuits.active=null;c.pursuits.cooldown=30;return `FISH LANDED · +$${pay} clean from the river market. Tackle fee was $15.`;
 }
 if(ctx.driving)return 'Exit the vehicle to resolve this encounter.';
 if(a.step===0){if(!a.spawned||ctx.guards>0)return 'Resolve the marked rivals first; takedowns/surrender count, too.';a.step=1;return 'Proof collected. Follow the settlement marker.';}
 const pay=a.kind==='bounty'?BOUNTIES.find(m=>m.id===a.id)!.pay:500;if(a.kind==='bounty')c.pursuits.bounties.push(a.id);else {if(!owns(c,a.id))return 'Restore your business upkeep before settling.';c.pursuits.rivalry[a.id]=0;}
 c.clean+=pay;c.pursuits.active=null;c.pursuits.cooldown=60;return `CITY CONTRACT COMPLETE · +$${pay} clean, once for this completed contract.`;
}
export function tickPursuits(c:Campaign,dt:number,ctx:PursuitContext){
 const s=c.pursuits;s.cooldown=Math.max(0,s.cooldown-dt);s.bondCooldown=Math.max(0,s.bondCooldown-dt);s.rivalClock+=dt;
 if(s.rivalClock>=120){s.rivalClock%=120;for(const p of PROPERTIES)if(owns(c,p.id))s.rivalry[p.id]=Math.min(100,(s.rivalry[p.id]??0)+10);}
 const a=s.active;if(!a)return null;a.elapsed+=dt;a.remaining-=dt;
 if(a.kind==='taxi'&&a.step===1&&(!ctx.driving||ctx.vehicleKey!==a.vehicleKey)){a.boarded=false;a.step=0;a.vehicleKey='';return 'Fare paused: passenger returned to pickup after you left the assigned taxi. Collect them again; timer continues.';}
 if(ctx.fired&&(a.kind==='taxi'||a.kind==='race'))a.condition=Math.max(0,a.condition-25);
 if(a.kind==='fishing'&&a.cast>0){a.cast=Math.max(.001,a.cast-dt);if(a.cast<=.001&&a.window===0)a.window=1.8;else if(a.window>0){a.window=Math.max(0,a.window-dt);if(a.window===0){s.active=null;s.cooldown=20;return 'The fish slipped the hook. No payout; try another cast later.';}}}
 if(a.remaining<=0||a.condition<=0){s.active=null;s.cooldown=30;return 'City activity failed. No payout; entry fees are not refunded.';}return null;
}
export function buyOutfit(c:Campaign,id:string){const o=OUTFITS.find(o=>o.id===id);if(!o||c.pursuits.wardrobe.includes(id)||c.clean<o.cost)return false;c.clean-=o.cost;c.pursuits.wardrobe.push(id);c.pursuits.wearing=id;return true;}
export function equipOutfit(c:Campaign,id:string){if(id!==''&&!c.pursuits.wardrobe.includes(id))return false;c.pursuits.wearing=id;return true;}
export function buyApartment(c:Campaign,id:string){const home=APARTMENTS.find(h=>h.id===id);if(!home||c.clean<home.cost||c.pursuits.apartments.includes(id))return false;c.clean-=home.cost;c.pursuits.apartments.push(id);c.pursuits.decor[id]=0;return true;}
export function decorateApartment(c:Campaign,id:string,style:number){if(!c.pursuits.apartments.includes(id)||![0,1,2].includes(style)||c.pursuits.decor[id]===style||c.clean<80)return false;c.clean-=80;c.pursuits.decor[id]=style;return true;}
export function buyLivery(c:Campaign,index:number,id:string){if(!c.expansion.cars[index]||c.kingpin.vehicles[index]?.impounded||!LIVERIES.includes(id as any)||c.pursuits.liveries[index]===id||c.clean<(id==='none'?0:180))return false;c.clean-=id==='none'?0:180;c.pursuits.liveries[index]=id;return true;}
export function bondConversation(c:Campaign,id:string,choice:'listen'|'reward'){
 const member=activeCrew(c).find(m=>m.id===id);if(!member||c.pursuits.bondCooldown>0||!['listen','reward'].includes(choice)||choice==='reward'&&c.clean<100)return false;
 if(choice==='reward')c.clean-=100;const gain=choice==='listen'?5:10;c.pursuits.bond[id]=Math.min(100,(c.pursuits.bond[id]??0)+gain);member.loyalty=Math.min(100,member.loyalty+(choice==='listen'?2:5));c.pursuits.bondCooldown=120;c.pursuits.report=`${SPECIALISTS.find(s=>s.id===id)!.name}: ${choice==='listen'?'Thanks for hearing me out. These streets are more than a paycheck.':'You look after us. We’ll look after you.'} Bond +${gain}.`;return true;
}
export function rivalryMultiplier(c:Campaign,id:string){return 1-Math.min(.25,(c.pursuits.rivalry[id]??0)*.0025);}
