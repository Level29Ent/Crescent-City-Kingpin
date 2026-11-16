import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,restoreCampaign,resetAfterDeath,hire,bonus,launder} from '../src/campaign.ts';
import {OPERATIONS,newLivingCity,startOperation,operationObjective,operationInteract,tickOperation,localService,businessHours,upgradeTires,trainCrew,upgradeBusiness,trained,reputationGain} from '../src/living-city.ts';
import {startWork} from '../src/lifestyle.ts';
import {startStory} from '../src/city-stories.ts';
import {startMission,buyVehicle,buyProperty,propertyRevenue,frontLaunder} from '../src/expansion.ts';
import {startDaily} from '../src/legacy.ts';
import {approach} from '../src/navigation.ts';
const context=(c,extra={})=>({...approach(operationObjective(c)),driving:false,bike:false,recoveryCar:false,condition:100,guards:0,fired:false,searching:false,...extra});
function ready(){const c=newCampaign();c.legacy.tutorial=3;c.clean=20000;return c;}
test('operations require tutorial, prerequisites, no overlapping activity and valid approach',()=>{
 const c=newCampaign();assert.equal(startOperation(c,'recovery'),false);c.legacy.tutorial=3;
 assert.equal(startOperation(c,'heist'),false);assert.equal(startOperation(c,'nope'),false);assert.ok(startOperation(c,'recovery'));
 assert.equal(startWork(c,'medical'),false);assert.equal(startStory(c,'brass','quiet'),false);assert.equal(startMission(c,'parade'),false);assert.equal(startDaily(c),false);
 assert.equal(operationInteract(c,{...context(c),x:230,z:230}),null);assert.equal(c.clean,300);
});
test('vehicle recovery permits entering the car, rejects substitutes and wrecks, pays once',()=>{
 const c=ready();startOperation(c,'recovery');assert.equal(operationInteract(c,context(c)),null,'on-foot E may enter car');
 assert.match(operationInteract(c,context(c,{driving:true})),/marked wagon/);
 const vehicle={driving:true,recoveryCar:true};assert.match(operationInteract(c,context(c,vehicle)),/advanced/);
 assert.match(operationInteract(c,context(c,{...vehicle,condition:20})),/above 20/);
 assert.match(operationInteract(c,context(c,vehicle)),/complete/);assert.equal(c.clean,20750);
 assert.equal(operationInteract(c,{x:0,z:0}),null);assert.equal(startOperation(c,'recovery'),false);assert.deepEqual(c.living.completed,['recovery']);
});
test('rescue requires on-foot pickup and four-wheel transport, not remote confirmation',()=>{
 const c=ready();c.living.completed=['recovery'];startOperation(c,'rescue');
 assert.match(operationInteract(c,context(c,{driving:true})),/Exit/);assert.match(operationInteract(c,context(c)),/advanced/);
 assert.match(operationInteract(c,context(c,{driving:true,bike:true})),/motorcycle/);assert.match(operationInteract(c,context(c)),/needs a car/);
 assert.match(operationInteract(c,context(c,{driving:true,passengerBoarded:true})),/complete/);assert.equal(c.clean,20950);
});
test('quiet operations fail on gunfire or heat, timeout pays nothing, death cancels operations',()=>{
 for(const [heat,fired]of [[0,true],[30,false]]){const c=ready();c.living.completed=['recovery'];startOperation(c,'stealth');c.heat=heat;assert.match(tickOperation(c,.1,fired),/compromised/);assert.equal(c.living.active,null);assert.equal(c.clean,20000);}
 const c=ready();startOperation(c,'recovery');assert.match(tickOperation(c,241,false),/expired/);assert.equal(c.clean,20000);
 startOperation(c,'recovery');c.heat=100;resetAfterDeath(c);assert.equal(c.living.active,null);assert.equal(c.heat,0);
});
test('protection and loud heist cannot bypass guard spawn or combat, heist requires losing police',()=>{
 for(const id of ['protection','heist']){const c=ready();c.living.completed=['recovery','rescue','stealth'];assert.ok(startOperation(c,id));
 assert.match(operationInteract(c,context(c)),/advanced/);assert.match(operationInteract(c,context(c)),/guards/);
 c.living.active.spawned=true;assert.match(operationInteract(c,context(c,{guards:2})),/guards/);assert.match(operationInteract(c,context(c)),/advanced/);
 if(id==='heist'){assert.match(operationInteract(c,context(c)),/Lose the police/);c.heat=0;assert.match(operationInteract(c,context(c,{searching:true})),/Lose the police/);}
 assert.match(operationInteract(c,context(c)),/complete/);assert.equal(c.living.active,null);
 }
});
test('quiet heist needs paid smuggler and clean execution; active progress survives a save',()=>{
 const c=ready();c.living.completed=['recovery','rescue','stealth'];assert.equal(startOperation(c,'heist','quiet'),false);hire(c,'smuggler');assert.ok(startOperation(c,'heist','quiet'));
 operationInteract(c,context(c));const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.deepEqual(restored.living,c.living);
 assert.match(operationInteract(restored,context(restored)),/advanced/);assert.equal(restored.heat,16);assert.match(operationInteract(restored,context(restored)),/complete/);
 assert.ok(restored.living.completed.includes('heist'));
});
test('all new operation stages use reachable objective approaches',()=>{for(const m of OPERATIONS)for(const point of m.stages){const p=approach(point);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));}});
test('services check room type, hours, need, funds, cooldown, no resurrection and real nearby car input',()=>{
 const c=ready(),p={hp:40,stamina:10,condition:20};
 assert.equal(localService(c,'not-a-room','meal',p),null);assert.equal(localService(c,'gallery','repair',p),null);
 const clinic=localService(c,'clinic','treatment',p);assert.equal(clinic.hp,100);assert.equal(clinic.cost,80);assert.equal(c.clean,19920);
 assert.equal(localService(c,'clinic','treatment',p),null);tickOperation(c,30,false);
 assert.equal(localService(c,'clinic','treatment',{...p,hp:0}),null);assert.equal(localService(c,'clinic','treatment',{...p,hp:100}),null);
 assert.equal(localService(c,'garage','repair',{...p,condition:null}),null);
 assert.equal(localService(c,'garage','repair',{...p,condition:100}),null);
 assert.equal(localService(c,'garage','repair',p).condition,100);tickOperation(c,30,false);
 assert.equal(localService(c,'diner','meal',p).stamina,100);assert.equal(c.living.rested,120);tickOperation(c,30,false);
 assert.equal(localService(c,'diner','meal',{...p,stamina:100}),null);
 c.clean=0;assert.equal(localService(c,'clinic','treatment',p),null);
 assert.ok(businessHours('arcade',0));assert.equal(businessHours('arcade',600),false);assert.ok(businessHours('clinic',600));assert.equal(businessHours('diner',400),false);
});
test('earned tuning, crew training and business upgrades enforce costs, caps and operating state',()=>{
 const c=ready();buyVehicle(c,'sedan');buyProperty(c,'barber');c.expansion.parts=10;
 assert.equal(upgradeTires(c,0),false);c.living.completed=['recovery'];assert.ok(upgradeTires(c,0));assert.equal(c.expansion.parts,9);
 hire(c,'muscle');assert.equal(trainCrew(c,'muscle'),false);c.living.completed.push('rescue');const defense=bonus(c).defense;
 assert.ok(trainCrew(c,'muscle'));assert.equal(bonus(c).defense,defense+3);assert.equal(trained(c,'muscle'),1);
 c.crew[0].owed=1;assert.equal(trained(c,'muscle'),0);assert.equal(trainCrew(c,'muscle'),false);c.crew[0].owed=0;
 assert.equal(upgradeBusiness(c,'barber'),false);c.living.completed.push('stealth');const base=propertyRevenue(c);assert.ok(upgradeBusiness(c,'barber'));assert.equal(propertyRevenue(c),base*1.15);
 c.expansion.disabled.push('barber');assert.equal(propertyRevenue(c),0);assert.equal(upgradeBusiness(c,'barber'),false);
 for(let i=0;i<2;i++)assert.ok(upgradeTires(c,0));assert.equal(upgradeTires(c,0),false);
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.deepEqual(restored.living,c.living);
});
test('business levels expand real front capacity and accountant training changes yield only while active',()=>{
 const c=ready();buyProperty(c,'laundromat');c.living.completed=['recovery','rescue','stealth'];upgradeBusiness(c,'laundromat');c.dirty=10000;
 const clean=frontLaunder(c,'laundromat');assert.equal(clean,552);assert.equal(c.dirty,9310);assert.equal(frontLaunder(c,'laundromat'),0);
 hire(c,'accountant');trainCrew(c,'accountant');c.dirty=100;assert.equal(launder(c,100),81);
});
test('standing and malformed/old saves are bounded; mobile preferences and vehicle condition persist',()=>{
 const c=ready();reputationGain(c,0,120);assert.equal(c.living.reputation[0],100);reputationGain(c,0,-200);assert.equal(c.living.reputation[0],0);
 assert.deepEqual(restoreCampaign({clean:300}).living,newLivingCity());
 const restored=restoreCampaign({living:{completed:['recovery','recovery','invalid'],reputation:[Infinity,-1,500],vehicleCondition:{0:0,1:200,2:NaN},controls:{scale:10,opacity:-1,leftHanded:true,aimAssist:true},tires:{0:30,bad:2},training:{muscle:99},active:{id:'bad'}}}).living;
 assert.deepEqual(restored.completed,['recovery']);assert.deepEqual(restored.reputation,[0,0,100,0,0]);assert.equal(restored.controls.scale,1.25);assert.equal(restored.controls.opacity,.35);assert.ok(restored.controls.leftHanded);assert.equal(restored.tires[0],3);assert.equal(restored.tires.bad,undefined);assert.equal(restored.vehicleCondition[0],0);assert.equal(restored.vehicleCondition[1],100);assert.equal(restored.vehicleCondition[2],100);assert.equal(restored.active,null);
});

