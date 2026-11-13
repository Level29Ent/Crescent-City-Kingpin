import * as THREE from "three";
import type {Lifestyle} from './lifestyle.ts';
import type { Appearance } from "./campaign.ts";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneModel } from "three/addons/utils/SkeletonUtils.js";

export type PersonKind = "player" | "gangster" | "civilian" | "cop" | "boss";
export type PersonMode = "idle" | "walk" | "run" | "aim" | "ride" | "down";
export type Person = {
  root: THREE.Group;
  pose(mode: PersonMode, speed: number, time: number, weapon: number, dt: number): void;
  muzzle(out: THREE.Vector3): THREE.Vector3;
  flash(v: number): void;
  setVisible(v: boolean): void;
  dispose(): void;
};
export type Car = {
  root: THREE.Group;
  motion(speed: number, steer: number, braking: boolean, time: number): void;
  driverSeat: THREE.Vector3;
  dispose(): void;
};

// ---------- shared caches ----------
const geos = new Map<string, THREE.BufferGeometry>();
const mats = new Map<string, THREE.Material>();
function geo(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geos.get(key);
  if (!g) { g = make(); geos.set(key, g); }
  return g;
}
const box = () => geo("box", () => new THREE.BoxGeometry(1, 1, 1));
const cyl = () => geo("cyl", () => new THREE.CylinderGeometry(0.5, 0.5, 1, 12));
const sph = () => geo("sph", () => new THREE.SphereGeometry(0.5, 10, 8));
const cone = () => geo("cone", () => { const g = new THREE.ConeGeometry(0.5, 1, 6); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.5); return g; });
function lam(c: number): THREE.MeshStandardMaterial {
  const k = "l" + c;
  let m = mats.get(k) as THREE.MeshStandardMaterial | undefined;
  if (!m) { m = new THREE.MeshStandardMaterial({ color: c }); mats.set(k, m); }
  return m;
}
function emi(c: number, i: number): THREE.MeshStandardMaterial {
  const k = "e" + c + "_" + i;
  let m = mats.get(k) as THREE.MeshStandardMaterial | undefined;
  if (!m) { m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i }); mats.set(k, m); }
  return m;
}
function part(g: THREE.BufferGeometry, m: THREE.Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, parent?: THREE.Object3D): THREE.Mesh {
  const me = new THREE.Mesh(g, m);
  me.scale.set(sx, sy, sz);
  me.position.set(x, y, z);
  if (parent) parent.add(me);
  return me;
}
export function disposeShared(): void {
  for (const g of geos.values()) g.dispose();
  for (const m of mats.values()) {if(m instanceof THREE.MeshStandardMaterial)m.map?.dispose();m.dispose();}
  geos.clear(); mats.clear();
}

function rng(seed: number) {
  let s = (seed * 2654435761 + 12345) >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
const pick = <T,>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length) % a.length]!;

const SKIN = [0xf1c8a0, 0xe0ac7c, 0xc58c5b, 0x9b6a45, 0x75472c, 0x4f3020];
const HAIR = [0x161210, 0x2b1b10, 0x4a2c16, 0x8a5a2a, 0xc9a24a, 0x6b6b6b];
const GANG = [0xd62828, 0x2a6fdb, 0x7a2fbf, 0xf77f00, 0x1d9a6c, 0x222222, 0xe0e0e0];
const CIV = [0xff6b6b, 0x4ecdc4, 0xffd166, 0x9b5de5, 0xf15bb5, 0x00bbf9, 0xfee440, 0x80ed99];
const BEADS = [0x7b2cbf, 0x2d9d4a, 0xe8b923];

// ---------- people ----------
type Gun = { g: THREE.Group; tip: THREE.Object3D; len: number; two: boolean };

