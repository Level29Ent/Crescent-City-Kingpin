import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newCampaign,restoreCampaign} from '../src/campaign.ts';
import {BINDINGS,newAccessibility,restoreAccessibility,rebind,canonicalKey,keyLabel,palette,damageAngle,missionDelta,NEIGHBORHOODS} from '../src/polish.ts';
import {prepareReplay,replayChoices,replayActive,replayCompleted,replayVerdict,canPersistReplay} from '../src/mission-replay.ts';
import {missionCard,missionProof,ledger,portraitInitials} from '../src/mission-presentation.ts';
import {CHAPTERS,venturePoint,ventureInteract} from '../src/kingpin.ts';
import {MISSIONS,missionInteract} from '../src/expansion.ts';
import {OPERATIONS,operationObjective,operationInteract} from '../src/living-city.ts';
import {STORIES,storyObjective,storyInteract} from '../src/city-stories.ts';
import {miniPoint,drawMapIcon,drawRoads,createMapRoute} from '../src/minimap.ts';
import {approach} from '../src/navigation.ts';
import {addNeighborhoodArt} from '../src/neighborhood-art.ts';
const ready=()=>{const c=newCampaign();c.legacy.tutorial=3;c.clean=20000;return c;};
function completeReplay(c,r){
 for(let step=0;step<20&&replayActive(c,r);step++){
  if(r.family==='side'){const m=MISSIONS.find(m=>m.id===r.id);if(c.expansion.mission.step===4&&m.id==='parade')c.expansion.mission.escort=40;const p=approach(m.steps[c.expansion.mission.step]);assert.ok(missionInteract(c,p.x,p.z));}
  if(r.family==='story'){if(c.cityStories.active.step===1)c.cityStories.active.step=2;const p=approach(storyObjective(c));assert.ok(storyInteract(c,p.x,p.z));}
  if(r.family==='chapter'){const a=c.kingpin.active;a.spawned=true;a.resolved=true;const p=approach(venturePoint(c));assert.ok(ventureInteract(c,{...p,driving:false,guards:0,heat:0,noise:false,lockHeld:false}));}
  if(r.family==='operation'){const a=c.living.active;if(a.id==='protection'&&a.step===1){a.spawned=true;a.step=2;}a.spawned=true;c.heat=0;const p=approach(operationObjective(c));assert.ok(operationInteract(c,{...p,driving:a.id==='rescue'?a.step===1:true,bike:false,recoveryCar:true,condition:100,guards:0,fired:false,searching:false,passengerBoarded:true}));}
 }
 assert.equal(replayActive(c,r),false);assert.ok(replayCompleted(c,r));
}
test('completed missions replay in a deep isolated campaign without changing original rewards or choices',()=>{
 const c=ready();c.cityStories.completed=STORIES.map(m=>m.id);c.expansion.completed=MISSIONS.map(m=>m.id);c.living.completed=OPERATIONS.map(m=>m.id);for(const m of CHAPTERS)c.kingpin.chapters[m.id]='profit';
 const before=JSON.stringify(c),choices=replayChoices(c);assert.equal(choices.length,STORIES.length+MISSIONS.length+OPERATIONS.length+CHAPTERS.length);
 for(const r of choices){const practice=prepareReplay(c,r.key);assert.ok(practice,r.key);assert.notEqual(practice.sandbox,c);assert.ok(replayActive(practice.sandbox,r));assert.equal(replayCompleted(practice.sandbox,r),false);completeReplay(practice.sandbox,r);practice.sandbox.clean+=100000;practice.sandbox.kingpin.chapters.union='protect';assert.equal(JSON.stringify(c),before,r.key);}
 assert.equal(prepareReplay(c,'side:nonexistent'),null);assert.equal(prepareReplay(ready(),'side:parade'),null);
});
test('replay persistence guard rejects practice writes and challenge verdicts use completion/time/shots',()=>{
 assert.equal(canPersistReplay(true),false);assert.equal(canPersistReplay(false),true);
 assert.ok(replayVerdict(true,120,0,'quiet'));assert.equal(replayVerdict(true,120,1,'quiet'),false);assert.ok(replayVerdict(true,180,30,'speed'));assert.equal(replayVerdict(true,181,0,'speed'),false);assert.equal(replayVerdict(false,20,0,'finish'),false);
});
test('rebind swaps conflicts, leaves fixed controls available, suppresses unassigned former bindings, and survives saves',()=>{
 const c=ready(),a=c.accessibility;assert.ok(rebind(a,'KeyW','KeyE'));assert.equal(a.bindings.KeyW,'KeyE');assert.equal(a.bindings.KeyE,'KeyW');assert.equal(canonicalKey(a,'KeyE'),'KeyW');assert.equal(canonicalKey(a,'KeyW'),'KeyE');
 rebind(a,'KeyR','KeyY');assert.equal(canonicalKey(a,'KeyR'),null);assert.equal(canonicalKey(a,'KeyY'),'KeyR');assert.equal(canonicalKey(a,'Escape'),'Escape');assert.equal(canonicalKey(a,'Digit1'),'Digit1');assert.equal(rebind(a,'KeyW','Escape'),false);assert.equal(rebind(a,'KeyW','Digit2'),false);
 assert.deepEqual(restoreCampaign(JSON.parse(JSON.stringify(c))).accessibility,a);assert.equal(keyLabel('KeyQ'),'Q');assert.equal(new Set(Object.values(a.bindings)).size,Object.keys(BINDINGS).length);
});
test('older and malformed preferences get safe defaults and no duplicate action keys',()=>{
 assert.deepEqual(restoreCampaign({clean:300}).accessibility,newAccessibility());const a=restoreAccessibility({textScale:99,shake:-1,palette:'accessible',bindings:{KeyW:'KeyE',KeyE:'KeyE'}});assert.equal(a.textScale,1.5);assert.equal(a.shake,0);assert.equal(a.palette,'accessible');assert.equal(a.bindings.KeyW,'KeyW');assert.deepEqual(restoreAccessibility(null),newAccessibility());
});
test('mission cards expose actual objective steps and completion proof, not fabricated rewards',()=>{
 const c=ready();c.expansion.completed=['courier'];const prepared=prepareReplay(c,'side:courier'),sandbox=prepared.sandbox,card=missionCard(sandbox);assert.equal(card.title,MISSIONS.find(m=>m.id==='courier').name);assert.equal(card.step,1);assert.equal(card.total,3);assert.equal(missionProof(sandbox,card.key),0);const before=ledger(sandbox);completeReplay(sandbox,prepared.choice);assert.equal(missionCard(sandbox),null);assert.equal(missionProof(sandbox,card.key),1);assert.ok(missionDelta(before,ledger(sandbox)).dirty>0);assert.equal(portraitInitials('Mama Nola'),'MN');
});
test('map markers clamp only when required and icons remain identifiable without color',()=>{
 assert.deepEqual(miniPoint({x:0,z:0},{x:0,z:0}),{x:0,y:0,edge:false});const edge=miniPoint({x:1000,z:0},{x:0,z:0});assert.equal(edge.edge,true);assert.equal(edge.x,80);assert.ok(palette('accessible').enemy!==palette('accessible').police);
 const calls=[],ctx=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>calls.push([k,...args])),set:(o,k,v)=>(o[k]=v,true)});
 for(const shape of ['circle','square','diamond','triangle'])drawMapIcon(ctx,0,0,'#fff',shape);assert.ok(calls.some(c=>c[0]==='rect'));assert.ok(calls.some(c=>c[0]==='arc'));assert.ok(calls.some(c=>c[0]==='lineTo'));drawRoads(ctx,{x:0,z:0});assert.ok(calls.filter(c=>c[0]==='stroke').length>=14);
});
test('advisory map routes use street graph and never mutate waypoint identity',()=>{
 const route=createMapRoute(),from={x:2.7,z:9},to={x:-120,z:60},before=JSON.stringify(to),path=route.path(from,to);assert.ok(path.length>1);assert.ok(path.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));assert.equal(JSON.stringify(to),before);assert.equal(route.path(from,to),path);
});
test('damage direction and summary deltas respect actual source, heading and balances',()=>{
 assert.equal(damageAngle({x:0,z:0},{x:0,z:10},0),0);assert.ok(Math.abs(damageAngle({x:0,z:0},{x:10,z:0},0)-Math.PI/2)<1e-8);assert.deepEqual(missionDelta({clean:300,dirty:20,heat:5,loyalty:70},{clean:250,dirty:400,heat:15,loyalty:65}),{clean:-50,dirty:380,heat:10,loyalty:-5});
});
const canvasDoc=()=>({createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})})});
test('all five neighborhood signs have reachable landmark addresses and release textures on disposal',()=>{
 globalThis.document=canvasDoc();try{const scene=new THREE.Scene(),art=addNeighborhoodArt(scene),textures=new Set();assert.equal(scene.children[0].children.length,5);scene.traverse(o=>{if(o.isMesh&&o.material.map)textures.add(o.material.map);});assert.equal(textures.size,5);let disposed=0;textures.forEach(t=>t.addEventListener('dispose',()=>disposed++));for(const n of NEIGHBORHOODS){const p=approach(n);assert.ok(Number.isFinite(p.x));}art.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,5);}finally{delete globalThis.document;}
});
test('polish board updates accessibility and starts only listed completed-mission replays',async()=>{
 const {polishPanel}=await import('../src/polish-ui.ts');class Element{constructor(tag){this.tag=tag;this.textContent='';this.children=[];this.style={};this.value='';}append(...els){this.children.push(...els);if(this.tag==='select'&&!this.value)this.value=els[0]?.value??'';}replaceChildren(...els){this.children=els;}setAttribute(k,v){this[k]=v;}focus(){}}
 const walk=e=>[e,...e.children.flatMap(walk)];globalThis.document={createElement:tag=>new Element(tag)};
 try{const c=ready();c.expansion.completed=['courier'];const root=new Element('section');let changed=0,replay=null;const h={changed:()=>changed++,notice:()=>{},replay:(key,challenge)=>replay={key,challenge},stopReplay:()=>{},replaying:()=>false,track:()=>{}};polishPanel(c,root,h);const size=walk(root).find(e=>e['aria-label']==='HUD / menu text size');size.value='1.4';size.oninput();assert.equal(c.accessibility.textScale,1.4);assert.equal(changed,1);walk(root).find(e=>e.tag==='button'&&e.textContent==='Replay mission').onclick();assert.deepEqual(replay,{key:'side:courier',challenge:'finish'});}finally{delete globalThis.document;}
});

