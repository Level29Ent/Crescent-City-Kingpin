import * as THREE from 'three';
import {NEIGHBORHOODS} from './polish.ts';
import {approach} from './navigation.ts';
/** Five authored landmarks at reachable existing addresses; no new collision obstacles. */
export function addNeighborhoodArt(scene:THREE.Scene){
 const root=new THREE.Group(),textures:THREE.Texture[]=[],materials:THREE.Material[]=[],geometry=new THREE.BoxGeometry(1,1,1);scene.add(root);
 for(const [i,n]of NEIGHBORHOODS.entries()){
  const location=approach(n),group=new THREE.Group();group.position.set(location.x,0,location.z);root.add(group);
  const mat=new THREE.MeshStandardMaterial({color:n.color,roughness:.7,emissive:n.color,emissiveIntensity:.15});materials.push(mat);
  const post=new THREE.Mesh(geometry,mat);post.scale.set(.15,4.5,.15);post.position.set(-1.8,2.25,0);group.add(post);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#10232d';ctx.fillRect(0,0,768,256);ctx.strokeStyle='#f4d494';ctx.lineWidth=8;ctx.strokeRect(6,6,756,244);ctx.fillStyle='#fff0cf';ctx.textAlign='center';ctx.font='bold 44px sans-serif';ctx.fillText(n.name.toUpperCase(),384,70,740);ctx.font='24px sans-serif';ctx.fillText(n.tag,384,120,730);ctx.fillText(['BRASS WALK','HERITAGE TRAIL','MAGNOLIA WAY','RIVER FREIGHT','CYPRESS LANDING'][i]!,384,190,730);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const signMat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});materials.push(signMat);const plane=new THREE.PlaneGeometry(5,1.67);const sign=new THREE.Mesh(plane,signMat);sign.position.set(0,3.8,0);group.add(sign);sign.userData.dispose=()=>plane.dispose();
  // Distinct crest silhouettes: brass pipes, rhythm bars, garden arch, cargo gantry, cypress fins.
  for(let j=0;j<3+i%3;j++){const crest=new THREE.Mesh(geometry,mat);crest.position.set(-1+j*.6,5+(j%2)*.25,0);crest.scale.set(i===2?.6:.16,i===3?.2:.5+(j%2)*.35,.18);if(i===4)crest.rotation.z=(j-2)*.2;group.add(crest);}
 }
 return {dispose(){root.traverse(o=>o.userData.dispose?.());root.removeFromParent();textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometry.dispose();}};
}
