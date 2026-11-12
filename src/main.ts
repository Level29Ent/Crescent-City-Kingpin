// Crescent City Kingpin: standalone single-player game. Plain three.js, no engine, no server.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { cityClock, demandIndex, deliveryPay, deliveryBonus, updateReserve } from "./dynamics.ts";
import {
  BUSINESSES, CAR_ACC, CAR_MAX, DISTRICTS, DROPS, HQ, PARKED_CARS, SHOP, SPAWN, WEAPONS, BUILDINGS,
  GOAL, MAX_HP, RESPAWN_SECONDS, castWorld, pushOut, walkable, districtAt, type SfxName,
} from "./world.ts";
import { carColors, createCar, createPerson, loadCarModels, type Car, type Person, type PersonKind } from "./actors.ts";
import { createScenery } from "./scenery.ts";
import { createSound } from "./audio.ts";
import { createImpacts } from "./effects.ts";
import { BLOCKS, addHeat, bonus, captureBlock, failMission, newCampaign, offlineProgress, revenuePerMinute, resolveDefense, tickCampaign, unlock } from './campaign.ts';
import { SaveStore } from './persistence.ts';
import { createEmpireUI } from './empire-ui.ts';
import './campaign.css';
import './hud.css';
import { conditions, VEHICLES, MISSIONS, missionInteract, tickExpansion, inventoryCap, cashCap, furnished } from './expansion.ts';
import { createFestival } from './festival.ts';
import { createMoneyBundle } from './money.ts';
import { createWeather } from './weather.ts';
// Reserve the toolbar's actual wrapped height (including the optional parade button).
const toolbar = document.getElementById('toolbar')!;
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--toolbar-height', `${Math.ceil(toolbar.getBoundingClientRect().height)}px`);
}).observe(toolbar);
const store = new SaveStore();
const loaded = await store.load();
const C = loaded?.campaign ?? newCampaign();
const offline = loaded ? offlineProgress(C, Math.max(0, (Date.now() - loaded.savedAt) / 1000)) : null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const dist2 = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

// ───────── renderer ─────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
$("app").appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.2, 1400);
scene.add(camera);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.45, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const quality = $<HTMLSelectElement>("quality");
quality.addEventListener("change", () => {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.value === "cinematic" ? 1.5 : 1));
  resize();
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
};
window.addEventListener("resize", resize);
resize();

const abort = new AbortController();
const sound = createSound(abort.signal);
sound.configure(C.audio);
const scenery = createScenery(scene);
const impacts = createImpacts(scene);
const festival = createFestival(scene);
const weather = createWeather(scene);
const shotLight = new THREE.PointLight(0xffb760,0,8);scene.add(shotLight);

// ───────── game state ─────────
type Foe = {
  kind: PersonKind; person: Person; x: number; z: number; heading: number; hp: number; district: number;
  blockId?: string; mugged?: boolean; cd: number; aggro: boolean; dead: number; wx: number; wz: number; wt: number; flee: number; speed: number;
};
type Vehicle = { rig: Car; style: number; x: number; z: number; h: number; speed: number; steer: number; garage?: number };

const P = {
  x: SPAWN.x, z: SPAWN.z, heading: SPAWN.heading, hp: MAX_HP, armor: 0, heat: 0,
  weapon: 0, owned: [true, false, false, false, false], lastFire: -10, deadT: 0, car: null as Vehicle | null,
  captured: new Set<number>([0]), kills: new Map<number, number>(), bossOut: new Set<number>(),
  job: null as null | { name: string; x: number; z: number; t: number; duration: number; pay: number; priority: boolean }, won: false,
  streak: 0, stamina: { value: 100, exhausted: false }, boost: { value: 100, exhausted: false },
};
let yaw = SPAWN.heading;
let pitch = -0.15;
let time = 0;
let playing = false;
let shopOpen = false;
let managing = false;
let balcony = false;
let balconyWasPlaying = false;
let pausedForHidden = false;
let resetting = false;
let target: null | { x: number; z: number; name: string } = null;
let battle: null | { block: string; defending: boolean } = null;
let roadblock: null | { vehicle: Vehicle; t: number } = null;
const bounded = (v: unknown, fallback: number, low: number, high: number) => typeof v === 'number' && Number.isFinite(v) ? Math.max(low, Math.min(high, v)) : fallback;
if (loaded) {
  const p = loaded.player;
  P.x = bounded(p.x, SPAWN.x, -238, 238); P.z = bounded(p.z, SPAWN.z, -238, 232);
  if (!walkable(P.x, P.z) || pushOut(P.x, P.z, .5).hit) { P.x = SPAWN.x; P.z = SPAWN.z; }
  P.heading = bounded(p.heading, SPAWN.heading, -Math.PI * 100, Math.PI * 100);
  P.hp = bounded(p.hp, MAX_HP, 1, MAX_HP); P.armor = bounded(p.armor, 0, 0, 50);
  P.owned = WEAPONS.map((_,i) => i === 0 || p.owned?.[i] === true);
  P.weapon = Math.floor(bounded(p.weapon, 0, 0, WEAPONS.length-1)); if (!P.owned[P.weapon]) P.weapon = 0;
  P.captured = new Set([0, ...[1,2,3,4].filter(d => Array.isArray(p.captured) && p.captured.includes(d))]);
  P.bossOut = new Set([1,2,3,4].filter(d => Array.isArray(p.bossOut) && p.bossOut.includes(d)));
  P.streak = Math.floor(bounded(p.streak, 0, 0, 10000));
  if (p.target && typeof p.target.name === 'string') target = { x: bounded(p.target.x, 30, -238, 238), z: bounded(p.target.z, 4, -238, 232), name: p.target.name.slice(0,80) };
  if (p.battle && BLOCKS.some(b => b.id === p.battle.block)) battle = { block: p.battle.block, defending: p.battle.defending === true };
  // Sessions resume safely on foot; timed deliveries are failed once rather than granting stale payouts.
  if (p.jobActive) { failMission(C); P.streak = 0; }
  yaw = P.heading; time = C.clock;
}
let boosting = false;
const headlights = new THREE.SpotLight(0xc5e8ff, 0, 65, 0.6, 0.5, 1.3);
scene.add(headlights, headlights.target);

let player = createPerson("player", 5, C.avatar);
player.root.position.set(P.x, 0, P.z);
player.root.rotation.y = P.heading;
scene.add(player.root);
const foes: Foe[] = [];
const vehicles: Vehicle[] = [];
const colors = carColors();

function addVehicle(style: number, x: number, z: number, h: number, color = colors[Math.floor(Math.random() * colors.length)]!): Vehicle {
  const rig = createCar(style, color);
  rig.root.position.set(x, 0, z);
  rig.root.rotation.y = h;
  scene.add(rig.root);
  const v: Vehicle = { rig, style, x, z, h, speed: 0, steer: 0 };
  vehicles.push(v);
  return v;
}

function spawnFoe(kind: PersonKind, x: number, z: number, district: number): Foe {
  const person = createPerson(kind, Math.floor(Math.random() * 9999));
  person.root.position.set(x, 0, z);
  scene.add(person.root);
  const f: Foe = {
    kind, person, x, z, heading: rnd(0, 6.28), hp: kind === "boss" ? 260 : kind === "cop" ? 70 : kind === "civilian" ? 30 : 55, district,
    cd: rnd(0.5, 1.5), aggro: kind === "cop", dead: 0, wx: x, wz: z, wt: 0, flee: 0, speed: kind === "boss" ? 3.2 : kind === "cop" ? 5 : 3.6,
  };
  foes.push(f);
  return f;
}

function freeSpot(cx: number, cz: number, spread: number): [number, number] {
  for (let i = 0; i < 80; i++) {
    const x = cx + rnd(-spread, spread);
    const z = cz + rnd(-spread, spread);
    if (walkable(x, z) && !pushOut(x, z, 1).hit) return [x, z];
  }
  return [cx, cz];
}

