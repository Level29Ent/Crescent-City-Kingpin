import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,restoreCampaign,hire} from '../src/campaign.ts';
import {callCompanion,injureCompanion,startBusiness,venturePoint,ventureInteract} from '../src/kingpin.ts';
import {startWork} from '../src/lifestyle.ts';
import {startDaily,dailyRoute,dailyCheckpoint} from '../src/legacy.ts';
import {startMission,buyProperty} from '../src/expansion.ts';
import {startOperation,operationObjective,operationInteract} from '../src/living-city.ts';
import {approach} from '../src/navigation.ts';
import {newFrameBudget,sampleFrame} from '../src/performance.ts';
const ready=()=>{const c=newCampaign();c.legacy.tutorial=3;c.clean=10000;return c;};
const operationContext=(c,extra={})=>({...approach(operationObjective(c)),driving:false,bike:false,recoveryCar:false,condition:100,guards:0,fired:false,searching:false,...extra});
test('companion incapacity and retreat recovery cannot be removed by reloading',()=>{
 const c=ready();hire(c,'muscle');callCompanion(c,'muscle',30,4);injureCompanion(c,100);
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(restored.kingpin.companion.injury,90);assert.equal(callCompanion(restored,'muscle',30,4),false);
 c.kingpin.companion.injury=45;assert.equal(restoreCampaign(JSON.parse(JSON.stringify(c))).kingpin.companion.injury,45);
});
test('completed UTC daily route cannot pay again by restarting on the same date',()=>{
 const c=ready(),date='2026-11-16';assert.ok(startDaily(c,date));for(const p of dailyRoute(date))dailyCheckpoint(c,...Object.values(approach(p)));assert.ok(c.legacy.daily.finished);const cash=c.clean;
 assert.equal(startDaily(c,date),false);assert.equal(c.clean,cash);assert.ok(startDaily(c,'2026-11-17'));
});
test('daily and side-mission starts enforce exclusivity in both directions',()=>{
 const c=ready();assert.ok(startWork(c,'medical'));assert.equal(startMission(c,'parade'),false);assert.equal(startDaily(c,'2026-11-16'),false);
 const d=ready();assert.ok(startMission(d,'parade'));assert.equal(startDaily(d,'2026-11-16'),false);assert.equal(startWork(d,'medical'),false);
 const e=ready();assert.ok(startDaily(e,'2026-11-16'));assert.equal(startMission(e,'parade'),false);
});
test('quiet delivery rejects noise/heat and expiry at the interaction boundary, not only next tick',()=>{
 for(const extra of [{fired:true},{},{remaining:0}]){
  const c=ready();c.living.completed=['recovery'];startOperation(c,'stealth');operationInteract(c,operationContext(c));
  if(extra.remaining===0)c.living.active.remaining=0;
  else if(!extra.fired)c.heat=30;
  const cash=c.clean;const result=operationInteract(c,operationContext(c,extra));assert.doesNotMatch(result??'',/complete!/);assert.equal(c.clean,cash);assert.ok(!c.living.completed.includes('stealth'));
 }
});
test('destroyed shipment cannot settle before the next economy tick',()=>{
 const c=ready();buyProperty(c,'dock');c.inventory[0]=2;startBusiness(c,'dock','shipment');c.kingpin.active.step=2;c.kingpin.active.cargo=0;const cash=c.clean;
 const p=approach(venturePoint(c));assert.doesNotMatch(ventureInteract(c,{...p,driving:false,guards:0,heat:0,noise:false,lockHeld:false}),/complete/);assert.equal(c.clean,cash);assert.equal(c.kingpin.businessWins,0);
});
test('starting a mission respects tutorial gates instead of relying only on disabled UI',()=>{
 const c=newCampaign();assert.equal(startDaily(c,'2026-11-16'),false);assert.equal(startMission(c,'parade'),false);
});
test('switching graphics after a pause starts a fresh frame sample window',()=>{
 const b=newFrameBudget();for(let i=0;i<49;i++)sampleFrame(b,.04,true);assert.ok(b.seconds>1);
 sampleFrame(b,.04,false);assert.equal(b.seconds,0);assert.equal(b.sample,0);
});

