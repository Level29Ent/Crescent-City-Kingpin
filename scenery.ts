// Crescent City Kingpin: the drawn world. Stylized low-poly golden-hour New Orleans.
// Everything static is merged into per-chunk vertex-coloured meshes; repeated organic bits are instanced.
// Colliders live in game.ts; this file only draws (visual slabs stay <= 0.12 high).
import * as THREE from "three";
import {
  BLOCK_CENTERS_X,
  BLOCK_CENTERS_Z,
  BLOCK_HALF,
  BUILDINGS,
  BUSINESSES,
  DECKS,
  DISTRICTS,
  HQ,
  LAND_Z,
  PONDS,
  PROPS,
  STREETS,
  STREET_HALF,
  WORLD_X,
  WORLD_Z_MIN,
  districtAt,
  type Building,
  type Prop,
} from "./game";

export type Scenery = { update(time: number, focusX: number, focusZ: number): void; dispose(): void };

// ───────────────────────── helpers ─────────────────────────
const TAU = Math.PI * 2;
const hash3 = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
};
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const _col = new THREE.Color();
const colCache = new Map<number, [number, number, number]>();
function rgb(hex: number): [number, number, number] {
  let c = colCache.get(hex);
  if (!c) {
    _col.setHex(hex);
    c = [_col.r, _col.g, _col.b];
    colCache.set(hex, c);
  }
  return c;
}
/** k>0 mixes toward white, k<0 toward black. */
function tint(hex: number, k: number): number {
  const t = k >= 0 ? 255 : 0;
  const a = Math.abs(k);
  const f = (v: number) => Math.round(v + (t - v) * a);
  return (f((hex >> 16) & 255) << 16) | (f((hex >> 8) & 255) << 8) | f(hex & 255);
}
const nearest = (arr: number[], v: number) => {
  let best = arr[0]!;
  for (const a of arr) if (Math.abs(a - v) < Math.abs(best - v)) best = a;
  return best;
};

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _h = new THREE.Vector3();
const _n = new THREE.Vector3();
const _e = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _eu = new THREE.Euler();
const _up = new THREE.Vector3(0, 1, 0);

/** Matrix from position, yaw (ry), pitch (rx), roll (rz) and scale. */
function M(x: number, y: number, z: number, ry = 0, rx = 0, s = 1, rz = 0, sx = s, sy = s, sz = s): THREE.Matrix4 {
  _eu.set(rx, ry, rz, "YXZ");
  _q.setFromEuler(_eu);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), _q.clone(), new THREE.Vector3(sx, sy, sz));
}

type P3 = [number, number, number];

/** Accumulates flat-shaded triangles with vertex colours. Winding is fixed up against an interior hint point. */
class Mesher {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  mat: THREE.Matrix4 | null = null;
  constructor(private jitter: boolean) {}
  xf(m: THREE.Matrix4, fn: () => void) {
    const prev = this.mat;
    this.mat = prev ? prev.clone().multiply(m) : m;
    fn();
    this.mat = prev;
  }
  tri(a: P3, b: P3, c: P3, color: number, hx: number, hy: number, hz: number) {
    _a.set(a[0], a[1], a[2]);
    _b.set(b[0], b[1], b[2]);
    _c.set(c[0], c[1], c[2]);
    _h.set(hx, hy, hz);
    if (this.mat) {
      _a.applyMatrix4(this.mat);
      _b.applyMatrix4(this.mat);
      _c.applyMatrix4(this.mat);
      _h.applyMatrix4(this.mat);
    }
    _n.crossVectors(_e.subVectors(_b, _a), _c.clone().sub(_a));
    if (_n.lengthSq() < 1e-10) return;
    _n.normalize();
    const mx = (_a.x + _b.x + _c.x) / 3;
    const my = (_a.y + _b.y + _c.y) / 3;
    const mz = (_a.z + _b.z + _c.z) / 3;
    let B = _b;
    let C = _c;
    if (_n.x * (mx - _h.x) + _n.y * (my - _h.y) + _n.z * (mz - _h.z) < 0) {
      B = _c;
      C = _b;
      _n.negate();
    }
    const [r, g, bl] = rgb(color);
    const j = this.jitter ? 1 + (hash3(mx, my, mz) - 0.5) * 0.1 : 1;
    this.pos.push(_a.x, _a.y, _a.z, B.x, B.y, B.z, C.x, C.y, C.z);
    for (let i = 0; i < 3; i++) {
      this.nor.push(_n.x, _n.y, _n.z);
      this.col.push(Math.min(1, r * j), Math.min(1, g * j), Math.min(1, bl * j));
    }
  }
  quadP(a: P3, b: P3, c: P3, d: P3, color: number, hx: number, hy: number, hz: number) {
    this.tri(a, b, c, color, hx, hy, hz);
    this.tri(a, c, d, color, hx, hy, hz);
  }
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: number, ry = 0, skipBottom?: boolean) {
    const hx = sx / 2;
    const hy = sy / 2;
    const hz = sz / 2;
    const cs = Math.cos(ry);
    const sn = Math.sin(ry);
    const P: P3[] = [];
    for (let i = 0; i < 8; i++) {
      const lx = i & 4 ? hx : -hx;
      const ly = i & 2 ? hy : -hy;
      const lz = i & 1 ? hz : -hz;
      P.push([cx + lx * cs + lz * sn, cy + ly, cz - lx * sn + lz * cs]);
    }
    const f = (a: number, b: number, c: number, d: number) => this.quadP(P[a]!, P[b]!, P[c]!, P[d]!, color, cx, cy, cz);
    f(0, 1, 3, 2);
    f(4, 5, 7, 6);
    f(2, 3, 7, 6);
    f(0, 2, 6, 4);
    f(1, 3, 7, 5);
    if (!(skipBottom ?? cy - hy < 0.3)) f(0, 1, 5, 4);
  }
  boxs(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: number, skipBottom?: boolean) {
    this.box((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color, 0, skipBottom);
  }
  /** Horizontal quad facing up. */
  gq(x0: number, z0: number, x1: number, z1: number, y: number, color: number) {
    this.quadP([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], color, (x0 + x1) / 2, y - 1, (z0 + z1) / 2);
  }
  disc(cx: number, cz: number, r: number, y: number, color: number, seg = 14) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * TAU;
      const a1 = ((i + 1) / seg) * TAU;
      this.tri([cx, y, cz], [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], color, cx, y - 1, cz);
    }
  }
  cyl(cx: number, y0: number, cz: number, r0: number, r1: number, h: number, seg: number, color: number, rot = 0, closedBottom = false) {
    const hy = y0 + h / 2;
    for (let i = 0; i < seg; i++) {
      const a0 = rot + (i / seg) * TAU;
      const a1 = rot + ((i + 1) / seg) * TAU;
      const p0: P3 = [cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0];
      const p1: P3 = [cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0];
      const q0: P3 = [cx + Math.cos(a0) * r1, y0 + h, cz + Math.sin(a0) * r1];
      const q1: P3 = [cx + Math.cos(a1) * r1, y0 + h, cz + Math.sin(a1) * r1];
      if (r1 < 1e-4) this.tri(p0, p1, q0, color, cx, hy, cz);
      else {
        this.quadP(p0, p1, q1, q0, color, cx, hy, cz);
        this.tri([cx, y0 + h, cz], q0, q1, color, cx, hy, cz);
      }
      if (closedBottom) this.tri([cx, y0, cz], p0, p1, color, cx, hy, cz);
    }
  }
  tube(ax: number, ay: number, az: number, bx: number, by: number, bz: number, r0: number, r1: number, seg: number, color: number) {
    _e.set(bx - ax, by - ay, bz - az);
    const len = _e.length();
    if (len < 1e-5) return;
    _q.setFromUnitVectors(_up, _e.normalize());
    const m = new THREE.Matrix4().compose(new THREE.Vector3(ax, ay, az), _q.clone(), new THREE.Vector3(1, 1, 1));
    this.xf(m, () => this.cyl(0, 0, 0, r0, r1, len, seg, color, 0, true));
  }
  ell(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: number, seg = 7, rings = 4, jit = 0.12) {
    const V: P3[][] = [];
    for (let j = 0; j <= rings; j++) {
      const phi = -Math.PI / 2 + (Math.PI * j) / rings;
      const rr = Math.cos(phi);
      const yy = Math.sin(phi);
      const row: P3[] = [];
      for (let i = 0; i < seg; i++) {
        const a = (i / seg) * TAU;
        const k = 1 + (hash3(i, j, cx + cz * 1.7 + cy) - 0.5) * 2 * jit;
        row.push([cx + Math.cos(a) * rr * rx * k, cy + yy * ry * k, cz + Math.sin(a) * rr * rz * k]);
      }
      V.push(row);
    }
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < seg; i++) {
        const i2 = (i + 1) % seg;
        this.quadP(V[j]![i]!, V[j]![i2]!, V[j + 1]![i2]!, V[j + 1]![i]!, color, cx, cy, cz);
      }
    }
  }
  /** Triangular prism from three (x,z) points between heights ya and yb. */
  prismTri(p0: [number, number], p1: [number, number], p2: [number, number], ya: number, yb: number, color: number) {
    const cx = (p0[0] + p1[0] + p2[0]) / 3;
    const cz = (p0[1] + p1[1] + p2[1]) / 3;
    const cy = (ya + yb) / 2;
    const T = (y: number): P3[] => [[p0[0], y, p0[1]], [p1[0], y, p1[1]], [p2[0], y, p2[1]]];
    const lo = T(ya);
    const hi = T(yb);
    this.tri(hi[0]!, hi[1]!, hi[2]!, color, cx, cy, cz);
    this.tri(lo[0]!, lo[1]!, lo[2]!, color, cx, cy, cz);
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      this.quadP(lo[i]!, lo[j]!, hi[j]!, hi[i]!, color, cx, cy, cz);
    }
  }
  /** Gable roof over the rectangle with the ridge along x (alongX) or z. */
  gable(x0: number, z0: number, x1: number, z1: number, y: number, ht: number, alongX: boolean, roof: number, end: number, ov = 0.5) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const pt = (u: number, yy: number, v: number): P3 => (alongX ? [u, yy, v] : [v, yy, u]);
    const u0 = (alongX ? x0 : z0) - ov;
    const u1 = (alongX ? x1 : z1) + ov;
    const v0 = (alongX ? z0 : x0) - ov;
    const v1 = (alongX ? z1 : x1) + ov;
    const vm = (v0 + v1) / 2;
    const hy = y + ht / 3;
    this.quadP(pt(u0, y, v0), pt(u1, y, v0), pt(u1, y + ht, vm), pt(u0, y + ht, vm), roof, cx, hy - 1, cz);
    this.quadP(pt(u0, y, v1), pt(u1, y, v1), pt(u1, y + ht, vm), pt(u0, y + ht, vm), roof, cx, hy - 1, cz);
    const ue0 = (alongX ? x0 : z0) - 0.02;
    const ue1 = (alongX ? x1 : z1) + 0.02;
    const wv0 = alongX ? z0 : x0;
    const wv1 = alongX ? z1 : x1;
    const wm = (wv0 + wv1) / 2;
    this.tri(pt(ue0, y, wv0), pt(ue0, y, wv1), pt(ue0, y + ht - 0.1, wm), end, cx, hy, cz);
    this.tri(pt(ue1, y, wv0), pt(ue1, y, wv1), pt(ue1, y + ht - 0.1, wm), end, cx, hy, cz);
  }
}

/** Chunked collection of Meshers so frustum culling and shadow culling work on merged geometry. */
class Layer {
  chunks = new Map<number, Mesher>();
  constructor(private jitter: boolean, private size = 60) {}
  at(x: number, z: number): Mesher {
    const key = Math.floor((x + 1500) / this.size) * 1000 + Math.floor((z + 1500) / this.size);
    let m = this.chunks.get(key);
    if (!m) {
      m = new Mesher(this.jitter);
      this.chunks.set(key, m);
    }
    return m;
  }
}

// ───────────────────────── canvas textures ─────────────────────────
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const css = (hex: number) => `#${hex.toString(16).padStart(6, "0")}`;

type SignStyle = "neon" | "warm" | "casino" | "paint" | "wood";
function signTexture(text: string, style: SignStyle, color: number): THREE.CanvasTexture {
  return canvasTex(1024, 256, (g) => {
    g.clearRect(0, 0, 1024, 256);
    const round = (x: number, y: number, w: number, h: number, r: number) => {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    };
    if (style === "neon") g.fillStyle = "rgba(8,8,28,0.92)";
    else if (style === "warm") g.fillStyle = "#8c1f1a";
    else if (style === "casino") g.fillStyle = "rgba(20,8,24,0.94)";
    else if (style === "wood") g.fillStyle = "#6a4a2c";
    else g.fillStyle = "rgba(240,236,224,0.92)";
    round(6, 6, 1012, 244, 28);
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = style === "paint" ? "#555" : css(color);
    if (style !== "paint") {
      g.shadowColor = css(color);
      g.shadowBlur = style === "wood" ? 0 : 24;
    }
    round(16, 16, 992, 224, 22);
    g.stroke();
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = 150;
    const font = (s: number) => `900 ${s}px Impact, "Arial Black", Arial, sans-serif`;
    g.font = font(size);
    while (g.measureText(text).width > 920 && size > 30) {
      size -= 6;
      g.font = font(size);
    }
    if (style === "paint") {
      g.fillStyle = "#2c3338";
      g.fillText(text, 512, 134);
    } else {
      g.shadowColor = css(color);
      g.shadowBlur = 40;
      g.fillStyle = css(color);
      g.fillText(text, 512, 134);
      g.shadowBlur = 12;
      g.fillStyle = css(tint(color, style === "wood" ? 0.1 : 0.7));
      g.fillText(text, 512, 134);
    }
  });
}

