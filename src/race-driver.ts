import {createRoadNetwork,approachSpeed,headingDelta,inFront} from './road-network.ts';
import {cityClear} from './city-navigation.ts';
import type {Point} from './pathfinding.ts';
export type RaceDriver={x:number;z:number;heading:number;speed:number;checkpoint:number;waypoints:Point[];finished:boolean;elapsed:number;blocked:number};
/** Opponents accelerate, steer around road junctions, brake for traffic, and can be bumped. */
export function createRaceDriver(points:readonly Point[],topSpeed=9){
 const network=createRoadNetwork();const first=network.nodes[network.nearest(points[0]!)]!;
 const state:RaceDriver={x:first.x,z:first.z,heading:0,speed:0,checkpoint:1,waypoints:[],finished:false,elapsed:0,blocked:0};let node=first.id;
 return {state,update(dt:number,obstacles:readonly Point[]=[]){
  if(state.finished)return;state.elapsed+=dt;
  if(!state.waypoints.length){const goal=network.nearest(points[state.checkpoint]!);const route=network.route(node,goal);state.waypoints=route.flatMap(e=>e.points.map(p=>({...p})));node=goal;
   if(!state.waypoints.length){state.checkpoint++;if(state.checkpoint>=points.length){state.finished=true;return;}}
  }
  let target=state.waypoints[0];while(target&&Math.hypot(target.x-state.x,target.z-state.z)<.35){state.waypoints.shift();target=state.waypoints[0];}
  if(!target){if(state.checkpoint>=points.length-1)state.finished=true;else state.checkpoint++;return;}
  const heading=Math.atan2(target.x-state.x,target.z-state.z),delta=headingDelta(state.heading,heading);
  const obstructed=obstacles.some(o=>inFront(state,state.heading,o,5,2.2));
  state.blocked=obstructed?state.blocked+dt:0;
  const desired=obstructed?0:Math.abs(delta)>.25?4:topSpeed;
  state.speed=approachSpeed(state.speed,desired,dt);state.heading+=Math.max(-3*dt,Math.min(3*dt,delta));
  const step=Math.min(Math.hypot(target.x-state.x,target.z-state.z),state.speed*dt);
  const x=state.x+Math.sin(state.heading)*step,z=state.z+Math.cos(state.heading)*step;
  if(cityClear(x,z,1.4)){state.x=x;state.z=z;}else state.speed=0;
 }};
}
