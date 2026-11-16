import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newCampaign,restoreCampaign,resetAfterDeath,hire,BLOCKS} from '../src/campaign.ts';
import {CHAPTERS,startChapter,venturePoint,ventureInteract,tickKingpin} from '../src/kingpin.ts';
import {STORIES,startStory,storyObjective,storyInteract} from '../src/city-stories.ts';
import {startMission,missionInteract,MISSIONS} from '../src/expansion.ts';
import {startOperation} from '../src/living-city.ts';
import {captureCheckpoint,retryCheckpoint,invalidateCompletedCheckpoint} from '../src/checkpoints.ts';
import {newDepth,choiceEffects,guidedTabs,openingAdvice} from '../src/depth.ts';
import {newEnemyMind,updateEnemyMind,hurtEnemyMind,acceptSurrender} from '../src/enemy-reactions.ts';
import {createCar,createPerson} from '../src/actors.ts';
import {VEHICLES} from '../src/expansion.ts';
import {cabinProfile} from '../src/vehicle-cabin.ts';
import {approach} from '../src/navigation.ts';
const ready=()=>{const c=newCampaign();c.legacy.tutorial=3;c.clean=10000;return c;};
const ventureContext=c=>({...approach(venturePoint(c)),driving:false,guards:0,heat:c.heat,noise:false,lockHeld:false});
test('checkpoint stores only supported stage progress and retries without refunding economics or choices',()=>{
 const c=ready();startStory(c,'brass','quiet');storyInteract(c,...Object.values(approach(storyObjective(c))));assert.ok(captureCheckpoint(c));const checkpoint=JSON.parse(JSON.stringify(c.depth.checkpoint));assert.equal(checkpoint.snapshot.family,'story');assert.equal(checkpoint.snapshot.active.step,1);
 c.clean-=300;c.dirty+=80;c.inventory[0]=5;c.kingpin.chapters.union='profit';resetAfterDeath(c);c.cityStories.active=null;
 const retry=retryCheckpoint(c);assert.ok(retry);assert.equal(c.cityStories.active.step,1);assert.equal(c.cityStories.active.spawned,false);assert.equal(c.clean,9650);assert.equal(c.dirty,80);assert.equal(c.inventory[0],5);assert.equal(c.kingpin.chapters.union,'profit');assert.equal(c.depth.retries,1);
 assert.equal(captureCheckpoint(c),false);assert.deepEqual(c.depth.checkpoint.snapshot,checkpoint.snapshot);
});
test('successful completion invalidates retry and cannot duplicate a story payout across reload',()=>{
 const c=ready();startStory(c,'brass','quiet');storyInteract(c,...Object.values(approach(storyObjective(c))));captureCheckpoint(c);c.cityStories.active.step=2;storyInteract(c,...Object.values(approach(storyObjective(c))));const cash=c.dirty;
 assert.equal(retryCheckpoint(c),null);assert.equal(c.depth.checkpoint,null);assert.equal(c.dirty,cash);
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(retryCheckpoint(restored),null);
});
test('side mission checkpoint can retry a failed stage but explicit completion seals repeatable mission checkpoint',()=>{
 const c=ready();startMission(c,'courier');missionInteract(c,...Object.values(approach(MISSIONS.find(m=>m.id==='courier').steps[0])));captureCheckpoint(c);assert.equal(c.depth.checkpoint.stage,2);c.expansion.mission=null;
 assert.ok(retryCheckpoint(c));assert.equal(c.expansion.mission.step,1);assert.equal(invalidateCompletedCheckpoint(c,'side:courier'),true);assert.equal(retryCheckpoint(c),null);
});
test('checkpoint retry rejects other activities, defense, insufficient funds, mismatched identity and unsupported transport',()=>{
 const c=ready();startStory(c,'brass','quiet');captureCheckpoint(c);c.cityStories.active=null;c.clean=49;assert.equal(retryCheckpoint(c),null);c.clean=1000;c.defense={block:'skidrow',remaining:10};assert.equal(retryCheckpoint(c),null);c.defense=null;
 startOperation(c,'recovery');assert.equal(retryCheckpoint(c),null);assert.equal(captureCheckpoint(c),false);c.living.active=null;c.depth.checkpoint.key='story:crown';assert.equal(retryCheckpoint(c),null);
 const d=ready();startOperation(d,'recovery');assert.equal(captureCheckpoint(d),false);d.living.active=null;d.living.completed=['recovery'];startOperation(d,'rescue');assert.equal(captureCheckpoint(d),false);
});
test('checkpoint restores bounded stage state from saves without containing a nested campaign or replaying bribes',()=>{
 const c=ready();c.cityStories.completed=['brass','levee','crown'];startChapter(c,'union','protect','bribe');ventureInteract(c,ventureContext(c));captureCheckpoint(c);ventureInteract(c,ventureContext(c));assert.equal(c.clean,9700);
 const saved=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(saved.depth.checkpoint.snapshot.active.resolved,false);saved.kingpin.active=null;retryCheckpoint(saved);assert.equal(saved.clean,9650);ventureInteract(saved,ventureContext(saved));assert.equal(saved.clean,9350,'retry does not refund already-paid fixer fees');
 const malformed=restoreCampaign({depth:{checkpoint:{key:'bad',title:'bad',x:Infinity,z:0,proof:0,snapshot:{family:'story',active:{id:'nonexistent'}}},retries:-9}});assert.equal(malformed.depth.checkpoint,null);assert.equal(malformed.depth.retries,0);assert.deepEqual(restoreCampaign({clean:500}).depth,newDepth());
});
const stimulus=(extra={})=>({hp:70,kind:'gangster',seen:false,aimedAt:false,playerClose:false,nearAllies:0,heard:false,mission:false,...extra});
test('isolated wounded rivals surrender under close aim and can be secured without kill rewards',()=>{
 const mind=newEnemyMind();updateEnemyMind(mind,.1,stimulus({hp:18,seen:true,aimedAt:true,playerClose:true}));assert.equal(mind.state,'surrender');assert.ok(acceptSurrender(mind,2,true));assert.equal(acceptSurrender(mind,2,false),false);assert.equal(acceptSurrender(mind,5,true),false);
 updateEnemyMind(mind,2,stimulus({seen:true}));assert.equal(mind.state,'surrender');hurtEnemyMind(mind);assert.equal(mind.state,'fight');
 const grouped=newEnemyMind();updateEnemyMind(grouped,.1,stimulus({hp:18,seen:true,aimedAt:true,playerClose:true,nearAllies:1}));assert.equal(grouped.state,'fight');
 const boss=newEnemyMind();updateEnemyMind(boss,.1,stimulus({hp:18,kind:'boss',seen:true,aimedAt:true,playerClose:true}));assert.notEqual(boss.state,'surrender');
});
test('enemy minds investigate noises, retreat when wounded and call backup once only outside missions',()=>{
 const mind=newEnemyMind();updateEnemyMind(mind,.1,stimulus({heard:true}));assert.equal(mind.state,'investigate');updateEnemyMind(mind,7,stimulus());assert.equal(mind.state,'calm');
 updateEnemyMind(mind,.1,stimulus({seen:true,hp:25}));assert.equal(mind.state,'retreat');updateEnemyMind(mind,1,stimulus());assert.equal(mind.state,'retreat');
 const caller=newEnemyMind();let calls=0;for(let i=0;i<100;i++)if(updateEnemyMind(caller,.1,stimulus({seen:true})).callBackup)calls++;assert.equal(calls,1);
 const mission=newEnemyMind();for(let i=0;i<100;i++)assert.equal(updateEnemyMind(mission,.1,stimulus({seen:true,mission:true})).callBackup,false);
});
test('cabin style, steering, gauge and hinged door motion are functional and resources dispose',()=>{
 const profiles=new Set(VEHICLES.filter(v=>v.id!=='bike').map(v=>cabinProfile(v.style).dash));assert.ok(profiles.size>=3);
 for(const model of VEHICLES){const car=createCar(model.style,0x447766);if(model.id==='bike'){assert.equal(car.cockpit,null);car.openDoor('driver');car.dispose();continue;}
  assert.ok(car.cockpit.toArray().every(Number.isFinite));const wheel=car.root.getObjectByName('steering-wheel'),gauge=car.root.getObjectByName('speedometer-needle'),door=car.root.getObjectByName('driver-door');assert.ok(wheel&&gauge&&door,model.id);
  car.motion(0,0,false,0);car.openDoor('driver');for(let i=1;i<15;i++)car.motion(15,.5,false,i*.05);assert.notEqual(wheel.rotation.z,0);assert.notEqual(gauge.rotation.z,0);assert.ok(Math.abs(door.rotation.y)>.5);
  for(let i=15;i<80;i++)car.motion(0,0,false,i*.05);assert.ok(Math.abs(door.rotation.y)<.01);let disposed=false;wheel.children[0].geometry.addEventListener('dispose',()=>disposed=true);car.dispose();assert.ok(disposed);assert.equal(car.root.parent,null);
 }
 const person=createPerson('player',3);person.pose('surrender',0,0,0,.1);assert.equal(person.root.getObjectByName('weapon-0').visible,false);person.pose('walk',1,1,0,.1);assert.equal(person.root.getObjectByName('weapon-0').visible,true);person.dispose();
});
test('earlier choices change later contact routes, guard pressure and retaliation interval',()=>{
 const protector=ready(),profiteer=ready();for(const c of [protector,profiteer])c.cityStories.completed=['brass','levee','crown'];protector.kingpin.chapters.union='protect';profiteer.kingpin.chapters.union='profit';assert.ok(startChapter(protector,'betrayal','protect','assault'));assert.ok(startChapter(profiteer,'betrayal','protect','assault'));
 assert.notDeepEqual(venturePoint(protector),venturePoint(profiteer));protector.kingpin.chapters.betrayal='protect';profiteer.kingpin.chapters.betrayal='profit';assert.ok(choiceEffects(profiteer).guardDelta>choiceEffects(protector).guardDelta);assert.ok(choiceEffects(profiteer).retaliationInterval<choiceEffects(protector).retaliationInterval);
 for(const c of [protector,profiteer]){c.kingpin.active=null;c.owned=['skidrow'];c.kingpin.retaliation=149;}const context={x:0,z:0,driving:false,guards:0,heat:0,noise:false,lockHeld:false};tickKingpin(profiteer,2,context);tickKingpin(protector,2,context);assert.ok(profiteer.defense);assert.equal(protector.defense,null);
});
test('opening guide reveals systems gradually while allowing explicit full-menu access',()=>{
 const c=newCampaign();assert.match(openingAdvice(c),/Meet Mama Nola/);assert.ok(!guidedTabs(c).includes('Kingpin Stories'));assert.ok(guidedTabs(c).includes('City Journal'));c.legacy.tutorial=1;assert.match(openingAdvice(c),/practice fight/);c.legacy.tutorial=2;assert.match(openingAdvice(c),/sedan/);c.legacy.tutorial=3;assert.match(openingAdvice(c),/Clinic Supply Run/);assert.ok(guidedTabs(c).includes('Jobs & Style'));
 c.lifestyle.workCompleted=1;assert.equal(guidedTabs(c),null);c.lifestyle.workCompleted=0;c.depth.guided=false;assert.equal(guidedTabs(c),null);
});

