import type {Campaign} from './campaign.ts';
export const WORK = [
 {id:'catering',name:'Po-boy Catering Run',x:30,z:4,dropX:0,dropZ:60,pay:220,duration:110,description:'Collect food at Mama Nola’s and deliver it. Clean earnings; no contraband.'},
 {id:'salvage',name:'Warehouse Salvage',x:60,z:120,dropX:-60,dropZ:0,pay:350,duration:150,description:'Move salvaged mechanical supplies to the chop shop. Clean pay and two parts.'},
 {id:'jazz',name:'Jazz Club Equipment Courier',x:0,z:-60,dropX:60,dropZ:-60,pay:280,duration:120,description:'Carry a band’s equipment from the lounge to Marigny. Earn clean money.'},
 {id:'fence',name:'Recover a Missing Art Crate',x:180,z:0,dropX:-120,dropZ:60,pay:850,duration:180,description:'A high-risk recovery for the fence. Pays dirty cash and adds heat.'},
] as const;
export type Lifestyle={hairStyle:number;accessory:number;beard:boolean;safehouseTheme:number;lightColor:number;rug:boolean;art:boolean;work:null|{id:string;step:number;t:number};workCooldown:number;workCompleted:number;lookSensitivity:number;invertLook:boolean;carStyle:Record<string,{spoiler:boolean;stripe:boolean;glowColor:number;rimColor:number}>};
export function newLifestyle():Lifestyle{return {hairStyle:0,accessory:0,beard:false,safehouseTheme:0,lightColor:0,rug:false,art:false,work:null,workCooldown:0,workCompleted:0,lookSensitivity:1,invertLook:false,carStyle:{}};}
export function restoreLifestyle(v:any):Lifestyle{
 const s=newLifestyle();if(!v||typeof v!=='object')return s;
 const num=(v:any,f=0,max=1e9)=>typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,v)):f;
 for(const k of ['hairStyle','accessory','safehouseTheme','lightColor'] as const)s[k]=Math.floor(num(v[k],0,k==='accessory'?3:k==='hairStyle'?3:2));
 for(const k of ['beard','rug','art','invertLook'] as const)s[k]=v[k]===true;
 s.lookSensitivity=Math.max(.4,num(v.lookSensitivity,1,2));s.workCooldown=num(v.workCooldown,0,120);s.workCompleted=Math.floor(num(v.workCompleted));
 const work=WORK.find(w=>w.id===v.work?.id);if(work)s.work={id:work.id,step:Math.floor(num(v.work.step,0,1)),t:num(v.work.t,work.duration,work.duration)};
 if(v.carStyle&&typeof v.carStyle==='object')for(const key of Object.keys(v.carStyle).filter(k=>/^[0-7]$/.test(k))){const c=v.carStyle[key];if(c&&typeof c==='object')s.carStyle[key]={spoiler:c.spoiler===true,stripe:c.stripe===true,glowColor:Math.floor(num(c.glowColor,0,2)),rimColor:Math.floor(num(c.rimColor,0,2))};}return s;
}
export function startWork(c:Campaign,id:string){const work=WORK.find(w=>w.id===id);if(!work||c.lifestyle.work||c.lifestyle.workCooldown>0||c.cityStories.active||c.expansion.mission||(c.legacy.daily&&!c.legacy.daily.finished)||c.legacy.tutorial<3)return false;c.lifestyle.work={id,step:0,t:work.duration};return true;}
export function workObjective(c:Campaign){const active=c.lifestyle.work;if(!active)return null;const w=WORK.find(w=>w.id===active.id)!;return {x:active.step?w.dropX:w.x,z:active.step?w.dropZ:w.z,text:`${w.name} · ${active.step?'Deliver':'Collect'} · ${Math.ceil(active.t)}s`};}
export function workInteract(c:Campaign,x:number,z:number){const active=c.lifestyle.work,point=workObjective(c);if(!active||!point||Math.hypot(x-point.x,z-point.z)>7)return null;if(active.step===0){active.step=1;return 'Cargo collected. Follow the marked drop-off.';}const w=WORK.find(w=>w.id===active.id)!;if(w.id==='fence'){c.dirty+=w.pay;c.heat=Math.min(100,c.heat+8);}else c.clean+=w.pay;if(w.id==='salvage')c.expansion.parts+=2;c.lifestyle.work=null;c.lifestyle.workCooldown=45;c.lifestyle.workCompleted++;return `${w.name} complete: +$${w.pay} ${w.id==='fence'?'dirty':'clean'}${w.id==='salvage'?' + 2 parts':''}`;}
export function tickWork(c:Campaign,dt:number){c.lifestyle.workCooldown=Math.max(0,c.lifestyle.workCooldown-dt);if(c.lifestyle.work){c.lifestyle.work.t-=dt;if(c.lifestyle.work.t<=0){c.lifestyle.work=null;c.lifestyle.workCooldown=30;return 'Work order expired. No payout; try again at the Jobs board.';}}return null;}
export function buyDecor(c:Campaign,key:'rug'|'art'){if(c.lifestyle[key]||c.clean<100)return false;c.clean-=100;c.lifestyle[key]=true;return true;}
export function styleCar(c:Campaign,index:number,key:'spoiler'|'stripe'){if(!c.expansion.cars[index]||c.clean<200)return false;const style=c.lifestyle.carStyle[index]??={spoiler:false,stripe:false,glowColor:0,rimColor:0};if(style[key])return false;c.clean-=200;style[key]=true;return true;}
