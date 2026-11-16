import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newCampaign,restoreCampaign,hire,resetAfterDeath} from '../src/campaign.ts';
import {RACES,FARES,BOUNTIES,FISHING_SPOT,OUTFITS,APARTMENTS,newPursuits,startPursuit,pursuitObjective,pursuitInteract,tickPursuits,buyOutfit,equipOutfit,buyApartment,decorateApartment,buyLivery,bondConversation,rivalryMultiplier} from '../src/pursuits.ts';
import {buyProperty,buyVehicle,propertyRevenue,startMission} from '../src/expansion.ts';
import {startOperation} from '../src/living-city.ts';
import {startWork} from '../src/lifestyle.ts';
import {startStory} from '../src/city-stories.ts';
import {startChapter} from '../src/kingpin.ts';
import {startDaily} from '../src/legacy.ts';
import {approach,mapLocations} from '../src/navigation.ts';
import {walkable,pushOut} from '../src/world.ts';
import {createCar,createPerson} from '../src/actors.ts';
import {applyWardrobe,applyLivery} from '../src/pursuits-art.ts';
import {newBossPattern,bossStyle,tickBoss,insideBossCone} from '../src/boss-tactics.ts';
import {exitBeforeActivity} from '../src/interaction-policy.ts';
const ready=()=>{const c=newCampaign();c.legacy.tutorial=3;c.clean=20000;return c;};
const ctx=(c,extra={})=>{const p=pursuitObjective(c);return {...(c.pursuits.active.kind==='race'||c.pursuits.active.kind==='fishing'?p:approach(p)),driving:false,taxi:false,speed:0,vehicleKey:'car-1',condition:100,guards:0,fired:false,...extra};};
const idle={x:235,z:230,driving:false,taxi:false,speed:0,vehicleKey:'',condition:100,guards:0,fired:false};
test('new activity starts require onboarding, valid IDs, funds and exclusive tracked slot',()=>{
 const c=newCampaign();assert.equal(startPursuit(c,'race','canal'),false);c.legacy.tutorial=3;assert.equal(startPursuit(c,'race','bad'),false);c.clean=10;assert.equal(startPursuit(c,'race','canal'),false);c.clean=300;assert.ok(startPursuit(c,'race','canal'));assert.equal(c.clean,225);
 assert.equal(startWork(c,'medical'),false);assert.equal(startOperation(c,'recovery'),false);assert.equal(startStory(c,'brass','quiet'),false);assert.equal(startMission(c,'parade'),false);assert.equal(startDaily(c),false);assert.equal(startChapter(c,'union','protect','assault'),false);assert.equal(startPursuit(c,'taxi','jazz'),false);
 const d=ready();startWork(d,'medical');assert.equal(startPursuit(d,'fishing','river'),false);
});
test('races enforce sequential raw street checkpoints, same vehicle and single settlement with best time',()=>{
 for(const race of RACES){const c=ready();startPursuit(c,'race',race.id);const before=c.clean;
 assert.equal(pursuitInteract(c,{...ctx(c,{driving:true}),x:235,z:230}),null);assert.match(pursuitInteract(c,ctx(c)),/vehicle/);
 for(let i=0;i<race.points.length;i++){assert.equal(c.pursuits.active.step,i);if(i===1)assert.match(pursuitInteract(c,ctx(c,{driving:true,vehicleKey:'other'})),/same vehicle|vehicle you started/);c.pursuits.active.elapsed=(i+1)*10;assert.ok(pursuitInteract(c,ctx(c,{driving:true})));}
 assert.equal(c.pursuits.active,null);assert.equal(c.clean,before+race.pay);assert.ok(c.pursuits.wins.includes(race.id));assert.equal(c.pursuits.best[race.id],50);assert.equal(startPursuit(c,'race',race.id),false);assert.equal(pursuitInteract(c,idle),null);
 }
});
test('slow race finish earns only 40%, expiry pays nothing and entry fee is not refunded',()=>{
 const c=ready();startPursuit(c,'race','canal');const before=c.clean;c.pursuits.active.elapsed=100;for(let i=0;i<5;i++)pursuitInteract(c,ctx(c,{driving:true}));assert.equal(c.clean,before+240);assert.ok(!c.pursuits.wins.includes('canal'));
 const d=ready();startPursuit(d,'race','canal');assert.match(tickPursuits(d,131,idle),/failed/);assert.equal(d.clean,19925);assert.equal(d.pursuits.active,null);
});
test('taxi needs the actual model and stopped assigned vehicle; leaving returns passenger without resetting timer',()=>{
 const c=ready();startPursuit(c,'taxi','jazz');assert.match(pursuitInteract(c,ctx(c,{driving:true})),/Taxi/);assert.match(pursuitInteract(c,ctx(c,{driving:true,taxi:true,speed:10})),/Stop/);
 assert.match(pursuitInteract(c,ctx(c,{driving:true,taxi:true})),/boarded/);assert.ok(c.pursuits.active.boarded);assert.equal(c.pursuits.active.step,1);
 assert.match(tickPursuits(c,5,idle),/returned to pickup/);assert.equal(c.pursuits.active.step,0);assert.equal(c.pursuits.active.remaining,195);
 pursuitInteract(c,ctx(c,{driving:true,taxi:true}));c.pursuits.active.condition=50;const before=c.clean;assert.match(pursuitInteract(c,ctx(c,{driving:true,taxi:true})),/FARE COMPLETE/);assert.equal(c.clean,before+240);assert.equal(pursuitInteract(c,idle),null);
});
test('fishing requires pier, on-foot cast and explicit bite timing; early/missed casts pay nothing',()=>{
 const c=ready();startPursuit(c,'fishing','river');const before=c.clean;assert.equal(pursuitInteract(c,{...ctx(c),x:0,z:0}),null);assert.match(pursuitInteract(c,ctx(c,{driving:true})),/Exit/);assert.match(pursuitInteract(c,ctx(c)),/Line cast/);assert.match(pursuitInteract(c,ctx(c)),/No bite/);tickPursuits(c,3,ctx(c));assert.ok(c.pursuits.active.window>0);assert.match(pursuitInteract(c,ctx(c)),/FISH LANDED/);assert.equal(c.clean,before+65);assert.equal(c.pursuits.fish,1);
 const d=ready();startPursuit(d,'fishing','river');pursuitInteract(d,ctx(d));tickPursuits(d,3,ctx(d));assert.match(tickPursuits(d,2,ctx(d)),/slipped/);assert.equal(d.clean,19985);assert.equal(d.pursuits.fish,0);
 assert.ok(walkable(FISHING_SPOT.x,FISHING_SPOT.z));assert.equal(pushOut(FISHING_SPOT.x,FISHING_SPOT.z,.5).hit,false);
});
test('bounties require marked target/guards, proof return and cannot pay twice across saves',()=>{
 for(const bounty of BOUNTIES){const c=ready();startPursuit(c,'bounty',bounty.id);assert.match(pursuitInteract(c,ctx(c)),/rivals/);c.pursuits.active.spawned=true;assert.match(pursuitInteract(c,ctx(c,{guards:1})),/rivals/);assert.match(pursuitInteract(c,ctx(c)),/Proof/);const before=c.clean;assert.match(pursuitInteract(c,ctx(c)),/CONTRACT COMPLETE/);assert.equal(c.clean,before+bounty.pay);assert.equal(startPursuit(c,'bounty',bounty.id),false);const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));restored.pursuits.cooldown=0;assert.equal(startPursuit(restored,'bounty',bounty.id),false);}
});
test('rival pressure changes real operating revenue, requires contest threshold/ownership and clears only on settlement',()=>{
 const c=ready();buyProperty(c,'barber');hire(c,'muscle');const base=propertyRevenue(c);assert.equal(startPursuit(c,'rival','barber'),false);tickPursuits(c,120,idle);assert.equal(c.pursuits.rivalry.barber,10);tickPursuits(c,120,idle);assert.equal(c.pursuits.rivalry.barber,20);assert.ok(propertyRevenue(c)<base);assert.ok(startPursuit(c,'rival','barber'));c.pursuits.active.spawned=true;pursuitInteract(c,ctx(c));c.expansion.disabled.push('barber');assert.match(pursuitInteract(c,ctx(c)),/upkeep/);c.expansion.disabled=[];const before=c.clean;pursuitInteract(c,ctx(c));assert.equal(c.clean,before+500);assert.equal(c.pursuits.rivalry.barber,0);assert.equal(propertyRevenue(c),base);c.pursuits.rivalry.barber=100;assert.equal(rivalryMultiplier(c,'barber'),.75);
});
test('wardrobe, apartments, decor and liveries have paid once/valid-ownership gates and save correctly',()=>{
 const c=ready();for(const o of OUTFITS){const money=c.clean;assert.ok(buyOutfit(c,o.id));assert.equal(c.clean,money-o.cost);assert.equal(buyOutfit(c,o.id),false);}assert.equal(equipOutfit(c,'bad'),false);assert.ok(equipOutfit(c,''));
 for(const a of APARTMENTS){assert.equal(decorateApartment(c,a.id,1),false);assert.ok(buyApartment(c,a.id));assert.equal(buyApartment(c,a.id),false);const money=c.clean;assert.ok(decorateApartment(c,a.id,2));assert.equal(c.clean,money-80);assert.equal(decorateApartment(c,a.id,2),false);}
 assert.equal(buyLivery(c,0,'rally'),false);buyVehicle(c,'sedan');assert.ok(buyLivery(c,0,'rally'));assert.equal(buyLivery(c,0,'rally'),false);assert.equal(buyLivery(c,0,'bad'),false);assert.ok(buyLivery(c,0,'none'));
 assert.deepEqual(restoreCampaign(JSON.parse(JSON.stringify(c))).pursuits,c.pursuits);
});
test('crew relationships need active paid crew, share a cooldown, cap gains and cannot farm free loyalty',()=>{
 const c=ready();assert.equal(bondConversation(c,'muscle','listen'),false);hire(c,'muscle');const cash=c.clean;assert.ok(bondConversation(c,'muscle','listen'));assert.equal(c.clean,cash);assert.equal(c.pursuits.bond.muscle,5);assert.equal(bondConversation(c,'muscle','reward'),false);tickPursuits(c,120,idle);assert.ok(bondConversation(c,'muscle','reward'));assert.equal(c.clean,cash-100);assert.equal(c.pursuits.bond.muscle,15);c.crew[0].owed=100;tickPursuits(c,120,idle);assert.equal(bondConversation(c,'muscle','listen'),false);
});
test('new activity state migrates safely, taxi reload requires pickup and death cancels without payout',()=>{
 assert.deepEqual(restoreCampaign({clean:300}).pursuits,newPursuits());const c=ready();startPursuit(c,'taxi','jazz');pursuitInteract(c,ctx(c,{driving:true,taxi:true}));const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(restored.pursuits.active.boarded,false);tickPursuits(restored,.1,idle);assert.equal(restored.pursuits.active.step,0);const cash=c.clean;resetAfterDeath(c);assert.equal(c.pursuits.active,null);assert.equal(c.clean,cash);
 const bad=restoreCampaign({pursuits:{fish:Infinity,wardrobe:['racer','racer','bad'],wearing:'bad',bond:{muscle:1000},decor:{'home-quarter':99},active:{kind:'taxi',id:'bad'}}}).pursuits;assert.equal(bad.fish,0);assert.deepEqual(bad.wardrobe,['racer']);assert.equal(bad.wearing,'');assert.equal(bad.bond.muscle,100);assert.equal(bad.active,null);
});
test('race checkpoints and city pursuit map entries are discoverable and collision-clear at their real positions',()=>{
 for(const race of RACES)for(const p of race.points){assert.ok(walkable(p.x,p.z));assert.equal(pushOut(p.x,p.z,1).hit,false,`${race.id} ${p.x},${p.z}`);}const pins=mapLocations().filter(p=>p.category==='City pursuits');assert.equal(pins.length,RACES.reduce((n,r)=>n+r.points.length,0)+FARES.length+BOUNTIES.length+1);assert.equal(new Set(pins.map(p=>p.id)).size,pins.length);
});
test('boss classes telegraph locked headings, have recoverable attacks and different damage/burst patterns',()=>{
 assert.equal(new Set([1,2,3,4].map(bossStyle)).size,4);const counts=[];
 for(const district of [1,2,3,4]){const p=newBossPattern();let shots=0,sawWarning=false;for(let i=0;i<120;i++){const action=tickBoss(p,district,.05,i<40?0:1,true,5);if(action.telegraph)sawWarning=true;if(action.fire){shots++;assert.ok(action.damage>0);}}assert.ok(sawWarning);assert.ok(shots>0);counts.push(shots);}
 assert.ok(counts[2]>counts[1]);assert.ok(insideBossCone(0,.05,.1));assert.equal(insideBossCone(0,.5,.1),false);const p=newBossPattern();for(let i=0;i<100;i++)assert.equal(tickBoss(p,1,.1,0,false,5).fire,false);
});
test('wardrobe trim and livery meshes are resource-owned and removable without changing balances',()=>{
 const c=ready(),before=JSON.stringify(c),person=createPerson('player',4),car=createCar(0,0x557766),base=car.root.children.length,disposeOutfit=applyWardrobe(person.root,'racer'),disposeLivery=applyLivery(car.root,'checker',0);assert.ok(car.root.children.length>base);disposeLivery();assert.equal(car.root.children.length,base);disposeOutfit();assert.equal(JSON.stringify(c),before);person.dispose();car.dispose();
});
test('wrong vehicles can still exit at a taxi objective and fishing never traps the driver',()=>{
 const c=ready();startPursuit(c,'taxi','jazz');const p=approach(pursuitObjective(c));assert.ok(exitBeforeActivity(c,p.x,p.z,{recovery:false,condition:100,passengerBoarded:false,taxi:false}));assert.equal(exitBeforeActivity(c,p.x,p.z,{recovery:false,condition:100,passengerBoarded:false,taxi:true}),false);assert.ok(exitBeforeActivity(c,235,230,{recovery:false,condition:100,passengerBoarded:false,taxi:true}));
});

