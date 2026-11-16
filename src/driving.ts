export type DriveState={speed:number;steer:number;h:number;gripHeading:number;condition:number;impactCooldown:number};
export function handlingProfile(style:number){
 const bike=style===6,heavy=[4,8,9].includes(style),sport=[2,7,11].includes(style),offroad=[5,13].includes(style);
 return {accel:heavy?13:bike?28:sport?30:20,max:heavy?23:bike?36:sport?38:offroad?28:30,turn:bike?2.4:heavy?1.25:sport?2:1.8,grip:heavy?5:offroad?9:sport?7:8,brake:heavy?27:sport?43:36};
}
export function driveStep(c:DriveState,style:number,dt:number,throttle:number,steer:number,brake:boolean,handbrake:boolean,boost:boolean,performance:number,tires=0){
 const p=handlingProfile(style);c.impactCooldown=Math.max(0,c.impactCooldown-dt);
 const health=.45+.55*c.condition/100;
 if(throttle)c.speed+=throttle*p.accel*(Math.sign(throttle)!==Math.sign(c.speed)&&Math.abs(c.speed)>1?2.3:1)*dt;
 else c.speed*=Math.exp(-.45*dt);
 if(boost)c.speed+=p.accel*1.3*dt;
 const stopping=(brake?p.brake*(1+tires*.12):0)+(handbrake?18:0);
 c.speed-=Math.sign(c.speed)*Math.min(Math.abs(c.speed),stopping*dt);
 c.speed=Math.max(-9,Math.min(p.max*performance*health*(boost?1.35:1),c.speed));
 c.steer+=(steer-c.steer)*(1-Math.exp(-8*dt));
 c.h+=c.steer*p.turn*Math.max(-1,Math.min(1,c.speed/7))*(1-Math.min(.65,Math.abs(c.speed)/75))*(handbrake?1.55:1)*dt;
 const delta=Math.atan2(Math.sin(c.h-c.gripHeading),Math.cos(c.h-c.gripHeading));
 c.gripHeading+=delta*(1-Math.exp(-(handbrake?1.8:p.grip+tires*2)*dt));
 return {dx:Math.sin(c.gripHeading)*c.speed*dt,dz:Math.cos(c.gripHeading)*c.speed*dt,skid:Math.abs(c.speed)>9&&(handbrake||Math.abs(delta)>.2)};
}
export function impactVehicle(c:DriveState,speed:number,armor=0){
 if(c.impactCooldown>0||speed<6)return 0;
 c.impactCooldown=.8;const damage=Math.max(1,(speed-4)*1.5*(1-Math.min(.8,armor)));
 c.condition=Math.max(0,c.condition-damage);return damage;
}
