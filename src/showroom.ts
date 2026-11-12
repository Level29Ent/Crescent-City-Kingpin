import * as THREE from 'three';
import { createCar } from './actors.ts';
import { createMoneyStack } from './money.ts';
// One static preview render plus drag-to-orbit: no permanent render loop for a management panel.
export function mountShowroom(parent: HTMLElement, style: number | 'cash', color=0x355e64) {
  const canvas=document.createElement('canvas');canvas.className='garage-preview';
  canvas.setAttribute('aria-label',style==='cash'?'Detailed fictional banknote stacks, drag to rotate':'Vehicle 3D preview, drag to rotate');
  parent.append(canvas);
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}catch{canvas.replaceWith(document.createTextNode('3D preview unavailable on this device.'));return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x0b1923);
  scene.add(new THREE.HemisphereLight(0xe3edf3,0x443a24,2));
  const key=new THREE.DirectionalLight(0xffe5bd,4);key.position.set(3,6,5);scene.add(key);
  const fill=new THREE.DirectionalLight(0x9bc9ff,2);fill.position.set(-4,3,-2);scene.add(fill);
  const vehicle=style==='cash'?null:createCar(style,color);
  const object=vehicle?.root??createMoneyStack();scene.add(object);
  object.rotation.y=-.6;
  const box=new THREE.Box3().setFromObject(object);const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  const camera=new THREE.PerspectiveCamera(36,1,.05,60);const radius=Math.max(size.x,size.y,size.z)*1.7;
  camera.position.set(radius*.8,center.y+radius*.65,radius*.8);camera.lookAt(center);
  let disposed=false;
  const render=()=>{if(disposed||!canvas.isConnected)return;const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);};
  const resize=new ResizeObserver(render);resize.observe(canvas);
  let last:number|null=null;
  canvas.onpointerdown=e=>{last=e.clientX;canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(last===null)return;object.rotation.y+=(e.clientX-last)*.012;last=e.clientX;render();};
  canvas.onpointerup=canvas.onpointercancel=()=>last=null;
  function dispose(){if(disposed)return;disposed=true;resize.disconnect();observer.disconnect();vehicle?.dispose();renderer.dispose();}
  const empire=document.getElementById('empire');
  const observer=new MutationObserver(()=>{if(!canvas.isConnected||empire?.hidden)dispose();});
  observer.observe(parent.closest('#empireContent')??parent.parentElement??parent,{childList:true,subtree:true});
  if(empire)observer.observe(empire,{attributes:true,attributeFilter:['hidden']});
  requestAnimationFrame(render);
}
