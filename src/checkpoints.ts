import type {Campaign} from './campaign.ts';
import {missionCard,missionProof} from './mission-presentation.ts';
import {venturePoint} from './kingpin.ts';
import {storyObjective} from './city-stories.ts';
import {operationObjective} from './living-city.ts';
import {MISSIONS} from './expansion.ts';
import {approach} from './navigation.ts';
import type {StageSnapshot} from './depth.ts';
import {journalNote} from './depth.ts';
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
/** Stage state only. Never store/restore balances, earned items, ownership, choices or defeated-world actors. */
export function captureCheckpoint(c:Campaign){
 const card=missionCard(c);if(!card)return false;let snapshot:StageSnapshot|null=null,point:{x:number;z:number}|null=null;
 if(c.kingpin.active&&['story','personal','takeover','protection'].includes(c.kingpin.active.kind)){snapshot={family:'venture',active:copy(c.kingpin.active)};point=venturePoint(c);}
 else if(c.cityStories.active){snapshot={family:'story',active:copy(c.cityStories.active)};point=storyObjective(c);}
 else if(c.living.active&&['protection','heist'].includes(c.living.active.id)){snapshot={family:'operation',active:copy(c.living.active)};point=operationObjective(c);}
 else if(c.expansion.mission){const m=MISSIONS.find(m=>m.id===c.expansion.mission!.id)!;snapshot={family:'side',active:copy(c.expansion.mission)};point=m.steps[c.expansion.mission.step]??null;}
 if(!snapshot||!point)return false;const prior=c.depth.checkpoint;if(prior?.key===card.key&&prior.stage===card.step)return false;
 if(snapshot.family==='venture'){snapshot.active.spawned=false;snapshot.active.resolved=false;snapshot.active.progress=0;}
 if(snapshot.family==='operation')snapshot.active.spawned=false;
 if(snapshot.family==='story')snapshot.active.spawned=false;
 c.depth.checkpoint={key:card.key,stage:card.step,title:card.title,...approach(point),proof:missionProof(c,card.key),snapshot};journalNote(c,`Checkpoint: ${card.title} · stage ${card.step}/${card.total}`);return true;
}
export function invalidateCompletedCheckpoint(c:Campaign,completedKey?:string){const p=c.depth.checkpoint;if(p&&(completedKey===p.key||missionProof(c,p.key)>p.proof)){c.depth.checkpoint=null;return true;}return false;}
export function retryCheckpoint(c:Campaign){
 const p=c.depth.checkpoint;if(!p||invalidateCompletedCheckpoint(c))return null;
 const active=missionCard(c);if(active&&active.key!==p.key||c.lifestyle.work||c.legacy.daily&&!c.legacy.daily.finished||c.defense||c.clean<50)return null;
 // Verify identity and completion proof independently of the UI; a tampered/stale key cannot revive a different stage.
 const snapshot=copy(p.snapshot),a=snapshot.active;
 const expected=snapshot.family==='venture'?`venture:${snapshot.active.kind}:${snapshot.active.id}`:`${snapshot.family==='side'?'side':snapshot.family}:${a.id}`;
 if(expected!==p.key)return null;
 c.clean-=50;c.kingpin.active=null;c.cityStories.active=null;c.living.active=null;c.expansion.mission=null;
 if(snapshot.family==='venture')c.kingpin.active=snapshot.active;
 if(snapshot.family==='story')c.cityStories.active=snapshot.active;
 if(snapshot.family==='operation')c.living.active=snapshot.active;
 if(snapshot.family==='side')c.expansion.mission=snapshot.active;
 c.depth.retries++;journalNote(c,`Retried ${p.title} stage ${p.stage} · $50 recovery fee, no refunds.`);
 return {x:p.x,z:p.z,title:p.title};
}