// Restore combat progress, including active turf guards, without respawning defeated rivals.
if (loaded && Array.isArray(loaded.player.foes)) {
  for (const raw of loaded.player.foes.slice(0, 160)) {
    if (!raw || !['boss','cop','civilian','gangster'].includes(raw.kind) || typeof raw.x !== 'number' || typeof raw.z !== 'number') continue;
    const x = bounded(raw.x, 0, -238, 238), z = bounded(raw.z, 0, -238, 232);
    const f = spawnFoe(raw.kind, x, z, Math.floor(bounded(raw.district, -1, -1, 4)));
    f.mugged = raw.mugged === true;
    f.hp = bounded(raw.hp, 55, 1, 260); f.aggro = raw.aggro === true;
    if (BLOCKS.some(b => b.id === raw.blockId)) f.blockId = raw.blockId;
  }
} else for (const d of DISTRICTS) {
  if (P.captured.has(d.id)) continue;
  for (let i = 0; i < d.need; i++) {
    const [x, z] = freeSpot(d.x, d.z, 38);
    spawnFoe("gangster", x, z, d.id);
  }
}
for (let i = 0; i < (loaded ? 0 : 18); i++) {
  const [x, z] = freeSpot(rnd(-150, 150), rnd(-50, 150), 30);
  spawnFoe("civilian", x, z, -1);
}
await loadCarModels();
for (const [x, z, h, s] of PARKED_CARS) addVehicle(s, x, z, h);

// ───────── HUD ─────────
const feedEl = $("feed");
function feed(text: string) {
  const d = document.createElement("div");
  d.textContent = text;
  feedEl.appendChild(d);
  while (feedEl.childElementCount > 5) feedEl.firstElementChild!.remove();
  setTimeout(() => d.remove(), 7000);
}
const sfx = (n: SfxName, g = 1) => sound.sfx(n, g);
const mini = $<HTMLCanvasElement>("mini");
const mg = mini.getContext("2d")!;

function incomeRate(): number { return revenuePerMinute(C) / 60; }

function drawMini() {
  const S = 0.45;
  mg.fillStyle = "#14101c";
  mg.fillRect(0, 0, 180, 180);
  mg.save();
  mg.translate(90, 90);
  const px = P.car ? P.car.x : P.x;
  const pz = P.car ? P.car.z : P.z;
  mg.fillStyle = "#3a3048";
  for (const b of BUILDINGS) {
    if (Math.abs(b.x0 - px) > 220 || Math.abs(b.z0 - pz) > 220) continue;
    mg.fillRect((b.x0 - px) * S, (b.z0 - pz) * S, (b.x1 - b.x0) * S, (b.z1 - b.z0) * S);
  }
  const dot = (x: number, z: number, c: string, r = 3) => {
    const dx = (x - px) * S;
    const dz = (z - pz) * S;
    const m = Math.hypot(dx, dz);
    const k = m > 80 ? 80 / m : 1;
    mg.fillStyle = c;
    mg.beginPath();
    mg.arc(dx * k, dz * k, r, 0, 6.3);
    mg.fill();
  };
  for (const b of BUSINESSES) dot(b.x, b.z, P.captured.has(b.district) ? "#6cf06c" : "#ffd23a", 4);
  for (const f of foes) if (!f.dead && f.kind !== "civilian") dot(f.x, f.z, f.kind === "cop" ? "#4a8aff" : f.kind === "boss" ? "#ff40ff" : "#ff4040", f.kind === "boss" ? 4 : 2.5);
  if (P.job) dot(P.job.x, P.job.z, "#40f0ff", 4);
  if (target) dot(target.x, target.z, '#ffffff', 5);
  for(const p of pickups)dot(p.x,p.z,p.kind===0?'#f5c34a':p.kind===1?'#9c52e0':'#47d7c1',2);
  for (const b of BLOCKS) dot(b.x, b.z, C.owned.includes(b.id) ? '#8cf08c' : '#dd8bff', 3);
  mg.restore();
  mg.fillStyle = "#fff";
  mg.beginPath();
  mg.arc(90, 90, 4, 0, 6.3);
  mg.fill();
}

function updateHud() {
  $("cash").textContent = `$${Math.floor(C.clean).toLocaleString()} clean`;
  $("dirty").textContent = `$${Math.floor(C.dirty).toLocaleString()} dirty`;
  $("mute").textContent = C.audio.muted ? 'UNMUTE' : 'MUTE';
  $("manage").classList.toggle('alert', !!C.defense);
  $("goal").textContent = `Goal $${GOAL.toLocaleString()} clean · turf $${(incomeRate()*60).toFixed(0)}/min dirty`;
  ($("hp").firstElementChild as HTMLElement).style.width = `${Math.max(0, P.hp)}%`;
  ($("armor").firstElementChild as HTMLElement).style.width = `${P.armor * 2}%`;
  $("heat").textContent = `HEAT ${Math.floor(C.heat)}/100 ${P.heat ? "★".repeat(P.heat) : ""}`;
  $("weapon").textContent = P.car ? "Driving" : `${WEAPONS[P.weapon]!.name} · ${reloading > 0 ? "RELOADING" : `${ammo[P.weapon]}/${MAGAZINES[P.weapon]}`} · R` ;
  $("weather").textContent = `${conditions(C.clock).weather.toUpperCase()}${conditions(C.clock).night ? " · NIGHT BONUS" : ""}`;
  const clock = cityClock(time);
  const hours = Math.floor(clock.hour).toString().padStart(2, "0");
  const minutes = Math.floor((clock.hour % 1) * 60).toString().padStart(2, "0");
  $("cityTime").textContent = `${hours}:${minutes} · ${clock.label}`;
  $("demand").textContent = `HOT DROP · ${DROPS[demandIndex(time, DROPS.length)]!.name}`;
  $("streak").textContent = `Delivery streak ${P.streak} · +${Math.min(5, P.streak) * 10}% contract pay`;
  const reserve = P.car ? P.boost : P.stamina;
  $("reserveLabel").textContent = `${P.car ? "NITRO" : "STAMINA"} · ${reserve.exhausted ? "RECOVERING" : "SHIFT"}`;
  ($("reserve").firstElementChild as HTMLElement).style.width = `${reserve.value}%`;
  // objective line
  let obj = "";
  if (P.job) obj = `${P.job.priority ? "Priority" : "Delivery"} to ${P.job.name} · ${Math.max(0, Math.ceil(P.job.t))}s · $${P.job.pay}`;
  else {
    const open = DISTRICTS.find((d) => d.id !== 0 && !P.captured.has(d.id));
    if (open) {
      const left = foes.filter((f) => f.district === open.id && f.kind === "gangster" && !f.dead).length;
      obj = P.bossOut.has(open.id) ? `Take down ${open.boss} in ${open.name}!` : `Clear the ${open.gang} in ${open.name}: ${left} left`;
    }
  }
  if (battle) obj = `${battle.defending ? 'DEFEND' : 'CAPTURE'} ${BLOCKS.find(b => b.id === battle!.block)!.name}: ${foes.filter(f => !f.dead && f.blockId === battle!.block).length} guards left`;
  else if (target) obj = `${target.name} · ${Math.round(dist2(P.x, P.z, target.x, target.z))} m · follow white minimap marker`;
  const mission = C.expansion.mission;
  if (mission) { const def = MISSIONS.find(m=>m.id===mission.id)!; obj = `${def.name} · ${def.steps[mission.step]!.name} · ${Math.ceil(mission.remaining)}s · E to interact`; }
  if (C.defense && !battle && !mission) obj = `TURF ATTACK: ${BLOCKS.find(b => b.id === C.defense!.block)!.name} · ${Math.ceil(C.defense.remaining)}s · M to respond`;
  $("obj").textContent = obj;
  $("obj").style.display = obj ? "block" : "none";
  const sp = P.car ? Math.round(Math.abs(P.car.speed) * 3.6) : 0;
  $("speed").textContent = P.car ? `${sp} km/h` : "";
}

