import {locationMap} from './location-map.ts';
import type {MapLocation} from './navigation.ts';
import {mountShowroom} from './showroom.ts';
import {lifestylePanel} from './lifestyle-ui.ts';
import {cityStoriesPanel} from './city-stories-ui.ts';
import { legacyPanel } from './legacy-ui.ts';
import { owns } from './expansion.ts';
import { EXPANSION_TABS, renderExpansion } from './expansion-ui.ts';
import { ACHIEVEMENTS, BLOCKS, EVENTS, GOODS, SPECIALISTS, activeCrew, bonus, heist, hire, launder, layLow, price, salePrice, resolveDefense, revenuePerMinute, settleWages, trade, type Campaign } from './campaign.ts';
export type EmpireHooks = {
  trackLocation(p:MapLocation):void; retire():void;travel(x:number,z:number):void;repair():void; milestone():void; missionStarted():void; characterConfirmed():void; backRoom():void; buildings(): readonly {id:string;name:string;x:number;z:number}[]; enterBuilding(id:string):void; campaign: Campaign; pause(open: boolean): void; changed(): void; notice(text: string): void;
  location(): { x: number; z: number; district: number }; attack(id: string): void; waypoint(x: number, z: number, name: string): void;
  deploy(index: number): void; armory(weapon: number): void; gearOwned(weapon: number): boolean; appearance(): void; save(): void; reset(): Promise<void>; audio(): void;
};
const money = (n: number) => `$${Math.floor(n).toLocaleString()}`;
const distance = (a: { x: number; z: number }, x: number, z: number) => Math.round(Math.hypot(a.x - x, a.z - z));
const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); e.textContent = text; e.className = cls; return e; };
export function createEmpireUI(h: EmpireHooks) {
  const c = h.campaign;
  const overlay = document.getElementById('empire')!;
  const content = document.getElementById('empireContent')!;
  const summary = document.getElementById('empireSummary')!;
  const tabs = [...EXPANSION_TABS, 'Turf', 'Crew', 'Market', 'Safehouse', 'Character', 'Achievements', 'Leaderboard', 'Buildings', 'Legacy & Training', 'Stories & Exploration', 'Jobs & Style', 'City Map', 'Settings'];
  let selected = 'Turf'; let opened = false;
  function button(parent: HTMLElement, text: string, fn: () => void, disabled = false) {
    const b = document.createElement('button'); b.textContent = text; b.disabled = disabled;
    b.onclick = () => { fn(); h.changed(); if (opened) render(); }; parent.append(b); return b;
  }
  function card(title: string, text: string) {
    const box = el('article', '', 'empire-card'); box.append(el('h3', title), el('p', text)); content.append(box); return box;
  }
  function close() { opened = false; overlay.hidden = true; h.pause(false); }
  function open(tab = 'Turf') {
    h.milestone(); selected = tab; opened = true; overlay.hidden = false; h.pause(true); render();
    (document.getElementById('empireClose') as HTMLButtonElement).focus();
  }
  document.getElementById('empireClose')!.onclick = close;
  document.getElementById('openCityMap')!.onclick=()=>open('City Map');
  document.getElementById('manage')!.onclick = () => open();
  document.getElementById('festivalLaunch')!.onclick = () => open('Missions');
  document.getElementById('customize')!.onclick = () => open('Character');
  document.getElementById('mute')!.onclick = () => { c.audio.muted = !c.audio.muted; h.audio(); h.changed(); };
  const nav = document.getElementById('empireTabs')!;
  tabs.forEach(tab => button(nav, tab, () => { selected = tab; }));
  overlay.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  function render() {
    content.replaceChildren();
    summary.textContent = `${money(c.clean)} clean · ${money(c.dirty)} dirty · Heat ${Math.floor(c.heat)}/100 · ${Math.floor(revenuePerMinute(c))}/min from turf`;
    Array.from(nav.children).forEach((b, i) => b.setAttribute('aria-pressed', String(tabs[i] === selected)));
    if (renderExpansion(selected,c,content,{location:h.location,waypoint:h.waypoint,close,notice:h.notice,deploy:h.deploy,armory:h.armory,gearOwned:h.gearOwned,missionStarted:h.missionStarted,reload:h.changed})) return;
    content.append(el('h2', selected));
    if(selected==='City Map'){locationMap(content,h.location(),p=>{h.trackLocation(p);close();h.missionStarted();});}
    else if(selected==='Jobs & Style'){lifestylePanel(c,content,{changed:h.changed,track:h.waypoint,resume:()=>{close();h.missionStarted();}});}
    else if(selected==='Stories & Exploration'){cityStoriesPanel(c,content,{changed:h.changed,track:h.waypoint,resume:()=>{close();h.missionStarted();}});}
    else if(selected==='Legacy & Training'){legacyPanel(c,content,{changed:h.changed,retire:h.retire,travel:h.travel,repair:h.repair,waypoint:(x,z)=>{h.waypoint(x,z,'Daily checkpoint');close();}});}
    else if (selected === 'Buildings') {
      content.append(el('p','Signed building entrances, including three homes and all business/heist destinations. Enter on foot at the facade door. Outdoor combat and income pause while inside. Visit the back desk for services; E at the teal exit or Exit Building returns you to your original street position. Property ownership and prices remain unchanged.'));
      for(const b of h.buildings()){
        const d=distance(h.location(),b.x,b.z),near=d<=3;
        const item=card(b.name,`${d} m away · walkable furnished room · no entry fee`);
        button(item,near?'Enter building':'Mark entrance',()=>{if(near){h.enterBuilding(b.id);close();}else{h.waypoint(b.x,b.z,b.name);close();}});
      }
    } else if (selected === 'Turf') {
      content.append(el('p', 'Select a corner to mark it on the minimap. Travel there, press E to start a fight, and defeat its guards. Controlled corners earn dirty cash per minute but raise heat. Rival attacks suspend that corner’s revenue.'));
      if (c.defense) {
        const block = BLOCKS.find(b => b.id === c.defense!.block)!;
        const warning = card(`UNDER ATTACK: ${block.name}`, `${Math.ceil(c.defense.remaining)} seconds left. Fight on-site or dispatch a loyal, fully paid crew.`);
        button(warning, 'Go defend', () => { h.waypoint(block.x, block.z, `Defend ${block.name}`); close(); });
        const chance = Math.min(.9, .2 + bonus(c).defense / 100);
        button(warning, `Dispatch crew (${Math.round(chance * 100)}% success)`, () => {
          const success = Math.random() < chance; resolveDefense(c, success);
          h.notice(success ? 'Your crew held the corner!' : 'Defense failed. Corner lost; loyalty fell.');
        }, activeCrew(c).length === 0);
      }
      const map = el('div', '', 'district-map');
      map.setAttribute('aria-label', 'Neighborhood district selector');
      for (const b of BLOCKS) {
        const mark = button(map, b.name, () => { h.waypoint(b.x, b.z, b.name); close(); });
        mark.style.left = `${(b.x + 200) / 4}%`; mark.style.top = `${(b.z + 200) / 4}%`;
        mark.classList.toggle('owned', c.owned.includes(b.id));
      }
      content.append(map);
      for (const b of BLOCKS) {
        const owned = c.owned.includes(b.id); const dist = distance(h.location(), b.x, b.z);
        const item = card(`${owned ? '●' : '○'} ${b.name}`, `${owned ? 'Controlled' : 'Rival turf'} · ${money(b.rate)}/min base · +${b.risk} heat/min · ${dist} m away`);
        button(item, owned ? 'Visit corner' : dist < 14 ? 'Fight for this corner' : 'Mark route', () => {
          if (!owned && dist < 14) { h.attack(b.id); close(); }
          else { h.waypoint(b.x, b.z, b.name); close(); }
        });
      }
    } else if (selected === 'Crew') {
      content.append(el('p', 'One of each specialist. Wages come from clean capital every 24 real hours of online/offline time. Unpaid or low-loyalty crew (<25) stop providing bonuses. Mission failure costs 12 loyalty.'));
      for (const s of SPECIALISTS) {
        const m = c.crew.find(m => m.id === s.id);
        const hireFee=Math.round(s.fee*(owns(c,"cafe")?.85:1));
        const item = card(`${s.name} · ${s.role}`, `${s.desc} Defense ${s.defense} · payout +${s.payout * 100}% · passive heat reduction ${s.cooling * 100}% · daily wage ${money(s.wage)}.`);
        if (m) {
          item.append(el('p', `Loyalty ${Math.floor(m.loyalty)}/100 · Owed ${money(m.owed)} · ${m.loyalty >= 25 && !m.owed ? 'ACTIVE' : 'INACTIVE'}`));
          button(item, 'Pay wage arrears (+20 loyalty)', () => { settleWages(c, s.id); }, !m.owed || c.clean < m.owed);
          button(item, 'Loyalty bonus $75 (+15)', () => { c.clean -= 75; m.loyalty = Math.min(100, m.loyalty + 15); }, c.clean < 75 || m.loyalty >= 100);
          button(item, 'Dismiss', () => { c.crew = c.crew.filter(o => o !== m); });
        } else button(item, `Hire · ${money(hireFee)}`, () => { hire(c, s.id); }, c.clean < hireFee);
      }
    } else if (selected === 'Market') {
      const district = h.location().district;
      content.append(el('p', `Local market · district ${district + 1} · ${EVENTS[c.marketEvent]}. Prices rotate every 90 seconds, differ by district and respond to crackdowns. Buy with clean capital, sell for dirty cash. Buying costs 15% above resale: move between districts or wait for demand.`));
      for (const [i, g] of GOODS.entries()) {
        const sell = salePrice(c, i, district); const buy = Math.ceil(price(c,i,district) * 1.15);
        const item = card(g.name, `Carrying ${c.inventory[i]} · buy ${money(buy)} · sell ${money(sell)} · selling adds heat`);
        button(item, 'Buy one', () => { trade(c, i, district, false); }, c.clean < buy);
        button(item, 'Sell one', () => { trade(c, i, district, true); }, !c.inventory[i]);
        item.append(el('small', BLOCKS.map(b => `${b.name}: ${money(price(c, i, b.district))}`).join(' · ')));
      }
      const item = card('Warehouse heist', `Risk $100 clean for $1,200 dirty (+crew bonuses). Adds 25 heat; 3-minute cooldown. Failure lowers loyalty. Success chance ${Math.round(Math.min(.9, .45 + bonus(c).defense / 100 + bonus(c).payout) * 100)}%.`);
      const near = distance(h.location(), 60, 120) < 14;
      button(item, near ? `Run heist${c.heistCooldown ? ` (${Math.ceil(c.heistCooldown)}s cooldown)` : ''}` : 'Travel to warehouse heist', () => {
        if (!near) { h.waypoint(60, 120, 'Warehouse heist'); close(); return; }
        const success = heist(c); h.notice(success ? 'Heist succeeded! Dirty cash acquired.' : 'Heist failed. Crew loyalty dropped.');
      }, near && (c.clean < 100 || c.heistCooldown > 0));
    } else if (selected === 'Safehouse') {
      const near = distance(h.location(), 30, 4) < 10;
      content.append(el('p', `Mama Nola’s is your safehouse. ${near ? 'You are inside its safe zone.' : 'Travel to the gold HQ marker to launder cash or lay low.'} Operations pause while managing your empire.`));
      button(content, 'Back room gear & import jobs', () => {close();h.backRoom();}, !near);
      button(content, 'Mark safehouse', () => { h.waypoint(30, 4, 'Safehouse'); close(); });
      const wash = card('Laundering desk', 'Convert dirty cash into clean capital at an 80% return (83% with a paid, loyal Hacker). High-tier upgrades and crew wages require clean funds. +2 heat per batch.');
      button(wash, 'Launder $500 dirty → $400 clean', () => { launder(c, 500); }, !near || c.dirty < 500);
      button(wash, 'Launder all dirty cash', () => { launder(c, c.dirty); }, !near || c.dirty < 2);
      const hide = card('Lay low', `Pay $150 clean to clear 30 heat. Available every 60 seconds; ${Math.ceil(c.cooldown)}s remaining. No free cash or heat reset on entry.`);
      button(hide, 'Lay low · $150', () => { layLow(c); }, !near || c.clean < 150 || c.heat <= 0 || c.cooldown > 0);
      const police = card('Police pressure', `Heat 30: informants · 60: physical patrol roadblocks · 85: precinct raids. Police act every 75 seconds. Current: ${c.intervention || 'No active intervention'}. Raids seize 20% dirty cash and half inventory.`);
      button(police, 'Bribe informant · $100 clean / -20 heat', () => { c.clean -= 100; c.heat = Math.max(0, c.heat - 20); c.intervention = ''; }, c.intervention !== 'Informant' || c.clean < 100);
      button(police, 'Precinct settlement · $350 / -35 heat', () => { c.clean -= 350; c.heat = Math.max(0,c.heat-35); c.cooldown=90; }, c.clean<350 || c.heat<30 || c.cooldown>0);
      const upgrade = card('Front-business upgrade', `Level ${c.upgrades}/5 · +15% turf revenue per level. Cost $2,000 clean.`);
      button(upgrade, 'Upgrade clean business · $2,000', () => { c.clean -= 2000; c.upgrades++; }, !near || c.clean < 2000 || c.upgrades >= 5);
    } else if (selected === 'Character') {
      content.append(el('p', 'Choose your identity and style. Race/heritage is self-described; skin tone is independently selectable. All choices have identical gameplay stats. Changes apply to your 3D character immediately.'));
      const preview=el('div','','character-preview-panel');preview.append(el('p','LIVE PREVIEW · drag to rotate'));content.append(preview);
      const live=mountShowroom(preview,'character',0,{...c.avatar},c.lifestyle);
      function refresh(){live?.updateCharacter(c.avatar,c.lifestyle);h.appearance();h.changed();}
      function select(label: string, values: string[], current: string, change: (value: string) => void) {
        const wrap = el('label', label, 'field'); const input = document.createElement('select');
        values.forEach(v => { const option = document.createElement('option'); option.value = v; option.textContent = v; input.append(option); });
        input.value = current; input.onchange = () => { change(input.value); refresh(); }; wrap.append(input); content.append(wrap);
      }
      select('Gender', ['Man','Woman','Nonbinary'], c.avatar.gender, v => c.avatar.gender = v);
      select('Race / heritage', ['Not specified','Black / African diaspora','White / European','Asian','Latino / Hispanic','Indigenous','Middle Eastern / North African','Mixed heritage','Self-described'], c.avatar.heritage, v => c.avatar.heritage = v);
      const skins = ['Porcelain','Light','Warm tan','Brown','Deep brown','Ebony'];
      select('Skin tone', skins, skins[c.avatar.skin]!, v => c.avatar.skin = skins.indexOf(v));
      const outfits = ['Crimson suit','Bayou streetwear','Midnight outfit','Linen ensemble','Krewe purple & green','Carnival gold'];
      select('Outfit', outfits, outfits[c.avatar.outfit]!, v => c.avatar.outfit = outfits.indexOf(v));
      const hairs = ['Black','Dark brown','Chestnut','Auburn','Blond','Silver'];
      select('Hair', hairs, hairs[c.avatar.hair]!, v => c.avatar.hair = hairs.indexOf(v));
      const cuts=['Classic','Curls','Mohawk','Tied back'];select('Hairstyle',cuts,cuts[c.lifestyle.hairStyle]!,v=>c.lifestyle.hairStyle=cuts.indexOf(v));
      const accessories=['No accessory','Sunglasses','Cap','Fedora'];select('Accessory',accessories,accessories[c.lifestyle.accessory]!,v=>c.lifestyle.accessory=accessories.indexOf(v));
      select('Facial hair',['Clean shaven','Short beard'],c.lifestyle.beard?'Short beard':'Clean shaven',v=>c.lifestyle.beard=v==='Short beard');
      const label = el('label', 'Player alias (public only if you submit a score)', 'field');
      const alias = document.createElement('input'); alias.value = c.alias; alias.maxLength = 24; alias.onchange = () => { c.alias = alias.value.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0,24) || 'New Kingpin'; h.changed(); }; label.append(alias); content.append(label);
      button(content, 'Apply & return to city', () => { h.appearance(); close(); h.characterConfirmed(); });
    } else if (selected === 'Achievements') {
      content.append(el('p', `Total Cash Cleaned: ${money(c.stats.cleaned)} · Districts/Corners Captured: ${c.stats.captured} · Max Heat Survived: ${Math.floor(c.stats.maxHeat)} · Defenses: ${c.stats.defended}`));
      ACHIEVEMENTS.forEach(a => card(`${c.achievements.includes(a.id) ? 'UNLOCKED' : 'LOCKED'} · ${a.name}`, `${a.description} · ${a.reward}. Rewards unlock automatically once, and survive reloads.`));
    } else if (selected === 'Leaderboard') {
      content.append(el('p', 'Community leaderboard: self-reported single-player progress, not cheat-proof competitive rankings. Submission is optional and shares your alias and these three metrics only. No scores are invented if the shared service is unavailable.'));
      const result = el('div', 'Loading global scores…'); content.append(result);
      const show = async () => {
        try {
          const response = await fetch('/api/leaderboard'); const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Leaderboard unavailable');
          if (selected !== 'Leaderboard') return;
          result.replaceChildren();
          for (const [metric, rows] of Object.entries(data.boards) as [string, { name: string; score: number }[]][]) {
            result.append(el('h3', metric));
            if (!rows.length) result.append(el('p', 'No submissions yet.'));
            rows.forEach((row, i) => result.append(el('p', `${i + 1}. ${row.name} — ${row.score.toLocaleString()}`)));
          }
        } catch { result.textContent = 'Global leaderboard not connected. A shared Redis database must be connected to this project. Your achievements and progress still save on this device.'; }
      };
      void show();
      button(content, 'Submit my public score', () => {
        void (async () => {
          try {
            const r = await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ daily:c.legacy.daily?.finished?{date:c.legacy.daily.date,ms:Math.round(c.legacy.daily.best!*1000)}:undefined, name: c.alias, cleaned: Math.floor(c.stats.cleaned), captured: c.stats.captured, heat: Math.floor(c.stats.maxHeat) }) });
            const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Submission failed');
            h.notice('Score submitted.'); void show();
          } catch (e) { h.notice(e instanceof Error ? e.message : 'Submission unavailable'); }
        })();
      });
    } else if (selected === 'Settings') {
      content.append(el('p', 'Autosave every 30 seconds, on tab hide/unload and after management actions. localStorage is the immediate copy; IndexedDB is the backup. Saves are device/browser specific. Offline revenue is 35% of controlled turf, capped at 24 hours. No controlled turf means no offline income.'));
      for (const key of ['music', 'ambient', 'sfx'] as const) {
        const label = el('label', `${key === 'ambient' ? 'Ambient city / bayou / rain' : key} volume`, 'field'); const input = document.createElement('input'); input.type = 'range'; input.min = '0'; input.max = '100'; input.value = String(c.audio[key] * 100); input.setAttribute('aria-label', `${key} volume`);
        input.oninput = () => { c.audio[key] = Number(input.value) / 100; h.audio(); }; input.onchange = h.changed; label.append(input); content.append(label);
      }
      button(content, c.audio.muted ? 'Unmute all' : 'Mute all', () => { c.audio.muted = !c.audio.muted; h.audio(); });
      button(content, 'Save Game', h.save);
      const danger = card('Reset Progress', 'This permanently clears this browser’s campaign and both save copies. It does not delete an already-published leaderboard score. Type RESET to confirm.');
      const input = document.createElement('input'); input.placeholder = 'Type RESET'; input.setAttribute('aria-label', 'Reset confirmation'); danger.append(input);
      const reset = button(danger, 'Reset Progress permanently', () => { void h.reset(); }, true);
      input.oninput = () => reset.disabled = input.value !== 'RESET';
    }
  }
  return { open, close, isOpen: () => opened, render };
}
