import {CITY_ADVENTURES,startAdventure} from './city-adventures.ts';
import {businessClosed} from './city-memory.ts';
import {ACTION_CAMPAIGN,startActionChapter} from './action-campaign.ts';
import {STREET_HEISTS,startRaid} from './street-heists.ts';
import {startStreetEvent} from './city-atmosphere.ts';
import {facadeDoor} from './doorways.ts';
import type {Campaign} from './campaign.ts';
import {SPECIALISTS} from './campaign.ts';
import {INTERIORS} from './interiors.ts';
import {approach,atPoint,destinationInterior,type Point,type MapLocation} from './navigation.ts';
import {MISSIONS,PROPERTIES,owns,startMission} from './expansion.ts';
import {WORK,startWork,workObjective} from './lifestyle.ts';
import {STORIES,startStory,storyObjective} from './city-stories.ts';
import {OPERATIONS,startOperation,activityBusy,operationObjective} from './living-city.ts';
import {CHAPTERS,startChapter,startBusiness,startPersonal,startTakeover,venturePoint,type Approach} from './kingpin.ts';
import {RACES,FARES,BOUNTIES,FISHING_SPOT,startPursuit,pursuitObjective} from './pursuits.ts';
import {startDaily,dailyRoute} from './legacy.ts';

export type ContactChoice={id:string;label:string};
export type WorldActivity=Point&{
 id:string;name:string;speaker:string;description:string;room:string|null;
 choices:ContactChoice[];methods?:readonly Approach[];
 start(c:Campaign,choice:string,method:Approach):boolean;
};
export type ContactPosition=Point&{room:string|null;atDesk:boolean;driving:boolean;blocked:boolean};
const choices=(...pairs:[string,string][]):ContactChoice[]=>pairs.map(([id,label])=>({id,label}));
const accept=choices(['accept','Accept this offer']);
export function propertyRoom(id:string){return ({chop:'garage',dock:'freight',airboat:'tours',mausoleum:'archive'} as Record<string,string>)[id]??id;}
const roomAt=(p:Point)=>INTERIORS.find(r=>r.x===p.x&&r.z===p.z)?.id??null;
function placed(p:Point,room:string|null=roomAt(p)){
 const entry=INTERIORS.find(r=>r.id===room),facade=!room?INTERIORS.find(r=>r.x===p.x&&r.z===p.z):null;
 if(facade){const door=facadeDoor(facade);return {...approach({x:door.x+door.nx*5,z:door.z+door.nz*5}),room};}
 return {...approach(entry??p),room};
}
/** Contacts are addresses, not remote mission-board entries. Existing save/activity schemas stay intact. */
export function worldActivities(c:Campaign):WorldActivity[]{
 const rows:WorldActivity[]=[];
 const add=(id:string,name:string,speaker:string,description:string,p:Point,start:WorldActivity['start'],opts:ContactChoice[]=accept,room:string|null=roomAt(p),methods?:readonly Approach[])=>rows.push({id,name,speaker,description,...placed(p,room),start,choices:opts,methods});
 for(const m of CITY_ADVENTURES)if(!c.pursuits.adventureDone.includes(m.id))add(`adventure:${m.id}`,m.name,m.speaker,`${m.desc} $${m.pay} clean once · ${m.duration}s.`,{x:30,z:4},(c,choice)=>startAdventure(c,m.id,choice==='diversion'?'diversion':'quiet'),m.id==='crew-exit'?choices(['quiet','Quiet plan · less heat'],['diversion','Diversion plan · more heat']):accept);
 for(const [i,ch]of ACTION_CAMPAIGN.entries())if(!c.pursuits.actionDone.includes(ch.id)&&(i===0||c.pursuits.actionDone.includes(ACTION_CAMPAIGN[i-1]!.id)))add(`campaign:${ch.id}`,ch.name,ch.speaker,`${ch.dialogue} ${ch.stages.length} stages · $${ch.pay} clean on completion. Each stage has a 10-minute limit and a $50 retry checkpoint.`,{x:30,z:4},c=>startActionChapter(c,ch.id));
 for(const job of STREET_HEISTS)if(!c.pursuits.raidWins.includes(job.id))add(`raid:${job.id}`,job.name,'Mama Nola',`$${job.fee} setup · $${job.pay} dirty loot. Enter ${INTERIORS.find(r=>r.id===job.interior)!.name}, disable security or force the vault, crack it and carry the bag out. Use a getaway car, lose police and return the loot here. ${job.disguise?'Equip a Riverboat evening coat at the tailor or purchase a disguise first.':''}`,{x:30,z:4},c=>startRaid(c,job.id));
 for(const w of WORK)add(`work:${w.id}`,w.name,'Local dispatcher',`${w.description} $${w.pay} · ${w.duration}s. Collect here, deliver to the marked address.`,w,c=>startWork(c,w.id));
 for(const m of MISSIONS)add(`mission:${m.id}`,m.name,m.id==='parade'?'Parade marshal':'Local contact',`${m.desc} $${m.pay} dirty base · ${m.duration}s.`,m.steps[0],c=>startMission(c,m.id));
 for(const [i,m]of STORIES.entries())if(!c.cityStories.completed.includes(m.id))add(`story:${m.id}`,m.title,m.speaker,`${m.dialogue} $${m.pay} dirty base.${i?' Complete the previous story first.':''}`,m,(c,choice)=>startStory(c,m.id,choice),choices(['quiet','Protect the neighborhood'],['bold','Take the high-risk payout']));
 for(const m of OPERATIONS)if(!c.living.completed.includes(m.id))add(`operation:${m.id}`,m.name,'Neighborhood contact',`${m.desc} $${m.pay} clean · ${m.duration}s. Requires ${m.unlock} completed operations.`,m.id==='recovery'?{x:-60,z:0}:m.stages[0],(c,choice)=>startOperation(c,m.id,choice==='quiet'?'quiet':'loud'),m.id==='heist'?choices(['quiet','Quiet · requires paid smuggler / heat below 30'],['loud','Loud · armed guards']):accept);
 for(const ch of CHAPTERS)if(!c.kingpin.chapters[ch.id])add(`chapter:${ch.id}`,ch.name,ch.speaker,`${ch.dialogue} $${ch.pay} clean base. Requires the original story finale and preceding chapter.`,ch,(c,choice,method)=>startChapter(c,ch.id,choice==='profit'?'profit':'protect',method),choices(['protect',ch.protect],['profit',ch.profit]),roomAt(ch),['assault','bribe','lockpick','disguise']);
 for(const race of RACES)add(`race:${race.id}`,race.name,'Race marshal',`$${race.fee} entry · $${race.pay} win. Beat two driving opponents (traffic and contact affect their finish). Use the same vehicle through all checkpoints.`,race.points[0],c=>startPursuit(c,'race',race.id),accept,null);
 for(const fare of FARES)add(`taxi:${fare.id}`,fare.name,'Waiting passenger',`Up to $${fare.pay} clean. Bring an actual taxi, stop to board, then drive carefully.`,fare,c=>startPursuit(c,'taxi',fare.id),accept,null);
 for(const b of BOUNTIES)if(!c.pursuits.bounties.includes(b.id))add(`bounty:${b.id}`,b.name,'Precinct investigator',`$${b.pay} clean once. Defeat or subdue the marked target and guards, then return proof to Mama Nola.`,{x:-60,z:-60},c=>startPursuit(c,'bounty',b.id));
 add('fishing:river','Levee fishing pier','Pier attendant','$15 tackle. Interact to cast, then react during the bite window. No catch means no payout.',FISHING_SPOT,c=>startPursuit(c,'fishing','river'),accept,null);
 for(const p of PROPERTIES.filter(p=>owns(c,p.id))){
  const room=propertyRoom(p.id);
  for(const kind of ['club','shipment','protection'] as const){
   if(kind==='club'&&!['jazz','dive','record','casino'].includes(p.id)||kind==='shipment'&&!['dock','port','courier','chop'].includes(p.id)||kind==='protection'&&p.kind!=='racket')continue;
   add(`business:${p.id}:${kind}`,`${p.name} · ${kind}`,'Business manager',kind==='club'?'$100 setup. Collect equipment and host at low heat, then settle takings.':kind==='shipment'?'Load two crates, drive the cargo to the dock, then return for payment.':'Needs paid crew. Negotiate on-site or resolve the extortionists, then sign.',p,c=>startBusiness(c,p.id,kind),accept,room);
  }
  if((c.pursuits.rivalry[p.id]??0)>=20)add(`rival:${p.id}`,`${p.name} · rival pressure`,'Business manager','Resolve the rivals on-site, then settle with staff. $500 clean.',p,c=>startPursuit(c,'rival',p.id),accept,room);
 }
 for(const member of SPECIALISTS)if(c.crew.some(m=>m.id===member.id)&&!c.kingpin.personal.includes(member.id))add(`personal:${member.id}`,`${member.name} · personal favor`,member.name,'A one-time field mission for your paid, loyal specialist. Follow the contact, resolve the guards, and return to Mama Nola.',{x:-60,z:-180},c=>startPersonal(c,member.id));
 add('event:relief','Clinic relief collection','Relief volunteer','Donate $50 clean on-site to help the clinic. Available after spending time in the city.',{x:-180,z:-60},c=>startStreetEvent(c,'relief'));
 add('event:witness','Threatened witness','Threatened witness','Help the witness outside the newsroom, then resolve their pursuers. Available after spending time in the city.',{x:0,z:120},c=>startStreetEvent(c,'witness'),accept,null);
 if(!c.kingpin.takeoverWon)add('takeover:city','Citywide takeover','Mama Nola','Requires all new chapters, five controlled corners, three operating properties and two paid loyal specialists. Resolve each retaliation squad on-site.',{x:30,z:4},c=>startTakeover(c));
 if(!c.legacy.daily||c.legacy.daily.date!==new Date().toISOString().slice(0,10))add('daily:route','Daily city route','Dispatch clerk','Visit three checkpoints. $1,000 clean for completion, once per UTC day.',{x:-120,z:120},c=>startDaily(c));
 return rows;
}
export function canStartContact(c:Campaign,contact:WorldActivity,choice?:string,method:Approach='assault'):boolean{
 if(choice===undefined)return contact.choices.some(v=>canStartContact(c,contact,v.id,method));
 // Probe existing domain gates without taking a fee, changing progress or consuming a cooldown.
 return !(contact.room&&businessClosed(c,contact.room))&&contact.start(structuredClone(c),choice,method);
}
export function atContact(contact:WorldActivity,position:ContactPosition){
 if(position.driving||position.blocked)return false;
 if(contact.room)return position.room===contact.room&&position.atDesk&&atPoint(position.x,position.z,contact,4);
 return !position.room&&atPoint(position.x,position.z,contact,3);
}
export function startContact(c:Campaign,id:string,position:ContactPosition,choice:string,method:Approach='assault'){
 const contact=worldActivities(c).find(m=>m.id===id);
 if(contact?.room&&businessClosed(c,contact.room))return false;
 if(!contact||!atContact(contact,position)||!contact.choices.some(v=>v.id===choice)||contact.methods&&!contact.methods.includes(method)||!contact.methods&&method!=='assault')return false;
 return contact.start(c,choice,method);
}
export function nearestContact(c:Campaign,position:ContactPosition){
 if(activityBusy(c)||c.legacy.tutorial<3||position.blocked)return null;
 return worldActivities(c).filter(m=>atContact(m,position)).sort((a,b)=>Number(canStartContact(c,b))-Number(canStartContact(c,a))||Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))[0]??null;
}
export function contactBlockReason(c:Campaign){
 if(c.legacy.tutorial<3)return 'Finish the opening tutorial first.';
 if(activityBusy(c))return 'Finish your current activity before accepting another offer.';
 if(c.lifestyle.workCooldown>0||c.pursuits.cooldown>0)return 'This offer may be on cooldown. Check back after spending some time in the city.';
 return 'Check the offer’s funds, crew, heat and story requirements. Locked offers stay at this contact until you qualify.';
}
export function contactMapLocations(c:Campaign):MapLocation[]{
 return worldActivities(c).filter(a=>canStartContact(c,a)).map(a=>({id:`contact:${a.id}`,name:`${a.speaker} · ${a.name}`,category:'Contacts & work',x:a.x,z:a.z,...(a.room?{interiorId:a.room}:{}),instruction:a.room?'Enter the signed building on foot. Walk to the back desk and Interact to talk.':'Meet the contact in the gold ring on foot and Interact. Tracking never accepts an offer.'}));
}

/** The map always exposes the live stage, never a catalogue of future mission stages. */
export function activeMapLocation(c:Campaign):MapLocation|null{
 const mission=c.expansion.mission,side=mission?MISSIONS.find(m=>m.id===mission.id)?.steps[mission.step]:null;
 const daily=c.legacy.daily&&!c.legacy.daily.finished?dailyRoute(c.legacy.daily.date)[c.legacy.daily.step]:null;
 const point=pursuitObjective(c)??venturePoint(c)??operationObjective(c)??storyObjective(c)??workObjective(c)??side??daily;
 if(!point)return null;
 const name='text' in point?point.text:'name' in point?point.name:'Daily route checkpoint';
 const entry=destinationInterior(point);
 return {id:'active:objective',name:String(name),category:'Current objective',...approach(point),...(entry?{interiorId:entry.id}:{}),instruction:c.lifestyle.work&&entry?'Enter the signed building on foot and collect/deliver at the back desk.':'Follow the current objective and Interact when prompted.'};
}
