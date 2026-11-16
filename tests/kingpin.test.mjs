import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newCampaign,restoreCampaign,hire,resetAfterDeath,BLOCKS} from '../src/campaign.ts';
import {buyProperty,buyVehicle,startRun,upgradeVehicle,startMission} from '../src/expansion.ts';
import {startOperation} from '../src/living-city.ts';
import {startWork} from '../src/lifestyle.ts';
import {startStory} from '../src/city-stories.ts';
import {startDaily} from '../src/legacy.ts';
import {CHAPTERS,newKingpin,startChapter,startBusiness,startPersonal,startTakeover,canTakeover,venturePoint,ventureInteract,tickKingpin,guardsRequired,callCompanion,commandCompanion,injureCompanion,vehicleRecord,insureVehicle,impoundVehicle,recoverVehicle,replateVehicle,plateLabel,reportTheft,buyDisguise,useDistraction,canTakedown,retireVentureActors} from '../src/kingpin.ts';
import {atmosphereLine,tickAtmosphere,radioPattern} from '../src/city-atmosphere.ts';
import {approach} from '../src/navigation.ts';
import {createCar} from '../src/actors.ts';
import {applyLicensePlate} from '../src/vehicle-plates.ts';
const ready=()=>{const c=newCampaign();c.legacy.tutorial=3;c.clean=50000;c.cityStories.completed=['brass','levee','crown'];return c;};
const context=(c,extra={})=>({...approach(venturePoint(c)??{x:0,z:0}),driving:false,guards:0,heat:c.heat,noise:false,lockHeld:false,...extra});
function resolveCombat(c){c.kingpin.active.spawned=true;c.kingpin.active.resolved=true;}
function completeChapter(c,id,choice='protect',method='assault'){
 assert.ok(startChapter(c,id,choice,method));assert.match(ventureInteract(c,context(c)),/advanced/);
 if(method==='assault')resolveCombat(c);if(method==='lockpick')tickKingpin(c,8,context(c,{lockHeld:true}));if(method==='disguise')buyDisguise(c);
 assert.match(ventureInteract(c,context(c)),/advanced/);assert.match(ventureInteract(c,context(c)),/complete/);
}
test('new story arc enforces original finale, sequential choices and exclusive activities',()=>{
 const c=newCampaign();assert.equal(startChapter(c,'union','protect','assault'),false);
 c.legacy.tutorial=3;c.cityStories.completed=['crown'];assert.equal(startChapter(c,'betrayal','protect','assault'),false);assert.equal(startChapter(c,'bad','protect','assault'),false);assert.equal(startChapter(c,'union','bad','assault'),false);
 assert.ok(startChapter(c,'union','protect','assault'));assert.equal(startOperation(c,'recovery'),false);assert.equal(startWork(c,'medical'),false);assert.equal(startStory(c,'brass','quiet'),false);assert.equal(startDaily(c),false);assert.equal(startMission(c,'parade'),false);
 assert.equal(ventureInteract(c,{...context(c),x:235,z:230}),null);assert.equal(c.clean,300);
});
test('each story approach requires its actual on-site conditions and cannot double-pay',()=>{
 for(const method of ['assault','bribe','lockpick','disguise']){
  const c=ready(),before=c.clean;assert.ok(startChapter(c,'union','protect',method));ventureInteract(c,context(c));
  if(method==='assault'){assert.match(ventureInteract(c,context(c)),/guards/);c.kingpin.active.spawned=true;assert.match(ventureInteract(c,context(c,{guards:2})),/guards/);resolveCombat(c);}
  if(method==='bribe'){c.clean=299;assert.match(ventureInteract(c,context(c)),/300/);c.clean=before;}
  if(method==='lockpick'){assert.match(ventureInteract(c,context(c)),/Hold L/);tickKingpin(c,4,context(c,{lockHeld:true}));assert.equal(c.kingpin.active.progress,4);tickKingpin(c,.1,context(c,{noise:true,lockHeld:true}));assert.equal(c.kingpin.active.progress,0);tickKingpin(c,8,context(c,{lockHeld:true}));assert.equal(c.kingpin.active.resolved,true);}
  if(method==='disguise'){assert.match(ventureInteract(c,context(c)),/disguise/);assert.ok(buyDisguise(c));}
  assert.match(ventureInteract(c,context(c)),/advanced/);const intermediate=c.clean;assert.match(ventureInteract(c,context(c)),/complete/);assert.equal(c.clean,intermediate+1800);assert.equal(c.kingpin.chapters.union,'protect');const cash=c.clean;
  assert.equal(ventureInteract(c,context(c)),null);assert.equal(startChapter(c,'union','protect',method),false);assert.equal(c.clean,cash);
 }
});
test('betrayal choices affect loyalty, reputation, heat and persistent story branch',()=>{
 const protect=ready(),profit=ready();for(const c of [protect,profit])hire(c,'muscle');
 for(const ch of CHAPTERS){completeChapter(protect,ch.id,'protect');completeChapter(profit,ch.id,'profit');}
 assert.ok(profit.clean>protect.clean);assert.ok(profit.heat>protect.heat);assert.ok(protect.crew[0].loyalty>profit.crew[0].loyalty);assert.ok(protect.living.reputation[0]>profit.living.reputation[0]);
 assert.deepEqual(restoreCampaign(JSON.parse(JSON.stringify(profit))).kingpin,profit.kingpin);
});
test('business activities enforce ownership, setup stakes, timer/vehicle gates and repeat cooldown',()=>{
 const c=ready();assert.equal(startBusiness(c,'jazz','club'),false);buyProperty(c,'jazz');const cash=c.clean;assert.ok(startBusiness(c,'jazz','club'));assert.equal(c.clean,cash-100);
 assert.equal(startBusiness(c,'jazz','club'),false);ventureInteract(c,context(c));assert.match(ventureInteract(c,context(c)),/Remain/);
 tickKingpin(c,10,context(c,{x:235,z:230}));assert.equal(c.kingpin.active.progress,0);tickKingpin(c,25,context(c));assert.match(ventureInteract(c,context(c)),/advanced/);assert.match(ventureInteract(c,context(c)),/complete/);assert.equal(c.clean,cash+450);assert.equal(c.kingpin.businessWins,1);assert.equal(startBusiness(c,'jazz','club'),false);
 tickKingpin(c,240,{x:235,z:230,heat:0,noise:false,driving:false,guards:0,lockHeld:false});assert.ok(startBusiness(c,'jazz','club'));
 const d=ready();buyProperty(d,'dock');assert.equal(startBusiness(d,'dock','shipment'),false);d.inventory[0]=5;assert.ok(startBusiness(d,'dock','shipment'));assert.equal(d.inventory[0],3);ventureInteract(d,context(d));assert.match(ventureInteract(d,context(d)),/vehicle/);assert.match(ventureInteract(d,context(d,{driving:true})),/advanced/);d.kingpin.active.cargo=50;const balance=d.clean;ventureInteract(d,context(d));assert.equal(d.clean,balance+550);
});
test('protection negotiations need paid crew and low-heat venue presence, or resolved combat',()=>{
 const c=ready();buyProperty(c,'barber');assert.equal(startBusiness(c,'barber','protection'),false);hire(c,'muscle');assert.ok(startBusiness(c,'barber','protection'));ventureInteract(c,context(c));
 tickKingpin(c,15,context(c,{heat:40}));assert.equal(c.kingpin.active.progress,0);tickKingpin(c,15,context(c));assert.ok(c.kingpin.active.resolved);assert.match(ventureInteract(c,context(c,{guards:2})),/advanced/);assert.match(ventureInteract(c,context(c)),/complete/);
});
test('personal missions are one-time paid-loyal crew activities, strengthen loyalty and retain wages gate',()=>{
 const c=ready();assert.equal(startPersonal(c,'muscle'),false);hire(c,'muscle');assert.ok(startPersonal(c,'muscle'));ventureInteract(c,context(c));assert.ok(guardsRequired(c.kingpin.active));resolveCombat(c);ventureInteract(c,context(c));c.crew[0].owed=5;assert.match(ventureInteract(c,context(c)),/Pay or restore/);c.crew[0].owed=0;assert.match(ventureInteract(c,context(c)),/complete/);assert.equal(c.crew[0].loyalty,100);assert.deepEqual(c.kingpin.personal,['muscle']);assert.equal(startPersonal(c,'muscle'),false);
});
test('takeover requires real empire control and five separate guarded stages, pays once with three endings',()=>{
 for(const choices of [['protect','protect','protect'],['profit','profit','profit'],['protect','profit','protect']]){
  const c=ready();assert.equal(canTakeover(c),false);CHAPTERS.forEach((ch,i)=>c.kingpin.chapters[ch.id]=choices[i]);c.owned=BLOCKS.map(b=>b.id);for(const id of ['barber','record','courier'])buyProperty(c,id);hire(c,'muscle');hire(c,'smuggler');assert.ok(canTakeover(c));assert.ok(startTakeover(c));
  for(let i=0;i<5;i++){assert.equal(c.kingpin.active.step,i);assert.match(ventureInteract(c,context(c)),/guards/);resolveCombat(c);assert.match(ventureInteract(c,context(c)),/next takeover/);assert.equal(c.kingpin.active.spawned,false);assert.equal(c.kingpin.active.resolved,false);}
  c.owned.pop();assert.match(ventureInteract(c,context(c)),/Retake/);c.owned=BLOCKS.map(b=>b.id);const money=c.clean;assert.match(ventureInteract(c,context(c)),/CITY TAKEN/);assert.equal(c.clean,money+8000);assert.equal(c.kingpin.ending,choices.every(v=>v==='protect')?'coalition':choices.every(v=>v==='profit')?'kingpin':'broker');assert.equal(startTakeover(c),false);
 }
});
test('venture expiry, cargo loss and death give no rewards; retaliation threatens real owned turf',()=>{
 const c=ready();startChapter(c,'union','protect','assault');const cash=c.clean;assert.match(tickKingpin(c,421,context(c))[0],/failed/);assert.equal(c.clean,cash);assert.equal(c.kingpin.active,null);
 startChapter(c,'union','protect','assault');resetAfterDeath(c);assert.equal(c.kingpin.active,null);
 c.kingpin.chapters.union='profit';c.owned=['skidrow'];tickKingpin(c,241,{x:0,z:0,heat:0,noise:false,driving:false,guards:0,lockHeld:false});assert.equal(c.defense.block,'skidrow');assert.equal(c.defense.remaining,120);
 const d=ready();buyProperty(d,'dock');d.inventory[0]=2;startBusiness(d,'dock','shipment');d.kingpin.active.cargo=0;tickKingpin(d,.1,context(d));assert.equal(d.kingpin.active,null);assert.equal(d.inventory[0],0);
});
test('companions require active crew, cannot be recalled to heal, honor commands and injury cooldown',()=>{
 const c=ready();assert.equal(callCompanion(c,'muscle',30,4),false);hire(c,'muscle');assert.ok(callCompanion(c,'muscle',30,4));assert.ok(commandCompanion(c,'hold'));assert.equal(c.kingpin.companion.command,'hold');assert.equal(callCompanion(c,'muscle',30,4),false);
 assert.equal(injureCompanion(c,30),false);assert.equal(c.kingpin.companion.hp,70);assert.ok(commandCompanion(c,'retreat'));assert.equal(injureCompanion(c,100),true);assert.equal(c.kingpin.companion.id,'');assert.equal(c.kingpin.companion.injury,90);assert.equal(c.crew[0].loyalty,67);assert.equal(callCompanion(c,'muscle',30,4),false);
 tickKingpin(c,90,{x:0,z:0,heat:0,noise:false,driving:false,guards:0,lockHeld:false});assert.ok(callCompanion(c,'muscle',30,4));
});
test('owned plates, insurance, impound and recovery retain money/condition/status gates across reload',()=>{
 const c=ready();buyVehicle(c,'sedan');c.inventory[0]=20;c.expansion.parts=10;assert.equal(insureVehicle(c,9),false);assert.ok(insureVehicle(c,0));assert.equal(insureVehicle(c,0),false);vehicleRecord(c,0).reported=true;impoundVehicle(c,0);assert.equal(startRun(c,0),false);assert.equal(upgradeVehicle(c,0,false),false);assert.equal(recoverVehicle(c,0,false),false);
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c))),cash=restored.clean;assert.ok(recoverVehicle(restored,0,true));assert.equal(restored.clean,cash-50);assert.equal(restored.living.vehicleCondition[0],100);assert.equal(restored.kingpin.vehicles[0].reported,false);assert.equal(recoverVehicle(restored,0,true),false);
 const plate=plateLabel(0,0);assert.equal(replateVehicle(restored,0,false),false);restored.heat=60;assert.equal(replateVehicle(restored,0,true),false);restored.heat=0;assert.ok(replateVehicle(restored,0,true));assert.notEqual(plateLabel(0,restored.kingpin.vehicles[0].plate),plate);
 const d=ready();buyVehicle(d,'sedan');impoundVehicle(d,0);d.living.vehicleCondition[0]=10;const before=d.clean;assert.ok(recoverVehicle(d,0,true));assert.equal(d.clean,before-300);assert.equal(d.living.vehicleCondition[0],30);
});
test('street theft report is once per car; tools spend once, respect cooldown and nonlethal geometry',()=>{
 const c=ready();assert.ok(reportTheft(c,'street-3'));assert.equal(reportTheft(c,'street-3'),false);assert.equal(reportTheft(c,'invalid'),false);assert.equal(c.heat,8);assert.ok(buyDisguise(c));assert.equal(buyDisguise(c),false);tickKingpin(c,.1,{x:0,z:0,heat:8,noise:true,driving:false,guards:0,lockHeld:false});assert.equal(c.kingpin.disguise,0);
 const cash=c.clean;assert.ok(useDistraction(c));assert.equal(c.clean,cash-10);assert.equal(useDistraction(c),false);
 const foe={x:0,z:0,heading:0,dead:0,kind:'gangster'};assert.ok(canTakedown({x:0,z:-1,crouched:true},foe));assert.equal(canTakedown({x:0,z:1,crouched:true},foe),false);assert.equal(canTakedown({x:0,z:-1,crouched:false},foe),false);assert.equal(canTakedown({x:0,z:-1,crouched:true},{...foe,kind:'civilian'}),false);
});
test('radio patterns are distinct and captioned events never appear over an active mission',()=>{
 const c=ready();assert.notDeepEqual(radioPattern('jazz',0),radioPattern('bounce',0));assert.deepEqual(radioPattern('off',0),[]);assert.deepEqual(radioPattern('news',0),[]);
 c.kingpin.radio='news';assert.match(atmosphereLine(c,0),/Crescent News/);assert.ok(tickAtmosphere(c,24,1).length);assert.equal(c.kingpin.active,null);
 startChapter(c,'union','protect','assault');tickAtmosphere(c,200,0);assert.equal(c.kingpin.active.kind,'story');c.kingpin.active=null;tickAtmosphere(c,1,0);assert.equal(c.kingpin.active.kind,'event');assert.ok(['relief','witness'].includes(c.kingpin.active.id));
});
test('old/malformed saves migrate safely, clamp private state and reject impossible active ventures',()=>{
 assert.deepEqual(restoreCampaign({clean:500}).kingpin,newKingpin());
 const s=restoreCampaign({kingpin:{chapters:{union:'profit',unknown:'protect'},personal:['muscle','muscle','bad'],companion:{id:'muscle',hp:Infinity,injury:900,command:'fly'},vehicles:{0:{plate:90000,insured:true,reported:true},bad:{}},streetReports:['street-2','street-2','<x>'],active:{kind:'story',id:'bad',method:'assault',choice:'protect'},radio:'bad'}}).kingpin;
 assert.deepEqual(s.chapters,{union:'profit'});assert.deepEqual(s.personal,['muscle']);assert.equal(s.companion.hp,100);assert.equal(s.companion.injury,120);assert.equal(s.companion.command,'follow');assert.equal(s.vehicles[0].plate,9999);assert.deepEqual(s.streetReports,['street-2']);assert.equal(s.active,null);assert.equal(s.radio,'jazz');
});
test('license plate labels use private disposable textures without changing vehicle paint',()=>{
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})})};
 try{const car=createCar(0,0x336677),plate=car.root.getObjectByName('license-plate'),original=plate.material;const cleanup=applyLicensePlate(car.root,'CC-01-2900');assert.notEqual(plate.material,original);assert.ok(plate.material.map);let disposed=false;plate.material.map.addEventListener('dispose',()=>disposed=true);cleanup();assert.equal(plate.material,original);assert.ok(disposed);car.dispose();}finally{delete globalThis.document;}
});

