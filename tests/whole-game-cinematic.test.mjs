import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {finishMaterial, fabricWeave, particleSprite, interiorLighting} from '../src/material-finish.ts';
import {initialQuality} from '../src/performance.ts';
import {createPerson, createCar} from '../src/actors.ts';
import {createImpacts} from '../src/effects.ts';
import {createInterior, INTERIORS} from '../src/interiors.ts';
import {newCampaign} from '../src/campaign.ts';

test('new sessions stay adaptive and valid saved preferences always win',()=>{
 assert.equal(initialQuality(null),'auto');
 for(const saved of ['auto','performance','balanced','cinematic'])assert.equal(initialQuality(saved),saved);
 assert.equal(initialQuality('unknown'),'auto');assert.equal(initialQuality(''),'auto');
});
test('skin, cloth, leather, metal and clearcoat paint have isolated physical responses',()=>{
 const weave=fabricWeave();const mats=['skin','fabric','leather','metal','paint'].map(k=>finishMaterial(0x336699,k,weave));
 assert.equal(new Set(mats).size,5);assert.equal(mats[1].bumpMap,weave);assert.equal(mats[0].bumpMap,null);
 assert.ok(mats[1].roughness>mats[0].roughness);assert.equal(mats[3].metalness,.85);
 assert.ok(mats[4].isMeshPhysicalMaterial);assert.equal(mats[4].clearcoat,.8);
 mats[4].color.setHex(0xffffff);assert.equal(mats[0].color.getHex(),0x336699);
 mats.forEach(m=>m.dispose());weave.dispose();
});
test('all actor kinds use fabric and skin finishes and cast/receive light shadows',()=>{
 for(const kind of ['player','civilian','gangster','cop','boss']){
  const person=createPerson(kind,5);const names=new Set();let bevel=0,shadow=0;
  person.root.traverse(o=>{if(o.isMesh){names.add(o.material.name);if(o.geometry.type==='RoundedBoxGeometry')bevel++;if(o.castShadow&&o.receiveShadow)shadow++;}});
  assert.ok(names.has('finish:fabric'),kind);assert.ok(names.has('finish:skin'),kind);assert.ok(bevel>=5,kind);assert.ok(shadow>=4,kind);
  person.pose('walk',2,1,0,.016);person.dispose();
 }
 for(const style of [0,2,3,6,8,9,13]){
  const car=createCar(style,0x336699);let paint=0;car.root.traverse(o=>{if(o.isMesh&&o.material.name==='finish:paint')paint++;});assert.ok(paint>0,`style ${style}`);let glassShadow=0;car.root.traverse(o=>{if(o.isMesh&&o.material.transparent&&o.castShadow)glassShadow++;});assert.equal(glassShadow,0);car.dispose();
 }
});
test('radial particles have transparent corners and opaque cores; fixed pool disposes cleanly',()=>{
 const t=particleSprite(),a=t.image.data;assert.equal(a[3],0);assert.ok(a[(32*64+32)*4+3]>250);t.dispose();
 const scene=new THREE.Scene(),fx=createImpacts(scene,true),points=scene.children[0];assert.equal(points.geometry.attributes.position.count,128);assert.ok(points.material.map);
 for(let i=0;i<100;i++)fx.burst(1,2,3);fx.update(.1);assert.equal(points.geometry.attributes.position.count,128);
 let disposed=0;points.material.map.addEventListener('dispose',()=>disposed++);fx.dispose();assert.equal(disposed,1);assert.equal(scene.children.length,0);
});
test('room light rig bounds its shadow camera and releases shadow resources',()=>{
 const scene=new THREE.Scene(),release=interiorLighting(scene,0xffc879),key=scene.getObjectByName('interior-window-key');
 assert.ok(key.castShadow);assert.equal(key.shadow.mapSize.x,1024);assert.ok(key.shadow.camera.far<40);
 key.shadow.map=new THREE.WebGLRenderTarget(1,1);let disposed=0;key.shadow.map.addEventListener('dispose',()=>disposed++);release();assert.equal(disposed,1);assert.equal(scene.children.length,0);
});
test('every interior receives the same bounded lighting and surface-depth treatment',()=>{
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})})};
 try{for(const def of INTERIORS){
  const room=createInterior(def,newCampaign().avatar),floor=room.scene.children.find(o=>o.isMesh&&o.position.y===-.15);
  assert.ok(room.scene.getObjectByName('interior-window-key'),def.id);assert.ok(floor.material.bumpMap,def.id);assert.ok(floor.material.roughness<.8,def.id);room.dispose();
 }}finally{delete globalThis.document;}
});
