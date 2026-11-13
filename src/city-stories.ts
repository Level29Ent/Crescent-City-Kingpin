import {atPoint} from './navigation.ts';
import type { Campaign } from './campaign.ts';
export const STORIES = [
 {id:'brass',title:'The Brass Ledger',speaker:'Mama Nola',dialogue:'The Violet Crown took our musicians’ pay. Get the ledger back. We can settle quietly—or make a statement.',x:0,z:-120,pay:1800,steps:['Meet the record keeper on Rampart Street','Defeat the Crown collectors','Return the ledger to Mama Nola']},
 {id:'levee',title:'Midnight on the Levee',speaker:'Captain June',dialogue:'Silas Crane is fencing stolen relief supplies. Help the dockhands, or take his premium cargo for yourself.',x:120,z:180,pay:3200,steps:['Inspect the cargo seal at the port','Defeat Crane’s dock lieutenant','Bring the shipping manifest home']},
 {id:'crown',title:'A Crown of Broken Promises',speaker:'Delphine Moreau',dialogue:'You have my attention. Come to the old station. We settle the future of these streets tonight.',x:-180,z:0,pay:6500,steps:['Face Delphine at the old station','Defeat the rival boss and her guards','Return to Mama Nola for the finale']},
] as const;
export const DISCOVERIES = [
 {id:'station',name:'Old Tremé Station',area:'Tremé rail quarter',x:-180,z:0,reward:200,kind:'parts'},
 {id:'bywater',name:'Bywater Mural Walk',area:'Bywater arts corridor',x:180,z:60,reward:450,kind:'cash'},
 {id:'cemetery',name:'Cemetery Edge Archive',area:'St. Louis cemetery edge',x:180,z:0,reward:300,kind:'cash'},
 {id:'canal',name:'Canal Street Newsroom',area:'Canal civic block',x:0,z:120,reward:350,kind:'cash'},
] as const;
export type CityStories = {active:null|{id:string;step:number;choice:string;spawned:boolean};completed:string[];discovered:string[];mercy:number;trafficHits:number;bossWins:number;revolver:boolean;visits:string[]};
export function newCityStories():CityStories{return {active:null,completed:[],discovered:[],mercy:0,trafficHits:0,bossWins:0,revolver:false,visits:[]};}
export function restoreCityStories(v:any):CityStories{
 const s=newCityStories();if(!v||typeof v!=='object')return s;
 s.completed=STORIES.filter(m=>Array.isArray(v.completed)&&v.completed.includes(m.id)).map(m=>m.id);
 s.discovered=DISCOVERIES.filter(m=>Array.isArray(v.discovered)&&v.discovered.includes(m.id)).map(m=>m.id);
 s.visits=Array.isArray(v.visits)?v.visits.filter((x:any)=>typeof x==='string').slice(0,30):[];
 for(const key of ['mercy','trafficHits','bossWins'] as const)s[key]=typeof v[key]==='number'&&Number.isFinite(v[key])?Math.max(0,Math.floor(v[key])):0;
 s.revolver=v.revolver===true;
 if(v.active&&STORIES.some(m=>m.id===v.active.id)&&['quiet','bold'].includes(v.active.choice))s.active={id:v.active.id,step:Math.max(0,Math.min(2,Math.floor(Number(v.active.step)||0))),choice:v.active.choice,spawned:v.active.spawned===true};return s;
}
export function startStory(c:Campaign,id:string,choice:string){
 const i=STORIES.findIndex(m=>m.id===id);if(i<0||c.lifestyle.work||c.cityStories.active||c.expansion.mission||(c.legacy.daily&&!c.legacy.daily.finished)||c.cityStories.completed.includes(id)||c.legacy.tutorial<3||!['quiet','bold'].includes(choice)||(i>0&&!c.cityStories.completed.includes(STORIES[i-1]!.id)))return false;
 c.cityStories.active={id,step:0,choice,spawned:false};return true;
}
export function storyObjective(c:Campaign){const a=c.cityStories.active;if(!a)return null;const m=STORIES.find(m=>m.id===a.id)!;return {x:a.step===2?30:m.x,z:a.step===2?4:m.z,text:`${m.title}: ${m.steps[a.step]}`};}
export function storyInteract(c:Campaign,x:number,z:number):'fight'|'complete'|null{
 const a=c.cityStories.active,point=storyObjective(c);if(!a||!point||!atPoint(x,z,point,8)||a.step===1)return null;
 if(a.step===0){a.step=1;a.spawned=true;return 'fight';}
 const m=STORIES.find(m=>m.id===a.id)!;
 c.dirty+=Math.round(m.pay*(a.choice==='bold'?1.35:1));c.heat=Math.min(100,c.heat+(a.choice==='bold'?18:5));
 if(a.choice==='quiet'){c.cityStories.mercy++;c.crew.forEach(p=>p.loyalty=Math.min(100,p.loyalty+5));}
 c.cityStories.completed.push(a.id);c.cityStories.bossWins++;if(a.id==='crown')c.cityStories.revolver=true;c.cityStories.active=null;return 'complete';
}
export function discover(c:Campaign,id:string){const d=DISCOVERIES.find(d=>d.id===id);if(!d||c.cityStories.discovered.includes(id))return false;c.cityStories.discovered.push(id);if(d.kind==='parts')c.expansion.parts+=4;else c.dirty+=d.reward;return true;}
export function tacticalHeading(toPlayer:number,distance:number,seed:number,time:number){
 // Alternate short flanking bursts and firing windows rather than direct-line swarming.
 return toPlayer+(distance>9&&distance<35&&Math.floor(time/3+seed)%3===0?(seed%2?1:-1)*.75:0);
}
export function coverReduction(near:boolean,crouched:boolean){return near&&crouched?.4:1;}
