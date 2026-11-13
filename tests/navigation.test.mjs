import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapLocations,approach,atPoint} from '../src/navigation.ts';
import {INTERIORS,nearestEntrance,indoorMove} from '../src/interiors.ts';
import {walkable,pushOut,BUILDINGS} from '../src/world.ts';
import {newCampaign} from '../src/campaign.ts';
import {HEISTS,MISSIONS,recon,plan,assemble,execute,startMission,missionInteract} from '../src/expansion.ts';
import {WORK,startWork,workInteract} from '../src/lifestyle.ts';
import {STORIES,startStory,storyInteract} from '../src/city-stories.ts';
test('every directory point and door has a collision-free approach, with unique map IDs',()=>{const rows=mapLocations();assert.ok(rows.length>=90);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);for(const p of rows){assert.ok(walkable(p.x,p.z),p.name);assert.equal(pushOut(p.x,p.z,.65).hit,false,p.name);assert.ok(p.instruction.length>10);}for(const door of INTERIORS){const p=approach(door);assert.equal(nearestEntrance(p.x,p.z,6).id,door.id);}});
test('blocked building center resolves to reachable street while retaining interaction eligibility',()=>{const b=BUILDINGS[0];const center={x:(b.x0+b.x1)/2,z:(b.z0+b.z1)/2};assert.ok(pushOut(center.x,center.z,.65).hit);const p=approach(center);assert.equal(pushOut(p.x,p.z,.65).hit,false);assert.ok(atPoint(p.x,p.z,center,1));assert.deepEqual(approach(center),p);});
test('chop shop and all three homes are enterable on-foot within the shared arrival range',()=>{for(const id of ['garage','home-quarter','home-uptown','home-bywater']){const b=INTERIORS.find(b=>b.id===id);assert.ok(b);assert.equal(nearestEntrance(approach(b).x,approach(b).z,3).id,id);}assert.equal(nearestEntrance(230,-230,6),undefined);});
test('every work order advances pickup then delivery exactly once at the displayed approach',()=>{for(const w of WORK){const c=newCampaign();c.legacy.tutorial=3;assert.ok(startWork(c,w.id));const pickup=approach(w),drop=approach({x:w.dropX,z:w.dropZ});assert.match(workInteract(c,pickup.x,pickup.z),/collected/);assert.match(workInteract(c,drop.x,drop.z),/complete/);const total=c.clean+c.dirty;assert.equal(workInteract(c,drop.x,drop.z),null);assert.equal(c.clean+c.dirty,total);}});
test('all side mission stages including parade finale use accessible arrival positions and cannot double pay',()=>{for(const m of MISSIONS){const c=newCampaign();c.legacy.tutorial=3;startMission(c,m.id);for(const [i,step]of m.steps.entries()){if(m.id==='parade'&&i===4)c.expansion.mission.escort=40;const p=approach(step);assert.ok(missionInteract(c,p.x,p.z),`${m.id} stage ${i}`);}assert.equal(c.expansion.mission,null);const funds=c.dirty;const end=approach(m.steps.at(-1));assert.equal(missionInteract(c,end.x,end.z),null);assert.equal(c.dirty,funds);}});
test('all heist recon locations progress to crew assembly and preserve cooldown/phase gates',()=>{for(const h of HEISTS){const c=newCampaign();const p=approach(h);assert.ok(recon(c,h.id,p.x,p.z),h.id);assert.equal(plan(c,h.id).phase,1);assert.equal(recon(c,h.id,p.x,p.z),false);c.clean=100000;c.upgrades=3;c.crew=h.roles.map(id=>({id,loyalty:100,owed:0}));assert.ok(assemble(c,h.id));for(let i=0;i<3;i++)execute(c,h.id,true,()=>0);assert.equal(plan(c,h.id).cooldown,600);}});
test('all story contacts and return stages work at safe approaches',()=>{const c=newCampaign();c.legacy.tutorial=3;for(const m of STORIES){assert.ok(startStory(c,m.id,'quiet'));const p=approach(m);assert.equal(storyInteract(c,p.x,p.z),'fight');c.cityStories.active.step=2;const home=approach({x:30,z:4});assert.equal(storyInteract(c,home.x,home.z),'complete');}});
test('service desk can be approached without stepping into its collision box',()=>{let p={x:0,z:5.8};const obstacles=[{x:0,z:-5.4,w:4,d:1}];for(let i=0;i<60;i++)p=indoorMove(p.x,p.z,0,-.2,obstacles);assert.ok(p.z < -3.6 && p.z > -5);});

test('all building/business/heist map pins resolve to usable facade doors, never freestanding street rings',async()=>{
 const {facadeDoor}=await import('../src/doorways.ts');
 for(const entry of INTERIORS){
  const door=facadeDoor(entry),p=approach(entry),b=door.building;
  assert.equal(Math.hypot(p.x-door.wallX,p.z-door.wallZ),2,entry.id);
  assert.ok(door.wallX===b.x0||door.wallX===b.x1||door.wallZ===b.z0||door.wallZ===b.z1,entry.id);
  assert.equal(pushOut(p.x,p.z,.65).hit,false,entry.id);
  assert.equal(nearestEntrance(p.x,p.z,3)?.id,entry.id);
 }
 for(const row of mapLocations().filter(r=>['Buildings & homes','Businesses','Heists'].includes(r.category))){
  const entry=INTERIORS.find(b=>b.id===row.interiorId);assert.ok(entry,row.name);
  assert.deepEqual(approach(entry),{x:row.x,z:row.z},row.name);
 }
});
test('menu route identity preserves recon and does not turn outdoor objectives into doors',async()=>{
 const {namedDestination}=await import('../src/navigation.ts');
 assert.equal(namedDestination({x:0,z:-120},'Bank Vault recon').id,'heist:bank');
 assert.equal(namedDestination({x:30,z:4},'Safehouse').id,'door:hq');
 assert.equal(namedDestination({x:-120,z:-120},'Defend Skidrow'),null);
 assert.equal(namedDestination({x:60,z:0},'Daily checkpoint'),null);
});
