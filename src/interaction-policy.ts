import type {Campaign} from './campaign.ts';
import {operationObjective} from './living-city.ts';
import {venturePoint} from './kingpin.ts';
import {atPoint} from './navigation.ts';
/** E always allows leaving a car unless it can actually advance a driving objective here. */
export function exitBeforeActivity(c:Campaign,x:number,z:number,car:{recovery:boolean;condition:number;passengerBoarded:boolean}){
 const venture=c.kingpin.active;
 if(venture){const point=venturePoint(c);return !(venture.kind==='shipment'&&venture.step===1&&venture.cargo>0&&point&&atPoint(x,z,point,8));}
 const operation=c.living.active;if(!operation)return false;
 const point=operationObjective(c);if(!point||!atPoint(x,z,point,8))return true;
 if(operation.id==='recovery')return !car.recovery||car.condition<=20;
 if(operation.id==='rescue')return operation.step!==1||!car.passengerBoarded;
 return true;
}
/** Try both doors and wider offsets; never place an exiting actor inside a facade. */
export function vehicleExit(car:{x:number;z:number;h:number},clear:(x:number,z:number)=>boolean){
 for(const distance of [2.4,3.2,4])for(const side of [1,-1])for(const along of [0,-2,2]){
  const x=car.x+Math.cos(car.h)*distance*side+Math.sin(car.h)*along,z=car.z-Math.sin(car.h)*distance*side+Math.cos(car.h)*along;
  if(clear(x,z))return {x,z};
 }return null;
}
