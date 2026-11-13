import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,restoreCampaign} from '../src/campaign.ts';
import {INTERIORS,createInterior,indoorMove} from '../src/interiors.ts';
import {atSupply,inspectSupplies,useMedkit} from '../src/building-activities.ts';
import {surfaceTexture} from '../src/interior-decor.ts';

test('supplies require a real room and physical inspection, and never repeat after reload',()=>{
 const c=newCampaign();assert.equal(inspectSupplies(c,'hq',0,5.8),null);assert.equal(inspectSupplies(c,'invalid',0,1),null);
 assert.match(inspectSupplies(c,'hq',0,1),/medkit/);assert.equal(c.lifestyle.medkits,1);assert.equal(c.clean,300);
 assert.equal(inspectSupplies(c,'hq',0,1),null);
 const restored=restoreCampaign(JSON.parse(JSON.stringify(c)));assert.equal(inspectSupplies(restored,'hq',0,1),null);assert.equal(restored.lifestyle.medkits,1);
 assert.match(inspectSupplies(c,'garage',0,1),/garage part/);assert.equal(c.expansion.parts,1);
 assert.equal(atSupply(2,1),false);
});
test('medkits heal with a cap, consume once, and cannot be wasted at full health or revive dead players',()=>{
 const c=newCampaign();c.lifestyle.medkits=3;
 assert.equal(useMedkit(c,100),100);assert.equal(useMedkit(c,0),0);assert.equal(c.lifestyle.medkits,3);
 assert.equal(useMedkit(c,80),100);assert.equal(c.lifestyle.medkits,2);
 assert.equal(useMedkit(c,20),55);assert.equal(c.lifestyle.medkits,1);
 useMedkit(c,40);assert.equal(useMedkit(c,40),40);
});
test('full pouch does not consume a room claim; old and malformed saves migrate safely',()=>{
 const c=newCampaign();c.lifestyle.medkits=5;assert.match(inspectSupplies(c,'hq',0,1),/full/);assert.equal(c.lifestyle.inspected.length,0);
 useMedkit(c,50);assert.match(inspectSupplies(c,'hq',0,1),/medkit/);assert.equal(c.lifestyle.medkits,5);
 const old=restoreCampaign({clean:400});assert.equal(old.lifestyle.medkits,0);assert.deepEqual(old.lifestyle.inspected,[]);
 const bad=restoreCampaign({lifestyle:{medkits:200,inspected:['hq','hq',42,'<script>']}});assert.equal(bad.lifestyle.medkits,5);assert.deepEqual(bad.lifestyle.inspected,['hq']);
});
// Canvas texturing stays local. A minimal drawing context lets Node verify full room geometry.
function canvasDocument(){return {createElement(){return {width:0,height:0,getContext(){return new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)})}}}};}
test('every furnished room keeps supplies, desk and exit reachable and releases its material textures',()=>{
 globalThis.document=canvasDocument();
 try{
  for(const def of INTERIORS){
   const room=createInterior(def,newCampaign().avatar);let meshes=0,textured=0;room.scene.traverse(o=>{if(o.isMesh){meshes++;if(o.material.map)textured++;}});
   assert.ok(meshes>80,def.id+' has detailed furnishing');assert.ok(textured>=4,def.id+' has surface materials and signs');
   let p={x:0,z:5.8};for(let i=0;i<24;i++)p=indoorMove(p.x,p.z,0,-.2,room.obstacles);
   assert.ok(atSupply(p.x,p.z),def.id+' supply point');
   for(let i=0;i<25;i++)p=indoorMove(p.x,p.z,0,-.2,room.obstacles);
   assert.ok(p.z < -3.6,def.id+' desk');
   for(let i=0;i<52;i++)p=indoorMove(p.x,p.z,0,.2,room.obstacles);assert.ok(p.z>5,def.id+' exit');
   const floor=room.scene.children.find(o=>o.isMesh&&o.position.y===-.15);let disposed=false;floor.material.map.addEventListener('dispose',()=>disposed=true);room.dispose();assert.ok(disposed,def.id);
  }
 }finally{delete globalThis.document;}
});
test('all five local material styles create reusable repeating textures',()=>{globalThis.document=canvasDocument();try{for(const kind of ['wood','tile','brick','metal','marble']){const t=surfaceTexture(kind);assert.equal(t.image.width,128);assert.equal(t.repeat.x,4);t.dispose();}}finally{delete globalThis.document;}});

test('Karma is a new public dispensary with glass cases, branded rugs, collision and disposable textures',()=>{
 globalThis.document=canvasDocument();
 try{
  const def=INTERIORS.find(b=>b.id==='karma');assert.equal(def.name,'Karma');assert.equal(def.theme,'dispensary');
  assert.ok(INTERIORS.some(b=>b.id==='herbalist'),'existing herbalist is preserved');
  const room=createInterior(def,newCampaign().avatar);const textures=new Set();let glass=0,ceilingPanels=0;
  room.scene.traverse(o=>{if(o.isMesh){if(o.material.transparent&&o.material.opacity===.14)glass++;if(o.material.emissiveIntensity===1.4)ceilingPanels++;if(o.material.map)textures.add(o.material.map);}});
  assert.equal(glass,2);assert.equal(ceilingPanels,3);assert.ok(textures.size>=8);
  assert.deepEqual(indoorMove(3,0,.5,0,room.obstacles),{x:3,z:0},'glass counter blocks walking through it');
  const disposed=new Set();for(const texture of textures)texture.addEventListener('dispose',()=>disposed.add(texture));
  room.dispose();assert.equal(disposed.size,textures.size);
  const c=newCampaign();assert.match(inspectSupplies(c,'karma',0,1),/medkit/);assert.equal(inspectSupplies(c,'karma',0,1),null);
 }finally{delete globalThis.document;}
});
