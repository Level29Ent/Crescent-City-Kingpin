export type Pursuit = {phase:'clear'|'detection'|'pursuit'|'search'|'escaped';exposure:number;lost:number;lastX:number;lastZ:number;escapedFor:number};
export function newPursuit():Pursuit{return {phase:'clear',exposure:0,lost:0,lastX:0,lastZ:0,escapedFor:0};}
/** Only a witness with line of sight updates the last-known position. No player tracking in search. */
export function tickPursuit(p:Pursuit,dt:number,heat:number,seen:boolean,x:number,z:number){
 if(heat<30){if(p.phase!=='escaped')Object.assign(p,newPursuit());else{p.escapedFor-=dt;if(p.escapedFor<=0)Object.assign(p,newPursuit());}return false;}
 if(p.phase==='clear'||p.phase==='escaped'){p.phase='detection';p.exposure=0;p.lost=0;}
 if(seen){p.lastX=x;p.lastZ=z;p.lost=0;p.exposure=Math.min(1,p.exposure+dt/1.5);if(p.exposure>=1||p.phase==='search')p.phase='pursuit';}
 else if(p.phase==='detection'){p.exposure=Math.max(0,p.exposure-dt*.4);p.lost+=dt;if(p.lost>=18+heat*.12){p.phase='escaped';p.escapedFor=5;return true;}}
 else {p.lost+=dt;if(p.lost>=3)p.phase='search';if(p.lost>=18+heat*.12){p.phase='escaped';p.escapedFor=5;p.exposure=0;return true;}}
 return false;
}
export function pursuitLabel(p:Pursuit,heat:number){
 return p.phase==='detection'?`DETECTION ${Math.round(p.exposure*100)}% · break sight`:p.phase==='search'?`SEARCH · stay hidden ${Math.max(0,Math.ceil(18+heat*.12-p.lost))}s`:p.phase==='pursuit'?'PURSUIT · break line of sight':p.phase==='escaped'?'ESCAPED · heat cleared':'CLEAR';
}
