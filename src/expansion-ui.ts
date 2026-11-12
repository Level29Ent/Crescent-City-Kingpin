import { mountShowroom } from './showroom.ts';
import { banknoteCanvas } from './money.ts';
import type { Campaign } from './campaign.ts';
import { BLOCKS } from './campaign.ts';
import { VEHICLES, FURNITURE, PROPERTIES, HEISTS, HEIST_CHOICES, MISSIONS, RIVALS, DISTRICT_NAMES, conditions, owns, furnished, loyal, plan, recon, assemble, execute, startMission, frontLaunder, buyProperty, buyVehicle, upgradeVehicle, startRun, upgradeDistrict, inventoryCap, playPoker } from './expansion.ts';
export const EXPANSION_TABS = ['Missions','Garage','Heists','Properties','Interior','Rivals','Armory','Cash'];
type Hooks = { location():{x:number;z:number;district:number}; waypoint(x:number,z:number,name:string):void; close():void; notice(text:string):void;
  deploy(index:number):void; armory(weapon:number):void; gearOwned(weapon:number):boolean; reload():void; };
export function renderExpansion(tab:string,c:Campaign,container:HTMLElement,h:Hooks):boolean {
  if(!EXPANSION_TABS.includes(tab))return false;
  const e=c.expansion;
  const text=(tag:string,value:string,cls='')=>{const el=document.createElement(tag);el.textContent=value;el.className=cls;return el;};
  const rerender=()=>{container.replaceChildren();renderExpansion(tab,c,container,h);};
  const button=(parent:HTMLElement,label:string,action:()=>void,disabled=false)=>{const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.onclick=()=>{action();h.reload();rerender();};parent.append(b);return b;};
  const card=(title:string,desc:string)=>{const box=text('article','','empire-card');box.append(text('h3',title),text('p',desc));container.append(box);return box;};
  const mark=(x:number,z:number,label:string)=>{h.waypoint(x,z,label);h.close();};
  container.append(text('h2',tab));
  if(tab==='Missions'){
    const state=conditions(c.clock);
    container.append(text('p',`${state.weather} · ${state.night?'Night rewards +30% on deliveries, +25% recoveries':'Daylight'} · Rain cuts police sight to 60% and heat generation by 35%. Fog cuts sight to 45%. Heatwaves drain sprint stamina 40% faster. No owned turf or businesses means zero idle income.`));
    if(e.mission){const m=MISSIONS.find(m=>m.id===e.mission!.id)!;const step=m.steps[e.mission.step]!;const active=card(`ACTIVE: ${m.name}`,`${step.name} · ${Math.ceil(e.mission.remaining)}s. Travel to the white marker and press E. Parade finale requires staying beside the lead float for 40 seconds.`);button(active,'Track current objective',()=>mark(step.x,step.z,step.name));button(active,'Abandon (crew loyalty -12)',()=>{c.crew.forEach(m=>m.loyalty=Math.max(0,m.loyalty-12));e.mission=null;});}
    for(const m of MISSIONS){const item=card(m.name,`${m.desc} · $${m.pay} dirty base · ${m.duration}s${e.completed.includes(m.id)?' · previously completed':''}`);button(item,m.id==='parade'?'Join Mardi Gras parade':'Accept side mission',()=>{if(startMission(c,m.id))mark(m.steps[0].x,m.steps[0].z,m.steps[0].name);},!!e.mission);}
    container.append(text('p','Dynamic pickup stashes and contraband boxes appear near traversable streets every 22 seconds (maximum 12). Walk within 1.8m to collect; they never pay you for simply waiting at spawn. Purple = goods, gold = cash, teal = mechanical parts.'));
  }else if(tab==='Garage'){
    container.append(text('p',`Stored vehicles ${e.cars.length}/8 · Parts ${e.parts}. Buy a vehicle, deploy it at the HQ garage, or send it on an automated contraband run. Runs consume unmarked crates upfront, carry roadblock risk, and pay dirty cash only after completion. You cannot drive a vehicle while it is dispatched.`));
    const preview=card('Vehicle showroom','Inspect every vehicle before buying. Drag the preview to rotate. Viewing never spends money.');
    const choices=document.createElement('select');choices.setAttribute('aria-label','Preview vehicle');
    VEHICLES.forEach(v=>{const option=document.createElement('option');option.value=v.id;option.textContent=v.name;choices.append(option);});
    choices.value='bike';preview.append(choices);const stage=document.createElement('div');preview.append(stage);mountShowroom(stage,6);
    choices.onchange=()=>{stage.replaceChildren();const model=VEHICLES.find(v=>v.id===choices.value)!;mountShowroom(stage,model.style,model.id==='taxi'?0xf4be26:0x355e64);};
    for(const model of VEHICLES){const item=card(model.name,`$${model.price} clean · capacity ${model.capacity} crates · speed ${model.speed}× · armor ${Math.round(model.armor*100)}%.`);button(item,'Buy & store',()=>{buyVehicle(c,model.id);},c.clean<model.price||e.cars.length>=8);}
    e.cars.forEach((car,i)=>{const model=VEHICLES.find(v=>v.id===car.id)!;const run=e.runs.find(r=>r.car===i);const item=card(`Garage bay ${i+1} · ${model.name}`,`Engine ${car.engine}/3 · armor ${car.armor}/3${run?` · delivering ${Math.ceil(run.remaining)}s / ${Math.round(run.risk*100)}% intercept risk`:''}`);
      button(item,'Deploy at HQ',()=>{h.deploy(i);},!!run);
      button(item,`Engine upgrade · $${250*(car.engine+1)} + 2 parts`,()=>{upgradeVehicle(c,i,false);},!!run||car.engine>=3||e.parts<2||c.clean<250*(car.engine+1));
      button(item,`Armor upgrade · $${250*(car.armor+1)} + 2 parts`,()=>{upgradeVehicle(c,i,true);},!!run||car.armor>=3||e.parts<2||c.clean<250*(car.armor+1));
      button(item,`Auto delivery · ${model.capacity} crates`,()=>{startRun(c,i);},!!run||c.inventory[0]!<model.capacity);
      for(const [label,color]of [['Purple',0x682db5],['Gold',0xe7b449],['Green',0x237c60],['Black',0x17202a]] as const)button(item,label,()=>{car.color=color;});
    });
  }else if(tab==='Cash'){
    container.append(text('p','Detailed paper money with engraved-style borders, serial numbers, a cathedral vignette, note edges and currency straps. These are fictional Crescent Reserve game props, not real legal tender. Viewing this display never awards money.'));
    const wallet=card('Your cash ledger',`$${Math.floor(c.clean).toLocaleString()} clean capital · $${Math.floor(c.dirty).toLocaleString()} dirty cash. Arena cash stashes contain four $20 notes and still pay exactly $80 once when collected.`);
    mountShowroom(wallet,'cash');
    const note=banknoteCanvas();note.className='banknote-preview';note.setAttribute('aria-label','Twenty Crescent game banknote design');container.append(note);
    container.append(text('p','Cash comes from missions, recovered stashes and owned revenue assets. There is no free standing payout. The displayed bundle is illustrative; the ledger above is your spendable balance.'));
  }else if(tab==='Heists'){
    container.append(text('p','Every major heist has three phases: visit the landmark for Recon → assign paid, loyal specialists → make three tactical Execution choices. Clean planning fees are charged once, and every attempt has a 10-minute cooldown. Quiet choices improve—not guarantee—success. The Mint requires front-business level 3.'));
    for(const target of HEISTS){const p=plan(c,target.id);const loc=h.location();const near=Math.hypot(loc.x-target.x,loc.z-target.z)<14;
      const item=card(target.name,`$${target.payout.toLocaleString()} dirty · $${target.fee} clean fee · specialists ${target.roles.join(', ')} · legendary ${target.gear}. Phase ${['Recon','Crew Assembly','Execution'][p.phase]}${p.cooldown?` · cooldown ${Math.ceil(p.cooldown)}s`:''}`);
      if(p.phase===0)button(item,near?'Gather intel on-site':'Mark recon location',()=>{if(near){recon(c,target.id,loc.x,loc.z);}else mark(target.x,target.z,`${target.name} recon`);},p.cooldown>0);
      if(p.phase===1){item.append(text('p',target.roles.map(r=>`${r}: ${loyal(c,r).length?'ready':'hire / pay / restore loyalty'}`).join(' · ')));button(item,'Assign crew & fund plan',()=>{assemble(c,target.id);},target.roles.some(r=>!loyal(c,r).length)||c.clean<target.fee||(target.id==='mint'&&c.upgrades<3));}
      if(p.phase===2){item.append(text('p',`Assigned: ${p.assigned.join(', ')} · tactical choice ${p.step+1}/3`));HEIST_CHOICES[p.step]!.forEach((choice,i)=>button(item,choice,()=>{const result=execute(c,target.id,i===0);e.report=result;h.notice(result);}));}
    }if(e.report)container.append(text('p',e.report,'mission-report'));
    if(e.gear.length)card('Legendary locker',e.gear.join(' · '));
  }else if(tab==='Properties'){
    container.append(text('p',`Owned fronts/rackets have daily upkeep; unpaid businesses are disabled until their bill is paid. Laundering capacity resets each simulation minute. Rackets require at least one paid, loyal crew member. Inventory ${c.inventory.reduce((a,b)=>a+b,0)}/${inventoryCap(c)}. The Mint is on the Heists board.`));
    for(const p of PROPERTIES){const owned=e.properties.includes(p.id);const enabled=owns(c,p.id);const item=card(p.name,`${p.kind.toUpperCase()} · buy $${p.cost.toLocaleString()} · daily upkeep $${p.upkeep} · ${p.rate?`$${p.rate}/min ${p.id==='cafe'?'clean':'dirty'} · `:''}${p.heat>=0?'+':''}${p.heat} heat/min. ${p.effect}${owned?enabled?' · OPERATING':' · UPKEEP MISSED':''}`);
      if(!owned)button(item,'Buy property',()=>{buyProperty(c,p.id);},c.clean<p.cost);
      else if(!enabled)button(item,`Pay daily bill · $${p.upkeep}`,()=>{c.clean-=p.upkeep;e.disabled=e.disabled.filter(id=>id!==p.id);},c.clean<p.upkeep);
      button(item,'Mark location',()=>mark(p.x,p.z,p.name));
      if(enabled&&p.capacity){const left=p.capacity-(e.frontsUsed[p.id]??0);const fee=Math.max(.03,p.fee-(loyal(c,'hacker').length ? .03 : 0));item.append(text('p',`Laundering $${Math.floor(left)} remaining this minute · fee ${Math.round(fee*100)}%.`));button(item,'Launder available dirty cash',()=>{const n=frontLaunder(c,p.id);h.notice(`Front laundered $${n} clean.`);},c.dirty<1||left<1);}
      if(enabled&&p.id==='airboat')button(item,'Bayou lay-low · $50 / -50 heat',()=>{c.clean-=50;c.heat=Math.max(0,c.heat-50);c.cooldown=60;},c.clean<50||c.cooldown>0||c.heat<=0);
    }
  }else if(tab==='Interior'){
    container.append(text('p','Place one item per room slot. Select an item, then a free slot; move owned furniture at no cost. Furniture and tactical bonuses persist. Security covers raids, the vault raises capacity, and the locker strengthens combat.'));
    const room=text('div','','safehouse-room');room.setAttribute('aria-label','Safehouse interior floor plan');
    for(let slot=0;slot<6;slot++){const furniture=e.furniture.find(f=>f.slot===slot);const square=text('div',furniture?FURNITURE.find(f=>f.id===furniture.id)!.name:`Room slot ${slot+1}`,'room-slot');room.append(square);}container.append(room);
    for(const item of FURNITURE){const existing=e.furniture.find(f=>f.id===item.id);const box=card(item.name,`$${item.price} clean · ${item.effect}${existing?` · room slot ${existing.slot+1}`:''}`);
      for(let slot=0;slot<6;slot++)button(box,`${existing?'Move to':'Place in'} slot ${slot+1}`,()=>{if(existing)existing.slot=slot;else{c.clean-=item.price;e.furniture.push({id:item.id,slot});}},e.furniture.some(f=>f.slot===slot)||(!existing&&c.clean<item.price));
    }
    if(furnished(c,'poker')){const box=card('Draw poker table','Five-card draw: $25 clean buy-in. Hold cards, then draw once. Pair $25; two pairs $50; trips $75; straight $100; flush $150; full house $200; quads $400; straight flush $1,000.');
      if(e.poker)e.poker.cards.forEach((n,i)=>{const label=['A','2','3','4','5','6','7','8','9','10','J','Q','K'][n%13]+['♠','♥','♦','♣'][Math.floor(n/13)];button(box,`${label}${e.poker!.held.includes(i)?' HELD':''}`,()=>{const held=e.poker!.held;e.poker!.held=held.includes(i)?held.filter(j=>j!==i):[...held,i];});});
      button(box,e.poker?'Draw & settle':'Deal · $25',()=>{playPoker(c);},!e.poker&&c.clean<25);if(e.report)box.append(text('p',e.report));}
  }else if(tab==='Rivals'){
    RIVALS.forEach(r=>{const box=card(`${r.name} — ${r.crew}`,r.style);box.style.borderLeft=`4px solid ${r.color}`;});
    container.append(text('p','Rivals grow influence every two simulation minutes. High influence in your turf triggers a 90-second showdown; the camera grid adds 30 seconds. Winning a defense removes 25 influence. Upgrade controlled districts for revenue and reduced rival pressure.'));
    for(const [i,name]of DISTRICT_NAMES.entries()){const block=BLOCKS.find(b=>b.district===i)!;const level=e.levels[i]!;const box=card(name,`Rival influence ${Math.round(e.influence[i]!)}% · district level ${level}/3 · revenue +${level*25}%. ${c.owned.includes(block.id)?'CONTROLLED':'NOT CONTROLLED'}`);const bar=document.createElement('progress');bar.max=100;bar.value=e.influence[i]!;bar.setAttribute('aria-label',`${name} rival influence`);box.append(bar);button(box,`Upgrade district · $${400*(level+1)}`,()=>{upgradeDistrict(c,i,c.owned.includes(block.id));e.influence[i]=Math.max(0,e.influence[i]!-15);},!c.owned.includes(block.id)||level>=3||c.clean<400*(level+1));button(box,'Track neighborhood',()=>mark(block.x,block.z,name));}
  }else if(tab==='Armory'){
    container.append(text('p','Weapons use magazines, reload with R (or touch RELOAD). Spare ammunition is unlimited; reloads take time. Right mouse aims with tighter spread. Cosmetic choices never change identity-based stats.'));
    const names=['Pistol','SMG','Shotgun','Carbine','Marksman rifle'];const prices=[0,2500,5000,6500,9000];
    names.forEach((name,i)=>{const box=card(name,h.gearOwned(i)?'Owned — equip from 1–5 or touch WEAPON':`$${prices[i]} clean`);button(box,h.gearOwned(i)?'Equip':'Buy & equip',()=>h.armory(i),!h.gearOwned(i)&&c.clean<prices[i]!);});
    const box=card('Weapon tuning',`Level ${e.weaponLevel}/5 · +8% damage per level. Requires $${500*(e.weaponLevel+1)} and 2 parts.`);button(box,'Upgrade weapons',()=>{c.clean-=500*(e.weaponLevel+1);e.parts-=2;e.weaponLevel++;},e.weaponLevel>=5||e.parts<2||c.clean<500*(e.weaponLevel+1));
    card('Legendary gear effects','Precision Barrel: 25% tighter spread. Ghost Plating: 15% less vehicle damage. Royal Flush Armor: 15% less incoming damage. Mintmaster Signet: +5% owned-property revenue. Krewe Medallion: +5% side-mission rewards.');
  }
  return true;
}