test('race reload cancels the vehicle-bound run without refund or result while contracts retain progress',()=>{
 const c=ready();startPursuit(c,'race','canal');pursuitInteract(c,ctx(c,{driving:true}));const saved=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(saved.pursuits.active,null);assert.equal(saved.clean,19925);assert.equal(saved.pursuits.best.canal,undefined);assert.match(saved.pursuits.report,/cancelled on reload/);assert.ok(saved.pursuits.cooldown>=20);
 const d=ready();startPursuit(d,'bounty','lark');d.pursuits.active.spawned=true;pursuitInteract(d,ctx(d));const contract=restoreCampaign(JSON.parse(JSON.stringify(d)));assert.equal(contract.pursuits.active.step,1);assert.equal(contract.pursuits.active.id,'lark');
});
test('city pursuits board starts a selected activity and applies purchased customization through real hooks',async()=>{
 const {pursuitsPanel}=await import('../src/pursuits-ui.ts');class Element{constructor(tag){this.tag=tag;this.textContent='';this.children=[];this.disabled=false;}append(...els){this.children.push(...els);}replaceChildren(...els){this.children=els;}}
 const walk=e=>[e,...e.children.flatMap(walk)];globalThis.document={createElement:tag=>new Element(tag)};
 try{const c=ready(),root=new Element('section');let resumed=0,appearance=0,tracked=null;const hooks={changed:()=>{},notice:()=>{},track:(x,z,name)=>tracked={x,z,name},resume:()=>resumed++,appearance:()=>appearance++};pursuitsPanel(c,root,hooks);
 walk(root).find(e=>e.tag==='button'&&e.textContent==='Enter street race'&&!e.disabled).onclick();assert.equal(c.pursuits.active.kind,'race');assert.equal(resumed,1);assert.match(tracked.name,/Canal/);
 c.pursuits.active=null;c.pursuits.cooldown=0;pursuitsPanel(c,root,hooks);walk(root).find(e=>e.tag==='button'&&e.textContent.startsWith('Canal racing jacket')).onclick();assert.equal(c.pursuits.wearing,'racer');assert.equal(appearance,1);assert.ok(c.pursuits.wardrobe.includes('racer'));
 }finally{delete globalThis.document;}
});

