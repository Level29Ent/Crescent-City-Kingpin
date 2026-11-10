// Crescent City Kingpin: standalone single-player game. Plain three.js, no engine, no server.
import * as THREE from "three";
import {
  BUSINESSES, CAR_ACC, CAR_MAX, DISTRICTS, DROPS, HQ, MAX_LEVEL, PARKED_CARS, SHOP, SPAWN, WEAPONS, BUILDINGS,
  GOAL, MAX_HP, RESPAWN_SECONDS, castWorld, pushOut, walkable, type SfxName,
} from "./world.ts";
import { carColors, createCar, createPerson, loadCarModels, type Car, type Person, type PersonKind } from "./actors.ts";
import { createScenery } from "./scenery.ts";
import { createSound } from "./audio.ts";

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
const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
};
window.addEventListener("resize", resize);
resize();

const abort = new AbortController();
const sound = createSound(abort.signal);
const scenery = createScenery(scene);

// ───────── game state ─────────
type Foe = {
  kind: PersonKind; person: Person; x: number; z: number; heading: number; hp: number; district: number;
  cd: number; aggro: boolean; dead: number; wx: number; wz: number; wt: number; flee: number; speed: number;
};
type Vehicle = { rig: Car; style: number; x: number; z: number; h: number; speed: number; steer: number };

const P = {
  x: SPAWN.x, z: SPAWN.z, heading: SPAWN.heading, hp: MAX_HP, armor: 0, cash: 300, heat: 0, heatT: 0,
  weapon: 0, owned: [true, false, false], level: 0, lastFire: -10, deadT: 0, car: null as Vehicle | null,
  captured: new Set<number>([0]), kills: new Map<number, number>(), bossOut: new Set<number>(),
  job: null as null | { name: string; x: number; z: number; t: number; pay: number }, won: false, income: 0,
};
let yaw = SPAWN.heading;
let pitch = -0.15;
let time = 0;
let playing = false;
let shopOpen = false;

const player = createPerson("player", 5);
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

// Rival gangs wait in their districts.
for (const d of DISTRICTS) {
  for (let i = 0; i < d.need; i++) {
    const [x, z] = freeSpot(d.x, d.z, 38);
    spawnFoe("gangster", x, z, d.id);
  }
}
for (let i = 0; i < 18; i++) {
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

function incomeRate(): number {
  let s = 0;
  for (const b of BUSINESSES) if (P.captured.has(b.district)) s += b.income;
  return s * (1 + 0.25 * P.level);
}

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
  mg.restore();
  mg.fillStyle = "#fff";
  mg.beginPath();
  mg.arc(90, 90, 4, 0, 6.3);
  mg.fill();
}

function updateHud() {
  $("cash").textContent = `$${Math.floor(P.cash).toLocaleString()}`;
  $("goal").textContent = `Goal $${GOAL.toLocaleString()} · income $${incomeRate().toFixed(0)}/s`;
  ($("hp").firstElementChild as HTMLElement).style.width = `${Math.max(0, P.hp)}%`;
  ($("armor").firstElementChild as HTMLElement).style.width = `${P.armor * 2}%`;
  $("heat").textContent = P.heat > 0 ? "★".repeat(P.heat) + "☆".repeat(5 - P.heat) : "";
  $("weapon").textContent = P.car ? "Driving" : `${WEAPONS[P.weapon]!.name}`;
  // objective line
  let obj = "";
  if (P.job) obj = `Delivery to ${P.job.name} · ${Math.max(0, Math.ceil(P.job.t))}s · $${P.job.pay}`;
  else {
    const open = DISTRICTS.find((d) => d.id !== 0 && !P.captured.has(d.id));
    if (open) {
      const left = foes.filter((f) => f.district === open.id && f.kind === "gangster" && !f.dead).length;
      obj = P.bossOut.has(open.id) ? `Take down ${open.boss} in ${open.name}!` : `Clear the ${open.gang} in ${open.name}: ${left} left`;
    }
  }
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
  keys.add(e.code);
  if (!playing || shopOpen) return;
  if (e.code === "KeyE") interact();
  if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") {
    const w = Number(e.code.slice(-1)) - 1;
    if (P.owned[w]) P.weapon = w;
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("mousedown", (e) => {
  if (!playing) return;
  if (e.button === 0) mouseDown = true;
  if (e.button === 2) aimHeld = true;
});
addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseDown = false;
  if (e.button === 2) aimHeld = false;
});
addEventListener("contextmenu", (e) => e.preventDefault());
addEventListener("mousemove", (e) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.0024;
  pitch = Math.max(-0.7, Math.min(0.45, pitch - e.movementY * 0.0022));
});
addEventListener("wheel", (e) => { camDist = Math.max(3.5, Math.min(12, camDist + Math.sign(e.deltaY) * 0.6)); });
let camDist = 6;