// ───────── input ─────────
const keys = new Set<string>();
let mouseDown = false;
let aimHeld = false;
addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement)?.matches("input, select, textarea")) return;
  if (balcony) {if(e.code === "Escape") $("paradeView").click(); return;}
  if (e.code === "KeyM") { e.preventDefault(); if (!e.repeat) { if (empire.isOpen()) empire.close(); else empire.open(); } return; }
  if (managing) return;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.code === "Escape" && playing && !shopOpen) {
    playing = false;
    mouseDown = aimHeld = false;
    keys.clear();
    $("go").textContent = "RESUME";
    $("start").style.display = "flex";
    document.exitPointerLock();
    return;
  }
  if (e.repeat && e.code === "KeyE") return;
  keys.add(e.code);
  if (!playing || shopOpen || managing) return;
  if (e.code === "KeyE") interact();
  if (e.code === "KeyR") reloadWeapon();
  if (/^Digit[1-5]$/.test(e.code)) {
    const w = Number(e.code.slice(-1)) - 1;
    if (P.owned[w]) { P.weapon = w; reloading = 0; }
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => { keys.clear(); mouseDown = aimHeld = false; });
addEventListener("mousedown", (e) => {
  if (!playing || managing || shopOpen || e.target !== renderer.domElement) return;
  if (e.button === 0) mouseDown = true;
  if (e.button === 2) aimHeld = true;
});
addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) aimHeld = false;
});
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("mousemove", (e) => {
  if (!playing || managing || shopOpen) return;
  if (document.pointerLockElement !== renderer.domElement && !(mouseDown && playing)) return;
  yaw -= e.movementX * 0.0024;
  pitch = Math.max(-0.7, Math.min(0.45, pitch - e.movementY * 0.0022));
});
addEventListener("wheel", (e) => { if (!playing || managing || shopOpen) return; camDist = Math.max(3.5, Math.min(12, camDist + Math.sign(e.deltaY) * 0.6)); });
let camDist = 6;

function lock() {
  if (matchMedia('(pointer: coarse)').matches) return;
  const request = renderer.domElement.requestPointerLock?.();
  if (request) void request.catch(() => { /* drag-to-look fallback */ });
}
let locked = false;
document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === renderer.domElement || locked; });
$("go").addEventListener("click", () => {
  $("start").style.display = "none";
  playing = true;
  ($('go') as HTMLButtonElement).blur();
  keys.clear();
  mouseDown = aimHeld = false;
  try { lock(); } catch { /* no pointer lock: drag the mouse to look */ }
  try { sound.start(); } catch (err) { console.warn("audio unavailable", err); }
});
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== renderer.domElement && locked && playing && !shopOpen && !managing && !P.won) {
    $("go").textContent = "RESUME";
    $("start").style.display = "flex";
    playing = false;
    keys.clear(); mouseDown = aimHeld = false;
    locked = false;
  }
});

// ───────── shop ─────────
function crime(n: number) {
  if (n <= 0) return;
  if (C.heat === 0) sfx('wanted');
  addHeat(C, n * 8);
}

function buy(id: number) {
  const it = SHOP[id]!;
  if (C.clean < it.price) return sfx("deny");
  if (id === 0) { if (P.owned[1]) return sfx("deny"); P.owned[1] = true; P.weapon = 1; }
  else if (id === 1) { if (P.owned[2]) return sfx("deny"); P.owned[2] = true; P.weapon = 2; }
  else if (id === 2) P.armor = 50;
  else if (id === 3) addVehicle(2, 44, -8, Math.PI / 2, 0xc0392b);
  else if (id === 4) { if (C.upgrades >= 5) return sfx("deny"); C.upgrades++; }
  else if (id === 5) P.hp = MAX_HP;
  C.clean -= it.price;
  saveGame();
  sfx("buy");
  feed(`Bought: ${it.name}`);
  renderShop();
}

function startJob(priority = false) {
  if (P.job) return;
  const d = DROPS[priority ? demandIndex(time, DROPS.length) : Math.floor(Math.random() * DROPS.length)]!;
  const len = dist2(HQ.x, HQ.z, d.x, d.z);
  const duration = (30 + len / 9) * (priority ? 0.8 : 1);
  P.job = { name: d.name, x: d.x, z: d.z, t: duration, duration, priority, pay: deliveryPay(len, P.streak, priority) };
  addHeat(C, 4);
  feed(`Import job: take the crates to ${d.name}.`);
  sfx("job");
  closeShop();
}

function renderShop() {
  const panel = $("shop").firstElementChild as HTMLElement;
  panel.innerHTML = `<h2 style="margin-top:0;color:#ffb347">Mama Nola's Back Room</h2><div>Clean capital: <b>$${Math.floor(C.clean).toLocaleString()}</b></div>`;
  for (const it of SHOP) {
    const row = document.createElement("div");
    row.className = "row";
    const taken = (it.id === 0 && P.owned[1]) || (it.id === 1 && P.owned[2]) || (it.id === 4 && C.upgrades >= 5);
    row.innerHTML = `<span>${it.name}${it.id === 4 ? ` (${C.upgrades}/5)` : ""}<small>${it.desc}</small></span>`;
    const b = document.createElement("button");
    b.textContent = taken ? "Owned" : `$${it.price.toLocaleString()}`;
    b.disabled = taken || C.clean < it.price;
    b.onclick = () => buy(it.id);
    row.appendChild(b);
    panel.appendChild(row);
  }
  const row = document.createElement("div");
  row.className = "row";
  const jb = document.createElement("button");
  jb.textContent = P.job ? "Job running" : "Take an import job";
  jb.disabled = !!P.job;
  jb.onclick = () => startJob();
  const cb = document.createElement("button");
  cb.textContent = "Close";
  cb.onclick = closeShop;
  row.append(jb, cb);
  const priority = document.createElement("button");
  priority.className = "priority";
  priority.textContent = `Priority: ${DROPS[demandIndex(time, DROPS.length)]!.name} · 1.5× pay / 20% less time`;
  priority.disabled = !!P.job;
  priority.onclick = () => startJob(true);
  const info = document.createElement("p");
  info.textContent = `Streak ${P.streak}: +${Math.min(5, P.streak) * 10}% pay. Finish early for up to 25% extra. A missed job or death resets the streak.`;
  panel.append(info, priority);
  panel.appendChild(row);
}
function openShop() {
  shopOpen = true;
  mouseDown = aimHeld = false; keys.clear();
  sound.engine(null); sound.siren(false);
  document.exitPointerLock();
  renderShop();
  $("shop").style.display = "flex";
  sfx("door");
}
function closeShop() {
  shopOpen = false;
  keys.clear(); mouseDown = aimHeld = false;
  $("shop").style.display = "none";
  lock();
}

// ───────── interaction ─────────
function interact() {
  if (P.deadT > 0) return;
  const advanced = missionInteract(C,P.x,P.z);
  if(advanced) {feed(advanced); sfx('cash'); saveGame(); return;}
  const rival = foes.find(f=>f.kind==='gangster'&&!f.dead&&!f.mugged&&dist2(P.x,P.z,f.x,f.z)<2.5);
  if(!P.car&&rival){rival.mugged=true;rival.aggro=true;const pay=conditions(C.clock).night?125:100;C.dirty=Math.min(cashCap(C),C.dirty+pay);addHeat(C,8);feed(`Rival courier shaken down: +$${pay} dirty. Crew alerted!`);sfx('cash');saveGame();return;}
  const corner = BLOCKS.find(b => dist2(P.x, P.z, b.x, b.z) < 14 && (!C.owned.includes(b.id) || C.defense?.block === b.id));
  if (!P.car && corner) { startBattle(corner.id); return; }
  if (P.car) {
    const c = P.car;
    P.x = c.x + Math.cos(c.h) * 2.4;
    P.z = c.z - Math.sin(c.h) * 2.4;
    if (pushOut(P.x, P.z, 0.5).hit || !walkable(P.x, P.z)) { P.x = c.x - Math.cos(c.h) * 2.4; P.z = c.z + Math.sin(c.h) * 2.4; }
    P.car = null;
    c.speed = 0;
    sfx("door");
    return;
  }
  let best: Vehicle | null = null;
  let bd = 4.5;
  for (const v of vehicles) {
    if (roadblock?.vehicle === v || (v.garage !== undefined && C.expansion.runs.some(r=>r.car===v.garage))) continue;
    const d = dist2(v.x, v.z, P.x, P.z);
    if (d < bd) { bd = d; best = v; }
  }
  if (best) { P.car = best; sfx("door"); return; }
  if (dist2(P.x, P.z, HQ.x, HQ.z) < HQ.r) openShop();
}

