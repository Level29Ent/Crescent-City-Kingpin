import {choiceEffects,journalNote} from './depth.ts';
import type {Campaign} from './campaign.ts';
import {BLOCKS,SPECIALISTS,activeCrew} from './campaign.ts';
import {owns,PROPERTIES} from './expansion.ts';
import {atPoint} from './navigation.ts';
export const CHAPTERS=[
 {id:'union',name:'The Harbor Compact',speaker:'Captain June',dialogue:'Crane offers a cut of every relief shipment. Keep the dockworkers safe—or sell their routes to his buyers.',protect:'Refuse Crane. Secure the workers’ manifest.',profit:'Sell the routes. Take Crane’s premium.',x:120,z:180,returnX:30,returnZ:4,pay:1800},
 {id:'betrayal',name:'A Friend at the Wrong Table',speaker:'Mama Nola',dialogue:'Someone sold our meeting place to the Violet Crown. The evidence points to your own fixer. Expose the betrayal or take a payment to bury it.',protect:'Expose the fixer and protect the witnesses.',profit:'Bury the evidence for a cut of the racket.',x:-180,z:0,returnX:0,returnZ:120,pay:2400},
 {id:'reckoning',name:'The Price of a Crown',speaker:'Delphine Moreau',dialogue:'The rival bosses will offer peace, for a price. Release the evidence and build a coalition—or keep their secrets and rule through leverage.',protect:'Publish the ledger. Build a coalition.',profit:'Keep the ledger. Rule by leverage.',x:0,z:-120,returnX:30,returnZ:4,pay:3200},
] as const;
export type Approach='assault'|'bribe'|'lockpick'|'disguise';
export type VentureKind='story'|'club'|'shipment'|'protection'|'personal'|'takeover'|'event';
export type Venture={kind:VentureKind;id:string;step:number;remaining:number;choice:'protect'|'profit';method:Approach;spawned:boolean;resolved:boolean;progress:number;cargo:number};
export type Kingpin={active:Venture|null;chapters:Record<string,'protect'|'profit'>;personal:string[];businessCooldown:Record<string,number>;businessWins:number;companion:{id:string;command:'follow'|'hold'|'retreat';hp:number;x:number;z:number;injury:number};vehicles:Record<string,{plate:number;insured:boolean;impounded:boolean;reported:boolean}>;streetReports:string[];disguise:number;distraction:number;toolCooldown:number;radio:'jazz'|'bounce'|'news'|'off';ambienceClock:number;eventClock:number;retaliation:number;ending:''|'coalition'|'kingpin'|'broker';takeoverWon:boolean;report:string};
export function newKingpin():Kingpin{return {active:null,chapters:{},personal:[],businessCooldown:{},businessWins:0,companion:{id:'',command:'follow',hp:100,x:30,z:4,injury:0},vehicles:{},streetReports:[],disguise:0,distraction:0,toolCooldown:0,radio:'jazz',ambienceClock:0,eventClock:0,retaliation:0,ending:'',takeoverWon:false,report:''};}
const number=(v:unknown,f=0,max=1e9,min=0)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
export function restoreKingpin(v:any):Kingpin{
 const s=newKingpin();if(!v||typeof v!=='object')return s;
 for(const ch of CHAPTERS)if(['protect','profit'].includes(v.chapters?.[ch.id]))s.chapters[ch.id]=v.chapters[ch.id];
 s.personal=SPECIALISTS.filter(m=>Array.isArray(v.personal)&&v.personal.includes(m.id)).map(m=>m.id);
 for(const p of PROPERTIES)if(v.businessCooldown?.[p.id]!==undefined)s.businessCooldown[p.id]=number(v.businessCooldown[p.id],0,300);
 for(let i=0;i<8;i++){const car=v.vehicles?.[i];if(car&&typeof car==='object')s.vehicles[i]={plate:Math.floor(number(car.plate,0,9999)),insured:car.insured===true,impounded:car.impounded===true,reported:car.reported===true};}
 s.streetReports=Array.isArray(v.streetReports)?[...new Set<string>(v.streetReports.filter((id:unknown)=>typeof id==='string'&&/^street-\d{1,4}$/.test(id)))].slice(0,100):[];
 for(const key of ['businessWins','disguise','distraction','toolCooldown','ambienceClock','eventClock','retaliation'] as const)s[key]=number(v[key],0,key==='businessWins'?1e6:key==='retaliation'?600:300);
 const companion=v.companion;if(companion&&(companion.id===''||SPECIALISTS.some(m=>m.id===companion.id)))s.companion={id:companion.id,command:['follow','hold','retreat'].includes(companion.command)?companion.command:'follow',hp:number(companion.hp,100,100),x:number(companion.x,30,238,-238),z:number(companion.z,4,232,-238),injury:number(companion.injury,0,120)};
 s.radio=['jazz','bounce','news','off'].includes(v.radio)?v.radio:'jazz';s.ending=['coalition','kingpin','broker'].includes(v.ending)?v.ending:'';s.takeoverWon=v.takeoverWon===true;s.report=typeof v.report==='string'?v.report.slice(0,500):'';
 const a=v.active;const kinds:VentureKind[]=['story','club','shipment','protection','personal','takeover','event'];
 const valid=a&&kinds.includes(a.kind)&&['assault','bribe','lockpick','disguise'].includes(a.method)&&['protect','profit'].includes(a.choice)&&(
 a.kind==='story'?CHAPTERS.some(ch=>ch.id===a.id)&&!s.chapters[a.id]:a.kind==='personal'?SPECIALISTS.some(m=>m.id===a.id)&&!s.personal.includes(a.id):a.kind==='takeover'?a.id==='city'&&!s.takeoverWon:a.kind==='event'?['relief','witness'].includes(a.id):PROPERTIES.some(p=>p.id===a.id));
 if(valid)s.active={kind:a.kind,id:a.id,step:Math.floor(number(a.step,0,a.kind==='takeover'?5:2)),remaining:number(a.remaining,300,900),choice:a.choice,method:a.method,spawned:a.spawned===true,resolved:a.resolved===true,progress:number(a.progress,0,30),cargo:number(a.cargo,100,100)};
 return s;
}
export function ventureBusy(c:Campaign){return !!(c.pursuits.active||c.kingpin.active||c.living.active||c.cityStories.active||c.lifestyle.work||c.expansion.mission||(c.legacy.daily&&!c.legacy.daily.finished));}
export function startChapter(c:Campaign,id:string,choice:'protect'|'profit',method:Approach){
 const index=CHAPTERS.findIndex(ch=>ch.id===id);if(index<0||ventureBusy(c)||c.legacy.tutorial<3||!c.cityStories.completed.includes('crown')||c.kingpin.chapters[id]||index>0&&!c.kingpin.chapters[CHAPTERS[index-1]!.id]||!['protect','profit'].includes(choice)||!['assault','bribe','lockpick','disguise'].includes(method))return false;
 c.kingpin.active={kind:'story',id,step:0,remaining:420,choice,method,spawned:false,resolved:false,progress:0,cargo:100};return true;
}
export function startBusiness(c:Campaign,id:string,kind:'club'|'shipment'|'protection'){
 const p=PROPERTIES.find(p=>p.id===id);if(!['club','shipment','protection'].includes(kind)||!p||!owns(c,id)||ventureBusy(c)||c.legacy.tutorial<3||(c.kingpin.businessCooldown[id]??0)>0)return false;
 if(kind==='club'&&!['jazz','dive','record','casino'].includes(id)||kind==='shipment'&&!['dock','port','courier','chop'].includes(id)||kind==='protection'&&p.kind!=='racket')return false;
 if(kind==='protection'&&!activeCrew(c).length)return false;
 if(kind==='club'&&c.clean<100||kind==='shipment'&&c.inventory[0]!<2)return false;
 if(kind==='club')c.clean-=100;if(kind==='shipment')c.inventory[0]!-=2;
 c.kingpin.active={kind,id,step:0,remaining:300,choice:'protect',method:kind==='protection'?'bribe':'assault',spawned:false,resolved:false,progress:0,cargo:100};return true;
}
export function startPersonal(c:Campaign,id:string){if(ventureBusy(c)||c.legacy.tutorial<3||c.kingpin.personal.includes(id)||!activeCrew(c).some(m=>m.id===id))return false;c.kingpin.active={kind:'personal',id,step:0,remaining:360,choice:'protect',method:'assault',spawned:false,resolved:false,progress:0,cargo:100};return true;}
export function canTakeover(c:Campaign){return CHAPTERS.every(ch=>!!c.kingpin.chapters[ch.id])&&BLOCKS.every(b=>c.owned.includes(b.id))&&c.expansion.properties.filter(id=>owns(c,id)).length>=3&&activeCrew(c).length>=2&&!c.kingpin.takeoverWon;}
export function startTakeover(c:Campaign){if(ventureBusy(c)||!canTakeover(c))return false;c.kingpin.active={kind:'takeover',id:'city',step:0,remaining:900,choice:'protect',method:'assault',spawned:false,resolved:false,progress:0,cargo:100};return true;}
export function venturePoint(c:Campaign){const a=c.kingpin.active;if(!a)return null;
 if(a.kind==='story'){const ch=CHAPTERS.find(ch=>ch.id===a.id)!;const safeRoute=choiceEffects(c).dockAllies&&a.id==='betrayal'&&a.step===0;return {x:safeRoute?120:a.step===2?ch.returnX:ch.x,z:safeRoute?180:a.step===2?ch.returnZ:ch.z,name:`${ch.name} · ${a.choice.toUpperCase()} · ${a.step===0?(safeRoute?'Dockworker ally provides a safe contact':'Meet contact'):a.step===1?`${a.method.toUpperCase()} · resolve encounter`:'Deliver evidence'}`};}
 if(a.kind==='takeover'){const b=BLOCKS[Math.min(a.step,4)]!;return a.step===5?{x:30,z:4,name:'Return to Mama Nola · choose the city’s future'}:{x:b.x,z:b.z,name:`TAKEOVER ${a.step+1}/5 · defeat rival retaliation at ${b.name}`};}
 if(a.kind==='event')return {x:a.id==='relief'?-180:0,z:a.id==='relief'?-60:120,name:a.id==='relief'?'Street relief collection · E to donate $50':'Threatened witness · E to help, then clear two pursuers'};
 if(a.kind==='personal'){const s=SPECIALISTS.findIndex(m=>m.id===a.id),p=[{x:-60,z:0},{x:0,z:120},{x:60,z:120},{x:0,z:-60},{x:120,z:180},{x:-180,z:0}][s]!;return {x:a.step===2?30:p.x,z:a.step===2?4:p.z,name:`${SPECIALISTS[s]!.name} · ${a.step===0?'Meet personal contact':a.step===1?'Rescue contact from rival guards':'Return to Mama Nola'}`};}
 const p=PROPERTIES.find(p=>p.id===a.id)!;
 if(a.kind==='shipment'&&a.step===1)return {x:90,z:124,name:'Drive shipment to cargo office · E while driving'};
 if(a.kind==='club'&&a.step===0)return {x:60,z:-60,name:'Collect event equipment · E'};
 return {x:p.x,z:p.z,name:`${p.name} · ${a.kind==='club'?a.step===1?'Host event · stay within 10m for 25s':'Settle event takings':a.kind==='shipment'?a.step===2?'Settle shipment receipt · E':'Load two-crate shipment · E':a.step===0?'Meet shopkeeper · E':a.step===1?'Negotiate for 15s below 30 heat, or clear rivals':'Sign the protection agreement · E'}`};
}
export type VentureContext={x:number;z:number;driving:boolean;guards:number;heat:number;noise:boolean;lockHeld:boolean};
export function guardsRequired(a:Venture){return a.kind==='takeover'&&a.step<5||a.step===1&&(a.kind==='personal'||a.kind==='story'&&a.method==='assault'||a.kind==='event'&&a.id==='witness'||a.kind==='protection');}
export function ventureInteract(c:Campaign,ctx:VentureContext){
 const a=c.kingpin.active,p=venturePoint(c);if(!a||!p||!atPoint(ctx.x,ctx.z,p,8))return null;
 if(a.remaining<=0||a.kind==='shipment'&&a.cargo<=0){c.kingpin.active=null;return 'Activity failed. No payout; setup costs/cargo are not refunded.';}
 if(['club','shipment','protection'].includes(a.kind)&&!owns(c,a.id))return 'Restore the business upkeep before completing this venture.';
 if(a.kind==='personal'&&!activeCrew(c).some(m=>m.id===a.id))return 'Pay or restore loyalty to your specialist first.';
 if(a.kind==='shipment'&&a.step===1&&!ctx.driving)return 'Bring the shipment in a vehicle.';
 if(a.kind==='event'&&a.id==='relief'){if(c.clean<50)return 'Donation needs $50 clean.';c.clean-=50;c.living.reputation[1]=Math.min(100,c.living.reputation[1]!+8);c.kingpin.active=null;return 'Relief delivered. Neighborhood trust improved; no cash payout.';}
 if(a.kind==='story'&&a.step===1){
  if(a.method==='bribe'&&!a.resolved){if(c.clean<300)return 'The fixer wants $300 clean. No payout charged until you agree here.';c.clean-=300;a.resolved=true;}
  if(a.method==='lockpick'&&!a.resolved)return `Hold L / LOCKPICK on foot here for ${Math.max(0,Math.ceil(8-a.progress))}s without firing.`;
  if(a.method==='disguise'&&!a.resolved){if(c.kingpin.disguise<=0||ctx.heat>=30||ctx.noise)return 'Use a purchased disguise below 30 heat; gunfire breaks cover.';a.resolved=true;}
 }
 if(guardsRequired(a)&&(!a.spawned||ctx.guards>0)&&!a.resolved)return 'Resolve the rival guards first. T / TAKEDOWN is nonlethal from behind while crouched.';
 if(a.kind==='club'&&a.step===1&&a.progress<25||a.kind==='protection'&&a.step===1&&a.progress<15&&!a.resolved)return 'Remain at the venue and keep heat below 30 to finish the event or negotiation.';
 if(a.kind==='takeover'){
  if(a.step<5){a.step++;a.spawned=false;a.resolved=false;a.progress=0;return 'Retaliation defeated. Follow the next takeover marker.';}
  if(!BLOCKS.every(b=>c.owned.includes(b.id)))return 'Retake all five neighborhoods before the finale.';
  const choices=Object.values(c.kingpin.chapters),protect=choices.filter(v=>v==='protect').length;
  c.kingpin.ending=protect===3?'coalition':protect===0?'kingpin':'broker';c.kingpin.takeoverWon=true;c.clean+=8000;c.kingpin.active=null;
  return `CITY TAKEN · ${ENDING_TEXT[c.kingpin.ending]} +$8,000 clean, once only. Free roam continues.`;
 }
 if(a.kind==='event'&&a.id==='witness'){if(a.step===0){a.step=1;return 'Two pursuers spotted the witness. Protect them.';}c.living.reputation[0]=Math.min(100,c.living.reputation[0]!+8);c.clean+=150;c.kingpin.active=null;return 'Witness safe. +$150 clean and neighborhood trust.';}
 if(a.step<2){a.step++;a.spawned=false;a.progress=0;return 'Activity advanced. Follow the next marker.';}
 let pay=0;
 if(a.kind==='story'){const ch=CHAPTERS.find(ch=>ch.id===a.id)!;pay=Math.round(ch.pay*(a.choice==='profit'?1.4:1));c.kingpin.chapters[a.id]=a.choice;journalNote(c,`${ch.name}: chose ${a.choice}; evidence route ${a.method}.`);c.heat=Math.min(100,c.heat+(a.choice==='profit'?20:4));
  if(a.id==='betrayal'){if(a.choice==='profit'){c.crew.forEach(m=>m.loyalty=Math.max(0,m.loyalty-15));c.kingpin.retaliation=130;}else c.crew.forEach(m=>m.loyalty=Math.min(100,m.loyalty+10));}
  if(a.choice==='protect')c.living.reputation=c.living.reputation.map(n=>Math.min(100,n+5));
 }else if(a.kind==='personal'){c.kingpin.personal.push(a.id);const crew=c.crew.find(m=>m.id===a.id);if(crew)crew.loyalty=Math.min(100,crew.loyalty+25);pay=350;}
 else {pay=a.kind==='club'?550:a.kind==='shipment'?Math.round(1100*a.cargo/100):450;c.kingpin.businessWins++;c.kingpin.businessCooldown[a.id]=240;if(a.choice==='profit')c.heat=Math.min(100,c.heat+12);}
 c.clean+=pay;c.kingpin.active=null;return `Activity complete · +$${pay} clean. Choices and progress saved.`;
}
export const ENDING_TEXT={coalition:'The Crescent Coalition: the neighborhoods share power and your crew stays together.',kingpin:'The Iron Crown: you own the secrets, but rule a fearful city.',broker:'The Bayou Broker: uneasy alliances keep your empire standing.'};
export function tickKingpin(c:Campaign,dt:number,ctx:VentureContext){
 const s=c.kingpin,messages:string[]=[];for(const id of Object.keys(s.businessCooldown))s.businessCooldown[id]=Math.max(0,s.businessCooldown[id]!-dt);
 s.disguise=Math.max(0,s.disguise-dt);s.distraction=Math.max(0,s.distraction-dt);s.toolCooldown=Math.max(0,s.toolCooldown-dt);s.companion.injury=Math.max(0,s.companion.injury-dt);
 if(ctx.noise)s.disguise=0;
 const a=s.active,p=venturePoint(c);if(a&&p){a.remaining-=dt;const near=atPoint(ctx.x,ctx.z,p,10);
  if(a.kind==='shipment'&&a.cargo<=0||a.remaining<=0){s.active=null;messages.push('Activity failed. No payout; setup costs/cargo are not refunded.');}
  else if(a.step===1){
   if(a.kind==='club')a.progress=near&&ctx.heat<30&&!ctx.noise?Math.min(25,a.progress+dt):a.progress;
   if(a.kind==='protection'&&ctx.noise){a.method='assault';a.progress=0;}
   if(a.kind==='protection'&&a.method==='bribe'&&activeCrew(c).length&&near&&ctx.heat<30&&!ctx.noise){a.progress=Math.min(15,a.progress+dt);if(a.progress>=15)a.resolved=true;}
   if(a.kind==='story'&&a.method==='lockpick'){a.progress=near&&ctx.lockHeld&&!ctx.driving&&!ctx.noise?Math.min(8,a.progress+dt):0;if(a.progress>=8)a.resolved=true;}
  }
 }
 // Retaliation uses the existing turf-defense system: loss really removes the corner.
 if(Object.keys(s.chapters).length&&!c.defense&&c.owned.length){s.retaliation+=dt;if(s.retaliation>=choiceEffects(c).retaliationInterval){s.retaliation=0;c.defense={block:c.owned[Math.floor(c.clock/240)%c.owned.length]!,remaining:120};messages.push('RIVAL RETALIATION: defend your neighborhood or lose its income and control.');}}
 return messages;
}
export function callCompanion(c:Campaign,id:string,x:number,z:number){if(!activeCrew(c).some(m=>m.id===id)||c.kingpin.companion.injury>0||!!c.kingpin.companion.id)return false;c.kingpin.companion={id,command:'follow',hp:100,x,z,injury:0};return true;}
export function commandCompanion(c:Campaign,command:'follow'|'hold'|'retreat'){if(!['follow','hold','retreat'].includes(command)||!c.kingpin.companion.id)return false;c.kingpin.companion.command=command;return true;}
export function injureCompanion(c:Campaign,damage:number){const p=c.kingpin.companion;if(!p.id||!Number.isFinite(damage)||damage<=0)return false;p.hp=Math.max(0,p.hp-damage);if(p.hp===0){const m=c.crew.find(m=>m.id===p.id);if(m)m.loyalty=Math.max(0,m.loyalty-8);p.id='';p.injury=90;return true;}return false;}
export function vehicleRecord(c:Campaign,index:number){return c.kingpin.vehicles[index]??={plate:0,insured:false,impounded:false,reported:false};}
export function plateLabel(index:number,revision=0){return `CC-${String(index+1).padStart(2,'0')}-${String((index*137+revision*83+2900)%10000).padStart(4,'0')}`;}
export function insureVehicle(c:Campaign,index:number){if(!c.expansion.cars[index]||c.clean<250||vehicleRecord(c,index).insured)return false;c.clean-=250;vehicleRecord(c,index).insured=true;return true;}
export function impoundVehicle(c:Campaign,index:number){if(!c.expansion.cars[index])return false;vehicleRecord(c,index).impounded=true;return true;}
export function recoverVehicle(c:Campaign,index:number,onSite:boolean){const record=c.kingpin.vehicles[index];if(!onSite||!c.expansion.cars[index]||!record?.impounded||c.clean<(record.insured?50:300))return false;c.clean-=record.insured?50:300;record.impounded=false;record.reported=false;c.living.vehicleCondition[index]=record.insured?100:Math.max(30,c.living.vehicleCondition[index]??30);return true;}
export function replateVehicle(c:Campaign,index:number,onSite:boolean){if(!onSite||!c.expansion.cars[index]||c.clean<120||c.heat>=30||vehicleRecord(c,index).impounded)return false;c.clean-=120;const record=vehicleRecord(c,index);record.plate++;record.reported=false;return true;}
export function reportTheft(c:Campaign,key:string){if(!/^street-\d{1,4}$/.test(key)||c.kingpin.streetReports.includes(key))return false;c.kingpin.streetReports.push(key);c.heat=Math.min(100,c.heat+8);return true;}
export function buyDisguise(c:Campaign){if(c.clean<100||c.heat>=30||c.kingpin.disguise>0)return false;c.clean-=100;c.kingpin.disguise=90;return true;}
export function useDistraction(c:Campaign){if(c.kingpin.toolCooldown>0||c.clean<10)return false;c.clean-=10;c.kingpin.distraction=7;c.kingpin.toolCooldown=20;return true;}
export function canTakedown(player:{x:number;z:number;crouched:boolean},foe:{x:number;z:number;heading:number;dead:number;kind:string}){const dx=player.x-foe.x,dz=player.z-foe.z;return player.crouched&&!foe.dead&&foe.kind==='gangster'&&Math.hypot(dx,dz)<2.4&&dx*Math.sin(foe.heading)+dz*Math.cos(foe.heading)<-.3;}

/** Safe even when called by a death callback inside the reverse actor-update loop. */
export function retireVentureActors<T extends {blockId?:string;hp:number;dead:number}>(actors:readonly T[],retire:(actor:T)=>void){
 for(const actor of actors)if(actor.blockId==='venture'){actor.hp=0;actor.dead=.01;actor.blockId='retired-venture';retire(actor);}
}
