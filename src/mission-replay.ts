import type {Campaign} from './campaign.ts';
import {restoreCampaign} from './campaign.ts';
import {STORIES,startStory} from './city-stories.ts';
import {MISSIONS,startMission} from './expansion.ts';
import {OPERATIONS,startOperation} from './living-city.ts';
import {CHAPTERS,startChapter} from './kingpin.ts';
export type ReplayChoice={key:string;name:string;family:'story'|'side'|'operation'|'chapter';id:string};
export function replayChoices(c:Campaign):ReplayChoice[]{return [
 ...STORIES.filter(m=>c.cityStories.completed.includes(m.id)).map(m=>({key:`story:${m.id}`,name:m.title,family:'story' as const,id:m.id})),
 ...MISSIONS.filter(m=>c.expansion.completed.includes(m.id)).map(m=>({key:`side:${m.id}`,name:m.name,family:'side' as const,id:m.id})),
 ...OPERATIONS.filter(m=>c.living.completed.includes(m.id)).map(m=>({key:`operation:${m.id}`,name:m.name,family:'operation' as const,id:m.id})),
 ...CHAPTERS.filter(m=>!!c.kingpin.chapters[m.id]).map(m=>({key:`chapter:${m.id}`,name:m.name,family:'chapter' as const,id:m.id})),
 ];}
export function prepareReplay(c:Campaign,key:string){
 const choice=replayChoices(c).find(r=>r.key===key);if(!choice)return null;
 const sandbox=restoreCampaign(JSON.parse(JSON.stringify(c)))!;
 sandbox.kingpin.active=null;sandbox.living.active=null;sandbox.cityStories.active=null;sandbox.lifestyle.work=null;sandbox.expansion.mission=null;sandbox.legacy.daily=null;sandbox.defense=null;sandbox.heat=0;sandbox.intervention='';sandbox.kingpin.companion.id='';sandbox.kingpin.disguise=0;
 // Disabled ambient missions keep practice focused; all balances remain a disposable copy.
 sandbox.kingpin.eventClock=0;
 if(choice.family==='story'){sandbox.cityStories.completed=sandbox.cityStories.completed.filter(id=>id!==choice.id);if(!startStory(sandbox,choice.id,'quiet'))return null;}
 if(choice.family==='side'){sandbox.expansion.completed=sandbox.expansion.completed.filter(id=>id!==choice.id);if(!startMission(sandbox,choice.id))return null;}
 if(choice.family==='operation'){sandbox.living.completed=sandbox.living.completed.filter(id=>id!==choice.id);if(!startOperation(sandbox,choice.id,'loud'))return null;}
 if(choice.family==='chapter'){delete sandbox.kingpin.chapters[choice.id];if(!startChapter(sandbox,choice.id,c.kingpin.chapters[choice.id]??'protect','assault'))return null;}
 return {choice,sandbox};
}
export function replayActive(c:Campaign,r:ReplayChoice){return r.family==='story'?c.cityStories.active?.id===r.id:r.family==='side'?c.expansion.mission?.id===r.id:r.family==='operation'?c.living.active?.id===r.id:c.kingpin.active?.kind==='story'&&c.kingpin.active.id===r.id;}
export function replayCompleted(c:Campaign,r:ReplayChoice){return r.family==='story'?c.cityStories.completed.includes(r.id):r.family==='side'?c.expansion.completed.includes(r.id):r.family==='operation'?c.living.completed.includes(r.id):!!c.kingpin.chapters[r.id];}
export function replayVerdict(completed:boolean,elapsed:number,shots:number,challenge:'finish'|'quiet'|'speed'){return completed&&(challenge==='finish'||challenge==='quiet'&&shots===0||challenge==='speed'&&elapsed<=180);}
/** Every persistence/transfer/destructive path must honor this boundary, not just autosave. */
export function canPersistReplay(replaying:boolean){return !replaying;}