// ───────── combat ─────────
const tracers: { line: THREE.Line; t: number }[] = [];
function tracer(a: THREE.Vector3, b: THREE.Vector3, color: number) {
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color, transparent: true }));
  scene.add(line);
  tracers.push({ line, t: 0.045 });
}
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _e = new THREE.Vector3();
let hitFlash = 0;

function hurt(dmg: number) {
  if (P.deadT > 0 || P.won) return;
  const soak = Math.min(P.armor, dmg * 0.6);
  P.armor -= soak;
  const stored = P.car?.garage !== undefined ? C.expansion.cars[P.car.garage] : null;
  const armor = stored ? VEHICLES.find(v=>v.id===stored.id)!.armor + stored.armor*.07 : 0;
  P.hp -= (dmg - soak) * (bonus(C).muscle ? .85 : 1) * (C.expansion.gear.includes('Royal Flush Armor') ? .85 : 1) * (P.car ? (1-Math.min(.85,armor)) * (C.expansion.gear.includes('Ghost Transport Plating') ? .85 : 1) : 1);
  $("hurt").style.opacity = "1";
  setTimeout(() => ($("hurt").style.opacity = "0"), 120);
  sfx("hurt", 0.6);
  if (P.hp <= 0) {
    P.hp = 0;
    P.deadT = RESPAWN_SECONDS;
    P.car = null;
    C.clean = Math.floor(C.clean * 0.9);
    C.heat = Math.max(0, C.heat - 20);
    if (battle?.defending) resolveDefense(C, false); else failMission(C);
    if (battle) clearBattle();
    P.job = null;
    P.streak = 0;
    boosting = false;
    feed("Wasted. You lost 10% of your cash.");
    sfx("death");
  }
}

function damageFoe(f: Foe, dmg: number, byPlayer: boolean) {
  if (f.dead) return;
  f.hp -= dmg;
  f.aggro = true;
  f.flee = 4;
  if (byPlayer && f.kind === "civilian") crime(1);
  if (f.hp > 0) return;
  f.dead = 5;
  sfx("death", 0.4);
  if (!byPlayer) return;
  if (f.kind === "cop") { crime(1); }
  if (f.kind === "gangster") {
    C.dirty += 150;
    if (f.blockId) return;
    const d = DISTRICTS[f.district]!;
    const left = foes.filter((o) => o.district === f.district && !o.blockId && o.kind === "gangster" && !o.dead).length;
    if (left === 0 && !P.bossOut.has(f.district)) {
      P.bossOut.add(f.district);
      const [x, z] = freeSpot(d.x, d.z, 20);
      spawnFoe("boss", x, z, f.district).aggro = true;
      feed(`${d.boss} steps out in ${d.name}!`);
      sfx("wanted");
    }
  }
  if (f.kind === "boss") {
    const d = DISTRICTS[f.district]!;
    P.captured.add(f.district);
    C.dirty += 3000;
    addHeat(C, 15);
    const corner = BLOCKS.find(b => b.district === f.district);
    if (corner) captureBlock(C, corner.id);
    feed(`${d.name} is yours! +$3,000 dirty and controlled turf income.`);
    sfx("capture");
  }
}

function rayHit(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, range: number): { foe: Foe | null; t: number; head: boolean } {
  const wall = castWorld(ox, oy, oz, dx, dy, dz, range);
  let best: Foe | null = null;
  let bt = wall;
  let head = false;
  for (const f of foes) {
    if (f.dead) continue;
    const cx = f.x - ox;
    const cy = 0.9 - oy;
    const cz = f.z - oz;
    const t = cx * dx + cy * dy + cz * dz;
    if (t < 0 || t > bt) continue;
    const px = ox + dx * t;
    const py = oy + dy * t;
    const pz = oz + dz * t;
    if (py > 1.95 || py < 0) continue;
    if (Math.hypot(px - f.x, pz - f.z) < 0.55) { best = f; bt = t; head = py > 1.5; }
  }
  return { foe: best, t: bt, head };
}

const MAGAZINES = [12,30,6,24,5];
const ammo = [...MAGAZINES];
let reloading = 0;
let recoil = 0;
const walkVelocity = new THREE.Vector2();
function reloadWeapon() { if(P.car || reloading>0 || ammo[P.weapon] === MAGAZINES[P.weapon]) return; reloading=P.weapon===2?2.2:1.6; sfx('click'); }
function fire() {
  const w = WEAPONS[P.weapon]!;
  if (reloading > 0 || time - P.lastFire < w.cd) return;
  if (ammo[P.weapon]! <= 0) {reloadWeapon();return;}
  ammo[P.weapon]!--;
  P.lastFire = time;
  sfx(P.weapon === 2 ? "shotgun" : P.weapon === 1 || P.weapon===3 ? "smg" : "pistol");
  // aim point from the camera's centre ray
  camera.getWorldDirection(_d);
  const aim = rayHit(camera.position.x, camera.position.y, camera.position.z, _d.x, _d.y, _d.z, w.range);
  _e.copy(camera.position).addScaledVector(_d, Math.min(aim.t, w.range));
  _o.set(P.x, 1.45, P.z);
  player.root.updateMatrixWorld(true);
  player.muzzle(_o);
  const base = new THREE.Vector3().subVectors(_e, _o).normalize();
  const spread = w.spread * (aimHeld ? .4 : 1) * (C.expansion.gear.includes("Crescent Precision Barrel") ? .75 : 1);
  for (let i = 0; i < w.pellets; i++) {
    const dir = base.clone();
    dir.x += rnd(-spread, spread);
    dir.y += rnd(-spread, spread);
    dir.z += rnd(-spread, spread);
    dir.normalize();
    const r = rayHit(_o.x, _o.y, _o.z, dir.x, dir.y, dir.z, w.range);
    tracer(_o.clone(), _o.clone().addScaledVector(dir, r.t), 0xffe9a0);
    if (r.t < w.range) impacts.burst(_o.x + dir.x * r.t, _o.y + dir.y * r.t, _o.z + dir.z * r.t);
    if (r.foe) {
      damageFoe(r.foe, w.dmg * (1+C.expansion.weaponLevel*.08+(furnished(C,"locker")?.1:0)) * (r.head ? 2 : 1), true);
      hitFlash = 0.12;
      sfx(r.head ? "headshot" : "hit", 0.6);
    }
  }
  if (P.weapon > 0) crimeNoise();
  player.flash(1);
  recoil = Math.min(.045, recoil + (P.weapon===2?.025:.009));
  pitch = Math.max(-.7, Math.min(.45, pitch + recoil));
  if(C.expansion.mission?.id==='parade' && Math.abs(P.x)<12) {addHeat(C,3);feed('Keep the parade safe — firing draws police attention.');}
}
function crimeNoise() {
  // loud guns near civilians draw attention
  for (const f of foes) if (f.kind === "civilian" && !f.dead && dist2(f.x, f.z, P.x, P.z) < 30) f.flee = 5;
}

// ───────── movement helpers ─────────
function slide(o: { x: number; z: number }, dx: number, dz: number, r: number): boolean {
  let nx = o.x + dx;
  let nz = o.z + dz;
  if (!walkable(nx, nz)) {
    if (walkable(nx, o.z)) nz = o.z;
    else if (walkable(o.x, nz)) nx = o.x;
    else return true;
  }
  if (roadblock && dist2(nx, nz, roadblock.vehicle.x, roadblock.vehicle.z) < r + 2.2) return true;
  const p = pushOut(nx, nz, r);
  o.x = nx + p.x;
  o.z = nz + p.z;
  return p.hit;
}

