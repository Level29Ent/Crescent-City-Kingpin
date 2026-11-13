import * as THREE from 'three';
import type {Lifestyle} from './lifestyle.ts';
export function applyBodyStyle(root:THREE.Group,style: Lifestyle['carStyle'][string]|undefined){
 const resources:{dispose():void}[]=[];if(!style)return ()=>{};
 const piece=(w:number,h:number,d:number,x:number,y:number,z:number,color:number)=>{const geometry=new THREE.BoxGeometry(w,h,d),material=new THREE.MeshStandardMaterial({color,roughness:.4});resources.push(geometry,material);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);root.add(mesh);};
 if(style.spoiler){piece(1.8,.1,.45,0,1.55,-1.8,0x182530);for(const x of [-.6,.6])piece(.07,.35,.1,x,1.35,-1.8,0x85969e);}
 if(style.stripe){for(const x of [-.3,.3])piece(.18,.025,1.3,x,1.04,1.4,0xf1dcaf);}
 return ()=>resources.forEach(r=>r.dispose());
}
