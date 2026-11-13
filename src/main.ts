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
import { encodeSave, decodeSave } from './persistence.ts';
import { TUTORIAL, advanceTutorial, peakMultiplier, dailyRoute, dailyCheckpoint, milestoneRewards, legacyInheritance } from './legacy.ts';
import { SaveStore } from './persistence.ts';
import { createEmpireUI } from './empire-ui.ts';
import './campaign.css';
import './hud.css';
import { missionSession, INTRO_SHOTS, introShot } from './session.ts';
import { mountJoystick } from './joystick.ts';
import { INTERIORS, nearestEntrance, indoorMove, createInterior, type InteriorDefinition } from './interiors.ts';
import { conditions, VEHICLES, MISSIONS, missionInteract, tickExpansion, inventoryCap, cashCap, furnished } from './expansion.ts';
import { createFestival } from './festival.ts';
import { createMoneyBundle } from './money.ts';
import {approach,atPoint,mapLocations,type MapLocation} from './navigation.ts';
import {recon,HEISTS,plan} from './expansion.ts';
import {applyBodyStyle} from './car-style.ts';
import {workObjective,workInteract,tickWork} from './lifestyle.ts';
import {STORIES,DISCOVERIES,storyInteract,storyObjective,discover,tacticalHeading,coverReduction} from './city-stories.ts';
import {createStreetLife} from './street-life.ts';
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
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
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
const tireSmoke=createImpacts(scene,true);
let lastCleaned=C.stats.cleaned;
const doorwayGeometry=new THREE.RingGeometry(1.1,1.45,24);
const doorwayMaterial=new THREE.MeshBasicMaterial({color:0x82e6d1,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false});
for(const entry of INTERIORS){const marker=new THREE.Mesh(doorwayGeometry,doorwayMaterial);marker.rotation.x=-Math.PI/2;marker.position.set(approach(entry).x,.08,approach(entry).z);scene.add(marker);}
const streetLife=createStreetLife(scene);
const coverStations=[{x:0,z:-115},{x:120,z:175},{x:-180,z:6},{x:60,z:6}];
const coverGeo=new THREE.BoxGeometry(3,1.1,1),coverMat=new THREE.MeshStandardMaterial({color:0x706e51,roughness:1});
for(const p of coverStations){const wall=new THREE.Mesh(coverGeo,coverMat);wall.position.set(p.x,.55,p.z);scene.add(wall);}
const discoveryGeo=new THREE.OctahedronGeometry(.7),discoveryMat=new THREE.MeshStandardMaterial({color:0xf4c268,emissive:0x8c5f14,emissiveIntensity:.6});
const landmarkProps=new THREE.Group();scene.add(landmarkProps);
for(const [i,d] of DISCOVERIES.entries()){
 const panel=new THREE.Mesh(new THREE.BoxGeometry(.3,3.5,5),new THREE.MeshStandardMaterial({color:[0x426c66,0xa64c79,0x767f8b,0x99733d][i],roughness:.8}));panel.position.set(d.x+7,1.75,d.z);landmarkProps.add(panel);
 const lamp=new THREE.Mesh(new THREE.SphereGeometry(.3,8,6),new THREE.MeshBasicMaterial({color:0xffd47e}));lamp.position.set(d.x+7,3.8,d.z);landmarkProps.add(lamp);
}
const discoveryMeshes=DISCOVERIES.map(d=>{const mesh=new THREE.Mesh(discoveryGeo,discoveryMat);mesh.position.set(d.x,1.2,d.z+3);scene.add(mesh);return mesh;});
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
  weapon: 0, owned: [true, false, false, false, false, false], lastFire: -10, deadT: 0, car: null as Vehicle | null,
  captured: new Set<number>([0]), kills: new Map<number, number>(), bossOut: new Set<number>(),
  job: null as null | { name: string; x: number; z: number; t: number; duration: number; pay: number; priority: boolean }, won: false,
  streak: 0, stamina: { value: 100, exhausted: false }, boost: { value: 100, exhausted: false },
};
let yaw = SPAWN.heading;
let pitch = -0.15;
let time = 0;
let playing = false;
let introActive = false;
let introElapsed = 0;
let needsCharacter = !loaded;
let missionUnlockUntil = 0;
let shake=0;
let crouched=false;
let storySpawned=false;
let tutorialRival: Foe|null=null;
let tutorialCar: Vehicle|null=null;
let effectClock=0;
let checkpointNotice=0;
let shopOpen = false;
let managing = false;
let inside: null | { room: ReturnType<typeof createInterior>; def: InteriorDefinition; x: number; z: number } = null;
let balcony = false;
let balconyWasPlaying = false;
let pausedForHidden = false;
let resetting = false;
let selectedLocation:MapLocation|null=null;
let previousAuto=false;
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

let player = createPerson("player", 5, C.avatar,C.lifestyle);
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
    if (BLOCKS.some(b => b.id === raw.blockId)||['tutorial','ambush',...STORIES.map(m=>`story:${m.id}`)].includes(raw.blockId)) f.blockId = raw.blockId;
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
  for(const b of mapLocations())dot(b.x,b.z,b.category==='Heists'?'#ffbe79':b.category==='Buildings & homes'?'#82e6d1':'#b9adce',1.5);
  for(const b of INTERIORS)dot(approach(b).x,approach(b).z,'#82e6d1',2.5);
  for (const b of BLOCKS) dot(b.x, b.z, C.owned.includes(b.id) ? '#8cf08c' : '#dd8bff', 3);
  mg.restore();
  mg.fillStyle = "#fff";
  mg.beginPath();
  mg.arc(90, 90, 4, 0, 6.3);
  mg.fill();
}