test('activity settlement rejects expired/depleted states before the next simulation tick',()=>{
 for(const kind of ['taxi','fishing','bounty']){const c=ready(),id=kind==='taxi'?'jazz':kind==='fishing'?'river':'lark';startPursuit(c,kind,id);c.pursuits.active.remaining=0;const before=c.clean;assert.match(pursuitInteract(c,ctx(c,{driving:kind==='taxi',taxi:true})),/failed/);assert.equal(c.clean,before);assert.equal(c.pursuits.active,null);}
 const c=ready();startPursuit(c,'race','canal');c.pursuits.active.condition=0;const before=c.clean;assert.match(pursuitInteract(c,ctx(c,{driving:true})),/failed/);assert.equal(c.clean,before);assert.equal(c.pursuits.active,null);
});
test('a driver can exit the wrong car at a race checkpoint instead of getting stuck in an error loop',()=>{
 const c=ready();startPursuit(c,'race','canal');pursuitInteract(c,ctx(c,{driving:true,vehicleKey:'first'}));const p=pursuitObjective(c),car={recovery:false,condition:100,passengerBoarded:false,taxi:false,vehicleKey:'other'};assert.ok(exitBeforeActivity(c,p.x,p.z,car));assert.equal(exitBeforeActivity(c,p.x,p.z,{...car,vehicleKey:'first'}),false);
});
