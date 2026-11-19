import {businessClosed} from './city-memory.ts';
import {districtAt} from './world.ts';
import type {Campaign} from './campaign.ts';
import {SPECIALISTS,activeCrew,BLOCKS} from './campaign.ts';
import {INTERIORS} from './interiors.ts';
import {businessHours,upgradeTires,trainCrew,upgradeBusiness} from './living-city.ts';
import {PROPERTIES,VEHICLES,owns,upgradeDistrict,playPoker} from './expansion.ts';
import {OUTFITS,APARTMENTS,LIVERIES,buyOutfit,equipOutfit,buyApartment,decorateApartment,buyLivery,bondConversation} from './pursuits.ts';
import {buyDisguise,callCompanion,commandCompanion,insureVehicle,recoverVehicle,replateVehicle,vehicleRecord,plateLabel} from './kingpin.ts';
import {buyDecor,styleCar} from './lifestyle.ts';
import {propertyRoom} from './world-activities.ts';
export function siteTabs(room:string|null){
 if(!room)return [];
 const tabs=['Services','Contact'];
 if(room==='garage')tabs.push('Garage');
 if(PROPERTIES.some(p=>propertyRoom(p.id)===room))tabs.push('Properties');
 if(['bank','mint','port','casino','riverboat'].includes(room))tabs.push('Heists');
 if(room==='hq')tabs.push('Safehouse','Interior','Polish & Replays');
 if(['hq','music','cafe'].includes(room))tabs.push('Crew');
 if(['pawn','karma','freight','rail-exchange','herbalist','seafood'].includes(room))tabs.push('Market');
 if(['pawn','precinct'].includes(room))tabs.push('Armory');
 if(['tailor','barber'].includes(room))tabs.push('Character');
 return tabs;
}
export type SiteHooks={room():string|null;changed():void;notice(s:string):void;appearance():void;service(action:'meal'|'treatment'|'repair'):void;location():{x:number;z:number};backRoom():void;close():void;retire():void;refresh?():void};
/** Every control here is reached from a physical desk; there is no citywide service catalogue. */
export function siteServices(c:Campaign,root:HTMLElement,h:SiteHooks){
 const id=h.room(),room=INTERIORS.find(r=>r.id===id);if(!room)return;
 const el=(tag:string,text:string)=>{const e=document.createElement(tag);e.textContent=text;return e;};
 const card=(title:string,body:string)=>{const box=el('article','');box.className='empire-card';box.append(el('h3',title),el('p',body));root.append(box);return box;};
 const button=(box:HTMLElement,label:string,fn:()=>void,disabled=false)=>{const b=el('button',label) as HTMLButtonElement;b.disabled=disabled;b.onclick=()=>{if(h.room()!==id)return;fn();h.changed();if(h.refresh)h.refresh();else{root.replaceChildren();siteServices(c,root,h);}};box.append(b);};
 if(businessClosed(c,room.id)){card(room.name,'Closed for repairs after a robbery. No services or purchases until reopening.');return;}
 const open=businessHours(room.id,c.clock),desk=card(room.name,`${open?'Service desk open':'Timed food/medical/repair services closed'} · Interact with contacts here for local work. Use the exit to return to the street.`);
 if(room.theme==='cafe'&&room.id!=='pharmacy')button(desk,'Meal · $25 base / restore stamina',()=>h.service('meal'),!open||c.living.serviceCooldown>0);
 if(room.id==='clinic')button(desk,'Treatment · $80 base / restore health',()=>h.service('treatment'),!open||c.living.serviceCooldown>0);
 if(room.theme==='garage')button(desk,'Repair last driven vehicle · $100 base',()=>h.service('repair'),!open||c.living.serviceCooldown>0);
 if(room.id==='riverboat'){
  const poker=card('River Queen · five-card draw','$25 clean buy-in. Hold cards, then draw once. Pair $25; two pairs $50; trips $75; straight $100; flush $150; full house $200; quads $400; straight flush $1,000. Table closes during a heist. Fictional in-game currency only.');
  c.expansion.poker?.cards.forEach((n,i)=>{const label=['A','2','3','4','5','6','7','8','9','10','J','Q','K'][n%13]+['♠','♥','♦','♣'][Math.floor(n/13)]!;button(poker,`${label}${c.expansion.poker!.held.includes(i)?' HELD':''}`,()=>{const held=c.expansion.poker!.held;c.expansion.poker!.held=held.includes(i)?held.filter(j=>j!==i):[...held,i];});});
  button(poker,c.expansion.poker?'Draw & settle':'Deal · $25',()=>{playPoker(c,Math.random,'riverboat');},c.pursuits.active?.kind==='raid'||!c.expansion.poker&&c.clean<25);if(c.expansion.report)poker.append(el('p',c.expansion.report));
 }
 if(room.id==='hq'){
  card('Playable heists','Talk to Mama Nola in Contact for The Brass Vault and River Queen Casino Heist. Crew in Follow can ride in a stopped car nearby; taxi/rescue passengers have seat priority.');
  button(desk,'Gear & import dispatch',()=>{h.close();h.backRoom();});
  const decor=card('Your back room','Purchased decor appears on your next visit.');
  for(const key of ['rug','art'] as const)button(decor,`${key} · $100`,()=>{buyDecor(c,key);},c.lifestyle[key]||c.clean<100);
  const retire=card('Retirement','Replaces this run with a new generation; keeps 5% of clean wealth (up to $100,000). Requires $1M clean or surviving a precinct raid.');
  const input=el('input','') as HTMLInputElement;input.placeholder='Type RETIRE';input.setAttribute('aria-label','Retirement confirmation');retire.append(input);
  const b=el('button','Retire this Kingpin') as HTMLButtonElement;b.disabled=true;input.oninput=()=>b.disabled=input.value!=='RETIRE'||c.clean<1000000&&c.intervention!=='Precinct raid';b.onclick=()=>{if(h.room()==='hq'&&input.value==='RETIRE'&&(c.clean>=1000000||c.intervention==='Precinct raid'))h.retire();};retire.append(b);
 }
 if(['tailor','barber'].includes(room.id)){
  const clothes=card('Wardrobe','Choose a purchased look or buy one here.');
  for(const o of OUTFITS)button(clothes,`${o.name} · ${c.pursuits.wardrobe.includes(o.id)?'Wear':`$${o.cost}`}`,()=>{if(c.pursuits.wardrobe.includes(o.id))equipOutfit(c,o.id);else buyOutfit(c,o.id);h.appearance();},!c.pursuits.wardrobe.includes(o.id)&&c.clean<o.cost);
  button(clothes,'Wear original outfit',()=>{equipOutfit(c,'');h.appearance();});
  for(const [key,max]of [['hairStyle',3],['accessory',3]] as const){const label=el('label',key==='hairStyle'?'Hairstyle':'Accessory');const select=el('select','') as HTMLSelectElement;for(let i=0;i<=max;i++){const option=el('option',String(i)) as HTMLOptionElement;option.value=String(i);select.append(option);}select.value=String(c.lifestyle[key]);select.onchange=()=>{c.lifestyle[key]=Number(select.value);h.appearance();h.changed();};label.append(select);clothes.append(label);}
  button(clothes,c.lifestyle.beard?'Shave':'Short beard',()=>{c.lifestyle.beard=!c.lifestyle.beard;h.appearance();});
  if(room.id==='tailor')button(clothes,'Temporary disguise · $100 / 90 outdoor seconds',()=>{buyDisguise(c);h.appearance();},c.clean<100||c.heat>=30||c.kingpin.disguise>0);
 }
 const home=APARTMENTS.find(a=>a.id===room.id);
 if(home){const owned=c.pursuits.apartments.includes(home.id),housing=card(home.name,owned?'Your home. Public entry alone never buys a property.':'Public viewing. Purchase is optional.');button(housing,owned?'Owned':`Buy home · $${home.cost}`,()=>{buyApartment(c,home.id);},owned||c.clean<home.cost);if(owned)for(let i=0;i<3;i++)button(housing,`Decor ${i+1} · $80`,()=>{decorateApartment(c,home.id,i);},c.clean<80||c.pursuits.decor[home.id]===i);}
 if(['hq','music','cafe'].includes(room.id)){
  const crew=card('Talk to your crew','Paid, loyal specialists offer companionship and personal favors here. Training unlocks after two completed operations.');
  for(const m of activeCrew(c)){
   const name=SPECIALISTS.find(s=>s.id===m.id)!.name;
   if(room.id==='hq')button(crew,`Ask ${name} to follow`,()=>{const p=h.location();callCompanion(c,m.id,p.x,p.z);},!!c.kingpin.companion.id||c.kingpin.companion.injury>0);
   for(const choice of ['listen','reward'] as const)button(crew,`${name} · ${choice}${choice==='reward'?' · $100':''}`,()=>{bondConversation(c,m.id,choice);},c.pursuits.bondCooldown>0||choice==='reward'&&c.clean<100);
   button(crew,`${name} · train ($${400*((c.living.training[m.id]??0)+1)})`,()=>{trainCrew(c,m.id);},c.living.completed.length<2||(c.living.training[m.id]??0)>=3||c.clean<400*((c.living.training[m.id]??0)+1));
  }
  for(const command of ['follow','hold','retreat'] as const)button(crew,command,()=>{commandCompanion(c,command);},!c.kingpin.companion.id);
 }
 if(['garage','precinct'].includes(room.id))for(const [i,car]of c.expansion.cars.entries()){
  const record=vehicleRecord(c,i),v=card(`${VEHICLES.find(v=>v.id===car.id)!.name} · ${plateLabel(i,record.plate)}`,`${record.impounded?'Impounded':'Available'} · ${record.insured?'Insured':'Uninsured'}`);
  if(room.id==='precinct'){button(v,`Recover · $${record.insured?50:300}`,()=>{recoverVehicle(c,i,true);},!record.impounded||c.clean<(record.insured?50:300));continue;}
  button(v,'Insure · $250',()=>{insureVehicle(c,i);},record.insured||c.clean<250);
  button(v,'Replate · $120',()=>{replateVehicle(c,i,true);},record.impounded||c.heat>=30||c.clean<120);
  button(v,'Tires / brakes · one part + upgrade fee',()=>{upgradeTires(c,i);},record.impounded||c.living.completed.length<1||(c.living.tires[i]??0)>=3||c.expansion.parts<1||c.clean<300*((c.living.tires[i]??0)+1));
  for(const id of LIVERIES)button(v,`Livery · ${id}${id==='none'?'':' · $180'}`,()=>{buyLivery(c,i,id);},record.impounded||c.pursuits.liveries[i]===id||c.clean<(id==='none'?0:180));
  for(const key of ['spoiler','stripe'] as const)button(v,`${key} · $200`,()=>{styleCar(c,i,key);},record.impounded||c.clean<200||!!c.lifestyle.carStyle[i]?.[key]);
  const mods=c.legacy.mods[i]??={nitro:0,glow:false,matte:false,rims:false};
  button(v,`Nitro ${mods.nitro}/3 · $400`,()=>{c.clean-=400;mods.nitro++;},record.impounded||c.clean<400||mods.nitro>=3);
  for(const key of ['glow','matte','rims'] as const)button(v,`${key} · $150`,()=>{c.clean-=150;mods[key]=true;},record.impounded||c.clean<150||mods[key]);
 }
 const district=districtAt(h.location().x,h.location().z),block=BLOCKS.find(b=>b.district===district);
 if(block&&c.owned.includes(block.id)){const level=c.expansion.levels[district]??0;button(desk,`Improve ${block.name} · level ${level}/3 · $${400*(level+1)}`,()=>{upgradeDistrict(c,district,true);},level>=3||c.clean<400*(level+1));}
 for(const p of PROPERTIES.filter(p=>propertyRoom(p.id)===room.id&&owns(c,p.id)))button(desk,`Improve ${p.name} · level ${c.living.businessLevels[p.id]??0}/3`,()=>{upgradeBusiness(c,p.id);},c.living.completed.length<3||(c.living.businessLevels[p.id]??0)>=3||c.clean<600*((c.living.businessLevels[p.id]??0)+1));
}