// ───────────────────────── main ─────────────────────────
type Sided = { x0: number; z0: number; x1: number; z1: number };
const NXs = [0, 0, -1, 1];
const NZs = [-1, 1, 0, 0];
function fpt(b: Sided, side: number, along: number, y: number, off: number): P3 {
  switch (side) {
    case 0: return [b.x0 + along, y, b.z0 - off];
    case 1: return [b.x0 + along, y, b.z1 + off];
    case 2: return [b.x0 - off, y, b.z0 + along];
    default: return [b.x1 + off, y, b.z0 + along];
  }
}
const slen = (b: Sided, side: number) => (side < 2 ? b.x1 - b.x0 : b.z1 - b.z0);
function fquad(m: Mesher, b: Sided, side: number, along: number, y: number, w: number, h: number, off: number, color: number) {
  const [cx, cy, cz] = fpt(b, side, along, y, off);
  const tx = side < 2 ? w / 2 : 0;
  const tz = side < 2 ? 0 : w / 2;
  m.quadP([cx - tx, cy - h / 2, cz - tz], [cx + tx, cy - h / 2, cz + tz], [cx + tx, cy + h / 2, cz + tz], [cx - tx, cy + h / 2, cz - tz], color, cx - NXs[side]!, cy, cz - NZs[side]!);
}
/** Axis-aligned box on a face: along centre, y centre, width along, height, depth out from the wall. */
function fbox(m: Mesher, b: Sided, side: number, along: number, y: number, w: number, h: number, off0: number, off1: number, color: number) {
  const [cx, cy, cz] = fpt(b, side, along, y, (off0 + off1) / 2);
  const d = off1 - off0;
  if (side < 2) m.box(cx, cy, cz, w, h, d, color, 0, false);
  else m.box(cx, cy, cz, d, h, w, color, 0, false);
}
function awning(m: Mesher, b: Sided, side: number, a0: number, a1: number, y: number, depth: number, drop: number, stripes: number, c1: number, c2: number) {
  const w = (a1 - a0) / stripes;
  for (let i = 0; i < stripes; i++) {
    const s0 = a0 + i * w;
    const s1 = s0 + w;
    const c = i % 2 ? c1 : c2;
    const mid = (s0 + s1) / 2;
    const [hx, hy, hz] = fpt(b, side, mid, y - drop - 2, depth / 2);
    const top: P3[] = [fpt(b, side, s0, y, 0.05), fpt(b, side, s1, y, 0.05), fpt(b, side, s1, y - drop, depth), fpt(b, side, s0, y - drop, depth)];
    m.quadP(top[0]!, top[1]!, top[2]!, top[3]!, c, hx, hy, hz);
    const [ux, uy, uz] = fpt(b, side, mid, y + 2, depth / 2);
    m.quadP(top[0]!, top[1]!, top[2]!, top[3]!, tint(c, -0.45), ux, uy, uz);
    const v: P3[] = [fpt(b, side, s0, y - drop, depth), fpt(b, side, s1, y - drop, depth), fpt(b, side, s1, y - drop - 0.4, depth), fpt(b, side, s0, y - drop - 0.4, depth)];
    const [vx, vy, vz] = fpt(b, side, mid, y - drop - 0.2, depth - 1);
    m.quadP(v[0]!, v[1]!, v[2]!, v[3]!, c, vx, vy, vz);
  }
}

