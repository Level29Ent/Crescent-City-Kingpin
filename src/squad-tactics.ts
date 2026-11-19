import type {Point} from './pathfinding.ts';
/** Roles alternate per actor so a squad doesn't all rush or choose the same side. */
export function squadDecision(serial:number,time:number,hp:number,allies:number,seen:boolean,distance:number){const role=serial%3;return {role:role===0?'anchor':role===1?'left':'right',suppress:seen&&role===0&&hp>30&&allies>0&&distance>10&&distance<38,flank:seen&&role!==0&&allies>0&&hp>30&&distance>12&&distance<40&&Math.floor(time/4)%2===serial%2,side:role===1?-1:1};}
export function flankPoint(from:Point,threat:Point,side:number,clear:(x:number,z:number)=>boolean){const h=Math.atan2(threat.x-from.x,threat.z-from.z),goal={x:threat.x+Math.cos(h)*side*10-Math.sin(h)*8,z:threat.z-Math.sin(h)*side*10-Math.cos(h)*8};return clear(goal.x,goal.z)?goal:null;}