function lock() {
  void renderer.domElement.requestPointerLock?.();
}
$("go").addEventListener("click", () => {
  sound.start();
  $("start").style.display = "none";
  playing = true;
  lock();
});
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement !== renderer.domElement && playing && !shopOpen && !P.won) {
    $("go").textContent = "RESUME";
    $("start").style.display = "flex";
    playing = false;
  }
});

// ───────── shop ─────────
function crime(n: number) {
  if (n <= 0) return;
  if (P.heat === 0) sfx("wanted");
  P.heat = Math.min(5, Math.max(P.heat, P.heat + n));
  P.heatT = 0;
}

function buy(id: number) {
  const it = SHOP[id]!;
  if (P.cash < it.price) return sfx("deny");
  if (id === 0) { if (P.owned[1]) return sfx("deny"); P.owned[1] = true; P.weapon = 1; }
  else if (id === 1) { if (P.owned[2]) return sfx("deny"); P.owned[2] = true; P.weapon = 2; }
  else if (id === 2) P.armor = 50;
  else if (id === 3) addVehicle(2, 44, -8, Math.PI / 2, 0xc0392b);
  else if (id === 4) { if (P.level >= MAX_LEVEL) return sfx("deny"); P.level++; }
  else if (id === 5) P.hp = MAX_HP;
  P.cash -= it.price;
  sfx("buy");
  feed(`Bought: ${it.name}`);
  renderShop();
}

function startJob() {
  if (P.job) return;
  const d = DROPS[Math.floor(Math.random() * DROPS.length)]!;
  const len = dist2(HQ.x, HQ.z, d.x, d.z);
  P.job = { name: d.name, x: d.x, z: d.z, t: 30 + len / 9, pay: Math.round(500 + len * 6) };
  feed(`Import job: take the crates to ${d.name}.`);
  sfx("job");
  closeShop();
}

function renderShop() {
  const panel = $("shop").firstElementChild as HTMLElement;
  panel.innerHTML = `<h2 style="margin-top:0;color:#ffb347">Mama Nola's Back Room</h2><div>Cash: <b>$${Math.floor(P.cash).toLocaleString()}</b></div>`;
  for (const it of SHOP) {
    const row = document.createElement("div");
    row.className = "row";
    const taken = (it.id === 0 && P.owned[1]) || (it.id === 1 && P.owned[2]) || (it.id === 4 && P.level >= MAX_LEVEL);
    row.innerHTML = `<span>${it.name}${it.id === 4 ? ` (${P.level}/${MAX_LEVEL})` : ""}<small>${it.desc}</small></span>`;
    const b = document.createElement("button");
    b.textContent = taken ? "Owned" : `$${it.price.toLocaleString()}`;
    b.disabled = taken || P.cash < it.price;
    b.onclick = () => buy(it.id);
    row.appendChild(b);
    panel.appendChild(row);
  }
  const row = document.createElement("div");
  row.className = "row";
  const jb = document.createElement("button");
  jb.textContent = P.job ? "Job running" : "Take an import job";
  jb.disabled = !!P.job;
  jb.onclick = startJob;
  const cb = document.createElement("button");
  cb.textContent = "Close";
  cb.onclick = closeShop;
  row.append(jb, cb);
  panel.appendChild(row);
}
function openShop() {
  shopOpen = true;
  document.exitPointerLock();
  renderShop();
  $("shop").style.display = "flex";
  sfx("door");
}
function closeShop() {
  shopOpen = false;
  $("shop").style.display = "none";
  lock();
}

