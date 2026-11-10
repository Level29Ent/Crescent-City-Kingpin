// Crescent City Kingpin (standalone): the map, districts, shop tables and collision. No engine needed.
const hypot = Math.hypot;

// ───────────────────────── Map ─────────────────────────
// x east, z south (north = -z). Streets run along the lines in STREETS (14 wide); blocks are 46 square between them.
export const STREETS = [-180, -120, -60, 0, 60, 120, 180];
export const STREET_HALF = 7;
export const BLOCK_HALF = 23;
export const BLOCK_CENTERS_X = [-210, -150, -90, -30, 30, 90, 150, 210];
export const BLOCK_CENTERS_Z = [-210, -150, -90, -30, 30, 90, 150];
/** Land ends here (the Mississippi lies south of it); only DECKS reach over the water. */
export const LAND_Z = 191;
export const WORLD_X = 238;
export const WORLD_Z_MIN = -238;
export const WORLD_Z_MAX = 232;

export type Box = { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; color: number };
/**
 * style: 0 creole townhouse (balcony), 1 warehouse, 2 mansion, 3 stilt shack, 4 neon club, 5 shotgun house,
 * 6 HQ po-boy shop, 7 cathedral, 8 high-rise, 9 riverboat casino, 10 airboat shack.
 */
export type Building = { x0: number; z0: number; x1: number; z1: number; h: number; color: number; style: number; sign?: string };
export type Prop = { kind: "oak" | "cypress" | "palm" | "lamp" | "tomb" | "crate" | "bench" | "statue" | "fountain"; x: number; z: number; s: number; color: number };
export type Rect = { x0: number; z0: number; x1: number; z1: number };

