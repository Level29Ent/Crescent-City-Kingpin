import type {Campaign} from './campaign.ts';
import {INTERIORS} from './interiors.ts';
export const SUPPLY_POINT={x:0,z:1};
export function atSupply(x:number,z:number){return Math.hypot(x-SUPPLY_POINT.x,z-SUPPLY_POINT.z)<=1.25;}
/** Supplies require explicit on-site interaction; no repeat claims or passive rewards. */
export function inspectSupplies(c:Campaign,id:string,x:number,z:number){
 const room=INTERIORS.find(b=>b.id===id);
 if(!room||!atSupply(x,z)||c.lifestyle.inspected.includes(id))return null;
 const mechanical=room.theme==='warehouse'||room.theme==='garage';
 if(!mechanical&&c.lifestyle.medkits>=5)return 'Medkit pouch full (5). Use one before collecting this supply.';
 c.lifestyle.inspected.push(id);
 if(mechanical){c.expansion.parts++;return 'Workshop supplies: +1 garage part. This room is now searched.';}
 c.lifestyle.medkits++;return 'First-aid supplies: +1 medkit. Press H / MEDKIT to restore 35 health.';
}
export function useMedkit(c:Campaign,hp:number){
 if(!Number.isFinite(hp)||hp<=0||hp>=100||c.lifestyle.medkits<1)return hp;
 c.lifestyle.medkits--;return Math.min(100,hp+35);
}
