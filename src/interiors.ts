import * as THREE from 'three';
import { createPerson, type Person } from './actors.ts';
import type {Lifestyle} from './lifestyle.ts';
import type { Appearance } from './campaign.ts';
export const INTERIORS = [
  {id:'barber',name:'Tremé Corner Barbershop',x:-60,z:-120,tab:'Character',theme:'cafe',color:0x476777},
  {id:'record',name:'Frenchmen Record Store',x:60,z:-120,tab:'Jobs & Style',theme:'club',color:0x654777},
  {id:'seafood',name:'Crescent Seafood Market',x:120,z:120,tab:'Properties',theme:'warehouse',color:0x4b7477},
  {id:'theater',name:'Canal Picture House Foyer',x:-60,z:120,tab:'Properties',theme:'casino',color:0x77414f},
  {id:'courier',name:'Bywater Courier Depot',x:180,z:-60,tab:'Jobs & Style',theme:'garage',color:0x526d59},

  {id:'station',name:'Old Tremé Station Waiting Room',x:-180,z:0,tab:'Stories & Exploration',theme:'warehouse',color:0x566354},
  {id:'bywater',name:'Bywater Artists’ Studio',x:180,z:60,tab:'Stories & Exploration',theme:'antique',color:0x785487},
  {id:'archive',name:'Cemetery Records Archive',x:180,z:0,tab:'Stories & Exploration',theme:'antique',color:0x65706c},
  {id:'newsroom',name:'Canal Street Newsroom',x:0,z:120,tab:'Stories & Exploration',theme:'cafe',color:0x556983},
  { id:'hq', name:'Mama Nola’s Back Room', x:30,z:4, tab:'Safehouse', theme:'hq', color:0x97623d },
  { id:'jazz', name:'French Quarter Jazz Lounge', x:0,z:-60, tab:'Properties', theme:'club', color:0x713d82 },
  { id:'antique', name:'Garden District Antique Shop', x:-120,z:0, tab:'Market', theme:'antique', color:0x89744a },
  { id:'cafe', name:'Marigny Cafe & Bakery', x:60,z:-60, tab:'Crew', theme:'cafe', color:0xb78055 },
  { id:'garage', name:'Central City Chop Shop', x:-60,z:0, tab:'Garage', theme:'garage', color:0x4d6570 },
  { id:'pawn', name:'Uptown Pawn Shop', x:-120,z:60, tab:'Market', theme:'antique', color:0x456c63 },
  { id:'casino', name:'Grand Hotel & Casino Lobby', x:35,z:202, tab:'Heists', theme:'casino', color:0x87433e },
  { id:'dock', name:'Warehouse Cargo Office', x:90,z:124, tab:'Garage', theme:'warehouse', color:0x55715d },
] as const;
export type InteriorDefinition = typeof INTERIORS[number];
export type Obstacle = {x:number;z:number;w:number;d:number};
export function indoorMove(x:number,z:number,dx:number,dz:number,obstacles:Obstacle[]) {
  const blocked=(x:number,z:number)=>Math.abs(x)>6.4 || z < -7.4 || z>7.4 || obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.4&&Math.abs(z-o.z)<o.d/2+.4);
  let nx=x,nz=z;
  if(!blocked(x+dx,z))nx+=dx;
  if(!blocked(nx,z+dz))nz+=dz;
  return {x:nx,z:nz};
}
export function nearestEntrance(x:number,z:number,range=4):InteriorDefinition|undefined {
  return [...INTERIORS].sort((a,b)=>Math.hypot(x-a.x,z-a.z)-Math.hypot(x-b.x,z-b.z)).find(b=>Math.hypot(x-b.x,z-b.z)<=range);
}
export function createInterior(def:InteriorDefinition,appearance:Appearance,customization?:Lifestyle,furniture:readonly {id:string;slot:number}[]=[]) {
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101a24);
  const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
  const obstacles:Obstacle[]=[];
  const mat=(color:number,glow=false)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.75,emissive:glow?color:0,emissiveIntensity:glow?.7:0});materials.push(m);return m;};
  function box(x:number,y:number,z:number,w:number,h:number,d:number,color:number,solid=false){
    const g=new THREE.BoxGeometry(w,h,d);geometries.push(g);const mesh=new THREE.Mesh(g,mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
    if(solid)obstacles.push({x,z,w,d});return mesh;
  }
  function sign(text:string,x:number,y:number,z:number,color='#f6df9e'){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const g=canvas.getContext('2d')!;
    g.fillStyle='#14232e';g.fillRect(0,0,768,160);g.strokeStyle=color;g.lineWidth=5;g.strokeRect(8,8,752,144);g.fillStyle=color;g.textAlign='center';g.font='bold 38px sans-serif';g.fillText(text,384,92,730);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});materials.push(material);
    const geometry=new THREE.PlaneGeometry(6.5,1.35);geometries.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);scene.add(mesh);
  }
  box(0,-.15,0,14,.3,16,0x3b302c);
  for(let x=-6.5;x<7;x+=.7)box(x,.008,0,.025,.01,16,0x62503b);
  const wallColor=def.id==='hq'?[0x97623d,0x254f59,0x57365f][customization?.safehouseTheme??0]!:def.color;
  box(-7,2,0,.2,4,16,wallColor);box(7,2,0,.2,4,16,wallColor);box(0,2,-8,14,4,.2,wallColor);
  // Front wall stays open to preserve third-person camera visibility; the exit threshold is at z=6.7.
  sign(def.name,0,3,-7.85);
  box(0,.02,6.5,3,.035,1,0x2f9c8d);
  sign('EXIT · E / INTERACT',0,1.2,7.8,'#9cebdd');
  box(0,.7,-5.4,4,1.4,1,0x9a7048,true);sign('SERVICE DESK · E',0,2.2,-7.7);
  if(def.theme==='club'){
    box(-4,.2,-2.8,3,.4,4,0x3e284c,true);
    for(let i=0;i<3;i++){box(-4+i,.8,-3.1,.3,1.2,.3,0x24252b);box(-4+i,1.5,-3.1,.18,.2,.2,0xf4d37c);}
    box(4,.7,1,2,1.4,4,0x493357,true);
    for(let z=-2;z<=3;z+=2)box(2,.5,z,.7,1,.7,0x288d7b,true);
  }else if(def.theme==='casino'){
    for(const x of [-4,4])for(const z of [-1,3]){box(x,.7,z,2.5,1.4,1.5,0x176c54,true);box(x,1.42,z,2.6,.08,1.6,0xd8b56d);}
    for(const x of [-6,6])box(x,2,-4,.5,4,.5,0xddc58c);
  }else if(def.theme==='garage'){
    box(-4,.2,0,3,.4,5,0x425463,true);box(-4,1,-1,1.7,1.3,2.5,0x456c83);
    for(const z of [-3,0,3]){box(5,.65,z,1.5,1.3,1.4,0x202b32,true);box(5,1.3,z,1.6,.05,1.5,0xae5d45);}
  }else if(def.theme==='antique'){
    for(const x of [-5,5]){box(x,1.2,0,1.3,2.4,8,0x76563b,true);for(let z=-3;z<=3;z+=2){box(x,2,z,.6,.7,.6,0xd2b577);box(x,.7,z,.8,.5,.5,0x477d81);}}
  }else if(def.theme==='warehouse'){
    for(const x of [-4,4])for(const z of [-2,2]){box(x,.8,z,2,1.6,2,0x937247,true);box(x,1.64,z,2,.06,2,0xba9b69);}
  }else{
    for(const x of [-4,4])for(const z of [-1,3]){box(x,.65,z,1.8,1.3,1.3,0x956a46,true);box(x,.35,z+1.1,.7,.7,.6,0x395c5a,true);}
    for(let i=0;i<5;i++)box(-4+i*2,.1,-7,1,.2,.5,0xe8b866);
  }
  const hemi=new THREE.HemisphereLight(0xf9e4c4,0x6a7594,2.5);scene.add(hemi);
  const light=new THREE.DirectionalLight(0xffe2b2,3);light.position.set(2,7,4);scene.add(light);
  for(const x of [-5,5]){const lamp=new THREE.PointLight(def.id==='hq'?[0xffc879,0x79ffe0,0xc080ff][customization?.lightColor??0]!:def.theme==='club'?0xbd70ff:0xffc879,12,14);lamp.position.set(x,3,-1);scene.add(lamp);}
  if(def.id==='hq'){
    if(customization?.rug){box(0,.025,1.8,4,.04,4.5,0x355968);for(const x of [-1.8,1.8])box(x,.05,1.8,.08,.02,4.2,0xe0ba72);}
    if(customization?.art){box(-6.86,2,-1,.06,1.5,2.2,0xd3b573);box(-6.8,2,-1,.06,1.25,1.9,0x35758a);}
    for(const f of furniture){const x=f.slot%2?-5:5,z=-3+Math.floor(f.slot/2)*3;
      if(f.id==='vault'){box(x,.8,z,1.2,1.6,1,0x3e545e,true);box(x,.8,z+.52,.7,.9,.04,0x82969c);}
      if(f.id==='camera'){box(x,1.5,z,1.3,.9,.4,0x263b42,true);box(x,1.5,z+.23,1,.65,.02,0x4eaba6);}
      if(f.id==='locker'){box(x,1,z,1,2,.6,0x3a4e39,true);}
      if(f.id==='poker'){box(x,.65,z,1.7,1.3,1.5,0x266a50,true);}
    }
  }
  const avatar:Person=createPerson('player',5,appearance,customization);scene.add(avatar.root);
  return {scene,avatar,obstacles,dispose(){avatar.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(m instanceof THREE.MeshBasicMaterial)m.map?.dispose();m.dispose();});}};
}
