import type { Campaign } from './campaign.ts';
import { cityClock } from './dynamics.ts';
export const DISTRICT_NAMES = ['French Quarter', 'Skidrow', 'Uptown', 'Warehouse', 'Port of NOLA'];
export function conditions(time: number) {
  const weather = ['Clear', 'Rainstorm', 'Fog', 'Heatwave'][Math.floor(time / 150) % 4]!;
  const hour = cityClock(time).hour;
  return { weather, night: hour >= 19 || hour < 6, visibility: weather === 'Rainstorm' ? .6 : weather === 'Fog' ? .45 : 1,
    heat: weather === 'Rainstorm' ? .65 : weather === 'Heatwave' ? 1.2 : 1, stamina: weather === 'Heatwave' ? 1.4 : 1 };
}
export const VEHICLES = [
  { id: 'sedan', name: 'Beat-up Sedan', price: 350, style: 0, capacity: 2, speed: 1, armor: 0 },
  { id: 'coupe', name: 'Getaway Coupe', price: 2500, style: 2, capacity: 3, speed: 1.3, armor: .1 },
  { id: 'truck', name: 'Smuggling Truck', price: 4000, style: 1, capacity: 8, speed: .8, armor: .2 },
  { id: 'van', name: 'Armored Van', price: 8500, style: 4, capacity: 6, speed: .85, armor: .6 },
] as const;
export const FURNITURE = [
  { id: 'camera', name: 'Security camera grid', price: 600, effect: 'Raid warnings 20 seconds early; +30s defense response window' },
  { id: 'vault', name: 'Money vault', price: 1000, effect: 'Raises dirty-cash capacity from $100,000 to $500,000; halves raid seizure' },
  { id: 'locker', name: 'Weapon locker', price: 800, effect: '+15 crew defense points, +10% player damage' },
  { id: 'poker', name: 'Poker table', price: 350, effect: 'Unlocks a draw-poker mini-game; $25 buy-in' },
] as const;
// Rate is per simulation minute; upkeep is per real day. Utilities earn no cash.
export const PROPERTIES = [
  { id: 'laundromat', name: 'Bywater Laundromat', kind: 'front', cost: 250, rate: 0, heat: .2, upkeep: 20, capacity: 600, fee: .2, x: 0, z: 60, effect: 'Starter laundering tier' },
  { id: 'jazz', name: 'French Quarter Jazz Club & Lounge', kind: 'front', cost: 6000, rate: 0, heat: .1, upkeep: 800, capacity: 12000, fee: .1, x: 0, z: -60, effect: 'High-capacity Nightclub front; expensive musicians and permits' },
  { id: 'antique', name: 'Garden District Antique Shop', kind: 'front', cost: 1800, rate: 0, heat: -.5, upkeep: 80, capacity: 1500, fee: .12, x: -120, z: 0, effect: 'Slow, discreet laundering; permanently suppresses local suspicion' },
  { id: 'dive', name: 'Bywater Dive Bar', kind: 'front', cost: 400, rate: 0, heat: 1.2, upkeep: 35, capacity: 900, fee: .22, x: 120, z: 0, effect: 'Cheap, but nosy patrols increase heat' },
  { id: 'cafe', name: 'Faubourg Marigny Cafe & Bakery', kind: 'front', cost: 1600, rate: 25, heat: .2, upkeep: 100, capacity: 2400, fee: .16, x: 60, z: -60, effect: 'Clean trading revenue and 15% specialist hiring discount' },
  { id: 'dice', name: 'Tremé Backroom Dice & Poker Den', kind: 'racket', cost: 1000, rate: 260, heat: 4, upkeep: 90, capacity: 0, fee: 0, x: -120, z: -120, effect: 'High dirty cash flow, high local heat; needs active crew' },
  { id: 'dock', name: 'Warehouse Import/Export Dock', kind: 'racket', cost: 2400, rate: 220, heat: 2, upkeep: 140, capacity: 0, fee: 0, x: 60, z: 120, effect: '+40 inventory slots; produces contraband every minute; needs crew' },
  { id: 'herbalist', name: 'Magazine Street Herbalist', kind: 'racket', cost: 900, rate: 130, heat: 1.5, upkeep: 55, capacity: 0, fee: 0, x: -60, z: 60, effect: 'Moonshine distribution; moderate heat; needs crew' },
  { id: 'chop', name: 'Central City Chop Shop', kind: 'racket', cost: 1200, rate: 150, heat: 2, upkeep: 75, capacity: 0, fee: 0, x: -60, z: 0, effect: 'Mechanical parts for garage upgrades; needs crew protection' },
  { id: 'airboat', name: 'Bayou Airboat Dock', kind: 'outpost', cost: 650, rate: 0, heat: -.3, upkeep: 25, capacity: 0, fee: 0, x: 180, z: -120, effect: 'Lay low for $50 / -50 heat, and covert river transport bonus' },
  { id: 'pawn', name: 'Uptown Pawn Shop — The Fence', kind: 'outpost', cost: 700, rate: 0, heat: .1, upkeep: 30, capacity: 0, fee: 0, x: -120, z: 60, effect: '+20% resale prices for goods' },
  { id: 'mausoleum', name: 'Above-Ground Mausoleum', kind: 'outpost', cost: 2200, rate: 0, heat: 0, upkeep: 300, capacity: 0, fee: 0, x: 180, z: 0, effect: 'Protected goods stash: inventory immune to standard raids' },
  { id: 'precinct', name: 'Corrupt Precinct Backroom', kind: 'outpost', cost: 1800, rate: 0, heat: -.2, upkeep: 400, capacity: 0, fee: 0, x: -60, z: -60, effect: 'Funded daily bribes warn of police raids early' },
  { id: 'port', name: 'Port of New Orleans Cargo Terminal', kind: 'landmark', cost: 18000, rate: 450, heat: 3, upkeep: 600, capacity: 0, fee: 0, x: 120, z: 180, effect: 'International routes double the profit premium above base value' },
  { id: 'casino', name: 'Downtown Grand Hotel & Casino', kind: 'landmark', cost: 45000, rate: 900, heat: 2, upkeep: 1200, capacity: 40000, fee: .06, x: 35, z: 202, effect: 'Ultimate laundering tier and Kingpin crown; highest dirty revenue' },
] as const;
export const HEISTS = [
  { id: 'bank', name: 'Bank Vault', x: 0, z: -120, fee: 300, payout: 7500, roles: ['hacker', 'muscle'], gear: 'Crescent Precision Barrel' },
  { id: 'shipment', name: 'Port Shipment', x: 120, z: 180, fee: 500, payout: 12000, roles: ['smuggler', 'muscle'], gear: 'Ghost Transport Plating' },
  { id: 'casino', name: 'Casino Vault', x: 35, z: 202, fee: 1000, payout: 24000, roles: ['hacker', 'muscle', 'smuggler'], gear: 'Royal Flush Armor' },
  { id: 'mint', name: 'The Mint — Federal Vault', x: 60, z: 0, fee: 2000, payout: 50000, roles: ['hacker', 'muscle', 'demo'], gear: 'Mintmaster Signet' },
] as const;
export const RIVALS = [
  { name: 'Delphine “Velvet” Moreau', crew: 'Violet Crown', style: 'Nightlife and Uptown influence', color: '#bc79ec' },
  { name: 'Silas “Crane” Boudreaux', crew: 'Iron Levee', style: 'Port logistics and lightly defended corners', color: '#eea45d' },
];
export type Expansion = {
  levels: number[]; properties: string[]; disabled: string[]; propertyDay: number; frontsUsed: Record<string, number>; frontClock: number;
  cars: { id: string; engine: number; armor: number; color: number }[]; selectedCar: number; parts: number;
  runs: { car: number; remaining: number; risk: number; pay: number }[];
  furniture: { id: string; slot: number }[]; influence: number[]; rivalClock: number;
  plans: Record<string, { phase: number; intel: number; assigned: string[]; step: number; score: number; cooldown: number }>;
  gear: string[]; mission: null | { id: string; step: number; remaining: number; escort?: number }; completed: string[]; pickupCount: number;
  weaponLevel: number; poker: null | { cards: number[]; held: number[] }; report: string;
};
export function newExpansion(): Expansion {
  return { levels: [0,0,0,0,0], properties: [], disabled: [], propertyDay: 0, frontsUsed: {}, frontClock: 0,
    cars: [], selectedCar: 0, parts: 0, runs: [], furniture: [], influence: [20,30,20,35,40], rivalClock: 0, plans: {}, gear: [],
    mission: null, completed: [], pickupCount: 0, weaponLevel: 0, poker: null, report: '' };
}
export function owns(c: Campaign, id: string) { return c.expansion.properties.includes(id) && !c.expansion.disabled.includes(id); }
export function furnished(c: Campaign, id: string) { return c.expansion.furniture.some(f => f.id === id); }
export function loyal(c: Campaign, id?: string) { return c.crew.filter(m => m.loyalty >= 25 && !m.owed && (!id || m.id === id)); }
export function inventoryCap(c: Campaign) { return 20 + (owns(c,'dock') ? 40 : 0); }
export function cashCap(c: Campaign) { return furnished(c, 'vault') ? 500000 : 100000; }
export function propertyRevenue(c: Campaign) {
  return PROPERTIES.filter(p => owns(c,p.id) && p.id !== 'cafe' && (p.kind !== 'racket' || loyal(c).length > 0)).reduce((n,p) => n + p.rate, 0) * (c.achievements.includes('tycoon') ? 1.05 : 1);
}
export function buyProperty(c: Campaign, id: string) {
  const p = PROPERTIES.find(p => p.id === id);
  if (!p || c.expansion.properties.includes(id) || c.clean < p.cost) return false;
  c.clean -= p.cost; c.expansion.properties.push(id); return true;
}
export function upgradeDistrict(c: Campaign, index: number, owned: boolean) {
  const cost = 400 * (c.expansion.levels[index]! + 1);
  if (!owned || c.expansion.levels[index]! >= 3 || c.clean < cost) return false;
  c.clean -= cost; c.expansion.levels[index]!++; return true;
}
export function buyVehicle(c: Campaign, id: string) {
  const v = VEHICLES.find(v => v.id === id);
  if (!v || c.clean < v.price || c.expansion.cars.length >= 8) return false;
  c.clean -= v.price; c.expansion.cars.push({ id, engine: 0, armor: 0, color: 0x682db5 }); return true;
}
export function upgradeVehicle(c: Campaign, index: number, armor: boolean) {
  const car = c.expansion.cars[index]; if (!car || c.expansion.runs.some(r => r.car === index)) return false;
  const key = armor ? 'armor' : 'engine'; const cost = 250 * (car[key] + 1);
  if (car[key] >= 3 || c.clean < cost || c.expansion.parts < 2) return false;
  c.clean -= cost; c.expansion.parts -= 2; car[key]++; return true;
}
export function startRun(c: Campaign, index: number) {
  const car = c.expansion.cars[index]; if (!car || c.expansion.runs.some(r => r.car === index)) return false;
  const model = VEHICLES.find(v => v.id === car.id)!;
  if (c.inventory[0]! < model.capacity) return false;
  c.inventory[0]! -= model.capacity;
  c.expansion.runs.push({ car: index, remaining: 60 / (model.speed + car.engine * .15),
    risk: Math.max(.05, .15 + c.heat / 200 * conditions(c.clock).visibility - model.armor * .2 - car.armor * .04 - (owns(c,'airboat') ? .1 : 0)),
    pay: Math.round(model.capacity * 350 * (conditions(c.clock).night ? 1.3 : 1) * (c.achievements.includes('fleet') ? 1.05 : 1)) });
  c.heat = Math.min(100, c.heat + 6); return true;
}
export function plan(c: Campaign, id: string) { return c.expansion.plans[id] ??= { phase: 0, intel: 0, assigned: [], step: 0, score: 0, cooldown: 0 }; }
export function recon(c: Campaign, id: string, x: number, z: number) {
  const h = HEISTS.find(h => h.id === id); if (!h) return false;
  const p = plan(c,id); if (p.phase !== 0 || p.cooldown > 0 || Math.hypot(x-h.x,z-h.z)>14) return false;
  p.intel = 100; p.phase = 1; return true;
}
export function assemble(c: Campaign, id: string) {
  const h = HEISTS.find(h => h.id === id); if (!h) return false;
  const p = plan(c,id);
  if (p.phase !== 1 || h.roles.some(role => !loyal(c,role).length) || (id === 'mint' && c.upgrades < 3) || c.clean < h.fee) return false;
  c.clean -= h.fee; p.assigned = [...h.roles]; p.phase = 2; p.step = p.score = 0; return true;
}
export const HEIST_CHOICES = [
  ['Use recon intel to bypass cameras', 'Rush the entrance'],
  ['Let the specialist handle the vault', 'Force a noisy shortcut'],
  ['Use the planned getaway route', 'Escape through the police checkpoint'],
];
export function execute(c: Campaign, id: string, careful: boolean, random = Math.random): string {
  const h = HEISTS.find(h => h.id === id); if (!h) return 'Unknown target';
  const p = plan(c,id); if (p.phase !== 2) return 'Complete recon and assemble the crew first.';
  if (h.roles.some(id => !p.assigned.includes(id) || !loyal(c,id).length)) return 'Assigned crew are unpaid or disloyal. Restore them first.';
  p.score += careful ? 1 : 0; p.step++;
  c.heat = Math.min(100, c.heat + (careful ? 4 : 10) * conditions(c.clock).heat);
  if (p.step < 3) return `Execution ${p.step}/3 complete. ${careful ? 'Quiet approach maintained.' : 'Alarm pressure increased.'}`;
  const success = random() < Math.min(.95, .4 + p.score * .15 - c.heat / 500);
  p.phase = 0; p.intel = 0; p.cooldown = 600;
  if (!success) { c.crew.forEach(m => m.loyalty = Math.max(0,m.loyalty-12)); return 'Heist failed. Crew escaped, but loyalty fell. Retry after cooldown.'; }
  c.dirty = Math.min(cashCap(c), c.dirty + h.payout); c.stats.heists++;
  if (!c.expansion.gear.includes(h.gear)) c.expansion.gear.push(h.gear);
  if (id === 'shipment' && !c.expansion.properties.includes('port')) c.expansion.properties.push('port');
  return `HEIST COMPLETE: $${h.payout.toLocaleString()} dirty + legendary ${h.gear}!`;
}
export const MISSIONS = [
  { id: 'parade', name: 'Mardi Gras — Krewe of the Crescent', desc: 'Join the huge purple, green and gold parade. Recover three lost float-power crates, then escort the illuminated jester float to its finale. Keep the celebration safe: firing near parade-goers adds heat.', pay: 1800, duration: 360,
    steps: [{x:0,z:-18,name:'Meet the parade marshal on Royal Street'}, {x:0,z:42,name:'Recover float power crate — south barricade'}, {x:0,z:-72,name:'Recover float power crate — bead stand'}, {x:0,z:-132,name:'Recover float power crate — north balcony'}, {x:0,z:102,name:'Escort the grand float to the parade finale'}] },
  { id: 'courier', name: 'French Quarter Night Courier', desc: 'A timed, three-stop black-market delivery. Night pays 30% extra.', pay: 900, duration: 150, steps: [{x:30,z:4,name:'Collect sealed parcel at Mama Nola’s'}, {x:60,z:-60,name:'Pass the Frenchmen checkpoint'}, {x:120,z:0,name:'Deliver the sealed parcel'}] },
  { id: 'recovery', name: 'Recover the Stolen Purses', desc: 'Recover three stashes from empty side streets. Night recovery pays 25% extra.', pay: 650, duration: 180, steps: [{x:0,z:60,name:'Find the first abandoned stash'}, {x:-60,z:60,name:'Recover the stolen purses'}, {x:30,z:4,name:'Return the purses to Mama Nola’s'}] },
  { id: 'mechanic', name: 'Chop Shop Parts Run', desc: 'Collect mechanical crates for garage upgrades. +6 parts on completion.', pay: 450, duration: 180, steps: [{x:-60,z:0,name:'Meet the mechanic'}, {x:-120,z:0,name:'Collect the parts crate'}, {x:-60,z:0,name:'Return the parts'}] },
] as const;
export function startMission(c: Campaign, id: string) {
  const m = MISSIONS.find(m => m.id === id); if (!m || c.expansion.mission) return false;
  c.expansion.mission = { id, step: 0, remaining: m.duration }; return true;
}
export function missionInteract(c: Campaign, x: number, z: number): string | null {
  const current = c.expansion.mission; const m = MISSIONS.find(m => m.id === current?.id); if (!m || !current) return null;
  const step = m.steps[current.step]; if (!step || Math.hypot(step.x-x,step.z-z)>8) return null;
  if(m.id==='parade' && current.step===4 && (current.escort??0)<40) return 'Stay within 18m of the lead jester float until its 40-second escort reaches the finale.';
  current.step++;
  if (current.step < m.steps.length) return `Mission advanced: ${m.steps[current.step]!.name}`;
  const multiplier = conditions(c.clock).night ? m.id === 'recovery' ? 1.25 : 1.3 : 1;
  const pay = Math.round(m.pay * multiplier * (c.expansion.gear.includes('Krewe Captain Medallion') ? 1.05 : 1)); c.dirty = Math.min(cashCap(c), c.dirty + pay);
  if (m.id === 'mechanic') c.expansion.parts += 6;
  if (!c.expansion.completed.includes(m.id)) c.expansion.completed.push(m.id);
  if (m.id === 'parade' && !c.expansion.gear.includes('Krewe Captain Medallion')) c.expansion.gear.push('Krewe Captain Medallion');
  c.expansion.mission = null; return `${m.name} COMPLETE! +$${pay} dirty${m.id === 'parade' ? ' + Krewe Captain Medallion (+5% mission rewards)' : ''}`;
}
export function frontLaunder(c: Campaign, id: string): number {
  const p = PROPERTIES.find(p => p.id === id); if (!p || !p.capacity || !owns(c,id)) return 0;
  const used = c.expansion.frontsUsed[id] ?? 0; const amount = Math.min(c.dirty, p.capacity-used);
  if (amount < 1) return 0;
  const fee = Math.max(.03, p.fee - (loyal(c,'hacker').length ? .03 : 0));
  const clean = Math.floor(amount * (1-fee)); c.dirty -= amount; c.clean += clean; c.stats.cleaned += clean;
  c.expansion.frontsUsed[id] = used+amount; c.heat = Math.min(100,c.heat + p.heat); return clean;
}
export function pokerRank(cards: number[]) {
  const ranks = cards.map(c => c%13).sort((a,b) => a-b); const counts = new Map<number,number>();
  ranks.forEach(r => counts.set(r,(counts.get(r)??0)+1)); const groups = [...counts.values()].sort((a,b) => b-a);
  const flush = cards.every(c => Math.floor(c/13) === Math.floor(cards[0]!/13));
  const straight = new Set(ranks).size === 5 && (ranks[4]!-ranks[0] === 4 || ranks.join(',') === '0,9,10,11,12');
  return flush && straight ? 1000 : groups[0]===4 ? 400 : groups[0]===3 && groups[1]===2 ? 200 : flush ? 150 : straight ? 100 : groups[0]===3 ? 75 : groups[0]===2 && groups[1]===2 ? 50 : groups[0]===2 ? 25 : 0;
}
export function playPoker(c: Campaign, random = Math.random) {
  if (!furnished(c,'poker')) return false;
  const e = c.expansion;
  const draw = (existing: number[]) => { let n; do { n = Math.floor(random()*52); } while (existing.includes(n)); return n; };
  if (!e.poker) { if (c.clean < 25) return false; c.clean -= 25; const cards: number[] = []; for(let i=0;i<5;i++) cards.push(draw(cards)); e.poker = {cards,held:[]}; }
  else {
    const original = [...e.poker.cards]; const next = e.poker.cards.map((card,i) => e.poker!.held.includes(i) ? card : (original.push(draw(original)),original[original.length-1]!));
    const reward = pokerRank(next); c.clean += reward; e.report = `Poker: ${next.map(n=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'][n%13]+['♠','♥','♦','♣'][Math.floor(n/13)]).join(' ')} · won $${reward}`; e.poker = null;
  } return true;
}
export function offlineExpansion(c: Campaign, seconds: number) {
  const e=c.expansion;
  const income=Math.floor(propertyRevenue(c)*seconds/60*.35*(e.gear.includes('Mintmaster Signet')?1.05:1));
  c.dirty=Math.min(cashCap(c),c.dirty+income);
  if(owns(c,'cafe'))c.clean+=Math.floor(25*seconds/60*.35);
  e.propertyDay+=seconds;
  if(e.propertyDay>=86400){const days=Math.floor(e.propertyDay/86400);e.propertyDay%=86400;e.disabled=[];for(const p of PROPERTIES.filter(p=>e.properties.includes(p.id))){const due=p.upkeep*days;if(c.clean>=due)c.clean-=due;else e.disabled.push(p.id);}}
  e.frontClock=(e.frontClock+seconds)%60;if(seconds>=60)e.frontsUsed={};
  for(const p of Object.values(e.plans))p.cooldown=Math.max(0,p.cooldown-seconds);
  // No offline random raid/showdown rolls. Vehicle runs and active missions resume their timers.
  const risk=PROPERTIES.filter(p=>owns(c,p.id)).reduce((n,p)=>n+p.heat,0);
  c.heat=Math.max(0,Math.min(100,c.heat+risk*seconds/60*.1));
  return income;
}
export function tickExpansion(c: Campaign, dt: number, random = Math.random): string[] {
  const e = c.expansion; const messages: string[] = [];
  e.frontClock += dt; if(e.frontClock>=60) { e.frontClock%=60; e.frontsUsed={};
    if(owns(c,'chop') && loyal(c).length) e.parts++;
    if(owns(c,'dock') && loyal(c).length && c.inventory.reduce((a,b)=>a+b,0)<inventoryCap(c)) c.inventory[0]!++;
  }
  e.propertyDay += dt; if(e.propertyDay>=86400) {
    const days = Math.floor(e.propertyDay/86400); e.propertyDay%=86400;
    e.disabled=[];
    for(const p of PROPERTIES.filter(p=>e.properties.includes(p.id))) { const cost=p.upkeep*days; if(c.clean>=cost) c.clean-=cost; else {e.disabled.push(p.id); messages.push(`${p.name}: missed upkeep; bonuses paused until paid.`);} }
  }
  for(const p of PROPERTIES.filter(p=>owns(c,p.id))) c.heat = Math.max(0,Math.min(100,c.heat + p.heat * conditions(c.clock).heat * dt/60));
  c.dirty = Math.min(cashCap(c),c.dirty + propertyRevenue(c)*dt/60 * (e.gear.includes('Mintmaster Signet') ? 1.05 : 1));
  if(owns(c,'cafe')) c.clean += 25*dt/60;
  for (let i=e.runs.length-1;i>=0;i--) { const run=e.runs[i]!; run.remaining-=dt; if(run.remaining>0) continue;
    if(random()<run.risk) { messages.push('Transport intercepted at a police roadblock. Cargo lost.'); c.heat=Math.min(100,c.heat+10); c.crew.forEach(m=>m.loyalty=Math.max(0,m.loyalty-8)); }
    else { c.dirty=Math.min(cashCap(c),c.dirty+run.pay); messages.push(`Vehicle delivery complete: +$${run.pay} dirty.`); }
    e.runs.splice(i,1);
  }
  for(const p of Object.values(e.plans)) p.cooldown=Math.max(0,p.cooldown-dt);
  if(e.mission) {e.mission.remaining-=dt; if(e.mission.remaining<=0){e.mission=null; c.crew.forEach(m=>m.loyalty=Math.max(0,m.loyalty-12)); messages.push('Side mission timed out. Retry from Missions.');}}
  e.rivalClock+=dt;
  if(e.rivalClock>=120) {e.rivalClock%=120; const i=Math.floor(random()*5); e.influence[i]=Math.min(100,e.influence[i]!+Math.max(3,12-e.levels[i]!*3));
    const block=['frenchmen','skidrow','uptown','warehouse','bayou'][i]!;
    if(c.owned.includes(block) && !c.defense && e.influence[i]! > 40) { c.defense={block,remaining:furnished(c,'camera')?120:90}; messages.push(`SYNDICATE SHOWDOWN: ${DISTRICT_NAMES[i]} is being challenged!`); }
    else messages.push(`${RIVALS[i%2]!.crew} expands influence in ${DISTRICT_NAMES[i]}.`);
  }
  if(c.heat>=85 && c.policeClock>=55 && c.policeClock-dt<55 && (furnished(c,'camera')||owns(c,'precinct'))) messages.push('EARLY WARNING: precinct raid expected in 20 seconds. Launder or lay low!');
  return messages;
}
export function restoreExpansion(value: unknown): Expansion {
  const e = newExpansion(); if(!value || typeof value!=='object') return e;
  const v=value as Record<string,any>; const n=(v: unknown,max=1e9) => typeof v==='number'&&Number.isFinite(v)?Math.max(0,Math.min(max,v)):0;
  e.levels=Array.from({length:5},(_,i)=>Math.floor(n(v.levels?.[i],3)));
  e.properties=PROPERTIES.filter(p=>Array.isArray(v.properties)&&v.properties.includes(p.id)).map(p=>p.id);
  e.disabled=e.properties.filter(id=>Array.isArray(v.disabled)&&v.disabled.includes(id));
  for(const k of ['parts','propertyDay','frontClock','rivalClock','pickupCount','weaponLevel'] as const) e[k]=n(v[k],k==='weaponLevel'?5:1e9);
  e.influence=Array.from({length:5},(_,i)=>n(v.influence?.[i]??20,100));
  if(Array.isArray(v.cars)) e.cars=v.cars.slice(0,8).filter((car:any)=>VEHICLES.some(m=>m.id===car?.id)).map((car:any)=>({id:car.id,engine:Math.floor(n(car.engine,3)),armor:Math.floor(n(car.armor,3)),color:Math.floor(n(car.color,0xffffff))}));
  e.selectedCar=Math.floor(n(v.selectedCar,Math.max(0,e.cars.length-1)));
  if(Array.isArray(v.runs)) for(const r of v.runs) if(Number.isInteger(r?.car)&&e.cars[r.car]&&!e.runs.some(o=>o.car===r.car)) e.runs.push({car:r.car,remaining:n(r.remaining,180),risk:n(r.risk,1),pay:n(r.pay,20000)});
  if(Array.isArray(v.furniture)) for(const f of v.furniture) if(FURNITURE.some(m=>m.id===f?.id)&&!e.furniture.some(o=>o.id===f.id)&&Number.isInteger(f.slot)&&f.slot>=0&&f.slot<6&&!e.furniture.some(o=>o.slot===f.slot))e.furniture.push({id:f.id,slot:f.slot});
  e.completed=MISSIONS.filter(m=>Array.isArray(v.completed)&&v.completed.includes(m.id)).map(m=>m.id);
  if(Array.isArray(v.completed)&&v.completed.includes('kingpin'))e.completed.push('kingpin');
  e.report=typeof v.report==='string'?v.report.slice(0,300):'';
  e.gear=[...HEISTS.map(h=>h.gear),'Krewe Captain Medallion'].filter(g=>Array.isArray(v.gear)&&v.gear.includes(g));
  for(const h of HEISTS) if(v.plans?.[h.id]) {const p=v.plans[h.id];e.plans[h.id]={phase:Math.floor(n(p.phase,2)),intel:n(p.intel,100),assigned:h.roles.filter(r=>Array.isArray(p.assigned)&&p.assigned.includes(r)),step:Math.floor(n(p.step,2)),score:n(p.score,3),cooldown:n(p.cooldown,600)};}
  for(const p of PROPERTIES) if(v.frontsUsed?.[p.id] !== undefined)e.frontsUsed[p.id]=n(v.frontsUsed[p.id],p.capacity);
  const m=MISSIONS.find(m=>m.id===v.mission?.id); if(m)e.mission={id:m.id,step:Math.floor(n(v.mission.step,m.steps.length-1)),remaining:n(v.mission.remaining,m.duration),escort:n(v.mission.escort,40)};
  if(v.poker&&Array.isArray(v.poker.cards)&&v.poker.cards.length===5&&new Set(v.poker.cards).size===5&&v.poker.cards.every((n:any)=>Number.isInteger(n)&&n>=0&&n<52))e.poker={cards:v.poker.cards,held:[0,1,2,3,4].filter(i=>v.poker.held?.includes(i))};
  return e;
}