// ───────── interaction ─────────
function interact() {
  if (P.deadT > 0) return;
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
  tracers.push({ line, t: 0.08 });
}
const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _e = new THREE.Vector3();
let hitFlash = 0;

function hurt(dmg: number) {
  if (P.deadT > 0 || P.won) return;
  const soak = Math.min(P.armor, dmg * 0.6);
  P.armor -= soak;
  P.hp -= dmg - soak;
  $("hurt").style.opacity = "1";
  setTimeout(() => ($("hurt").style.opacity = "0"), 120);
  sfx("hurt", 0.6);
  if (P.hp <= 0) {
    P.hp = 0;
    P.deadT = RESPAWN_SECONDS;
    P.car = null;
    P.cash = Math.floor(P.cash * 0.9);
    P.heat = 0;
    P.job = null;
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
  if (f.kind === "cop") { crime(1); P.cash += 100; }
  if (f.kind === "gangster") {
    P.cash += 150;
    const d = DISTRICTS[f.district]!;
    const left = foes.filter((o) => o.district === f.district && o.kind === "gangster" && !o.dead).length;
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
    P.cash += 3000;
    feed(`${d.name} is yours! +$3,000 and new income.`);
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

function fire() {
  const w = WEAPONS[P.weapon]!;
  if (time - P.lastFire < w.cd) return;
  P.lastFire = time;
  sfx(P.weapon === 0 ? "pistol" : P.weapon === 1 ? "smg" : "shotgun");
  // aim point from the camera's centre ray
  camera.getWorldDirection(_d);
  const cw = castWorld(camera.position.x, camera.position.y, camera.position.z, _d.x, _d.y, _d.z, 120);
  _e.copy(camera.position).addScaledVector(_d, Math.min(cw, 120));
  _o.set(P.x, 1.45, P.z);
  player.root.updateMatrixWorld(true);
  player.muzzle(_o);
  const base = new THREE.Vector3().subVectors(_e, _o).normalize();
  for (let i = 0; i < w.pellets; i++) {
    const dir = base.clone();
    dir.x += rnd(-w.spread, w.spread);
    dir.y += rnd(-w.spread, w.spread);
    dir.z += rnd(-w.spread, w.spread);
    dir.normalize();
    const r = rayHit(_o.x, _o.y, _o.z, dir.x, dir.y, dir.z, w.range);
    tracer(_o.clone(), _o.clone().addScaledVector(dir, r.t), 0xffe9a0);
    if (r.foe) {
      damageFoe(r.foe, w.dmg * (r.head ? 2 : 1), true);
      hitFlash = 0.12;
      sfx(r.head ? "headshot" : "hit", 0.6);
    }
  }
  if (P.weapon > 0) crimeNoise();
  player.flash(1);
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
      const los = d < 60 && hasLOS(f.x, f.z, px, pz);
      if (!f.aggro && los && d < 40) f.aggro = true;
      if (f.aggro && d > 90) f.aggro = f.kind === "cop";
      if (f.aggro) {
        f.heading = Math.atan2(px - f.x, pz - f.z);
        aiming = true;
        if (d > 13 || !los) moving = f.speed;
        f.cd -= dt;
        if (f.cd <= 0 && los && d < 42) {
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
  // heat cools off while cops are far away
  if (P.heat > 0) {
    P.heatT += dt * (copsNear ? 0.15 : 1);
    if (P.heatT > 18) { P.heat--; P.heatT = 0; if (P.heat === 0) feed("The heat is off."); }
  }
  sound.siren(P.heat > 0 && copsNear);
}

function updateDriving(dt: number) {
  const c = P.car!;
  const k = c.style === 2 ? 2 : 1;
  const fwd = keys.has("KeyW") || keys.has("ArrowUp");
  const back = keys.has("KeyS") || keys.has("ArrowDown");
  const brake = keys.has("Space");
  const left = keys.has("KeyA") || keys.has("ArrowLeft");
  const right = keys.has("KeyD") || keys.has("ArrowRight");
  if (fwd) c.speed += (c.speed < 0 ? CAR_ACC[k]! * 2.5 : CAR_ACC[k]!) * dt;
  else if (back) c.speed -= (c.speed > 0 ? CAR_ACC[k]! * 2.5 : CAR_ACC[k]! * 0.6) * dt;
  else c.speed *= Math.exp(-0.5 * dt);
  if (brake) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 45 * dt);
  c.speed = Math.max(-9, Math.min(CAR_MAX[k]!, c.speed));
  const want = (left ? 1 : 0) - (right ? 1 : 0);
  c.steer += (want - c.steer) * Math.min(1, dt * 8);
  const turn = Math.max(-1, Math.min(1, c.speed / 7)) * (1 - Math.min(0.6, Math.abs(c.speed) / 70));
  c.h += c.steer * 1.9 * turn * dt;
  const hit = slide(c, Math.sin(c.h) * c.speed * dt, Math.cos(c.h) * c.speed * dt, 1.5);
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
  player.setVisible(false);
}

function updateWalking(dt: number) {
  player.setVisible(true);
  sound.engine(null);
  const f = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
  const s = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
  const run = keys.has("ShiftLeft") || keys.has("ShiftRight");
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
    slide(P, dx * moving * dt, dz * moving * dt, 0.5);
    if (!shooting) {
      const target = Math.atan2(dx, dz);
      let diff = target - P.heading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      P.heading += diff * Math.min(1, dt * 14);
    }
  }
  if (shooting) P.heading = yaw;
  player.root.position.set(P.x, 0, P.z);
  player.root.rotation.y = P.heading;
  player.pose(shooting ? "aim" : moving > 6 ? "run" : moving > 0 ? "walk" : "idle", moving, time, P.weapon, dt);
  if (mouseDown && playing) fire();
}

const markerRing = new THREE.Mesh(
  new THREE.CylinderGeometry(3, 3, 80, 24, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x40f0ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
);
markerRing.visible = false;
scene.add(markerRing);

function updateEconomy(dt: number) {
  P.income += incomeRate() * dt;
  if (P.income >= 1) {
    const n = Math.floor(P.income);
    P.income -= n;
    P.cash += n;
  }
  // heal at HQ
  if (dist2(P.x, P.z, HQ.x, HQ.z) < HQ.r && P.hp < MAX_HP && P.deadT <= 0) P.hp = Math.min(MAX_HP, P.hp + 6 * dt);
  const j = P.job;
  markerRing.visible = !!j;
  if (j) {
    j.t -= dt;
    markerRing.position.set(j.x, 40, j.z);
    if (dist2(P.x, P.z, j.x, j.z) < 6) {
      P.cash += j.pay;
      feed(`Delivery done: +$${j.pay}`);
      sfx("cash");
      P.job = null;
    } else if (j.t <= 0) {
      feed("Too late. The buyer walked.");
      sfx("deny");
      P.job = null;
    }
  }
  if (P.cash >= GOAL && !P.won) {
    P.won = true;
    document.exitPointerLock();
    $("endTitle").textContent = "KINGPIN OF NEW ORLEANS";
    $("endText").textContent = `You reached $${GOAL.toLocaleString()}. The whole city is yours.`;
    $("end").style.display = "flex";
    sfx("capture");
  }
}
function prompt() {
  let t = "";
  if (!P.car && P.deadT <= 0) {
    if (vehicles.some((v) => dist2(v.x, v.z, P.x, P.z) < 4.5)) t = "E: get in car";
    else if (dist2(P.x, P.z, HQ.x, HQ.z) < HQ.r) t = "E: open the back room";
  } else if (P.car) t = "E: get out";
  const el = $("prompt");
  el.textContent = t;
  el.style.display = t && playing ? "block" : "none";
}

const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3();
function updateCamera(dt: number) {
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
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  const targetFov = driving ? 68 + Math.min(14, Math.abs(P.car!.speed) * 0.4) : aimHeld ? 52 : 62;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 5);
  camera.updateProjectionMatrix();
}

// ───────── main loop ─────────
const clock = new THREE.Clock();
let hudT = 0;
let miniT = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (playing || shopOpen) {
    time += dt;
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
  updateCamera(dt);
  scenery.update(time, P.x, P.z);
  renderer.render(scene, camera);
}

feed("Welcome to New Orleans. Walk to the gold ring at Mama Nola's.");
frame();