test('decision guard adjustments reach actual later encounters and preserve bounded first-chapter balance',async()=>{
 const {encounterGuards}=await import('../src/depth.ts');const c=ready();assert.equal(encounterGuards(c,'story','union'),3);assert.equal(encounterGuards(c,'takeover','city'),3);
 c.kingpin.chapters.union='profit';c.kingpin.chapters.betrayal='profit';assert.equal(encounterGuards(c,'story','reckoning'),5);assert.equal(encounterGuards(c,'takeover','city'),5);
 c.kingpin.chapters.union='protect';c.kingpin.chapters.betrayal='protect';c.kingpin.chapters.reckoning='protect';assert.equal(encounterGuards(c,'takeover','city'),1);assert.equal(encounterGuards(c,'personal','muscle'),2);
});
test('journal buttons use real retry and navigation hooks, record saved facts, and do not manufacture rewards',async()=>{
 const {journalPanel}=await import('../src/journal-ui.ts');class Element{constructor(tag){this.tag=tag;this.textContent='';this.children=[];}append(...els){this.children.push(...els);}replaceChildren(...els){this.children=els;}}
 const walk=e=>[e,...e.children.flatMap(walk)];globalThis.document={createElement:tag=>new Element(tag)};
 try{const c=ready();startStory(c,'brass','quiet');captureCheckpoint(c);const cash=c.clean,root=new Element('section');let retried=0,tracked=null,changed=0;const hooks={retry:()=>retried++,changed:()=>changed++,notice:()=>{},track:(x,z,name)=>tracked={x,z,name}};journalPanel(c,root,hooks);
 const retry=walk(root).find(e=>e.tag==='button'&&e.textContent==='Retry last stage · $50 clean');assert.ok(retry);retry.onclick();assert.equal(retried,1);assert.equal(c.clean,cash);
 walk(root).find(e=>e.tag==='button'&&e.textContent.includes('Show all menus')).onclick();assert.equal(c.depth.guided,false);assert.equal(changed,1);
 walk(root).find(e=>e.tag==='button'&&e.textContent.includes('French Quarter field note')).onclick();assert.ok(tracked.name.includes('French Quarter'));assert.equal(c.clean,cash);
 }finally{delete globalThis.document;}
});
test('established campaigns keep all menus available and checkpoint copies do not share mutable stage objects',()=>{
 const c=ready();c.cityStories.completed=['brass'];assert.equal(guidedTabs(c),null);startStory(c,'levee','quiet');captureCheckpoint(c);const stage=c.depth.checkpoint.snapshot.active.step;c.cityStories.active.step=2;assert.equal(c.depth.checkpoint.snapshot.active.step,stage);
});

