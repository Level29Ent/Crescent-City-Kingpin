import type {Pursuit} from './pursuit.ts';
import * as THREE from 'three';
import {createCar,type Car} from './actors.ts';
import {cityClear} from './city-navigation.ts';
import {createRoadNetwork,approachSpeed,headingDelta,inFront,trafficLight,type RoadEdge} from './road-network.ts';
import type {Point} from './pathfinding.ts';
import {STREETS} from './world.ts';
export function trafficStep(car:{x:number;z:number;heading:number},dt:number,speed:number){return {x:car.x+Math.sin(car.heading)*speed*dt,z:car.z+Math.cos(car.heading)*speed*dt};}
type TrafficCar=Point&{rig:Car;heading:number;speed:number;police:boolean;node:number;route:RoadEdge[];waypoints:Point[];destination:number;replan:number;wait:number;serial:number;junction:string|null;waitingFor:string};
export function createStreetLife(scene:THREE.Scene){
 const signalRoot=new THREE.Group();scene.add(signalRoot);
 const housingGeometry=new THREE.BoxGeometry(.4,1.1,.4),lampGeometry=new THREE.SphereGeometry(.13,6,4);
 const housingMaterial=new THREE.MeshStandardMaterial({color:0x24333d}),lamps=[new THREE.MeshBasicMaterial({color:0xff493a}),new THREE.MeshBasicMaterial({color:0xff493a})];
 const housings=new THREE.InstancedMesh(housingGeometry,housingMaterial,STREETS.length**2*2),signals=lamps.map(m=>new THREE.InstancedMesh(lampGeometry,m,STREETS.length**2));
 signalRoot.add(housings,...signals);const matrix=new THREE.Matrix4();let signalIndex=0;
 for(const x of STREETS)for(const z of STREETS){for(let direction=0;direction<2;direction++){
  const sx=x+(direction?6:-6),sz=z+(direction?-6:6);matrix.makeTranslation(sx,4,sz);housings.setMatrixAt(signalIndex*2+direction,matrix);matrix.makeTranslation(sx,4,sz+(direction?.23:-.23));signals[direction]!.setMatrixAt(signalIndex,matrix);
 }signalIndex++;}
 const network=createRoadNetwork();const cars:TrafficCar[]=[];
 const starts=[[-120,-180],[-60,180],[0,-180],[60,180],[120,-180],[-180,60],[-120,-120],[120,-120]];
 starts.forEach(([x,z],i)=>{const node=network.nearest({x:x!,z:z!}),n=network.nodes[node]!;
  const rig=createCar(i>=6?3:[0,12,7,5,11,10][i]!,[0x457487,0xc69b43,0x6c384c,0x43765b][i%4]!);scene.add(rig.root);
  cars.push({rig,x:n.x,z:n.z,heading:[0,Math.PI/2,Math.PI,-Math.PI/2][n.dir]!,speed:0,police:i>=6,node,route:[],waypoints:[],destination:-1,replan:0,wait:0,serial:i,junction:null,waitingFor:''});
  rig.root.visible=false;rig.root.position.set(n.x,0,n.z);rig.root.rotation.y=cars[cars.length-1]!.heading;
 });
 const junctions=new Map<string,number>();
 let collisionCooldown=0,deployCooldown=0;
 const closedEdges=new Set<string>();
 let obstacleKey='',safeNodes=new Set(network.nodes.map(n=>n.id)),initialized=false;
 const active=(p?:Pursuit)=>p?.phase==='pursuit'||p?.phase==='search';
 return {update(dt:number,time:number,px:number,pz:number,heat:number,enabled:boolean,onHit:(speed:number)=>void,onDeploy?:((x:number,z:number)=>void),pursuit?:Pursuit,obstacles:readonly Point[]=[]){
  signalRoot.visible=enabled;
  lamps.forEach((lamp,i)=>lamp.color.setHex(trafficLight(time,i===1)?0x5ff4a9:0xff493a));
  collisionCooldown=Math.max(0,collisionCooldown-dt);deployCooldown=Math.max(0,deployCooldown-dt);
  const rawBlocked=(a:Point,_b:Point,edge:RoadEdge)=>{
    let last=a;
    for(const point of edge.points){const dx=point.x-last.x,dz=point.z-last.z;
     if(obstacles.some(o=>{const t=Math.max(0,Math.min(1,((o.x-last.x)*dx+(o.z-last.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(o.x-last.x-dx*t,o.z-last.z-dz*t)<2.8;}))return true;
     last=point;
    }return false;
   };
  const signature=obstacles.map(o=>`${Math.round(o.x*2)},${Math.round(o.z*2)}`).join(';');
  if(signature!==obstacleKey){obstacleKey=signature;closedEdges.clear();
   for(const [id,list]of network.edges)for(const edge of list){const from=network.nodes[id]!;if(rawBlocked(from,network.nodes[edge.to]!,edge))closedEdges.add(`${from.x},${from.z}:${edge.to}`);}
   safeNodes=network.component((a,_b,e)=>closedEdges.has(`${a.x},${a.z}:${e.to}`));
  }
  const safe=[...safeNodes];
  const blocked=(a:Point,_b:Point,edge:RoadEdge)=>!safeNodes.has(edge.to)||closedEdges.has(`${a.x},${a.z}:${edge.to}`);
  if(enabled&&!initialized){initialized=true;
   for(const car of cars)if(!safeNodes.has(car.node)){
    const nearest=safe.map(id=>network.nodes[id]!).filter(n=>!cars.some(c=>c!==car&&Math.hypot(n.x-c.x,n.z-c.z)<5)).sort((a,b)=>Math.hypot(a.x-car.x,a.z-car.z)-Math.hypot(b.x-car.x,b.z-car.z))[0];
    if(nearest){car.node=nearest.id;car.x=nearest.x;car.z=nearest.z;car.heading=[0,Math.PI/2,Math.PI,-Math.PI/2][nearest.dir]!;}
   }
  }
  const snapshot=cars.map(c=>({x:c.x,z:c.z}));
  for(const car of cars){
   car.rig.root.visible=enabled;car.rig.detail(Math.hypot(car.x-px,car.z-pz)<35);if(!enabled)continue;
   car.replan-=dt;
   const chasing=car.police&&heat>=30&&active(pursuit);
   // Only observed positions enter the route planner. Search never reads hidden player coordinates.
   const goal=chasing?(safe.map(id=>network.nodes[id]!).sort((a,b)=>Math.hypot(a.x-pursuit!.lastX,a.z-pursuit!.lastZ)-Math.hypot(b.x-pursuit!.lastX,b.z-pursuit!.lastZ))[0]?.id??car.node):car.destination;
   if(!car.waypoints.length){
    if(car.junction){junctions.delete(car.junction);car.junction=null;}
    if(car.route.length){const edge=car.route.shift()!;car.waypoints=edge.points.map(p=>({...p}));car.node=edge.to;}
    else if(car.replan<=0){
     if(chasing){car.destination=goal;}else car.destination=safe[(safe.indexOf(car.node)+37+car.serial*11)%Math.max(1,safe.length)]??car.node;
     car.route=network.route(car.node,car.destination,blocked);
     if(!car.route.length&&!chasing){const edge=network.edges.get(car.node)?.find(e=>!blocked(network.nodes[car.node]!,network.nodes[e.to]!,e));if(edge)car.route=[edge];}
     car.replan=2;
    }
   }else if(chasing&&goal!==car.destination&&car.replan<=0){car.destination=goal;car.route=network.route(car.node,goal,blocked);car.replan=2;}
   let target=car.waypoints[0];while(target&&Math.hypot(target.x-car.x,target.z-car.z)<.22){car.waypoints.shift();target=car.waypoints[0];}
   let desired=target?chasing?(pursuit!.phase==='search'?7:Math.min(13,8+heat*.04)):7:0;
   const yaw=target?Math.atan2(target.x-car.x,target.z-car.z):car.heading,delta=headingDelta(car.heading,yaw);
   if(Math.abs(delta)>.2)desired=Math.min(desired,4.5);
   // Junction entry is 9m from its center; stop before entering on red. Police still yield to occupancy.
   if(target&&car.waypoints.length>=19&&Math.hypot(target.x-car.x,target.z-car.z)<6&&!chasing&&!trafficLight(time,Math.abs(Math.sin(car.heading))>.5))desired=0;
   // Hold an entire junction until the rear has cleared. Perpendicular queues
   // cannot creep into each other's turning arcs, even when police skip red lights.
   let junctionBlocked=false;
   if(target&&car.waypoints.length>=19&&Math.hypot(target.x-car.x,target.z-car.z)<10){
    const end=network.nodes[car.node]!,key=`${end.ix},${end.iz}`,owner=junctions.get(key);
    if(owner!==undefined&&owner!==car.serial)junctionBlocked=true;
    else if(desired>0){junctions.set(key,car.serial);car.junction=key;}
   }
   const ahead=(obstacle:Point,range:number,radius:number)=>{
    let last:Point=car,remaining=range;
    for(const point of car.waypoints){
     const length=Math.hypot(point.x-last.x,point.z-last.z);if(length<.001)continue;
     const fraction=Math.min(1,remaining/length),dx=(point.x-last.x)*fraction,dz=(point.z-last.z)*fraction;
     const t=((obstacle.x-last.x)*dx+(obstacle.z-last.z)*dz)/(dx*dx+dz*dz||1);
     if(t>=0&&t<=1&&Math.hypot(obstacle.x-last.x-dx*t,obstacle.z-last.z-dz*t)<radius)return true;
     remaining-=length;if(remaining<=0)break;last=point;
    }return false;
   };
   const following=snapshot.some((other,i)=>i!==car.serial&&ahead(other,4+car.speed*.5,3));
   const parked=obstacles.some(o=>ahead(o,5+car.speed*.5,2.7));
   const playerAhead=ahead({x:px,z:pz},chasing?4:7,2.6);
   const siren=!car.police&&pursuit?.phase==='pursuit'&&cars.some(c=>c.police&&Math.hypot(c.x-car.x,c.z-car.z)<18&&!inFront(c,c.heading,car,24,3));
   if(junctionBlocked||following||parked||playerAhead||siren)desired=0;
   car.waitingFor=junctionBlocked?'junction':following?'traffic':parked?'parked':playerAhead?'player':siren?'siren':!target?'route':desired===0?'signal':'';
   car.wait=desired===0?car.wait+dt:0;
   // Replan the next street segment around parked obstructions instead of shunting them.
   if(car.wait>4&&car.route.length){car.route=network.route(car.node,car.destination,blocked);car.wait=0;}
   car.speed=approachSpeed(car.speed,desired,dt);
   car.heading+=Math.max(-2.5*dt,Math.min(2.5*dt,delta));
   if(target){const distance=Math.hypot(target.x-car.x,target.z-car.z),step=Math.min(distance,car.speed*dt),nx=car.x+(target.x-car.x)/Math.max(distance,.001)*step,nz=car.z+(target.z-car.z)/Math.max(distance,.001)*step;
    if(cityClear(nx,nz,1.4)&&!snapshot.some((o,i)=>i!==car.serial&&Math.hypot(o.x-nx,o.z-nz)<3)){car.x=nx;car.z=nz;}else car.speed=0;
   }
   if(Math.hypot(car.x-px,car.z-pz)<2.6&&car.speed>2&&collisionCooldown===0){collisionCooldown=2;onHit(car.speed);}
   if(chasing&&pursuit!.phase==='pursuit'&&Math.hypot(car.x-px,car.z-pz)<14&&deployCooldown===0&&onDeploy){deployCooldown=25;onDeploy(car.x+2.5,car.z);}
   car.rig.root.position.set(car.x,0,car.z);car.rig.root.rotation.y=car.heading;car.rig.motion(car.speed,delta,desired===0,time);
  }
 },observers(){return cars.filter(c=>c.police&&c.rig.root.visible).map(c=>({x:c.x,z:c.z}));},
 state(){return cars.map(c=>({x:c.x,z:c.z,heading:c.heading,speed:c.speed,police:c.police,node:c.node,waitingFor:c.waitingFor}));},
 sirenNear(x:number,z:number){return cars.some(c=>c.police&&c.rig.root.visible&&Math.hypot(c.x-x,c.z-z)<25);},near(x:number,z:number){return cars.some(c=>c.rig.root.visible&&Math.hypot(c.x-x,c.z-z)<2.3);},dispose(){cars.forEach(c=>c.rig.dispose());signalRoot.removeFromParent();housings.dispose();signals.forEach(s=>s.dispose());housingGeometry.dispose();lampGeometry.dispose();housingMaterial.dispose();lamps.forEach(m=>m.dispose());}};
}