function policeLabel(text:string):THREE.MeshStandardMaterial{
 const key='police-label-'+text;const cached=mats.get(key);if(cached)return cached as THREE.MeshStandardMaterial;
 if(typeof document==='undefined')return lam(0xf5f1db);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const g=canvas.getContext('2d')!;
 g.fillStyle='#f5f3e7';g.fillRect(0,0,512,128);g.fillStyle='#10213e';g.textAlign='center';g.font='bold 78px sans-serif';g.fillText(text,256,93,490);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshStandardMaterial({map:texture,roughness:.8,side:THREE.DoubleSide});mats.set(key,material);return material;
}
function buildGun(w: number): Gun {
  const g = new THREE.Group();
  g.name=`weapon-${w}`;
  const metal = lam(0x25262b), wood = lam(0x7a4a24);
  const tip = new THREE.Object3D();
  let len = 0.3;
  if (w === 0) {
    part(box(), metal, 0.05, 0.07, 0.24, 0, 0.02, 0.1, g);
    part(box(), wood, 0.05, 0.12, 0.06, 0, -0.05, 0.03, g);
    len = 0.23;
  } else if (w === 1) {
    part(box(), metal, 0.06, 0.1, 0.4, 0, 0.02, 0.18, g);
    part(box(), metal, 0.04, 0.16, 0.05, 0, -0.1, 0.22, g);
    part(box(), wood, 0.05, 0.1, 0.05, 0, -0.06, 0.03, g);
    len = 0.42;
  } else {
    part(box(), metal, 0.05, 0.06, 0.62, 0, 0.03, 0.3, g);
    part(box(), wood, 0.07, 0.09, 0.3, 0, 0.0, 0.04, g);
    len = 0.63;
  }
  tip.position.set(0, 0.03, len);
  g.add(tip);
  g.rotation.x = Math.PI / 2;
  g.visible = false;
  return { g, tip, len, two: w > 0 };
}

