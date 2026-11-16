import {BOXES,walkable} from './world.ts';
import {clearSegment,createNavigator,type Point} from './pathfinding.ts';
// Broad-phase spatial bins avoid scanning all city collision boxes for each A* edge.
const bins=new Map<string,typeof BOXES>();
for(const b of BOXES){if(b.y0>=1.8||b.y1<=.1)continue;for(let x=Math.floor(b.x0/16);x<=Math.floor(b.x1/16);x++)for(let z=Math.floor(b.z0/16);z<=Math.floor(b.z1/16);z++){
 const key=`${x},${z}`;let list=bins.get(key);if(!list){list=[];bins.set(key,list);}list.push(b);
}}
export function cityClear(x:number,z:number,radius=.55){
 if(!walkable(x,z))return false;
 for(let bx=Math.floor((x-radius)/16);bx<=Math.floor((x+radius)/16);bx++)for(let bz=Math.floor((z-radius)/16);bz<=Math.floor((z+radius)/16);bz++)for(const b of bins.get(`${bx},${bz}`)??[]){
  const dx=x-Math.max(b.x0,Math.min(b.x1,x)),dz=z-Math.max(b.z0,Math.min(b.z1,z));if(dx*dx+dz*dz<radius*radius)return false;
 }return true;
}
export type RouteAgent=Point&{path:Point[];pathTime:number;goalX:number;goalZ:number};
export function routeAgent(x:number,z:number):RouteAgent{return {x,z,path:[],pathTime:0,goalX:Infinity,goalZ:Infinity};}
export function createCityNavigator(extraClear:(x:number,z:number)=>boolean=()=>true){
 const clear=(x:number,z:number)=>cityClear(x,z)&&extraClear(x,z),nav=createNavigator(clear);
 let budget=0;
 return {beginFrame(paths=2){budget=paths;},clear,
  next(agent:RouteAgent,goal:Point,dt:number):Point|null{
   agent.pathTime=Math.max(0,agent.pathTime-dt);
   if(clearSegment(agent,goal,clear))return goal;
   const changed=Math.hypot(goal.x-agent.goalX,goal.z-agent.goalZ)>5;
   if(agent.pathTime===0&&(changed||!agent.path.length)&&budget>0){budget--;agent.path=nav.route(agent,goal);agent.goalX=goal.x;agent.goalZ=goal.z;agent.pathTime=1;}
   while(agent.path.length&&Math.hypot(agent.x-agent.path[0]!.x,agent.z-agent.path[0]!.z)<.55)agent.path.shift();
   const next=agent.path[0];if(next&&!clearSegment(agent,next,clear)){agent.path=[];agent.pathTime=0;return null;}return next??null;
  }
 };
}
