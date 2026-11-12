import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCar, createPerson } from '../src/actors.ts';
import { createMoneyBundle, createMoneyStack } from '../src/money.ts';
import { VEHICLES, buyVehicle, startRun, tickExpansion } from '../src/expansion.ts';
import { newCampaign, restoreCampaign } from '../src/campaign.ts';

test('ten vehicle classes have valid prices, separate styles and transport capacities',()=>{
  assert.equal(VEHICLES.length,10);assert.equal(new Set(VEHICLES.map(v=>v.id)).size,10);
  assert.equal(new Set(VEHICLES.map(v=>v.style)).size,10);
  for(const model of VEHICLES){assert.ok(model.price>0);assert.ok(model.capacity>0&&model.capacity<=20);assert.ok(model.speed>0);assert.ok(model.armor>=0&&model.armor<1);}
});
test('new vehicle silhouettes and wheel motion are valid, motorcycle stays narrow',()=>{
  const dimensions=new Map();
  for(const model of VEHICLES){
    const car=createCar(model.style,0x336b59);
    car.motion(0,0,false,0);car.motion(15,.6,true,.1);
    const size=new THREE.Box3().setFromObject(car.root).getSize(new THREE.Vector3());
    assert.ok(size.x>0&&size.y>0&&size.z>0);
    car.root.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));assert.ok(o.rotation.toArray().slice(0,3).every(Number.isFinite));});
    dimensions.set(model.id,size);car.dispose();assert.equal(car.root.parent,null);
  }
  assert.ok(dimensions.get('bike').x<dimensions.get('van').x);
  assert.ok(dimensions.get('boxtruck').z>dimensions.get('sedan').z);
  assert.ok(dimensions.get('minibus').z>dimensions.get('sedan').z);
});
test('new vehicles buy/store, carry their own cargo count, settle runs once and survive saves',()=>{
  for(const id of ['bike','muscle','suv','taxi','boxtruck','minibus']){
    const c=newCampaign();c.clean=100000;c.inventory[0]=20;
    const model=VEHICLES.find(v=>v.id===id);
    assert.ok(buyVehicle(c,id));assert.equal(c.clean,100000-model.price);
    assert.ok(startRun(c,0));assert.equal(c.inventory[0],20-model.capacity);assert.equal(startRun(c,0),false);
    const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));
    assert.equal(restored.expansion.cars[0].id,id);
    tickExpansion(restored,120,()=>.99);const income=restored.dirty;assert.ok(income>0);
    tickExpansion(restored,120,()=>.99);assert.equal(restored.dirty,income);
  }
});
test('legacy garage saves retain all four original vehicle types',()=>{
  const c=newCampaign();c.clean=50000;
  for(const id of ['sedan','coupe','truck','van'])buyVehicle(c,id);
  assert.deepEqual(restoreCampaign(JSON.parse(JSON.stringify(c))).expansion.cars,c.expansion.cars);
});
test('cash stash is four layered banknotes and viewing props cannot change game balances',()=>{
  const c=newCampaign();const before=JSON.stringify(c);
  const stash=createMoneyBundle();assert.equal(stash.children.length,4);
  assert.ok(stash.children.every(g=>g.children.length===2));
  const size=new THREE.Box3().setFromObject(stash).getSize(new THREE.Vector3());assert.ok(size.x>size.z&&size.z>size.y);
  const stack=createMoneyStack();assert.equal(stack.children.length,3);assert.ok(stack.children.every(g=>g.children.length===10));
  assert.equal(JSON.stringify(c),before);
});
test('rider pose hides the weapon and normal pose restores it',()=>{
  const person=createPerson('player',5);person.pose('ride',0,1,0,.1);
  assert.equal(person.root.getObjectByName('weapon-0').visible,false);
  assert.equal(person.root.getObjectByName('weapon-1').visible,false);
  person.pose('walk',5,2,1,.1);assert.equal(person.root.getObjectByName('weapon-1').visible,true);person.dispose();assert.equal(person.root.parent,null);
});