export function createPerson(kind: PersonKind, look: number, appearance?: Appearance, customization?: Pick<Lifestyle,'hairStyle'|'accessory'|'beard'>): Person {
  const r = rng(look + kind.length * 977);
  const boss = kind === "boss";
  const sc = boss ? 1.17 : 0.95 + r() * 0.1;
  const root = new THREE.Group();
  const inner = new THREE.Group();
  root.add(inner);
  inner.scale.setScalar(sc);
  const skin = lam(appearance ? SKIN[appearance.skin]! : pick(r, SKIN));
  let hair = lam(pick(r, HAIR));
  let top = lam(pick(r, GANG)), sleeve = top, pants = lam(0x2b3a55), shoe = lam(0x202020);
  let shortSleeve = false;
  type Extra = (hip: number) => void;
  const extras: Extra[] = [];
  const hipY = 0.88, shY = 1.45;
  const torso = part(box(), top, 0.5, 0.62, 0.28, 0, 1.14, 0, inner);
  const head = new THREE.Group(); head.position.set(0, 1.58, 0); inner.add(head);
  const headM = part(sph(), skin, 0.28, 0.32, 0.29, 0, 0.1, 0, head);

  switch (kind) {
    case "player":
      top = lam([0xb0102a, 0x173b48, 0x232533, 0xe4d0a5, 0x6b23b5, 0xf0c238][appearance?.outfit ?? 0]!); sleeve = top;
      pants = lam([0x8a0e22, 0x1d2c3b, 0x15151e, 0x483a33, 0x1e7d4d, 0x76259e][appearance?.outfit ?? 0]!);
      shoe = lam(0xf5ecd8); hair = lam(HAIR[appearance?.hair ?? 0]!);
      // Gender presentation is cosmetic only; identity never changes gameplay stats.
      if (appearance?.gender === 'Woman') { torso.scale.x *= .88; inner.scale.y *= .97; }
      if (appearance?.gender === 'Nonbinary') torso.scale.x *= .95;
      extras.push(() => {
        part(box(), lam(0xf4ead2), 0.2, 0.4, 0.02, 0, 1.2, 0.15, inner); // linen shirt
        if((customization?.accessory??1)===1)part(box(), emi(0x111111, 0.1), 0.26, 0.07, 0.04, 0, 0.14, 0.13, head); // shades
        part(box(), emi(0xffc83a, 0.4), 0.12, 0.03, 0.03, 0, 1.38, 0.16, inner); // chain
      });
      break;
    case "boss":
      top = lam(0xf6f4ee); sleeve = top; pants = lam(0xf0eee6); shoe = lam(0x8a5a2a); hair = lam(0xbfbfbf);
      extras.push(() => {
        part(cyl(), lam(0xf8f6f0), 0.44, 0.05, 0.44, 0, 0.3, 0, head);
        part(cyl(), lam(0xf8f6f0), 0.26, 0.14, 0.26, 0, 0.38, 0, head);
        part(cyl(), emi(0xd4a017, 0.4), 0.27, 0.04, 0.27, 0, 0.34, 0, head);
        part(cyl(), lam(0xb88a54), 0.04, 0.16, 0.04, 0.05, 0.0, 0.18, head).rotation.x = Math.PI / 2;
        part(box(), emi(0xd4a017, 0.4), 0.14, 0.05, 0.03, 0, 1.38, 0.15, inner);
      });
      break;
    case "cop":
      top = lam(0x1b2d5c); sleeve = top; pants = lam(0x16224a); shoe = lam(0x111111); hair = lam(0x2b1b10);
      extras.push(() => {
        part(cyl(), lam(0x141f45), 0.34, 0.12, 0.34, 0, 0.3, 0, head);
        part(box(), lam(0x0c1230), 0.3, 0.03, 0.14, 0, 0.26, 0.2, head);
        part(box(), emi(0xffd54a, 0.6), 0.07, 0.08, 0.03, 0, 0.32, 0.17, head);
        part(box(), lam(0x111111), 0.52, 0.07, 0.3, 0, 0.88, 0, inner);
        part(box(), emi(0xffd54a, 0.6), 0.07, 0.08, 0.03, 0.12, 1.28, 0.15, inner);
      });
      extras.push(()=>{
        inner.name='uniformed-police-officer';
        part(box(),lam(0x111e32),.46,.44,.11,0,1.18,.18,inner).name='police-duty-vest';
        part(box(),lam(0xe4c66b),.07,.09,.025,-.13,1.3,.25,inner).name='police-badge';
        part(box(),lam(0x91abc0),.12,.025,.02,.12,1.3,.25,inner);
        for(const side of [-1,1]){
          part(box(),lam(0x14233a),.12,.17,.12,side*.22,.89,.1,inner);
          part(box(),emi(0xe8c767,.1),.09,.08,.04,side*.29,1.42,.06,inner);
        }
        part(box(),lam(0x14191f),.07,.2,.07,-.23,1.36,.17,inner).name='police-radio';
        part(box(),lam(0x303c46),.025,.14,.025,-.23,1.53,.17,inner);
        const patch=part(geo('police-back-patch',()=>new THREE.PlaneGeometry(.36,.12)),policeLabel('POLICE'),1,1,1,0,1.28,-.151,inner);patch.rotation.y=Math.PI;patch.name='police-uniform-label';
      });
      break;
    case "gangster": {
      const c = pick(r, GANG), v = Math.floor(r() * 4);
      top = lam(c); sleeve = top; pants = lam(pick(r, [0x1c1c22, 0x34405a, 0x4a3a2a, 0x2b2b2b]));
      shoe = lam(pick(r, [0xffffff, 0x202020, 0xc0392b]));
      if (v === 1) { shortSleeve = true; top = lam(0xf2f2f2); sleeve = skin; }
      extras.push(() => {
        if (v === 0) { part(box(), top, 0.3, 0.12, 0.3, 0, 1.55, -0.1, inner); } // hood
        if (v === 2) part(cyl(), lam(c), 0.3, 0.1, 0.3, 0, 0.27, 0, head); // bandana
        if (v === 3) { part(cyl(), lam(0x111111), 0.32, 0.12, 0.32, 0, 0.28, 0, head); part(box(), lam(0x111111), 0.26, 0.03, 0.14, 0, 0.25, 0.2, head); }
        part(box(), lam(0x203040), 0.06, 0.2, 0.06, 0.34, 1.2, 0, inner).visible = shortSleeve; // tattoo-ish stripe
      });
      break;
    }
    default: {
      const v = Math.floor(r() * 4), c = pick(r, CIV);
      top = lam(c); sleeve = shortSleeve ? skin : top;
      pants = lam(pick(r, [0xd9c7a0, 0x3a5a8a, 0xeeeeee, 0x6b4f3a]));
      shoe = lam(pick(r, [0xffffff, 0x8a5a2a, 0x333333]));
      if (v === 1) { top = lam(0x151515); sleeve = top; extras.push(() => part(box(), emi(0xe8b923, 0.3), 0.52, 0.12, 0.3, 0, 1.22, 0, inner)); }
      if (v === 0) { top = lam(0xff7b54); extras.push(() => { part(box(), lam(0xffe066), 0.1, 0.1, 0.02, -0.1, 1.2, 0.15, inner); part(box(), lam(0x2a9d8f), 0.1, 0.1, 0.02, 0.1, 1.05, 0.15, inner); }); }
      if (v === 2) { pants = top; extras.push(() => part(box(), top, 0.5, 0.4, 0.3, 0, 0.7, 0, inner)); }
      if (v === 3) extras.push(() => { part(cyl(), lam(0xe8d08a), 0.55, 0.04, 0.55, 0, 0.3, 0, head); part(cyl(), lam(0xe8d08a), 0.28, 0.1, 0.28, 0, 0.34, 0, head); });
      if (r() < 0.45) extras.push(() => part(box(), emi(pick(r, BEADS), 0.3), 0.3, 0.05, 0.05, 0, 1.4, 0.15, inner));
      sleeve = v === 1 ? top : lam(0);
      sleeve = v === 1 ? top : skin;
      break;
    }
  }
  torso.material = top;
  if(kind==='player'){
    part(cyl(),skin,.13,.2,.13,0,1.5,0,inner);
    // Facial landmarks and layered clothing keep the procedural avatar readable at close range.
    for(const side of [-1,1]){
      part(sph(),skin,.065,.11,.06,side*.15,.08,0,head);
      part(sph(),lam(0xf5efe2),.045,.028,.025,side*.065,.13,.134,head);
      part(sph(),lam(0x242727),.019,.022,.012,side*.065,.13,.15,head);
      part(box(),hair,.055,.012,.02,side*.065,.162,.14,head);
      part(box(),lam(0xe6dbb8),.035,.38,.035,side*.14,1.2,.151,inner);
    }
    part(sph(),skin,.05,.07,.055,0,.085,.148,head);
    part(box(),lam(0x714637),.07,.012,.018,0,.035,.142,head);
    if(customization?.beard)part(sph(),hair,.24,.12,.17,0,-.005,.055,head);
    const style=customization?.hairStyle??0;
    if(style===1)part(sph(),hair,.37,.27,.34,0,.25,-.02,head);
    if(style===2)part(box(),hair,.1,.25,.31,0,.32,-.02,head);
    if(style===3)part(sph(),hair,.16,.18,.2,0,.12,-.23,head);
    if(customization?.accessory===2){part(cyl(),top,.31,.13,.31,0,.32,0,head);part(box(),top,.28,.025,.18,0,.27,.17,head);}
    if(customization?.accessory===3){part(cyl(),lam(0xdec89a),.5,.035,.5,0,.29,0,head);part(cyl(),lam(0xdec89a),.28,.17,.28,0,.38,0,head);}
  }
  // hair (cap/hat kinds still get hair)
  part(box(), hair, 0.3, 0.12, 0.31, 0, 0.22, -0.02, head);
  part(box(), hair, 0.3, 0.2, 0.08, 0, 0.1, -0.13, head);
  void headM;
  if (appearance?.gender === 'Woman') part(box(), hair, .32, .32, .09, 0, -.04, -.13, head);
  // Non-player faces retain the inexpensive base geometry.
  for (const e of extras) e(0);

  const armLen = 0.58, legLen = 0.88;
  const mkLimb = (x: number, y: number, len: number, w: number, m: THREE.Material, m2: THREE.Material | null) => {
    const p = new THREE.Group(); p.position.set(x, y, 0); inner.add(p);
    part(box(), m, w, len, w, 0, -len / 2, 0, p);
    if (m2) part(box(), m2, w * 1.02, len * 0.35, w * 1.02, 0, -len * 0.85, 0, p);
    return p;
  };
  const armL = mkLimb(-0.34, shY, armLen, 0.15, sleeve, shortSleeve || kind === "civilian" ? null : skin);
  const armR = mkLimb(0.34, shY, armLen, 0.15, sleeve, shortSleeve || kind === "civilian" ? null : skin);
  const legL = mkLimb(-0.13, hipY, legLen, 0.2, pants, shoe);
  const legR = mkLimb(0.13, hipY, legLen, 0.2, pants, shoe);

  const guns: Gun[] = [];
  let flashMesh: THREE.Mesh | null = null;
  let flashMat: THREE.MeshBasicMaterial | null = null;
  if (kind !== "civilian") {
    for (let w = 0; w < 3; w++) {
      const gn = buildGun(w);
      gn.g.position.set(0, -armLen, 0);
      armR.add(gn.g);
      guns.push(gn);
    }
    flashMat = new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    flashMesh = new THREE.Mesh(cone(), flashMat);
    flashMesh.scale.set(0.22, 0.22, 0.4);
    flashMesh.visible = false;
    guns[0]!.g.add(flashMesh);
  }
  let curW = -1;
  const setW = (w: number) => {
    if (!guns.length || w === curW) return;
    curW = w;
    guns.forEach((g, i) => (g.g.visible = i === w));
    if (flashMesh) { guns[w]!.g.add(flashMesh); flashMesh.position.set(0, 0.03, guns[w]!.len); }
  };

  let blend = 0; // aim blend
  let down = 0;
  let twitch = 0;
  let lastMode: PersonMode = "idle";
  const tmp = new THREE.Vector3();
  void tmp;
  const person: Person = {
    root,
    pose(mode, speed, time, weapon, dt) {
      const k = Math.min(1, dt * 12);
      blend += ((mode === "aim" ? 1 : 0) - blend) * k;
      down += ((mode === "down" ? 1 : 0) - down) * Math.min(1, dt * 7);
      if (mode === "down" && lastMode !== "down") twitch = 0.5;
      lastMode = mode;
      twitch = Math.max(0, twitch - dt);
      const moving = mode === "walk" || mode === "run" || (mode === "aim" && speed > 0.3);
      const fast = mode === "run";
      const freq = Math.min(14, 3 + speed * (fast ? 1.1 : 1.6));
      const amp = moving ? (fast ? 0.95 : 0.6) : 0;
      const s = Math.sin(time * freq) * amp;
      const breathe = Math.sin(time * 2) * 0.015;
      const holdGun = guns.length > 0;
      if (holdGun) setW(Math.max(0, Math.min(2, weapon | 0)));
      const w = curW < 0 ? 0 : curW;
      guns.forEach((g,i)=>g.g.visible=mode!=="ride" && i===w);
      const spread = mode === "aim" ? 0.12 : 0;
      legL.rotation.set(s * (1 - blend * 0.6), 0, -spread);
      legR.rotation.set(-s * (1 - blend * 0.6), 0, spread);
      const swing = s * (1 - blend);
      const holdR = holdGun ? -0.5 : 0;
      armL.rotation.set(-swing, 0, 0.05);
      armR.rotation.set(swing * (holdGun ? 0.3 : 1) + holdR * (1 - blend) * (mode === "idle" ? 0.3 : 1), 0, -0.05);
      const up = -Math.PI / 2 + 0.05;
      armR.rotation.x = armR.rotation.x * (1 - blend) + up * blend;
      const twoHand = holdGun && guns[w]!.two;
      const lx = twoHand ? up : -swing;
      armL.rotation.x = armL.rotation.x * (1 - blend) + (twoHand ? up : -0.3) * blend;
      void lx;
      armL.rotation.y = blend * (twoHand ? -0.35 : 0);
      armR.rotation.y = blend * (twoHand ? 0.1 : 0);
      armL.position.y = armR.position.y = shY + breathe;
      torso.position.y = 1.14 + breathe;
      head.position.y = 1.58 + breathe + (moving ? Math.abs(Math.sin(time * freq)) * 0.03 : 0);
      inner.position.y = 0;
      if(mode==='ride'){
        armL.rotation.set(-1.15,0,.08);armR.rotation.set(-1.15,0,-.08);
        legL.rotation.set(-.9,0,.25);legR.rotation.set(-.9,0,-.25);
      }
      // down: lie on back
      const t = down;
      inner.rotation.x = mode==='ride'?.12:-t * (Math.PI / 2);
      inner.position.y = t * 0.2 * sc;
      inner.position.z = t * -0.1;
      if (twitch > 0) { inner.rotation.z = Math.sin(time * 40) * 0.05 * (twitch / 0.5); } else inner.rotation.z = 0;
      if (t > 0.5) { armL.rotation.z = 0.5; armR.rotation.z = -0.5; legL.rotation.z = -0.15; legR.rotation.z = 0.15; }
    },
    muzzle(out) {
      if (!guns.length) { out.set(0, 1.4, 0.6); return root.localToWorld(out); }
      const gn = guns[Math.max(0, curW)]!;
      gn.tip.updateWorldMatrix(true, false);
      return out.setFromMatrixPosition(gn.tip.matrixWorld);
    },
    flash(v) {
      if (!flashMesh || !flashMat) return;
      flashMesh.visible = v > 0.01;
      flashMat.opacity = Math.max(0, Math.min(1, v));
      const s = 0.6 + v * 0.6;
      flashMesh.scale.set(0.22 * s, 0.22 * s, 0.4 * s);
      flashMesh.rotation.z = v * 6;
    },
    setVisible(v) { root.visible = v; },
    dispose() {
      flashMat?.dispose();
      root.removeFromParent();
    },
  };
  return person;
}

