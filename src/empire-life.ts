import {businessClosed} from './city-memory.ts';
import * as THREE from 'three';
import type {Campaign} from './campaign.ts';
import {BLOCKS} from './campaign.ts';
import {owns,PROPERTIES} from './expansion.ts';
import {createPerson} from './actors.ts';
import {INTERIORS} from './interiors.ts';
import {facadeDoor} from './doorways.ts';
import {cityClear} from './city-navigation.ts';
export function empireColors(owned:boolean,contested:boolean){return contested?0xd96b50:owned?0x57d4af:0xa666bb;}
/** Capped locals, storefront customers and crew sentries; no extra income or invisible combat bonuses. */
export function addEmpireLife(scene:THREE.Scene){
 const root=new THREE.Group();scene.add(root);const geo=new THREE.BoxGeometry(1,1,1),resources:THREE.Material[]=[];
 const corners=BLOCKS.map((block,i)=>{
  const door=facadeDoor(block),group=new THREE.Group();group.position.set(door.wallX,0,door.wallZ);group.rotation.y=Math.atan2(door.nx,door.nz);root.add(group);
  const material=new THREE.MeshStandardMaterial({color:0xa666bb,roughness:.8});resources.push(material);
  const banner=new THREE.Mesh(geo,material);banner.position.set(0,4.9,.4);banner.scale.set(2.7,.65,.12);group.add(banner);
  const sentry=createPerson('civilian',i+4);root.add(sentry.root);sentry.root.position.set(door.x,0,door.z);return {block,material,sentry,x:door.x,z:door.z};
 });
 const customers=['jazz','cafe','barber','record','seafood','corner-store','liquor','jeweler'].map((id,i)=>{
  const b=INTERIORS.find(b=>b.id===id)!,door=facadeDoor(b),person=createPerson('civilian',i+12);root.add(person.root);return {id,person,door};
 });
 return {update(dt:number,time:number,c:Campaign,px:number,pz:number,range:number){
  for(const row of corners){const controlled=c.owned.includes(row.block.id),contested=c.defense?.block===row.block.id;row.material.color.setHex(empireColors(controlled,contested));row.sentry.root.visible=controlled&&Math.hypot(px-row.x,pz-row.z)<range;row.sentry.pose('idle',0,time,0,dt);}
  customers.forEach((row,i)=>{
   const property=PROPERTIES.find(p=>p.id===row.id),open=!property||!c.expansion.properties.includes(property.id)||owns(c,property.id);
   const offset=Math.sin(time*.25+i)*1.1,x=row.door.x+row.door.nz*offset,z=row.door.z-row.door.nx*offset;
   if(cityClear(x,z,.5))row.person.root.position.set(x,0,z);
   row.person.root.rotation.y=Math.atan2(-row.door.nx,-row.door.nz);row.person.root.visible=open&&!businessClosed(c,row.id)&&Math.hypot(px-x,pz-z)<range;const pace=Math.abs(Math.cos(time*.25+i))*.275;row.person.pose(pace>.1?'walk':'idle',pace,time+i,0,dt);
  });
 },dispose(){corners.forEach(r=>r.sentry.dispose());customers.forEach(r=>r.person.dispose());root.removeFromParent();geo.dispose();resources.forEach(m=>m.dispose());}};
}
