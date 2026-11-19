export type ActionMotion={height:number;vertical:number;dodge:number;cooldown:number;dx:number;dz:number};
export function newActionMotion():ActionMotion{return {height:0,vertical:0,dodge:0,cooldown:0,dx:0,dz:0};}
export function startJump(m:ActionMotion,stamina:number){if(m.height>0||m.vertical!==0||m.dodge>0||stamina<10)return false;m.vertical=5.2;return true;}
export function startDodge(m:ActionMotion,stamina:number,x:number,z:number){if(m.height>0||m.vertical!==0||m.cooldown>0||stamina<18)return false;const d=Math.hypot(x,z)||1;m.dx=x/d;m.dz=z/d;m.dodge=.36;m.cooldown=1.2;return true;}
/** Horizontal collision is still owned by slide(); jumps never bypass walls or grant invulnerability. */
export function tickActionMotion(m:ActionMotion,dt:number){
 dt=Math.max(0,Math.min(.1,dt));m.cooldown=Math.max(0,m.cooldown-dt);const dodgeTime=Math.min(m.dodge,dt);m.dodge=Math.max(0,m.dodge-dt);
 if(m.vertical!==0||m.height>0){m.height+=m.vertical*dt-9*dt*dt;m.vertical-=18*dt;if(m.height<=0){m.height=0;m.vertical=0;}}
 return {x:m.dx*8*dodgeTime,z:m.dz*8*dodgeTime};
}
export function steerResponse(steer:number,speed:number){return Math.max(-1,Math.min(1,steer))/(1+Math.max(0,Math.abs(speed)-12)*.018);}
export function movementHeading(yaw:number,forward:number,side:number){const d=Math.max(1,Math.hypot(forward,side));return {x:(Math.sin(yaw)*forward-Math.cos(yaw)*side)/d,z:(Math.cos(yaw)*forward+Math.sin(yaw)*side)/d};}
export function nextOwnedWeapon(owned:readonly boolean[],current:number,direction:number){for(let i=1;i<=owned.length;i++){const next=(current+Math.sign(direction)*i+owned.length*2)%owned.length;if(owned[next])return next;}return current;}