// ---------- cars ----------
const COLORS = [0xc0392b, 0x2471a3, 0xf1c40f, 0x1e8449, 0xe67e22, 0x8e44ad, 0xecf0f1, 0x17202a, 0x1abc9c, 0xe84393, 0xb7950b, 0x5d6d7e];
const carModels: (GLTF | undefined)[] = [];
/** Loads the detailed car models; cars made afterwards use them. */
export async function loadCarModels(): Promise<void> {
  const loader = new GLTFLoader();
  await Promise.all(["sedan", "sports", "taxi", "pickup"].map(async (n, i) => {
    try { carModels[i] = await loader.loadAsync(new URL(`./assets/car-${n}.glb`, import.meta.url).href); } catch { /* keep procedural */ }
  }));
}
export function carColors(): number[] { return COLORS.slice(); }

export function createCar(style: number, color: number): Car {
  if(style === 6) return createMotorcycle(color);
  const police = style === 3, sports = style === 2;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const paint = lam(police ? 0x14161b : color);
  const white = lam(0xf2f2f2), glass = lam(0x1d2c3a), dark = lam(0x1a1a1a), chrome = lam(0xc8ccd2);
  const van = style === 4, truck = style === 1, suv = style === 5, muscle = style === 7, freight = style === 8, bus = style === 9, taxi = style === 10;
  const len = freight ? 7.2 : bus ? 6.7 : van ? 5.5 : muscle ? 5.1 : sports ? 4.4 : 4.6, w = freight || bus || van ? 2.4 : suv ? 2.2 : 2;
  const h0 = sports ? 0.38 : 0.45, ch = van || suv || freight || bus ? .85 : sports ? .42 : .55;
  part(box(), paint, w, ch, len, 0, h0 + ch / 2, 0, body); // chassis
  const cabH = freight || bus ? 1.1 : suv ? .85 : sports ? .5 : .62, cabLen = bus ? 4.9 : suv ? 3 : sports ? 1.9 : 2.3;
  const cabZ = freight ? 2.1 : truck ? 1 : sports ? -.25 : -.2;
  part(box(), glass, w - 0.2, cabH, cabLen, 0, h0 + ch + cabH / 2, cabZ, body);
  part(box(), police ? white : paint, w - 0.1, 0.07, cabLen - 0.5, 0, h0 + ch + cabH + 0.03, cabZ, body); // roof
  if(truck){
    part(box(),dark,w-.2,.15,2.3,0,h0+ch,-1.1,body);
    for(const side of [-1,1])part(box(),paint,.12,.55,2.5,side*(w/2-.06),h0+ch+.25,-1.1,body);
    for(let i=0;i<3;i++)part(box(),lam(0x876645),.75,.65,.65,(i%2-.5)*.8,h0+ch+.4,-.7-Math.floor(i/2)*.8,body);
  }
  if(van){
    part(box(),paint,w-.1,1.2,3.4,0,h0+ch+.5,-.9,body);
    for(const side of [-1,1])part(box(),dark,.06,.5,2.5,side*w/2,h0+ch+.55,-.9,body);
  }
  if(freight){
    part(box(),lam(0xd8d8c9),w,2.45,4.7,0,2.05,-1,body);
    for(const side of [-1,1])for(let z=-3;z<1.4;z+=.3)part(box(),chrome,.035,2.15,.035,side*(w/2+.01),2.08,z,body);
    part(box(),dark,w-.1,.1,.05,0,3.15,-3.38,body);
    for(const side of [-1,1])part(box(),chrome,.04,1.8,.08,side*.18,1.95,-3.4,body);
  }
  if(bus){
    for(const side of [-1,1]){
      part(box(),paint,.08,.18,5.3,side*(w/2-.03),1.55,-.2,body);
      for(let z=-2.4;z<2.3;z+=.7)part(box(),paint,.09,1.2,.09,side*(w/2-.1),1.8,z,body);
    }
    part(box(),paint,w-.1,.1,5.3,0,2.42,-.2,body);
  }
  if(suv){
    part(box(),dark,w+.05,.12,2.4,0,2.25,-.2,body);
    for(const side of [-1,1])part(box(),chrome,.08,.12,2.5,side*.85,2.35,-.2,body);
    const spare=part(cyl(),dark,.9,.24,.9,0,1.3,-len/2-.15,body);spare.rotation.x=Math.PI/2;
  }
  if(muscle){
    for(const side of [-1,1])part(box(),dark,.24,.025,len-1,side*.35,h0+ch+.02,0,body);
    part(box(),dark,.7,.22,.85,0,h0+ch+.1,1.35,body);
    for(let x=-.6;x<=.6;x+=.4)part(box(),chrome,.08,.18,.06,x,h0+.24,len/2+.14,body);
  }
  if(taxi){
    part(box(),lam(0xf0c435),.75,.23,.35,0,h0+ch+cabH+.2,0,body);
    for(const side of [-1,1])for(let z=-.9;z<=.9;z+=.2)part(box(),Math.round(z*10)%2===0?dark:white,.025,.12,.2,side*(w/2+.015),h0+ch-.1,z,body);
  }
  if (police) {
    root.name='marked-police-cruiser';
    for(const side of [-1,1]){
      const label=part(geo('police-door-label',()=>new THREE.PlaneGeometry(1.55,.36)),policeLabel('POLICE'),1,1,1,side*(w/2+.025),h0+.4,.15,body);label.rotation.y=side*Math.PI/2;label.name='police-door-livery';
      part(box(),dark,.12,.16,.7,side*.62,h0+.13,len/2+.15,body);
    }
    part(box(),dark,w-.3,.25,.12,0,h0+.3,len/2+.14,body).name='police-push-bar';
    part(box(),dark,.035,.7,.035,.6,h0+ch+cabH+.35,-.5,body).name='police-antenna';
    part(box(), white, w + 0.02, 0.22, 1.5, 0, h0 + 0.2, 0.2, body); // doors livery
  }
  const ty = h0 + 0.1;
  part(box(), chrome, w + 0.05, 0.16, 0.2, 0, ty, len / 2, body); // front bumper
  part(box(), chrome, w + 0.05, 0.16, 0.2, 0, ty, -len / 2, body); // rear bumper
  const hl = emi(0xfff2b0, 1.2);
  const tail = new THREE.MeshStandardMaterial({ color: 0x8a0a0a, emissive: 0xff1010, emissiveIntensity: 0.5 });
  for (const sx of [-1, 1]) {
    part(box(), hl, 0.4, 0.17, 0.08, sx * 0.7, h0 + ch - 0.12, len / 2 + 0.02, body);
    part(box(), tail, 0.42, 0.15, 0.08, sx * 0.7, h0 + ch - 0.12, -len / 2 - 0.02, body);
  }
  const extraMats: THREE.Material[] = [tail];
  const barMeshes: THREE.Mesh[] = [];
  let barR: THREE.MeshStandardMaterial | null = null, barB: THREE.MeshStandardMaterial | null = null;
  if (sports) {
    part(box(), dark, w - 0.2, 0.06, 0.4, 0, h0 + ch + cabH * 0.9, -len / 2 + 0.2, body);
    part(box(), dark, 0.08, 0.3, 0.08, -0.7, h0 + ch + 0.15, -len / 2 + 0.25, body);
    part(box(), white, 0.4, 0.02, len, 0, h0 + ch + 0.011, 0, body); // stripe
  }
  if (police) {
    barR = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 0.1 });
    barB = new THREE.MeshStandardMaterial({ color: 0x2060ff, emissive: 0x0040ff, emissiveIntensity: 0.1 });
    extraMats.push(barR, barB);
    const y = h0 + ch + cabH + 0.14;
    barMeshes.push(part(box(), barR, 0.6, 0.14, 0.3, -0.35, y, cabZ, body));
    barMeshes.push(part(box(), barB, 0.6, 0.14, 0.3, 0.35, y, cabZ, body));
  }
  const wheels: { pivot: THREE.Group; spin: THREE.Group; front: boolean }[] = [];
  const wr = suv || freight ? .46 : .38;
  for (const sx of [-1, 1]) for (const fz of [1, -1]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * (w / 2 - 0.1), wr, fz * (len / 2 - 0.85));
    const spin = new THREE.Group(); pivot.add(spin);
    const tire = part(cyl(), dark, wr * 2, 0.3, wr * 2, 0, 0, 0, spin); tire.rotation.z = Math.PI / 2;
    const hub = part(cyl(), chrome, wr * 1.1, 0.32, wr * 1.1, 0, 0, 0, spin); hub.rotation.z = Math.PI / 2;
    root.add(pivot);
    wheels.push({ pivot, spin, front: fz > 0 });
  }
  const src = carModels[police ? 0 : sports ? 1 : [0, 2, 3, 0][Math.max(0, COLORS.indexOf(color)) % 4]!];
  if (src && style <= 3 && !truck && !police) {
    const m = cloneModel(src.scene);
    const bb = new THREE.Box3().setFromObject(m);
    const k = len / (bb.max.z - bb.min.z);
    m.scale.setScalar(k);
    bb.setFromObject(m);
    m.position.set(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
    m.traverse((o) => { if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        const me = o as THREE.Mesh;
        const mt = (me.material as THREE.MeshStandardMaterial).clone();
        mt.metalness = Math.min(mt.metalness, 0.15); mt.roughness = Math.max(mt.roughness, 0.4); mt.envMapIntensity = 1;
        me.material = mt;
      } });
    if (police) {
      m.traverse((o) => {
        const me = o as THREE.Mesh;
        if (me.isMesh) { me.material = (me.material as THREE.MeshStandardMaterial).clone(); (me.material as THREE.MeshStandardMaterial).color.multiplyScalar(0.45); }
      });
      for (const b of barMeshes) { b.removeFromParent(); b.position.y += 0.1; root.add(b); }
    }
    root.add(m);
    body.visible = false;
    for (const wh of wheels) wh.pivot.visible = false;
  }
  const emergencyLights:THREE.PointLight[]=[];
  if(police){for(const [x,color]of [[-.4,0xff2233],[.4,0x3377ff]]){const light=new THREE.PointLight(color,0,9,2);light.position.set(x!,h0+ch+cabH+.3,0);root.add(light);emergencyLights.push(light);}}
  let last = -1, rot = 0;
  const car: Car = {
    root,
    driverSeat: new THREE.Vector3(-0.45, h0 + 0.35, sports ? -0.2 : -0.1),
    motion(speed, steer, braking, time) {
      const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, time - last));
      last = time;
      rot += (speed * dt) / wr;
      for (const wh of wheels) {
        wh.spin.rotation.x = rot;
        wh.pivot.rotation.y = wh.front ? steer * 0.5 : 0;
      }
      body.rotation.z = -steer * Math.min(1, Math.abs(speed) / 20) * 0.03 * Math.sign(speed || 1);
      body.rotation.x = braking ? 0.015 : 0;
      tail.emissiveIntensity = braking ? 2.2 : 0.5;
      tail.color.setHex(braking ? 0xff3030 : 0x8a0a0a);
      if (barR && barB) {
        const on = Math.floor(time * 6) % 2 === 0;
        emergencyLights.forEach((light,i)=>light.intensity=(i===0?on:!on)?9:0);
        barR.emissiveIntensity = on ? 2.2 : 0.1;
        barB.emissiveIntensity = on ? 0.1 : 2.2;
      }
    },
    dispose() {
      for (const m of extraMats) m.dispose();
      root.removeFromParent();
    },
  };
  return car;
}