function hasLOS(ax: number, az: number, bx: number, bz: number): boolean {
  const d = dist2(ax, az, bx, bz);
  if (d < 1) return true;
  return castWorld(ax, 1.4, az, (bx - ax) / d, 0, (bz - az) / d, d) >= d - 0.5;
}

// ───────── per-frame updates ─────────
function updateFoes(dt: number) {
  const px = P.car ? P.car.x : P.x;
  const pz = P.car ? P.car.z : P.z;
  const alive = P.deadT <= 0;
  let copsNear = false;
  let cops = 0;
  for (let i = foes.length - 1; i >= 0; i--) {
    const f = foes[i]!;
    if (f.dead > 0) {
      f.dead -= dt;
      f.person.pose("down", 0, time, 0, dt);
      if (f.dead <= 0) {
        f.person.root.removeFromParent();
        f.person.dispose();
        foes.splice(i, 1);
      }
      continue;
    }
    const d = dist2(f.x, f.z, px, pz);
    let moving = 0;
    let aiming = false;
    if (f.kind === "cop") {
      cops++;
      if (P.heat === 0 || d > 150) { f.hp = 0; f.dead = 0.01; continue; }
      if (d < 40) copsNear = true;
    }
    if (f.kind === "civilian") {
      if (f.flee > 0) {
        f.flee -= dt;
        const a = Math.atan2(f.x - px, f.z - pz);
        f.heading = a;
        moving = 6;
      } else {
        f.wt -= dt;
        if (f.wt <= 0) { [f.wx, f.wz] = freeSpot(f.x, f.z, 18); f.wt = rnd(4, 10); }
        const dd = dist2(f.x, f.z, f.wx, f.wz);
        if (dd > 1) { f.heading = Math.atan2(f.wx - f.x, f.wz - f.z); moving = 1.6; }
      }
    } else if (alive) {
      const sight = f.kind === "cop" ? conditions(C.clock).visibility : 1;
      const los = d < 60*sight && hasLOS(f.x, f.z, px, pz);
      if (!f.aggro && los && d < 40*sight) f.aggro = true;
      if (f.aggro && d > 90) f.aggro = f.kind === "cop";
      if (f.aggro) {
        f.heading = Math.atan2(px - f.x, pz - f.z);
        aiming = true;
        if (d > 13 || !los) moving = f.speed;
        f.cd -= dt;
        if (f.cd <= 0 && los && d < 42*sight) {
          f.cd = f.kind === "boss" ? rnd(0.6, 1) : rnd(1, 1.7);
          sfx("enemyShot", Math.max(0.1, 1 - d / 50));
          const sx = f.x + Math.sin(f.heading) * 0.7;
          const sz = f.z + Math.cos(f.heading) * 0.7;
          tracer(new THREE.Vector3(sx, 1.35, sz), new THREE.Vector3(px, 1.2, pz), 0xff8a5a);
          if (Math.random() < 0.5 - d / 150) hurt(f.kind === "boss" ? 9 : f.kind === "cop" ? 5 : 6);
        }
      }
    }
    if (moving > 0) slide(f, Math.sin(f.heading) * moving * dt, Math.cos(f.heading) * moving * dt, 0.5);
    f.person.root.position.set(f.x, 0, f.z);
    f.person.root.rotation.y = f.heading;
    f.person.pose(aiming ? (moving > 0 ? "run" : "aim") : moving > 2 ? "run" : moving > 0 ? "walk" : "idle", moving, time, 0, dt);
  }
  // cops chase the player when wanted
  if (alive && P.heat > 0 && cops < P.heat * 2) {
    const a = rnd(0, 6.28);
    const [x, z] = freeSpot(px + Math.sin(a) * 55, pz + Math.cos(a) * 55, 6);
    if (dist2(x, z, px, pz) > 35) spawnFoe("cop", x, z, -1);
  }
  sound.siren(P.heat > 0 && copsNear);
}

function updateDriving(dt: number) {
  const c = P.car!;
  updateReserve(P.stamina, false, dt, 22, 16);
  const k = c.style === 2 ? 2 : 1;
  const fwd = keys.has("KeyW") || keys.has("ArrowUp");
  const back = keys.has("KeyS") || keys.has("ArrowDown");
  const brake = keys.has("Space");
  const left = keys.has("KeyA") || keys.has("ArrowLeft");
  const right = keys.has("KeyD") || keys.has("ArrowRight");
  boosting = updateReserve(P.boost, fwd && !brake && (keys.has("ShiftLeft") || keys.has("ShiftRight")), dt, 30, 12);
  const stored = c.garage !== undefined ? C.expansion.cars[c.garage] : null;
  const model = stored ? VEHICLES.find(v=>v.id===stored.id)! : null;
  const performance = model ? model.speed + stored!.engine*.1 : 1;
  if (boosting) c.speed += CAR_ACC[k]! * 1.3 * dt;
  if (fwd) c.speed += (c.speed < 0 ? CAR_ACC[k]! * 2.5 : CAR_ACC[k]!) * dt;
  else if (back) c.speed -= (c.speed > 0 ? CAR_ACC[k]! * 2.5 : CAR_ACC[k]! * 0.6) * dt;
  else c.speed *= Math.exp(-0.5 * dt);
  if (brake) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 45 * dt);
  c.speed = Math.max(-9, Math.min(CAR_MAX[k]! * performance * (boosting ? 1.35 : 1), c.speed));
  const want = (left ? 1 : 0) - (right ? 1 : 0);
  c.steer += (want - c.steer) * Math.min(1, dt * 8);
  const handling = c.style===6?1.25:c.style===8||c.style===9?.7:1;
  const turn = Math.max(-1, Math.min(1, c.speed / 7)) * (1 - Math.min(0.6, Math.abs(c.speed) / 70));
  c.h += c.steer * 1.9 * handling * turn * dt;
  const hit = slide(c, Math.sin(c.h) * c.speed * dt, Math.cos(c.h) * c.speed * dt, c.style===6?.55:c.style===8||c.style===9?1.8:1.5);
  if (hit && Math.abs(c.speed) > 6) {
    if (Math.abs(c.speed) > 14) hurt(Math.abs(c.speed) * 0.4);
    c.speed *= -0.25;
    sfx("bump", 0.7);
  } else if (hit) c.speed *= 0.6;
  c.rig.root.position.set(c.x, 0, c.z);
  c.rig.root.rotation.y = c.h;
  c.rig.motion(c.speed, c.steer, brake, time);
  // run people over
  if (Math.abs(c.speed) > 8) {
    for (const f of foes) {
      if (!f.dead && dist2(f.x, f.z, c.x, c.z) < 2.2) {
        damageFoe(f, Math.abs(c.speed) * 6, true);
        if (f.kind === "civilian") crime(2);
      }
    }
  }
  sound.engine(Math.min(1, Math.abs(c.speed) / CAR_MAX[k]!));
  P.x = c.x;
  P.z = c.z;
  player.setVisible(c.style===6);
  if(c.style===6){player.root.position.set(c.x-Math.sin(c.h)*.15,.12,c.z-Math.cos(c.h)*.15);player.root.rotation.y=c.h;player.pose('ride',0,time,0,dt);}
}

