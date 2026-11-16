import {STREETS} from './world.ts';
import type {Point} from './pathfinding.ts';
import {createRoadNetwork} from './road-network.ts';
import {approach} from './navigation.ts';
import {cityClear} from './city-navigation.ts';
import {clearSegment} from './pathfinding.ts';
export function miniPoint(p:Point,focus:Point,scale=.45,radius=80){const x=(p.x-focus.x)*scale,y=(p.z-focus.z)*scale,length=Math.hypot(x,y),k=length>radius?radius/length:1;return {x:x*k,y:y*k,edge:length>radius};}
/** Advisory street route with safe pedestrian connectors; missing connectors remain unclaimed. */
export function createMapRoute(){const roads=createRoadNetwork();let key='',last:Point[]=[];return {path(from:Point,to:Point){const dest=approach(to),nextKey=`${Math.round(from.x/12)},${Math.round(from.z/12)}:${dest.x},${dest.z}`;if(key===nextKey)return last;key=nextKey;
 const start=roads.nearest(from),end=roads.nearest(dest),nodes=[roads.nodes[start]!,...roads.route(start,end).flatMap(e=>e.points)];
 last=[];if(clearSegment(from,nodes[0]!,cityClear))last.push({...from});last.push(...nodes.map(p=>({x:p.x,z:p.z})));if(clearSegment(nodes.at(-1)!,dest,cityClear))last.push(dest);return last;
 }};}
export function drawRoads(ctx:CanvasRenderingContext2D,focus:Point,scale=.45){ctx.strokeStyle='#48616c';ctx.lineWidth=6;for(const street of STREETS){ctx.beginPath();ctx.moveTo((-238-focus.x)*scale,(street-focus.z)*scale);ctx.lineTo((238-focus.x)*scale,(street-focus.z)*scale);ctx.stroke();ctx.beginPath();ctx.moveTo((street-focus.x)*scale,(-238-focus.z)*scale);ctx.lineTo((street-focus.x)*scale,(191-focus.z)*scale);ctx.stroke();}}
export function drawMapIcon(ctx:CanvasRenderingContext2D,x:number,y:number,color:string,shape:'circle'|'square'|'diamond'|'triangle',size=3){ctx.fillStyle=color;ctx.strokeStyle='#07141d';ctx.lineWidth=1;ctx.beginPath();if(shape==='circle')ctx.arc(x,y,size,0,Math.PI*2);else if(shape==='square')ctx.rect(x-size,y-size,size*2,size*2);else if(shape==='diamond'){ctx.moveTo(x,y-size-1);ctx.lineTo(x+size+1,y);ctx.lineTo(x,y+size+1);ctx.lineTo(x-size-1,y);ctx.closePath();}else{ctx.moveTo(x,y-size-1);ctx.lineTo(x+size,y+size);ctx.lineTo(x-size,y+size);ctx.closePath();}ctx.fill();ctx.stroke();}
