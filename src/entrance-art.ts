import * as THREE from 'three';
import {INTERIORS} from './interiors.ts';
import {facadeDoor} from './doorways.ts';
/** Visible, named portals mounted on the same facades used by navigation/interaction. */
export function addEntranceArt(scene:THREE.Scene){
 const frame=new THREE.MeshStandardMaterial({color:0xc9bb91,roughness:.7});
 const door=new THREE.MeshStandardMaterial({color:0x143c43,emissive:0x123d3d,emissiveIntensity:.5});
 const brass=new THREE.MeshStandardMaterial({color:0xe7c879,metalness:.5,roughness:.4});
 const glow=new THREE.MeshBasicMaterial({color:0x82e6d1});
 const box=new THREE.BoxGeometry(1,1,1);
 const ring=new THREE.RingGeometry(.5,.7,24);
 for(const entry of INTERIORS){
  const p=facadeDoor(entry),root=new THREE.Group();root.position.set(p.wallX,0,p.wallZ);root.rotation.y=Math.atan2(p.nx,p.nz);scene.add(root);
  const panel=(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material)=>{const mesh=new THREE.Mesh(box,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);root.add(mesh);};
  panel(0,1.5,.12,2.5,3,.18,frame);panel(0,1.43,.24,2.08,2.85,.08,door);
  panel(0,1.9,.3,1.55,1.1,.04,glow);panel(.73,1,.35,.1,.35,.12,brass);
  panel(0,3.15,.6,3.5,.16,1.2,frame);panel(0,.04,1.15,2.7,.06,2,frame);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#10292c';ctx.fillRect(0,0,1024,160);ctx.strokeStyle='#82e6d1';ctx.lineWidth=6;ctx.strokeRect(4,4,1016,152);
  ctx.fillStyle='#f8e9b4';ctx.textAlign='center';ctx.font='bold 42px sans-serif';ctx.fillText(entry.name,512,66,985);
  ctx.fillStyle='#82e6d1';ctx.font='bold 30px sans-serif';ctx.fillText('ENTER · E / INTERACT',512,123);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.5,.86),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));sign.position.set(0,3.85,.26);root.add(sign);
  const marker=new THREE.Mesh(ring,glow);marker.rotation.x=-Math.PI/2;marker.position.set(0,.085,2);root.add(marker);
 }
}
