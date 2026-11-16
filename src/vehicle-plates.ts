import * as THREE from 'three';
/** Private texture/materials per plate label; never mutate shared paint or chrome. */
export function applyLicensePlate(root:THREE.Group,label:string){
 const plates:THREE.Mesh[]=[];root.traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='license-plate')plates.push(o);});
 if(!plates.length||typeof document==='undefined')return ()=>{};
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=80;const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#eee7cd';ctx.fillRect(0,0,256,80);ctx.strokeStyle='#244340';ctx.lineWidth=5;ctx.strokeRect(3,3,250,74);ctx.fillStyle='#163f3c';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText('CRESCENT CITY',128,19);ctx.font='bold 29px monospace';ctx.fillText(label,128,56,246);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const originals=plates.map(p=>p.material),materials=plates.map(p=>{const m=(p.material as THREE.MeshStandardMaterial).clone();m.map=texture;m.color.setHex(0xffffff);p.material=m;return m;});
 return ()=>{plates.forEach((p,i)=>p.material=originals[i]!);materials.forEach(m=>m.dispose());texture.dispose();};
}
