import type {Campaign} from './campaign.ts';
import {activeCrew,addHeat} from './campaign.ts';
import {cityActivityBusy,type PursuitJob} from './pursuits.ts';
import {atPoint,approach} from './navigation.ts';
export const CITY_ADVENTURES=[
 {id:'shadow-route',name:'Shadow on Canal',speaker:'Eli “Switch” Tran',pay:1500,duration:240,desc:'Tail the marked sedan from 12–45m for 25s. Too close or gunfire raises suspicion; losing it for 12s fails. Then deliver its route to Nola.'},
 {id:'rolling-manifest',name:'Rolling Manifest',speaker:'Captain June',pay:2200,duration:300,desc:'Intercept the moving truck. Disable it with aimed shots or close vehicle contact, resolve two guards and recover the manifest. No per-kill cash. Return to Nola after losing heat.'},
 {id:'last-call-rescue',name:'Last Call Rescue',speaker:'Mama Nola',pay:1800,duration:200,desc:'Pick up the witness at the clinic on foot. Stop a passenger-seat car beside them and Interact to board, then deliver them alive to the guest house before time runs out.'},
 {id:'crew-exit',name:'The Planned Exit',speaker:'Mateo “Ghost” Reyes',pay:2400,duration:300,desc:'Requires a paid loyal crew member. Choose a quiet or diversion plan at Nola, call your Follow companion and board together. Drive the three-route handoff, lose heat and return with your crew.'},
] as const;
export const ADVENTURE_ROUTE=[{x:2.7,z:-111},{x:62.7,z:-111},{x:62.7,z:-51},{x:2.7,z:-51},{x:2.7,z:-111}] as const;
export type AdventureState={progress:number;suspicion:number;lost:number;vehicleHp:number;boarded:boolean;passengerHp:number;plan:'quiet'|'diversion';vehicleKey:string;targetX?:number;targetZ?:number};
export function adventureDefinition(c:Campaign){return CITY_ADVENTURES.find(d=>d.id===c.pursuits.active?.id);}
export function startAdventure(c:Campaign,id:string,plan:'quiet'|'diversion'='quiet'){
 const d=CITY_ADVENTURES.find(d=>d.id===id);if(!d||c.legacy.tutorial<3||cityActivityBusy(c)||c.pursuits.cooldown>0||c.pursuits.adventureDone.includes(id)||!['quiet','diversion'].includes(plan)||id==='crew-exit'&&!activeCrew(c).length)return false;
 c.pursuits.active={kind:'adventure',id,step:0,remaining:d.duration,elapsed:0,condition:100,spawned:false,resolved:false,boarded:false,cast:0,window:0,vehicleKey:'',adventure:{progress:0,suspicion:0,lost:0,vehicleHp:100,boarded:false,passengerHp:100,plan,vehicleKey:''}};return true;
}
export type AdventureContext={x:number;z:number;driving:boolean;speed:number;vehicleKey:string;hasSeat:boolean;guards:number;fired:boolean;crewAboard:boolean;targetX:number;targetZ:number;inside?:boolean};
export function adventureObjective(c:Campaign,target?:{x:number;z:number}){const a=c.pursuits.active,r=a?.adventure,d=adventureDefinition(c);if(a?.kind!=='adventure'||!r||!d)return null;target??=r.targetX!==undefined&&r.targetZ!==undefined?{x:r.targetX,z:r.targetZ}:undefined;
 if(a.id==='shadow-route'&&a.step===0)return {...(target??ADVENTURE_ROUTE[0]),name:`TAIL · ${r.progress.toFixed(0)}/25s · suspicion ${r.suspicion.toFixed(0)}/100 · keep 12–45m`};
 if(a.id==='rolling-manifest'&&a.step<2)return {...(target??ADVENTURE_ROUTE[0]),name:a.step===0?`INTERCEPT · truck condition ${Math.ceil(r.vehicleHp)}% · shots or car contact`:'Recover the manifest on foot after resolving the two guards'};
 if(a.id==='last-call-rescue')return a.step===0?{x:-180,z:-60,name:'Meet the witness outside the clinic · on foot, Interact'}:a.step===1?{x:-180,z:-60,name:'Stop a passenger car by the witness · Interact to board'}:{x:60,z:180,name:`Deliver witness to guest house · ${Math.ceil(r.passengerHp)} HP · stop and Interact`};
 if(a.id==='crew-exit'&&a.step<3){const p=ADVENTURE_ROUTE[[1,2,3][a.step]!]!;return {...p,name:`CREW GETAWAY ${a.step+1}/3 · ${r.plan} · companion must be seated · drive marker then Interact`};}
 return {x:30,z:4,name:'Return to Mama Nola on foot with heat cleared · Interact to settle'};
}
export function failAdventure(c:Campaign,reason:string){c.pursuits.active=null;c.pursuits.cooldown=30;return `${reason} Contract failed; no payout. Return to the original contact to retry.`;}
export function tickAdventure(c:Campaign,dt:number,ctx:AdventureContext){const a=c.pursuits.active,r=a?.adventure;if(a?.kind!=='adventure'||!r)return null;a.remaining-=dt;a.elapsed+=dt;if(a.remaining<=0||r.passengerHp<=0)return failAdventure(c,a.remaining<=0?'Time expired.':'Witness lost.');if(ctx.inside)return null;
 if(a.id==='shadow-route'&&a.step===0&&a.boarded){const distance=Math.hypot(ctx.x-ctx.targetX,ctx.z-ctx.targetZ);r.suspicion=Math.max(0,Math.min(100,r.suspicion+(ctx.fired?50:distance<12?25:-8)*dt));r.lost=distance>65?r.lost+dt:0;if(r.suspicion>=100||r.lost>=12)return failAdventure(c,'The target spotted or lost the tail.');if(ctx.driving&&distance>=12&&distance<=45)r.progress+=dt;if(r.progress>=25){a.step=1;return 'Route recorded. Bring it back to Mama Nola.';}}
 if(a.id==='last-call-rescue'&&r.boarded&&(!ctx.driving||ctx.vehicleKey!==r.vehicleKey)){r.boarded=false;r.vehicleKey='';a.step=1;return 'Witness returned to clinic pickup after leaving the assigned vehicle. The timer continues.';}
 return null;
}
export function hitConvoy(c:Campaign,damage:number){const a=c.pursuits.active,r=a?.adventure;if(a?.kind!=='adventure'||a.id!=='rolling-manifest'||a.step!==0||!r||!Number.isFinite(damage)||damage<=0)return false;r.vehicleHp=Math.max(0,r.vehicleHp-Math.min(40,damage));if(r.vehicleHp===0){a.step=1;a.spawned=false;addHeat(c,35);}return true;}
export function hurtAdventurePassenger(c:Campaign,damage:number){const a=c.pursuits.active;if(a?.kind==='adventure'&&a.id==='last-call-rescue'&&a.adventure&&Number.isFinite(damage))a.adventure.passengerHp=Math.max(0,a.adventure.passengerHp-Math.max(0,damage));}
export function adventureInteract(c:Campaign,ctx:AdventureContext){const a=c.pursuits.active,r=a?.adventure,p=adventureObjective(c,{x:ctx.targetX,z:ctx.targetZ}),d=adventureDefinition(c);if(a?.kind!=='adventure'||!r||!p||!d||ctx.inside)return null;
 const raw=a.id==='crew-exit'&&a.step<3||a.id==='rolling-manifest'&&a.step<2;const near=raw?Math.hypot(ctx.x-p.x,ctx.z-p.z)<7:atPoint(ctx.x,ctx.z,p,7);if(!near)return null;
 if(a.remaining<=0||r.passengerHp<=0)return failAdventure(c,'Contract no longer viable.');
 if(a.id==='shadow-route'&&a.step===0)return 'Follow without getting too close; the route records automatically.';
 if(a.id==='rolling-manifest'&&a.step===0)return 'Disable the moving truck first.';
 if(a.id==='rolling-manifest'&&a.step===1){if(ctx.driving)return 'Get out to recover the manifest.';if(!a.spawned||ctx.guards>0)return 'Resolve the two convoy guards first.';a.step=2;return 'Manifest recovered. Escape and return to Nola.';}
 if(a.id==='last-call-rescue'){
  if(a.step===0){if(ctx.driving)return 'Meet the witness on foot first.';a.step=1;return 'Witness ready. Bring a stopped passenger-seat car and Interact.';}
  if(!ctx.driving||!ctx.hasSeat||Math.abs(ctx.speed)>1.5)return 'Use a stopped car with a passenger seat.';
  if(a.step===1){a.step=2;r.boarded=true;r.vehicleKey=ctx.vehicleKey;return 'Witness boarded. Drive carefully.';}
  if(!r.boarded||r.vehicleKey!==ctx.vehicleKey)return 'Collect the witness in the assigned car again.';
 }else if(a.id==='crew-exit'&&a.step<3){if(!ctx.driving||!ctx.crewAboard||!activeCrew(c).length)return 'Bring your paid loyal companion seated in the car.';a.step++;if(a.step===1)addHeat(c,r.plan==='diversion'?45:25);return 'Crew checkpoint cleared. Continue the plan.';}
 else {if(ctx.driving)return 'Get out to report to Mama Nola.';if(c.heat>0)return 'Lose wanted heat before reporting.';if(a.id==='crew-exit'&&(!c.kingpin.companion.id||!activeCrew(c).some(m=>m.id===c.kingpin.companion.id)||Math.hypot(c.kingpin.companion.x-ctx.x,c.kingpin.companion.z-ctx.z)>12))return 'Bring your active paid loyal companion home.';}
 c.clean+=d.pay;c.pursuits.adventureDone.push(d.id);c.pursuits.active=null;c.pursuits.cooldown=45;return `CITY ADVENTURE COMPLETE · ${d.name} · +$${d.pay} clean, once.`;
}
