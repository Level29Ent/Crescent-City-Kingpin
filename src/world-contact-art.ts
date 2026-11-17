import * as THREE from 'three';
import type {Campaign} from './campaign.ts';
import {createPerson} from './actors.ts';
import {worldActivities,canStartContact} from './world-activities.ts';
/** Non-combat street contacts: one visible host per address, with an exact interaction ring. */
export function addWorldContactArt(scene:THREE.Scene,c:Campaign){
 const groups=new Map<string,ReturnType<typeof worldActivities>>();
 for(const a of worldActivities(c).filter(a=>!a.room)){const key=`${a.x},${a.z}`;const list=groups.get(key)??[];list.push(a);groups.set(key,list);}
 const ringGeometry=new THREE.RingGeometry(.9,1.15,32),ringMaterial=new THREE.MeshBasicMaterial({color:0xffcf70,side:THREE.DoubleSide,transparent:true,opacity:.8});
 const hosts=[...groups.values()].map(offers=>{
  const first=offers[0]!,root=new THREE.Group();root.position.set(first.x,0,first.z);scene.add(root);
  const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.08;root.add(ring);
  const person=createPerson('civilian',2);root.add(person.root);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#102332e8';ctx.fillRect(0,0,512,128);ctx.textAlign='center';ctx.fillStyle='#ffdb8c';ctx.font='bold 28px sans-serif';ctx.fillText(first.speaker,256,46,490);ctx.fillStyle='#e8f6eb';ctx.font='24px sans-serif';ctx.fillText('TALK · E / INTERACT',256,94,490);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,depthTest:true}),sign=new THREE.Sprite(material);sign.position.set(0,3.1,0);sign.scale.set(4,1,1);root.add(sign);
  return {root,offers,person,texture,material};
 });
 let refresh=-1;
 return {update(clock:number){if(clock<refresh)return;refresh=clock+1;for(const host of hosts){host.root.visible=host.offers.some(a=>canStartContact(c,a));}},dispose(){for(const h of hosts){h.root.removeFromParent();h.person.dispose();h.texture.dispose();h.material.dispose();}ringGeometry.dispose();ringMaterial.dispose();}};
}