test('neighborhood field notes require explicit nearby inspection, persist once and grant no money',async()=>{
 const {inspectNeighborhood}=await import('../src/field-notes.ts');const c=ready(),cash=c.clean,dirty=c.dirty;
 assert.equal(inspectNeighborhood(c,235,230),null);for(const n of NEIGHBORHOODS){const p=approach(n);assert.match(inspectNeighborhood(c,p.x,p.z),/FIELD NOTE/);assert.match(inspectNeighborhood(c,p.x,p.z),/already recorded/);}
 assert.equal(c.districtVisits.length,5);assert.equal(c.clean,cash);assert.equal(c.dirty,dirty);assert.deepEqual(restoreCampaign(JSON.parse(JSON.stringify(c))).districtVisits,c.districtVisits);
 assert.deepEqual(restoreCampaign({districtVisits:['quarter','quarter','invalid']}).districtVisits,['quarter']);
});
test('contact portraits are local canvases labeled with the current speaker',async()=>{
 const {contactPortrait}=await import('../src/contact-portrait.ts');globalThis.document={createElement:()=>({width:0,height:0,attributes:{},setAttribute(k,v){this.attributes[k]=v;},getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})})};
 try{const portrait=contactPortrait('Mama Nola');assert.equal(portrait.width,112);assert.equal(portrait.height,128);assert.match(portrait.attributes['aria-label'],/Mama Nola/);}finally{delete globalThis.document;}
});

test('replay tracking cannot silently switch to another mission of the same family',()=>{
 const c=ready();c.expansion.completed=['courier','parade'];const practice=prepareReplay(c,'side:courier');assert.ok(replayActive(practice.sandbox,practice.choice));practice.sandbox.expansion.mission={id:'parade',step:0,remaining:360};assert.equal(replayActive(practice.sandbox,practice.choice),false);
});
