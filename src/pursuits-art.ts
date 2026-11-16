import * as THREE from 'three';
import {OUTFITS} from './pursuits.ts';
export function applyWardrobe(root:THREE.Group,id:string){const outfit=OUTFITS.find(o=>o.id===id);if(!outfit)return ()=>{};const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial({color:outfit.accent,roughness:.65}),pieces:THREE.Mesh[]=[];
 for(const side of [-1,1]){const mesh=new THREE.Mesh(geometry,material);mesh.scale.set(outfit.id==='dock'?.035:.06,.35,.025);mesh.position.set(side*.14,1.18,.19);root.add(mesh);pieces.push(mesh);}return ()=>{pieces.forEach(p=>p.removeFromParent());geometry.dispose();material.dispose();};}
export function applyLivery(root:THREE.Group,id:string,style:number){if(!['rally','checker','sunset'].includes(id))return ()=>{};const geometry=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial({color:id==='sunset'?0xffb567:0xf8e6bc,roughness:.45}),dark=new THREE.MeshStandardMaterial({color:0x1f303c,roughness:.5}),pieces:THREE.Mesh[]=[];
 const add=(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material)=>{const mesh=new THREE.Mesh(geometry,m);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);root.add(mesh);pieces.push(mesh);};
 const width=[4,8,9].includes(style)?1.22:[5,12].includes(style)?1.12:1.02,y=[4,5,8,9,12].includes(style)?1.08:.82;
 if(style===6){add(0,1.23,.2,.4,.02,.45,mat);}else for(const side of [-1,1]){if(id==='checker')for(let i=0;i<8;i++)add(side*width,y,-1.2+i*.3,.025,.18,.28,i%2?mat:dark);else {add(side*width,y,0,.025,.16,2.8,mat);if(id==='sunset')add(side*width,y-.19,0,.025,.08,2.4,dark);}}
 return ()=>{pieces.forEach(p=>p.removeFromParent());geometry.dispose();mat.dispose();dark.dispose();};
}
export type RoomBox=(x:number,y:number,z:number,w:number,h:number,d:number,color:number,solid?:boolean)=>THREE.Mesh;
export function dressAnnex(id:string,scene:THREE.Scene,box:RoomBox,decor=0){
 if(id.startsWith('roof-')){scene.background=new THREE.Color(0x536e8d);for(const x of [-6.5,6.5]){box(x,.5,0,.25,1,15,0x9d8f78,true);for(const z of [-5,-1,3]){box(x*.72,.5,z,1,.9,1,0x5a735d);box(x*.72,1.25,z,.8,.6,.8,0x34724e);}}box(0,0,-7.3,13,.15,.4,0x8c9888);for(let i=0;i<9;i++)box(-12+i*3,3+i%3,-22,2,6+i%3*2,3,0x324b63);}
 if(id==='levee-pavilion'){scene.background=new THREE.Color(0x5e819a);box(0,-.12,-14,50,.08,15,0x305c72);for(const side of [-1,1])for(let z=-4;z<=4;z+=4)box(side*5,.45,z,1.4,.9,2,0x8c7555,true);}
 if(id==='rail-exchange'){for(const x of [-5,5])for(let z=-4;z<=4;z+=2){box(x,1,z,1.2,2,1.1,0x7b624a,true);box(x,2.1,z,1,.15,1,0xb8a16c);}}
 if(['home-quarter','home-uptown','home-bywater'].includes(id)){const colors=[0x477d7d,0x9a615d,0x675b88];box(0,.025,1,3.4,.03,4,colors[decor%3]!);box(5,.3,4,2,.6,1.6,0xd4c4a1,true);box(5,.7,4.6,2,.4,.2,0x80624f);box(-5,1.5,-4,.08,1.4,2,0xd3b770);}
}