test('new story and companion board buttons start the right approach and preserve command state',async()=>{
 const {kingpinPanel}=await import('../src/kingpin-ui.ts');
 class Element{constructor(tag){this.tag=tag;this.textContent='';this.children=[];this.disabled=false;this.value='';}append(...els){this.children.push(...els);if(this.tag==='select'&&!this.value&&els[0])this.value=els[0].value;}replaceChildren(...els){this.children=els;}setAttribute(k,v){this[k]=v;}}
 const walk=e=>[e,...e.children.flatMap(walk)];globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const c=ready();hire(c,'muscle');let resumes=0,tracked=null;const root=new Element('section');
  const h={changed:()=>{},notice:()=>{},track:(x,z,name)=>tracked={x,z,name},resume:()=>resumes++,location:()=>({x:30,z:4}),garage:()=>true,room:()=>null};
  kingpinPanel(c,root,h);const approach=walk(root).find(e=>e['aria-label']==='The Harbor Compact approach');approach.value='bribe';walk(root).find(e=>e.tag==='button'&&e.textContent===CHAPTERS[0].protect).onclick();assert.equal(c.kingpin.active.method,'bribe');assert.equal(resumes,1);assert.ok(tracked.name.includes('Harbor'));
  c.kingpin.active=null;kingpinPanel(c,root,h);walk(root).find(e=>e.tag==='button'&&e.textContent.startsWith('Call Simone')).onclick();assert.equal(c.kingpin.companion.id,'muscle');walk(root).find(e=>e.tag==='button'&&e.textContent==='HOLD').onclick();assert.equal(c.kingpin.companion.command,'hold');
  walk(root).find(e=>e.tag==='button'&&e.textContent==='NEWS').onclick();assert.equal(c.kingpin.radio,'news');
 }finally{delete globalThis.document;}
});
test('gunfire commits a protection negotiation to the combat route; unsupported activities cannot start',()=>{
 const c=ready();buyProperty(c,'barber');hire(c,'muscle');assert.equal(startBusiness(c,'barber','invalid'),false);startBusiness(c,'barber','protection');ventureInteract(c,context(c));tickKingpin(c,5,context(c));assert.equal(c.kingpin.active.progress,5);tickKingpin(c,.1,context(c,{noise:true}));assert.equal(c.kingpin.active.method,'assault');assert.equal(c.kingpin.active.progress,0);tickKingpin(c,16,context(c));assert.equal(c.kingpin.active.resolved,false);assert.match(ventureInteract(c,context(c)),/guards/);
});

