import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// Original procedural Mardi Gras art inspired by the supplied parade references:
// stacked illuminated floats, oversized jester masks, bead garlands, balcony ribbons and crowds.
export function createFestival(scene: THREE.Scene) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  const geometry = new THREE.BoxGeometry(1,1,1);
  const ball = new THREE.SphereGeometry(1,10,8);
  const cylinder = new THREE.CylinderGeometry(1,1,1,12);
  const mats = new Map<number,THREE.MeshStandardMaterial>();
  const material = (color:number, glow=false) => {
    const key=color+(glow?0x1000000:0); let m=mats.get(key);
    if(!m){m=new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.15,emissive:glow?color:0,emissiveIntensity:glow?1.5:0});mats.set(key,m);}return m;
  };
  function shape(parent:THREE.Object3D,g:THREE.BufferGeometry,color:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,glow=false){
    const mesh=new THREE.Mesh(g,material(color,glow));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  const colors=[0x7226b9,0x0b9954,0xf9c93d];
  const floats:THREE.Group[]=[];
  for(let f=0;f<4;f++){
    const group=new THREE.Group();root.add(group);floats.push(group);
    shape(group,geometry,colors[f%3]!,0,.65,0,4,1.2,10);
    shape(group,geometry,0xdeb445,0,1.3,0,4.3,.25,10.3);
    shape(group,geometry,colors[(f+1)%3]!,0,2.2,1,3.6,1.6,6);
    shape(group,geometry,0xf1c845,0,3.1,1,3.9,.25,6.3);
    shape(group,geometry,colors[f%3]!,0,4.1,2,3.1,1.5,3.8);
    // Double rows of glowing float lamps and looping bead scallops.
    for(const side of [-1,1])for(let i=0;i<32;i++){
      const z=-4.8+i*.3;
      shape(group,ball,colors[i%3]!,side*2.12,1.5+.4*Math.sin(i*.65),z,.105,.105,.105,true);
      if(i%2===0)shape(group,ball,0xffefb1,side*1.85,3,z*.6+.8,.09,.09,.09,true);
    }
    // Giant carnival face at the front, with purple three-pronged jester crown.
    shape(group,ball,0xffb33e,0,3.4,-3.6,1.25,1.5,.65);
    for(const side of [-1,1]){
      shape(group,ball,0x13c46d,side*.5,3.6,-4.13,.45,.32,.12);
      shape(group,ball,0x151323,side*.5,3.6,-4.24,.23,.08,.06);
      const horn=shape(group,cylinder,0x7025ba,side*.85,5.1,-3.5,.3,1.8,.3);horn.rotation.z=side*-.6;
      shape(group,ball,0xffdc59,side*1.35,5.8,-3.5,.22,.22,.22,true);
    }
    shape(group,ball,0xf05b2c,0,3.2,-4.35,.35,.2,.35);
    shape(group,geometry,0xc4314e,0,2.8,-4.2,.7,.12,.1);
    const crown=shape(group,cylinder,0x9833bf,0,5.45,-3.5,.35,1.7,.35);crown.rotation.z=.12;
    shape(group,ball,0xffe36b,0,6.3,-3.5,.25,.25,.25,true);
    // Riders and float railing.
    for(let j=0;j<6;j++){
      const x=j%2?1.1:-1.1,z=-1+Math.floor(j/2)*1.4;
      shape(group,geometry,colors[j%3]!,x,3.65,z,.3,.6,.3);
      shape(group,ball,0xb77950,x,4.1,z,.18,.22,.18);
      shape(group,cylinder,0xffe7c4,x,4.4,z,.25,.18,.25);
    }
    for(const side of [-1,1])shape(group,geometry,0xf3d67a,side*1.7,3.5,1,.08,.12,5.8);
  }
  // Instanced street crowd: 340 people with varied skin, suits and carnival colors.
  const count=340;
  const bodies=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({roughness:.9}),count);
  const heads=new THREE.InstancedMesh(ball,new THREE.MeshStandardMaterial({roughness:.9}),count);
  const hats=new THREE.InstancedMesh(cylinder,new THREE.MeshStandardMaterial({roughness:.7}),count);
  const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color();
  let seed=2901;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const skins=[0xf1c8a0,0xc58c5b,0x75472c,0x4f3020];
  for(let i=0;i<count;i++){
    const side=i%2?1:-1;const x=side*(4.6+random()*2.1),z=-155+random()*310;const h=.85+random()*.25;
    matrix.compose(v.set(x,h*.7,z),q,scale.set(.36,h,.33));bodies.setMatrixAt(i,matrix);bodies.setColorAt(i,color.setHex([...colors,0xf84185,0x26bad1][i%5]!));
    matrix.compose(v.set(x,h*1.3,z),q,scale.set(.18,.22,.18));heads.setMatrixAt(i,matrix);heads.setColorAt(i,color.setHex(skins[i%4]!));
    matrix.compose(v.set(x,h*1.3+.27,z),q,scale.set(.25,.15,.25));hats.setMatrixAt(i,matrix);hats.setColorAt(i,color.setHex(colors[i%3]!));
  }
  root.add(bodies,heads,hats);
  // Ribbons, festive bunting and overhead string lights down Royal Street.
  for(let z=-150;z<=150;z+=15){
    for(const side of [-1,1]){
      shape(root,cylinder,0x343b37,side*7,2,z,.05,4,.05);
      for(let i=0;i<9;i++){
        const ribbon=shape(root,geometry,colors[i%3]!,side*7,3.4-i*.18,z+(i-4)*.18,.05,.9,.035);ribbon.rotation.z=side*.2;
      }
    }
    for(let i=0;i<20;i++){
      const x=-7+i*.72,y=5.2-.6*Math.sin(i/19*Math.PI);
      shape(root,ball,colors[i%3]!,x,y,z,.08,.08,.08,true);
      if(i%2===0){const flag=shape(root,geometry,colors[i%3]!,x,y-.25,z,.35,.5,.025);flag.rotation.z=.15;}
    }
  }
  // Reusable falling confetti, capped to one Points buffer.
  const positions=new Float32Array(900*3),confettiColors=new Float32Array(900*3);
  for(let i=0;i<900;i++){positions[i*3]=(random()-.5)*18;positions[i*3+1]=random()*12;positions[i*3+2]=(random()-.5)*310;color.setHex(colors[i%3]!);color.toArray(confettiColors,i*3);}
  const confettiGeo=new THREE.BufferGeometry();confettiGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));confettiGeo.setAttribute('color',new THREE.BufferAttribute(confettiColors,3));
  const confettiMat=new THREE.PointsMaterial({vertexColors:true,size:.1,transparent:true,opacity:.9,depthWrite:false});root.add(new THREE.Points(confettiGeo,confettiMat));
  // Batch static decorations per material. Crowds remain instanced, floats stay independently movable.
  const mergedGeometries:THREE.BufferGeometry[]=[];
  for(const group of [root,...floats]) {
    const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
    for(const child of [...group.children]) {
      if(!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh)continue;
      child.updateMatrix();const geo=child.geometry.clone().applyMatrix4(child.matrix);
      const mat=child.material as THREE.Material;const batch=batches.get(mat)??[];batch.push(geo);batches.set(mat,batch);child.removeFromParent();
    }
    for(const [mat,geos]of batches){const merged=mergeGeometries(geos);geos.forEach(g=>g.dispose());if(merged){mergedGeometries.push(merged);const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;group.add(mesh);}}
  }
  const lamp=new THREE.PointLight(0xddaaff,9,25);root.add(lamp);
  return {
    update(time:number,dt:number,active:boolean,escort:number|null){
      root.visible=active;if(!active)return;
      for(let i=0;i<floats.length;i++){
        const group=floats[i]!;
        const z=escort!==null&&i===0?42+Math.min(40,escort)*1.5:((time*1.4+i*75)%300)-150;
        group.position.set(0,.06*Math.sin(time*2+i),z);group.rotation.y=Math.PI;
      }
      lamp.position.set(0,6,floats[0]!.position.z);
      for(let i=0;i<900;i++){positions[i*3+1]!-=dt*(1+i%4*.3);if(positions[i*3+1]!<0)positions[i*3+1]=12;}
      confettiGeo.attributes.position!.needsUpdate=true;
    },
    dispose(){root.removeFromParent();geometry.dispose();ball.dispose();cylinder.dispose();mats.forEach(m=>m.dispose());mergedGeometries.forEach(g=>g.dispose());confettiGeo.dispose();confettiMat.dispose();(bodies.material as THREE.Material).dispose();(heads.material as THREE.Material).dispose();(hats.material as THREE.Material).dispose();bodies.dispose();heads.dispose();hats.dispose();}
  };
}
