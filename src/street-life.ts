import * as THREE from 'three';
import {createCar,type Car} from './actors.ts';
// Bounded street-segment traffic with a connected-grid police chase. No external assets or pathfinding service.
export function trafficStep(car:{x:number;z:number;heading:number},dt:number,speed:number){return {x:car.x+Math.sin(car.heading)*speed*dt,z:car.z+Math.cos(car.heading)*speed*dt};}
export function createStreetLife(scene:THREE.Scene){
 const cars:{rig:Car;x:number;z:number;heading:number;speed:number;police:boolean;turn:number}[]=[];
 const routes=[[-120,-180,0],[-60,180,Math.PI],[0,-180,0],[60,180,Math.PI],[120,-180,0],[-180,60,Math.PI/2]];
 routes.forEach(([x,z,h],i)=>{const rig=createCar(i===5?10:0,[0x457487,0xc69b43,0x6c384c,0x43765b][i%4]!);scene.add(rig.root);cars.push({rig,x:x!+2,z:z!,heading:h!,speed:5+i*.5,police:false,turn:0});});
 for(let i=0;i<2;i++){const rig=createCar(3,0x172536);scene.add(rig.root);cars.push({rig,x:i?122:-118,z:-180,heading:0,speed:0,police:true,turn:0});}
 cars.forEach(c=>{c.rig.root.visible=false;c.rig.root.position.set(c.x,0,c.z);c.rig.root.rotation.y=c.heading;});
 let collisionCooldown=0;let deployCooldown=0;
 return {update(dt:number,time:number,px:number,pz:number,heat:number,enabled:boolean,onHit:(speed:number)=>void,onDeploy?:(x:number,z:number)=>void){
  collisionCooldown=Math.max(0,collisionCooldown-dt);deployCooldown=Math.max(0,deployCooldown-dt);
  for(const car of cars){
   car.rig.root.visible=enabled;if(!car.rig.root.visible)continue;
   const distance=Math.hypot(car.x-px,car.z-pz);
   if(car.police){
    if(heat<40){if(Math.abs(car.z)>180)car.heading=car.z>0?Math.PI:0;car.speed=5;const next=trafficStep(car,dt,car.speed);car.x=next.x;car.z=next.z;car.rig.root.position.set(car.x,0,car.z);car.rig.root.rotation.y=car.heading;car.rig.motion(car.speed,0,false,time);continue;}

    // At street intersections choose the axis that closes the largest gap.
    const cross=Math.abs(car.x/60-Math.round(car.x/60))<.07&&Math.abs(car.z/60-Math.round(car.z/60))<.07;
    if(cross&&time>car.turn){car.turn=time+1.5;car.heading=Math.abs(px-car.x)>Math.abs(pz-car.z)?(px>car.x?Math.PI/2:-Math.PI/2):(pz>car.z?0:Math.PI);}
    if(Math.abs(car.x)>182||Math.abs(car.z)>182)car.heading+=Math.PI;
    car.speed=distance<7?0:9+heat/20;
    if(distance<14&&deployCooldown===0&&onDeploy){deployCooldown=25;onDeploy(car.x+2.5,car.z);}
   }else{
    if(Math.abs(car.z)>185&&Math.abs(Math.cos(car.heading))>.5)car.heading+=Math.PI;
    if(Math.abs(car.x)>185&&Math.abs(Math.sin(car.heading))>.5)car.heading+=Math.PI;
    car.speed=distance<5?0:7;
   }
   const next=trafficStep(car,dt,car.speed);car.x=next.x;car.z=next.z;
   if(distance<2.6&&car.speed>2&&collisionCooldown===0){collisionCooldown=2;onHit(car.speed);}
   car.rig.root.position.set(car.x,0,car.z);car.rig.root.rotation.y=car.heading;car.rig.motion(car.speed,0,car.speed===0,time);
  }
 },near(x:number,z:number){return cars.some(c=>c.rig.root.visible&&Math.hypot(c.x-x,c.z-z)<2.3);},dispose(){cars.forEach(c=>c.rig.dispose());}};
}
