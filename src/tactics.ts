import type {Point} from './pathfinding.ts';
export type CoverChoice={id:number;hide:Point;peek:Point;until:number};
/** Reservations prevent every combatant occupying the same sandbag. */
export function createCoverPlanner(walls:readonly Point[],clear:(x:number,z:number)=>boolean){
 const claims=new Map<number,{owner:number;until:number}>();
 return {release(owner:number){for(const [id,c]of claims)if(c.owner===owner)claims.delete(id);},
  choose(owner:number,from:Point,threat:Point,time:number):CoverChoice|null{
   let best:CoverChoice|null=null,score=Infinity;
   for(let id=0;id<walls.length;id++){
    const w=walls[id]!,claim=claims.get(id);if(claim&&claim.owner!==owner&&claim.until>time)continue;
    const side=threat.z>=w.z?-1:1,hide={x:w.x,z:w.z+side*1.4};
    const range=Math.hypot(from.x-hide.x,from.z-hide.z),threatRange=Math.hypot(threat.x-w.x,threat.z-w.z);
    if(range>32||threatRange<7||threatRange>55||!clear(hide.x,hide.z))continue;
    const peek={x:w.x+(from.x<w.x?-2.3:2.3),z:w.z+side*1.4};if(!clear(peek.x,peek.z))continue;
    const s=range+Math.abs(threatRange-20)*.15;if(s<score){score=s;best={id,hide,peek,until:time+4};}
   }
   if(best)claims.set(best.id,{owner,until:best.until});return best;
  },count(){return claims.size;}
 };
}
export function coverPhase(time:number,seed:number){return ((time+seed*.37)%3.6)<2.2?'hide':'peek';}