/** Walkable platforms over the river: the casino pier and boat deck. */
export const DECKS: Rect[] = [
  { x0: 30, z0: LAND_Z - 2, x1: 40, z1: 206 },
  { x0: 8, z0: 204, x1: 92, z1: 228 },
];
/** Round ponds in the bayou that nobody can wade into: x, z, radius. */
export const PONDS: [number, number, number][] = [
  [105, -100, 11], [200, -85, 13], [185, -150, 14], [100, -165, 10], [205, -205, 16], [120, -215, 12], [160, -95, 8],
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────── Districts and businesses ─────────────────────────
export const QUARTER = 0;
export const TREME = 1;
export const GARDEN = 2;
export const DOCKS = 3;
export const BAYOU = 4;

export type DistrictInfo = {
  id: number;
  name: string;
  gang: string;
  boss: string;
  /** Rival fighters to beat before the boss steps out. */
  need: number;
  color: number;
  /** Label / minimap centre. */
  x: number;
  z: number;
};
export const DISTRICTS: DistrictInfo[] = [
  { id: QUARTER, name: "The French Quarter", gang: "", boss: "", need: 0, color: 0xe7b84a, x: 30, z: 30 },
  { id: TREME, name: "Tremé", gang: "Brass Knuckle Boys", boss: "Big Pierre", need: 8, color: 0x4aa3e7, x: -150, z: -150 },
  { id: GARDEN, name: "Garden District", gang: "Magnolia Mob", boss: "Miss Magnolia", need: 10, color: 0xc95fd0, x: -150, z: 60 },
  { id: DOCKS, name: "The Docks", gang: "Levee Wolves", boss: "Captain Rue", need: 12, color: 0xe7694a, x: 60, z: 155 },
  { id: BAYOU, name: "The Bayou", gang: "Gator Gang", boss: "Old Gator", need: 10, color: 0x6dc24a, x: 150, z: -150 },
];

export function districtAt(x: number, z: number): number {
  if (z < -60) return x < -60 ? TREME : x > 60 ? BAYOU : QUARTER;
  if (x < -60) return GARDEN;
  if (z > 110) return DOCKS;
  return QUARTER;
}

export type Business = { id: number; name: string; district: number; x: number; z: number; income: number; blurb: string };
export const BUSINESSES: Business[] = [
  { id: 0, name: "Mama Nola's Po-Boys", district: QUARTER, x: 30, z: 4, income: 4, blurb: "Your first shop. The best fried shrimp in town." },
  { id: 1, name: "Blue Note Jazz Club", district: TREME, x: -90, z: -64, income: 14, blurb: "Live brass nights and a packed dance floor." },
  { id: 2, name: "Magnolia Estate", district: GARDEN, x: -150, z: 4, income: 18, blurb: "Old money, big porches, private parties." },
  { id: 3, name: "Crescent City Import Co.", district: DOCKS, x: 90, z: 124, income: 22, blurb: "Crates of rum, cigars and hot sauce off the boats." },
  { id: 4, name: "Riverboat Casino", district: DOCKS, x: 35, z: 202, income: 40, blurb: "Roulette, jazz and a paddle wheel." },
  { id: 5, name: "Gator Bay Airboat Tours", district: BAYOU, x: 150, z: -128, income: 11, blurb: "Tourists pay well to see a gator up close." },
];
/** Where the empire is run from: the shop, delivery desk and heal point. */
export const HQ = { x: 30, z: 4, r: 8 };
export const SPAWN = { x: 10, z: -1.5, heading: Math.PI / 2 };
/** Extra drop-off spots for import deliveries (besides businesses). */
export const DROPS: { name: string; x: number; z: number }[] = [
  ...BUSINESSES.slice(1).map((b) => ({ name: b.name, x: b.x, z: b.z })),
  { name: "St. Louis Cemetery gate", x: 150, z: 4 },
  { name: "Jackson Square", x: -30, z: 4 },
  { name: "The Bourbon Street Lounge", x: 4, z: -90 },
  { name: "Frenchmen Street Bar", x: 66, z: -64 },
];

// ───────────────────────── Weapons and shop ─────────────────────────
export type WeaponInfo = { name: string; cd: number; dmg: number; pellets: number; spread: number; range: number };
export const WEAPONS: WeaponInfo[] = [
  { name: "Pistol", cd: 0.3, dmg: 26, pellets: 1, spread: 0.008, range: 80 },
  { name: "SMG", cd: 0.09, dmg: 11, pellets: 1, spread: 0.04, range: 65 },
  { name: "Shotgun", cd: 0.85, dmg: 13, pellets: 7, spread: 0.085, range: 32 },
];
export type ShopItem = { id: number; name: string; desc: string; price: number };
export const SHOP: ShopItem[] = [
  { id: 0, name: "SMG", desc: "Rapid fire. Sprays a little.", price: 2500 },
  { id: 1, name: "Shotgun", desc: "Devastating up close.", price: 5000 },
  { id: 2, name: "Body armor", desc: "Refills 50 armor points.", price: 1200 },
  { id: 3, name: "Sports car", desc: "A fast ride parked at the shop.", price: 8000 },
  { id: 4, name: "Expand the empire", desc: "+25% income from every business (max 4).", price: 6000 },
  { id: 5, name: "Patch up", desc: "Heal to full health.", price: 200 },
];
export const MAX_LEVEL = 4;
export const GOAL = 250000;
export const MAX_HP = 100;
export const RESPAWN_SECONDS = 5;

// ───────────────────────── Blocks ─────────────────────────
const PALETTE = [0xe8a5b8, 0xf2d37a, 0x7ec8c0, 0xa6d7a0, 0xf0b27a, 0x9db8e8, 0xe27d6d, 0xf4ead2, 0xc9a0dc];
const BRICK = [0xb5694f, 0xa35a44, 0xc27a5a, 0x9a6a58];
const WARE = [0x8d9aa6, 0xb0a590, 0x7f8f8a, 0xa88a72];

function generateCity() {
  const BUILDINGS: Building[] = [];
  const PROPS: Prop[] = [];
  const BOXES: Box[] = [];
const building = (x0: number, z0: number, x1: number, z1: number, h: number, color: number, style: number, sign?: string) => {
  BUILDINGS.push({ x0, z0, x1, z1, h, color, style, ...(sign !== undefined ? { sign } : {}) });
  BOXES.push({ x0, y0: 0, z0, x1, y1: h, z1, color });
};
const prop = (kind: Prop["kind"], x: number, z: number, s: number, color = 0xffffff) => {
  PROPS.push({ kind, x, z, s, color });
  const hw = kind === "oak" ? 0.7 * s : kind === "cypress" ? 0.6 * s : kind === "lamp" ? 0.15 : kind === "palm" ? 0.3 : 0;
  if (hw > 0) BOXES.push({ x0: x - hw, y0: 0, z0: z - hw, x1: x + hw, y1: kind === "lamp" ? 5 : 4, z1: z + hw, color: 0x4a3a2a });
  else if (kind === "tomb") BOXES.push({ x0: x - 1.1, y0: 0, z0: z - 0.8, x1: x + 1.1, y1: 2.6 * s, z1: z + 0.8, color });
  else if (kind === "crate") BOXES.push({ x0: x - 3 * s, y0: 0, z0: z - 1.25 * s, x1: x + 3 * s, y1: 2.6 * s, z1: z + 1.25 * s, color });
  else if (kind === "statue" || kind === "fountain") BOXES.push({ x0: x - 1.2 * s, y0: 0, z0: z - 1.2 * s, x1: x + 1.2 * s, y1: 2, z1: z + 1.2 * s, color });
};

/** A ring of connected buildings around the edge of a block with a few alleys between them. */
function ring(bx: number, bz: number, r: () => number, o: { depth: [number, number]; h: [number, number]; style: number; width: [number, number]; alley: number; colors: number[] }) {
  const H = BLOCK_HALF;
  const pick = () => o.colors[Math.floor(r() * o.colors.length)]!;
  const dN = o.depth[0] + r() * (o.depth[1] - o.depth[0]);
  const dS = o.depth[0] + r() * (o.depth[1] - o.depth[0]);
  const dW = o.depth[0] + r() * (o.depth[1] - o.depth[0]);
  const dE = o.depth[0] + r() * (o.depth[1] - o.depth[0]);
  const run = (from: number, to: number, put: (a: number, b: number, h: number) => void) => {
    let p = from;
    while (to - p > 5) {
      let w = o.width[0] + r() * (o.width[1] - o.width[0]);
      if (to - p - w < 6) w = to - p;
      const h = o.h[0] + r() * (o.h[1] - o.h[0]);
      put(p, p + w, h);
      p += w;
      if (to - p > 8 && r() < o.alley) p += 3.5;
    }
  };
  run(-H, H, (a, b, h) => building(bx + a, bz - H, bx + b, bz - H + dN, h, pick(), o.style));
  run(-H, H, (a, b, h) => building(bx + a, bz + H - dS, bx + b, bz + H, h, pick(), o.style));
  run(-H + dN + 2, H - dS - 2, (a, b, h) => building(bx - H, bz + a, bx - H + dW, bz + b, h, pick(), o.style));
  run(-H + dN + 2, H - dS - 2, (a, b, h) => building(bx + H - dE, bz + a, bx + H, bz + b, h, pick(), o.style));
}

const nearPond = (x: number, z: number, pad: number) => PONDS.some(([px, pz, pr]) => hypot(x - px, z - pz) < pr + pad);

function buildBlock(bx: number, bz: number) {
  const r = rng(Math.imul(bx + 300, 7919) ^ Math.imul(bz + 300, 104729));
  const d = districtAt(bx, bz);
  const key = `${bx},${bz}`;
  // Landmarks first.
  if (key === "-30,30") {
    // Jackson Square: a plaza with the cathedral on its north edge.
    building(bx - 14, bz - BLOCK_HALF, bx + 14, bz - BLOCK_HALF + 14, 20, 0xe9e0c8, 7, "St. Louis Cathedral");
    prop("statue", bx, bz + 2, 1.2, 0x6f6a5a);
    for (const [dx, dz] of [[-14, 6], [14, 6], [-16, 17], [16, 17], [0, 16]] as const) prop("oak", bx + dx, bz + dz, 1.2 + r() * 0.4);
    for (const [dx, dz] of [[-8, 2], [8, 2], [-8, 10], [8, 10]] as const) prop("bench", bx + dx, bz + dz, 1);
    return;
  }
  if (key === "30,30") {
    // The home block: Mama Nola's faces the main street.
    building(bx - 11, bz - BLOCK_HALF, bx + 11, bz - BLOCK_HALF + 13, 8, 0xf2a65a, 6, "MAMA NOLA'S PO-BOYS");
    building(bx - BLOCK_HALF, bz - BLOCK_HALF, bx - 12, bz - BLOCK_HALF + 13, 11, 0x9db8e8, 0);
    building(bx + 12, bz - BLOCK_HALF, bx + BLOCK_HALF, bz - BLOCK_HALF + 13, 12, 0xe8a5b8, 0);
    ring(bx, bz + 10, r, { depth: [11, 13], h: [9, 14], style: 0, width: [10, 16], alley: 0.2, colors: PALETTE });
    return;
  }
  if (key === "-90,-90") {
    building(bx - 16, bz + BLOCK_HALF - 14, bx + 16, bz + BLOCK_HALF, 9, 0x3a3d6e, 4, "BLUE NOTE");
    building(bx - BLOCK_HALF, bz - BLOCK_HALF, bx + BLOCK_HALF, bz - BLOCK_HALF + 12, 8, 0x7ec8c0, 5);
    for (const [dx, dz] of [[-18, -4], [-18, 4], [18, -4], [18, 4]] as const) building(bx + dx - 4, bz + dz - 3, bx + dx + 4, bz + dz + 3, 6, PALETTE[(dx + dz + 40) % 9]!, 5);
    return;
  }
  if (key === "-150,30") {
    building(bx - 20, bz - 8, bx + 20, bz + 12, 13, 0xf4ead2, 2, "MAGNOLIA ESTATE");
 for (const [dx, dz] of [[-17, -17], [17, -17], [-17, 18], [17, 18], [0, 19], [-6, -17], [8, -17]] as const) prop("oak", bx + dx, bz + dz, 1.4 + r() * 0.5);
    return;
  }
  if (key === "90,150") {
    building(bx - 22, bz - 20, bx + 22, bz - 2, 11, 0x8d9aa6, 1, "CRESCENT CITY IMPORT");
    building(bx - 22, bz + 6, bx - 4, bz + 22, 9, 0xa88a72, 1);
    for (let i = 0; i < 3; i++) prop("crate", bx + 10, bz + 10 + i * 4, 1, [0xb53030, 0x2f6fb5, 0xd6a030][i]!);
    return;
  }
  if (key === "150,-150") {
    building(bx - 12, bz - 10, bx + 12, bz + 12, 5.5, 0x7a5a3a, 10, "GATOR BAY AIRBOATS");
    for (const [dx, dz] of [[-18, -18], [18, -18], [-18, 18], [18, 18], [0, -20]] as const) prop("cypress", bx + dx, bz + dz, 1.2 + r() * 0.6);
    return;
  }
  if (key === "150,30" || key === "150,90") {
    // St. Louis Cemetery: whitewashed tombs in rows inside a wall.
    const H = BLOCK_HALF;
    building(bx - H, bz - H, bx + H, bz - H + 1.2, 2.6, 0xe4dccb, 8);
    building(bx - H, bz + H - 1.2, bx - 4, bz + H, 2.6, 0xe4dccb, 8);
    building(bx + 4, bz + H - 1.2, bx + H, bz + H, 2.6, 0xe4dccb, 8);
    building(bx - H, bz - H + 1.2, bx - H + 1.2, bz + H - 1.2, 2.6, 0xe4dccb, 8);
    building(bx + H - 1.2, bz - H + 1.2, bx + H, bz + H - 1.2, 2.6, 0xe4dccb, 8);
    for (let ix = 0; ix < 4; ix++) for (let iz = 0; iz < 5; iz++) if (r() < 0.8) prop("tomb", bx - 15 + ix * 9 + (ix > 1 ? 2 : 0), bz - 17 + iz * 7.5, 0.8 + r() * 0.5, 0xeeeadf);
    return;
  }
  if (d === BAYOU) {
    for (let i = 0; i < 3; i++) {
      const x = bx - 16 + r() * 32;
      const z = bz - 16 + r() * 32;
      if (nearPond(x, z, 8)) continue;
      building(x - 3.5, z - 3, x + 3.5, z + 3, 4.5, [0x8a6a4a, 0x6e5a42, 0x9a7a56][i]!, 3);
    }
    for (let i = 0; i < 8; i++) {
      const x = bx - 21 + r() * 42;
      const z = bz - 21 + r() * 42;
      if (!nearPond(x, z, 3)) prop("cypress", x, z, 1 + r() * 0.8);
    }
    return;
  }
  if (d === GARDEN) {
    const n = r() < 0.5 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const cz = bz + (n === 1 ? (r() - 0.5) * 8 : i === 0 ? -12 : 12);
      const cx = bx + (r() - 0.5) * 8;
      building(cx - 9.5, cz - 6, cx + 9.5, cz + 6, 10 + r() * 3, [0xf4ead2, 0xf0e0b0, 0xd9e8f2, 0xe8d0d8][Math.floor(r() * 4)]!, 2);
    }
    for (let i = 0; i < 5; i++) prop("oak", bx - 19 + r() * 38, bz - 19 + r() * 38, 1.2 + r() * 0.6);
    return;
  }
  if (d === DOCKS) {
    building(bx - 21, bz - 21, bx + 21, bz - 4, 8 + r() * 4, WARE[Math.floor(r() * 4)]!, 1);
    if (r() < 0.7) building(bx + 4, bz + 6, bx + 21, bz + 21, 7 + r() * 3, WARE[Math.floor(r() * 4)]!, 1);
    for (let i = 0; i < 4; i++) prop("crate", bx - 14 + (i % 2) * 7, bz + 9 + Math.floor(i / 2) * 5, 1, [0xb53030, 0x2f6fb5, 0xd6a030, 0x3a8a4a][i]!);
    return;
  }
  if (d === QUARTER && bz < -60) {
    // Downtown high-rises north of the Quarter.
    building(bx - 15, bz - 15, bx + 15, bz + 15, 38 + r() * 30, [0x8aa0b8, 0x9ab0b0, 0xb0a8a0][Math.floor(r() * 3)]!, 8);
    return;
  }
  if (d === TREME) {
    ring(bx, bz, r, { depth: [8, 10], h: [5.5, 7.5], style: 5, width: [7, 10], alley: 0.45, colors: PALETTE });
    prop("palm", bx, bz, 1.2);
    return;
  }
  ring(bx, bz, r, { depth: [11, 14], h: [9, 16], style: 0, width: [10, 18], alley: 0.3, colors: [...PALETTE, ...BRICK] });
  if (r() < 0.6) prop("oak", bx + (r() - 0.5) * 6, bz + (r() - 0.5) * 6, 1 + r() * 0.5);
}

for (const bz of BLOCK_CENTERS_Z) for (const bx of BLOCK_CENTERS_X) buildBlock(bx, bz);
// Street lamps at every other crossing corner.
for (const sx of STREETS) {
  for (const sz of STREETS) {
    if ((sx / 60 + sz / 60) % 2 !== 0) continue;
    prop("lamp", sx + 8.2, sz + 8.2, 1);
    prop("lamp", sx - 8.2, sz - 8.2, 1);
  }
}
// Ponds block the bayou ground; the casino boat sits on the river.
building(18, 208, 82, 222, 11, 0xf4f0e6, 9, "RIVERBOAT CASINO");

  return { BUILDINGS, PROPS, BOXES };
}
const CITY = generateCity();
export const BUILDINGS: Building[] = CITY.BUILDINGS;
export const PROPS: Prop[] = CITY.PROPS;
export const BOXES: Box[] = CITY.BOXES;

