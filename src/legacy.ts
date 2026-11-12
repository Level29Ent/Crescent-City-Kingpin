import type { Campaign } from './campaign.ts';
export const TRAITS = [
  {id:'balanced',name:'Streetwise',description:'Balanced: no bonus or penalty.'},
  {id:'driver',name:'Wheelman',description:'+15% vehicle speed; +15% action heat.'},
  {id:'accountant',name:'Numbers Expert',description:'+5 percentage points laundering return; -10% gun damage.'},
  {id:'enforcer',name:'Bruiser',description:'+15% gun damage; -15% sprint speed.'},
] as const;
export type LegacyState = { generation:number; inherited:number; tutorial:number; sensitivity:number; trait:string; start:string; copsOutrun:number; lastHeat:number;
  mods:Record<string,{nitro:number;glow:boolean;matte:boolean;rims:boolean}>; milestones:string[]; pending:string[]; daily:null|{date:string;step:number;elapsed:number;best:number|null;finished:boolean}; microClock:number; lieutenantClock:number };
export function newLegacy(tutorial=0):LegacyState{return {generation:0,inherited:0,tutorial,sensitivity:1,trait:'balanced',start:'quarter',copsOutrun:0,lastHeat:0,mods:{},milestones:[],pending:[],daily:null,microClock:0,lieutenantClock:0};}
export function restoreLegacy(value:any):LegacyState{
  const s=newLegacy(3);if(!value||typeof value!=='object')return s;
  const number=(v:any,f=0,max=1e9)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,v)):f;
  for(const k of ['generation','inherited','tutorial','sensitivity','copsOutrun','lastHeat','microClock','lieutenantClock'] as const)s[k]=number(value[k],s[k],k==='tutorial'?3:k==='sensitivity'?2:1e9);
  s.sensitivity=Math.max(.5,s.sensitivity);s.trait=TRAITS.some(t=>t.id===value.trait)?value.trait:'balanced';s.start=['quarter','uptown','port'].includes(value.start)?value.start:'quarter';
  s.milestones=['first','clean10','million'].filter(id=>value.milestones?.includes(id));s.pending=Array.isArray(value.pending)?value.pending.filter((v:any)=>typeof v==='string').slice(0,10):[];
  if(value.mods&&typeof value.mods==='object')for(const key of Object.keys(value.mods).slice(0,8)){if(!/^[0-7]$/.test(key))continue;const m=value.mods[key];if(m&&typeof m==='object')s.mods[key]={nitro:Math.floor(number(m.nitro,0,3)),glow:m.glow===true,matte:m.matte===true,rims:m.rims===true};}
  if(value.daily&&/^\d{4}-\d{2}-\d{2}$/.test(value.daily.date))s.daily={date:value.daily.date,step:Math.floor(number(value.daily.step,0,3)),elapsed:number(value.daily.elapsed),best:value.daily.best===null?null:number(value.daily.best),finished:value.daily.finished===true};
  return s;
}
export const TUTORIAL = [
  'WALK: WASD / left joystick. Follow the cyan arrow to Mama Nola’s. E / INTERACT to meet her.',
  'FIRST RIVAL: Aim with right mouse / AIM, fire with left click / FIRE. R reloads. Defeat the practice rival at the street corner.',
  'FIRST DELIVERY: E beside the marked sedan to enter. W/S or joystick: gas/reverse; A/D: steer. Reach the nearby drop-off.',
  'EMPIRE: Capture corners for dirty income, launder at safehouses, and build toward $1,000,000 clean capital.',
];
export function advanceTutorial(c:Campaign,stage:number){if(c.legacy.tutorial===stage){c.legacy.tutorial=Math.min(3,stage+1);return true;}return false;}
export function peakMultiplier(time:number,heat:number){const hour=(18+time/40)%24;return (hour>=19||hour<6?1.35:hour>=17?1.15:1)*(heat>=60?1.2:1);}
export function dailyRoute(date:string){let hash=0;for(const ch of date)hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;const options=[{x:0,z:60},{x:60,z:0},{x:-60,z:0},{x:0,z:-60}];const offset=hash%4;return [options[offset]!,options[(offset+1)%4]!,{x:30,z:4}];}
export function startDaily(c:Campaign,date=new Date().toISOString().slice(0,10)){if(c.legacy.daily?.date===date&&!c.legacy.daily.finished)return false;c.legacy.daily={date,step:0,elapsed:0,best:c.legacy.daily?.date===date?c.legacy.daily.best:null,finished:false};return true;}
export function dailyCheckpoint(c:Campaign,x:number,z:number){const d=c.legacy.daily;if(!d||d.finished)return false;const point=dailyRoute(d.date)[d.step];if(!point||Math.hypot(x-point.x,z-point.z)>7)return false;d.step++;if(d.step===3){d.finished=true;d.best=Math.min(d.best??Infinity,d.elapsed);c.clean+=1000;return true;}return false;}
export function milestoneRewards(c:Campaign){const s=c.legacy;const awards=[['first',c.stats.captured>=1,'First turf secured — +$150 clean',150],['clean10',c.stats.cleaned>=10000,'$10,000 laundered — +$500 clean',500],['million',c.clean>=1000000,'Million-dollar Kingpin — legacy retirement unlocked',0]] as const;for(const [id,ready,text,cash]of awards)if(ready&&!s.milestones.includes(id)){s.milestones.push(id);s.pending.push(text);c.clean+=cash;}}
export function legacyInheritance(c:Campaign){return {generation:c.legacy.generation+1,inherited:Math.min(100000,Math.floor(c.clean*.05))};}
export function shareCard(c:Campaign):HTMLCanvasElement{
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const g=canvas.getContext('2d')!;
  const bg=g.createLinearGradient(0,0,1200,630);bg.addColorStop(0,'#091c2b');bg.addColorStop(1,'#3b244c');g.fillStyle=bg;g.fillRect(0,0,1200,630);
  g.strokeStyle='#d3ad69';g.lineWidth=3;g.strokeRect(30,30,1140,570);g.fillStyle='#83d9cb';g.font='22px sans-serif';g.fillText('LEVEL 29 · CRESCENT CITY KINGPIN',70,90);
  g.fillStyle='#f5d59a';g.font='bold 56px sans-serif';g.fillText(c.alias.slice(0,24),70,175);
  g.font='28px sans-serif';g.fillText(`Generation ${c.legacy.generation+1} · ${c.clean>=1000000?'MILLION-DOLLAR KINGPIN':'EMPIRE IN PROGRESS'}`,70,235);
  g.fillStyle='#fff';g.font='32px sans-serif';const lines=[`Clean capital: $${Math.floor(c.clean).toLocaleString()}`,`Cash laundered: $${Math.floor(c.stats.cleaned).toLocaleString()}`,`Corners conquered: ${c.stats.captured}   ·   Police chases escaped: ${c.legacy.copsOutrun}`,`Max heat survived: ${Math.floor(c.stats.maxHeat)} / 100`];lines.forEach((line,i)=>g.fillText(line,70,320+i*60));return canvas;
}