function updateHud() {
  document.body.dataset.tutorial=String(C.legacy.tutorial);
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
  $("cityTime").textContent = inside ? "INTERIOR · CITY PAUSED" : `${hours}:${minutes} · ${clock.label}`;
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
  if(inside)obj=`${inside.def.name} · walk to service desk · E at exit / Esc to leave`;
  if(target){const angle=Math.atan2(target.x-P.x,target.z-P.z)-yaw;$('objectiveArrow').style.transform=`rotate(${-angle}rad)`;}
  const work=inside?null:workObjective(C);if(work)obj=work.text;
  const story=inside?null:storyObjective(C);if(story){obj=story.text;if(C.cityStories.active?.step===1){const enemies=foes.filter(f=>!f.dead&&f.blockId===`story:${C.cityStories.active!.id}`);obj+=` · ${enemies.length} rivals left${enemies[0]?` · lead HP ${Math.ceil(enemies[0].hp)}`:''}`;}}
  if(crouched&&!inside)obj=(coverStations.some(p=>dist2(P.x,P.z,p.x,p.z)<2.4)?'COVERED (-60% damage) · ':'CROUCHED · ')+obj;
  if(C.legacy.tutorial<3)obj=TUTORIAL[C.legacy.tutorial]!;
  $('questTracker').textContent=C.legacy.tutorial<3?`TUTORIAL ${C.legacy.tutorial+1}/3`:C.legacy.daily&&!C.legacy.daily.finished?`DAILY: checkpoint ${C.legacy.daily.step+1}/3 · ${C.legacy.daily.elapsed.toFixed(1)}s`:`EMPIRE OBJECTIVE · Launder $${Math.max(0,10000-C.stats.cleaned).toLocaleString()} more · Capture ${Math.max(0,5-C.owned.length)} more corners · $${Math.floor(C.clean).toLocaleString()} / $1,000,000 clean`;
  $("obj").textContent = obj;
  $("obj").style.display = obj ? "block" : "none";
  const sp = P.car ? Math.round(Math.abs(P.car.speed) * 3.6) : 0;
  $("speed").textContent = P.car ? `${sp} km/h` : "";
}

// ───────── input ─────────
const keys = new Set<string>();
const joystick=mountJoystick($('moveJoystick'),()=>playing&&!managing&&!shopOpen);
const touchMode=$<HTMLInputElement>('touchMode');
touchMode.checked=matchMedia('(pointer: coarse)').matches;
try {const preference=localStorage.getItem('cck.touchMode');if(preference!==null)touchMode.checked=preference==='true';}catch{}
const applyTouchMode=()=>{document.body.classList.toggle('touch-enabled',touchMode.checked);joystick.reset();try{localStorage.setItem('cck.touchMode',String(touchMode.checked));}catch{}};
touchMode.onchange=applyTouchMode;applyTouchMode();

let mouseDown = false;
let lookDragging=false;
let aimHeld = false;
addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement)?.matches("input, select, textarea")) return;
  if(introActive){if(e.code==='Escape'||e.code==='Space')finishIntro();return;}
  if (balcony) {if(e.code === "Escape") $("paradeView").click(); return;}
  if (e.code === 'Escape' && inside && !managing) { pauseRun(); return; }
  if(!$('pauseMenu').hidden)return;
  if (e.code === "KeyM") { e.preventDefault(); if (!e.repeat) { if (empire.isOpen()) empire.close(); else empire.open(); } return; }
  if (managing) return;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.code === "Escape" && playing && !shopOpen) {pauseRun();return;}
  if (e.repeat && ['KeyE','KeyR','KeyM'].includes(e.code)) return;
  keys.add(e.code);
  if (!playing || shopOpen || managing) return;
  if (e.code === "KeyE") interact();
  if(e.code==='KeyC'&&!e.repeat)crouched=!crouched;
  if (e.code === "KeyR") reloadWeapon();
  if (/^Digit[1-6]$/.test(e.code)) {
    const w = Number(e.code.slice(-1)) - 1;
    if (P.owned[w]) { P.weapon = w; reloading = 0; }
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => { keys.clear(); joystick.reset(); lookDragging=false;mouseDown = aimHeld = false; });
addEventListener("mousedown", (e) => {
  if (!playing || managing || shopOpen || e.target !== renderer.domElement || (e as MouseEvent & {sourceCapabilities?:{firesTouchEvents:boolean}}).sourceCapabilities?.firesTouchEvents) return;
  if(e.button===0 && touchMode.checked){lookDragging=true;return;}
  if (e.button === 0) mouseDown = true;
  if (e.button === 2) {aimHeld = true;lookDragging=true;}
});
addEventListener("mouseup", (e) => {
  lookDragging=false;
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) aimHeld = false;
});
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("mousemove", (e) => {
  if (!playing || managing || shopOpen) return;
  if (document.pointerLockElement !== renderer.domElement && !((mouseDown||lookDragging) && playing)) return;
  yaw -= e.movementX * 0.0024*C.lifestyle.lookSensitivity;
  pitch = Math.max(-0.7, Math.min(0.45, pitch - e.movementY * 0.0022*C.lifestyle.lookSensitivity*(C.lifestyle.invertLook?-1:1)));
});
addEventListener("wheel", (e) => { if (!playing || managing || shopOpen) return; camDist = Math.max(3.5, Math.min(12, camDist + Math.sign(e.deltaY) * 0.6)); });
let camDist = 6;