/** The first spawn spots for parked cars: x, z, heading, style. */
export const PARKED_CARS: [number, number, number, number][] = (() => {
  const r = rng(77);
  const out: [number, number, number, number][] = [
    [44, -3.5, Math.PI / 2, 1], [-24, 3.5, -Math.PI / 2, 1], [58, 3.5, -Math.PI / 2, 1],
  ];
  for (let i = 0; i < 20; i++) {
    const horizontal = r() < 0.5;
    const line = STREETS[Math.floor(r() * STREETS.length)]!;
    const along = -200 + r() * 400;
    const side = r() < 0.5 ? -3.8 : 3.8;
    const x = horizontal ? along : line + side;
    const z = horizontal ? line + side : along;
    if (!walkable(x, z)) continue;
    const head = horizontal ? (side > 0 ? -Math.PI / 2 : Math.PI / 2) : side > 0 ? Math.PI : 0;
    out.push([x, z, head, r() < 0.15 ? 2 : 1]);
  }
  return out;
})();

// ───────────────────────── Collision ─────────────────────────
const SOLID = BOXES.filter((b) => b.y0 < 1.8 && b.y1 > 0.1);

export function walkable(x: number, z: number): boolean {
  if (x < -WORLD_X || x > WORLD_X || z < WORLD_Z_MIN || z > WORLD_Z_MAX) return false;
  for (const [px, pz, pr] of PONDS) if (hypot(x - px, z - pz) < pr) return false;
  if (z > LAND_Z) {
    for (const d of DECKS) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return true;
    return false;
  }
  return true;
}

