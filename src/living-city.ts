import type {Campaign} from './campaign.ts';
import {activeCrew} from './campaign.ts';
import {owns,PROPERTIES} from './expansion.ts';
import {INTERIORS} from './interiors.ts';
import {atPoint} from './navigation.ts';
import {cityClock} from './dynamics.ts';
export const OPERATIONS=[
 {id:'recovery',name:'Borrowed Wheels',desc:'Recover a marked estate wagon without wrecking it. Return it to the chop shop.',pay:750,duration:240,unlock:0,stages:[{x:120,z:60,name:'Find the marked estate wagon'},{x:-60,z:0,name:'Deliver the marked wagon · E while driving'}]},
 {id:'rescue',name:'Last Ride Home',desc:'Reach the stranded musician, pick them up on foot, then drive them to the clinic in a car (not a motorcycle).',pay:950,duration:200,unlock:1,stages:[{x:-120,z:-180,name:'Meet the stranded musician · E on foot'},{x:-180,z:-60,name:'Drive the musician to the clinic · E'}]},
 {id:'stealth',name:'No Alarms Tonight',desc:'Carry a confidential package from the post office to the gallery. No gunfire or wanted heat; stay below 30.',pay:1200,duration:240,unlock:1,stages:[{x:120,z:-180,name:'Collect the sealed package · E'},{x:-120,z:180,name:'Deliver quietly to Royal Street Gallery · E'}]},
 {id:'protection',name:'Keep the Music Playing',desc:'Meet the club manager, defeat three extortionists, then return to the desk. No remote menu payouts.',pay:1500,duration:300,unlock:2,stages:[{x:0,z:-60,name:'Meet the jazz-club manager · E'},{x:0,z:-60,name:'Defeat the three extortionists'},{x:0,z:-60,name:'Report back to the manager · E'}]},
 {id:'heist',name:'The Canal Exchange',desc:'A three-stop street heist. Quiet needs a paid smuggler; loud brings guards. Recover the case, then lose the police before delivery.',pay:2600,duration:360,unlock:3,stages:[{x:0,z:-120,name:'Scout the bank approach · E'},{x:60,z:0,name:'Recover the exchange case · E'},{x:90,z:124,name:'Lose the police, deliver the case · E'}]},
] as const;
export type LivingCity={completed:string[];reputation:number[];active:null|{id:string;step:number;remaining:number;choice:'quiet'|'loud';spawned:boolean;vehicleCondition:number};serviceCooldown:number;rested:number;vehicleCondition:Record<string,number>;tires:Record<string,number>;businessLevels:Record<string,number>;training:Record<string,number>;controls:{scale:number;opacity:number;leftHanded:boolean;aimAssist:boolean}};
export function newLivingCity():LivingCity{return {completed:[],reputation:[0,0,0,0,0],active:null,serviceCooldown:0,rested:0,vehicleCondition:{},tires:{},businessLevels:{},training:{},controls:{scale:1,opacity:.95,leftHanded:false,aimAssist:false}};}
export function restoreLivingCity(v:any):LivingCity{
 const s=newLivingCity();if(!v||typeof v!=='object')return s;
 const n=(v:any,max:number,f=0)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,v)):f;
 s.completed=OPERATIONS.filter(m=>Array.isArray(v.completed)&&v.completed.includes(m.id)).map(m=>m.id);
 s.reputation=s.reputation.map((_,i)=>Math.floor(n(v.reputation?.[i],100)));s.serviceCooldown=n(v.serviceCooldown,60);s.rested=n(v.rested,120);
 for(let i=0;i<8;i++)if(v.vehicleCondition?.[i]!==undefined)s.vehicleCondition[i]=n(v.vehicleCondition[i],100,100);
 for(const key of ['tires','businessLevels','training'] as const)if(v[key]&&typeof v[key]==='object'){
  const allowed=key==='tires'?Array.from({length:8},(_,i)=>String(i)):key==='businessLevels'?PROPERTIES.map(p=>p.id):['muscle','mechanic','accountant','hacker','smuggler','demo'];
  for(const id of allowed)if(v[key][id]!==undefined)s[key][id]=Math.floor(n(v[key][id],3));
 }
 const a=v.active,m=OPERATIONS.find(m=>m.id===a?.id);
 if(m&&!s.completed.includes(m.id)&&['quiet','loud'].includes(a.choice))s.active={id:m.id,step:Math.floor(n(a.step,m.stages.length-1)),remaining:n(a.remaining,m.duration,m.duration),choice:a.choice,spawned:a.spawned===true,vehicleCondition:n(a.vehicleCondition,100,100)};
 s.controls={scale:Math.max(.8,n(v.controls?.scale,1.25,1)),opacity:Math.max(.35,n(v.controls?.opacity,1,.95)),leftHanded:v.controls?.leftHanded===true,aimAssist:v.controls?.aimAssist===true};return s;
}
export function activityBusy(c:Campaign){return !!(c.living.active||c.lifestyle.work||c.expansion.mission||c.cityStories.active||(c.legacy.daily&&!c.legacy.daily.finished));}
export function trained(c:Campaign,id:string){return activeCrew(c).some(m=>m.id===id)?c.living.training[id]??0:0;}
export function reputationGain(c:Campaign,district:number,amount:number){if(district>=0&&district<5)c.living.reputation[district]=Math.max(0,Math.min(100,c.living.reputation[district]!+amount));}
export function startOperation(c:Campaign,id:string,choice:'quiet'|'loud'='loud'){
 const m=OPERATIONS.find(m=>m.id===id);if(!m||!['quiet','loud'].includes(choice)||c.legacy.tutorial<3||activityBusy(c)||c.living.completed.includes(id)||c.living.completed.length<m.unlock)return false;
 if((id==='stealth'||id==='heist'&&choice==='quiet')&&c.heat>=30)return false;
 if(id==='heist'&&choice==='quiet'&&!activeCrew(c).some(m=>m.id==='smuggler'))return false;
 c.living.active={id,step:0,remaining:m.duration,choice,spawned:false,vehicleCondition:100};return true;
}
export function operationObjective(c:Campaign){const a=c.living.active;if(!a)return null;const m=OPERATIONS.find(m=>m.id===a.id)!;return {...m.stages[a.step]!,text:`${m.name} · ${m.stages[a.step]!.name} · ${Math.ceil(a.remaining)}s`};}
export type OperationContext={x:number;z:number;driving:boolean;bike:boolean;recoveryCar:boolean;condition:number;guards:number;fired:boolean;searching:boolean};
export function operationInteract(c:Campaign,ctx:OperationContext){
 const a=c.living.active,point=operationObjective(c);if(!a||!point||!atPoint(ctx.x,ctx.z,point,8))return null;
 if(a.id==='recovery'&&a.step===0&&!ctx.driving)return null;
 if(a.id==='recovery'&&(!ctx.recoveryCar||ctx.condition<=20))return 'Use the marked wagon and keep its condition above 20%.';
 if(a.id==='rescue'&&(a.step===0?ctx.driving:!ctx.driving||ctx.bike))return a.step===0?'Exit the vehicle to meet the musician.':'The musician needs a car, not a motorcycle.';
 if((a.id==='protection'||a.id==='heist'&&a.choice==='loud')&&a.step===1&&(!a.spawned||ctx.guards>0))return 'Clear the marked guards first.';
 if(a.id==='heist'&&a.step===2&&(c.heat>=30||ctx.searching))return 'Lose the police before delivering the case.';
 const m=OPERATIONS.find(m=>m.id===a.id)!;
 if(a.step<m.stages.length-1){a.step++;a.spawned=false;if(a.id==='heist')c.heat=Math.min(100,c.heat+(a.choice==='loud'?35:8));return 'Operation advanced. Follow the next marker.';}
 c.clean+=Math.round(m.pay*(1+trained(c,'hacker')*.05));c.living.completed.push(a.id);
 reputationGain(c,a.id==='protection'?0:a.id==='rescue'?1:3,15);c.living.active=null;
 return `${m.name} complete! Clean pay +$${Math.round(m.pay*(1+trained(c,'hacker')*.05))}. New equipment and operations may be unlocked.`;
}
export function tickOperation(c:Campaign,dt:number,fired:boolean){
 c.living.serviceCooldown=Math.max(0,c.living.serviceCooldown-dt);c.living.rested=Math.max(0,c.living.rested-dt);
 const a=c.living.active;if(!a)return null;a.remaining-=dt;
 const quiet=a.id==='stealth'||a.id==='heist'&&a.choice==='quiet';
 if(a.remaining<=0||quiet&&(fired||c.heat>=30)){c.living.active=null;return quiet&&(fired||c.heat>=30)?'Operation failed: the quiet approach was compromised.':'Operation expired. No payout. Retry from City Life.';}
 return null;
}
export function businessHours(id:string,clock:number){const h=cityClock(clock).hour;if(['jazz','blue-note','dive','music','arcade'].includes(id))return h>=17||h<5;if(['clinic','garage','auto-parts','hq','hotel'].includes(id))return true;return h>=6&&h<22;}
export type ServicePlayer={hp:number;stamina:number;condition:number|null};
export function localService(c:Campaign,id:string,action:'meal'|'treatment'|'repair',player:ServicePlayer){
 const room=INTERIORS.find(r=>r.id===id);if(!room||c.living.serviceCooldown>0||!businessHours(id,c.clock))return null;
 const valid=action==='meal'?room.theme==='cafe':action==='treatment'?id==='clinic':room.theme==='garage';if(!valid)return null;
 const base=action==='meal'?25:action==='treatment'?80:100;
 const cost=Math.round(base*(1-Math.min(.15,Math.max(...c.living.reputation)/100*.15))*(action==='repair'?1-trained(c,'mechanic')*.1:1));
 if(c.clean<cost||(action==='meal'?c.living.rested>0&&player.stamina>=100:action==='treatment'?player.hp<=0||player.hp>=100:player.condition===null||player.condition>=100))return null;
 c.clean-=cost;c.living.serviceCooldown=30;if(action==='meal')c.living.rested=120;
 return {hp:action==='treatment'?100:player.hp,stamina:action==='meal'?100:player.stamina,condition:action==='repair'?100:player.condition,cost};
}
export function upgradeTires(c:Campaign,index:number){const level=c.living.tires[index]??0;if(!c.expansion.cars[index]||c.expansion.runs.some(r=>r.car===index)||level>=3||c.living.completed.length<1||c.clean<300*(level+1)||c.expansion.parts<1)return false;c.clean-=300*(level+1);c.expansion.parts--;c.living.tires[index]=level+1;return true;}
export function trainCrew(c:Campaign,id:string){const level=c.living.training[id]??0;if(!activeCrew(c).some(m=>m.id===id)||level>=3||c.living.completed.length<2||c.clean<400*(level+1))return false;c.clean-=400*(level+1);c.living.training[id]=level+1;return true;}
export function upgradeBusiness(c:Campaign,id:string){const level=c.living.businessLevels[id]??0;if(!owns(c,id)||level>=3||c.living.completed.length<3||c.clean<600*(level+1))return false;c.clean-=600*(level+1);c.living.businessLevels[id]=level+1;return true;}
export function businessMultiplier(c:Campaign,id:string){return 1+(c.living.businessLevels[id]??0)*.15;}
