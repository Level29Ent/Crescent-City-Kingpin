// Ray/sphere intersections give actual head/body volumes instead of projecting every hit onto chest height.
export function sphereHit(ox:number,oy:number,oz:number,dx:number,dy:number,dz:number,cx:number,cy:number,cz:number,r:number):number|null{
 const x=ox-cx,y=oy-cy,z=oz-cz,b=x*dx+y*dy+z*dz,c=x*x+y*y+z*z-r*r,d=b*b-c;
 if(d<0)return null;const near=-b-Math.sqrt(d),far=-b+Math.sqrt(d);return near>=0?near:far>=0?far:null;
}
export function actorHit(ox:number,oy:number,oz:number,dx:number,dy:number,dz:number,x:number,z:number,range:number){
 const head=sphereHit(ox,oy,oz,dx,dy,dz,x,1.7,z,.24);
 const body=[.45,.85,1.2].map(y=>sphereHit(ox,oy,oz,dx,dy,dz,x,y,z,.38)).filter((n):n is number=>n!==null&&n<=range);
 const torso=body.length?Math.min(...body):Infinity;
 return head!==null&&head<=range&&head<torso?{t:head,head:true}:torso<Infinity?{t:torso,head:false}:null;
}
export function damageFalloff(distance:number,range:number){return Math.max(.55,1-Math.max(0,distance/range-.35)*.6);}
export function spreadMultiplier(aim:boolean,crouch:boolean,moving:boolean,bloom:number){return (aim?.4:1)*(crouch?.65:1)*(moving?1.35:1)*(1+Math.min(1.5,Math.max(0,bloom)));}
