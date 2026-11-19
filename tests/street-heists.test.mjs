import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newCampaign,restoreCampaign,resetAfterDeath} from '../src/campaign.ts';
import {STREET_HEISTS,ROBBABLE,RAID_STATIONS,startRaid,tickRaid,settleRaid,raiseRaidAlarm,raidInstruction} from '../src/street-heists.ts';
import {pursuitObjective,tickPursuits,startPursuit} from '../src/pursuits.ts';
import {startWork} from '../src/lifestyle.ts';
import {INTERIORS,createInterior,indoorMove} from '../src/interiors.ts';
import {worldActivities,startContact} from '../src/world-activities.ts';
import {createRaceDriver} from '../src/race-driver.ts';
import {RACES,pursuitInteract} from '../src/pursuits.ts';
import {approach} from '../src/navigation.ts';
import {cityClear} from '../src/city-navigation.ts';
import {empireColors,addEmpireLife} from '../src/empire-life.ts';
const ready=()=>{const c=newCampaign();c.legacy.tutorial=3;c.clean=20000;return c;};
const context=(room,x=0,z=0,extra={})=>({interior:room,x,z,interact:true,driving:false,dead:false,...extra});
const bag=(c,room)=>{while(c.pursuits.active.raid.phase!=='escape'){const p=RAID_STATIONS[c.pursuits.active.raid.phase];tickRaid(c,8,context(room,p.x,p.z));}};
const outdoor={x:100,z:100,driving:false,taxi:false,speed:0,vehicleKey:'',condition:100,guards:0,fired:false};
test('heists use physical HQ contacts, reject incompatible jobs, fees and riverboat disguise gate',()=>{
 const c=ready(),contact=worldActivities(c).find(a=>a.id==='raid:bank-job');assert.equal(contact.room,'hq');assert.equal(startContact(c,contact.id,{...contact,room:null,atDesk:false,driving:false,blocked:false},'accept'),false);
 assert.equal(startContact(c,contact.id,{...contact,room:'hq',atDesk:true,driving:false,blocked:false},'accept'),true);assert.equal(c.clean,19850);assert.equal(startWork(c,'medical'),false);assert.equal(startPursuit(c,'taxi','jazz'),false);assert.equal(startRaid(c,'riverboat-job'),false);
 const r=ready();assert.equal(startRaid(r,'riverboat-job'),false);r.pursuits.wardrobe=['river'];r.pursuits.wearing='river';assert.equal(startRaid(r,'riverboat-job'),true);assert.equal(r.clean,19750);
 const b=ready();b.clean=149;assert.equal(startRaid(b,'bank-job'),false);b.legacy.tutorial=0;b.clean=500;assert.equal(startRaid(b,'bank-job'),false);assert.equal(startRaid(b,'bogus'),false);
});
test('both heists require spatial held alarm/vault/loot actions and a real getaway before a single dirty settlement',()=>{
 for(const def of STREET_HEISTS){const c=ready();c.kingpin.disguise=90;assert.ok(startRaid(c,def.id));const initial=c.dirty;
 tickRaid(c,3,context('hq',0,3.4));assert.equal(c.pursuits.active.raid.phase,'alarm');tickRaid(c,1,context(def.interior,0,3.4));assert.equal(c.pursuits.active.raid.progress,1);
 tickRaid(c,.1,context(def.interior,0,3.4,{interact:false}));assert.equal(c.pursuits.active.raid.progress,0);
 bag(c,def.interior);assert.equal(c.pursuits.active.raid.phase,'escape');assert.equal(c.dirty,initial);assert.equal(c.pursuits.active.raid.bag,def.pay);
 const home=approach({x:30,z:4});assert.match(settleRaid(c,home.x,home.z,false),/getaway car/);tickRaid(c,1,context(null,80,80,{driving:true}));assert.match(settleRaid(c,home.x,home.z,false),/wanted heat/);
 c.heat=0;assert.match(settleRaid(c,home.x,home.z,true),/get out/);assert.equal(settleRaid(c,230,230,false),null);assert.match(settleRaid(c,home.x,home.z,false),/HEIST COMPLETE/);assert.equal(c.dirty,def.pay);assert.equal(settleRaid(c,home.x,home.z,false),null);assert.ok(c.pursuits.raidWins.includes(def.id));
 c.pursuits.cooldown=0;c.pursuits.raided[def.id]=0;assert.equal(startRaid(c,def.id),false);
 }
});
test('register robbery is local, changes heat/trust, needs held looting and retains cooldown across reload',()=>{
 const c=ready();assert.equal(startRaid(c,'pawn'),false);assert.equal(startRaid(c,'pawn','pawn',0,5.8),false);assert.equal(startRaid(c,'hq','hq',0,-3.5),false);assert.ok(startRaid(c,'pawn','pawn',0,-3.5));assert.ok(c.heat>0);assert.ok(c.pursuits.active.raid.alarmed);bag(c,'pawn');const saved=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(saved.pursuits.active,null);assert.equal(saved.dirty,0);assert.equal(saved.pursuits.raided.pawn,240);assert.ok(saved.pursuits.cooldown>=45);saved.pursuits.cooldown=0;assert.equal(startRaid(saved,'pawn','pawn',0,-3.5),false);
 tickPursuits(saved,241,outdoor);assert.equal(startRaid(saved,'pawn','pawn',0,-3.5),true);
});
test('camera trip is one-time heat, expiry/death lose bag, and old or malformed saves safely default',()=>{
 const c=ready();startRaid(c,'bank-job');tickRaid(c,25,context('bank',4,4,{interact:false}));assert.ok(c.pursuits.active.raid.alarmed);const heat=c.heat;raiseRaidAlarm(c);assert.equal(c.heat,heat);assert.match(raidInstruction(c),/alarm panel/);bag(c,'bank');c.pursuits.active.remaining=0;const p=approach({x:30,z:4});c.pursuits.active.raid.getaway=true;c.pursuits.active.raid.outside=true;c.heat=0;assert.match(settleRaid(c,p.x,p.z,false),/expired/);assert.equal(c.dirty,0);
 const d=ready();startRaid(d,'bank-job');bag(d,'bank');resetAfterDeath(d);assert.equal(d.pursuits.active,null);assert.equal(d.dirty,0);
 assert.deepEqual(restoreCampaign({clean:100}).pursuits.raidWins,[]);assert.deepEqual(restoreCampaign({pursuits:{raidWins:['bogus','bank-job','bank-job'],raided:{pawn:Infinity,'<script>':123}}}).pursuits.raidWins,['bank-job']);
});
test('opponents complete both connected street circuits without entering building collision; blockers slow them',()=>{
 for(const r of RACES){const driver=createRaceDriver(r.points);for(let i=0;i<60*125&&!driver.state.finished;i++){driver.update(1/60);assert.ok(cityClear(driver.state.x,driver.state.z,1.4),r.id);}assert.equal(driver.state.finished,true,r.id);assert.ok(driver.state.elapsed>20);}
 const d=createRaceDriver(RACES[0].points);for(let i=0;i<50;i++)d.update(.05);const s=d.state,before=s.speed;d.update(.1,[{x:s.x+Math.sin(s.heading)*3,z:s.z+Math.cos(s.heading)*3}]);assert.ok(s.speed<before);
 const c=ready();startPursuit(c,'race','canal');c.pursuits.active.step=4;c.pursuits.active.opponentRacing=true;c.pursuits.active.elapsed=120;const p=pursuitObjective(c);assert.match(pursuitInteract(c,{...outdoor,...p,driving:true,vehicleKey:'car'}),/RACE WON/);
});
function canvasDocument(){return {createElement(){return {width:0,height:0,getContext(){return new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})}}}};}
test('all new shops have reachable registers and customers; security can react and be subdued without targeting customers',()=>{
 globalThis.document=canvasDocument();try{for(const def of INTERIORS.slice(0,8)){
  const room=createInterior(def,newCampaign().avatar);assert.ok(room.life.npcs.filter(n=>n.role==='customer').length>=3);let p={x:0,z:5.8};for(let i=0;i<47;i++)p=indoorMove(p.x,p.z,0,-.2,room.obstacles);assert.ok(Math.hypot(p.x,p.z+3.5)<.25,def.id);
  for(let i=0;i<120;i++)room.life.update(.05,0,-3.5,true,true);assert.ok(room.life.npcs.filter(n=>n.role==='customer').every(n=>n.z>5));
  if(def.id==='riverboat'){const guard=room.life.npcs.find(n=>n.role==='security');assert.ok(room.life.subdue(guard.x,guard.z));assert.equal(room.life.subdue(guard.x,guard.z),false);assert.ok(guard.subdued);}
  room.dispose();
 }}finally{delete globalThis.document;}
});
test('empire street dressing changes ownership/contested colors, caps locals and disposes them',()=>{
 assert.notEqual(empireColors(false,false),empireColors(true,false));assert.notEqual(empireColors(true,false),empireColors(true,true));const scene=new THREE.Scene(),life=addEmpireLife(scene),c=ready();c.owned=['skidrow'];life.update(.1,1,c,-120,-120,100);assert.equal(scene.children[0].children.filter(g=>g.visible).length>0,true);life.dispose();assert.equal(scene.children.length,0);
});
test('riverboat poker charges normal buy-in, preserves holds and cannot be played during a heist',async()=>{
 const {playPoker}=await import('../src/expansion.ts');const c=ready();assert.equal(playPoker(c),false);assert.equal(playPoker(c,Math.random,'riverboat'),true);assert.equal(c.clean,19975);c.expansion.poker.held=[0,1,2,3,4];const cards=[...c.expansion.poker.cards];assert.equal(playPoker(c,Math.random,'riverboat'),true);assert.equal(c.expansion.poker,null);assert.match(c.expansion.report,/Poker/);c.kingpin.disguise=90;startRaid(c,'riverboat-job');const money=c.clean;assert.equal(playPoker(c,Math.random,'riverboat'),false);assert.equal(c.clean,money);
});
test('live crew companion boards only a stopped compatible car, rides with it, exits safely and yields taxi seat',async()=>{
 const fs=await import('node:fs'),vm=await import('node:vm'),ts=await import('typescript');const {vehicleExit}=await import('../src/interaction-policy.ts');const source=fs.readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');const body=source.slice(source.indexOf('function updateCompanion('),source.indexOf('function updateKingpin('));
 const c=ready();c.crew=[{id:'muscle',owed:0,loyalty:75}];Object.assign(c.kingpin.companion,{id:'muscle',x:0,z:0});const actor={root:new THREE.Group(),setVisible(){},pose(mode){this.mode=mode;},dispose(){}};const car={x:0,z:0,h:0,speed:0,rig:{passengerSeat:new THREE.Vector3(.45,.4,0),openDoor(){}}};const env={C:c,P:{car,x:0,z:0,heading:0},crewActor:actor,crewActorId:'muscle',crewVehicle:null,crewBoarding:0,crewFire:0,crewNav:{},time:0,THREE,foes:[],feed(){},vehicleExit,npcNavigation:{clear:()=>true,next:()=>null},graphics:{actorRange:100},approach,atPoint:()=>false,dist2:(x,z,a,b)=>Math.hypot(x-a,z-b)};
 vm.createContext(env);const compiled=ts.transpileModule(body,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;vm.runInContext(compiled,env);
 env.updateCompanion(.4);assert.equal(env.crewVehicle,null);env.updateCompanion(.5);assert.equal(env.crewVehicle,car);assert.equal(actor.mode,'seated');car.x=20;env.updateCompanion(.1);assert.equal(c.kingpin.companion.x,20);assert.equal(actor.root.scale.x,.7);
 env.P.car=null;env.updateCompanion(.1);assert.equal(env.crewVehicle,null);assert.ok(Math.hypot(c.kingpin.companion.x-car.x,c.kingpin.companion.z-car.z)>=2.4-1e-6);assert.equal(actor.root.scale.x,1);
 env.P.car=car;Object.assign(c.kingpin.companion,{x:20,z:0});car.rig.passengerSeat=null;env.updateCompanion(1);assert.equal(env.crewVehicle,null);car.rig.passengerSeat=new THREE.Vector3(.45,.4,0);car.speed=10;env.updateCompanion(1);assert.equal(env.crewVehicle,null);car.speed=0;c.pursuits.active={kind:'taxi'};env.updateCompanion(1);assert.equal(env.crewVehicle,null);
});
