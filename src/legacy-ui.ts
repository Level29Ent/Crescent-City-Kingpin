import type { Campaign } from './campaign.ts';
import { TRAITS, TUTORIAL, startDaily, dailyRoute, legacyInheritance, shareCard } from './legacy.ts';
import { INTERIORS } from './interiors.ts';
import { owns, loyal } from './expansion.ts';
export function legacyPanel(c:Campaign,root:HTMLElement,h:{changed():void;retire():void;travel(x:number,z:number):void;repair():void;waypoint(x:number,z:number):void}){
 const el=(tag:string,text:string)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 const section=(title:string,body:string)=>{const s=el('article','');s.className='empire-card';s.append(el('h3',title),el('p',body));root.append(s);return s;};
 const button=(parent:HTMLElement,text:string,fn:()=>void,disabled=false)=>{const b=el('button',text) as HTMLButtonElement;b.disabled=disabled;b.onclick=()=>{fn();h.changed();};parent.append(b);};
 const tutorial=section('Guided onboarding',TUTORIAL[c.legacy.tutorial]!);button(tutorial,'Skip tutorial (unlock open city)',()=>{c.legacy.tutorial=3;},c.legacy.tutorial===3);
 const settings=section('Touch movement sensitivity','0.5× precision to 2× responsive. Release always returns the stick to neutral.');
 const slider=document.createElement('input');slider.type='range';slider.min='.5';slider.max='2';slider.step='.1';slider.value=String(c.legacy.sensitivity);slider.setAttribute('aria-label','Joystick sensitivity');
 slider.oninput=()=>{c.legacy.sensitivity=Number(slider.value);};slider.onchange=h.changed;settings.append(slider);
 const traits=section('Character trait','One distinct bonus/penalty chosen before the tutorial completes.');
 const choose=document.createElement('select');choose.setAttribute('aria-label','Character trait');for(const t of TRAITS){const o=el('option',`${t.name}: ${t.description}`) as HTMLOptionElement;o.value=t.id;choose.append(o);}choose.value=c.legacy.trait;choose.disabled=c.legacy.tutorial>=3;choose.onchange=()=>{c.legacy.trait=choose.value;h.changed();};traits.append(choose);
 const starts=section('Legacy starting districts','Generation 2 unlocks Uptown; generation 3 unlocks the Port. Choose only before meeting Mama Nola. Alternate starts skip the walking tutorial and unlock the open city.');
 for(const [name,x,z,gen]of [['French Quarter',10,-1.5,0],['Uptown',-120,60,1],['Port',120,180,2]] as const)button(starts,name,()=>{c.legacy.start=name==='Port'?'port':name==='Uptown'?'uptown':'quarter';if(gen)c.legacy.tutorial=3;h.travel(x,z);},c.legacy.generation<gen||c.legacy.tutorial>0);
 const daily=section('Daily clean-capital speedrun','UTC-seeded three-stop route shared by all players. Complete on foot or in a vehicle for $1,000 clean. Self-reported daily times can be submitted via Leaderboard when its shared backend is connected.');
 button(daily,'Start today’s route',()=>{startDaily(c);},c.legacy.tutorial<3||!!c.cityStories.active||(!!c.legacy.daily&&!c.legacy.daily.finished));
 if(c.legacy.daily){daily.append(el('p',`${c.legacy.daily.date} · checkpoint ${c.legacy.daily.step}/3 · ${c.legacy.daily.elapsed.toFixed(1)}s · best ${c.legacy.daily.best?.toFixed(1)??'—'}s`));const point=dailyRoute(c.legacy.daily.date)[Math.min(2,c.legacy.daily.step)]!;button(daily,'Mark checkpoint',()=>h.waypoint(point.x,point.z));}
 const repair=section('Lieutenant abilities','Mechanic: roadside armor repair $50, 60s cooldown. Enforcer: automatic periodic turf defense attempt. Accountant: front capacity +25% and laundering discount.');
 button(repair,'Call mechanic · $50 clean',h.repair,!loyal(c,'mechanic').length||c.clean<50||c.cooldown>0);
 const travel=section('Owned safehouse travel','Fast travel costs $100 clean and requires heat below 30. Public rooms are not free fast-travel unlocks.');
 for(const room of INTERIORS.filter(r=>r.id==='hq'||owns(c,r.id)))button(travel,room.name,()=>{if(c.clean>=100&&c.heat<30){c.clean-=100;h.travel(room.x,room.z);}},c.clean<100||c.heat>=30);
 const mods=section('Garage tuning & visual flair','Nitro tanks reduce boost drain by 15% per level (max 3). Underglow, matte paint and gold rims apply to your stored vehicles on deployment. Engine and armor upgrades remain in Garage.');
 c.expansion.cars.forEach((car,i)=>{mods.append(el('p',`Garage bay ${i+1}: ${car.id}`));const m=c.legacy.mods[i]??={nitro:0,glow:false,matte:false,rims:false};
 button(mods,`Nitro capacity ${m.nitro}/3 · $400`,()=>{c.clean-=400;m.nitro++;},c.clean<400||m.nitro>=3);
 for(const key of ['glow','matte','rims'] as const)button(mods,`${key} · $150`,()=>{c.clean-=150;m[key]=true;},c.clean<150||m[key]);});
 const legacy=legacyInheritance(c);const retire=section('Retire / New Game+','Explicitly retires this run, replacing turf, buildings, inventory, crew and missions. Keeps generation and passes down 5% of clean wealth (cap $100,000). Each generation adds 10% owned-turf revenue and 10% nitro recharge (up to 5 generations). Available after $1M clean or surviving a precinct raid.');
 retire.append(el('p',`Next generation ${legacy.generation+1} · inherited $${legacy.inherited.toLocaleString()}`));
 const confirm=document.createElement('input');confirm.placeholder='Type RETIRE';confirm.setAttribute('aria-label','Retirement confirmation');retire.append(confirm);
 const b=document.createElement('button');b.textContent='Retire this Kingpin';b.disabled=true;confirm.oninput=()=>b.disabled=confirm.value!=='RETIRE'||(c.clean<1000000&&c.intervention!=='Precinct raid');b.onclick=h.retire;retire.append(b);
 const share=section('Kingpin share card','Download a 1200×630 PNG for social media or Discord. Works mid-run or after retirement qualification; shares only your chosen alias and game stats.');
 button(share,'Download share card',()=>{const canvas=shareCard(c);canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='crescent-city-kingpin.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});});
}