export function createScenery(scene: THREE.Scene): Scenery {
  const root = new THREE.Group();
  scene.add(root);
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];
  const trackM = <T extends THREE.Material>(m: T): T => (mats.push(m), m);
  const trackT = <T extends THREE.Texture>(t: T): T => (texs.push(t), t);
  const prevFog = scene.fog;
  const prevBg = scene.background;

  // ── sky, fog, lights ──
  const SUN_DIR = new THREE.Vector3(-0.5, 0.55, 0.6).normalize();
  const HORIZON = 0xcfd9de;
  scene.background = new THREE.Color(HORIZON);
  scene.fog = new THREE.Fog(0xcdd7da, 120, 700);

  const hemi = new THREE.HemisphereLight(0xbfd6f0, 0x6e6558, 1.1);
  const sun = new THREE.DirectionalLight(0xffe2b8, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(hemi, sun, sun.target);

  const skyGroup = new THREE.Group();
  root.add(skyGroup);
  const skyGeo = new THREE.SphereGeometry(700, 32, 20);
  {
    const stops: [number, number][] = [
      [-1, 0x8a8f94], [-0.12, 0xb9c3c9], [0, 0xdfe3df], [0.07, 0xc5d6e3], [0.22, 0x8fb5d9], [0.5, 0x5b92cf], [1, 0x3a74bd],
    ];
    const p = skyGeo.attributes.position!;
    const colors = new Float32Array(p.count * 3);
    const c1 = new THREE.Color();
    const c2 = new THREE.Color();
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      let k = 1;
      while (k < stops.length - 1 && v.y > stops[k]![0]) k++;
      const s0 = stops[k - 1]!;
      const s1 = stops[k]!;
      const t = Math.max(0, Math.min(1, (v.y - s0[0]) / (s1[0] - s0[0])));
      c1.setHex(s0[1]);
      c2.setHex(s1[1]);
      c1.lerp(c2, t);
      const glowK = Math.pow(Math.max(0, v.dot(SUN_DIR)), 6) * 0.55;
      c1.lerp(_col.setHex(0xfff0cc), Math.min(1, glowK * 0.6));
      colors[i * 3] = c1.r;
      colors[i * 3 + 1] = c1.g;
      colors[i * 3 + 2] = c1.b;
    }
    skyGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }
  const skyMat = trackM(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  skyGroup.add(sky);

  const glowTex = trackT(
    canvasTex(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.18, "rgba(255,240,200,0.95)");
      gr.addColorStop(0.45, "rgba(255,190,110,0.35)");
      gr.addColorStop(1, "rgba(255,150,80,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    }),
  );
  const sunDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    trackM(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })),
  );
  sunDisc.position.copy(SUN_DIR).multiplyScalar(640);
  sunDisc.lookAt(0, 0, 0);
  sunDisc.renderOrder = -9;
  skyGroup.add(sunDisc);

  // clouds
  {
    const cm = new Mesher(false);
    const r = mulberry(4242);
    for (let i = 0; i < 16; i++) {
      const az = r() * TAU;
      const rad = 420 + r() * 200;
      const cx = Math.cos(az) * rad;
      const cz = Math.sin(az) * rad;
      const cy = 90 + r() * 110;
      const facing = Math.max(0, (cx * SUN_DIR.x + cz * SUN_DIR.z) / rad);
      const base = facing > 0.4 ? 0xffb090 : 0xb888b8;
      for (let k = 0; k < 3; k++) cm.ell(cx + (k - 1) * 40, cy + (k === 1 ? 5 : 0), cz + (r() - 0.5) * 20, 50 + r() * 25, 8 + r() * 4, 20 + r() * 8, tint(base, k === 1 ? 0.15 : 0), 8, 3, 0.1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(cm.pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(cm.col, 3));
    const clouds = new THREE.Mesh(g, trackM(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
    clouds.frustumCulled = false;
    skyGroup.add(clouds);
  }

  // ── layers ──
  const solid = new Layer(true);
  const glow = new Layer(false);
  const neonA = new Layer(false);
  const neonB = new Layer(false);
  const ground = new Layer(false);
  const far = new Layer(true, 400);
  const farGlow = new Layer(false, 400);

  // static data for placement checks
  const hitsBuilding = (x: number, z: number, pad = 0) =>
    BUILDINGS.some((b) => x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad);

  // ── ground ──
  const E = WORLD_X;
  const ZN = WORLD_Z_MIN;
  const isDirt = (x: number, z: number) => x > 60 && z < -60;
  {
    const g0 = ground.at(0, 0);
    g0.gq(-1500, -1500, 1500, LAND_Z, -0.06, 0x4a4536);
    g0.gq(-E - 6, ZN - 6, E + 6, LAND_Z, -0.03, 0x5a5340);
    const ASPH = 0x3b3a46;
    const DIRT = 0x7a5f40;
    const lineEnds = (s: number, horizontal: boolean) => (horizontal ? [-E, E] : [ZN, LAND_Z]).map((v) => v + 0 * s);
    for (const s of STREETS) {
      for (const horizontal of [true, false]) {
        const [a0, a1] = lineEnds(s, horizontal) as [number, number];
        for (let a = a0; a < a1; a += 60) {
          const b2 = Math.min(a1, a + 60);
          const mid = (a + b2) / 2;
          const dirt = horizontal ? s < -60 && mid > 60 : s > 60 && mid < -60;
          const colr = dirt ? DIRT : ASPH;
          const m = horizontal ? ground.at(mid, s) : ground.at(s, mid);
          if (horizontal) m.gq(a, s - STREET_HALF, b2, s + STREET_HALF, 0, colr);
          else m.gq(s - STREET_HALF, a, s + STREET_HALF, b2, 0.001, colr);
        }
      }
    }
    // promenade at the river edge
    g0.gq(-E, 187, E, LAND_Z, 0.004, 0x9d9588);

    // block interiors + sidewalks
    const r = mulberry(99);
    for (const bz of BLOCK_CENTERS_Z) {
      for (const bx of BLOCK_CENTERS_X) {
        const d = districtAt(bx, bz);
        const m = ground.at(bx, bz);
        let c = 0xb59a78;
        const key = `${bx},${bz}`;
        const cemetery = key === "150,30" || key === "150,90";
        if (key === "-30,30" || d === 2) c = 0x74a64c;
        else if (d === 4) c = 0x3e5a36;
        else if (d === 3) c = 0x8a8782;
        else if (d === 1) c = 0x9a8f80;
        else if (bz < -60) c = 0x9a9690;
        if (cemetery) c = 0xd0c4a6;
        m.gq(bx - BLOCK_HALF, bz - BLOCK_HALF, bx + BLOCK_HALF, bz + BLOCK_HALF, 0.004, c);
        if (d === 4) {
          for (let i = 0; i < 9; i++) m.disc(bx - 18 + r() * 36, bz - 18 + r() * 36, 2 + r() * 3, 0.008, i % 2 ? 0x4b3a28 : 0x56693a, 8);
        } else if (d === 2 && key !== "-30,30") {
          for (let i = 0; i < 6; i++) m.disc(bx - 18 + r() * 36, bz - 18 + r() * 36, 1.5 + r() * 2, 0.008, 0x86b85a, 8);
        }
        if (d !== 4) {
          const cc = d === 3 ? 0x8f8c86 : 0xcdbfa8;
          const H = BLOCK_HALF;
          const T = 2;
          m.boxs(bx - H - T, -0.01, bz - H - T, bx + H + T, 0.1, bz - H, cc, true);
          m.boxs(bx - H - T, -0.01, bz + H, bx + H + T, 0.1, bz + H + T, cc, true);
          m.boxs(bx - H - T, -0.01, bz - H, bx - H, 0.1, bz + H, cc, true);
          m.boxs(bx + H, -0.01, bz - H, bx + H + T, 0.1, bz + H, cc, true);
        }
        if (key === "-30,30") {
          // Jackson Square paths
          m.gq(bx - 3, bz - 9, bx + 3, bz + 23, 0.012, 0xd9c9a4);
          m.gq(bx - 23, bz - 1, bx + 23, bz + 5, 0.012, 0xd9c9a4);
          m.disc(bx, bz + 2, 6.5, 0.014, 0xd9c9a4, 20);
          m.disc(bx, bz + 2, 4.2, 0.016, 0xb8a888, 20);
        }
      }
    }
    // dirt around the airboat shack, garden paths to mansions
    ground.at(150, -150).gq(132, -166, 168, -132, 0.01, 0x7a5f40);
    for (const b of BUILDINGS) {
      if (b.style === 2) {
        const info = sideInfo(b);
        const f = info.facing;
        const [px, , pz] = fpt(b, f, slen(b, f) / 2, 0, 0);
        const m = ground.at(px, pz);
        const L = info.edge[f]!;
        if (f < 2) {
          const z0 = f === 0 ? b.z0 - L : b.z1;
          m.gq(px - 1.8, z0, px + 1.8, z0 + L, 0.012, 0xd4c7a8);
        } else {
          const x0 = f === 2 ? b.x0 - L : b.x1;
          m.gq(x0, pz - 1.8, x0 + L, pz + 1.8, 0.012, 0xd4c7a8);
        }
      }
    }

    // markings
    const MARK = 0xf1c232;
    const WHITE = 0xe9e6dc;
    for (const s of STREETS) {
      for (const horizontal of [true, false]) {
        if (!horizontal && s === -60) continue; // streetcar line
        const bounds = STREETS;
        for (let k = 0; k < bounds.length - 1; k++) {
          const c0 = bounds[k]! + 9;
          const c1 = bounds[k + 1]! - 9;
          const midc = (bounds[k]! + bounds[k + 1]!) / 2;
          if (horizontal ? s < -60 && midc > 60 : s > 60 && midc < -60) continue;
          for (let a = c0; a + 3 <= c1 + 0.01; a += 7) {
            const m = horizontal ? ground.at(a, s) : ground.at(s, a);
            if (horizontal) m.gq(a, s - 0.15, a + 3, s + 0.15, 0.02, MARK);
            else m.gq(s - 0.15, a, s + 0.15, a + 3, 0.02, MARK);
          }
        }
      }
    }
    for (const sx of STREETS) {
      for (const sz of STREETS) {
        if (isDirt(sx, sz)) continue;
        const m = ground.at(sx, sz);
        for (let i = -4; i <= 4; i++) {
          const o = i * 1.1;
          for (const sgn of [-1, 1]) {
            m.gq(sx + sgn * 8, sz + o - 0.3, sx + sgn * 10.5 - (sgn < 0 ? 2.5 : 0) + (sgn < 0 ? 2.5 : 0), sz + o + 0.3, 0.02, WHITE);
            m.gq(sx + o - 0.3, sz + sgn * 8, sx + o + 0.3, sz + sgn * 10.5, 0.02, WHITE);
          }
        }
      }
    }
    // streetcar rails + ties
    {
      const rm = solid.at(-60, 0);
      for (const off of [-0.72, 0.72]) rm.boxs(-60 + off - 0.05, 0, ZN, -60 + off + 0.05, 0.07, LAND_Z - 4, 0x5a5e66, true);
      for (let z = ZN; z < LAND_Z - 4; z += 2.2) ground.at(-60, z).gq(-60 - 1.1, z, -60 + 1.1, z + 0.3, 0.022, 0x5b4636);
    }
  }

  function sideInfo(b: Sided) {
    const bx = nearest(BLOCK_CENTERS_X, (b.x0 + b.x1) / 2);
    const bz = nearest(BLOCK_CENTERS_Z, (b.z0 + b.z1) / 2);
    const edge = [b.z0 - (bz - BLOCK_HALF), bz + BLOCK_HALF - b.z1, b.x0 - (bx - BLOCK_HALF), bx + BLOCK_HALF - b.x1];
    const outer = edge.map((v) => Math.abs(v) < 0.6);
    let facing = 0;
    for (let i = 1; i < 4; i++) if (edge[i]! < edge[facing]!) facing = i;
    return { outer, facing, edge, bx, bz };
  }

  // ── signs & animated registries ──
  const signMeshes: THREE.Mesh[] = [];
  const flickers: { mat: THREE.MeshBasicMaterial; phase: number; depth: number }[] = [];
  function addSign(b: Sided, side: number, along: number, y: number, w: number, h: number, off: number, text: string, style: SignStyle, color: number, flicker = false) {
    const tex = trackT(signTexture(text, style, color));
    const mat = trackM(new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const [x, yy, z] = fpt(b, side, along, y, off);
    mesh.position.set(x, yy, z);
    mesh.rotation.y = [Math.PI, 0, -Math.PI / 2, Math.PI / 2][side]!;
    root.add(mesh);
    signMeshes.push(mesh);
    if (flicker) flickers.push({ mat, phase: x * 0.37 + z * 0.11, depth: 0.16 });
  }

  // ── buildings ──
  const WALL_GLOW = [0xffcf70, 0xffb85a, 0xffe2a0];
  function win(S: Mesher, G: Mesher, b: Sided, side: number, along: number, y: number, ww: number, wh: number, shut: number, lit: number, rnd: () => number, glass = 0x2d3350) {
    const on = rnd() < lit;
    fquad(on ? G : S, b, side, along, y, ww, wh, 0.06, on ? WALL_GLOW[Math.floor(rnd() * 3)]! : glass);
    const sx = ww / 2 + 0.35;
    fquad(S, b, side, along - sx, y, 0.55, wh, 0.05, shut);
    fquad(S, b, side, along + sx, y, 0.55, wh, 0.05, shut);
  }
  function balcony(S: Mesher, b: Sided, side: number, y: number, depth: number, rnd: () => number, mardi: boolean) {
    const L = slen(b, side);
    const iron = 0x1f2128;
    fbox(S, b, side, L / 2, y, L - 0.6, 0.18, 0, depth, 0x2b2c34);
    fbox(S, b, side, L / 2, y + 1.05, L - 0.6, 0.07, depth - 0.1, depth - 0.03, iron);
    fbox(S, b, side, L / 2, y + 0.55, L - 0.6, 0.05, depth - 0.1, depth - 0.05, iron);
    for (const a of [0.3, L - 0.3]) fbox(S, b, side, a, y + 1.05, 0.07, 0.07, 0, depth, iron);
    const n = Math.max(2, Math.floor((L - 0.6) / 1.7));
    for (let i = 0; i <= n; i++) fbox(S, b, side, 0.3 + (i * (L - 0.6)) / n, y + 0.55, 0.07, 1.0, depth - 0.1, depth - 0.03, iron);
    if (mardi && rnd() < 0.55) {
      const cols = [0x7b3fbf, 0x2fa84a, 0xf2c230];
      const k = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < k; i++) fbox(S, b, side, 0.8 + rnd() * (L - 1.6), y + 0.4, 0.32, 0.55, depth + 0.02, depth + 0.08, cols[(i + Math.floor(rnd() * 3)) % 3]!);
    }
  }
  function doorQuad(S: Mesher, b: Sided, side: number, along: number, w: number, h: number, color: number) {
    fquad(S, b, side, along, h / 2, w + 0.3, h + 0.15, 0.04, 0xf0e8d4);
    fquad(S, b, side, along, h / 2, w, h, 0.07, color);
  }
  function chimney(S: Mesher, x: number, y: number, z: number) {
    S.boxs(x - 0.45, y, z - 0.45, x + 0.45, y + 1.8, z + 0.45, 0x9a5a48);
    S.boxs(x - 0.55, y + 1.8, z - 0.55, x + 0.55, y + 2.0, z + 0.55, 0x5a4a44);
  }

  const highrises: { b: Building; i: number }[] = [];
  const mansionPorches: Building[] = [];
  void mansionPorches;
  BUILDINGS.forEach((b, bi) => {
    if (b.style === 9) return; // casino drawn separately
    const rnd = mulberry(bi * 7919 + 13);
    const cx = (b.x0 + b.x1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    const S = solid.at(cx, cz);
    const G = glow.at(cx, cz);
    const w = b.x1 - b.x0;
    const d = b.z1 - b.z0;
    const info = sideInfo(b);
    const { x0, z0, x1, z1, h, color } = b;
    const outerSides = [0, 1, 2, 3].filter((s) => info.outer[s]);
    const allSides = [0, 1, 2, 3];

    switch (b.style) {
      case 0: {
        S.boxs(x0, 0, z0, x1, h, z1, color);
        S.boxs(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.5, z1 + 0.05, tint(color, -0.25));
        S.boxs(x0 - 0.25, h - 0.5, z0 - 0.25, x1 + 0.25, h + 0.12, z1 + 0.25, tint(color, 0.45));
        if (rnd() < 0.45 && h < 14) {
          const roof = rnd() < 0.5 ? 0x9a4a3a : 0x4a4f63;
          S.gable(x0, z0, x1, z1, h + 0.1, 2.4, w >= d, roof, color, 0.4);
          chimney(S, x0 + w * (0.2 + rnd() * 0.6), h + 0.5, z0 + d * (0.2 + rnd() * 0.6));
        } else {
          S.boxs(x0 + 0.3, h + 0.1, z0 + 0.3, x1 - 0.3, h + 0.3, z1 - 0.3, 0x4f4a58);
          if (rnd() < 0.5) S.boxs(cx - 1, h + 0.3, cz - 0.7, cx + 1, h + 1.3, cz + 0.7, 0x9aa0a6);
          if (rnd() < 0.35) chimney(S, x0 + w * (0.2 + rnd() * 0.6), h, z0 + d * (0.2 + rnd() * 0.6));
        }
        const shut = [0x2f6b4f, 0x2d5a7a, 0x6b2f3a, 0x2e3a2c][Math.floor(rnd() * 4)]!;
        const floors = Math.max(1, Math.floor((h - 1) / 4.5));
        for (const s of outerSides) {
          const L = slen(b, s);
          const n = Math.floor((L - 1.5) / 3.4);
          if (n < 1) continue;
          const st = (L - (n - 1) * 3.4) / 2;
          for (let i = 0; i < n; i++) {
            const a = st + i * 3.4;
            for (let f = 0; f < floors; f++) {
              const y = f === 0 ? 2.2 : f * 4.5 + 2.7;
              if (y + 1.4 > h - 0.5) continue;
              if (f === 0 && (n < 3 ? i === 0 : i % 3 === 1)) doorQuad(S, b, s, a, 1.5, 2.9, 0x4a2f20);
              else win(S, G, b, s, a, y, 1.0, f === 0 ? 2.2 : 2.6, shut, 0.45, rnd);
            }
          }
          if (h >= 8) balcony(S, b, s, 4.6, 2.0, rnd, true);
        }
        break;
      }
      case 5: {
        S.boxs(x0, 0, z0, x1, h, z1, color);
        S.boxs(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.4, z1 + 0.05, tint(color, 0.5));
        const f = info.facing;
        S.gable(x0, z0, x1, z1, h, 2.6, f >= 2, rnd() < 0.5 ? 0x8a5a48 : 0x5a6a7a, color, 0.45);
        const trim = [0xffffff, 0xffe27a, 0x7ad6c8, 0xff9ab8][Math.floor(rnd() * 4)]!;
        const L = slen(b, f);
        const porch = 1.8;
        // porch: posts + shed roof (no raised floor)
        fbox(S, b, f, 0.4, 1.4, 0.22, 2.8, 0.1, porch - 0.1, trim);
        fbox(S, b, f, L - 0.4, 1.4, 0.22, 2.8, 0.1, porch - 0.1, trim);
        fbox(S, b, f, L / 2, 2.9, L, 0.2, 0, porch + 0.2, tint(trim, -0.25));
        fbox(S, b, f, L / 2, 0.35, L - 1, 0.12, 0.1, porch - 0.2, trim);
        doorQuad(S, b, f, L / 2, 1.1, 2.4, [0x2f6b8a, 0xb5412e, 0x3a7a4a][Math.floor(rnd() * 3)]!);
        for (const s of outerSides) {
          const SL = slen(b, s);
          const n = Math.floor((SL - 1.2) / 3);
          const st = (SL - (n - 1) * 3) / 2;
          for (let i = 0; i < n; i++) {
            if (s === f && n % 2 === 1 && i === (n - 1) / 2) continue;
            win(S, G, b, s, st + i * 3, 2.4, 0.9, 1.9, trim, 0.4, rnd);
          }
        }
        break;
      }
      case 1: {
        S.boxs(x0, 0, z0, x1, h, z1, color);
        S.boxs(x0 - 0.1, 0, z0 - 0.1, x1 + 0.1, 0.8, z1 + 0.1, tint(color, -0.3));
        S.boxs(x0 - 0.1, h * 0.55, z0 - 0.1, x1 + 0.1, h * 0.55 + 0.35, z1 + 0.1, tint(color, -0.18));
        S.boxs(x0 - 0.2, h - 0.35, z0 - 0.2, x1 + 0.2, h + 0.15, z1 + 0.2, tint(color, -0.2));
        S.gable(x0, z0, x1, z1, h + 0.1, 1.5, w >= d, 0x78858c, color, 0.3);
        for (let i = 0; i < 3; i++) {
          const vx = x0 + w * (0.2 + 0.3 * i);
          const vz = cz + (rnd() - 0.5) * d * 0.3;
          S.cyl(vx, h + 1.2, vz, 0.55, 0.55, 1.2, 6, 0x6a737a);
          S.cyl(vx, h + 2.4, vz, 0.9, 0, 0.5, 6, 0x50575c);
        }
        const f = info.facing;
        const L = slen(b, f);
        const nd = L > 20 ? 2 : 1;
        for (let k = 0; k < nd; k++) {
          const a = nd === 1 ? L / 2 : L * (0.3 + 0.4 * k);
          fquad(S, b, f, a, 2.3, 4.6, 4.6, 0.06, 0x4f5c68);
          for (let j = 0; j < 5; j++) fquad(S, b, f, a, 0.6 + j * 0.9, 4.6, 0.12, 0.09, 0x2d343a);
          fquad(G, b, f, a - 3.4, 3.6, 0.6, 0.3, 0.07, 0xffd070);
        }
        for (const s of allSides) {
          const SL = slen(b, s);
          const n = Math.floor((SL - 2) / 5);
          const st = (SL - (n - 1) * 5) / 2;
          for (let i = 0; i < n; i++) {
            const on = rnd() < 0.35;
            fquad(on ? G : S, b, s, st + i * 5, h - 2.4, 1.6, 1.0, 0.06, on ? 0xffd070 : 0x2d3340);
          }
        }
        if (b.sign) {
          const sw = Math.min(L - 3, 16);
          addSign(b, f, L / 2, Math.min(h - 3.4, 8), sw, sw / 4, 0.12, b.sign, "paint", 0x2c3338);
        }
        break;
      }
      case 2: {
        const f = info.facing;
        const L = slen(b, f);
         S.boxs(x0, 0, z0, x1, h, z1, color);
        S.boxs(x0 - 0.2, 0, z0 - 0.2, x1 + 0.2, 0.9, z1 + 0.2, 0xd6cfc0);
        S.boxs(x0 - 0.35, h - 0.6, z0 - 0.35, x1 + 0.35, h + 0.1, z1 + 0.35, 0xfffaf0);
        S.gable(x0, z0, x1, z1, h + 0.05, 2.8, w >= d, 0x55596a, color, 0.5);
        chimney(S, x0 + 1.5, h + 0.8, cz);
        chimney(S, x1 - 1.5, h + 0.8, cz);
        const pd = 3.0;
        // wrap porch: low slab (visual), roof and columns
        S.boxs(x0 - pd, 0, z0 - pd, x1 + pd, 0.1, z1 + pd, 0xe6dfd0, true);
        S.boxs(x0 - pd - 0.3, 5.2, z0 - pd - 0.3, x1 + pd + 0.3, 5.55, z1 + pd + 0.3, 0xfffaf0);
        S.boxs(x0 - pd - 0.3, 5.55, z0 - pd - 0.3, x1 + pd + 0.3, 5.7, z1 + pd + 0.3, 0x7a7e8e);
        const colr = (px: number, pz: number) => S.cyl(px, 0.1, pz, 0.3, 0.27, 5.1, 8, 0xfffaf0);
        for (let a = x0 - pd + 0.3; a <= x1 + pd - 0.2; a += 3.3) {
          colr(a, z0 - pd + 0.3);
          colr(a, z1 + pd - 0.3);
        }
        for (let a = z0 - pd + 3.6; a < z1 + pd - 1; a += 3.3) {
          colr(x0 - pd + 0.3, a);
          colr(x1 + pd - 0.3, a);
        }
        // portico
        const p1 = fpt(b, f, L / 2 - 5.2, 0, 0);
        const p2 = fpt(b, f, L / 2 + 5.2, 0, pd + 0.6);
        const px0 = Math.min(p1[0], p2[0]);
        const px1 = Math.max(p1[0], p2[0]);
        const pz0 = Math.min(p1[2], p2[2]);
        const pz1 = Math.max(p1[2], p2[2]);
        S.boxs(px0, h - 1.2, pz0, px1, h - 0.5, pz1, 0xfffaf0);
        S.gable(px0, pz0, px1, pz1, h - 0.5, 2.3, f < 2, 0xe9e3d4, 0xf6f0e4, 0.2);
        for (const o of [-4.4, -1.5, 1.5, 4.4]) {
          const [qx, , qz] = fpt(b, f, L / 2 + o, 0, pd - 0.4);
          S.cyl(qx, 5.55, qz, 0.38, 0.34, h - 1.2 - 5.55, 8, 0xfffaf0);
        }
        // second-floor balcony railing on porch roof (front)
        for (let a = L / 2 - 5.2; a <= L / 2 + 5.2; a += 1.3) fbox(S, b, f, a, 6.1, 0.07, 1.0, pd - 0.1, pd, 0x1f2128);
        fbox(S, b, f, L / 2, 6.6, 10.4, 0.07, pd - 0.1, pd, 0x1f2128);
        // doors and windows
        doorQuad(S, b, f, L / 2, 2.2, 3.5, 0x2a2a30);
        fquad(G, b, f, L / 2, 4.3, 1.8, 0.5, 0.08, 0xffd890);
        for (const s of allSides) {
          const SL = slen(b, s);
          const n = Math.floor((SL - 2) / 3.6);
          const st = (SL - (n - 1) * 3.6) / 2;
          for (let i = 0; i < n; i++) {
            const a = st + i * 3.6;
            if (!(s === f && Math.abs(a - L / 2) < 1.8)) win(S, G, b, s, a, 2.6, 1.1, 3.0, 0x2a3a2e, 0.35, rnd);
            if (h > 8.5) win(S, G, b, s, a, 7.6, 1.1, 2.6, 0x2a3a2e, 0.4, rnd);
          }
        }
        if (b.sign) addSign(b, f, L / 2 - 8, 4.3, 5.2, 1.3, pd + 0.1, b.sign, "wood", 0xf2d27a);
        break;
      }
      case 3:
      case 10: {
        const big = b.style === 10;
        const raise = big ? 1.4 : 1.7;
        const wood = b.color;
        const cabin = big ? { x0: x0 + 1, x1: x1 - 5, z0: z0 + 1.5, z1: z1 - 3 } : { x0: x0 + 0.5, x1: x1 - 0.5, z0: z0 + 0.5, z1: z1 - 0.5 };
        // stilts
        const nx = Math.max(2, Math.round((cabin.x1 - cabin.x0) / 4.5) + 1);
        const nz = Math.max(2, Math.round((cabin.z1 - cabin.z0) / 4.5) + 1);
        for (let i = 0; i < nx; i++) {
          for (let k = 0; k < nz; k++) {
            if (i > 0 && i < nx - 1 && k > 0 && k < nz - 1) continue;
            const px = cabin.x0 + 0.3 + ((cabin.x1 - cabin.x0 - 0.6) * i) / (nx - 1);
            const pz = cabin.z0 + 0.3 + ((cabin.z1 - cabin.z0 - 0.6) * k) / (nz - 1);
            S.boxs(px - 0.2, 0, pz - 0.2, px + 0.2, raise + 0.2, pz + 0.2, tint(wood, -0.35));
          }
        }
        const top = big ? 4.4 : 4.0;
        S.boxs(cabin.x0 - 0.5, raise - 0.15, cabin.z0 - 0.5, cabin.x1 + 0.5, raise + 0.1, cabin.z1 + 0.5, tint(wood, -0.2), false);
        S.boxs(cabin.x0, raise + 0.1, cabin.z0, cabin.x1, top, cabin.z1, wood);
        for (let y = raise + 0.7; y < top - 0.2; y += 0.7) S.boxs(cabin.x0 - 0.03, y, cabin.z0 - 0.03, cabin.x1 + 0.03, y + 0.07, cabin.z1 + 0.03, tint(wood, -0.15));
        const tin = rnd() < 0.5 ? 0x9aa5a8 : 0xa0643c;
        S.gable(cabin.x0, cabin.z0, cabin.x1, cabin.z1, top, big ? 1.8 : 1.5, cabin.x1 - cabin.x0 >= cabin.z1 - cabin.z0, tin, tint(wood, -0.1), 0.7);
        S.cyl((cabin.x0 + cabin.x1) / 2 + 1, top + 0.8, (cabin.z0 + cabin.z1) / 2, 0.18, 0.18, 1.6, 6, 0x4a4a4e);
        const cb: Sided = cabin;
        for (const s of allSides) {
          const SL = slen(cb, s);
          const n = Math.max(1, Math.floor((SL - 1) / 3.5));
          const st = (SL - (n - 1) * 3.5) / 2;
          for (let i = 0; i < n; i++) {
            const a = st + i * 3.5;
            win(S, G, cb, s, a, raise + 1.3, 0.9, 1.1, tint(wood, -0.3), 0.6, rnd, 0x2d3320);
          }
        }
        // porch on the facing side with railing and steps
        const f = big ? 1 : info.facing;
        const L = slen(cb, f);
        fbox(S, cb, f, L / 2, raise - 0.02, L + 1, 0.16, 0.2, 1.6, tint(wood, 0.1));
        for (const a of [0.4, L - 0.4]) fbox(S, cb, f, a, raise + 0.55, 0.12, 1.1, 1.5, 1.6, tint(wood, -0.3));
        fbox(S, cb, f, L / 2, raise + 1.05, L, 0.07, 1.5, 1.6, tint(wood, -0.3));
        for (let k = 0; k < 4; k++) fbox(S, cb, f, L / 2, (raise * (k + 0.5)) / 4, 1.4, raise / 4, 1.6 + k * 0.35, 1.95 + k * 0.35, tint(wood, 0.2));
        doorQuad(S, cb, f, L / 2, 1.0, 2.2, 0x3a2a1c);
        const [lx, , lz] = fpt(cb, f, L / 2 + 1.6, 0, 1.5);
        G.box(lx, raise + 2.3, lz, 0.3, 0.4, 0.3, 0xffc860);
        if (big) {
          airboatShack(b, cabin, raise, rnd);
        }
        break;
      }
      case 4: {
        const f = info.facing;
        const L = slen(b, f);
        S.boxs(x0, 0, z0, x1, h, z1, color);
        S.boxs(x0 - 0.2, h - 0.5, z0 - 0.2, x1 + 0.2, h + 0.4, z1 + 0.2, 0x1a1a38);
        S.boxs(x0 + 0.5, h + 0.4, z0 + 0.5, x1 - 0.5, h + 0.55, z1 - 0.5, 0x2a2a3a);
        S.boxs(x0, 0, z0, x1, 0.7, z1, 0x232344);
        // door + windows
        doorQuad(S, b, f, L / 2, 2.2, 3.0, 0x120a1a);
        fquad(neonA.at(cx, cz), b, f, L / 2, 3.35, 3.2, 0.14, 0.12, 0xff3fa8);
        for (const a of [L / 2 - 8.5, L / 2 + 8.5]) win(S, G, b, f, a, 2.1, 1.8, 2.0, 0x4a2a6a, 1, rnd, 0xff6ad0);
        awning(S, b, f, L / 2 - 4.2, L / 2 + 4.2, 3.9, 2.2, 0.8, 8, 0xf4eefc, 0x8a1f6a);
        // sign + neon outline
        const sw = 13;
        const sy = 6.5;
        addSign(b, f, L / 2, sy, sw, sw / 4, 0.22, b.sign ?? "BLUE NOTE", "neon", 0x3fe0ff, true);
        const NA = neonA.at(cx, cz);
        const NB = neonB.at(cx, cz);
        const tw = 0.14;
        fbox(NA, b, f, L / 2, sy + sw / 8 + 0.1, sw + 0.4, tw, 0.15, 0.3, 0xff3fa8);
        fbox(NA, b, f, L / 2, sy - sw / 8 - 0.1, sw + 0.4, tw, 0.15, 0.3, 0xff3fa8);
        fbox(NB, b, f, L / 2 - sw / 2 - 0.1, sy, tw, sw / 4 + 0.3, 0.15, 0.3, 0x3fe0ff);
        fbox(NB, b, f, L / 2 + sw / 2 + 0.1, sy, tw, sw / 4 + 0.3, 0.15, 0.3, 0x3fe0ff);
        for (const a of [0.15, L - 0.15]) fbox(NA, b, f, a, h / 2 + 0.5, 0.2, h - 1, 0.1, 0.3, 0x9a5bff);
        fbox(NB, b, f, L / 2, h - 0.05, L - 0.5, 0.14, 0.1, 0.3, 0xff3fa8);
        // vertical blade sign
        {
          const [bx0, , bz0] = fpt(b, f, L - 0.2, 0, 0.9);
          const side = f < 2 ? 0 : 1;
          void side;
          NB.box(bx0, 5.4, bz0, 0.25, 3.4, 1.0, 0x3fe0ff);
          NA.box(bx0, 5.4, bz0, 0.3, 3.0, 0.7, 0xff3fa8);
        }
        // patio string lights across the front
        for (let k = 0; k < 2; k++) {
          const a0 = -0.5;
          const a1 = L + 0.5;
          const yy = 3.6 + k * 0.1;
          for (let i = 0; i <= 18; i++) {
            const t = i / 18;
            const a = a0 + (a1 - a0) * t;
            const sag = Math.sin(t * Math.PI) * 0;
            const [bx2, , bz2] = fpt(b, f, a, 0, 3.2 + k * 1.5);
            const cols = [0xffd070, 0xff8ad8, 0x8affc8];
            neonB.at(bx2, bz2).box(bx2, yy - sag + Math.sin(t * Math.PI * 6) * 0.1, bz2, 0.2, 0.2, 0.2, cols[i % 3]!);
          }
        }
        for (const a of [-0.5, L + 0.5]) {
          const [bx2, , bz2] = fpt(b, f, a, 0, 3.2);
          S.cyl(bx2, 0, bz2, 0.08, 0.08, 3.8, 5, 0x222228);
        }
        for (const s of allSides) {
          if (s === f) continue;
          const SL = slen(b, s);
          const n = Math.floor((SL - 2) / 4);
          for (let i = 0; i < n; i++) win(S, G, b, s, (SL - (n - 1) * 4) / 2 + i * 4, 4.6, 1.2, 1.8, 0x2a1a4a, 0.6, rnd, 0xff6ad0);
        }
        break;
      }
      case 6: {
        const f = info.facing;
        const L = slen(b, f);
        S.boxs(x0, 0, z0, x1, h, z1, color);
        S.boxs(x0 - 0.05, 0, z0 - 0.05, x1 + 0.05, 0.6, z1 + 0.05, tint(color, -0.3));
        S.boxs(x0 - 0.3, h - 0.5, z0 - 0.3, x1 + 0.3, h + 0.3, z1 + 0.3, 0xfff0d0);
        S.boxs(x0 + 0.4, h + 0.3, z0 + 0.4, x1 - 0.4, h + 0.45, z1 - 0.4, 0x6a4a3a);
        // storefront
        for (const a of [L * 0.27, L * 0.73]) {
          fquad(S, b, f, a, 1.9, 6.0, 2.9, 0.05, 0x3a2418);
          fquad(G, b, f, a, 1.9, 5.5, 2.5, 0.08, 0xffd890);
        }
        doorQuad(S, b, f, L / 2, 1.8, 2.9, 0x3a2418);
        awning(S, b, f, 0.6, L - 0.6, 3.9, 2.6, 0.9, 14, 0xfff0d0, 0xd9421c);
        addSign(b, f, L / 2, 6.3, 15, 2.9, 0.15, b.sign ?? "MAMA NOLA'S", "warm", 0xffe9a0, true);
        const NA = neonA.at(cx, cz);
        fbox(NA, b, f, L / 2, 6.3 + 1.55, 15.5, 0.12, 0.1, 0.26, 0xffb347);
        fbox(NA, b, f, L / 2, 6.3 - 1.55, 15.5, 0.12, 0.1, 0.26, 0xffb347);
        for (let i = 0; i <= 14; i++) {
          const [bx2, , bz2] = fpt(b, f, 0.7 + i * ((L - 1.4) / 14), 0, 0.2);
          G.box(bx2, 7.95, bz2, 0.18, 0.18, 0.18, 0xfff2b0);
        }
        for (const s of allSides) {
          if (s === f) continue;
          const SL = slen(b, s);
          const n = Math.floor((SL - 2) / 4);
          for (let i = 0; i < n; i++) win(S, G, b, s, (SL - (n - 1) * 4) / 2 + i * 4, 4.5, 1.1, 1.8, 0x7a2a1a, 0.7, rnd);
        }
        break;
      }
      case 7: {
        // St. Louis Cathedral: nave + three spires, doors toward the square (south)
        const f = 1;
        const L = slen(b, f);
        const nave = 13;
        S.boxs(x0, 0, z0, x1, nave, z1, color);
        S.gable(x0, z0 + 0.5, x1, z1 - 0.5, nave, 4, true, 0x3d4252, color, 0.3);
        S.boxs(x0 - 0.1, 0, z0 - 0.1, x1 + 0.1, 1.2, z1 + 0.1, tint(color, -0.2));
        const towers: [number, number, number][] = [[L / 2, 8, 20], [L / 2 - 9.5, 5.6, 17], [L / 2 + 9.5, 5.6, 17]];
        for (const [a, tw, th] of towers) {
          const [tx, , tz] = fpt(b, f, a, 0, -0.4);
          const zc = tz - 0 * 1;
          S.boxs(tx - tw / 2, 0, zc - tw / 2 - 0.4, tx + tw / 2, th, zc + tw / 2 - 0.4, color);
          S.boxs(tx - tw / 2 - 0.25, th, zc - tw / 2 - 0.65, tx + tw / 2 + 0.25, th + 0.5, zc + tw / 2 - 0.15, tint(color, 0.3));
          const sp = a === L / 2 ? 10 : 6.5;
          S.cyl(tx, th + 0.5, zc - 0.4, tw * 0.62, 0, sp, 4, 0x3a4050, Math.PI / 4);
          S.boxs(tx - 0.12, th + 0.5 + sp, zc - 0.52, tx + 0.12, th + 1.6 + sp, zc - 0.28, 0xd8c070);
          S.boxs(tx - 0.5, th + 0.5 + sp + 0.7, zc - 0.52, tx + 0.5, th + 0.5 + sp + 0.9, zc - 0.28, 0xd8c070);
          fquad(S, b, f, a, th - 4, 1.4, 3.2, -0.4 + 0.06, 0x2a2a38);
          fquad(G, b, f, a, th - 4, 1.0, 2.8, -0.4 + 0.08, 0xffc860);
        }
        // doors and rose window
        for (const a of [L / 2 - 9.5, L / 2, L / 2 + 9.5]) doorQuad(S, b, f, a, 2.2, 4.2, 0x3a2a24);
        fquad(G, b, f, L / 2, 9.2, 2.4, 2.4, 0.1, 0xffd9a0);
        for (const s of [0, 2, 3]) {
          const SL = slen(b, s);
          const n = Math.floor((SL - 2) / 4);
          for (let i = 0; i < n; i++) win(S, G, b, s, (SL - (n - 1) * 4) / 2 + i * 4, 6.5, 1.0, 4.0, 0x3a4050, 0.6, rnd);
        }
        break;
      }
      case 8: {
        if (h >= 5) {
          highrises.push({ b, i: bi });
        } else {
          S.boxs(x0, 0, z0, x1, h, z1, color);
          S.boxs(x0 - 0.15, h, z0 - 0.15, x1 + 0.15, h + 0.25, z1 + 0.15, tint(color, -0.1));
          // pilasters on longer walls
          const long = w > d;
          const Ln = long ? w : d;
          for (let a = 3; a < Ln - 1; a += 6) {
            if (long) S.boxs(x0 + a - 0.3, 0, z0 - 0.1, x0 + a + 0.3, h, z1 + 0.1, tint(color, -0.08));
            else S.boxs(x0 - 0.1, 0, z0 + a - 0.3, x1 + 0.1, h, z0 + a + 0.3, tint(color, -0.08));
          }
        }
        break;
      }
    }
  });

  // high-rises (textured, individual meshes sharing textures)
  const hrWall = trackT(
    canvasTex(128, 256, (g) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, 128, 256);
      const r = mulberry(5);
      for (let cy = 0; cy < 8; cy++) {
        for (let cx = 0; cx < 4; cx++) {
          g.fillStyle = r() < 0.5 ? "#566a86" : "#3e4c66";
          g.fillRect(cx * 32 + 5, cy * 32 + 6, 22, 20);
        }
      }
      g.fillStyle = "rgba(0,0,0,0.12)";
      for (let cy = 0; cy < 8; cy++) g.fillRect(0, cy * 32, 128, 2);
    }),
  );
  const hrEmit = trackT(
    canvasTex(128, 256, (g) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, 128, 256);
      const r = mulberry(6);
      for (let cy = 0; cy < 8; cy++) {
        for (let cx = 0; cx < 4; cx++) {
          if (r() < 0.45) {
            g.fillStyle = r() < 0.7 ? "#ffc870" : "#ffe6b0";
            g.fillRect(cx * 32 + 5, cy * 32 + 6, 22, 20);
          }
        }
      }
    }),
  );
  for (const t of [hrWall, hrEmit]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
  }
  const hrGeos: THREE.BufferGeometry[] = [];
  for (const { b, i } of highrises) {
    const rnd = mulberry(i * 31 + 7);
    const tiers: [number, number, number, number, number][] = [];
    const w = b.x1 - b.x0;
    const d = b.z1 - b.z0;
    const cx = (b.x0 + b.x1) / 2;
    const cz = (b.z0 + b.z1) / 2;
    tiers.push([w, d, 0, b.h * 0.72, b.color]);
    tiers.push([w * 0.74, d * 0.74, b.h * 0.72, b.h, tint(b.color, 0.1)]);
    const mat = trackM(new THREE.MeshStandardMaterial({ color: b.color, map: hrWall, emissiveMap: hrEmit, emissive: 0xffffff, flatShading: true }));
    const roofMat = trackM(new THREE.MeshStandardMaterial({ color: tint(b.color, -0.35), flatShading: true }));
    for (const [tw, td, y0, y1, c] of tiers) {
      const hh = y1 - y0;
      const geo = new THREE.BoxGeometry(tw, hh, td);
      const uv = geo.attributes.uv!;
      for (let f = 0; f < 6; f++) {
        if (f === 2 || f === 3) continue;
        const u = f < 2 ? td : tw;
        for (let v = 0; v < 4; v++) {
          const k = f * 4 + v;
          uv.setXY(k, (uv.getX(k) * u) / 12.8, (uv.getY(k) * hh) / 28.8 + y0 / 28.8);
        }
      }
      uv.needsUpdate = true;
      hrGeos.push(geo);
      const m = new THREE.Mesh(geo, [mat, mat, roofMat, roofMat, mat, mat]);
      m.position.set(cx, y0 + hh / 2, cz);
      m.castShadow = true;
      m.receiveShadow = true;
      (m.material as THREE.Material[]).forEach(() => undefined);
      root.add(m);
      void c;
    }
    const S = solid.at(cx, cz);
    S.boxs(cx - 3, b.h, cz - 3, cx + 3, b.h + 2.5, cz + 3, 0x7a7f86);
    S.cyl(cx + 1, b.h + 2.5, cz, 0.15, 0.08, 9 + rnd() * 5, 5, 0xc0c4cc);
    glow.at(cx, cz).box(cx + 1, b.h + 12, cz, 0.7, 0.7, 0.7, 0xff3030);
    S.boxs(b.x0 - 0.3, b.h * 0.72 - 0.3, b.z0 - 0.3, b.x1 + 0.3, b.h * 0.72, b.z1 + 0.3, tint(b.color, 0.35));
  }

  // airboat shack extras
  function airboatShack(b: Building, cabin: Sided, raise: number, rnd: () => number) {
    const S = solid.at((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
    const G = glow.at((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
    let best: [number, number, number] = PONDS[0]!;
    let bd = 1e9;
    for (const p of PONDS) {
      const dd = Math.hypot(p[0] - (b.x0 + b.x1) / 2, p[1] - (b.z0 + b.z1) / 2);
      if (dd < bd) {
        bd = dd;
        best = p;
      }
    }
    const [px, pz, pr] = best;
    const dz = Math.max(b.z0 + 4, Math.min(b.z1 - 4, pz));
    const dockLen = Math.max(4, px - pr + 5 - b.x1);
    const wood = 0x8a6a46;
    S.boxs(b.x1, 0.2, dz - 1.6, b.x1 + dockLen, 0.4, dz + 1.6, wood, false);
    for (let a = b.x1 + 0.4; a < b.x1 + dockLen; a += 0.9) S.boxs(a, 0.4, dz - 1.6, a + 0.05, 0.42, dz + 1.6, 0x4a3822, true);
    for (let a = b.x1 + 0.8; a < b.x1 + dockLen; a += 3.2) {
      for (const sg of [-1, 1]) {
        S.boxs(a - 0.15, -1.2, dz + sg * 1.7 - 0.15, a + 0.15, 1.5, dz + sg * 1.7 + 0.15, 0x4a3822);
        G.box(a, 1.6, dz + sg * 1.7, 0.2, 0.2, 0.2, 0xffd890);
      }
    }
    // airboat
    const bx = b.x1 + dockLen - 1.5;
    const bz = dz + 3.8;
    S.xf(M(bx, 0.15, bz, 0.1), () => {
      S.box(0, 0.1, 0, 5.2, 0.5, 1.7, 0x6a8a98, 0, false);
      S.box(-3.0, 0.2, 0, 1.4, 0.3, 1.1, 0x6a8a98, 0, false);
      S.box(0, 0.4, 0, 4.9, 0.1, 1.5, 0x3a4a52, 0, false);
      S.box(0.3, 0.9, 0, 0.7, 0.9, 0.7, 0x2f3a40);
      S.box(0.3, 1.5, 0, 0.9, 0.12, 0.9, 0xc4402e);
      S.box(1.9, 0.9, 0, 1.2, 0.8, 1.0, 0x30343a);
      // fan cage
      for (const [dy, dzz] of [[-0.9, -0.9], [-0.9, 0.9], [0.9, -0.9], [0.9, 0.9]] as const) S.box(2.7, 1.6 + dy, dzz, 0.08, 0.08, 0.08, 0.0 + 0x888d92);
      for (const sg of [-1, 1]) {
        S.box(2.7, 1.6, sg * 1.0, 0.08, 2.2, 0.08, 0x9aa0a6);
        S.box(2.7, 1.6 + sg * 1.05, 0, 0.08, 0.08, 2.1, 0x9aa0a6);
        S.box(2.7, 1.6, sg * 0.5, 0.06, 2.1, 0.06, 0x9aa0a6);
      }
      S.box(2.45, 1.6, 0, 0.08, 1.9, 0.3, 0x2d2d33);
      S.box(2.45, 1.6, 0, 0.08, 0.3, 1.9, 0x2d2d33);
    });
    S.boxs(b.x0 + 2, 0, b.z1 - 1.5, b.x0 + 3, 1.4, b.z1 - 0.5, 0x6a4a2a);
    void cabin;
    void rnd;
    const fx = (b.x0 + b.x1) / 2;
    addSign(b, 1, (b.x1 - b.x0) / 2 - 2, raise + 4.8, 10, 2.5, 0.2, b.sign ?? "GATOR BAY AIRBOATS", "wood", 0xf2d27a);
    void fx;
  }

  // ── cemetery gate & caps ──
  for (const k of [150]) {
    for (const bz of [30, 90]) {
      const m = solid.at(k, bz);
      for (const sg of [-1, 1]) {
        m.boxs(k + sg * 4.3 - 0.45, 0, bz + 21.8 - 0.45, k + sg * 4.3 + 0.45, 3.4, bz + 21.8 + 0.45, 0xe4dccb);
        m.ell(k + sg * 4.3, 3.7, bz + 21.8, 0.45, 0.4, 0.45, 0xefe8d8, 6, 3, 0.05);
      }
      for (let a = -3.6; a <= 3.6; a += 0.6) m.boxs(k + a - 0.03, 0, bz + 21.9, k + a + 0.03, 2.6, bz + 22.0, 0x1f2128);
      m.boxs(k - 3.9, 2.6, bz + 21.88, k + 3.9, 2.7, bz + 22.02, 0x1f2128);
    }
  }

  // ── props ──
  const pools: [number, number][] = [];
  type Moss = { x: number; y: number; z: number; len: number; c: number };
  const moss: Moss[] = [];
  const mossCols = [0x9aa585, 0x8a9a78, 0xa8b090];
  const addMoss = (x: number, y: number, z: number, rx: number, ry: number, n: number, minL: number, maxL: number, rnd: () => number) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU;
      const rr = rx * (0.4 + rnd() * 0.6);
      moss.push({ x: x + Math.cos(a) * rr, y: y + (rnd() - 0.5) * ry, z: z + Math.sin(a) * rr, len: minL + rnd() * (maxL - minL), c: mossCols[i % 3]! });
    }
  };
  const lampSpot = (x: number, z: number) => {
    const m = solid.at(x, z);
    m.cyl(x, 0, z, 0.22, 0.14, 0.6, 6, 0x23252b);
    m.cyl(x, 0.6, z, 0.09, 0.07, 3.9, 6, 0x23252b);
    m.cyl(x, 4.5, z, 0.16, 0.1, 0.25, 6, 0x23252b);
    m.cyl(x, 5.15, z, 0.4, 0, 0.45, 4, 0x23252b, Math.PI / 4);
    m.box(x, 5.0, z, 0.55, 0.12, 0.55, 0x23252b);
     glow.at(x, z).box(x, 4.75, z, 0.38, 0.55, 0.38, 0xffd27a);
    pools.push([x, z]);
  };

  PROPS.forEach((p: Prop, pi) => {
    const rnd = mulberry(pi * 977 + 5);
    const S = solid.at(p.x, p.z);
    const s = p.s;
    const yaw = rnd() * TAU;
    switch (p.kind) {
      case "oak": {
        S.xf(M(p.x, 0, p.z, yaw, 0, s), () => {
          S.cyl(0, 0, 0, 0.95, 0.6, 3.4, 7, 0x5a4332);
          S.cyl(0, 3.2, 0, 0.6, 0.5, 1.0, 7, 0x5a4332);
          S.tube(0, 3.4, 0, 2.6, 5.0, 0.8, 0.3, 0.2, 5, 0x5a4332);
          S.tube(0, 3.4, 0, -2.4, 4.6, -1.0, 0.3, 0.2, 5, 0x5a4332);
          const g = [0x3f7a3a, 0x4a8a40, 0x376b36, 0x558f45];
          S.ell(0, 5.6, 0, 4.6, 2.0, 4.4, g[0]!, 8, 4);
          S.ell(3.0, 4.9, 1.4, 3.2, 1.7, 3.0, g[1]!, 7, 4);
          S.ell(-3.0, 5.0, -1.2, 3.2, 1.7, 3.0, g[2]!, 7, 4);
          S.ell(0.6, 6.5, -1.6, 2.8, 1.6, 2.6, g[3]!, 7, 4);
          S.ell(-0.8, 4.8, 3.0, 2.6, 1.4, 2.4, g[1]!, 7, 3);
        });
        addMoss(p.x, 4.5 * s, p.z, 4.4 * s, 0.6, Math.round(9 * Math.min(1.5, s)), 1.2 * s, 2.6 * s, rnd);
        break;
      }
      case "cypress": {
        S.xf(M(p.x, 0, p.z, yaw, 0, s), () => {
          S.cyl(0, 0, 0, 1.6, 0.6, 3.2, 8, 0x6a5238);
          S.cyl(0, 3.1, 0, 0.6, 0.38, 5.2, 7, 0x6a5238);
          for (let k = 0; k < 4; k++) {
            const a = (k / 4) * TAU + 0.5;
            S.cyl(Math.cos(a) * 2.1, 0, Math.sin(a) * 2.1, 0.35, 0.1, 0.5 + (k % 2) * 0.5, 5, 0x5a4630);
          }
          S.ell(0, 8.8, 0, 2.6, 2.6, 2.6, 0x4f7a3a, 7, 4);
          S.ell(1.6, 7.4, 0.8, 2.0, 1.8, 2.0, 0x5d8a44, 7, 3);
          S.ell(-1.5, 7.1, -0.7, 2.1, 1.8, 2.0, 0x456f36, 7, 3);
          S.ell(0, 10.4, 0, 1.4, 1.2, 1.4, 0x6a9a4a, 6, 3);
        });
        addMoss(p.x, 7.4 * s, p.z, 2.4 * s, 0.6, Math.round(8 * Math.min(1.4, s)), 1.6 * s, 3.4 * s, rnd);
        break;
      }
      case "palm": {
        S.xf(M(p.x, 0, p.z, yaw, 0, s), () => {
          const lean = 0.5 + rnd() * 0.5;
          const pts: P3[] = [[0, 0, 0], [lean * 0.4, 2.6, 0], [lean * 1.0, 5.2, 0.1], [lean * 1.9, 7.6, 0.2]];
          for (let i = 0; i < 3; i++) S.tube(...pts[i]!, ...pts[i + 1]!, 0.33 - i * 0.05, 0.28 - i * 0.05, 6, i % 2 ? 0x8a6a4a : 0x7a5c40);
          const top = pts[3]!;
          for (let k = 0; k < 7; k++) {
            const m = M(top[0], top[1], top[2], (k / 7) * TAU + 0.3, 0.25);
            S.xf(m, () => {
              S.box(0, 0, 1.4, 0.7, 0.07, 2.8, k % 2 ? 0x3f8a3a : 0x4a9a42, 0, false);
              S.xf(M(0, 0, 2.8, 0, 0.7), () => S.box(0, 0, 0.9, 0.55, 0.06, 1.8, 0x357a34, 0, false));
            });
          }
          S.ell(top[0], top[1] - 0.2, top[2], 0.3, 0.3, 0.3, 0x5a3a22, 5, 3);
        });
        break;
      }
      case "lamp": {
        if (!hitsBuilding(p.x, p.z, 0.2)) lampSpot(p.x, p.z);
        break;
      }
      case "tomb": {
        S.xf(M(p.x, 0, p.z, rnd() < 0.5 ? 0 : 0, 0, 1, 0, 1, s, 1), () => {
          const c = p.color;
          S.boxs(-1.2, 0, -0.9, 1.2, 0.35, 0.9, tint(c, -0.15));
          S.boxs(-1.05, 0.35, -0.75, 1.05, 1.5, 0.75, c);
          S.xf(M(0, 1.5, 0, 0, 0, 1, Math.PI / 2, 1, 1, 1), () => S.cyl(0, -1.05, 0, 0.75, 0.75, 2.1, 8, tint(c, 0.04), 0, true));
          S.boxs(-0.04, 2.25, -0.3, 0.04, 2.55, 0.3, 0x403a34);
          S.boxs(-0.04, 2.4, -0.15, 0.04, 2.48, 0.15, 0x403a34);
          S.boxs(-0.5, 0.7, 0.74, 0.5, 1.2, 0.8, 0x3a3630);
          if (rnd() < 0.5) S.boxs(-1.1, 0.4, -0.3, -0.7, 0.9, -0.2, 0xb5694f);
        });
        break;
      }
      case "crate": {
        S.xf(M(p.x, 0, p.z, 0, 0, 1, 0, s, s, s), () => {
          const c = p.color;
          S.boxs(-3, 0.2, -1.25, 3, 2.6, 1.25, c, true);
          S.boxs(-3, 0, -1.2, 3, 0.2, 1.2, 0x2a2a30, true);
          for (let x = -2.7; x <= 2.7; x += 0.6) {
            S.boxs(x - 0.1, 0.3, -1.29, x + 0.1, 2.5, -1.25, tint(c, -0.22), true);
            S.boxs(x - 0.1, 0.3, 1.25, x + 0.1, 2.5, 1.29, tint(c, -0.22), true);
          }
          S.boxs(2.95, 0.25, -1.2, 3.05, 2.55, 1.2, tint(c, -0.1), true);
          S.boxs(3.05, 0.3, -0.04, 3.1, 2.5, 0.04, 0x1e1e22, true);
          S.boxs(3.05, 1.2, -0.7, 3.14, 1.3, 0.7, 0x1e1e22, true);
          S.boxs(-3.0, 2.5, -1.28, 3.0, 2.6, 1.28, tint(c, -0.1), true);
        });
        break;
      }
      case "bench": {
        let ry = 0;
        const dx = -30 - p.x;
        const dz = 32 - p.z;
        if (Math.hypot(dx, dz) < 26) ry = Math.atan2(dx, dz);
        S.xf(M(p.x, 0, p.z, ry), () => {
          S.boxs(-1, 0.45, -0.25, 1, 0.55, 0.25, 0x8a5a36);
          S.boxs(-1, 0.55, -0.35, 1, 1.0, -0.28, 0x8a5a36);
          for (const sg of [-1, 1]) {
            S.boxs(sg * 0.9 - 0.05, 0, -0.25, sg * 0.9 + 0.05, 0.45, 0.25, 0x23252b);
            S.boxs(sg * 1.0 - 0.04, 0.45, -0.3, sg * 1.0 + 0.04, 0.75, -0.2, 0x23252b);
          }
        });
        break;
      }
      case "statue": {
        S.xf(M(p.x, 0, p.z, 0.4, 0, s), () => {
          const st = 0xb6ad98;
          S.boxs(-2.0, 0, -1.6, 2.0, 0.5, 1.6, tint(st, -0.1));
          S.boxs(-1.7, 0.5, -1.3, 1.7, 1.2, 1.3, st);
          S.boxs(-1.35, 1.2, -1.0, 1.35, 2.4, 1.0, tint(st, 0.08));
          S.boxs(-1.5, 2.4, -1.15, 1.5, 2.6, 1.15, tint(st, -0.1));
          const br = 0x7b6840;
          const pat = 0x4f8070;
          S.xf(M(0, 2.6, 0, 0, 0, 1), () => {
            S.xf(M(0, 1.2, 0, 0, -0.5, 1), () => S.ell(0, 0, 0, 0.55, 0.6, 1.25, br, 7, 4, 0.04));
            S.tube(0, 1.6, 0.9, 0, 2.5, 1.3, 0.28, 0.2, 6, br);
            S.box(0, 2.7, 1.55, 0.34, 0.4, 0.85, pat, 0.0, false);
            for (const sg of [-1, 1]) {
              S.tube(sg * 0.3, 0.9, -0.7, sg * 0.3, 0.1, -0.95, 0.16, 0.1, 5, br);
              S.tube(sg * 0.3, 1.0, 0.8, sg * 0.3, 1.7, 1.5, 0.14, 0.1, 5, br);
              S.tube(sg * 0.3, 1.7, 1.5, sg * 0.3, 1.3, 1.9, 0.1, 0.08, 5, br);
            }
            S.tube(0, 1.1, -1.0, 0, 0.3, -1.6, 0.12, 0.2, 5, br);
            S.ell(0, 2.2, -0.15, 0.32, 0.5, 0.3, pat, 6, 3);
            S.ell(0, 2.95, -0.15, 0.24, 0.24, 0.24, br, 6, 3);
            S.box(0, 3.15, -0.15, 0.55, 0.06, 0.55, br);
            S.tube(0.2, 2.4, -0.15, 0.7, 3.3, 0.2, 0.08, 0.06, 4, br);
          });
        });
        break;
      }
      case "fountain": {
        S.xf(M(p.x, 0, p.z, 0, 0, s), () => {
          S.cyl(0, 0, 0, 2.4, 2.3, 0.8, 12, 0xcfc6b0, 0, false);
          S.cyl(0, 0.8, 0, 2.0, 2.0, 0.02, 12, 0x4aa8c8);
          S.cyl(0, 0.8, 0, 0.35, 0.3, 1.8, 7, 0xcfc6b0);
          S.cyl(0, 2.1, 0, 1.2, 0.5, 0.35, 10, 0xcfc6b0);
          S.cyl(0, 2.45, 0, 0.9, 0.9, 0.04, 10, 0x7fd0e8);
          S.cyl(0, 2.45, 0, 0.12, 0.08, 1.0, 6, 0xcfc6b0);
          S.ell(0, 3.55, 0, 0.35, 0.35, 0.35, 0xd8f4ff, 6, 3, 0);
        });
        break;
      }
    }
  });

  // decor: sidewalk lamps, hydrants, dumpsters, street signs
  {
    const r = mulberry(31337);
    for (const bz of BLOCK_CENTERS_Z) {
      for (const bx of BLOCK_CENTERS_X) {
        const d = districtAt(bx, bz);
        if (d === 4) continue;
        const H = BLOCK_HALF + 1;
        for (const side of [0, 1, 2, 3]) {
          const horiz = side < 2;
          const fix = (side % 2 === 0 ? -1 : 1) * H;
          if (r() < 0.55) {
            const u = (r() - 0.5) * 30;
            const x = horiz ? bx + u : bx + fix;
            const z = horiz ? bz + fix : bz + u;
            if (Math.abs(x + 60) < 8 && !horiz) {
              /* leave the streetcar line clear */
            }
            lampSpot(x, z);
          }
          if (r() < 0.3) {
            const u = (r() - 0.5) * 34;
            const x = horiz ? bx + u : bx + fix;
            const z = horiz ? bz + fix : bz + u;
            const S = solid.at(x, z);
            S.cyl(x, 0.1, z, 0.2, 0.2, 0.55, 7, 0xc0392b);
            S.cyl(x, 0.65, z, 0.24, 0.0, 0.2, 7, 0xa5281d);
            S.box(x, 0.45, z, 0.6, 0.12, 0.12, 0xc0392b, 0, false);
            S.cyl(x, 0.1, z, 0.28, 0.24, 0.12, 7, 0xe8c04a);
          } else if (r() < 0.18) {
            const u = (r() - 0.5) * 34;
            const x = horiz ? bx + u : bx + fix;
            const z = horiz ? bz + fix : bz + u;
            const S = solid.at(x, z);
            const c = [0x2f5d3a, 0x3a4a6a, 0x4a4f55][Math.floor(r() * 3)]!;
            S.box(x, 0.8, z, horiz ? 2.0 : 1.1, 1.3, horiz ? 1.1 : 2.0, c, 0, false);
            S.box(x, 1.5, z, horiz ? 2.1 : 1.2, 0.12, horiz ? 1.2 : 2.1, tint(c, -0.3), 0, false);
          }
        }
      }
    }
    for (const sx of STREETS) {
      for (const sz of STREETS) {
        if (r() > 0.5) continue;
        const x = sx + 5.9;
        const z = sz + 5.9;
        const S = solid.at(x, z);
        S.cyl(x, 0, z, 0.06, 0.06, 3.4, 5, 0x3a3d44);
        S.box(x, 3.25, z, 1.1, 0.28, 0.06, 0x1d6b4a);
        S.box(x, 2.9, z, 0.06, 0.28, 1.1, 0x1d6b4a);
        S.box(x, 3.25, z + 0.04, 0.9, 0.05, 0.02, 0xf0f0f0);
        S.box(x + 0.04, 2.9, z, 0.02, 0.05, 0.9, 0xf0f0f0);
      }
    }
  }

  // ── Bourbon Street: hanging neon + string lights ──
  {
    const names = [0xff3fa8, 0x3fe0ff, 0xffb347, 0x6dff7a, 0xb06bff];
    let k = 0;
    for (let z = -196; z < 168; z += 13) {
      k++;
      const sgn = k % 2 ? 1 : -1;
      const x = sgn * 7.0;
      if (!hitsBuilding(sgn * 7.4, z)) continue;
      const c = names[k % names.length]!;
      const NA = (k % 2 ? neonA : neonB).at(x, z);
      const S = solid.at(x, z);
      S.box(x - sgn * 0.9, 5.6, z, 1.8, 0.07, 0.07, 0x23252b);
      NA.box(x - sgn * 1.7, 5.0, z, 0.14, 1.4, 1.0, tint(c, -0.2));
      NA.box(x - sgn * 1.7, 5.0, z, 0.2, 1.0, 0.65, tint(c, 0.4));
      S.box(x - sgn * 1.7, 5.8, z, 0.05, 0.4, 0.05, 0x23252b);
    }
    const bulbs = [0xb04aff, 0x4aff7a, 0xffc830];
    for (let z = -190; z < 170; z += 22) {
      if (!hitsBuilding(-7.4, z) || !hitsBuilding(7.4, z)) continue;
      const S = solid.at(0, z);
      const NB = neonB.at(0, z);
      let prev: P3 | null = null;
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const x = -6.9 + 13.8 * t;
        const y = 9.2 - Math.sin(t * Math.PI) * 1.1;
        if (prev) S.tube(prev[0], prev[1], prev[2], x, y, z, 0.02, 0.02, 3, 0x23252b);
        prev = [x, y, z];
        if (i > 0 && i < 12) NB.box(x, y - 0.2, z, 0.26, 0.26, 0.26, bulbs[(i + (z | 0)) % 3 === 0 ? 0 : i % 3]!);
      }
    }
  }

  // ── casino riverboat ──
  const paddle = new THREE.Group();
  {
    const x0 = 18;
    const x1 = 82;
    const z0 = 208;
    const z1 = 222;
    const zm = (z0 + z1) / 2;
    const S = solid.at(50, zm);
    const G = glow.at(50, zm);
    const NB = neonB.at(50, zm);
    const NA = neonA.at(50, zm);
    S.boxs(x0, -0.4, z0 - 0.6, x1, 1.3, z1 + 0.6, 0x2a2a3a, false);
    S.boxs(x0, 1.3, z0 - 0.6, x1, 1.9, z1 + 0.6, 0xb5252e, false);
    S.prismTri([x0 - 7, zm], [x0, z0 - 0.6], [x0, z1 + 0.6], -0.4, 1.3, 0x2a2a3a);
    S.prismTri([x0 - 7, zm], [x0, z0 - 0.6], [x0, z1 + 0.6], 1.3, 1.9, 0xb5252e);
    const white = 0xf6f2e8;
    const decks: [number, number, number, number, number][] = [
      [1.9, 4.8, 1.0, 0.8, 0],
      [4.8, 7.6, 4.0, 1.8, 0],
      [7.6, 9.8, 18, 3.0, 0],
    ];
    decks.forEach(([ya, yb, ex, sz2, _u], di) => {
      const bx0 = x0 + ex;
      const bx1 = x1 - ex * 0.55;
      const bz0 = z0 + sz2;
      const bz1 = z1 - sz2;
      S.boxs(bx0, ya, bz0, bx1, yb, bz1, white, false);
      S.boxs(bx0 - 0.6, yb, bz0 - 0.9, bx1 + 0.6, yb + 0.3, bz1 + 0.9, 0xc4262e, false);
      // rails around the deck below roof edge
      const cb: Sided = { x0: bx0, x1: bx1, z0: bz0, z1: bz1 };
      for (const s of [0, 1]) {
        const L = slen(cb, s);
        const n = Math.floor((L - 2) / 2.4);
        const st = (L - (n - 1) * 2.4) / 2;
        for (let i = 0; i < n; i++) {
          const a = st + i * 2.4;
          const on = (i + di) % 4 !== 3;
          fquad(on ? G : S, cb, s, a, ya + 1.5, 1.3, 1.3, 0.05, on ? 0xffd890 : 0x2d3350);
          fquad(S, cb, s, a - 0.85, ya + 1.5, 0.4, 1.3, 0.05, 0xb5252e);
          fquad(S, cb, s, a + 0.85, ya + 1.5, 0.4, 1.3, 0.05, 0xb5252e);
        }
        fbox(NB, cb, s, L / 2, yb - 0.1, L, 0.12, 0.1, 0.25, [0xffc830, 0xff3fa8, 0x3fe0ff][di]!);
      }
      for (const s of [2, 3]) {
        const L = slen(cb, s);
        const n = Math.floor((L - 1) / 2.6);
        for (let i = 0; i < n; i++) fquad(G, cb, s, (L - (n - 1) * 2.6) / 2 + i * 2.6, ya + 1.5, 1.2, 1.2, 0.05, 0xffd890);
      }
    });
    // outer walkway rails (first deck)
    for (let x = x0 + 1; x < x1; x += 2.5) {
      S.boxs(x - 0.03, 1.9, z0 - 0.45, x + 0.03, 2.9, z0 - 0.39, 0xf6f2e8, true);
      S.boxs(x - 0.03, 1.9, z1 + 0.39, x + 0.03, 2.9, z1 + 0.45, 0xf6f2e8, true);
    }
    S.boxs(x0, 2.85, z0 - 0.47, x1, 2.95, z0 - 0.37, 0xf6f2e8, true);
    S.boxs(x0, 2.85, z1 + 0.37, x1, 2.95, z1 + 0.47, 0xf6f2e8, true);
    // pilot house
    S.boxs(x0 + 22, 9.8, zm - 2.6, x0 + 30, 12.2, zm + 2.6, white, false);
    S.boxs(x0 + 21.5, 12.2, zm - 3.0, x0 + 30.5, 12.6, zm + 3.0, 0xc4262e, false);
    for (const s of [0, 1]) {
      const cb: Sided = { x0: x0 + 22, x1: x0 + 30, z0: zm - 2.6, z1: zm + 2.6 };
      for (let i = 0; i < 3; i++) fquad(G, cb, s, 1.3 + i * 2.7, 11.0, 1.6, 1.1, 0.05, 0xffe0a0);
    }
    // smokestacks
    for (const sx of [48, 60]) {
      S.cyl(sx, 9.8, zm, 1.2, 1.1, 8, 10, 0x1a1a20, 0, false);
      S.cyl(sx, 14.0, zm, 1.35, 1.35, 0.7, 10, 0xc4262e);
      S.cyl(sx, 17.0, zm, 1.4, 1.7, 0.9, 10, 0x1a1a20);
      S.cyl(sx, 17.9, zm, 1.7, 1.5, 0.15, 10, 0x0e0e12);
      S.cyl(sx, 16.3, zm, 1.38, 1.38, 0.5, 10, 0xe8c040);
    }
    S.tube(54, 17.5, zm, 54, 12.5, zm - 2.5, 0.05, 0.05, 3, 0x23252b);
    // signs on both long sides (deck 2)
    const cb2: Sided = { x0: x0 + 4, x1: x1 - 2.2, z0: z0 + 1.8, z1: z1 - 1.8 };
    addSign(cb2, 0, 30, 6.2, 26, 2.6, 0.2, "RIVERBOAT CASINO", "casino", 0xffc830, true);
    addSign(cb2, 1, 30, 6.2, 26, 2.6, 0.2, "RIVERBOAT CASINO", "casino", 0xffc830, true);
    fbox(NA, cb2, 0, 30, 7.55, 27, 0.14, 0.15, 0.3, 0xff3fa8);
    fbox(NA, cb2, 1, 30, 7.55, 27, 0.14, 0.15, 0.3, 0xff3fa8);
    fbox(NA, cb2, 0, 30, 4.9, 27, 0.14, 0.15, 0.3, 0xff3fa8);
    fbox(NA, cb2, 1, 30, 4.9, 27, 0.14, 0.15, 0.3, 0xff3fa8);
    // paddle wheel at the stern (east)
    {
      const pm = new Mesher(true);
      const red = 0xc4262e;
      const wz = 4.2;
      pm.xf(M(0, 0, 0, 0, 0, 1), () => {
        for (const sg of [-1, 1]) {
          pm.xf(M(0, 0, sg * wz, 0, Math.PI / 2, 1), () => pm.cyl(0, -0.15, 0, 0.6, 0.6, 0.3, 8, 0x2a2a30, 0, true));
        }
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * TAU;
          pm.xf(M(0, 0, 0, 0, 0, 1, a), () => {
            pm.box(0, 3.1, 0, 0.28, 1.7, wz * 2, red, 0, false);
            for (const sg of [-1, 1]) pm.box(0, 1.8, sg * wz, 0.18, 3.4, 0.2, 0xf4efe0, 0, false);
          });
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pm.pos, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(pm.nor, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(pm.col, 3));
      const mesh = new THREE.Mesh(g, trackM(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true })));
      mesh.castShadow = true;
      paddle.add(mesh);
      paddle.position.set(x1 + 3.2, 3.9, zm);
      root.add(paddle);
      // wheel housing
      S.boxs(x1 - 1, 1.9, zm - wz - 0.7, x1 + 6.8, 2.2, zm + wz + 0.7, 0xc4262e, false);
      for (const sg of [-1, 1]) S.boxs(x1 + 0.5, 1.9, zm + sg * (wz + 0.5) - 0.12, x1 + 6.2, 8.2, zm + sg * (wz + 0.5) + 0.12, 0xf6f2e8, false);
      S.boxs(x1 + 0.3, 8.0, zm - wz - 0.6, x1 + 6.4, 8.3, zm + wz + 0.6, 0xc4262e, false);
    }
    // string lights around the pier deck
    const lightsOn = (ax: number, az: number, bx2: number, bz2: number, n: number, y: number) => {
      const cols = [0xffd070, 0xff8ad8, 0x8affc8, 0xffa040];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const x = ax + (bx2 - ax) * t;
        const z = az + (bz2 - az) * t;
        const yy = y - Math.sin(t * Math.PI * n * 0.5) * 0.0 - Math.abs(Math.sin(t * Math.PI * (n / 3))) * 0.5;
        (i % 2 ? NB : G).box(x, yy, z, 0.24, 0.24, 0.24, cols[i % 4]!);
      }
    };
    for (const [px, pz] of [[9, 205], [91, 205], [9, 227], [91, 227], [50, 205], [50, 227]] as const) S.cyl(px, 0, pz, 0.1, 0.1, 4.6, 5, 0x3a3d44);
    lightsOn(9, 205, 50, 205, 28, 4.5);
    lightsOn(50, 205, 91, 205, 28, 4.5);
    lightsOn(9, 227, 50, 227, 28, 4.5);
    lightsOn(50, 227, 91, 227, 28, 4.5);
    lightsOn(9, 205, 9, 227, 16, 4.5);
    lightsOn(91, 205, 91, 227, 16, 4.5);
  }

  // ── decks, river, floodwall, ponds ──
  const woodTex = trackT(
    canvasTex(128, 128, (g) => {
      g.fillStyle = "#8f6d47";
      g.fillRect(0, 0, 128, 128);
      const r = mulberry(8);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = `rgb(${130 + r() * 25},${95 + r() * 20},${60 + r() * 15})`;
        g.fillRect(0, i * 16 + 1, 128, 14);
      }
      g.fillStyle = "rgba(30,20,10,0.55)";
      for (let i = 0; i < 8; i++) g.fillRect(0, i * 16, 128, 2);
    }),
  );
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  const deckMat = trackM(new THREE.MeshStandardMaterial({ map: woodTex }));
  const deckSideMat = trackM(new THREE.MeshStandardMaterial({ color: 0x5a4328 }));
  DECKS.forEach((dk) => {
    const w = dk.x1 - dk.x0;
    const d = dk.z1 - dk.z0;
    const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), deckMat.clone());
    const tm = top.material as THREE.MeshStandardMaterial;
    tm.map = woodTex.clone();
    tm.map.wrapS = tm.map.wrapT = THREE.RepeatWrapping;
    tm.map.repeat.set(w / 3, d / 3);
    tm.map.needsUpdate = true;
    mats.push(tm);
    texs.push(tm.map);
    top.rotation.x = -Math.PI / 2;
      top.position.set((dk.x0 + dk.x1) / 2, 0.05, (dk.z0 + dk.z1) / 2);
    top.receiveShadow = true;
    root.add(top);
    const side = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), deckSideMat);
    side.position.set((dk.x0 + dk.x1) / 2, -0.21, (dk.z0 + dk.z1) / 2);
    root.add(side);
    const S = solid.at((dk.x0 + dk.x1) / 2, (dk.z0 + dk.z1) / 2);
    // pilings
    for (let x = dk.x0 + 0.3; x <= dk.x1 - 0.2; x += 6) {
      for (const z of [dk.z0 + 0.3, dk.z1 - 0.3]) S.boxs(x - 0.25, -3.2, z - 0.25, x + 0.25, 0.0, z + 0.25, 0x4a3822, true);
    }
    // railings on water edges
    const rail = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 2.5));
      const ex = bx - ax;
      const ez = bz - az;
      S.box((ax + bx) / 2, 1.0, (az + bz) / 2, Math.abs(ex) + 0.1, 0.08, Math.abs(ez) + 0.1, 0xd8cfb8, 0, false);
      S.box((ax + bx) / 2, 0.55, (az + bz) / 2, Math.abs(ex) + 0.06, 0.05, Math.abs(ez) + 0.06, 0xd8cfb8, 0, false);
      for (let i = 0; i <= n; i++) S.boxs(ax + (ex * i) / n - 0.06, 0.05, az + (ez * i) / n - 0.06, ax + (ex * i) / n + 0.06, 1.05, az + (ez * i) / n + 0.06, 0xd8cfb8, true);
    };
    if (dk === DECKS[0]) {
      rail(dk.x0 + 0.1, dk.z0 + 2, dk.x0 + 0.1, 204);
      rail(dk.x1 - 0.1, dk.z0 + 2, dk.x1 - 0.1, 204);
    } else {
      rail(dk.x0 + 0.1, dk.z0, dk.x0 + 0.1, dk.z1);
      rail(dk.x1 - 0.1, dk.z0, dk.x1 - 0.1, dk.z1);
      rail(dk.x0, dk.z1 - 0.1, dk.x1, dk.z1 - 0.1);
      rail(dk.x0, dk.z0 + 0.1, 30, dk.z0 + 0.1);
      rail(40, dk.z0 + 0.1, dk.x1, dk.z0 + 0.1);
    }
  });

  // floodwall along the river edge, gap for the pier
  {
    for (const [a0, a1] of [[-E - 8, 30], [40, E + 8]] as const) {
      const mid = (a0 + a1) / 2;
      const S = solid.at(mid, LAND_Z);
      S.boxs(a0, -1.6, LAND_Z, a1, 0.6, LAND_Z + 0.9, 0x9a9488, false);
      S.boxs(a0, 0.6, LAND_Z - 0.05, a1, 0.8, LAND_Z + 1.0, 0xb8b2a2, false);
    }
    for (let x = -E; x <= E; x += 3) {
      if (x > 28 && x < 42) continue;
      const S = solid.at(x, LAND_Z);
      S.boxs(x - 0.05, 0.8, LAND_Z + 0.35, x + 0.05, 1.8, LAND_Z + 0.45, 0x23252b);
    }
    for (const [a0, a1] of [[-E, 29], [41, E]] as const) {
      solid.at((a0 + a1) / 2, LAND_Z).boxs(a0, 1.7, LAND_Z + 0.33, a1, 1.8, LAND_Z + 0.47, 0x23252b);
      solid.at((a0 + a1) / 2, LAND_Z).boxs(a0, 1.2, LAND_Z + 0.35, a1, 1.25, LAND_Z + 0.45, 0x23252b);
    }
    // bollards / mooring posts near pier
    for (const x of [-120, -60, 0, 100, 160]) {
      const S = solid.at(x, LAND_Z);
      S.cyl(x, 0, LAND_Z - 1.4, 0.22, 0.18, 0.8, 6, 0x2a2c34);
    }
  }

  // river
  const waterTex = trackT(
    canvasTex(256, 256, (g) => {
      g.fillStyle = "#8a7a48";
      g.fillRect(0, 0, 256, 256);
      const r = mulberry(21);
      for (let i = 0; i < 160; i++) {
        g.fillStyle = r() < 0.5 ? "rgba(255,200,140,0.22)" : "rgba(60,70,40,0.25)";
        const w = 10 + r() * 36;
        g.fillRect(r() * 256, r() * 256, w, 2 + r() * 3);
      }
    }),
  );
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping;
  waterTex.repeat.set(26, 6);
  const FAR_BANK = 380;
  const RX = 520;
  const RW = 84;
  const RD = 18;
  const riverGeo = new THREE.PlaneGeometry(RX * 2, FAR_BANK - LAND_Z, RW, RD);
  riverGeo.rotateX(-Math.PI / 2);
  riverGeo.translate(0, -0.5, (LAND_Z + FAR_BANK) / 2);
  const riverBase = Float32Array.from(riverGeo.attributes.position!.array as ArrayLike<number>);
  const riverMat = trackM(new THREE.MeshPhongMaterial({ color: 0x8c8450, map: waterTex, specular: 0xffc890, shininess: 55, flatShading: true }));
  const river = new THREE.Mesh(riverGeo, riverMat);
  river.receiveShadow = true;
  river.frustumCulled = false;
  root.add(river);
  {
    const gm = ground.at(0, 300);
    gm.gq(-1500, LAND_Z, -RX, FAR_BANK, -0.5, 0x7a7448);
    gm.gq(RX, LAND_Z, 1500, FAR_BANK, -0.5, 0x7a7448);
    gm.gq(-1500, FAR_BANK, 1500, 1500, -0.3, 0x2f3a30);
    gm.gq(-1500, FAR_BANK - 30, 1500, FAR_BANK + 5, -0.28, 0x4a4a38);
  }

  // ponds
  const padGeo = new THREE.CircleGeometry(0.6, 7);
  padGeo.rotateX(-Math.PI / 2);
  const weedGeo = new THREE.CircleGeometry(1.7, 8);
  weedGeo.rotateX(-Math.PI / 2);
  const pondMat = trackM(new THREE.MeshStandardMaterial({ color: 0x2f3d24 }));
  const rimMat = trackM(new THREE.MeshStandardMaterial({ color: 0x4d3b28 }));
  const padMat = trackM(new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
  const weedMat = trackM(new THREE.MeshBasicMaterial({ color: 0x86b03c, transparent: true, opacity: 0.55, depthWrite: false }));
  const reedGeo = new THREE.BoxGeometry(0.08, 1.7, 0.08);
  reedGeo.translate(0, 0.85, 0);
  const reedMat = trackM(new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
  const pads = new THREE.InstancedMesh(padGeo, padMat, PONDS.length * 12);
  const weeds = new THREE.InstancedMesh(weedGeo, weedMat, PONDS.length * 5);
  const reeds = new THREE.InstancedMesh(reedGeo, reedMat, PONDS.length * 22);
  {
    const r = mulberry(555);
    const dm = new THREE.Object3D();
    const cc = new THREE.Color();
    let ip = 0;
    let iw = 0;
    let ir = 0;
    for (const [px, pz, pr] of PONDS) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(pr + 0.2, 28).rotateX(-Math.PI / 2), pondMat);
      disc.position.set(px, -0.14, pz);
      disc.receiveShadow = true;
      root.add(disc);
      const rim = new THREE.Mesh(new THREE.RingGeometry(pr - 0.4, pr + 1.5, 28).rotateX(-Math.PI / 2), rimMat);
      rim.position.set(px, 0.03, pz);
      root.add(rim);
      for (let i = 0; i < 12; i++) {
        const a = r() * TAU;
        const rr = Math.sqrt(r()) * (pr - 1.2);
        dm.position.set(px + Math.cos(a) * rr, -0.1, pz + Math.sin(a) * rr);
        dm.rotation.set(0, r() * TAU, 0);
        dm.scale.setScalar(0.7 + r() * 0.8);
        dm.updateMatrix();
        pads.setMatrixAt(ip, dm.matrix);
        pads.setColorAt(ip, cc.setHex([0x4d8a35, 0x5a9a3a, 0x3f7a30][i % 3]!));
        ip++;
      }
      for (let i = 0; i < 5; i++) {
        const a = r() * TAU;
        const rr = Math.sqrt(r()) * (pr - 2);
        dm.position.set(px + Math.cos(a) * rr, -0.09, pz + Math.sin(a) * rr);
        dm.rotation.set(0, r() * TAU, 0);
        dm.scale.setScalar(0.8 + r() * 1.2);
        dm.updateMatrix();
        weeds.setMatrixAt(iw++, dm.matrix);
      }
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU + r() * 0.2;
        const rr = pr + 0.3 + r() * 1.0;
        dm.position.set(px + Math.cos(a) * rr, 0, pz + Math.sin(a) * rr);
        dm.rotation.set((r() - 0.5) * 0.3, r() * TAU, (r() - 0.5) * 0.3);
        dm.scale.set(1, 0.7 + r() * 0.9, 1);
        dm.updateMatrix();
        reeds.setMatrixAt(ir, dm.matrix);
        reeds.setColorAt(ir, cc.setHex(r() < 0.5 ? 0x6f7a3a : 0x8a8a44));
        ir++;
      }
    }
    pads.instanceMatrix.needsUpdate = true;
    if (pads.instanceColor) pads.instanceColor.needsUpdate = true;
    reeds.instanceMatrix.needsUpdate = true;
    if (reeds.instanceColor) reeds.instanceColor.needsUpdate = true;
    root.add(pads, weeds, reeds);
  }

  // ── moss strands, lamp pools, edge forest (instanced) ──
  const mossGeo = new THREE.BoxGeometry(0.1, 1, 0.1);
  mossGeo.translate(0, -0.5, 0);
  const mossMat = trackM(new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
  const mossMesh = new THREE.InstancedMesh(mossGeo, mossMat, Math.max(1, moss.length));
  {
    const dm = new THREE.Object3D();
    const cc = new THREE.Color();
    moss.forEach((m, i) => {
      dm.position.set(m.x, m.y, m.z);
      dm.rotation.set(0, i, 0);
      dm.scale.set(1, m.len, 1);
      dm.updateMatrix();
      mossMesh.setMatrixAt(i, dm.matrix);
      mossMesh.setColorAt(i, cc.setHex(m.c));
    });
    mossMesh.count = moss.length;
    mossMesh.instanceMatrix.needsUpdate = true;
    if (mossMesh.instanceColor) mossMesh.instanceColor.needsUpdate = true;
    mossMesh.frustumCulled = false;
    root.add(mossMesh);
  }
  const poolTex = trackT(
    canvasTex(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,200,110,0.55)");
      gr.addColorStop(1, "rgba(255,170,80,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
    }),
  );
  const poolGeo = new THREE.PlaneGeometry(7, 7);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = trackM(new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  const poolMesh = new THREE.InstancedMesh(poolGeo, poolMat, Math.max(1, pools.length));
  {
    const dm = new THREE.Object3D();
    pools.forEach(([x, z], i) => {
      dm.position.set(x, 0.05, z);
      dm.updateMatrix();
      poolMesh.setMatrixAt(i, dm.matrix);
    });
    poolMesh.count = pools.length;
    poolMesh.frustumCulled = false;
    root.add(poolMesh);
  }
  const edgeGeo = new THREE.IcosahedronGeometry(1, 0);
  const edgeMat = trackM(new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
  const edgeMesh = new THREE.InstancedMesh(edgeGeo, edgeMat, 360);
  {
    const r = mulberry(1212);
    const dm = new THREE.Object3D();
    const cc = new THREE.Color();
    let n = 0;
    const put = (x: number, z: number) => {
      const sc = 4 + r() * 5;
      dm.position.set(x, sc * 0.9, z);
      dm.rotation.set(r(), r() * TAU, r());
      dm.scale.set(sc, sc * (0.9 + r() * 0.8), sc);
      dm.updateMatrix();
      edgeMesh.setMatrixAt(n, dm.matrix);
      edgeMesh.setColorAt(n, cc.setHex([0x2f5a34, 0x3a6a3a, 0x284a30, 0x4a6a3a][Math.floor(r() * 4)]!));
      n++;
    };
    for (let x = -E - 10; x <= E + 10 && n < 360; x += 10) {
      put(x + r() * 6, ZN - 12 - r() * 14);
      put(x + r() * 6, ZN - 34 - r() * 16);
    }
    for (let z = ZN; z <= LAND_Z - 6 && n < 360; z += 10) {
      put(-E - 12 - r() * 14, z + r() * 6);
      put(E + 12 + r() * 14, z + r() * 6);
    }
    edgeMesh.count = n;
    edgeMesh.instanceMatrix.needsUpdate = true;
    if (edgeMesh.instanceColor) edgeMesh.instanceColor.needsUpdate = true;
    edgeMesh.frustumCulled = false;
    root.add(edgeMesh);
  }

  // ── far atmosphere: skyline, Superdome, cable bridge ──
  {
    const r = mulberry(777);
    const F = far.at(0, 0);
    const skyCols = [0x5a4876, 0x6b5584, 0x4d3f6a, 0x7a5f8a];
    const tower = (x: number, z: number, w: number, d: number, h: number) => {
      const m = far.at(x, z);
      m.box(x, h / 2 - 1, z, w, h, d, skyCols[Math.floor(r() * 4)]!, 0, false);
      if (r() < 0.4) {
        farGlow.at(x, z).box(x, h * (0.3 + r() * 0.5), z + d / 2 + 0.1, w * 0.6, 1.2, 0.2, 0xffc070);
      }
    };
    for (let x = -520; x <= 520; x += 14 + r() * 12) tower(x, ZN - 150 - r() * 120, 10 + r() * 14, 10 + r() * 14, 25 + r() * 90);
    for (let z = -240; z <= 180; z += 16 + r() * 12) {
      tower(-E - 150 - r() * 110, z, 10 + r() * 14, 10 + r() * 14, 20 + r() * 70);
      tower(E + 150 + r() * 110, z, 10 + r() * 14, 10 + r() * 14, 20 + r() * 70);
    }
    for (let x = -520; x <= 520; x += 18 + r() * 14) tower(x, FAR_BANK + 50 + r() * 60, 12 + r() * 16, 10 + r() * 12, 12 + r() * 40);
    // skyline accent: one tall spire
    far.at(-60, ZN - 200).cyl(-60, -1, ZN - 200, 8, 3, 150, 6, 0x6b5584);
    // Superdome
    const sx = -330;
    const sz = 470;
    F.cyl(sx, -1, sz, 66, 62, 24, 28, 0xd4d0dc, 0, false);
    F.cyl(sx, 23, sz, 62, 40, 14, 28, 0xaeb2c8);
    F.ell(sx, 36, sz, 42, 6, 42, 0xc4c8dc, 14, 3, 0.02);
    farGlow.at(sx, sz).cyl(sx, 14, sz, 66.5, 66.5, 2.0, 28, 0xffc890);
    farGlow.at(sx, sz).cyl(sx, 22, sz, 62.5, 62.5, 1.0, 28, 0xff7aa8);
    // Crescent City Connection-style cable bridge across the river to the east
    const bx = 360;
    const deckY = 26;
    const BF = far.at(bx, 300);
    BF.boxs(bx - 7, deckY - 2, LAND_Z - 5, bx + 7, deckY, 470, 0x9aa0a8, false);
    BF.boxs(bx - 7.4, deckY, LAND_Z - 5, bx - 6.8, deckY + 1.1, 470, 0xc4c8cc, false);
    BF.boxs(bx + 6.8, deckY, LAND_Z - 5, bx + 7.4, deckY + 1.1, 470, 0xc4c8cc, false);
    for (let z = LAND_Z + 20; z < FAR_BANK + 10; z += 70) {
      if (z > 215 && z < 340) continue;
      BF.boxs(bx - 3, -3, z - 1.5, bx + 3, deckY - 2, z + 1.5, 0x7a7e86, false);
    }
    for (const tz of [262, 318]) {
      for (const sg of [-1, 1]) BF.tube(bx + sg * 7.5, -4, tz, bx + sg * 2, 82, tz, 1.5, 1.1, 5, 0xc8c0b0);
      BF.box(bx, 62, tz, 14, 1.4, 2.2, 0xc8c0b0, 0, false);
      BF.box(bx, 40, tz, 15, 1.2, 2.0, 0xc8c0b0, 0, false);
      farGlow.at(bx, tz).box(bx, 83, tz, 1.4, 1.4, 1.4, 0xff3030);
      for (const sg of [-1, 1]) {
        for (let k = 1; k <= 8; k++) {
          BF.tube(bx + sg * 2, 80, tz, bx + sg * 6.5, deckY, tz + k * 8, 0.12, 0.12, 4, 0xe6dccb);
          BF.tube(bx + sg * 2, 80, tz, bx + sg * 6.5, deckY, tz - k * 8, 0.12, 0.12, 4, 0xe6dccb);
        }
      }
    }
    // twinkling far-bank city lights
    for (let x = -400; x <= 400; x += 11 + r() * 9) farGlow.at(x, FAR_BANK + 20).box(x, 1.5 + r() * 2, FAR_BANK + 12 + r() * 10, 0.9, 0.9, 0.9, r() < 0.5 ? 0xffd070 : 0xff9a5a);
  }

  // ── streetcar ──
  const streetcar = new THREE.Group();
  {
    const m = new Mesher(true);
    const green = 0x2f8a4a;
    const cream = 0xe9dcb4;
    const Lc = 4.6;
    m.boxs(-1.3, 0.35, -Lc, 1.3, 0.7, Lc, 0x2a2a30, false);
    m.boxs(-1.3, 0.7, -Lc, 1.3, 2.2, Lc, green, false);
    m.boxs(-1.3, 2.2, -Lc, 1.3, 2.9, Lc, 0x1f3a28, false);
    m.boxs(-1.35, 2.9, -Lc - 0.05, 1.35, 3.25, Lc + 0.05, cream, false);
    m.boxs(-1.0, 3.25, -Lc + 0.3, 1.0, 3.45, Lc - 0.3, cream, false);
    m.boxs(-1.32, 1.4, -Lc, 1.32, 1.6, Lc, 0xd8c070, false);
    m.boxs(-1.32, 0.7, -Lc, 1.32, 0.8, Lc, cream, false);
    for (const sg of [-1, 1]) for (const zz of [-2.8, 2.8]) m.cyl(sg * 0.72, 0, zz, 0.35, 0.35, 0.1, 8, 0x1c1c20, 0, true);
    m.tube(0, 3.4, -1, 0, 5.9, 1.6, 0.04, 0.04, 4, 0x23252b);
    m.boxs(-0.4, 5.85, 1.5, 0.4, 5.95, 1.7, 0x23252b, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(m.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(m.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(m.col, 3));
    const body = new THREE.Mesh(g, trackM(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true })));
    body.castShadow = true;
    streetcar.add(body);
    const gm = new Mesher(false);
    for (const sg of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const zz = -Lc + 0.9 + i * 1.3;
        gm.boxs(sg * 1.3 - 0.01 * sg - 0.01, 1.75, zz - 0.4, sg * 1.3 + 0.03 * sg, 2.6, zz + 0.4, 0xffe2a0, false);
      }
    }
    gm.boxs(-0.5, 1.0, Lc, 0.5, 1.3, Lc + 0.1, 0xfff6c0, false);
    gm.boxs(-0.5, 1.0, -Lc - 0.1, 0.5, 1.3, -Lc, 0xfff6c0, false);
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute("position", new THREE.Float32BufferAttribute(gm.pos, 3));
    g2.setAttribute("color", new THREE.Float32BufferAttribute(gm.col, 3));
    streetcar.add(new THREE.Mesh(g2, trackM(new THREE.MeshBasicMaterial({ vertexColors: true }))));
    root.add(streetcar);
    // overhead wire and poles
    const S = solid.at(-60, 0);
    S.boxs(-60.03, 6.2, ZN, -59.97, 6.26, LAND_Z - 4, 0x23252b, false);
    for (let z = ZN + 10; z < LAND_Z - 8; z += 40) {
      S.cyl(-54.8, 0, z, 0.1, 0.07, 6.6, 6, 0x2b2d33);
      S.boxs(-60, 6.4, z - 0.05, -54.8, 6.5, z + 0.05, 0x2b2d33, false);
    }
  }

  // ── build chunked meshes ──
  const matSolid = trackM(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }));
  const matGround = trackM(new THREE.MeshStandardMaterial({ vertexColors: true }));
  const matGlow = trackM(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const matNeonA = trackM(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const matNeonB = trackM(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const matFarGlow = trackM(new THREE.MeshBasicMaterial({ vertexColors: true }));
  const geos: THREE.BufferGeometry[] = [...hrGeos];
  const buildLayer = (layer: Layer, material: THREE.Material, cast: boolean, receive: boolean, lit: boolean) => {
    for (const m of layer.chunks.values()) {
      if (!m.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(m.pos, 3));
      if (lit) g.setAttribute("normal", new THREE.Float32BufferAttribute(m.nor, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(m.col, 3));
      g.computeBoundingSphere();
      geos.push(g);
      const mesh = new THREE.Mesh(g, material);
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
      root.add(mesh);
    }
  };
  buildLayer(ground, matGround, false, true, true);
  buildLayer(solid, matSolid, true, true, true);
  buildLayer(glow, matGlow, false, false, false);
  buildLayer(neonA, matNeonA, false, false, false);
  buildLayer(neonB, matNeonB, false, false, false);
  buildLayer(far, matSolid, false, false, true);
  buildLayer(farGlow, matFarGlow, false, false, false);

  // ── markers: business rings, HQ beam ──
  const beamTex = trackT(
    canvasTex(16, 128, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(1, "rgba(255,255,255,0.9)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 16, 128);
    }),
  );
  const ringMeshes: { mesh: THREE.Mesh; phase: number }[] = [];
  for (const biz of BUSINESSES) {
    const isHq = biz.x === HQ.x && biz.z === HQ.z;
    const colr = isHq ? 0xffd23a : DISTRICTS[biz.district]!.color;
    const R = isHq ? HQ.r : 3.6;
    const y = biz.z > LAND_Z ? 0.12 : 0.07;
    const ringMat = trackM(new THREE.MeshBasicMaterial({ color: colr, transparent: true, opacity: isHq ? 0.9 : 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    const ring = new THREE.Mesh(new THREE.RingGeometry(R - 0.5, R, 40).rotateX(-Math.PI / 2), ringMat);
    ring.position.set(biz.x, y, biz.z);
    ring.renderOrder = 2;
    root.add(ring);
    ringMeshes.push({ mesh: ring, phase: biz.id });
    const fillMat = trackM(new THREE.MeshBasicMaterial({ color: colr, transparent: true, opacity: 0.16, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(R - 0.5, 36).rotateX(-Math.PI / 2), fillMat);
    fill.position.set(biz.x, y - 0.01, biz.z);
    fill.renderOrder = 1;
    root.add(fill);
    if (isHq) {
      const beamMat = trackM(new THREE.MeshBasicMaterial({ color: 0xffd23a, map: beamTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 60, 16, 1, true), beamMat);
      beam.position.set(biz.x, 30, biz.z);
      beam.renderOrder = 3;
      root.add(beam);
      ringMeshes.push({ mesh: beam, phase: 9 });
    }
  }

  // ── update ──
  const water = riverGeo.attributes.position as THREE.BufferAttribute;
  const sunFocus = new THREE.Vector3();
  const rVec = new THREE.Vector3();
  const uVec = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const TEX = 140 / 2048;

  const update = (time: number, focusX: number, focusZ: number) => {
    // sky follows the camera focus
    skyGroup.position.set(focusX, 0, focusZ);
    skyGroup.rotation.y = 0;
    // sun + shadow box, snapped to light-space texels
    rVec.crossVectors(SUN_DIR, _up).normalize();
    uVec.crossVectors(rVec, SUN_DIR).normalize();
    tmpV.set(focusX, 0, focusZ);
    const pr = Math.round(tmpV.dot(rVec) / TEX) * TEX;
    const pu = Math.round(tmpV.dot(uVec) / TEX) * TEX;
    sunFocus.copy(tmpV).addScaledVector(rVec, pr - tmpV.dot(rVec)).addScaledVector(uVec, pu - tmpV.dot(uVec));
    sun.target.position.copy(sunFocus);
    sun.target.updateMatrixWorld();
    sun.position.copy(sunFocus).addScaledVector(SUN_DIR, 220);

    // river waves
    const arr = water.array as Float32Array;
    for (let i = 0; i < water.count; i++) {
      const x = riverBase[i * 3]!;
      const z = riverBase[i * 3 + 2]!;
      arr[i * 3 + 1] = -0.5 + 0.16 * Math.sin(x * 0.05 + time * 0.8) + 0.11 * Math.sin(z * 0.09 + time * 1.1) + 0.07 * Math.sin((x + z) * 0.13 - time * 1.6);
    }
    water.needsUpdate = true;
    waterTex.offset.set(time * 0.004, time * 0.012);

    // streetcar along x=-60
    const ph = (time * Math.PI * 2) / 150;
    const zc = -25 + 195 * Math.sin(ph);
    streetcar.position.set(-60, 0.08, zc);
    streetcar.rotation.y = Math.cos(ph) >= 0 ? 0 : Math.PI;

    paddle.rotation.z = -time * 0.5;

    // neon
    const fl = (ph0: number, depth: number) => {
      const t = time + ph0;
      let v = 0.9 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 2.1);
      if (Math.sin(t * 1.7) * Math.sin(t * 13.1) > 0.93) v -= depth * 3;
      return Math.max(0.35, v);
    };
    matNeonA.color.setScalar(fl(0, 0.1));
    matNeonB.color.setScalar(fl(2.3, 0.07));
    for (const f of flickers) f.mat.color.setScalar(fl(f.phase, f.depth));
    poolMat.opacity = 0.9 + 0.1 * Math.sin(time * 1.3);

    // markers
    for (const { mesh, phase } of ringMeshes) {
      const s = 1 + 0.05 * Math.sin(time * 2.2 + phase);
      if (mesh.geometry.type === "CylinderGeometry") {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.12 + 0.04 * Math.sin(time * 2 + phase);
        mesh.rotation.y = time * 0.3;
      } else mesh.scale.set(s, 1, s);
    }
  };

  const dispose = () => {
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
    });
    for (const g of geos) g.dispose();
    skyGeo.dispose();
    for (const m of mats) m.dispose();
    for (const t of texs) t.dispose();
    scene.remove(root, hemi, sun, sun.target);
    sun.shadow.map?.dispose();
    scene.fog = prevFog;
    scene.background = prevBg;
  };

  return { update, dispose };
}