/** How far to move a circle at (x,z) so it clears every solid box. */
export function pushOut(x: number, z: number, r: number): { x: number; z: number; hit: boolean } {
  let px = 0;
  let pz = 0;
  let hit = false;
  for (const b of SOLID) {
    const qx = x + px;
    const qz = z + pz;
    if (qx < b.x0 - r || qx > b.x1 + r || qz < b.z0 - r || qz > b.z1 + r) continue;
    const dx = qx - Math.max(b.x0, Math.min(b.x1, qx));
    const dz = qz - Math.max(b.z0, Math.min(b.z1, qz));
    const dist = hypot(dx, dz);
    if (dist >= r) continue;
    hit = true;
    if (dist > 1e-6) {
      px += (dx / dist) * (r - dist);
      pz += (dz / dist) * (r - dist);
    } else {
      const left = qx - b.x0;
      const right = b.x1 - qx;
      const up = qz - b.z0;
      const down = b.z1 - qz;
      const m = Math.min(left, right, up, down);
      if (m === left) px -= left + r;
      else if (m === right) px += right + r;
      else if (m === up) pz -= up + r;
      else pz += down + r;
    }
  }
  return { x: px, z: pz, hit };
}

/** Distance along a ray to the first box it enters, or `max`. Direction must be normalized. */
export function castWorld(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number): number {
  let best = max;
  for (const b of BOXES) {
    let t0 = 0;
    let t1 = best;
    const o = [ox, oy, oz];
    const d = [dx, dy, dz];
    const lo = [b.x0, b.y0, b.z0];
    const hi = [b.x1, b.y1, b.z1];
    let ok = true;
    for (let i = 0; i < 3; i++) {
      const di = d[i]!;
      const oi = o[i]!;
      if (Math.abs(di) < 1e-9) {
        if (oi < lo[i]! || oi > hi[i]!) {
          ok = false;
          break;
        }
        continue;
      }
      let a = (lo[i]! - oi) / di;
      let c = (hi[i]! - oi) / di;
      if (a > c) [a, c] = [c, a];
      t0 = Math.max(t0, a);
      t1 = Math.min(t1, c);
      if (t0 > t1) {
        ok = false;
        break;
      }
    }
    if (ok && t0 < best) best = t0;
  }
  return best;
}

export type SfxName =
  | "pistol" | "smg" | "shotgun" | "enemyShot" | "hit" | "headshot" | "hurt" | "cash" | "buy" | "click"
  | "capture" | "bump" | "door" | "wanted" | "deny" | "death" | "job";
export const CAR_MAX = [0, 26, 38];
export const CAR_ACC = [0, 20, 32];
