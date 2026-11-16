export type DistrictActor={kind:string;district:number;blockId?:string;dead:number};
/** Rewards depend on the attack source; clearing a district does not. */
export function districtReadyForBoss(district:number,actors:readonly DistrictActor[],bossOut:ReadonlySet<number>,captured:ReadonlySet<number>){
 return district>0&&district<5&&!bossOut.has(district)&&!captured.has(district)&&!actors.some(f=>f.kind==='gangster'&&f.district===district&&!f.blockId&&!f.dead);
}
