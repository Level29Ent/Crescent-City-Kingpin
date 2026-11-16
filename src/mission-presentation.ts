import type {Campaign} from './campaign.ts';
import {CHAPTERS,venturePoint} from './kingpin.ts';
import {STORIES,storyObjective} from './city-stories.ts';
import {MISSIONS} from './expansion.ts';
import {OPERATIONS,operationObjective} from './living-city.ts';
import {WORK,workObjective} from './lifestyle.ts';
export type MissionCard={key:string;title:string;speaker:string;dialogue:string;objective:string;step:number;total:number;proof:number};
export function missionCard(c:Campaign):MissionCard|null{
 const k=c.kingpin.active;if(k){const ch=CHAPTERS.find(m=>m.id===k.id);return {key:`venture:${k.kind}:${k.id}`,title:ch?.name??`${k.kind.toUpperCase()} · ${k.id}`,speaker:ch?.speaker??'Neighborhood contact',dialogue:ch?.dialogue??'Follow the marked objective. Rewards are settled only after the final on-site interaction.',objective:venturePoint(c)!.name,step:k.step+1,total:k.kind==='takeover'?6:k.kind==='event'?(k.id==='relief'?1:2):3,proof:missionProof(c,`venture:${k.kind}:${k.id}`)};}
 const story=c.cityStories.active;if(story){const m=STORIES.find(m=>m.id===story.id)!;return {key:`story:${m.id}`,title:m.title,speaker:m.speaker,dialogue:m.dialogue,objective:storyObjective(c)!.text,step:story.step+1,total:3,proof:Number(c.cityStories.completed.includes(m.id))};}
 const op=c.living.active;if(op){const m=OPERATIONS.find(m=>m.id===op.id)!;return {key:`operation:${m.id}`,title:m.name,speaker:'City dispatcher',dialogue:m.desc,objective:operationObjective(c)!.text,step:op.step+1,total:m.stages.length,proof:Number(c.living.completed.includes(m.id))};}
 const side=c.expansion.mission;if(side){const m=MISSIONS.find(m=>m.id===side.id)!;return {key:`side:${m.id}`,title:m.name,speaker:'Mama Nola’s mission desk',dialogue:m.desc,objective:m.steps[side.step]!.name,step:side.step+1,total:m.steps.length,proof:Number(c.expansion.completed.includes(m.id))};}
 const work=c.lifestyle.work;if(work){const m=WORK.find(m=>m.id===work.id)!;return {key:`work:${m.id}`,title:m.name,speaker:'Jobs dispatcher',dialogue:m.description,objective:workObjective(c)!.text,step:work.step+1,total:2,proof:c.lifestyle.workCompleted};}return null;
}
export function missionProof(c:Campaign,key:string){const [family,kind,id]=key.split(':');if(family==='venture')return kind==='story'?Number(!!c.kingpin.chapters[id!]):kind==='personal'?Number(c.kingpin.personal.includes(id!)):kind==='takeover'?Number(c.kingpin.takeoverWon):c.kingpin.businessWins;if(family==='story')return Number(c.cityStories.completed.includes(kind!));if(family==='operation')return Number(c.living.completed.includes(kind!));if(family==='side')return Number(c.expansion.completed.includes(kind!));return c.lifestyle.workCompleted;}
export function portraitInitials(name:string){return name.replace(/[“”’']/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase();}
export function ledger(c:Campaign){return {clean:c.clean,dirty:c.dirty,heat:c.heat,loyalty:c.crew.reduce((sum,m)=>sum+m.loyalty,0)};}
