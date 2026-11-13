import {BUILDINGS,walkable,pushOut,type Building} from './world.ts';
export type Doorway={x:number;z:number;wallX:number;wallZ:number;nx:number;nz:number;building:Building};
const cache=new Map<string,Doorway>();
/** Find a real facade with a clear two-metre approach, never a street-centre portal. */
export function facadeDoor(point:{x:number;z:number}):Doorway{
 const key=`${point.x},${point.z}`;const cached=cache.get(key);if(cached)return cached;
 const candidates:Doorway[]=[];
 for(const b of BUILDINGS){
  if(b.h<4)continue; // Cemetery boundary walls are not enterable buildings.
  const clamp=(v:number,a:number,c:number)=>Math.max(a,Math.min(c,v));
  for(const side of [0,1,2,3]){
   const horizontal=side<2,length=horizontal?b.x1-b.x0:b.z1-b.z0;
   if(length<3)continue;
   const base=horizontal?b.x0:b.z0;
   const preferred=clamp(horizontal?point.x:point.z,base+1.4,base+length-1.4);
   for(const along of [...new Set([preferred,base+length/2,base+length*.25,base+length*.75])]){
    const nx=horizontal?0:side===2?-1:1,nz=horizontal?(side===0?-1:1):0;
    const wallX=horizontal?along:side===2?b.x0:b.x1,wallZ=horizontal?(side===0?b.z0:b.z1):along;
    const x=wallX+nx*2,z=wallZ+nz*2;
    if(![.9,1.4,2,2.6].every(d=>walkable(wallX+nx*d,wallZ+nz*d)&&!pushOut(wallX+nx*d,wallZ+nz*d,.65).hit))continue;
    candidates.push({x,z,wallX,wallZ,nx,nz,building:b});
   }
  }
 }
 candidates.sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z));
 // The generated map must always supply at least one reachable building facade.
 const door=candidates[0];if(!door)throw new Error(`No reachable building entrance for ${key}`);
 cache.set(key,door);return door;
}
