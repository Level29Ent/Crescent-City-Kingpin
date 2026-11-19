import {ROBBABLE} from './street-heists.ts';
import type {Campaign} from './campaign.ts';
import {addHeat} from './campaign.ts';
import {INTERIORS} from './interiors.ts';
import {districtAt} from './world.ts';
export type CityMemory={shops:Record<string,{closed:number;witness:number;reports:number}>;keys:string[];messages:{id:string;sender:string;text:string}[];history:{key:string;title:string;success:boolean}[];seenCalls:string[]};
export function newCityMemory():CityMemory{return {shops:{},keys:[],messages:[],history:[],seenCalls:[]};}
const bound=(v:any,max:number)=>Number.isFinite(v)?Math.max(0,Math.min(max,v)):0;
export function restoreCityMemory(v:any){const s=newCityMemory();if(!v||typeof v!=='object')return s;
 for(const b of INTERIORS){const r=v.shops?.[b.id];if(r&&typeof r==='object')s.shops[b.id]={closed:bound(r.closed,600),witness:bound(r.witness,900),reports:Math.floor(bound(r.reports,99))};}
 s.keys=INTERIORS.filter(b=>ROBBABLE.includes(b.id)&&Array.isArray(v.keys)&&v.keys.includes(b.id)).map(b=>b.id);
 s.messages=Array.isArray(v.messages)?v.messages.filter((m:any)=>m&&typeof m.id==='string'&&typeof m.sender==='string'&&typeof m.text==='string').slice(-20).map((m:any)=>({id:m.id.slice(0,100),sender:m.sender.slice(0,70),text:m.text.slice(0,300)})):[];
 s.history=Array.isArray(v.history)?v.history.filter((m:any)=>m&&typeof m.key==='string'&&typeof m.title==='string').slice(-30).map((m:any)=>({key:m.key.slice(0,100),title:m.title.slice(0,150),success:m.success===true})):[];
 s.seenCalls=Array.isArray(v.seenCalls)?[...new Set<string>(v.seenCalls.filter((id:any)=>typeof id==='string').map((id:string)=>id.slice(0,100)))].slice(-100):[];return s;
}
export function cityMessage(c:Campaign,id:string,sender:string,text:string){const m=c.pursuits.memory;if(m.messages.some(x=>x.id===id))return false;m.messages.push({id,sender,text});m.messages=m.messages.slice(-20);return true;}
export function robberyMemory(c:Campaign,id:string,quiet=false){const m=c.pursuits.memory,old=m.shops[id];m.shops[id]={closed:quiet?150:300,witness:quiet?0:600,reports:old?.reports??0};const b=INTERIORS.find(b=>b.id===id);if(b){const d=districtAt(b.x,b.z);c.living.reputation[d]=Math.max(0,(c.living.reputation[d]??0)-(quiet?1:4));}cityMessage(c,`robbery:${id}:${c.clock}`,'Neighborhood watch',quiet?'Missing stock discovered. This business will close briefly for inventory.':'Staff remember your face. This business is closed for repairs; witnesses may report you when it reopens.');}
export function tickCityMemory(c:Campaign,dt:number){for(const r of Object.values(c.pursuits.memory.shops)){r.closed=Math.max(0,r.closed-dt);r.witness=Math.max(0,r.witness-dt);}}
export function businessClosed(c:Campaign,id:string){return (c.pursuits.memory.shops[id]?.closed??0)>0;}
export function witnessRecognizes(c:Campaign,id:string,visible:boolean){const r=c.pursuits.memory.shops[id];if(!r||r.closed>0||r.witness<=0||!visible||c.kingpin.disguise>0)return false;addHeat(c,18);r.witness=0;r.reports++;cityMessage(c,`witness:${id}:${r.reports}`,'Police dispatch','A shop witness recognized you in person. Heat increased; change your route or use a disguise next time.');return true;}
export function purchaseBackroomKey(c:Campaign,id:string){if(!ROBBABLE.includes(id)||businessClosed(c,id)||c.pursuits.memory.keys.includes(id)||c.clean<75||c.heat>=30||!INTERIORS.some(b=>b.id===id))return false;c.clean-=75;c.pursuits.memory.keys.push(id);return true;}
export function localConversation(c:Campaign,id:string){const b=INTERIORS.find(b=>b.id===id);if(!b)return 'No contact here.';if(businessClosed(c,id))return 'We are closed after the robbery. Come back when repairs are complete.';const trust=c.living.reputation[districtAt(b.x,b.z)]??0;return c.pursuits.memory.shops[id]?.witness?'I remember what happened. Keep your distance.':trust>=15?'You have helped this neighborhood. Ask about work, or use the stockroom access counter.':'Keep trouble outside. The counter handles local services; stockroom access is $75 below 30 heat. Quiet safe jobs leave fewer witnesses than register threats.';}
