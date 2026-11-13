import {approach} from '../src/navigation.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, addHeat, captureBlock, revenuePerMinute, hire, tickCampaign, offlineProgress, restoreCampaign } from '../src/campaign.ts';
import { conditions, buyProperty, buyVehicle, upgradeVehicle, startRun, tickExpansion, propertyRevenue, frontLaunder, inventoryCap, cashCap, recon, assemble, execute, plan, startMission, missionInteract, MISSIONS, pokerRank, upgradeDistrict } from '../src/expansion.ts';

test('weather and night directly alter police visibility, heat and reward conditions', () => {
  assert.equal(conditions(0).weather,'Clear'); assert.equal(conditions(150).weather,'Rainstorm');
  assert.equal(conditions(300).weather,'Fog'); assert.equal(conditions(450).stamina,1.4);
  assert.equal(conditions(150).visibility,.6); assert.equal(conditions(300).visibility,.45);
  const c=newCampaign();addHeat(c,10);assert.equal(c.heat,10);c.heat=0;c.clock=151;addHeat(c,10);assert.equal(c.heat,6.5);
  assert.equal(conditions(80).night,true); assert.equal(conditions(700).night,false);
});
test('zero properties/turf gives zero standing income even in expansion loop',()=>{
  const c=newCampaign();for(let i=0;i<300;i++){tickCampaign(c,1,()=>0);tickExpansion(c,1,()=>0);}
  assert.equal(c.clean,300);assert.equal(c.dirty,0);assert.equal(propertyRevenue(c),0);
});
test('property ownership costs funds and rackets require loyal paid crew',()=>{
  const c=newCampaign();c.clean=20000;assert.ok(buyProperty(c,'dice'));assert.equal(buyProperty(c,'dice'),false);
  assert.equal(propertyRevenue(c),0);hire(c,'muscle');assert.equal(propertyRevenue(c),260);
  tickExpansion(c,60,()=>0);assert.equal(c.dirty,260);c.crew[0].owed=1;assert.equal(propertyRevenue(c),0);
  buyProperty(c,'dock');assert.equal(inventoryCap(c),60);
});
test('district upgrades are bounded, paid and only available on controlled turf',()=>{
  const c=newCampaign();c.clean=5000;assert.equal(upgradeDistrict(c,1,false),false);captureBlock(c,'skidrow');
  upgradeDistrict(c,1,true);assert.equal(c.expansion.levels[1],1);assert.equal(revenuePerMinute(c),225);
  upgradeDistrict(c,1,true);upgradeDistrict(c,1,true);assert.equal(upgradeDistrict(c,1,true),false);
});
test('front laundering capacity and hacker discount cannot be bypassed by repeated clicks',()=>{
  const c=newCampaign();c.clean=10000;c.dirty=10000;buyProperty(c,'laundromat');
  assert.equal(frontLaunder(c,'laundromat'),480);assert.equal(frontLaunder(c,'laundromat'),0);assert.equal(c.stats.cleaned,480);
  tickExpansion(c,60,()=>0);hire(c,'hacker');assert.equal(frontLaunder(c,'laundromat'),498);
  assert.equal(frontLaunder(c,'unowned'),0);assert.equal(c.expansion.frontsUsed.laundromat,600);
});
test('garage runs consume cargo, exclude duplicate dispatch and settle only once',()=>{
  const c=newCampaign();c.clean=5000;c.inventory[0]=10;assert.ok(buyVehicle(c,'sedan'));c.expansion.parts=5;
  assert.ok(upgradeVehicle(c,0,false));assert.equal(c.expansion.parts,3);assert.ok(startRun(c,0));assert.equal(c.inventory[0],8);
  assert.equal(startRun(c,0),false);assert.equal(upgradeVehicle(c,0,true),false);
  tickExpansion(c,70,()=>.99);assert.equal(c.expansion.runs.length,0);const paid=c.dirty;assert.ok(paid>=700);
  tickExpansion(c,70,()=>.99);assert.equal(c.dirty,paid);
  startRun(c,0);tickExpansion(c,70,()=>0);assert.equal(c.dirty,paid);assert.ok(c.heat>6);
});
test('major heists enforce recon location, crew assembly, execution and cooldown with legendary reward',()=>{
  const c=newCampaign();c.clean=20000;assert.equal(recon(c,'bank',50,50),false);assert.equal(assemble(c,'bank'),false);
  assert.ok(recon(c,'bank',...Object.values(approach({x:0,z:-120}))));assert.equal(assemble(c,'bank'),false);hire(c,'hacker');hire(c,'muscle');
  const funds=c.clean;assert.ok(assemble(c,'bank'));assert.equal(c.clean,funds-300);assert.equal(assemble(c,'bank'),false);
  execute(c,'bank',true,()=>0);execute(c,'bank',true,()=>0);assert.equal(c.dirty,0);
  assert.match(execute(c,'bank',true,()=>0),/HEIST COMPLETE/);assert.equal(c.dirty,7500);assert.ok(c.expansion.gear.includes('Crescent Precision Barrel'));
  assert.equal(recon(c,'bank',...Object.values(approach({x:0,z:-120}))),false);assert.equal(plan(c,'bank').cooldown,600);
});
test('rivals expand and trigger a showdown on lightly defended player corners',()=>{
  const c=newCampaign();captureBlock(c,'frenchmen');c.expansion.influence[0]=60;
  tickExpansion(c,120,()=>0);assert.equal(c.defense.block,'frenchmen');assert.equal(c.defense.remaining,90);
  const before=c.expansion.influence[0];c.expansion.levels[0]=3;c.defense=null;tickExpansion(c,120,()=>0);
  assert.equal(c.expansion.influence[0]-before,3);
});
test('Mardi Gras has spatial objectives and a required escorted float finale; rewards claimed once',()=>{
  const c=newCampaign();assert.ok(startMission(c,'parade'));assert.equal(startMission(c,'courier'),false);
  assert.equal(missionInteract(c,200,200),null);
  for(const step of MISSIONS[0].steps.slice(0,4))assert.match(missionInteract(c,...Object.values(approach(step))),/advanced/);
  assert.match(missionInteract(c,...Object.values(approach({x:0,z:102}))),/Stay within/);assert.equal(c.dirty,0);
  c.expansion.mission.escort=40;assert.match(missionInteract(c,...Object.values(approach({x:0,z:102}))),/COMPLETE/);
  assert.equal(c.expansion.mission,null);assert.ok(c.expansion.gear.includes('Krewe Captain Medallion'));const funds=c.dirty;
  assert.equal(missionInteract(c,...Object.values(approach({x:0,z:102}))),null);assert.equal(c.dirty,funds);
});
test('night courier pays more and mechanical side mission grants garage resources',()=>{
  const c=newCampaign();c.clock=100;startMission(c,'courier');for(const s of MISSIONS[1].steps)missionInteract(c,...Object.values(approach(s)));
  assert.equal(c.dirty,1170);startMission(c,'mechanic');for(const s of MISSIONS[3].steps)missionInteract(c,...Object.values(approach(s)));assert.equal(c.expansion.parts,6);
});
test('offline property revenue is reduced, capped and paired with upkeep; empty saves migrate safely',()=>{
  const c=newCampaign();c.clean=50000;buyProperty(c,'port');const report=offlineProgress(c,172800);
  assert.equal(report.seconds,86400);assert.equal(c.dirty,cashCap(c));assert.ok(report.income>0);
  const old=restoreCampaign({clean:300,inventory:[1,2,3]});assert.equal(old.expansion.cars.length,0);assert.deepEqual(old.inventory,[1,2,3,0]);
  c.expansion.furniture=[{id:'camera',slot:0}];c.expansion.cars=[{id:'sedan',engine:2,armor:1,color:100}];c.expansion.parts=10;
  const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.deepEqual(restored.expansion,c.expansion);
});
test('poker pays correct ranks without gambling outcome being disguised as income',()=>{
  assert.equal(pokerRank([1,2,3,4,5]),1000); // straight flush
  assert.equal(pokerRank([1,14,27,40,5]),400); // quads
  assert.equal(pokerRank([1,14,27,2,15]),200); // full house
  assert.equal(pokerRank([1,14,5,20,35]),25); // one pair
  assert.equal(pokerRank([0,15,31,46,10]),0);
});
