import * as THREE from 'three';
import {createPerson,type Person} from './actors.ts';
export type IndoorNpc={person:Person;role:'cashier'|'customer'|'security';x:number;z:number;goal:number;subdued:boolean};
/** Small, room-local crowd. Customers never block objectives; frightened people seek the exit. */
export function createInteriorLife(scene:THREE.Scene,obstacles:readonly {x:number;z:number;w:number;d:number}[],seed:number,security:boolean,customers=4){
 const clear=(x:number,z:number)=>Math.abs(x)<6.3&&Math.abs(z)<7.3&&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.45&&Math.abs(z-o.z)<o.d/2+.45);
 const spots:{x:number;z:number}[]=[];for(const x of [-2.4,2.4,-.9,.9])for(const z of [4.4,1.8,-1.8,-3.6])if(clear(x,z))spots.push({x,z});
 const npcs:IndoorNpc[]=[];
 function add(role:IndoorNpc['role'],x:number,z:number,i:number){const person=createPerson(role==='security'?'cop':'civilian',seed+i*3);person.root.position.set(x,0,z);scene.add(person.root);npcs.push({person,role,x,z,goal:i%spots.length,subdued:false});}
 if(customers>0)add('cashier',-2.8,-6.5,0);spots.slice(0,customers).forEach((p,i)=>add('customer',p.x,p.z,i+1));if(security)add('security',0,1.8,7);
 let clock=0;const bagGeo=new THREE.BoxGeometry(.55,.45,.28),bagMat=new THREE.MeshStandardMaterial({color:0x443328});const bag=new THREE.Mesh(bagGeo,bagMat);bag.visible=false;scene.add(bag);
 return {npcs,update(dt:number,px:number,pz:number,alarmed:boolean,carrying:boolean){clock+=dt;
  let damage=0;for(const n of npcs){let moving=0;
   if(n.subdued){n.person.pose('surrender',0,clock,0,dt);continue;}
   const panic=alarmed&&n.role!=='security';let goal=n.role==='security'&&alarmed?{x:px,z:pz}:panic?{x:n.x<0?-1.5:1.5,z:6.4}:spots[(n.goal+Math.floor(clock/6))%spots.length]!;
   if(n.role==='cashier')goal={x:n.x,z:n.z};
   const d=Math.hypot(goal.x-n.x,goal.z-n.z),pace=alarmed?2.6:.6;
   if(d>.25){const step=Math.min(d,pace*dt),dx=(goal.x-n.x)/d*step,dz=(goal.z-n.z)/d*step;if(clear(n.x+dx,n.z))n.x+=dx;if(clear(n.x,n.z+dz))n.z+=dz;n.person.root.rotation.y=Math.atan2(dx,dz);moving=pace;}
   n.person.root.position.set(n.x,0,n.z);n.person.pose(panic&&n.z>5.5?'surrender':moving?'walk':alarmed?'aim':'idle',moving,clock,0,dt);
   if(n.role==='security'&&alarmed&&Math.hypot(n.x-px,n.z-pz)<1.3)damage+=8*dt;
  }
  bag.visible=carrying;bag.position.set(px+.45,.7,pz);return damage;
 },subdue(x:number,z:number){const n=npcs.find(n=>n.role==='security'&&!n.subdued&&Math.hypot(x-n.x,z-n.z)<2);if(!n)return false;n.subdued=true;return true;},dispose(){npcs.forEach(n=>n.person.dispose());bag.removeFromParent();bagGeo.dispose();bagMat.dispose();}};
}