test('E exits a car at pickup, unmet passenger requirements, or away from a driving drop',async()=>{
 const {exitBeforeActivity}=await import('../src/interaction-policy.ts');const car={recovery:false,condition:100,passengerBoarded:false};
 const c=ready();c.living.completed=['recovery'];startOperation(c,'rescue');const pickup=approach(operationObjective(c));assert.ok(exitBeforeActivity(c,pickup.x,pickup.z,car));
 operationInteract(c,operationContext(c));const drop=approach(operationObjective(c));assert.ok(exitBeforeActivity(c,drop.x,drop.z,car));assert.equal(exitBeforeActivity(c,drop.x,drop.z,{...car,passengerBoarded:true}),false);assert.ok(exitBeforeActivity(c,235,230,{...car,passengerBoarded:true}));
 const d=ready();buyProperty(d,'dock');d.inventory[0]=2;startBusiness(d,'dock','shipment');d.kingpin.active.step=1;const dock=approach(venturePoint(d));assert.equal(exitBeforeActivity(d,dock.x,dock.z,car),false);assert.ok(exitBeforeActivity(d,235,230,car));
 const e=ready();startOperation(e,'recovery');const wagon=approach(operationObjective(e));assert.equal(exitBeforeActivity(e,wagon.x,wagon.z,{...car,recovery:true}),false);assert.ok(exitBeforeActivity(e,wagon.x,wagon.z,{...car,recovery:true,condition:10}));
});
test('vehicle disembarking tries alternate doors and refuses exits when all are blocked',async()=>{
 const {vehicleExit}=await import('../src/interaction-policy.ts');const car={x:0,z:0,h:0};assert.deepEqual(vehicleExit(car,(x)=>x<0),{x:-2.4,z:0});assert.equal(vehicleExit(car,()=>false),null);const exit=vehicleExit(car,(x,z)=>x>3&&z<0);assert.ok(exit.x>3&&exit.z<0);
});
test('ordinary rivals subdued nonlethally or defeated by a companion still unlock their district boss',async()=>{
 const {districtReadyForBoss}=await import('../src/combat-progress.ts'),actors=[{kind:'gangster',district:1,dead:0},{kind:'gangster',district:1,blockId:'venture',dead:0}];const bosses=new Set(),captured=new Set([0]);
 assert.equal(districtReadyForBoss(1,actors,bosses,captured),false);actors[0].dead=8;assert.ok(districtReadyForBoss(1,actors,bosses,captured));bosses.add(1);assert.equal(districtReadyForBoss(1,actors,bosses,captured),false);assert.equal(districtReadyForBoss(0,actors,bosses,captured),false);
});
test('joystick knob stays under the finger at both minimum and maximum UI scale',async()=>{
 const {joystickPointer}=await import('../src/joystick.ts');
 for(const scale of [.8,1,1.25]){const layout=112,width=layout*scale,offset=width*.16,result=joystickPointer(offset,0,width,layout);assert.ok(Math.abs(result.knobX*scale-offset)<1e-8);assert.ok(result.x>0&&result.x<1);}
});

test('impounded vehicles cannot consume tire-upgrade funds or parts',async()=>{
 const {buyVehicle}=await import('../src/expansion.ts'),{upgradeTires}=await import('../src/living-city.ts'),{impoundVehicle}=await import('../src/kingpin.ts');
 const c=ready();buyVehicle(c,'sedan');c.living.completed=['recovery'];c.expansion.parts=4;impoundVehicle(c,0);const cash=c.clean;
 assert.equal(upgradeTires(c,0),false);assert.equal(c.clean,cash);assert.equal(c.expansion.parts,4);
});
