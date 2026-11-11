// Campaign simulation. All money/heat changes are explicit; standing at spawn pays nothing.
export const BLOCKS = [
  { id: 'skidrow', name: 'Skidrow', district: 1, x: -120, z: -120, rate: 180, risk: 1.5 },
  { id: 'warehouse', name: 'Warehouse District', district: 3, x: 60, z: 120, rate: 260, risk: 2.2 },
  { id: 'uptown', name: 'Uptown', district: 2, x: -120, z: 60, rate: 220, risk: 1.8 },
  { id: 'frenchmen', name: 'Frenchmen Corner', district: 0, x: 60, z: -60, rate: 140, risk: 1 },
  { id: 'bayou', name: 'Bayou Landing', district: 4, x: 120, z: -120, rate: 200, risk: 1.3 },
] as const;
export const SPECIALISTS = [
  { id: 'muscle', name: 'Simone “Brick” Baptiste', role: 'Muscle Enforcer', fee: 200, wage: 120, defense: 35, payout: 0, cooling: 0, desc: '+35% remote defense chance; -15% combat damage per active enforcer.' },
  { id: 'hacker', name: 'Eli “Switch” Tran', role: 'Hacker / Safecracker', fee: 350, wage: 160, defense: 8, payout: 0.15, cooling: 0, desc: '+15% contract, heist and turf payouts.' },
  { id: 'smuggler', name: 'Mateo “Ghost” Reyes', role: 'Smuggler', fee: 250, wage: 100, defense: 12, payout: 0, cooling: 0.5, desc: '-50% passive turf heat and -30% action heat.' },
] as const;
export const GOODS = [
  { id: 'crates', name: 'Unmarked crates', base: 70 },
  { id: 'chips', name: 'Hot electronics', base: 130 },
  { id: 'art', name: 'Stolen art', base: 220 },
] as const;
export const EVENTS = ['Quiet streets', 'Port blockade', 'Rival crew war', 'Police crackdown', 'Festival demand'] as const;
export type Appearance = { gender: string; heritage: string; skin: number; outfit: number; hair: number };
export type Campaign = {
  clean: number; dirty: number; heat: number; owned: string[]; crew: { id: string; loyalty: number; owed: number }[];
  inventory: number[]; upgrades: number; avatar: Appearance; clock: number; wageClock: number; marketClock: number;
  marketEvent: number; defenseClock: number; defense: null | { block: string; remaining: number };
  policeClock: number; intervention: string; cooldown: number; heistCooldown: number;
  stats: { cleaned: number; captured: number; maxHeat: number; defended: number; deals: number; heists: number };
  achievements: string[]; audio: { music: number; ambient: number; sfx: number; muted: boolean }; alias: string;
};
export function newCampaign(): Campaign {
  return { clean: 300, dirty: 0, heat: 0, owned: [], crew: [], inventory: [0, 0, 0], upgrades: 0,
    avatar: { gender: 'Man', heritage: 'Not specified', skin: 2, outfit: 0, hair: 0 }, clock: 0, wageClock: 0,
    marketClock: 0, marketEvent: 0, defenseClock: 100, defense: null, policeClock: 0, intervention: '', cooldown: 0, heistCooldown: 0,
    stats: { cleaned: 0, captured: 0, maxHeat: 0, defended: 0, deals: 0, heists: 0 }, achievements: [],
    audio: { music: 0.35, ambient: 0.35, sfx: 0.7, muted: false }, alias: 'New Kingpin' };
}
export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
export function activeCrew(c: Campaign) { return c.crew.filter(m => m.loyalty >= 25 && m.owed === 0); }
export function bonus(c: Campaign) {
  const active = activeCrew(c);
  return { defense: active.reduce((v, m) => v + SPECIALISTS.find(s => s.id === m.id)!.defense, 0),
    payout: active.reduce((v, m) => v + SPECIALISTS.find(s => s.id === m.id)!.payout, 0),
    cooling: active.some(m => m.id === 'smuggler') ? 0.5 : 0, muscle: active.some(m => m.id === 'muscle') };
}
export function revenuePerMinute(c: Campaign): number {
  const base = BLOCKS.filter(b => c.owned.includes(b.id) && c.defense?.block !== b.id).reduce((v, b) => v + b.rate, 0);
  return base * (1 + c.upgrades * 0.15 + bonus(c).payout + (c.achievements.includes('cleaner') ? 0.05 : 0));
}
export function addHeat(c: Campaign, amount: number, action = true) {
  c.heat = clamp(c.heat + amount * (action && amount > 0 && bonus(c).cooling ? 0.7 : 1));
  c.stats.maxHeat = Math.max(c.stats.maxHeat, c.heat);
}
export function failMission(c: Campaign) { for (const m of c.crew) m.loyalty = clamp(m.loyalty - 12); }
export function hire(c: Campaign, id: string): boolean {
  const s = SPECIALISTS.find(m => m.id === id);
  if (!s || c.crew.some(m => m.id === id) || c.clean < s.fee) return false;
  c.clean -= s.fee; c.crew.push({ id, loyalty: 75, owed: 0 }); return true;
}
export function settleWages(c: Campaign, id: string): boolean {
  const m = c.crew.find(m => m.id === id);
  if (!m || m.owed <= 0 || c.clean < m.owed) return false;
  c.clean -= m.owed; m.owed = 0; m.loyalty = clamp(m.loyalty + 20); return true;
}
function wages(c: Campaign, days: number) {
  for (const m of c.crew) {
    const due = SPECIALISTS.find(s => s.id === m.id)!.wage * days;
    if (c.clean >= due + m.owed) { c.clean -= due + m.owed; m.owed = 0; m.loyalty = clamp(m.loyalty + 3 * days); }
    else { m.owed += due; m.loyalty = clamp(m.loyalty - 20 * days); }
  }
}
export function captureBlock(c: Campaign, id: string): boolean {
  if (!BLOCKS.some(b => b.id === id) || c.owned.includes(id)) return false;
  c.owned.push(id); c.stats.captured++; addHeat(c, 14); return true;
}
export function resolveDefense(c: Campaign, success: boolean) {
  if (!c.defense) return;
  if (success) { c.stats.defended++; for (const m of c.crew) m.loyalty = clamp(m.loyalty + 4); }
  else { c.owned = c.owned.filter(id => id !== c.defense!.block); failMission(c); }
  c.defense = null; c.defenseClock = 100;
}
export function price(c: Campaign, good: number, district: number): number {
  const g = GOODS[good]!;
  const demand = 0.85 + ((district * 3 + good * 2 + Math.floor(c.clock / 90)) % 7) * 0.1;
  const event = c.marketEvent === 1 ? 1.4 : c.marketEvent === 2 ? 1.2 : c.marketEvent === 3 ? 0.7 : c.marketEvent === 4 ? 1.3 : 1;
  return Math.round(g.base * demand * event * (c.heat >= 60 ? 0.85 : 1));
}
export function trade(c: Campaign, good: number, district: number, sell: boolean): boolean {
  if (!Number.isInteger(good) || good < 0 || good >= GOODS.length) return false;
  const value = price(c, good, district);
  if (sell) {
    if (c.inventory[good]! < 1) return false;
    c.inventory[good]!--; c.dirty += Math.round(value * (1 + bonus(c).payout)); c.stats.deals++; addHeat(c, 4);
  } else {
    const cost = Math.ceil(value * 1.15);
    if (c.clean < cost) return false;
    c.clean -= cost; c.inventory[good]!++; addHeat(c, 1);
  }
  return true;
}
export function launder(c: Campaign, amount: number): number {
  const n = Math.min(c.dirty, Math.max(0, Math.floor(amount)));
  const clean = Math.floor(n * 0.8); if (!clean) return 0;
  c.dirty -= n; c.clean += clean; c.stats.cleaned += clean; addHeat(c, 2); return clean;
}
export function layLow(c: Campaign): boolean {
  if (c.cooldown > 0 || c.clean < 150 || c.heat <= 0) return false;
  c.clean -= 150; c.heat = Math.max(0, c.heat - 30); c.cooldown = 60; return true;
}
export function heist(c: Campaign, random = Math.random): boolean | null {
  if (c.heistCooldown > 0 || c.clean < 100) return null;
  c.clean -= 100; c.heistCooldown = 180; addHeat(c, 25);
  const success = random() < Math.min(0.9, 0.45 + bonus(c).defense / 100 + bonus(c).payout);
  if (success) { c.dirty += Math.round(1200 * (1 + bonus(c).payout)); c.stats.heists++; }
  else failMission(c);
  return success;
}
export const ACHIEVEMENTS = [
  { id: 'corner', name: 'First Corner', description: 'Capture a neighborhood block', reward: '$200 clean capital', done: (c: Campaign) => c.stats.captured >= 1 },
  { id: 'cleaner', name: 'Clean Operator', description: 'Launder $5,000 total', reward: 'Permanent +5% turf revenue', done: (c: Campaign) => c.stats.cleaned >= 5000 },
  { id: 'guardian', name: 'Hold the Line', description: 'Win 3 turf defenses', reward: '$750 clean capital', done: (c: Campaign) => c.stats.defended >= 3 },
  { id: 'survivor', name: 'Too Hot to Handle', description: 'Survive 80 heat and cool below 20', reward: '$500 clean capital', done: (c: Campaign) => c.stats.maxHeat >= 80 && c.heat < 20 },
];
export function unlock(c: Campaign): string[] {
  const unlocked: string[] = [];
  for (const a of ACHIEVEMENTS) if (!c.achievements.includes(a.id) && a.done(c)) {
    c.achievements.push(a.id); c.clean += a.id === 'corner' ? 200 : a.id === 'guardian' ? 750 : a.id === 'survivor' ? 500 : 0; unlocked.push(a.name);
  }
  return unlocked;
}
export function tickCampaign(c: Campaign, dt: number, random = Math.random): string[] {
  const messages: string[] = []; c.clock += dt; c.wageClock += dt;
  c.cooldown = Math.max(0, c.cooldown - dt); c.heistCooldown = Math.max(0, c.heistCooldown - dt);
  const days = Math.floor(c.wageClock / 86400);
  if (days) { wages(c, days); c.wageClock %= 86400; messages.push('Daily wages processed. Check crew loyalty and arrears.'); }
  c.marketClock += dt;
  if (c.marketClock >= 90) { c.marketClock %= 90; c.marketEvent = Math.floor(random() * EVENTS.length); messages.push(`City economy: ${EVENTS[c.marketEvent]}`); }
  const rate = revenuePerMinute(c);
  c.dirty += rate * dt / 60;
  const risk = BLOCKS.filter(b => c.owned.includes(b.id)).reduce((v, b) => v + b.risk, 0);
  addHeat(c, (risk * (1 - bonus(c).cooling) / 60 - (c.owned.length ? 0.01 : 0.035)) * dt, false);
  if (c.defense) {
    c.defense.remaining -= dt;
    if (c.defense.remaining <= 0) { resolveDefense(c, false); messages.push('A rival crew reclaimed a corner. Crew loyalty fell.'); }
  } else if (c.owned.length) {
    c.defenseClock -= dt;
    if (c.defenseClock <= 0) { c.defense = { block: c.owned[Math.floor(random() * c.owned.length)]!, remaining: 90 }; messages.push('TURF UNDER ATTACK — respond on the Empire map!'); }
  }
  c.policeClock += dt;
  if (c.heat < 30) c.intervention = '';
  if (c.policeClock >= 75) {
    c.policeClock = 0;
    if (c.heat >= 85) { c.intervention = 'Precinct raid'; c.dirty *= 0.8; c.inventory = c.inventory.map(n => Math.floor(n / 2)); failMission(c); messages.push('PRECINCT RAID: 20% dirty cash and half your goods seized.'); }
    else if (c.heat >= 60) { c.intervention = 'Patrol roadblock'; messages.push('Patrol roadblock deployed near you. Lay low to clear it.'); }
    else if (c.heat >= 30) { c.intervention = 'Informant'; messages.push('An informant is watching. Bribe them in the Safehouse panel.'); }
  }
  messages.push(...unlock(c).map(name => `Achievement unlocked: ${name}`)); return messages;
}
export function offlineProgress(c: Campaign, elapsed: number) {
  const seconds = clamp(elapsed, 0, 86400);
  const income = Math.floor(revenuePerMinute(c) * seconds / 60 * 0.35);
  const oldHeat = c.heat;
  c.dirty += income;
  const risk = BLOCKS.filter(b => c.owned.includes(b.id)).reduce((v, b) => v + b.risk, 0);
  addHeat(c, risk * seconds / 60 * 0.1 * (1 - bonus(c).cooling), false);
  c.wageClock += seconds;
  const days = Math.floor(c.wageClock / 86400); if (days) { wages(c, days); c.wageClock %= 86400; }
  c.cooldown = Math.max(0, c.cooldown - seconds); c.heistCooldown = Math.max(0, c.heistCooldown - seconds);
  return { seconds, income, heat: Math.round(c.heat - oldHeat) };
}

