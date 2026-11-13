import {walkable,pushOut,DROPS,HQ,BUSINESSES} from './world.ts';
import {facadeDoor} from './doorways.ts';
import {INTERIORS} from './interiors.ts';
import {HEISTS,MISSIONS,PROPERTIES} from './expansion.ts';
import {BLOCKS} from './campaign.ts';
import {WORK} from './lifestyle.ts';
import {STORIES,DISCOVERIES} from './city-stories.ts';
export type Point={x:number;z:number};
// All route markers and interaction ranges resolve to the same collision-free approach.
const approaches=new Map<string,Point>();
export function approach(point:Point):Point{
 const entry=INTERIORS.find(b=>b.x===point.x&&b.z===point.z);
 if(entry){const d=facadeDoor(entry);return {x:d.x,z:d.z};}
 const key=`${point.x},${point.z}`;const cached=approaches.get(key);if(cached)return cached;const remember=(p:Point)=>{if(approaches.size<500)approaches.set(key,p);return p;};
 if(walkable(point.x,point.z)&&!pushOut(point.x,point.z,.65).hit)return remember({x:point.x,z:point.z});
 for(let r=1;r<=24;r++)for(let i=0;i<32;i++){const a=i*Math.PI/16,x=point.x+Math.sin(a)*r,z=point.z+Math.cos(a)*r;if(walkable(x,z)&&!pushOut(x,z,.65).hit)return remember({x,z});}
 return remember({x:HQ.x,z:HQ.z});
}
export function atPoint(x:number,z:number,point:Point,radius=6){const p=approach(point);return Math.hypot(x-p.x,z-p.z)<=radius;}
export function destinationInterior(point:Point){
 return INTERIORS.find(b=>{const p=approach(b);return (b.x===point.x&&b.z===point.z)||Math.hypot(p.x-point.x,p.z-point.z)<.01;});
}
export type MapLocation=Point&{id:string;name:string;category:string;instruction:string;interiorId?:string};
let locationCache:MapLocation[]|null=null;
export function mapLocations():MapLocation[]{
 if(locationCache)return locationCache;
 const rows:MapLocation[]=[];
 const add=(id:string,name:string,category:string,p:Point,instruction:string)=>{
 const entry=destinationInterior(p);
 const building=category==='Buildings & homes'||category==='Businesses'||category==='Heists';
 rows.push({id,name,category,...approach(p),instruction:building?'ON FOOT · E / INTERACT at the signed door to enter. Walk to the service desk inside.':instruction,...(entry?{interiorId:entry.id}:{})});
 };
 INTERIORS.forEach(b=>add(`door:${b.id}`,b.name,'Buildings & homes',b,'ON FOOT · E / INTERACT to enter. Exit via the HUD button.'));
 HEISTS.forEach(h=>add(`heist:${h.id}`,`${h.name} — Recon`,'Heists',h,'E / INTERACT to gather recon. Crew Assembly and Execution continue in Empire → Heists.'));
 BUSINESSES.forEach(b=>add(`business:${b.id}`,b.name,'Businesses',b,'Enter the signed facade door to visit.'));
 PROPERTIES.forEach(p=>add(`property:${p.id}`,p.name,'Businesses',p,'Manage purchases and laundering in Empire → Properties. Use nearby cyan door markers to enter public rooms.'));
 BLOCKS.forEach(b=>add(`turf:${b.id}`,b.name,'Turf',b,'ON FOOT · E / INTERACT to start a turf fight or defense.'));
 MISSIONS.forEach(m=>m.steps.forEach((p,i)=>add(`mission:${m.id}:${i}`,`${m.name} · ${i+1}. ${p.name}`,'Mission stages',p,m.id==='parade'&&i===4?'Accept mission first. Escort the lead float for 40 seconds, then E at the finale.':'Accept mission first. E / INTERACT at this stage advances it.')));
 WORK.forEach(w=>{add(`work:${w.id}:0`,`${w.name} · Pickup`,'Work orders',w,'Accept in Jobs & Style first, then E / INTERACT to collect.');add(`work:${w.id}:1`,`${w.name} · Drop-off`,'Work orders',{x:w.dropX,z:w.dropZ},'After pickup, E / INTERACT to deliver.');});
 STORIES.forEach(m=>add(`story:${m.id}`,m.title,'Story contacts',m,'Choose chapter first, then E / INTERACT to begin encounter. Defeat rivals and return to Mama Nola.'));
 DISCOVERIES.forEach(d=>add(`cache:${d.id}`,d.name,'Discoveries',d,'E / INTERACT once to claim the cache; E again enters a nearby building.'));
 DROPS.forEach((d,i)=>add(`drop:${i}`,d.name,'Import delivery drops',d,'Active import deliveries complete automatically within 6m. No active contract means no payout.'));
 add('tutorial:delivery','Tutorial delivery drop','Tutorial',{x:0,z:60},'Drive the tutorial sedan into the ring. Completion is automatic; the marker clears after payout.');
 locationCache=rows;return rows;
}

/** Preserve action categories when a menu tracks a name rather than a directory row. */
export function namedDestination(point:Point,name:string):MapLocation|null{
 const rows=mapLocations(),exact=rows.find(r=>r.name===name);if(exact)return exact;
 const heist=HEISTS.find(h=>h.x===point.x&&h.z===point.z&&name.toLowerCase().includes(h.name.toLowerCase()));
 if(heist)return rows.find(r=>r.id===`heist:${heist.id}`)!;
 if(name==='Safehouse')return rows.find(r=>r.id==='door:hq')!;
 return null; // Turf, driving checkpoints and combat stages are not door interactions.
}
