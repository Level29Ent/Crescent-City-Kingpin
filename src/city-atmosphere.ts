import type {Campaign} from './campaign.ts';
import {ventureBusy} from './kingpin.ts';
export const RADIO_NEWS=[
 'Crescent News: dockworkers demand protection for relief shipments.',
 'Crescent News: witnesses report new rival activity around the old station.',
 'Crescent News: street clinics ask drivers to slow down for pedestrians.',
];
const CONVERSATIONS=[['“Keep the music on Frenchmen Street.”','“Did you hear who owns the club now?”'],['“The neighborhood remembers who helps.”','“Watch the corner. The Crown is back.”'],['“Those cars look expensive to repair.”','“Garden District shops close at ten.”'],['“Manifest checked? Then load the truck.”','“Crane’s buyers are paying for silence.”'],['“Another shipment before sunrise.”','“A clean river doesn’t mean clean money.”']];
export function atmosphereLine(c:Campaign,district:number){const lines=CONVERSATIONS[Math.max(0,Math.min(4,district))]!;return c.kingpin.radio==='news'?RADIO_NEWS[Math.floor(c.clock/24)%RADIO_NEWS.length]!:lines[Math.floor(c.clock/24)%lines.length]!;}
export function tickAtmosphere(c:Campaign,dt:number,district:number){
 const s=c.kingpin,previousEvent=s.eventClock;s.ambienceClock+=dt;s.eventClock=Math.min(150,s.eventClock+dt);const messages:string[]=[];
 if(s.ambienceClock>=24){s.ambienceClock%=24;messages.push(atmosphereLine(c,district));}
 if(previousEvent<150&&s.eventClock>=150&&!c.defense&&c.legacy.tutorial>=3&&!ventureBusy(c)){
  messages.push('NEIGHBORHOOD CONTACTS: clinic relief and a threatened witness near the newsroom need help. Visit them to volunteer; no activity has been accepted.');
 }return messages;
}
export function startStreetEvent(c:Campaign,id:'relief'|'witness'){
 const s=c.kingpin;if(!['relief','witness'].includes(id)||s.eventClock<150||c.defense||c.legacy.tutorial<3||ventureBusy(c))return false;
 s.eventClock=0;s.active={kind:'event',id,step:0,remaining:120,choice:'protect',method:'assault',spawned:false,resolved:false,progress:0,cargo:100};return true;
}
export function radioPattern(station:'jazz'|'bounce'|'news'|'off',beat:number){
 if(station==='off'||station==='news')return [];
 if(station==='bounce')return [{frequency:beat%2?55:65.41,duration:.14,volume:.12,shape:'triangle' as OscillatorType},...(beat%2===0?[{frequency:130,duration:.08,volume:.07,shape:'square' as OscillatorType}]:[])];
 const notes=[130.81,155.56,196,233.08,174.61,207.65,261.63,311.13],root=notes[beat%notes.length]!;
 return [...(beat%2===0?[{frequency:root/2,duration:.32,volume:.12,shape:'triangle' as OscillatorType}]:[]),...(beat%4===0?[1,1.25,1.5].map(v=>({frequency:root*v,duration:.65,volume:.025,shape:'sine' as OscillatorType})):[])];
}