test('active progress, spawned guards, lock progress and cargo survive saves without extra setup charges',()=>{
 const c=ready();startChapter(c,'union','profit','lockpick');ventureInteract(c,context(c));tickKingpin(c,4,context(c,{lockHeld:true}));const cash=c.clean;
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.deepEqual(restored.kingpin,c.kingpin);assert.equal(restored.clean,cash);tickKingpin(restored,4,context(restored,{lockHeld:true}));assert.ok(restored.kingpin.active.resolved);
 const d=ready();buyProperty(d,'dock');d.inventory[0]=2;startBusiness(d,'dock','shipment');ventureInteract(d,context(d));d.kingpin.active.cargo=41;
 const shipment=restoreCampaign(JSON.parse(JSON.stringify(d)));assert.equal(shipment.kingpin.active.cargo,41);assert.equal(shipment.inventory[0],0);assert.equal(startBusiness(shipment,'dock','shipment'),false);
});
test('street relief and witness events require on-site payment/combat and never duplicate payouts',()=>{
 const c=ready();c.kingpin.active={kind:'event',id:'relief',step:0,remaining:120,choice:'protect',method:'assault',spawned:false,resolved:false,progress:0,cargo:100};
 assert.equal(ventureInteract(c,{...context(c),x:235,z:230}),null);c.clean=49;assert.match(ventureInteract(c,context(c)),/50 clean/);c.clean=100;assert.match(ventureInteract(c,context(c)),/Relief delivered/);assert.equal(c.clean,50);assert.equal(c.living.reputation[1],8);assert.equal(ventureInteract(c,context(c)),null);
 c.kingpin.active={kind:'event',id:'witness',step:0,remaining:120,choice:'protect',method:'assault',spawned:false,resolved:false,progress:0,cargo:100};ventureInteract(c,context(c));assert.match(ventureInteract(c,context(c)),/guards/);resolveCombat(c);assert.match(ventureInteract(c,context(c)),/Witness safe/);assert.equal(c.clean,200);assert.equal(ventureInteract(c,context(c)),null);
});
test('new chapter contacts and return addresses have distinct navigable map IDs without auto-acceptance',async()=>{
 const {mapLocations}=await import('../src/navigation.ts');const rows=mapLocations().filter(p=>p.category==='Kingpin story contacts');assert.equal(rows.length,6);assert.equal(new Set(rows.map(r=>r.id)).size,6);const c=ready();assert.equal(c.kingpin.active,null);assert.ok(rows.every(p=>Number.isFinite(p.x)&&p.instruction.length>20));
});


test('venture retirement during reverse AI iteration never splices actors or makes the next encounter look spawned',()=>{
 const actors=[{id:1,blockId:'venture',hp:40,dead:0},{id:2,blockId:'other',hp:50,dead:0},{id:3,blockId:'venture',hp:40,dead:0}];
 const visited=[],retired=[];for(let i=actors.length-1;i>=0;i--){const actor=actors[i];visited.push(actor.id);if(actor.id===3)retireVentureActors(actors,a=>retired.push(a.id));}
 assert.deepEqual(visited,[3,2,1]);assert.deepEqual(retired,[1,3]);assert.equal(actors.length,3);assert.equal(actors[1].hp,50);assert.equal(actors.filter(a=>a.blockId==='venture').length,0);assert.ok(actors.filter(a=>a.blockId==='retired-venture').every(a=>a.hp===0&&a.dead===.01));
});
