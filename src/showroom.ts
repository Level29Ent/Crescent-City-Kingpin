import {applyBodyStyle} from './car-style.ts';
import * as THREE from 'three';
import { createPerson, type Person, createCar } from './actors.ts';
import type {Appearance} from './campaign.ts';
import type {Lifestyle} from './lifestyle.ts';
import { createMoneyStack } from './money.ts';
// One static preview render plus drag-to-orbit: no permanent render loop for a management panel.
export function mountShowroom(parent: HTMLElement, style: number | 'cash' | 'character' | 'officer', color=0x355e64, appearance?:Appearance, customization?:Lifestyle,carStyle?:Lifestyle['carStyle'][string]) {
  const canvas=document.createElement('canvas');canvas.className='garage-preview';
  canvas.setAttribute('aria-label',style==='officer'?'Uniformed police officer preview':style==='character'?'Live character preview, drag to rotate':style==='cash'?'Detailed fictional banknote stacks, drag to rotate':'Vehicle 3D preview, drag to rotate');
  parent.append(canvas);
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}catch{canvas.replaceWith(document.createTextNode('3D preview unavailable on this device.'));return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b1923);
  scene.add(new THREE.HemisphereLight(0xe3edf3,0x443a24,2));
  const key=new THREE.DirectionalLight(0xffe5bd,4);key.position.set(3,6,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0x9bc9ff,2);fill.position.set(-4,3,-2);scene.add(fill);
  const vehicle=typeof style==='number'?createCar(style,color):null;
  let person:Person|null=style==='officer'?createPerson('cop',5):style==='character'?createPerson('player',5,appearance,customization):null;
  let object=person?.root??vehicle?.root??createMoneyStack();
  if(person){person.pose('idle',0,0,0,.1);person.root.traverse(o=>{if(o.name.startsWith('weapon-'))o.visible=false;});}
  scene.add(object);
  const disposeStyle=vehicle?applyBodyStyle(object,carStyle):()=>{};
  object.rotation.y=-.25;
  const box=new THREE.Box3().setFromObject(object);const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const camera=new THREE.PerspectiveCamera(36,1,.05,60);const radius=Math.max(size.x,size.y,size.z)*1.7;
  camera.position.set(person?0:radius*.8,center.y+radius*(person?.12:.65),radius*(person?1.22:.8));camera.lookAt(center);
  let disposed=false;
  const render=()=>{if(disposed||!canvas.isConnected)return;const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);};
  const resize=new ResizeObserver(render);resize.observe(canvas);
  let last:number|null=null;
  canvas.onpointerdown=e=>{last=e.clientX;canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(last===null)return;object.rotation.y+=(e.clientX-last)*.012;last=e.clientX;render();};
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>last=null;
  function dispose(){if(disposed)return;disposed=true;resize.disconnect();observer.disconnect();disposeStyle();vehicle?.dispose();person?.dispose();renderer.dispose();}
  const empire=document.getElementById('empire');
  const observer=new MutationObserver(()=>{if(!canvas.isConnected||empire?.hidden)dispose();});
  observer.observe(parent.closest('#empireContent')??parent.parentElement??parent,{childList:true,subtree:true});
  if(empire)observer.observe(empire,{attributes:true,attributeFilter:['hidden']});
  requestAnimationFrame(render);
  return {updateCharacter(next:Appearance,look:Lifestyle){if(disposed||style!=='character')return;const rotation=object.rotation.y;person?.dispose();person=createPerson('player',5,next,look);object=person.root;object.rotation.y=rotation;person.pose('idle',0,0,0,.1);object.traverse(o=>{if(o.name.startsWith('weapon-'))o.visible=false;});scene.add(object);render();},dispose};
}