// Validate persisted data at the boundary: malformed or older saves never crash the simulation.
export function restoreCampaign(value: unknown): Campaign | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, any>; const c = newCampaign();
  const num = (v: unknown, fallback = 0, max = 1e9) => typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, max) : fallback;
  for (const key of ['clean','dirty','heat','clock','wageClock','marketClock','marketEvent','defenseClock','policeClock','cooldown','heistCooldown','upgrades'] as const) c[key] = num(v[key], c[key], key === 'heat' ? 100 : key === 'upgrades' ? 5 : 1e9);
  c.marketEvent = Math.floor(c.marketEvent) % EVENTS.length;
  c.owned = BLOCKS.filter(b => Array.isArray(v.owned) && v.owned.includes(b.id)).map(b => b.id);
  c.crew = SPECIALISTS.filter(s => Array.isArray(v.crew) && v.crew.some((m: any) => m?.id === s.id)).map(s => {
    const m = v.crew.find((m: any) => m?.id === s.id); return { id: s.id, loyalty: num(m.loyalty, 75, 100), owed: num(m.owed) };
  });
  c.inventory = GOODS.map((_, i) => Math.floor(num(v.inventory?.[i], 0, 10000)));
  for (const key of Object.keys(c.stats) as (keyof Campaign['stats'])[]) c.stats[key] = num(v.stats?.[key]);
  c.achievements = ACHIEVEMENTS.filter(a => Array.isArray(v.achievements) && v.achievements.includes(a.id)).map(a => a.id);
  c.alias = typeof v.alias === 'string' ? v.alias.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 24) : c.alias;
  const a = v.avatar;
  if (a && typeof a === 'object') c.avatar = { gender: ['Man','Woman','Nonbinary'].includes(a.gender) ? a.gender : 'Nonbinary', heritage: typeof a.heritage === 'string' ? a.heritage.slice(0, 40) : 'Not specified', skin: Math.floor(num(a.skin, 2, 5)), outfit: Math.floor(num(a.outfit, 0, 3)), hair: Math.floor(num(a.hair, 0, 5)) };
  if (v.audio) c.audio = { music: num(v.audio.music, .35, 1), ambient: num(v.audio.ambient, .35, 1), sfx: num(v.audio.sfx, .7, 1), muted: v.audio.muted === true };
  if (v.defense && c.owned.includes(v.defense.block)) c.defense = { block: v.defense.block, remaining: num(v.defense.remaining, 90, 90) };
  c.intervention = ['Informant','Patrol roadblock','Precinct raid'].includes(v.intervention) ? v.intervention : '';
  return c;
}
