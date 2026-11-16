export type RescuePassenger={hp:number;x:number;z:number;boarded:boolean;boarding:number;vehicleKey:string;impactCooldown:number};
export function newPassenger(x=0,z=0):RescuePassenger{return {hp:100,x,z,boarded:false,boarding:0,vehicleKey:'',impactCooldown:0};}
export function restorePassenger(v:any):RescuePassenger{
 const p=newPassenger();if(!v||typeof v!=='object')return p;
 const n=(v:unknown,f:number,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):f;
 p.hp=n(v.hp,100,0,100);p.x=n(v.x,0,-238,238);p.z=n(v.z,0,-238,232);
 // Vehicles are re-created on load. Keep health/location, not stale attachment or animation state.
 return p;
}
export function damagePassenger(p:RescuePassenger,amount:number,protectedByCar=false){
 if(!Number.isFinite(amount)||amount<=0||p.hp<=0)return 0;
 const damage=Math.min(p.hp,amount*(protectedByCar?.4:1));p.hp-=damage;return damage;
}
export function updateBoarding(p:RescuePassenger,dt:number,vehicle:{key:string;distance:number;speed:number;hasSeat:boolean}|null){
 if(!vehicle||!vehicle.hasSeat){p.boarded=false;p.boarding=0;p.vehicleKey='';return false;}
 if(p.vehicleKey&&p.vehicleKey!==vehicle.key){p.boarded=false;p.boarding=0;}
 if(p.boarded&&p.vehicleKey===vehicle.key)return true;
 if(vehicle.distance>2.8||Math.abs(vehicle.speed)>1.5){p.boarding=0;p.vehicleKey='';return false;}
 p.vehicleKey=vehicle.key;p.boarding=Math.min(1,p.boarding+dt/1.1);p.boarded=p.boarding>=1;return p.boarded;
}

export function passengerTrafficImpact(p:RescuePassenger,dt:number,vehicles:readonly {x:number;z:number;speed:number}[]){
 p.impactCooldown=Math.max(0,p.impactCooldown-dt);
 if(p.boarded||p.impactCooldown>0||p.hp<=0)return 0;
 const vehicle=vehicles.find(v=>Math.abs(v.speed)>5&&Math.hypot(p.x-v.x,p.z-v.z)<2.1);
 if(!vehicle)return 0;p.impactCooldown=1.2;return damagePassenger(p,Math.min(45,Math.abs(vehicle.speed)*1.5));
}