test('City Life UI exposes on-site services, starts operations and saves mobile preferences',async()=>{
 const {livingCityPanel}=await import('../src/living-city-ui.ts');
 class Element{constructor(tag){this.tag=tag;this.textContent='';this.children=[];this.disabled=false;}append(...els){this.children.push(...els);}replaceChildren(...els){this.children=els;}setAttribute(key,value){this[key]=value;}}
 const walk=e=>[e,...e.children.flatMap(walk)];
 globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const c=ready(),root=new Element('section');let changed=0,resumed=0,tracked=null,service=null;
  const hooks={room:()=>null,service:a=>service=a,changed:()=>changed++,resume:()=>resumed++,notice:()=>{},track:(x,z,name)=>tracked={x,z,name}};
  livingCityPanel(c,root,hooks);assert.equal(walk(root).filter(e=>e.tag==='button'&&e.textContent.includes('Clinic treatment')).length,0);
  const accept=walk(root).find(e=>e.tag==='button'&&e.textContent==='Accept operation'&&!e.disabled);accept.onclick();assert.equal(c.living.active.id,'recovery');assert.equal(resumed,1);assert.ok(tracked.name.includes('Borrowed Wheels'));
  const scale=walk(root).find(e=>e['aria-label']==='Control size');scale.value='1.2';scale.oninput();assert.equal(c.living.controls.scale,1.2);assert.ok(changed>=2);
  c.living.active=null;livingCityPanel(c,root,{...hooks,room:()=> 'clinic'});const treatment=walk(root).find(e=>e.tag==='button'&&e.textContent.includes('Clinic treatment'));assert.equal(treatment.disabled,false);treatment.onclick();assert.equal(service,'treatment');
 }finally{delete globalThis.document;}
});

