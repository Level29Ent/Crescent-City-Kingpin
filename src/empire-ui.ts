import {ACTION_CAMPAIGN,actionStage} from './action-campaign.ts';
import {missionGuidance} from './mission-guide.ts';
import {worldActivities,atContact,startContact,canStartContact,contactBlockReason,type ContactPosition} from './world-activities.ts';
import {siteTabs,siteServices} from './site-services.ts';
import {INTERIORS} from './interiors.ts';
import {missionCard} from './mission-presentation.ts';
import {openingAdvice} from './depth.ts';
import {OUTFITS} from './pursuits.ts';
import {polishPanel} from './polish-ui.ts';
import {locationMap} from './location-map.ts';
import type {MapLocation} from './navigation.ts';
import {mountShowroom} from './showroom.ts';
import { owns } from './expansion.ts';
import { renderExpansion } from './expansion-ui.ts';
import { ACHIEVEMENTS, BLOCKS, EVENTS, GOODS, SPECIALISTS, bonus, heist, hire, launder, layLow, price, salePrice, revenuePerMinute, settleWages, trade, type Campaign } from './campaign.ts';
export type EmpireHooks = {
  contactPosition():ContactPosition;creatingCharacter():boolean;
  retryCheckpoint():void;retryAction():void;replay(key:string,challenge:'finish'|'quiet'|'speed'):void;stopReplay():void;replaying():boolean;garage():boolean;room():string|null;service(action:'meal'|'treatment'|'repair'):void; trackLocation(p:MapLocation):void; retire():void;travel(x:number,z:number):void;repair():void; milestone():void; missionStarted():void; characterConfirmed():void; backRoom():void; buildings(): readonly {id:string;name:string;x:number;z:number}[]; enterBuilding(id:string):void; campaign: Campaign; pause(open: boolean): void; changed(): void; notice(text: string): void;
  location(): { x: number; z: number; district: number }; attack(id: string): void; waypoint(x: number, z: number, name: string): void;
  deploy(index: number): void; armory(weapon: number): void; gearOwned(weapon: number): boolean; appearance(): void; save(): void; reset(): Promise<void>; audio(): void;
};
const money = (n: number) => `$${Math.floor(n).toLocaleString()}`;
const el = (tag: string, text = '', cls = '') => { const e = document.createElement(tag); e.textContent = text; e.className = cls; return e; };
export function createEmpireUI(h: EmpireHooks) {
  const c = h.campaign;
  const overlay = document.getElementById('empire')!;
  const content = document.getElementById('empireContent')!;
  const summary = document.getElementById('empireSummary')!;
  const tabs = ['City Map','Objective','Progress','Settings','Contact','Services','Garage','Heists','Properties','Interior','Armory','Crew','Market','Safehouse','Character','Polish & Replays','Leaderboard'];
  let selected = 'City Map'; let opened = false; let contactId:string|null=null;
  const allowedTabs=()=>{
    const local=siteTabs(h.room());
    const contact=worldActivities(c).find(a=>a.id===contactId);
    return ['City Map','Objective','Progress','Settings','Leaderboard',...local,...(contact&&atContact(contact,h.contactPosition())?['Contact']:[]),...(h.creatingCharacter()?['Character']:[])];
  };
  function button(parent: HTMLElement, text: string, fn: () => void, disabled = false) {
    const b = document.createElement('button'); b.textContent = text; b.disabled = disabled;
    b.onclick = () => { fn(); h.changed(); if (opened) render(); }; parent.append(b); return b;
  }
  function card(title: string, text: string) {
    const box = el('article', '', 'empire-card'); box.append(el('h3', title), el('p', text)); content.append(box); return box;
  }
  function close() { opened = false; overlay.hidden = true; h.pause(false); }
  function open(tab = 'City Map') {
    h.milestone(); selected = allowedTabs().includes(tab)?tab:'City Map'; opened = true; overlay.hidden = false; h.pause(true); render();
    (document.getElementById('empireClose') as HTMLButtonElement).focus();
  }
  document.getElementById('empireClose')!.onclick = close;
  document.getElementById('openCityMap')!.onclick=()=>open('City Map');
  document.getElementById('manage')!.onclick = () => open();
  document.getElementById('festivalLaunch')!.onclick = () => {h.trackLocation({id:'contact:mission:parade',name:'Parade marshal · Royal Street',category:'Contacts & work',x:0,z:-18,instruction:'Meet the parade marshal on Royal Street on foot. Interact in the gold ring to join.'});document.getElementById('go')!.click();};
  document.getElementById('customize')!.onclick = () => {
    if(h.creatingCharacter()){open('Character');return;}
    const tailor=INTERIORS.find(r=>r.id==='tailor')!;h.waypoint(tailor.x,tailor.z,'Royal Street Tailor');h.notice('Visit the tailor’s signed door and back desk to change your look.');document.getElementById('go')!.click();
  };
  document.getElementById('mute')!.onclick = () => { c.audio.muted = !c.audio.muted; h.audio(); h.changed(); };
  const nav = document.getElementById('empireTabs')!;
  tabs.forEach(tab => button(nav, tab, () => { selected = tab; }));
  overlay.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  function render() {
    content.replaceChildren();
    summary.textContent = `${money(c.clean)} clean · ${money(c.dirty)} dirty · Heat ${Math.floor(c.heat)}/100 · ${Math.floor(revenuePerMinute(c))}/min from turf`;
    const allowed=allowedTabs();if(!allowed.includes(selected))selected='City Map';
    const room=INTERIORS.find(r=>r.id===h.room());
    overlay.querySelector('h1')!.textContent=room?room.name:'PAUSED';
    const visible=siteTabs(h.room()).includes(selected)||selected==='Contact'?[selected,...(room?['Contact','Services']:[])]:['City Map','Objective','Progress','Settings',...(h.creatingCharacter()?['Character']:[])];
    Array.from(nav.children).forEach((b, i) => { (b as HTMLElement).hidden=!visible.includes(tabs[i]!);b.setAttribute('aria-pressed',String(tabs[i]===selected));});
    if(h.replaying()&&selected==='Leaderboard'){card('Leaderboard disabled during practice','Return to your saved campaign before viewing/submitting campaign scores. Replay balances and progress are disposable.');return;}
    if (renderExpansion(selected,c,content,{room:h.room,location:h.location,waypoint:h.waypoint,close,notice:h.notice,deploy:h.deploy,armory:h.armory,gearOwned:h.gearOwned,missionStarted:h.missionStarted,reload:h.changed})) return;
    content.append(el('h2', selected));
    if(selected==='Objective'){
      const active=missionCard(c);
      card(active?active.title:'Your next step',active?`Step ${active.step}/${active.total} · ${active.objective}`:openingAdvice(c));
      card('Mission assistance',missionGuidance(c,!!h.room(),false));
      if(actionStage(c)?.type==='finale'){const box=card('The ledger decision','Publish: +15 neighborhood trust. Keep: +$2,000 but +25 heat and -10 crew loyalty at the finale. Your choice applies only when you report.');for(const [value,label]of [['publish','Publish the ledger'],['keep','Keep the leverage']] as const)button(box,`${label}${c.pursuits.actionChoice===value?' · SELECTED':''}`,()=>{c.pursuits.actionChoice=value;});}
      if(c.pursuits.actionCheckpoint&&!active&&!c.pursuits.actionDone.includes(c.pursuits.actionCheckpoint.id)){const cp=c.pursuits.actionCheckpoint,box=card('Campaign stage retry',`${ACTION_CAMPAIGN.find(m=>m.id===cp.id)?.name} · stage ${cp.step+1}. $50 clean, no refunds or restored earnings.`);button(box,'Retry campaign stage · $50',h.retryAction,c.clean<50);}
      card('Travel, then interact','Use City Map to set a route. Cyan doors lead to walkable rooms; gold rings mark street contacts. Enter on foot, walk to the desk, then Interact. Offers never start from the map.');
      if(active){const box=card('Leave this activity','Abandoning gives no payout and does not refund setup costs or entry fees.');button(box,'Abandon current activity · no refund',()=>{
        if(c.expansion.mission)c.crew.forEach(m=>m.loyalty=Math.max(0,m.loyalty-12));
        c.expansion.mission=null;c.cityStories.active=null;c.living.active=null;c.kingpin.active=null;
        if(c.lifestyle.work){c.lifestyle.work=null;c.lifestyle.workCooldown=30;}
        if(c.pursuits.active){c.pursuits.active=null;c.pursuits.cooldown=20;}
      });}
      if(c.depth.checkpoint){const cp=c.depth.checkpoint;const box=card('Checkpoint',`${cp.title} · Retry costs $50. Current funds and earned rewards are not rolled back.`);button(box,'Retry last stage · $50',h.retryCheckpoint,c.clean<50);}
    }
    else if(selected==='Progress'){
      card('Your city',`${c.stats.captured} corners captured · $${Math.floor(c.stats.cleaned).toLocaleString()} laundered · ${c.lifestyle.workCompleted} work orders completed`);
      card('Meridian campaign',`${c.pursuits.actionDone.length}/${ACTION_CAMPAIGN.length} chapters completed. Visit Mama Nola’s Contact desk for the next chapter. ${c.pursuits.actionDone.includes('city-we-keep')?c.pursuits.actionChoice==='publish'?'Ending: The city owns the truth.':'Ending: You hold the leverage.':''}`);
      card('Stories',`${c.cityStories.completed.length}/3 original stories · ${Object.keys(c.kingpin.chapters).length}/3 new chapters · ${c.living.completed.length}/5 neighborhood operations`);
      const achievements=document.createElement('details');achievements.append(el('summary','Achievements'));for(const a of ACHIEVEMENTS)achievements.append(el('p',`${c.achievements.includes(a.id)?'✓':'○'} ${a.name} · ${a.description}`));content.append(achievements);button(content,'Optional community leaderboard',()=>{selected='Leaderboard';});
    }
    else if(selected==='Services'){
      const tools=el('div','','site-tools');for(const tab of siteTabs(h.room()).filter(t=>!['Services','Contact'].includes(t)))button(tools,tab,()=>{selected=tab;});content.append(tools);
      siteServices(c,content,{...h,close,refresh:render});
    }
    else if(selected==='Contact'){
      const offers=worldActivities(c).filter(a=>atContact(a,h.contactPosition()));
      if(!offers.length){card('No new offers','Finish your current objective or explore another contact.');return;}
      const contact=offers.find(a=>a.id===contactId)??offers[0]!;contactId=contact.id;
      if(offers.length>1){const label=el('label','Talk about '),select=document.createElement('select');select.setAttribute('aria-label','Local conversation');for(const a of offers){const option=document.createElement('option');option.value=a.id;option.textContent=a.name;select.append(option);}select.value=contact.id;select.onchange=()=>{contactId=select.value;render();};label.append(select);content.append(label);}
      const box=card(contact.name,`${contact.speaker}: ${contact.description}`);
      let method:'assault'|'bribe'|'lockpick'|'disguise'='assault';
      if(contact.methods){const select=document.createElement('select');select.setAttribute('aria-label','Approach');for(const m of contact.methods){const option=el('option',({assault:'Confront guards',bribe:'Pay fixer $300 on-site',lockpick:'Hold lockpick for 8s on-site',disguise:'Use purchased disguise below 30 heat'})[m]) as HTMLOptionElement;option.value=m;select.append(option);}select.onchange=()=>method=select.value as typeof method;box.append(select);}
      for(const choice of contact.choices)button(box,choice.label,()=>{
        if(startContact(c,contact.id,h.contactPosition(),choice.id,method)){close();h.missionStarted();}
        else h.notice(contactBlockReason(c));
      },!canStartContact(c,contact,choice.id));
      if(!contact.choices.some(choice=>canStartContact(c,contact,choice.id)))box.append(el('p',contactBlockReason(c)));
      button(content,'Not now · return to city',close);
    }
    else if(selected==='Polish & Replays'){polishPanel(c,content,{changed:h.changed,notice:h.notice,replay:(key,challenge)=>{close();h.replay(key,challenge);},stopReplay:h.stopReplay,replaying:h.replaying,track:(x,z,name)=>{h.waypoint(x,z,name);close();}});}
    else if(selected==='City Map'){locationMap(content,h.location(),p=>{h.trackLocation(p);close();},c);}
    else if (selected === 'Crew') {
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
      if(h.room()==='freight'){const item = card('Warehouse heist', `Risk $100 clean for $1,200 dirty (+crew bonuses). Adds 25 heat; 3-minute cooldown. Failure lowers loyalty. Success chance ${Math.round(Math.min(.9, .45 + bonus(c).defense / 100 + bonus(c).payout) * 100)}%.`);
      const near = h.room()==='freight';
      button(item, near ? `Run heist${c.heistCooldown ? ` (${Math.ceil(c.heistCooldown)}s cooldown)` : ''}` : 'Travel to warehouse heist', () => {
        if (!near) { h.waypoint(60, 120, 'Warehouse heist'); close(); return; }
        const success = heist(c); h.notice(success ? 'Heist succeeded! Dirty cash acquired.' : 'Heist failed. Crew loyalty dropped.');
      }, near && (c.clean < 100 || c.heistCooldown > 0));}
    } else if (selected === 'Safehouse') {
      const near = h.room()==='hq';
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
      const displayedAvatar=()=>{if(c.kingpin.disguise>0)return {...c.avatar,outfit:3,hair:4};const outfit=OUTFITS.find(o=>o.id===c.pursuits.wearing);return outfit?{...c.avatar,outfit:outfit.outfit,hair:outfit.hair}:c.avatar;};
      const live=mountShowroom(preview,'character',0,displayedAvatar(),c.lifestyle,undefined,c.kingpin.disguise>0?'':c.pursuits.wearing);
      function refresh(){live?.updateCharacter(displayedAvatar(),c.lifestyle,c.kingpin.disguise>0?'':c.pursuits.wearing);h.appearance();h.changed();}
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
      for(const [key,label,min,max,step,value,apply]of [
        ['look','Look sensitivity',.4,2,.1,c.lifestyle.lookSensitivity,(n:number)=>c.lifestyle.lookSensitivity=n],
        ['joystick','Joystick sensitivity',.5,2,.1,c.legacy.sensitivity,(n:number)=>c.legacy.sensitivity=n],
        ['scale','Control size',.8,1.25,.05,c.living.controls.scale,(n:number)=>c.living.controls.scale=n],
        ['opacity','Control opacity',.35,1,.05,c.living.controls.opacity,(n:number)=>c.living.controls.opacity=n],
      ] as const){const field=el('label',label,'field'),input=document.createElement('input');input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(value);input.setAttribute('aria-label',label);input.oninput=()=>{apply(Number(input.value));h.changed();};field.append(input);content.append(field);}
      for(const [key,label]of [['leftHanded','Left-handed layout'],['aimAssist','Touch aim assistance']] as const){const field=el('label',label,'field'),input=document.createElement('input');input.type='checkbox';input.checked=c.living.controls[key];input.onchange=()=>{c.living.controls[key]=input.checked;h.changed();};field.append(input);content.append(field);}
      card('Action controls','Space: jump on foot / brake driving · Z: dodge · Q: weapon wheel · X: swap aiming shoulder · F: vehicle entry/exit · E: mission interaction · mouse wheel: cycle weapons (aiming) or camera distance. Dodge uses stamina and is not invulnerability. All keyboard actions can be rebound below.');
      if(c.legacy.tutorial<3)button(content,'Skip opening tutorial',()=>{c.legacy.tutorial=3;});
      const accessibility=document.createElement('details');accessibility.append(el('summary','Accessibility & keyboard bindings'));const inputs=el('div');accessibility.append(inputs);content.append(accessibility);
      polishPanel(c,inputs,{changed:h.changed,notice:h.notice,replay:()=>{},stopReplay:()=>{},replaying:h.replaying,track:()=>{}},'settings');
      button(content, 'Save Game', h.save);
      const danger = card('Reset Progress', 'This permanently clears this browser’s campaign and both save copies. It does not delete an already-published leaderboard score. Type RESET to confirm.');
      const input = document.createElement('input'); input.placeholder = 'Type RESET'; input.setAttribute('aria-label', 'Reset confirmation'); danger.append(input);
      const reset = button(danger, 'Reset Progress permanently', () => { void h.reset(); }, true);
      input.oninput = () => reset.disabled = input.value !== 'RESET';
    }
  }
  return { open, close, contact(id:string){const a=worldActivities(c).find(a=>a.id===id);if(a&&atContact(a,h.contactPosition())){contactId=id;open('Contact');}}, isOpen: () => opened, render };
}