test('choice ally injury survives save restoration and practice clears inherited checkpoints',async()=>{
 const {prepareReplay}=await import('../src/mission-replay.ts');const c=ready();c.depth.allyStage='story:betrayal:1';c.depth.allyHp=0;c.cityStories.completed=['brass'];
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(restored.depth.allyHp,0);assert.equal(restored.depth.allyStage,'story:betrayal:1');
 const practice=prepareReplay(c,'story:brass');assert.equal(practice.sandbox.depth.checkpoint,null);assert.equal(practice.sandbox.depth.allyStage,'');assert.equal(practice.sandbox.depth.allyHp,100);assert.equal(c.depth.allyHp,0);
});

test('repeated side-mission completion seals the checkpoint even when the completion list already contained its ID',()=>{
 const c=ready();c.expansion.completed=['courier'];startMission(c,'courier');captureCheckpoint(c);assert.equal(c.depth.checkpoint.proof,1);
 const mission=MISSIONS.find(m=>m.id==='courier');for(const step of mission.steps)missionInteract(c,...Object.values(approach(step)));assert.equal(c.expansion.completed.filter(id=>id==='courier').length,1);
 assert.ok(invalidateCompletedCheckpoint(c,'side:courier'));const restored=restoreCampaign(JSON.parse(JSON.stringify(c))),cash=restored.dirty;assert.equal(retryCheckpoint(restored),null);assert.equal(restored.dirty,cash);
});

test('distant cabin detail can be culled without hiding the vehicle body or losing steering state',()=>{
 const car=createCar(0,0x335577),cabin=car.root.getObjectByName('vehicle-cabin');car.detail(false);assert.equal(cabin.visible,false);assert.equal(car.root.visible,true);car.motion(15,.6,false,0);car.detail(true);assert.equal(cabin.visible,true);assert.notEqual(car.root.getObjectByName('steering-wheel').rotation.z,0);car.dispose();
});

test('adding driver-camera binding preserves an older save that already remapped V',async()=>{
 const {newAccessibility,restoreAccessibility,canonicalKey}=await import('../src/polish.ts');const old=newAccessibility();delete old.bindings.KeyV;old.bindings.KeyR='KeyV';const migrated=restoreAccessibility(old);assert.equal(migrated.bindings.KeyR,'KeyV');assert.equal(canonicalKey(migrated,'KeyV'),'KeyR');assert.equal(new Set(Object.values(migrated.bindings)).size,Object.keys(migrated.bindings).length);assert.notEqual(migrated.bindings.KeyV,'KeyV');
});