function lock() {
  if (touchMode.checked) return;
  const request = renderer.domElement.requestPointerLock?.();
  if (request) void request.catch(() => { /* drag-to-look fallback */ });
}
let locked = false;
document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === renderer.domElement || locked; });
function startPlaying(){
  const state=missionSession();
  playing=state.playing;managing=state.managing;shopOpen=state.shopOpen;balcony=state.balcony;
  $('pauseMenu').hidden=true;$('start').style.display='none';$('shop').style.display='none';$('hud').style.display='';
  keys.clear();joystick.reset();mouseDown=aimHeld=false;walkVelocity.set(0,0);
  // A queued pointer-lock loss from closing a menu must not immediately pause the accepted mission.
  locked=false;missionUnlockUntil=performance.now()+600;
  try{lock();}catch{} sound.start();
}
function finishIntro(){
  introActive=false;$('cinematic').hidden=true;$('hud').style.display='';
  needsCharacter=true;empire.open('Character');
}
$('skipIntro').onclick=finishIntro;
$('replayIntro').onclick=()=>beginIntro();
function beginIntro(){
  introElapsed=0;introActive=true;playing=false;
  $('start').style.display='none';$('cinematic').hidden=false;$('hud').style.display='none';
  keys.clear();joystick.reset();mouseDown=aimHeld=false;locked=false;
  document.exitPointerLock();sound.start();
}
$("go").addEventListener("click", () => {
  if(needsCharacter){beginIntro();return;}
  startPlaying();
});
document.addEventListener("pointerlockchange", () => {
  if (performance.now()<missionUnlockUntil) {locked=document.pointerLockElement===renderer.domElement;return;}
  if (document.pointerLockElement !== renderer.domElement && locked && playing && !shopOpen && !managing && !P.won) pauseRun();

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
  if (P.job || C.lifestyle.work || C.cityStories.active || C.expansion.mission || (C.legacy.daily&&!C.legacy.daily.finished) || C.legacy.tutorial<3) {feed('Finish the active job or story before starting an import run.');return;}
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
  mouseDown = aimHeld = false; keys.clear();joystick.reset();
  sound.engine(null); sound.siren(false);
  document.exitPointerLock();
  renderShop();
  $("shop").style.display = "flex";
  sfx("door");
}
function closeShop() {
  shopOpen = false;
  keys.clear(); joystick.reset(); lookDragging=false;mouseDown = aimHeld = false;
  $("shop").style.display = "none";
  lock();
}

// ───────── interaction ─────────
function interact() {
  if(P.deadT>0)return;
  if(!inside&&selectedLocation&&atPoint(P.x,P.z,selectedLocation,8)){
    const id=selectedLocation.id;
    if(id.startsWith('door:')){if(P.car){feed('Exit your vehicle first: E / INTERACT or GET OUT.');exitCar();return;}const door=INTERIORS.find(b=>b.id===id.slice(5));if(door){enterInterior(door);return;}}
    if(id.startsWith('heist:')){handleRecon(id.slice(6));return;}
    if(id.startsWith('property:')){empire.open('Properties');return;}
    if(id.startsWith('turf:')&&!P.car){startBattle(id.slice(5));return;}
    if(id.startsWith('mission:')&&!C.expansion.mission){feed('Accept this mission first in Empire → Missions.');empire.open('Missions');return;}
    if(id.startsWith('work:')&&!C.lifestyle.work){feed('Accept a work order first in Empire → Jobs & Style.');empire.open('Jobs & Style');return;}
    if(id.startsWith('story:')&&!C.cityStories.active){feed('Choose this chapter first in Stories & Exploration.');empire.open('Stories & Exploration');return;}
    if(id.startsWith('drop:')&&!P.job){feed('No active import contract. Take an import job at Mama Nola’s first.');return;}
  }
  const worked=inside?null:workInteract(C,P.x,P.z);if(worked){if(!C.lifestyle.work){target=null;selectedLocation=null;}feed(worked);sfx('cash');saveGame();return;}
  if(!inside&&C.legacy.tutorial>=3){
    const story=storyInteract(C,P.x,P.z);
    if(story==='fight'){spawnStoryEncounter();feed('Encounter started. Use C / COVER beside sandbags to reduce damage.');saveGame();return;}
    if(story==='complete'){target=null;selectedLocation=null;feed('Chapter complete! Return to Stories & Exploration for the next dialogue.');sfx('capture');saveGame();return;}
    const cache=DISCOVERIES.find(d=>!C.cityStories.discovered.includes(d.id)&&atPoint(P.x,P.z,d,6));
    if(cache&&discover(C,cache.id)){feed(`Discovered ${cache.name}! One-time cache recovered.`);sfx('cash');saveGame();return;}
  }
  if(micro?.kind===0&&dist2(P.x,P.z,micro.x,micro.z)<5){if(C.dirty>=100){C.dirty-=100;C.heat=Math.max(0,C.heat-8);micro.t=0;feed('Checkpoint bribe paid.');saveGame();}else feed('Need $100 dirty cash, or find another route.');return;}
  if(C.legacy.tutorial===0&&atPoint(P.x,P.z,HQ,8)){
    advanceTutorial(C,0);feed('Mama Nola: a rival is shaking down our corner. Defend yourself — aim, fire and reload.');
    const [x,z]=freeSpot(10,12,4);tutorialRival=spawnFoe('gangster',x,z,0);tutorialRival.blockId='tutorial';tutorialRival.aggro=true;target={x,z,name:'First rival · aim and shoot'};saveGame();return;
  }
  if (inside) {interiorInteract();return;}
  if (P.deadT > 0) return;
  const advanced = missionInteract(C,P.x,P.z);
  if(advanced) {if(!C.expansion.mission){target=null;selectedLocation=null;}feed(advanced); sfx('cash'); saveGame(); return;}
  const heist=HEISTS.find(h=>atPoint(P.x,P.z,h,10)&&target?.name.toLowerCase().includes(h.name.toLowerCase()));
  if(heist){handleRecon(heist.id);return;}
  const entrance=nearestEntrance(P.x,P.z,6);
  if(!P.car&&entrance){enterInterior(entrance);return;}
  const rival = foes.find(f=>f.kind==='gangster'&&!f.dead&&!f.mugged&&dist2(P.x,P.z,f.x,f.z)<2.5);
  if(!P.car&&rival){rival.mugged=true;rival.aggro=true;const pay=conditions(C.clock).night?125:100;C.dirty=Math.min(cashCap(C),C.dirty+pay);addHeat(C,8);feed(`Rival courier shaken down: +$${pay} dirty. Crew alerted!`);sfx('cash');saveGame();return;}
  const corner = BLOCKS.find(b => atPoint(P.x,P.z,b,14) && (!C.owned.includes(b.id) || C.defense?.block === b.id));
  if (!P.car && corner) { startBattle(corner.id); return; }
  if(P.car){exitCar();return;}
  let best: Vehicle | null = null;
  let bd = 4.5;
  for (const v of vehicles) {
    if (roadblock?.vehicle === v || (v.garage !== undefined && C.expansion.runs.some(r=>r.car===v.garage))) continue;
    const d = dist2(v.x, v.z, P.x, P.z);
    if (d < bd) { bd = d; best = v; }
  }
  if(best&&C.legacy.tutorial<2){feed('Meet Mama Nola and finish the rival encounter before driving.');return;}
  if (best) { P.car = best; sfx("door"); return; }
  if (dist2(P.x, P.z, HQ.x, HQ.z) < HQ.r) openShop();
}

function exitCar(){if(!P.car)return;
    const c = P.car;
    P.x = c.x + Math.cos(c.h) * 2.4;
    P.z = c.z - Math.sin(c.h) * 2.4;
    if (pushOut(P.x, P.z, 0.5).hit || !walkable(P.x, P.z)) { P.x = c.x - Math.cos(c.h) * 2.4; P.z = c.z + Math.sin(c.h) * 2.4; }
    P.car = null;
    c.speed = 0;
    sfx("door");
}
function handleRecon(id:string){const h=HEISTS.find(h=>h.id===id);if(!h)return;if(recon(C,id,P.x,P.z)){feed(`Recon complete: ${h.name}. Assemble the required crew, then choose Execution actions.`);target=null;selectedLocation=null;saveGame();empire.open('Heists');}else{const p=plan(C,id);feed(p.cooldown>0?`Heist cooldown: ${Math.ceil(p.cooldown)}s remaining.`:p.phase>0?'Recon already gathered. Continue Crew Assembly / Execution on the Heists board.':'Move closer to the marked approach.');empire.open('Heists');}}

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
  dmg*=coverReduction(coverStations.some(p=>dist2(P.x,P.z,p.x,p.z)<2.4),crouched&&!P.car);
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
  if(f.blockId?.startsWith('story:'))return;
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

const MAGAZINES = [12,30,6,24,5,6];
const ammo = [...MAGAZINES];
let reloading = 0;
let recoil = 0;
const walkVelocity = new THREE.Vector2();
function reloadWeapon() { if(P.car || reloading>0 || ammo[P.weapon] === MAGAZINES[P.weapon]) return; reloading=P.weapon===2?2.2:1.6; sfx('click'); }
function fire() {
  const w = WEAPONS[P.weapon]!;
  if (C.legacy.tutorial===0 || inside || reloading > 0 || time - P.lastFire < w.cd) return;
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
  const spread = w.spread * (aimHeld ? .4 : 1) * (crouched?.65:1) * (C.expansion.gear.includes("Crescent Precision Barrel") ? .75 : 1);
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
      damageFoe(r.foe, w.dmg * (C.legacy.trait==='enforcer'?1.15:C.legacy.trait==='accountant'?.9:1) * (1+C.expansion.weaponLevel*.08+(furnished(C,"locker")?.1:0)) * (r.head ? 2 : 1), true);
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
  if(coverStations.some(p=>Math.abs(nx-p.x)<1.5+r&&Math.abs(nz-p.z)<.5+r))return true;
  if (roadblock && dist2(nx, nz, roadblock.vehicle.x, roadblock.vehicle.z) < r + 2.2) return true;
  if(micro?.kind===0&&micro.t>0&&dist2(nx,nz,micro.x,micro.z)<r+1.5&&(!P.car||Math.abs(P.car.speed)<15))return true;
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
      if(streetLife.near(f.x,f.z)) {f.flee=Math.max(f.flee,1);}
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
    } else if (alive && (C.legacy.tutorial>=3 || f===tutorialRival)) {
      const sight = f.kind === "cop" ? conditions(C.clock).visibility : 1;
      const los = d < 60*sight && hasLOS(f.x, f.z, px, pz);
      if (!f.aggro && los && d < 40*sight) f.aggro = true;
      if (f.aggro && d > 90) f.aggro = f.kind === "cop";
      if (f.aggro) {
        f.heading = tacticalHeading(Math.atan2(px - f.x, pz - f.z),d,i,time);
        aiming = true;
        if (d > 13 || !los || (d>9&&Math.floor(time/3+i)%3===0)) moving = f.speed;
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
  const fwd = keys.has("KeyW") || keys.has("ArrowUp") || joystick.value.y>.08;
  const back = keys.has("KeyS") || keys.has("ArrowDown") || joystick.value.y<-.08;
  const brake = keys.has("Space");
  const left = keys.has("KeyA") || keys.has("ArrowLeft");
  const right = keys.has("KeyD") || keys.has("ArrowRight");
  boosting = updateReserve(P.boost, fwd && !brake && (keys.has("ShiftLeft") || keys.has("ShiftRight")), dt, 30*(1-.15*(C.legacy.mods[P.car?.garage??-1]?.nitro??0)), 12*(1+.1*Math.min(5,C.legacy.generation)));
  const stored = c.garage !== undefined ? C.expansion.cars[c.garage] : null;
  const model = stored ? VEHICLES.find(v=>v.id===stored.id)! : null;
  const performance = (model ? model.speed + stored!.engine*.1 : 1)*(C.legacy.trait==='driver'?1.15:1);
  if (boosting) c.speed += CAR_ACC[k]! * 1.3 * dt;
  if (fwd) c.speed += (c.speed < 0 ? CAR_ACC[k]! * 2.5 : CAR_ACC[k]!) * dt * (keys.has("KeyW")||keys.has("ArrowUp")?1:Math.min(1,joystick.value.y*C.legacy.sensitivity));
  else if (back) c.speed -= (c.speed > 0 ? CAR_ACC[k]! * 2.5 : CAR_ACC[k]! * 0.6) * dt * (keys.has("KeyS")||keys.has("ArrowDown")?1:Math.min(1,-joystick.value.y*C.legacy.sensitivity));
  else c.speed *= Math.exp(-0.5 * dt);
  if (brake) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 45 * dt);
  c.speed = Math.max(-9, Math.min(CAR_MAX[k]! * performance * (boosting ? 1.35 : 1), c.speed));
  const want = Math.max(-1,Math.min(1,(left ? 1 : 0) - (right ? 1 : 0) - joystick.value.x*C.legacy.sensitivity));
  c.steer += (want - c.steer) * Math.min(1, dt * 8);
  const handling = c.style===6?1.25:c.style===8||c.style===9?.7:1;
  const turn = Math.max(-1, Math.min(1, c.speed / 7)) * (1 - Math.min(0.6, Math.abs(c.speed) / 70));
  c.h += c.steer * 1.9 * handling * turn * dt;
  const hit = slide(c, Math.sin(c.h) * c.speed * dt, Math.cos(c.h) * c.speed * dt, c.style===6?.55:c.style===8||c.style===9?1.8:1.5);
  if (hit && Math.abs(c.speed) > 6) {
    if (Math.abs(c.speed) > 14) hurt(Math.abs(c.speed) * 0.4);
    c.speed *= -0.25;
    if(C.crew.some(m=>m.id==='mechanic'&&m.loyalty>=25&&!m.owed))P.hp=Math.min(MAX_HP,P.hp+2);
    shake=Math.max(shake,.65);addHeat(C,2);
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
  if(Math.abs(c.speed)>32)addHeat(C,dt*.25);
  P.x = c.x;
  P.z = c.z;
  player.root.scale.y=1;
  player.setVisible(c.style===6);
  if(c.style===6){player.root.position.set(c.x-Math.sin(c.h)*.15,.12,c.z-Math.cos(c.h)*.15);player.root.rotation.y=c.h;player.pose('ride',0,time,0,dt);}
}

function updateWalking(dt: number) {
  player.setVisible(true);
  player.root.scale.y=crouched?.78:1;
  sound.engine(null);
  const f = Math.max(-1,Math.min(1,(keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) - (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) + joystick.value.y*C.legacy.sensitivity));
  const s = Math.max(-1,Math.min(1,(keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0) + joystick.value.x*C.legacy.sensitivity));
  boosting = false;
  updateReserve(P.boost, false, dt, 30*(1-.15*(C.legacy.mods[P.car?.garage??-1]?.nitro??0)), 12*(1+.1*Math.min(5,C.legacy.generation)));
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
    moving = (crouched?2.6:run ? 8.2*(C.legacy.trait==='enforcer'?.85:1) : 5)*Math.min(1,Math.hypot(f,s));
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
  new THREE.RingGeometry(1.6,2.1,40),
  new THREE.MeshBasicMaterial({ color: 0x40f0ff, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }),
);
markerRing.rotation.x=-Math.PI/2;
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
  const expired=tickWork(C,dt);if(expired){target=null;feed(expired);}
  const work=workObjective(C);if(work)target={x:work.x,z:work.z,name:work.text};
  updateStoryCity(dt);
  updateTraining(dt);
  if(C.legacy.daily&&!C.legacy.daily.finished){C.legacy.daily.elapsed+=dt;const point=dailyRoute(C.legacy.daily.date)[C.legacy.daily.step];if(point)target={...point,name:'Daily speedrun checkpoint'};if(dailyCheckpoint(C,P.x,P.z)){target=null;selectedLocation=null;feed('Daily route complete! +$1,000 clean.');saveGame();}}
  milestoneRewards(C);
  updateMicroEvents(dt);
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
  const automatic=!!C.lifestyle.work||!!C.cityStories.active||!!C.expansion.mission||!!(C.legacy.daily&&!C.legacy.daily.finished)||C.legacy.tutorial<3||!!P.job;
  if(!automatic&&(previousAuto||target?.name.startsWith('Tutorial delivery')||target?.name.startsWith('First delivery'))){target=null;selectedLocation=null;}
  previousAuto=automatic;
  if(target){const p=approach(target);target.x=p.x;target.z=p.z;}
  // heal at HQ
  if (dist2(P.x, P.z, HQ.x, HQ.z) < HQ.r && P.hp < MAX_HP && P.deadT <= 0) P.hp = Math.min(MAX_HP, P.hp + 6 * dt);
  const j = P.job;
  markerRing.visible = !!j || !!target;
  if (!j && target) markerRing.position.set(approach(target).x,.09,approach(target).z);
  if (j) {
    j.t -= dt;
    markerRing.position.set(approach(j).x,.09,approach(j).z);

    (markerRing.material as THREE.MeshBasicMaterial).color.setHex(j.priority ? 0xffb347 : 0x40f0ff);
    if (atPoint(P.x,P.z,j,6)) {
      const bonus = deliveryBonus(j.pay, j.t, j.duration);
      C.dirty += Math.round((j.pay + bonus) * (1 + crewPayout()) * peakMultiplier(C.clock,C.heat));
      P.streak++;
      feed(`Delivery #${P.streak}: +$${j.pay} + $${bonus} speed bonus!`);
      sfx("cash");
      P.job = null;target=null;selectedLocation=null;saveGame();
    } else if (j.t <= 0) {
      P.streak = 0;
      failMission(C);
      feed("Too late. The buyer walked. Delivery streak reset.");
      sfx("deny");
      P.job = null;target=null;selectedLocation=null;saveGame();
    }
  }
  if (C.clean >= GOAL && !P.won && !C.expansion.completed.includes("millionKingpin")) {
    C.expansion.completed.push("millionKingpin");
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
  if (inside) {
    t=inside.z>5?'E / INTERACT: exit building':inside.z < -3.6 && Math.abs(inside.x)<3?'E / INTERACT: service desk':'Walk to the desk · Exit at the teal doorway';
  } else if (!P.car && P.deadT <= 0) {
    const corner = BLOCKS.find(b => atPoint(P.x,P.z,b,14) && (!C.owned.includes(b.id) || C.defense?.block === b.id));
    const work=workObjective(C);
    const cache=DISCOVERIES.find(d=>!C.cityStories.discovered.includes(d.id)&&atPoint(P.x,P.z,d,6));
    const storyContact=storyObjective(C);
    const entrance=nearestEntrance(P.x,P.z,6);
    if(work&&atPoint(P.x,P.z,work,7))t='E / INTERACT: work order';
    else if(storyContact&&C.cityStories.active?.step!==1&&atPoint(P.x,P.z,storyContact,8))t='E / INTERACT: story contact';
    else if(cache)t=`E / INTERACT: discover ${cache.name}`;
    else if(entrance)t=`E / INTERACT: enter ${entrance.name}`;
    else if(foes.some(f=>f.kind==='gangster'&&!f.dead&&!f.mugged&&dist2(P.x,P.z,f.x,f.z)<2.5))t='E: shake down rival courier (raises heat)';
    else if (corner && !battle) t = `E: ${C.defense?.block === corner.id ? 'defend' : 'fight for'} ${corner.name}`;
    else
    if (vehicles.some((v) => dist2(v.x, v.z, P.x, P.z) < 4.5)) t = "E: get in car";
    else if (dist2(P.x, P.z, HQ.x, HQ.z) < HQ.r) t = "E: open the back room";
  } else if (P.car) t = "E: get out";
  if(!inside&&target&&atPoint(P.x,P.z,target,10)){
    const heist=HEISTS.find(h=>atPoint(P.x,P.z,h,10)&&target!.name.toLowerCase().includes(h.name.toLowerCase()));
    const mission=C.expansion.mission?MISSIONS.find(m=>m.id===C.expansion.mission!.id):null;
    if(heist)t=`ARRIVED · E / INTERACT: ${plan(C,heist.id).phase===0?'gather recon':'continue heist planning'}`;
    else if(C.cityStories.active)t=C.cityStories.active.step===1?'ENCOUNTER: defeat remaining rivals, then return to Mama Nola':'ARRIVED · E / INTERACT: speak to story contact';
    else if(C.lifestyle.work)t='ARRIVED · E / INTERACT: collect or deliver work cargo';
    else if(mission)t=mission.id==='parade'&&C.expansion.mission?.step===4?`ESCORT: stay beside float (${Math.floor(C.expansion.mission.escort??0)}/40s), then E at finale`:'ARRIVED · E / INTERACT: advance mission';
    else if(C.legacy.tutorial===2)t=P.car?'DELIVERY: drive within the ground ring — auto-completes':'Driving lesson: enter the marked sedan with E, then drive to the drop';
    else if(C.legacy.tutorial===0)t='ARRIVED · E / INTERACT: meet Mama Nola';
    else if(selectedLocation)t=selectedLocation.instruction;
  }
  if(!inside&&P.job&&atPoint(P.x,P.z,P.job,8))t='IMPORT DELIVERY · drive/walk within 6m — completes automatically';
  $('arrivalHelp').textContent=t|| (target?`FOLLOW MARKER · ${selectedLocation?.instruction??'Reach the ground ring, then use E / INTERACT when prompted.'}`:'Use CITY MAP to choose a door, mission, job or heist.');
  $('contextAction').hidden=!t||!playing||managing||shopOpen;
  $('contextAction').textContent=inside?'INTERACT / EXIT':P.car?'INTERACT / GET OUT':'E · INTERACT';
  const el = $("prompt");
  el.textContent = t;
  el.style.display = t && playing && !managing && !shopOpen ? "block" : "none";
}

const balconyPosition = new THREE.Vector3(9,24,45);
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
function updateCamera(dt: number) {
  if(introActive){const shot=INTRO_SHOTS[introShot(introElapsed)]!;const p=shot.from;camera.position.lerp(new THREE.Vector3(p[0]+(matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(introElapsed*.3)*5),p[1],p[2]),1-Math.exp(-1.6*dt));camera.lookAt(shot.look[0],shot.look[1],shot.look[2]);camera.fov=58;camera.updateProjectionMatrix();return;}
  if(inside){camera.position.set(inside.x,5.2,Math.min(11,inside.z+6.5));camera.lookAt(inside.x,1,inside.z-2);camera.fov=65;camera.updateProjectionMatrix();return;}
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
      if(collected){C.expansion.pickupCount++;sfx('cash');saveGame();}
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
  if (!atPoint(P.x,P.z,block,14)) { target = { ...block }; feed('Travel to the marked corner to fight.'); return; }
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
  if (manual) void result.mirrored.then(mirrored => {const message=result.local && mirrored ? 'Game saved to localStorage and IndexedDB.' : result.local || mirrored ? 'Game saved to one storage copy; backup unavailable.' : 'Save failed: browser storage is unavailable.';feed(message);$('saveNotice').textContent=message;});
}
$('paradeView').onclick=()=>{
  if(C.expansion.mission?.id!=='parade')return;
  if(!balcony){balconyWasPlaying=playing;playing=false;balcony=true;keys.clear();mouseDown=aimHeld=false;document.exitPointerLock();$('start').style.display='none';$('hud').style.display='none';$('paradeView').textContent='RETURN TO PLAY';}
  else {balcony=false;$('hud').style.display='';playing=balconyWasPlaying;$('paradeView').textContent='PARADE BALCONY';if(playing)lock();else $('start').style.display='flex';}
};
let wasPlaying = false;
const empire = createEmpireUI({
  deploy(index) {
    if(inside?.def.id!=='garage' && dist2(P.x,P.z,HQ.x,HQ.z)>35) {feed('Return within 35m of Mama Nola’s garage to deploy a stored vehicle.');return;}
    const stored=C.expansion.cars[index]; if(!stored || C.expansion.runs.some(r=>r.car===index))return;
    if(P.car?.garage===index) {feed('Exit this vehicle before redeploying it.');return;}
    for(let i=vehicles.length-1;i>=0;i--)if(vehicles[i]!.garage===index){vehicles[i]!.rig.dispose();vehicles[i]!.rig.root.removeFromParent();vehicles.splice(i,1);}
    const model=VEHICLES.find(v=>v.id===stored.id)!;
    const gx=inside?.def.id==='garage'?-60:44,gz=inside?.def.id==='garage'?6:-8;
    const v=addVehicle(model.style,gx,gz,Math.PI/2,stored.color);v.garage=index;
    const style=C.lifestyle.carStyle[index];const disposeStyle=applyBodyStyle(v.rig.root,style);const originalDispose=v.rig.dispose;v.rig.dispose=()=>{disposeStyle();originalDispose();};
    const mods=C.legacy.mods[index];
    if(mods){
      const ownedResources:{dispose():void}[]=[];const disposeRig=v.rig.dispose;v.rig.dispose=()=>{ownedResources.forEach(r=>r.dispose());disposeRig();};
      if(mods.glow){const glow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,4.5),new THREE.MeshBasicMaterial({color:[0xa84dff,0x42ddde,0xe6b84b][style?.glowColor??0],transparent:true,opacity:.35,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.06;v.rig.root.add(glow);ownedResources.push(glow.geometry,glow.material);}
      v.rig.root.traverse(o=>{if(!(o instanceof THREE.Mesh)||!(o.material instanceof THREE.MeshStandardMaterial))return;const material=o.material.clone();ownedResources.push(material);if(mods.matte)material.roughness=1;if(mods.rims&&material.color.getHex()===0xc8ccd2)material.color.setHex([0xe7bd63,0xc8ccd2,0x16212a][style?.rimColor??0]!);o.material=material;});
    }
    feed(`${model.name} deployed at garage marker. E to enter.`);target={x:gx,z:gz,name:'Your garage vehicle'};
  },
  gearOwned: weapon => P.owned[weapon]===true,
  armory(weapon) {
    const prices=[0,2500,5000,6500,9000,12000];if(!WEAPONS[weapon]||(weapon===5&&!C.cityStories.revolver))return;
    if(!P.owned[weapon]){if(C.clean<prices[weapon]!)return;C.clean-=prices[weapon]!;P.owned[weapon]=true;}
    P.weapon=weapon;reloading=0;feed(`${WEAPONS[weapon]!.name} equipped.`);
  },
  missionStarted(){
    if(C.expansion.mission||C.lifestyle.work||C.cityStories.active)selectedLocation=null;
    if(inside)leaveInterior();
    if(introActive){introActive=false;$('cinematic').hidden=true;}
    startPlaying();saveGame();feed('Mission started — follow the white marker. E / INTERACT advances objectives.');
  },
  characterConfirmed(){needsCharacter=false;startPlaying();saveGame();},
  milestone(){milestoneRewards(C);const rewards=C.legacy.pending.splice(0);if(rewards.length){$('milestoneToast').textContent=rewards.join(' · ');$('milestoneToast').hidden=false;sfx('capture');setTimeout(()=>$('milestoneToast').hidden=true,6000);saveGame();}},
  travel(x,z){if(inside)leaveInterior();P.car=null;P.x=x;P.z=z;player.root.position.set(x,0,z);walkVelocity.set(0,0);saveGame();},
  repair(){if(C.clean>=50&&C.cooldown<=0){C.clean-=50;P.armor=50;C.cooldown=60;feed('Mechanic reinforced your armor.');saveGame();}},
  retire(){const inheritance=legacyInheritance(C);const next=newCampaign();next.legacy.generation=inheritance.generation;next.legacy.inherited=inheritance.inherited;next.clean+=inheritance.inherited;resetting=true;const result=store.save(next,{});void result.mirrored.then(()=>location.reload());},
  backRoom: openShop,
  buildings: () => INTERIORS.map(b=>({...b,...approach(b)})),
  trackLocation(location){selectedLocation=location;target={x:location.x,z:location.z,name:location.name};yaw=Math.atan2(location.x-P.x,location.z-P.z);feed(location.instruction);},
  enterBuilding(id) { const def=INTERIORS.find(b=>b.id===id);if(def)enterInterior(def); },
  campaign: C,
  pause(open) {
    if (open) { if(balcony){balcony=false;$('hud').style.display='';playing=balconyWasPlaying;$("paradeView").textContent="PARADE BALCONY";} wasPlaying = playing; managing = true; keys.clear(); joystick.reset(); lookDragging=false;mouseDown = aimHeld = false; document.exitPointerLock(); }
    else { managing = false; playing = wasPlaying; if (playing) { $('start').style.display = 'none'; lock(); } }
  },
  changed() { if(C.stats.cleaned>lastCleaned){lastCleaned=C.stats.cleaned;sfx('cash');$('cashBurst').classList.remove('animate');void $('cashBurst').offsetWidth;$('cashBurst').classList.add('animate');} if (battle?.defending && C.defense?.block !== battle.block) clearBattle(); for (const a of unlock(C)) feed(`Achievement: ${a}`); updateHud(); saveGame(); sfx('click'); },
  notice: feed, location: () => ({ x: inside?.def.x ?? P.x, z: inside?.def.z ?? P.z, district: districtAt(inside?.def.x ?? P.x, inside?.def.z ?? P.z) }),
  attack: startBattle,
  waypoint(x, z, name) {const p=approach({x,z}); target = { ...p, name };selectedLocation=mapLocations().find(r=>r.name===name)??null; yaw=Math.atan2(x-P.x,z-P.z); feed(`Route marked: ${name}. White dot on minimap.`); },
  appearance() {
    if(inside){inside.room.avatar.dispose();inside.room.avatar=createPerson("player",5,C.avatar,C.lifestyle);inside.room.scene.add(inside.room.avatar.root);}
    player.root.removeFromParent(); player.dispose(); player = createPerson('player', 5, C.avatar,C.lifestyle);
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
    saveGame(); hiddenSince = Date.now(); keys.clear(); joystick.reset(); lookDragging=false;mouseDown = aimHeld = false;
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
    else if(code==='cover')crouched=!crouched;
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
  yaw -= (e.clientX - touchLook.x) * .004*C.lifestyle.lookSensitivity; pitch = Math.max(-.7, Math.min(.45, pitch - (e.clientY - touchLook.y) * .004*C.lifestyle.lookSensitivity*(C.lifestyle.invertLook?-1:1)));
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

// Interiors are safe, instanced visits: outdoor combat/economy pauses, and saves retain your street position.
function enterInterior(def:InteriorDefinition){
  if(inside||P.car||P.deadT>0){feed('Exit your vehicle and finish respawning before entering.');return;}
  // HQ back-room entrance includes its sheltered approach; all other doors require standing close.
  if(!atPoint(P.x,P.z,def,def.id==='hq'?24:6)){target={...approach(def),name:`Entrance: ${def.name}`};feed('Travel to the building entrance first.');return;}
  balcony=false;$("hud").style.display="";
  inside={room:createInterior(def,C.avatar,C.lifestyle,C.expansion.furniture),def,x:0,z:5.8};
  joystick.reset();keys.clear();mouseDown=aimHeld=false;walkVelocity.set(0,0);sound.engine(null);sound.siren(false);
  target=null;selectedLocation=null;$('exitInterior').hidden=false;$('insideLabel').textContent=def.name;
  feed(`Entered ${def.name}. Walk to the desk for ${def.tab}, or E at the exit. Outdoor simulation paused.`);
}
function leaveInterior(){if(!inside)return;inside.room.dispose();inside=null;renderPass.scene=scene;joystick.reset();keys.clear();mouseDown=aimHeld=false;$('exitInterior').hidden=true;$('insideLabel').textContent='';feed('Back on the street.');}
$('exitInterior').onclick=leaveInterior;
$('contextAction').onclick=interact;
$('clearWaypoint').onclick=()=>{selectedLocation=null;target=null;feed('Manual route cleared. Active mission objectives remain tracked.');};
function interiorInteract(){if(!inside)return;if(inside.z>5){leaveInterior();return;}if(inside.z<-3.6&&Math.abs(inside.x)<3){empire.open(inside.def.tab);return;}feed('Walk to the back service desk, or return to the teal exit.');}
function updateIndoor(dt:number){
  if(!inside)return;
  const dx=Math.max(-1,Math.min(1,(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystick.value.x));
  const forward=Math.max(-1,Math.min(1,(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+joystick.value.y));
  const magnitude=Math.max(1,Math.hypot(dx,forward));
  const next=indoorMove(inside.x,inside.z,dx/magnitude*4*dt,-forward/magnitude*4*dt,inside.room.obstacles);
  const speed=Math.hypot(next.x-inside.x,next.z-inside.z)/Math.max(dt,.001);
  if(speed>.1)inside.room.avatar.root.rotation.y=Math.atan2(next.x-inside.x,next.z-inside.z);
  inside.x=next.x;inside.z=next.z;inside.room.avatar.root.position.set(next.x,0,next.z);
  inside.room.avatar.pose(speed>.1?'walk':'idle',speed,performance.now()/1000,0,dt);
}

function spawnStoryEncounter(){
 const a=C.cityStories.active;if(!a||a.step!==1)return;
 const def=STORIES.find(m=>m.id===a.id)!;
 if(foes.some(f=>!f.dead&&f.blockId===`story:${a.id}`)){storySpawned=true;return;}
 const count=a.id==='crown'?3:2;
 for(let i=0;i<count;i++){const [x,z]=freeSpot(def.x+(i-1)*4,def.z+8,5);const f=spawnFoe(i===0?'boss':'gangster',x,z,0);f.blockId=`story:${a.id}`;f.hp=i===0?(a.id==='crown'?220:140):65;f.aggro=true;}
 storySpawned=true;
}
function updateStoryCity(dt:number){
 const a=C.cityStories.active;
 if(a){if(a.step===1&&!storySpawned)spawnStoryEncounter();
 if(a.step===1&&storySpawned&&!foes.some(f=>!f.dead&&f.blockId===`story:${a.id}`)){a.step=2;storySpawned=false;feed('Rival encounter won. Return to Mama Nola with the evidence.');saveGame();}
 const objective=storyObjective(C);if(objective)target={x:objective.x,z:objective.z,name:objective.text};}
 DISCOVERIES.forEach((d,i)=>{discoveryMeshes[i]!.visible=!C.cityStories.discovered.includes(d.id);discoveryMeshes[i]!.rotation.y=time*.7;});
 streetLife.update(dt,time,P.x,P.z,C.heat,C.legacy.tutorial>=3,Cspeed=>{C.cityStories.trafficHits++;if(P.car){P.car.speed*=.65;hurt(Cspeed*.25);addHeat(C,2);}else hurt(4);shake=.3;});
 if(P.car&&streetLife.near(P.x,P.z))P.car.speed*=Math.exp(-dt*3);
}

// Staged onboarding teaches one mechanic at a time, without paying for idling.
let micro:null|{kind:number;x:number;z:number;t:number;mesh:THREE.Mesh}=null;
function updateTraining(dt:number){
 const stage=C.legacy.tutorial;
 if(stage===0&&!selectedLocation){target={x:HQ.x,z:HQ.z,name:'➜ Mama Nola — walk here, then E'};}
 if(stage===1&&!tutorialRival){const [x,z]=freeSpot(10,12,3);tutorialRival=spawnFoe('gangster',x,z,0);tutorialRival.blockId='tutorial';tutorialRival.aggro=true;}
 if(stage===1&&tutorialRival?.dead){
  advanceTutorial(C,1);tutorialCar=addVehicle(0,12,0,Math.PI/2,0xc79a44);target={x:12,z:0,name:'First delivery sedan · E to enter'};
  feed('Driving unlocked. Take the marked sedan to the nearby drop at x=0, z=60.');saveGame();
 }
 if(stage===2){if(!tutorialCar)tutorialCar=addVehicle(0,12,0,Math.PI/2,0xc79a44);
  if(P.car){target={x:0,z:60,name:'Tutorial delivery drop'};if(atPoint(P.x,P.z,{x:0,z:60},8)){advanceTutorial(C,2);C.dirty+=250;target=null;selectedLocation=null;feed('Tutorial complete! +$250 dirty. Launder cash and capture turf to grow your empire.');saveGame();}}
 }
 C.legacy.lieutenantClock+=dt;
 if(C.legacy.lieutenantClock>60){C.legacy.lieutenantClock=0;if(C.defense&&C.crew.some(m=>m.id==='muscle'&&m.loyalty>=25&&!m.owed)){const success=Math.random()<.6;if(success){resolveDefense(C,true);feed('Your Enforcer automatically held the corner.');saveGame();}}}
}
function updateMicroEvents(dt:number){
 checkpointNotice=Math.max(0,checkpointNotice-dt);
 C.legacy.microClock+=dt;
 if(micro){micro.t-=dt;if(micro.t<=0){micro.mesh.removeFromParent();micro.mesh.geometry.dispose();(micro.mesh.material as THREE.Material).dispose();micro=null;}
 else if(micro.kind===0&&dist2(P.x,P.z,micro.x,micro.z)<4){if(checkpointNotice===0){checkpointNotice=4;feed('Checkpoint: E for a $100 dirty bribe, detour, or drive through at speed (heat +15).');}if(P.car&&Math.abs(P.car.speed)>15){addHeat(C,15);shake=.7;micro.t=0;}}
 else if(micro.kind===2&&dist2(P.x,P.z,micro.x,micro.z)<2){if(P.car){addHeat(C,3);P.car.speed*=.7;}else walkVelocity.multiplyScalar(.7);}}
 if(!micro&&C.legacy.microClock>55&&C.legacy.tutorial>=3){C.legacy.microClock=0;const [x,z]=freeSpot(P.x+Math.sin(yaw)*22,P.z+Math.cos(yaw)*22,8);const kind=Math.floor(Math.random()*3);
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(kind===0?5:1.2,1.2,.7),new THREE.MeshStandardMaterial({color:kind===0?0x4466cc:kind===1?0xaa3344:0xd4a840}));mesh.position.set(x,.6,z);scene.add(mesh);micro={kind,x,z,t:35,mesh};
 if(kind===1&&P.job){for(let i=0;i<2;i++){const rival=spawnFoe('gangster',x+i*2,z,0);rival.aggro=true;rival.blockId='ambush';}feed('Shipment ambush! Rival couriers spotted your delivery.');}else feed(kind===0?'Police checkpoint ahead — dirty-cash bribe or detour.':'Street performer ahead — maneuver carefully.');}
 if(C.legacy.lastHeat>=30&&C.heat<30){C.legacy.copsOutrun++;saveGame();}C.legacy.lastHeat=C.heat;
 effectClock-=dt;if(effectClock<=0){effectClock=.12;if(boosting&&P.car){tireSmoke.burst(P.x-Math.sin(P.car.h)*2,.2,P.z-Math.cos(P.car.h)*2);sound.nitro();}}
}
function pauseRun(){playing=false;keys.clear();joystick.reset();mouseDown=aimHeld=false;$('pauseMenu').hidden=false;locked=false;document.exitPointerLock();}
$('endLegacy').onclick=()=>{$('end').style.display='none';empire.open('Legacy & Training');};
$('pauseButton').onclick=pauseRun;$('resumeRun').onclick=startPlaying;$('pauseSave').onclick=()=>saveGame(true);
$('exportSave').onclick=()=>{saveGame();const code=encodeSave(C,snapshotPlayer());$<HTMLTextAreaElement>('importCode').value=code;$('saveNotice').textContent='Copy this code to your other device. Keep it private: it contains your alias and progress.';};
$('importSave').onclick=()=>{const save=decodeSave($<HTMLTextAreaElement>('importCode').value.trim());if(!save){$('saveNotice').textContent='Invalid or unsupported save code. Current progress unchanged.';return;}if(!confirm('Replace this device’s current run with this save?'))return;resetting=true;const result=store.save(save.campaign,save.player);void result.mirrored.then(ok=>{if(ok||result.local)location.reload();else{resetting=false;$('saveNotice').textContent='Import failed: storage unavailable.';}});};

// ───────── main loop ─────────
const clock = new THREE.Clock();
let hudT = 0;
let miniT = 0;
function frame() {
  requestAnimationFrame(frame);
  const menuObscuresControls = !$('pauseMenu').hidden || introActive || managing || shopOpen || $("start").style.display !== "none";
  toolbar.classList.toggle("menu-obscured", menuObscuresControls);
  $("touchControls").classList.toggle("menu-obscured", menuObscuresControls);
  const dt = Math.min(0.05, clock.getDelta());
  if(introActive&&!document.hidden){
    introElapsed+=dt;
    const shot=INTRO_SHOTS[introShot(introElapsed)]!;
    $('introTitle').textContent=shot.title;$('introCaption').textContent=shot.text;
    if(introElapsed>=12)finishIntro();
  }
  if(inside && playing && !shopOpen && !managing && !document.hidden){updateIndoor(dt);prompt();updateHud();}
  else if (playing && !shopOpen && !managing && !P.won && !document.hidden) {
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
    impacts.update(dt);tireSmoke.update(dt);
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
  sound.intensity(playing&&!managing&&!inside&&(boosting||C.heat>=30),conditions(C.clock).night);
  updateCamera(dt);
  if(shake>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches){shake=Math.max(0,shake-dt*2);camera.position.x+=(Math.random()-.5)*shake*.2;camera.position.y+=(Math.random()-.5)*shake*.1;}
  if(inside){renderPass.scene=inside.room.scene;if(quality.value!=="performance")composer.render();else renderer.render(inside.room.scene,camera);return;}
  renderPass.scene=scene;
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