function updateWalking(dt: number) {
  player.setVisible(true);
  sound.engine(null);
  const f = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0);
  const s = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
  boosting = false;
  updateReserve(P.boost, false, dt, 30, 12);
  const run = updateReserve(P.stamina, (f !== 0 || s !== 0) && (keys.has("ShiftLeft") || keys.has("ShiftRight")), dt, 22 * conditions(C.clock).stamina, 16);
  const shooting = time - P.lastFire < 0.7 || aimHeld;
  let moving = 0;
  if (f !== 0 || s !== 0) {
    // camera-relative: forward = (sin yaw, cos yaw), right = (-cos yaw, sin yaw)
    let dx = Math.sin(yaw) * f - Math.cos(yaw) * s;
    let dz = Math.cos(yaw) * f + Math.sin(yaw) * s;
    const m = Math.hypot(dx, dz);
    dx /= m;
    dz /= m;
    moving = run ? 8.2 : 5;
    walkVelocity.x+=(dx*moving-walkVelocity.x)*(1-Math.exp(-14*dt));
    walkVelocity.y+=(dz*moving-walkVelocity.y)*(1-Math.exp(-14*dt));
    slide(P, walkVelocity.x * dt, walkVelocity.y * dt, 0.5);
    if (!shooting) {
      const target = Math.atan2(dx, dz);
      let diff = target - P.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      P.heading += diff * Math.min(1, dt * 14);
    }
  }
  if(f===0 && s===0) { walkVelocity.multiplyScalar(Math.exp(-18*dt)); slide(P,walkVelocity.x*dt,walkVelocity.y*dt,.5); }
  if (shooting) P.heading = yaw;
  player.root.position.set(P.x, 0, P.z);
  player.root.rotation.y = P.heading;
  player.pose(shooting ? "aim" : moving > 6 ? "run" : moving > 0 ? "walk" : "idle", moving, time, Math.min(2,P.weapon===3||P.weapon===4?1:P.weapon), dt);
  if (mouseDown && playing) fire();
}

const markerRing = new THREE.Mesh(
  new THREE.CylinderGeometry(3, 3, 80, 24, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x40f0ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
);
markerRing.visible = false;
scene.add(markerRing);

function updateEconomy(dt: number) {
  for (const msg of tickCampaign(C, dt)) { feed(msg); if (msg.includes('ATTACK') || msg.includes('RAID')) sfx('wanted'); }
  P.heat = C.heat < 30 ? 0 : Math.min(5, Math.ceil(C.heat / 20));
  if (battle && (battle.defending && C.defense?.block !== battle.block)) clearBattle();
  if (battle && !foes.some(f => !f.dead && f.blockId === battle!.block)) {
    if (battle.defending) resolveDefense(C, true); else captureBlock(C, battle.block);
    feed(`${BLOCKS.find(b => b.id === battle!.block)!.name} secured! Controlled turf earns dirty cash.`);
    for (const a of unlock(C)) feed(`Achievement: ${a}`);
    battle = null; target = null; saveGame();
  }
  for(const msg of tickExpansion(C,dt)){feed(msg);if(msg.includes('WARNING')||msg.includes('SHOWDOWN'))sfx('wanted');}
  if (P.car?.garage !== undefined && C.expansion.runs.some(r=>r.car===P.car!.garage)) {P.car=null;player.setVisible(true);}
  updateRoadblock(dt);
  updatePickups(dt);
  if(C.expansion.mission) {
    const def=MISSIONS.find(m=>m.id===C.expansion.mission!.id)!;
    const step=def.steps[C.expansion.mission.step]!;
    target={x:step.x,z:step.z,name:step.name};
    if(def.id==='parade'&&C.expansion.mission.step===4) {
      const escort=C.expansion.mission.escort??0;
      if(dist2(P.x,P.z,0,42+Math.min(40,escort)*1.5)<18)C.expansion.mission.escort=escort+dt;
      target={x:0,z:42+Math.min(40,C.expansion.mission.escort??0)*1.5,name:`Escort jester float ${Math.floor(Math.min(40,C.expansion.mission.escort??0))}/40s`};
    }
  }
  // heal at HQ
  if (dist2(P.x, P.z, HQ.x, HQ.z) < HQ.r && P.hp < MAX_HP && P.deadT <= 0) P.hp = Math.min(MAX_HP, P.hp + 6 * dt);
  const j = P.job;
  markerRing.visible = !!j || !!target;
  if (!j && target) markerRing.position.set(target.x, 40, target.z);
  if (j) {
    j.t -= dt;
    markerRing.position.set(j.x, 40, j.z);
    markerRing.rotation.y = time * 0.6;
    (markerRing.material as THREE.MeshBasicMaterial).color.setHex(j.priority ? 0xffb347 : 0x40f0ff);
    if (dist2(P.x, P.z, j.x, j.z) < 6) {
      const bonus = deliveryBonus(j.pay, j.t, j.duration);
      C.dirty += Math.round((j.pay + bonus) * (1 + crewPayout()) * (conditions(C.clock).night ? 1.3 : 1));
      P.streak++;
      feed(`Delivery #${P.streak}: +$${j.pay} + $${bonus} speed bonus!`);
      sfx("cash");
      P.job = null;
    } else if (j.t <= 0) {
      P.streak = 0;
      failMission(C);
      feed("Too late. The buyer walked. Delivery streak reset.");
      sfx("deny");
      P.job = null;
    }
  }
  if (C.clean >= GOAL && !P.won && !C.expansion.completed.includes("kingpin")) {
    C.expansion.completed.push("kingpin");
    P.won = true;
    document.exitPointerLock();
    $("endTitle").textContent = "KINGPIN OF NEW ORLEANS";
    $("endText").textContent = `You reached $${GOAL.toLocaleString()} clean capital. Your empire has arrived.`;
    playing = false; saveGame();
    $("end").style.display = "flex";
    sfx("capture");
  }
}

function prompt() {
  let t = "";
  if (!P.car && P.deadT <= 0) {
    const corner = BLOCKS.find(b => dist2(P.x, P.z, b.x, b.z) < 14 && (!C.owned.includes(b.id) || C.defense?.block === b.id));
    if(foes.some(f=>f.kind==='gangster'&&!f.dead&&!f.mugged&&dist2(P.x,P.z,f.x,f.z)<2.5))t='E: shake down rival courier (raises heat)';
    else if (corner && !battle) t = `E: ${C.defense?.block === corner.id ? 'defend' : 'fight for'} ${corner.name}`;
    else
    if (vehicles.some((v) => dist2(v.x, v.z, P.x, P.z) < 4.5)) t = "E: get in car";
    else if (dist2(P.x, P.z, HQ.x, HQ.z) < HQ.r) t = "E: open the back room";
  } else if (P.car) t = "E: get out";
  const el = $("prompt");
  el.textContent = t;
  el.style.display = t && playing && !managing && !shopOpen ? "block" : "none";
}

const balconyPosition = new THREE.Vector3(9,24,45);
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
function updateCamera(dt: number) {
  if(balcony){camera.position.lerp(balconyPosition,1-Math.exp(-8*dt));camera.lookAt(0,2,-45);camera.fov=62;camera.updateProjectionMatrix();return;}
  if (P.car && Math.abs(P.car.speed) > 3 && !mouseDown) {
    let diff = P.car.h - yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    yaw += diff * Math.min(1, dt * 1.8) * (P.car.speed > 0 ? 1 : 0);
  }
  const cp = Math.cos(pitch);
  const dx = Math.sin(yaw) * cp;
  const dy = Math.sin(pitch);
  const dz = Math.cos(yaw) * cp;
  const driving = !!P.car;
  const tx = P.x - Math.cos(yaw) * (driving ? 0 : 0.9);
  const tz = P.z + Math.sin(yaw) * (driving ? 0 : 0.9);
  const ty = driving ? 1.8 : 1.7;
  const dist = (driving ? camDist + 3 : aimHeld ? 3.2 : camDist);
  const free = castWorld(tx, ty, tz, -dx, -dy, -dz, dist + 0.4);
  const use = Math.max(1, Math.min(dist, free - 0.4));
  camPos.set(tx - dx * use, Math.max(0.6, ty - dy * use), tz - dz * use);
  camLook.set(tx + dx * 30, ty + dy * 30, tz + dz * 30);
  camera.position.lerp(camPos,1-Math.exp(-18*dt));
  camera.lookAt(camLook);
  const targetFov = driving ? 68 + Math.min(14, Math.abs(P.car!.speed) * 0.4) + (boosting ? 6 : 0) : aimHeld ? 52 : 62;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 5);
  camera.updateProjectionMatrix();
}

