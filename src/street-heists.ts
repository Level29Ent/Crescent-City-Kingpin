import type {Campaign} from './campaign.ts';
import {addHeat} from './campaign.ts';
import {cashCap} from './expansion.ts';
import {cityActivityBusy} from './pursuits.ts';
import {INTERIORS} from './interiors.ts';
import {atPoint} from './navigation.ts';
export const STREET_HEISTS=[
 {id:'bank-job',interior:'bank',name:'The Brass Vault',fee:150,pay:4200,duration:420,disguise:false},
 {id:'riverboat-job',interior:'riverboat',name:'River Queen Casino Heist',fee:250,pay:6500,duration:480,disguise:true},
] as const;
export const ROBBABLE=['bakery','auto-parts','diner','florist','tailor','dice','blue-note','dive','laundromat','barber','record','seafood','pawn','corner-store','jeweler','liquor','pharmacy','electronics','boutique','pawn-east'];
export type RaidProgress={phase:'alarm'|'vault'|'loot'|'escape';progress:number;bag:number;alarmed:boolean;outside:boolean;getaway:boolean;quiet:boolean};
export const RAID_STATIONS={alarm:{x:0,z:3.4},vault:{x:0,z:0},loot:{x:0,z:-3.5}};
export function raidDefinition(id:string){return STREET_HEISTS.find(h=>h.id===id);}
export function raidInterior(id:string){return raidDefinition(id)?.interior??id;}
export function raidPoint(c:Campaign){const a=c.pursuits.active;if(a?.kind!=='raid'||!a.raid)return null;const b=INTERIORS.find(b=>b.id===raidInterior(a.id))!;return a.raid.phase==='escape'?{x:30,z:4,name:`GETAWAY · ${a.raid.getaway?'lose police, then return loot to Mama Nola':'leave on foot, board a getaway car, then lose police'} · $${a.raid.bag} bag`}:{x:b.x,z:b.z,name:`${b.name} · enter signed door · ${raidInstruction(c)}`};}
export function raidInstruction(c:Campaign){const a=c.pursuits.active,r=a?.raid;if(a?.kind!=='raid'||!r)return '';return r.phase==='escape'?'Leave through the teal exit. Get a car, lose police, return to Mama Nola.':r.phase==='alarm'?`Hold INTERACT at green alarm panel (3s) · camera trips in ${Math.max(0,Math.ceil(25-a!.window))}s`:r.phase==='vault'?`Hold INTERACT at brass vault marker in middle (${Math.ceil(8-r.progress)}s)`:`Hold INTERACT at register / loot marker by back desk (${Math.ceil((raidDefinition(a.id)?5:4)-r.progress)}s)`;}
export function startRaid(c:Campaign,id:string,interior?:string,x=0,z=0){
 if(c.legacy.tutorial<3||cityActivityBusy(c)||c.pursuits.cooldown>0||(c.pursuits.raided[id]??0)>0)return false;
 const h=raidDefinition(id),robbery=!h&&ROBBABLE.includes(id);if(!h&&!robbery||h&&c.pursuits.raidWins.includes(id)||robbery&&(interior!==id||Math.hypot(x,z+3.5)>1.8))return false;
 if(h&&(c.clean<h.fee||h.disguise&&c.kingpin.disguise<=0&&c.pursuits.wearing!=='river'))return false;
 if(h)c.clean-=h.fee;
 c.pursuits.raided[id]=h?300:240;
 c.pursuits.active={kind:'raid',id,step:0,remaining:h?.duration??180,elapsed:0,condition:100,spawned:false,resolved:false,boarded:false,cast:0,window:0,vehicleKey:'',raid:{phase:h?'alarm':'loot',progress:0,bag:0,alarmed:robbery,outside:false,getaway:false,quiet:!!h}};
 if(robbery){addHeat(c,24);c.living.reputation=c.living.reputation.map(n=>Math.max(0,n-3));}return true;
}
export function raiseRaidAlarm(c:Campaign){const r=c.pursuits.active?.raid;if(!r||r.alarmed)return;r.alarmed=true;r.quiet=false;addHeat(c,40);}
export function tickRaid(c:Campaign,dt:number,ctx:{interior:string|null;x:number;z:number;interact:boolean;driving:boolean;dead:boolean}){
 const a=c.pursuits.active,r=a?.raid;if(a?.kind!=='raid'||!r)return null;
 a.remaining-=dt;a.elapsed+=dt;
 if(ctx.dead||a.remaining<=0){c.pursuits.active=null;c.pursuits.cooldown=45;return 'Job failed. Loot lost; setup fee is not refunded.';}
 if(r.phase==='escape'){
  if(!ctx.interior){r.outside=true;if(ctx.driving)r.getaway=true;}
  return null;
 }
 const inTarget=ctx.interior===raidInterior(a.id);
 if(!inTarget){if(r.progress>0)r.progress=0;return null;}
 // The lobby has a visible camera countdown: staying too long before disabling it trips security.
 if(r.phase==='alarm'){a.window+=dt;if(a.window>=25)raiseRaidAlarm(c);}
 const p=RAID_STATIONS[r.phase];
 if(!ctx.interact||Math.hypot(ctx.x-p.x,ctx.z-p.z)>1.5){r.progress=0;return null;}
 r.progress+=dt;const needed=r.phase==='alarm'?3:r.phase==='vault'?8:raidDefinition(a.id)?5:4;
 if(r.progress<needed)return null;r.progress=0;a.step++;
 if(r.phase==='alarm'){r.phase='vault';return 'Camera circuit disabled. Reach the brass vault marker and hold Interact to crack it.';}
 if(r.phase==='vault'){r.phase='loot';return 'Vault open. Reach the back loot marker and hold Interact to fill the bag.';}
 r.bag=raidDefinition(a.id)?.pay??(180+ROBBABLE.indexOf(a.id)%5*55);r.phase='escape';addHeat(c,r.alarmed?12:22);
 return `Loot bag secured · $${r.bag}. No money credited yet. Leave, get a car and escape police.`;
}
export function settleRaid(c:Campaign,x:number,z:number,driving:boolean){const a=c.pursuits.active,r=a?.raid;if(a?.kind!=='raid'||!r||r.phase!=='escape'||!atPoint(x,z,{x:30,z:4},7))return null;if(!r.outside||!r.getaway)return 'Use a getaway car after leaving the building before returning the loot.';if(a.remaining<=0){c.pursuits.active=null;c.pursuits.cooldown=45;return 'Job expired. Unsettled loot lost.';}if(c.heat>0)return 'Lose your wanted heat before bringing the loot home.';if(driving)return 'Park and get out to hand the loot to Mama Nola.';
 const pay=Math.min(r.bag,Math.max(0,cashCap(c)-c.dirty));c.dirty+=pay;if(raidDefinition(a.id)){c.pursuits.raidWins.push(a.id);c.stats.heists++;}c.pursuits.cooldown=60;c.pursuits.active=null;return `HEIST COMPLETE · +$${pay} dirty${pay<r.bag?' (storage limit reached)':''}. Bag settled once.`;
}
