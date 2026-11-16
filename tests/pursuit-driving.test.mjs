import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newPursuit,tickPursuit,pursuitLabel} from '../src/pursuit.ts';
import {driveStep,handlingProfile,impactVehicle} from '../src/driving.ts';
import {createCar} from '../src/actors.ts';
import {VEHICLES} from '../src/expansion.ts';
import {createStreetLife} from '../src/street-life.ts';
import * as THREE from 'three';
test('police require visible detection then search last known position, not hidden player coordinates',()=>{
 const p=newPursuit();assert.equal(tickPursuit(p,1,60,true,10,20),false);assert.equal(p.phase,'detection');
 tickPursuit(p,.5,60,true,12,24);assert.equal(p.phase,'pursuit');assert.match(pursuitLabel(p,60),/PURSUIT/);
 tickPursuit(p,3,60,false,200,200);assert.equal(p.phase,'search');assert.equal(p.lastX,12);assert.equal(p.lastZ,24);assert.match(pursuitLabel(p,60),/SEARCH/);
 tickPursuit(p,1,60,true,25,30);assert.equal(p.phase,'pursuit');assert.equal(p.lastX,25);assert.equal(p.lost,0);
 assert.equal(tickPursuit(p,26,60,false,-200,-200),true);assert.equal(p.phase,'escaped');assert.equal(p.lastX,25);
 tickPursuit(p,6,0,false,0,0);assert.equal(p.phase,'clear');
});
test('undetected heat can clear while hiding; low heat resets detection without phantom escapes',()=>{
 const p=newPursuit();tickPursuit(p,1,40,true,1,2);tickPursuit(p,1,40,false,200,200);assert.ok(p.exposure<1);
 assert.equal(tickPursuit(p,24,40,false,200,200),true);
 const q=newPursuit();tickPursuit(q,2,100,true,4,5);assert.equal(tickPursuit(q,.1,0,false,0,0),false);assert.deepEqual(q,newPursuit());
});
const car=()=>({speed:0,steer:0,h:0,gripHeading:0,condition:100,impactCooldown:0});
function simulate(style,extra={}){const c={...car(),...extra};for(let i=0;i<120;i++)driveStep(c,style,1/60,1,0,false,false,false,1);return c;}
test('vehicle classes accelerate differently and condition reduces performance',()=>{
 assert.ok(simulate(2).speed>simulate(8).speed);assert.ok(simulate(0,{condition:10}).speed<simulate(0).speed);
 for(const model of VEHICLES){const c=simulate(model.style);assert.ok(Number.isFinite(c.speed)&&c.speed>0);assert.ok(c.speed<=handlingProfile(model.style).max);}
});
test('service brakes and tire upgrades stop faster; handbrake creates heading slip with finite motion',()=>{
 const plain={...car(),speed:25},tuned={...plain},hand={...plain},normal={...plain};
 for(let i=0;i<15;i++){driveStep(plain,0,1/60,0,0,true,false,false,1);driveStep(tuned,0,1/60,0,0,true,false,false,1,3);driveStep(hand,2,1/60,0,1,false,true,false,1);driveStep(normal,2,1/60,0,1,false,false,false,1);}
 assert.ok(tuned.speed<plain.speed);assert.ok(Math.abs(hand.h-hand.gripHeading)>Math.abs(normal.h-normal.gripHeading));assert.ok(Math.abs(hand.h)>Math.abs(normal.h));
 const c=car();for(let i=0;i<600;i++){const step=driveStep(c,6,1/60,-1,-1,true,true,false,1);assert.ok(Object.values(step).every(v=>typeof v==='boolean'||Number.isFinite(v)));}assert.ok(c.speed>=-9);
});
test('collision condition is bounded, armor helps, cooldown prevents repeated wall damage, every model can render damage',()=>{
 const a=car(),b=car();assert.ok(impactVehicle(a,30)>impactVehicle(b,30,.6));const hp=a.condition;assert.equal(impactVehicle(a,30),0);assert.equal(a.condition,hp);a.impactCooldown=0;impactVehicle(a,10000);assert.equal(a.condition,0);
 for(const model of VEHICLES){const rig=createCar(model.style,0x406060);let count=0;rig.root.traverse(o=>{if(o.isMesh)count++;});rig.damage(0);rig.motion(10,.5,true,.1);rig.damage(100);let after=0;rig.root.traverse(o=>{if(o.isMesh)after++;});assert.equal(after,count);rig.dispose();assert.equal(rig.root.parent,null);}
});
test('street police target last known location during search even if hidden player moves',()=>{
 const aScene=new THREE.Scene(),bScene=new THREE.Scene(),a=createStreetLife(aScene),b=createStreetLife(bScene);
 const p={...newPursuit(),phase:'search',lastX:120,lastZ:60};
 for(let i=0;i<100;i++){a.update(.05,i*.05,-200,-200,60,true,()=>{},undefined,p);b.update(.05,i*.05,200,200,60,true,()=>{},undefined,p);}
 assert.deepEqual(a.observers(),b.observers());a.dispose();b.dispose();assert.equal(aScene.children.length,0);assert.equal(bScene.children.length,0);
});

test('enemy cover movement routes around the near end before moving behind sandbags',async()=>{
 const {coverWaypoint}=await import('../src/gunplay.ts');
 assert.deepEqual(coverWaypoint(0,3,{x:0,z:0},5),{x:2.3,z:3});
 assert.deepEqual(coverWaypoint(3,3,{x:0,z:0},5),{x:0,z:-1.3});
 assert.deepEqual(coverWaypoint(0,-3,{x:0,z:0},5),{x:0,z:-1.3});
});

test('vehicle damage and brake feedback change existing private materials, not shared fleet paint',()=>{
 const a=createCar(0,0x506070),b=createCar(0,0x506070);
 const dent=a.root.getObjectByName('vehicle-damage'),tail=a.root.getObjectByName('vehicle-tail-light');
 a.damage(0);assert.ok(dent.material.opacity>.8);assert.equal(b.root.getObjectByName('vehicle-damage').material.opacity,0);
 a.motion(0,0,true,0);assert.equal(tail.material.emissiveIntensity,2.2);a.damage(100);assert.equal(dent.material.opacity,0);
 a.dispose();b.dispose();
});
