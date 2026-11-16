import type {Campaign} from './campaign.ts';
import type {Venture} from './kingpin.ts';
import type {CityStories} from './city-stories.ts';
import type {LivingCity} from './living-city.ts';
import type {Expansion} from './expansion.ts';
import {restoreKingpin} from './kingpin.ts';
import {restoreCityStories} from './city-stories.ts';
import {restoreLivingCity} from './living-city.ts';
import {restoreExpansion} from './expansion.ts';
export type StageSnapshot={family:'venture';active:Venture}|{family:'story';active:NonNullable<CityStories['active']>}|{family:'operation';active:NonNullable<LivingCity['active']>}|{family:'side';active:NonNullable<Expansion['mission']>};
export type Checkpoint={key:string;stage:number;title:string;x:number;z:number;proof:number;snapshot:StageSnapshot};
export type Depth={checkpoint:Checkpoint|null;allyStage:string;allyHp:number;guided:boolean;cockpit:boolean;retries:number;journal:string[]};
export function newDepth():Depth{return {checkpoint:null,allyStage:'',allyHp:100,guided:true,cockpit:false,retries:0,journal:[]};}
export function restoreDepth(v:any):Depth{
 const s=newDepth();if(!v||typeof v!=='object')return s;s.allyStage=typeof v.allyStage==='string'?v.allyStage.slice(0,100):'';s.allyHp=Number.isFinite(v.allyHp)?Math.max(0,Math.min(100,v.allyHp)):100;s.guided=v.guided!==false;s.cockpit=v.cockpit===true;s.retries=Number.isFinite(v.retries)?Math.max(0,Math.floor(v.retries)):0;
 s.journal=Array.isArray(v.journal)?v.journal.filter((x:unknown)=>typeof x==='string').map((x:string)=>x.slice(0,200)).slice(-30):[];
 const p=v.checkpoint,a=p?.snapshot?.active,family=p?.snapshot?.family;let snapshot:StageSnapshot|null=null;
 if(family==='venture'){const active=restoreKingpin({active:a}).active;if(active&&['story','personal','takeover','protection'].includes(active.kind))snapshot={family,active};}
 if(family==='story'){const active=restoreCityStories({active:a}).active;if(active)snapshot={family,active};}
 if(family==='operation'){const active=restoreLivingCity({active:a}).active;if(active&&['protection','heist'].includes(active.id))snapshot={family,active};}
 if(family==='side'){const active=restoreExpansion({mission:a}).mission;if(active)snapshot={family,active};}
 if(snapshot&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.proof)&&typeof p.key==='string'&&typeof p.title==='string')s.checkpoint={key:p.key.slice(0,100),stage:Math.max(0,Math.floor(Number(p.stage)||0)),title:p.title.slice(0,100),x:Math.max(-238,Math.min(238,p.x)),z:Math.max(-238,Math.min(232,p.z)),proof:Math.max(0,p.proof),snapshot};
 return s;
}
export function journalNote(c:Campaign,text:string){if(c.depth.journal.at(-1)===text)return;c.depth.journal.push(text.slice(0,200));if(c.depth.journal.length>30)c.depth.journal.shift();}
export function choiceEffects(c:Campaign){
 const union=c.kingpin.chapters.union,exposed=c.kingpin.chapters.betrayal==='protect',sold=c.kingpin.chapters.betrayal==='profit';
 return {dockAllies:union==='protect',dockPressure:union==='profit',exposed,sold,coalition:c.kingpin.chapters.reckoning==='protect',guardDelta:(union==='profit'?1:0)+(sold?1:0)-(exposed?1:0),retaliationInterval:sold?150:exposed?300:240};
}
export function guidedTabs(c:Campaign){
 if(!c.depth.guided)return null;
 if(c.legacy.tutorial<3)return ['City Journal','Character','Legacy & Training','Polish & Replays','Buildings','City Map','Settings'];
 const established=c.stats.captured>0||c.cityStories.completed.length>0||c.living.completed.length>0||c.expansion.properties.length>0||Object.keys(c.kingpin.chapters).length>0;
 if(!established&&c.lifestyle.workCompleted===0)return ['City Journal','Jobs & Style','Garage','Turf','Crew','Market','Safehouse','Character','Legacy & Training','City Map','Polish & Replays','Settings'];
 return null;
}
export function openingAdvice(c:Campaign){
 if(c.legacy.tutorial===0)return 'Meet Mama Nola first. Follow the ground marker, then Interact. You do not need to manage an empire yet.';
 if(c.legacy.tutorial===1)return 'Your first rival is a practice fight. Aim, fire and reload; crouch if you need steadier shots. Your next lesson unlocks only after this encounter.';
 if(c.legacy.tutorial===2)return 'Take the marked sedan and reach the nearby drop. Learn driving before accepting longer jobs.';
 if(c.lifestyle.workCompleted===0)return 'First open-city goal: accept Clinic Supply Run or Catering in Jobs & Style. Pickup, deliver and earn clean money without a fight.';
 if(c.stats.captured===0)return 'Next: hire a specialist or capture one corner. Dirty income needs laundering; do not buy every upgrade at once.';
 return 'Open city unlocked. Follow the journal’s unresolved objectives, or disable guided menus to browse all systems.';
}

export function encounterGuards(c:Campaign,kind:string,id:string){
 const effects=choiceEffects(c),base=kind==='takeover'?3:kind==='story'?3:2;
 return Math.max(1,Math.min(5,base+(kind==='takeover'||kind==='story'&&id!=='union'?effects.guardDelta-(effects.coalition?1:0):0)));
}