// Dynamic arena loot is finite, spatial and earned by moving to it.
const pickupGeo = new THREE.BoxGeometry(.85,.7,.85);
const pickupMaterials=[0xf5c34a,0x9c52e0,0x47d7c1].map(color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.45,roughness:.45}));
const pickups:{mesh:THREE.Object3D;kind:number;x:number;z:number;life:number}[]=[];
let pickupClock=18;
function updatePickups(dt:number){
  pickupClock+=dt;
  if(pickupClock>=22&&pickups.length<12){
    pickupClock=0;
    for(let trial=0;trial<12;trial++){
      const a=rnd(0,Math.PI*2),distance=rnd(12,45);
      const x=P.x+Math.sin(a)*distance,z=P.z+Math.cos(a)*distance;
      if(!walkable(x,z)||pushOut(x,z,1).hit||dist2(x,z,SPAWN.x,SPAWN.z)<12)continue;
      const kind=Math.floor(rnd(0,3));const mesh=kind===0?createMoneyBundle():new THREE.Mesh(pickupGeo,pickupMaterials[kind]);mesh.position.set(x,kind===0?.16:.7,z);scene.add(mesh);
      pickups.push({mesh,kind,x,z,life:180});break;
    }
  }
  for(let i=pickups.length-1;i>=0;i--){const p=pickups[i]!;p.life-=dt;if(p.kind!==0){p.mesh.rotation.y+=dt;p.mesh.position.y=.7+Math.sin(time*3+i)*.12;}
    let collected=false;
    if(!P.car&&P.deadT<=0&&dist2(P.x,P.z,p.x,p.z)<1.8){
      if(p.kind===0){C.dirty=Math.min(cashCap(C),C.dirty+80);feed('Stash recovered: +$80 dirty');collected=true;}
      else if(p.kind===2){C.expansion.parts++;feed('Mechanical part recovered');collected=true;}
      else if(C.inventory.reduce((a,b)=>a+b,0)<inventoryCap(C)){C.inventory[Math.floor(rnd(0,C.inventory.length))]!++;feed('Contraband box recovered');collected=true;}
      if(collected){C.expansion.pickupCount++;sfx('cash');}
    }
    if(collected||p.life<=0){p.mesh.removeFromParent();pickups.splice(i,1);}
  }
}

// ───────── empire, controls and persistence ─────────
function crewPayout() { return bonus(C).payout; }
function clearBattle() {
  if (!battle) return;
  // Mark for the existing cleanup loop instead of mutating its array mid-combat.
  for (const f of foes) if (f.blockId === battle.block) f.dead = .01;
  battle = null;
}
function startBattle(id: string) {
  const block = BLOCKS.find(b => b.id === id);
  if (!block || P.car || P.deadT > 0) return;
  if (dist2(P.x, P.z, block.x, block.z) >= 14) { target = { ...block }; feed('Travel to the marked corner to fight.'); return; }
  if (battle) { feed('Finish your current turf fight first.'); return; }
  if (C.owned.includes(id) && C.defense?.block !== id) { feed('You already control this corner.'); return; }
  battle = { block: id, defending: C.defense?.block === id };
  target = { x: block.x, z: block.z, name: block.name };
  for (let i = 0; i < 3; i++) {
    const [x, z] = freeSpot(block.x + (i - 1) * 5, block.z + 6, 4);
    const f = spawnFoe('gangster', x, z, block.district); f.blockId = id; f.aggro = true;
  }
  addHeat(C, 5); feed(`Turf battle: defeat the three rival guards at ${block.name}.`); sfx('wanted'); saveGame();
}
function updateRoadblock(dt: number) {
  if (roadblock) {
    roadblock.t -= dt;
    if (C.heat < 30 || roadblock.t <= 0) {
      const v = roadblock.vehicle;
      if (P.car === v) P.car = null;
      v.rig.root.removeFromParent(); v.rig.dispose(); vehicles.splice(vehicles.indexOf(v), 1); roadblock = null;
    }
  } else if (C.intervention === 'Patrol roadblock' && C.heat >= 60) {
    const [x, z] = freeSpot(P.x + Math.sin(yaw) * 22, P.z + Math.cos(yaw) * 22, 8);
    if (dist2(x, z, P.x, P.z) < 8) return;
    const v = addVehicle(3, x, z, yaw + Math.PI / 2, 0x15335c);
    roadblock = { vehicle: v, t: 75 };
    spawnFoe('cop', x + 3, z, -1); spawnFoe('cop', x - 3, z, -1);
  }
}
function snapshotPlayer() {
  return { x: P.x, z: P.z, heading: P.heading, hp: P.hp, armor: P.armor, owned: P.owned, weapon: P.weapon,
    captured: [...P.captured], bossOut: [...P.bossOut], streak: P.streak, jobActive: !!P.job,
    target, battle, foes: foes.filter(f => !f.dead).map(f => ({ kind: f.kind, x: f.x, z: f.z, hp: f.hp, district: f.district, aggro: f.aggro, mugged: f.mugged, blockId: f.blockId })) };
}
function saveGame(manual = false) {
  if (resetting) return;
  const result = store.save(C, snapshotPlayer());
  if (manual) void result.mirrored.then(mirrored => feed(result.local && mirrored ? 'Game saved to localStorage and IndexedDB.' : result.local || mirrored ? 'Game saved to one storage copy; backup unavailable.' : 'Save failed: browser storage is unavailable.'));
}
$('paradeView').onclick=()=>{
  if(C.expansion.mission?.id!=='parade')return;
  if(!balcony){balconyWasPlaying=playing;playing=false;balcony=true;keys.clear();mouseDown=aimHeld=false;document.exitPointerLock();$('start').style.display='none';$('hud').style.display='none';$('paradeView').textContent='RETURN TO PLAY';}
  else {balcony=false;$('hud').style.display='';playing=balconyWasPlaying;$('paradeView').textContent='PARADE BALCONY';if(playing)lock();else $('start').style.display='flex';}
};
let wasPlaying = false;
const empire = createEmpireUI({
  deploy(index) {
    if(dist2(P.x,P.z,HQ.x,HQ.z)>35) {feed('Return within 35m of Mama Nola’s garage to deploy a stored vehicle.');return;}
    const stored=C.expansion.cars[index]; if(!stored || C.expansion.runs.some(r=>r.car===index))return;
    if(P.car?.garage===index) {feed('Exit this vehicle before redeploying it.');return;}
    for(let i=vehicles.length-1;i>=0;i--)if(vehicles[i]!.garage===index){vehicles[i]!.rig.dispose();vehicles[i]!.rig.root.removeFromParent();vehicles.splice(i,1);}
    const model=VEHICLES.find(v=>v.id===stored.id)!;
    const v=addVehicle(model.style,44,-8,Math.PI/2,stored.color);v.garage=index;
    feed(`${model.name} deployed at garage marker. E to enter.`);target={x:44,z:-8,name:'Your garage vehicle'};
  },
  gearOwned: weapon => P.owned[weapon]===true,
  armory(weapon) {
    const prices=[0,2500,5000,6500,9000];if(!WEAPONS[weapon])return;
    if(!P.owned[weapon]){if(C.clean<prices[weapon]!)return;C.clean-=prices[weapon]!;P.owned[weapon]=true;}
    P.weapon=weapon;reloading=0;feed(`${WEAPONS[weapon]!.name} equipped.`);
  },
  campaign: C,
  pause(open) {
    if (open) { if(balcony){balcony=false;$('hud').style.display='';playing=balconyWasPlaying;$("paradeView").textContent="PARADE BALCONY";} wasPlaying = playing; managing = true; keys.clear(); mouseDown = aimHeld = false; document.exitPointerLock(); }
    else { managing = false; playing = wasPlaying; if (playing) { $('start').style.display = 'none'; lock(); } }
  },
  changed() { if (battle?.defending && C.defense?.block !== battle.block) clearBattle(); for (const a of unlock(C)) feed(`Achievement: ${a}`); updateHud(); saveGame(); sfx('click'); },
  notice: feed, location: () => ({ x: P.x, z: P.z, district: districtAt(P.x, P.z) }),
  attack: startBattle,
  waypoint(x, z, name) { target = { x, z, name }; yaw=Math.atan2(x-P.x,z-P.z); feed(`Route marked: ${name}. White dot on minimap.`); },
  appearance() {
    player.root.removeFromParent(); player.dispose(); player = createPerson('player', 5, C.avatar);
    player.root.position.set(P.x, 0, P.z); player.root.rotation.y = P.heading; scene.add(player.root);
  },
  save: () => saveGame(true),
  async reset() {
    resetting = true;
    try { await store.reset(); location.reload(); } catch { resetting = false; feed('Unable to reset: browser storage is blocked.'); }
  },
  audio() { sound.start(); sound.configure(C.audio); $('mute').textContent = C.audio.muted ? 'UNMUTE' : 'MUTE'; },
});
let hiddenSince: number | null = null;
setInterval(() => { if (!document.hidden) saveGame(); }, 30000);
addEventListener('pagehide', () => { if (hiddenSince === null) saveGame(); });
addEventListener('beforeunload', () => { if (hiddenSince === null) saveGame(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveGame(); hiddenSince = Date.now(); keys.clear(); mouseDown = aimHeld = false;
    if (playing && !managing && !shopOpen) {
      pausedForHidden = true; playing = false; $('go').textContent = 'RESUME'; $('start').style.display = 'flex';
    }
    sound.engine(null); sound.siren(false);
  } else {
    if (hiddenSince !== null) {
      const earnings = offlineProgress(C, (Date.now() - hiddenSince) / 1000); hiddenSince = null;
      if (earnings.seconds > 60) showWelcome(earnings);
      saveGame(); updateHud();
    }
    if (pausedForHidden) pausedForHidden = false; // Explicit Resume prevents surprise combat.
  }
});
// Touch controls use held pointer state, not one-shot clicks. Drag the right side to look.
for (const element of Array.from(document.querySelectorAll<HTMLElement>('[data-control]'))) {
  const code = element.dataset.control!;
  const release = () => { if (code === 'fire') mouseDown = false; else if (code === 'aim') aimHeld = false; else keys.delete(code); };
  element.addEventListener('pointerdown', e => {
    e.preventDefault(); if (!playing || managing || shopOpen) return;
    element.setPointerCapture(e.pointerId);
    if (code === 'fire') mouseDown = true;
    else if (code === 'aim') aimHeld = true;
    else if (code === 'reload') reloadWeapon();
    else if (code === 'weapon') { for (let i = 1; i <= WEAPONS.length; i++) { const next = (P.weapon + i) % WEAPONS.length; if (P.owned[next]) { P.weapon = next; reloading=0; break; } } }
    else if (code === 'KeyE') interact();
    else keys.add(code);
  });
  element.addEventListener('pointerup', release); element.addEventListener('pointercancel', release);
  element.addEventListener('lostpointercapture', release);
}
let touchLook: { id: number; x: number; y: number } | null = null;
renderer.domElement.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch' || !playing || managing || shopOpen) return;
  e.preventDefault();
  touchLook = { id: e.pointerId, x: e.clientX, y: e.clientY }; renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!touchLook || e.pointerId !== touchLook.id) return;
  yaw -= (e.clientX - touchLook.x) * .004; pitch = Math.max(-.7, Math.min(.45, pitch - (e.clientY - touchLook.y) * .004));
  touchLook.x = e.clientX; touchLook.y = e.clientY;
});
renderer.domElement.addEventListener('pointerup', () => touchLook = null);
renderer.domElement.addEventListener('pointercancel', () => touchLook = null);
function showWelcome(earnings: { seconds: number; income: number; heat: number }) {
  const modal = $('welcome'); modal.hidden = false;
  $('offlineReport').textContent = `Away ${Math.floor(earnings.seconds / 60)} minutes (24h cap). Your controlled corners earned $${earnings.income.toLocaleString()} dirty cash at 35% rate and accumulated ${earnings.heat} heat. Daily wages were processed where due. No turf means no passive income.`;
  $('welcomeClose').onclick = () => modal.hidden = true;
}
if (offline && offline.seconds > 60) showWelcome(offline);
saveGame(); // Claim offline earnings immediately so a reload cannot award them twice.

