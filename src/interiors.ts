import {ROBBABLE} from './street-heists.ts';
import {createInteriorLife} from './interior-life.ts';
import {dressAnnex} from './pursuits-art.ts';
import {furnishKarma} from './karma-interior.ts';
import {surfaceTexture,furnishDetails} from './interior-decor.ts';
import {approach,atPoint} from './navigation.ts';
import * as THREE from 'three';
import { createPerson, type Person } from './actors.ts';
import type {Lifestyle} from './lifestyle.ts';
import type { Appearance } from './campaign.ts';
export const INTERIORS = [
  {id:'corner-store',name:'Rampart Corner Market',x:30,z:-180,tab:'City Pursuits',theme:'warehouse',color:0x658567},
  {id:'jeweler',name:'Royal Crown Jewelers',x:90,z:-180,tab:'City Pursuits',theme:'antique',color:0x94764c},
  {id:'liquor',name:'Basin Bottle Shop',x:-90,z:-180,tab:'City Pursuits',theme:'warehouse',color:0x784b51},
  {id:'pharmacy',name:'Canal Pharmacy',x:-150,z:-180,tab:'City Pursuits',theme:'cafe',color:0x648c88},
  {id:'electronics',name:'Bywater Electronics',x:150,z:60,tab:'City Pursuits',theme:'warehouse',color:0x536f8c},
  {id:'boutique',name:'Marigny Evening Boutique',x:90,z:60,tab:'City Pursuits',theme:'hq',color:0x8d5c7c},
  {id:'pawn-east',name:'Eastbank Gold & Pawn',x:150,z:120,tab:'City Pursuits',theme:'antique',color:0x8d8059},
  {id:'riverboat',name:'River Queen Casino · Moored Riverboat',x:90,z:180,tab:'City Pursuits',theme:'casino',color:0x755278},
  {id:'roof-royal',name:'Royal Quarter Rooftop',x:0,z:-210,tab:'City Pursuits',theme:'cafe',color:0x8f7d68},
  {id:'roof-treme',name:'Tremé Sky Garden',x:-60,z:-210,tab:'City Pursuits',theme:'antique',color:0x668167},
  {id:'levee-pavilion',name:'Levee Waterfront Pavilion',x:180,z:180,tab:'City Pursuits',theme:'cafe',color:0x607f8b},
  {id:'rail-exchange',name:'Eastbank Rail Exchange Market',x:-180,z:180,tab:'City Pursuits',theme:'warehouse',color:0x897356},
  {id:'bakery',name:'Basin Street Patisserie',x:-180,z:-120,tab:'Jobs & Style',theme:'cafe',color:0xa57962},
  {id:'post-office',name:'Crescent Post Office',x:120,z:-180,tab:'Jobs & Style',theme:'warehouse',color:0x667c8e},
  {id:'auto-parts',name:'Levee Auto Parts',x:180,z:120,tab:'Garage',theme:'garage',color:0x5d7b73},
  {id:'gallery',name:'Royal Street Gallery',x:-120,z:180,tab:'Stories & Exploration',theme:'antique',color:0x886c80},
  {id:'hotel',name:'Marigny Guest House',x:60,z:180,tab:'Safehouse',theme:'hq',color:0x8c785c},
  {id:'arcade',name:'Canal Neon Arcade',x:-60,z:180,tab:'Jobs & Style',theme:'club',color:0x58508a},
  {id:'karma',name:'Karma',x:10,z:-16,tab:'Market',theme:'dispensary',color:0x131614},
  {id:'clinic',name:'Charity Street Clinic',x:-180,z:-60,tab:'Safehouse',theme:'cafe',color:0x638d86},
  {id:'hardware',name:'Levee Hardware & Supply',x:60,z:60,tab:'Garage',theme:'garage',color:0x6c7670},
  {id:'library',name:'Tremé Reading Room',x:-120,z:-180,tab:'Stories & Exploration',theme:'antique',color:0x8b7354},
  {id:'diner',name:'Canal Night Diner',x:0,z:0,tab:'Jobs & Style',theme:'cafe',color:0x99764c},
  {id:'florist',name:'Garden District Florist',x:-180,z:120,tab:'Market',theme:'antique',color:0x557858},
  {id:'tailor',name:'Royal Street Tailor',x:60,z:-180,tab:'Character',theme:'hq',color:0x755877},
  {id:'music',name:'Basin Street Rehearsal Hall',x:-60,z:-180,tab:'Crew',theme:'club',color:0x664b79},
  {id:'dispatch',name:'Westbank Dispatch Office',x:-120,z:120,tab:'Jobs & Style',theme:'warehouse',color:0x587384},

  {id:'dice',name:'Tremé Dice & Poker Den',x:-120,z:-120,tab:'Properties',theme:'casino',color:0x674773},
  {id:'freight',name:'Warehouse Import/Export Dock',x:60,z:120,tab:'Properties',theme:'warehouse',color:0x55715d},
  {id:'herbalist',name:'Magazine Street Herbalist',x:-60,z:60,tab:'Properties',theme:'antique',color:0x456c63},
  {id:'precinct',name:'Precinct Backroom',x:-60,z:-60,tab:'Properties',theme:'warehouse',color:0x526579},
  {id:'port',name:'Port Cargo Terminal',x:120,z:180,tab:'Heists',theme:'warehouse',color:0x55715d},
  {id:'bank',name:'Bank Vault Lobby',x:0,z:-120,tab:'Heists',theme:'casino',color:0x89744a},
  {id:'mint',name:'Federal Mint Lobby',x:60,z:0,tab:'Heists',theme:'casino',color:0x65706c},
  {id:'blue-note',name:'Blue Note Jazz Club',x:-90,z:-64,tab:'Properties',theme:'club',color:0x713d82},
  {id:'estate',name:'Magnolia Estate',x:-150,z:4,tab:'Properties',theme:'antique',color:0x89744a},
  {id:'tours',name:'Gator Bay Airboat Tours',x:150,z:-128,tab:'Properties',theme:'garage',color:0x53776d},

  {id:'home-quarter',name:'French Quarter Courtyard Home',x:0,z:-180,tab:'Jobs & Style',theme:'hq',color:0x8c704f},
  {id:'home-uptown',name:'Uptown Shotgun Home',x:-180,z:60,tab:'Jobs & Style',theme:'hq',color:0x53776d},
  {id:'home-bywater',name:'Bywater Artist Loft',x:180,z:-120,tab:'Character',theme:'antique',color:0x77566f},
  {id:'dive',name:'Bywater Dive Bar',x:120,z:0,tab:'Properties',theme:'club',color:0x684b45},
  {id:'laundromat',name:'Bywater Laundromat',x:0,z:60,tab:'Safehouse',theme:'warehouse',color:0x52777b},

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
export function nearestEntrance(x:number,z:number,range=3):InteriorDefinition|undefined {
  return [...INTERIORS].sort((a,b)=>Math.hypot(x-approach(a).x,z-approach(a).z)-Math.hypot(x-approach(b).x,z-approach(b).z)).find(b=>atPoint(x,z,b,range));
}
export function createInterior(def:InteriorDefinition,appearance:Appearance,customization?:Lifestyle,furniture:readonly {id:string;slot:number}[]=[],apartmentDecor=0,stockroom=false) {
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
    const geometry=new THREE.PlaneGeometry(6.5,1.35);geometries.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);scene.add(mesh);return mesh;
  }
  const floor=box(0,-.15,0,14,.3,16,0xffffff);
  const floorTexture=surfaceTexture(def.theme==='dispensary'?'marble':def.theme==='garage'||def.theme==='warehouse'?'metal':def.theme==='cafe'||def.theme==='casino'?'tile':'wood');
  (floor.material as THREE.MeshStandardMaterial).map=floorTexture;
  if(def.theme==='dispensary')(floor.material as THREE.MeshStandardMaterial).roughness=.35;
  const wallTexture=surfaceTexture('brick');wallTexture.repeat.set(2,2);
  if(def.theme!=='dispensary')for(let x=-6.5;x<7;x+=.7)box(x,.008,0,.025,.01,16,0x62503b);
  const wallColor=def.id==='hq'?[0x97623d,0x254f59,0x57365f][customization?.safehouseTheme??0]!:def.color;
  const walls=[box(-7,2,0,.2,4,16,wallColor),box(7,2,0,.2,4,16,wallColor),box(0,2,-8,14,4,.2,wallColor)];
  // Materials and perimeter dressing are shared by every enterable room.
  if(def.theme!=='dispensary')walls.forEach(w=>{(w.material as THREE.MeshStandardMaterial).map=wallTexture;});
  const disposeDressing=def.theme==='dispensary'?furnishKarma(scene,box):()=>{};
  if(def.theme!=='dispensary')furnishDetails(def.theme,box);
  // Front wall stays open to preserve third-person camera visibility; the exit threshold is at z=6.7.
  if(def.theme!=='dispensary')sign(def.name,0,3,-7.85);
  box(0,.02,6.5,3,.035,1,0x2f9c8d);
  sign('EXIT · E / INTERACT',0,1.2,7.8,'#9cebdd');
  if(def.theme==='dispensary'){
    box(0,.7,-5.4,4,1.4,1,0x222923,true);sign('SERVICE · E',0,1.05,-4.88,'#a2d355');
  }else{
    box(0,.7,-5.4,4,1.4,1,0x9a7048,true);sign('SERVICE DESK · E',0,2.2,-7.7);
    sign('SUPPLIES · E ON FLOOR EMBLEM',0,1.2,-7.65,'#9cebdd');
  }
  if(def.id==='arcade'){
    // Dedicated cabinet layout replaces the nightclub stage/bar furniture.
    for(const x of [-5,5])for(const z of [-3,0,3])box(x,.9,z,1.1,1.8,.85,0x202434,true);
  }else if(def.id==='auto-parts'){
    for(const x of [-5,5])box(x,.65,0,1.6,1.3,8,0x4b5d63,true);
  }else if(def.id==='hotel'){
    for(const x of [-4,4]){
      box(x,.4,1,2.4,.8,2,0x5b6d64,true);box(x,.95,.1,2.4,.5,.3,0x5b6d64);
      box(x,.4,3,1.4,.8,.8,0x8b6945,true);
    }
  }else if(def.theme==='club'){
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
  }else if(def.theme!=='dispensary'){
    for(const x of [-4,4])for(const z of [-1,3]){box(x,.65,z,1.8,1.3,1.3,0x956a46,true);box(x,.35,z+1.1,.7,.7,.6,0x395c5a,true);}
    for(let i=0;i<5;i++)box(-4+i*2,.1,-7,1,.2,.5,0xe8b866);
  }
  // Landmark-specific props stay at the perimeter, away from the shared walking aisle.
  if(def.id==='arcade')for(const x of [-5,5])for(const z of [-3,0,3]){
    box(x,1.4,z+.44,.85,.55,.03,0x61dbc9);
    box(x,.92,z+.54,1,.08,.35,0x9d54bd);
    sign('PLAY',x,2.05,z+.45,'#7ef5d5').scale.setScalar(.15);
  }
  if(def.id==='bakery')for(const x of [-4,4]){
    box(x,1.4,-1,1.6,.12,1.2,0xe6d7b8);
    for(let i=0;i<4;i++)box(x-.5+i*.33,1.52,-1,.25,.16,.5,0xd09a52);
  }
  if(def.id==='post-office')for(const x of [-5,5])for(let z=-3;z<=3;z+=1.5){
    box(x,2.3,z,.8,.7,.9,0x426c92);box(x,2.35,z+.46,.4,.05,.025,0x192c40);
  }
  if(def.id==='gallery')for(const x of [-6.86,6.86])for(const z of [-4,0,4]){
    box(x,2.4,z,.08,1.5,1.7,0xc6a45f);box(x+(x<0?.05:-.05),2.4,z,.02,1.25,1.4,0x3d8994);
  }
  if(def.id==='auto-parts')for(const x of [-5,5])for(const z of [-3,0,3]){
    box(x,1.6,z,1.3,.12,1.3,0xa0adb1);box(x,1.9,z,.8,.5,.8,0x282f39);
  }
  if(def.id==='hotel'){
    box(-5,.8,-4,1.5,1.6,.5,0x765233);
    for(let i=0;i<8;i++)box(-5.5+i*.15,1,-3.73,.07,.14,.04,0xdbbd65);
    sign('GUEST RECEPTION',0,2.7,-7.65,'#f4d5a0').scale.setScalar(.7);
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
  dressAnnex(def.id,scene,box,apartmentDecor);
  if(def.id.startsWith('roof-')){for(const wall of walls){wall.scale.y=.25;wall.position.y=.5;}sign('ROOFTOP ACCESS · PUBLIC VISIT',0,1.5,-7.6);}
  if(ROBBABLE.includes(def.id)){box(0,.035,2,1.2,.05,.55,0x679fbd);sign(stockroom?'RETURN TO SHOP · AISLE':'STOCKROOM · ACCESS AT COUNTER',0,.55,1.65,'#a8d9ef').scale.setScalar(.2);box(1.2,1.55,-5.3,.5,.35,.45,0x2b3d43);box(1.2,1.8,-5.12,.35,.18,.04,0x89d7b7);box(0,.035,-3.5,1.4,.05,.7,0xd7b568);sign('REGISTER · CASHIER',0,2.7,-7.6,'#ffd686').scale.setScalar(.6);}
  if(def.id==='bank'||def.id==='riverboat'){
    sign(def.id==='bank'?'BRASS VAULT · SECURITY ACTIVE':'RIVER QUEEN · CASINO DECK',0,3,-7.6,'#ffd686');
    box(5,1.2,-5.8,1.6,2.4,1.1,0x42545b,true);box(5,1.2,-5.2,1.2,1.8,.08,0xb6a16e);
    for(const z of [0,3.4]){box(1.1,.7,z,.5,1.4,.5,0x42545b);box(.83,1.25,z,.04,.3,.3,z===0?0xe3bb66:0x56dfad);}
    box(-5,2.8,-5.6,.3,.25,.5,0x263844);box(-5,2.8,-5.3,.12,.1,.08,0xff5b52);
    for(const [z,color,label] of [[3.4,0x56dfad,'ALARM · HOLD INTERACT'],[0,0xe3bb66,'VAULT · HOLD INTERACT'],[-3.5,0xe3bb66,'LOOT · HOLD INTERACT']] as const){
      box(0,.035,z,1.5,.05,.7,color);sign(label,0,.55,z-.45).scale.setScalar(.22);
    }
  }
  if(def.id==='riverboat'){
    for(const x of [-6.85,6.85])for(const z of [-3,0,3]){box(x,2,z,.08,1.4,1.4,0x203f5b);box(x,1.35,z,.1,.08,1.5,0xd8bd78);}
    for(const side of [-1,1])for(const z of [-3,0,3]){const g=new THREE.TorusGeometry(.62,.08,6,16);geometries.push(g);const rim=new THREE.Mesh(g,mat(0xd8bd78));rim.rotation.y=Math.PI/2;rim.position.set(side*6.77,2,z);scene.add(rim);}
    for(const x of [-5.8,5.8]){box(x,1,5.5,.15,1.6,3,0xd8bd78);box(x,1.8,5.5,.2,.12,3.2,0x8d5142);}
    sign('MISSISSIPPI RIVER · MOORED AT EASTBANK',0,2.65,7.7,'#8bdde9').scale.setScalar(.7);
  }
  if(stockroom){sign('PRIVATE STOCKROOM · QUIET SAFE',0,3,-7.5,'#f2cc83');box(4,.8,-5.8,1.6,1.6,1.3,0x41565d,true);box(4,.8,-5.1,1.2,1.2,.05,0xbda46c);box(0,.035,-3.5,1.4,.05,.7,0x67bca2);for(const x of [-6,6])for(const z of [-3,0,3])box(x,.7,z,.8,1.4,.8,0x9b7d4e);}
  const life=createInteriorLife(scene,obstacles,INTERIORS.findIndex(b=>b.id===def.id)+2,def.id==='bank'||def.id==='riverboat',stockroom||def.id.startsWith('home-')?0:4);
  const avatar:Person=createPerson('player',5,appearance,customization);scene.add(avatar.root);
  return {scene,avatar,obstacles,life,dispose(){disposeDressing();life.dispose();floorTexture.dispose();wallTexture.dispose();this.avatar.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(m instanceof THREE.MeshBasicMaterial)m.map?.dispose();m.dispose();});}};
}