// Narrow two-wheel chassis with its own steering, wheel spin and cornering lean.
function createMotorcycle(color: number): Car {
  const root=new THREE.Group(), body=new THREE.Group();root.add(body);
  const paint=lam(color),dark=lam(0x171b20),metal=lam(0x9da7ac),rubber=lam(0x101215);
  part(box(),metal,.18,.28,1.5,0,.58,0,body);
  part(sph(),paint,.65,.55,.9,0,.95,.3,body);
  part(box(),dark,.45,.16,.85,0,.98,-.45,body);
  part(box(),metal,.5,.35,.55,0,.59,.05,body);
  part(box(),metal,.08,.1,1.2,.27,.52,-.25,body);
  part(box(),metal,.8,.07,.08,0,1.33,.73,body);
  for(const side of [-1,1])part(box(),dark,.17,.08,.09,side*.4,1.33,.73,body);
  for(const side of [-1,1])part(box(),metal,.06,.8,.06,side*.12,.8,.91,body).rotation.x=-.18;
  part(sph(),emi(0xffe9bb,1.3),.28,.25,.13,0,1.12,1,body);
  const tail=new THREE.MeshStandardMaterial({color:0xb0141d,emissive:0xff1e20,emissiveIntensity:.4});
  part(box(),tail,.23,.12,.08,0,1,-.91,body);
  const wheels:{pivot:THREE.Group;spin:THREE.Group}[]=[];
  for(const z of [-.92,.92]){
    const pivot=new THREE.Group();pivot.position.set(0,.4,z);root.add(pivot);
    const spin=new THREE.Group();pivot.add(spin);
    const tire=part(cyl(),rubber,.8,.19,.8,0,0,0,spin);tire.rotation.z=Math.PI/2;
    const hub=part(cyl(),metal,.47,.2,.47,0,0,0,spin);hub.rotation.z=Math.PI/2;wheels.push({pivot,spin});
  }
  let last=0,spin=0;
  return {root,driverSeat:new THREE.Vector3(0,1,-.25),motion(speed,steer,brake,time){
    const dt=Math.max(0,Math.min(.1,time-last));last=time;spin+=speed*dt/.4;
    wheels.forEach(w=>{w.spin.rotation.x=spin;});wheels[1]!.pivot.rotation.y=steer*.4;
    body.rotation.z=-steer*Math.min(.3,Math.abs(speed)*.012);tail.emissiveIntensity=brake?2.5:.4;
  },dispose(){tail.dispose();root.removeFromParent();}};
}