test('recovery condition and guard-spawn phase survive save/load without reset',()=>{
 const c=ready();startOperation(c,'recovery');c.living.active.vehicleCondition=23;
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(restored.living.active.vehicleCondition,23);
 c.living.active=null;c.living.completed=['recovery','rescue'];startOperation(c,'protection');operationInteract(c,context(c));c.living.active.spawned=true;
 const fight=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(fight.living.active.step,1);assert.equal(fight.living.active.spawned,true);
 assert.match(operationInteract(fight,context(fight,{guards:1})),/guards/);
});

test('upgraded laundering usage is not reduced on save restoration to enable extra payouts',()=>{
 const c=ready();buyProperty(c,'laundromat');c.living.completed=['recovery','rescue','stealth'];
 for(let i=0;i<3;i++)upgradeBusiness(c,'laundromat');c.dirty=10000;frontLaunder(c,'laundromat');
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(restored.expansion.frontsUsed.laundromat,c.expansion.frontsUsed.laundromat);assert.equal(frontLaunder(restored,'laundromat'),0);
});

test('each operation stage is discoverable on the map without accepting or rewarding it',async()=>{
 const {mapLocations}=await import('../src/navigation.ts');const c=ready(),before=JSON.stringify(c);
 const pins=mapLocations().filter(p=>p.category==='City operations');assert.equal(pins.length,OPERATIONS.reduce((n,m)=>n+m.stages.length,0));
 assert.ok(pins.every(p=>p.instruction.includes('City Life')));assert.equal(JSON.stringify(c),before);
});
