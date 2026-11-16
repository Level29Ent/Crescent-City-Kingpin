export type BossPattern={phase:'windup'|'attack'|'recover';timer:number;heading:number;shots:number};
export function newBossPattern():BossPattern{return {phase:'recover',timer:1.8,heading:0,shots:0};}
export function bossStyle(district:number){return district===1?'brawler':district===2?'marksman':district===3?'burst':'ambusher';}
/** Telegraph locks the attack heading; dodge out of the cone or break sight before release. */
export function tickBoss(p:BossPattern,district:number,dt:number,heading:number,visible:boolean,distance:number,canAttack=true,exposed=true){
 // Stagger restarts recovery; hiding pauses the clock so a long windup can span peek cycles.
 if(!canAttack){p.phase='recover';p.timer=1.8;p.shots=0;}
 const style=bossStyle(district);const active=canAttack&&exposed;if(active)p.timer=Math.max(0,p.timer-dt);let fire=false;
 if(active&&p.phase==='recover'&&p.timer===0&&visible){p.phase='windup';p.timer=style==='marksman'?1.7:style==='burst'?1.2:1;p.heading=heading;}
 else if(active&&p.phase==='windup'&&p.timer===0){p.phase='attack';p.shots=style==='burst'?3:1;p.timer=0;}
 if(active&&p.phase==='attack'&&p.timer===0){fire=visible&&distance<(style==='brawler'?10:style==='marksman'?60:35);p.shots--;p.timer=.22;if(p.shots<=0){p.phase='recover';p.timer=style==='burst'?2.8:style==='brawler'?1.7:2.2;}}
 return {fire,heading:p.heading,damage:style==='brawler'?17:style==='marksman'?15:style==='burst'?6:10,cone:style==='marksman'?.12:style==='brawler'?.6:.28,speed:style==='brawler'?4.5:style==='ambusher'?4:2.6,telegraph:active&&p.phase==='windup'};
}
export function insideBossCone(locked:number,current:number,cone:number){return Math.abs(Math.atan2(Math.sin(current-locked),Math.cos(current-locked)))<=cone;}