// ───────── main loop ─────────
const clock = new THREE.Clock();
let hudT = 0;
let miniT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (playing && !shopOpen && !managing && !P.won && !document.hidden) {
    time += dt;
    if(reloading>0){reloading-=dt;if(reloading<=0)ammo[P.weapon]=MAGAZINES[P.weapon]!;}
    recoil*=Math.exp(-10*dt);
    player.flash(Math.max(0,1-(time-P.lastFire)*16));
    if (P.deadT > 0) {
      P.deadT -= dt;
      player.pose("down", 0, time, 0, dt);
      player.root.position.set(P.x, 0, P.z);
      if (P.deadT <= 0) {
        P.hp = MAX_HP;
        P.x = SPAWN.x;
        P.z = SPAWN.z;
        P.heading = SPAWN.heading;
        player.setVisible(true);
      }
    } else if (!shopOpen) {
      if (P.car) updateDriving(dt);
      else updateWalking(dt);
    }
    // parked cars keep their rigs in sync
    for (const v of vehicles) if (v !== P.car) { v.rig.root.position.set(v.x, 0, v.z); v.rig.root.rotation.y = v.h; v.rig.motion(0, 0, false, time); }
    updateFoes(dt);
    updateEconomy(dt);
    impacts.update(dt);
    if (hitFlash > 0) hitFlash -= dt;
    $("cross").classList.toggle("hit", hitFlash > 0);
    for (let i = tracers.length - 1; i >= 0; i--) {
      const t = tracers[i]!;
      t.t -= dt;
      if (t.t <= 0) { t.line.removeFromParent(); t.line.geometry.dispose(); (t.line.material as THREE.Material).dispose(); tracers.splice(i, 1); }
    }
    prompt();
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.1; updateHud(); }
    miniT -= dt;
    if (miniT <= 0) { miniT = 0.15; drawMini(); }
  }
  if (!playing || managing || shopOpen || P.deadT > 0) { sound.engine(null); sound.siren(false); }
  updateCamera(dt);
  scenery.update(time, P.x, P.z);
  const weatherState=weather.update(time,playing&&!managing&&!shopOpen?dt:0,P.x,P.z);
  const parade=C.expansion.mission?.id==='parade';
  $('paradeView').hidden=!parade;
  festival.update(time,playing&&!managing&&!shopOpen?dt:0,parade,parade&&C.expansion.mission?.step===4?(C.expansion.mission.escort??0):null);
  sound.environment(P.x>60&&P.z<-60,weatherState.weather==='Rainstorm');
  shotLight.intensity=Math.max(0,1-(time-P.lastFire)*18)*12;
  shotLight.position.set(P.x+Math.sin(P.heading)*.8,1.4,P.z+Math.cos(P.heading)*.8);
  const night = 1 - cityClock(time).daylight;
  headlights.intensity = P.car && night > 0.5 ? 32 : 0;
  if (P.car) {
    headlights.position.set(P.x + Math.sin(P.car.h) * 2, 1.2, P.z + Math.cos(P.car.h) * 2);
    headlights.target.position.set(P.x + Math.sin(P.car.h) * 25, 0, P.z + Math.cos(P.car.h) * 25);
  }
  if (quality.value !== "performance") composer.render();
  else renderer.render(scene, camera);
}

feed("No free idle income: capture corners via Empire / M. Mama Nola's is your safehouse.");
if (loaded?.player.jobActive) feed('Interrupted delivery failed. Crew loyalty fell; your other progress is restored.');
updateHud();
drawMini();
frame();
