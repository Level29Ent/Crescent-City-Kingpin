import {STREETS} from './world.ts';
import {cityClear} from './city-navigation.ts';
import {clearSegment,MinHeap,type Point} from './pathfinding.ts';
const directions=[{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}];
export type RoadNode=Point&{id:number;ix:number;iz:number;dir:number};
export type RoadEdge={to:number;points:Point[];length:number};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Directed lanes with sampled quadratic junction turns; every edge is collision validated. */
export function createRoadNetwork(clear:(x:number,z:number)=>boolean=(x,z)=>cityClear(x,z,1.4)){
 const nodes:RoadNode[]=[],edges=new Map<number,RoadEdge[]>(),lookup=new Map<string,number>();
 for(let iz=0;iz<STREETS.length;iz++)for(let ix=0;ix<STREETS.length;ix++)for(let dir=0;dir<4;dir++){
  const d=directions[dir]!,nx=ix+d.x,nz=iz+d.z;if(nx<0||nz<0||nx>=STREETS.length||nz>=STREETS.length)continue;
  const p={x:STREETS[ix]!+d.x*9+d.z*2.7,z:STREETS[iz]!+d.z*9-d.x*2.7};if(!clear(p.x,p.z))continue;
  const id=nodes.length;nodes.push({...p,id,ix,iz,dir});lookup.set(`${ix},${iz},${dir}`,id);
 }
 for(const n of nodes){
  const d=directions[n.dir]!,ix=n.ix+d.x,iz=n.iz+d.z,cx=STREETS[ix]!,cz=STREETS[iz]!;
  const entry={x:cx-d.x*9+d.z*2.7,z:cz-d.z*9-d.x*2.7};
  const options:RoadEdge[]=[];
  for(let turn=0;turn<4;turn++){
   const id=lookup.get(`${ix},${iz},${turn}`);if(id===undefined)continue;const end=nodes[id]!;
   // U-turns are excluded; unsafe dead-end lanes are removed below.
   if(turn===(n.dir+2)%4)continue;
   const control=n.dir===turn?{x:(entry.x+end.x)/2,z:(entry.z+end.z)/2}:d.x===0?{x:entry.x,z:end.z}:{x:end.x,z:entry.z};
   const points:Point[]=[entry];for(let i=1;i<=18;i++){const t=i/18,u=1-t;points.push({x:u*u*entry.x+2*u*t*control.x+t*t*end.x,z:u*u*entry.z+2*u*t*control.z+t*t*end.z});}
   let last:Point=n,length=0,valid=true;for(const p of points){if(!clearSegment(last,p,clear)){valid=false;break;}length+=distance(last,p);last=p;}
   if(valid)options.push({to:id,points,length});
  }edges.set(n.id,options);
 }
 // Bayou ponds and facade props can sever a nominal street. Keep the largest
 // strongly-connected lane component rather than spawning cars in an inescapable stub.
 const seen=new Set<number>(),order:number[]=[];
 function visit(id:number){if(seen.has(id))return;seen.add(id);for(const e of edges.get(id)??[])visit(e.to);order.push(id);}
 for(const n of nodes)visit(n.id);
 const reverse=new Map<number,number[]>();for(const [id,list]of edges)for(const e of list){const incoming=reverse.get(e.to)??[];incoming.push(id);reverse.set(e.to,incoming);}
 seen.clear();let largest:number[]=[];
 function collect(id:number,group:number[]){if(seen.has(id))return;seen.add(id);group.push(id);for(const previous of reverse.get(id)??[])collect(previous,group);}
 for(const id of order.reverse()){if(seen.has(id))continue;const group:number[]=[];collect(id,group);if(group.length>largest.length)largest=group;}
 largest.sort((a,b)=>a-b);const ids=new Map(largest.map((old,i)=>[old,i]));
 const safeNodes=largest.map(old=>({...nodes[old]!,id:ids.get(old)!}));
 const safeEdges=new Map<number,RoadEdge[]>();for(const old of largest)safeEdges.set(ids.get(old)!,(edges.get(old)??[]).filter(e=>ids.has(e.to)).map(e=>({...e,to:ids.get(e.to)!})));
 nodes.splice(0,nodes.length,...safeNodes);edges.clear();for(const [id,list]of safeEdges)edges.set(id,list);
 return {nodes,edges,nearest(p:Point){let id=0,best=Infinity;for(const n of nodes){const d=distance(n,p);if(d<best){best=d;id=n.id;}}return id;},
  component(blocked:(a:Point,b:Point,edge:RoadEdge)=>boolean){
   const allowed=new Map<number,RoadEdge[]>();for(const [id,list]of edges)allowed.set(id,list.filter(e=>!blocked(nodes[id]!,nodes[e.to]!,e)));
   const visited=new Set<number>(),sorted:number[]=[],back=new Map<number,number[]>();
   function dfs(id:number){if(visited.has(id))return;visited.add(id);for(const e of allowed.get(id)??[])dfs(e.to);sorted.push(id);}
   for(const n of nodes)dfs(n.id);for(const [id,list]of allowed)for(const e of list){const row=back.get(e.to)??[];row.push(id);back.set(e.to,row);}
   visited.clear();let best:number[]=[];
   function gather(id:number,result:number[]){if(visited.has(id))return;visited.add(id);result.push(id);for(const next of back.get(id)??[])gather(next,result);}
   for(const id of sorted.reverse()){if(visited.has(id))continue;const group:number[]=[];gather(id,group);if(group.length>best.length)best=group;}
   return new Set(best.length>1?best:[]);
  },
  route(start:number,goal:number,blocked:(a:Point,b:Point,edge:RoadEdge)=>boolean=()=>false):RoadEdge[]{
   if(start===goal)return [];const open=new MinHeap<number>(),cost=new Map([[start,0]]),parent=new Map<number,{from:number;edge:RoadEdge}>();open.push(start,0);const closed=new Set<number>();
   while(open.size){const id=open.pop()!;if(closed.has(id))continue;if(id===goal){const result:RoadEdge[]=[];let k=id;while(k!==start){const p=parent.get(k)!;result.push(p.edge);k=p.from;}return result.reverse();}closed.add(id);
    for(const edge of edges.get(id)??[]){if(blocked(nodes[id]!,nodes[edge.to]!,edge))continue;const g=cost.get(id)!+edge.length;if(g>=(cost.get(edge.to)??Infinity))continue;cost.set(edge.to,g);parent.set(edge.to,{from:id,edge});open.push(edge.to,g+distance(nodes[edge.to]!,nodes[goal]!));}
   }return [];
  }
 };
}
export function approachSpeed(speed:number,target:number,dt:number){return speed+Math.max(-12*dt,Math.min(5*dt,target-speed));}
export function headingDelta(from:number,to:number){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
export function trafficLight(time:number,horizontal:boolean){const phase=((time%20)+20)%20;return horizontal?phase>=11&&phase<19:phase>=1&&phase<9;}
export function inFront(a:Point,heading:number,b:Point,length=10,width=2.6){const dx=b.x-a.x,dz=b.z-a.z,forward=dx*Math.sin(heading)+dz*Math.cos(heading),side=dx*Math.cos(heading)-dz*Math.sin(heading);return forward>0&&forward<length&&Math.abs(side)<width;}
