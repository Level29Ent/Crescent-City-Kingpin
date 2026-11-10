// The server runs the city: players' gear and health, rival gangs and bosses per district, civilians and police,
// shooting, income from owned businesses, the import-delivery job and the shop.
import type { PlayerId } from "@trhs/wildwood";
import { hostPrediction } from "@trhs/wildwood/predict/server";
import { replicateServer } from "@trhs/wildwood/replicate/server";
import { defineServer, type Player } from "@trhs/wildwood/server";
import type { Entity } from "koota";
import {
  Avatar, avatarId, BUSINESSES, Car, castWorld, DISTRICTS, District, districtAt, DROPS, Empire, game, GOAL, HQ, MAX_HP, MAX_LEVEL, Npc,
  NolaProtocol, PARKED_CARS, pushOut, RESPAWN_SECONDS, SHOP, simulation, SPAWN, Status, Sync, walkable, WEAPONS, QUARTER,
} from "./game.ts";

const CAR_COLORS = [0xc0392b, 0x2e6fb5, 0xf2c14e, 0x2f2f33, 0xe8e4da, 0x2f8f6f, 0x8e44ad];
const MAX_PARKED = 36;
const MAX_CIVS = 14;
const MAX_GANG = 16;
const MAX_COPS = 8;

type Ai = {
  e: Entity;
  kind: number;
  district: number;
  home: { x: number; z: number };
  tx: number;
  tz: number;
  wait: number;
  nextShot: number;
  aggro: number;
  last: { x: number; z: number };
  los: boolean;
  avoid: number;
  avoidUntil: number;
  flee: number;
  dieAt: number;
  hitUntil: number;
  maxHp: number;
};

export default defineServer(game, (ctx) => {
  const host = hostPrediction(ctx, {
    simulation,
    side: undefined,
    scope: (entity, player) => entity.get(Avatar)?.owner === player.id,
    owner: (entity) => entity.get(Avatar)?.owner ?? null,
  });
  const replica = replicateServer(ctx, Sync, {
    visibility: { entity: (player, entity) => !host.predicts(entity, player) },
  });

  const empire = ctx.world.spawn(Empire({ cash: 500, earned: 0, income: 0, level: 0, won: 0, deliveries: 0 }));
  replica.replicate(empire);
  const districts: Entity[] = DISTRICTS.map((d) => {
    const e = ctx.world.spawn(District({ id: d.id, kills: 0, need: d.need, owned: d.id === QUARTER ? 1 : 0, boss: 0 }));
    replica.replicate(e);
    return e;
  });

  const statuses = new Map<PlayerId, Entity>();
  const lastAv = new Map<PlayerId, { x: number; z: number; heading: number; drive: number }>();
  const lastFire = new Map<PlayerId, number>();
  const heatClock = new Map<PlayerId, number>();
  const npcs = new Map<number, Ai>();
  const cars = new Map<number, Entity>();
  const counters = { players: 0, nid: 0, cid: 0, rng: 4242 };
  const rnd = () => {
    counters.rng = (counters.rng * 16807) % 2147483647;
    return counters.rng / 2147483647;
  };
  const feed = (text: string, tone = 0) => ctx.broadcast(NolaProtocol.toClient.feed, { text, tone });
  const feedTo = (id: PlayerId, text: string, tone = 0) => {
    const p = ctx.players.get(id);
    if (p !== undefined) ctx.send(p, NolaProtocol.toClient.feed, { text, tone });
  };
  const cue = (kind: number) => ctx.broadcast(NolaProtocol.toClient.cue, { kind });

  // ───── helpers ─────
  type Live = { id: PlayerId; st: Entity; s: ReturnType<typeof readStatus>; a: NonNullable<ReturnType<typeof readAvatar>> };
  const readStatus = (st: Entity) => st.get(Status)!;
  const readAvatar = (id: PlayerId) => host.find(avatarId(id))?.get(Avatar);
  const live = (): Live[] => {
    const out: Live[] = [];
    for (const [id, st] of statuses) {
      const s = readStatus(st);
      const a = readAvatar(id);
      if (s.hp > 0 && a !== undefined) out.push({ id, st, s, a });
    }
    return out;
  };
  const addCash = (n: number) => {
    const e = empire.get(Empire)!;
    empire.set(Empire, { ...e, cash: e.cash + n, earned: e.earned + Math.max(0, n) });
  };
  const nearHq = (x: number, z: number) => Math.hypot(x - HQ.x, z - HQ.z) < HQ.r + 3;

  const spawnCar = (x: number, z: number, heading: number, style: number, color = CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)]!) => {
    const cid = ++counters.cid;
    const e = ctx.world.spawn(Car({ cid, x, z, heading, style, color }));
    replica.replicate(e);
    cars.set(cid, e);
    if (cars.size > MAX_PARKED) {
      const oldest = cars.keys().next().value as number;
      cars.get(oldest)?.destroy();
      cars.delete(oldest);
    }
  };
  PARKED_CARS.forEach(([x, z, h, style]) => spawnCar(x, z, h, style));

  const spawnAvatar = (id: PlayerId) => {
    const j = (counters.players % 5) - 2;
    host.spawn(avatarId(id), Avatar({ owner: id, x: SPAWN.x + j * 1.2, z: SPAWN.z + (j % 2), heading: SPAWN.heading, vx: 0, vz: 0, drive: 0 }));
    lastAv.delete(id);
  };

  const addHeat = (id: PlayerId, n: number) => {
    const st = statuses.get(id);
    if (st === undefined) return;
    const s = readStatus(st);
    const heat = Math.min(5, s.heat + n);
    if (heat === s.heat) return;
    st.set(Status, { ...s, heat });
    if (s.heat === 0) feedTo(id, "The police are after you!", 3);
    heatClock.set(id, 0);
  };

  const killPlayer = (id: PlayerId) => {
    const st = statuses.get(id);
    if (st === undefined) return;
    const s = readStatus(st);
    host.find(avatarId(id))?.destroy();
    lastAv.delete(id);
    st.set(Status, { ...s, hp: 0, armor: 0, heat: 0, respawn: RESPAWN_SECONDS, jobTo: -1, jobTime: 0, jobPay: 0 });
    const e = empire.get(Empire)!;
    const fee = Math.floor(e.cash * 0.1);
    empire.set(Empire, { ...e, cash: e.cash - fee });
    feed(`${s.name} got wasted. Hospital bills: $${fee.toLocaleString("en-US")}`, 2);
    ctx.send(ctx.players.get(id)!, NolaProtocol.toClient.cue, { kind: 2 });
  };

  const damagePlayer = (id: PlayerId, dmg: number) => {
    const st = statuses.get(id);
    if (st === undefined) return;
    const s = readStatus(st);
    if (s.hp <= 0) return;
    let armor = s.armor;
    let d = dmg;
    if (armor > 0) {
      const soak = Math.min(armor, d * 0.7);
      armor -= soak;
      d -= soak;
    }
    const hp = s.hp - d;
    st.set(Status, { ...s, hp: Math.max(0, hp), armor });
    if (hp <= 0) killPlayer(id);
  };

  // ───── npcs ─────
  const spawnNpc = (kind: number, district: number, x: number, z: number) => {
    const nid = ++counters.nid;
    const hp = kind === 3 ? 220 : kind === 2 ? 60 : kind === 1 ? 30 : 45;
    const e = ctx.world.spawn(Npc({ nid, kind, district, x, z, heading: rnd() * 6.28 - 3.14, hp, act: 0, look: Math.floor(rnd() * 1000) }));
    replica.replicate(e);
    npcs.set(nid, {
      e, kind, district, home: { x, z }, tx: x, tz: z, wait: rnd() * 3, nextShot: ctx.tick + 30, aggro: 0, last: { x, z }, los: false,
      avoid: 0, avoidUntil: 0, flee: 0, dieAt: 0, hitUntil: 0, maxHp: hp,
    });
    return nid;
  };
  const count = (pred: (a: Ai) => boolean) => {
    let n = 0;
    for (const a of npcs.values()) if (pred(a) && a.e.get(Npc)!.act !== 4) n++;
    return n;
  };
  const clearSpot = (x: number, z: number) => walkable(x, z) && !pushOut(x, z, 1.1).hit;
  /** A random clear spot in a ring around (cx, cz). */
  const spotAround = (cx: number, cz: number, rMin: number, rMax: number, accept: (x: number, z: number) => boolean = () => true) => {
    for (let i = 0; i < 14; i++) {
      const ang = rnd() * Math.PI * 2;
      const r = rMin + rnd() * (rMax - rMin);
      const x = cx + Math.sin(ang) * r;
      const z = cz + Math.cos(ang) * r;
      if (clearSpot(x, z) && accept(x, z)) return { x, z };
    }
    return null;
  };

  /** Applies damage from a player; handles rewards, district progress and police attention. */
  const hurtNpc = (ai: Ai, dmg: number, by: PlayerId) => {
    const n = ai.e.get(Npc)!;
    if (n.act === 4) return;
    const hp = n.hp - dmg;
    ai.aggro = ctx.tick + 240;
    if (ai.kind === 1) ai.flee = ctx.tick + 150;
    if (ai.kind === 2) addHeat(by, 1);
    if (hp > 0) {
      ai.e.set(Npc, { ...n, hp });
      if (ai.kind === 1) addHeat(by, 1);
      return;
    }
    ai.e.set(Npc, { ...n, hp: 0, act: 4 });
    ai.dieAt = ctx.tick + 5 * ctx.tickRate;
    const stE = statuses.get(by);
    if (stE !== undefined) {
      const s = readStatus(stE);
      stE.set(Status, { ...s, kills: s.kills + 1 });
    }
    if (ai.kind === 1) {
      addHeat(by, 2);
      feedTo(by, "That was a civilian! Police heat rises.", 3);
    } else if (ai.kind === 2) {
      addHeat(by, 1);
      addCash(100);
    } else {
      const di = ai.district;
      const dE = districts[di]!;
      const d = dE.get(District)!;
      if (d.owned === 1) return;
      if (ai.kind === 3) {
        dE.set(District, { ...d, owned: 1, kills: d.need, boss: 2 });
        const biz = BUSINESSES.filter((b) => b.district === di);
        addCash(3000);
        feed(`${DISTRICTS[di]!.name.toUpperCase()} IS YOURS! ${biz.map((b) => b.name).join(" and ")} now pays you.`, 1);
        cue(1);
      } else {
        addCash(150);
        dE.set(District, { ...d, kills: Math.min(d.need, d.kills + 1) });
      }
    }
  };

  const clearShot = (ox: number, oy: number, oz: number, tx: number, ty: number, tz: number) => {
    const dx = tx - ox;
    const dy = ty - oy;
    const dz = tz - oz;
    const d = Math.hypot(dx, dy, dz);
    if (d < 0.5) return true;
    return castWorld(ox, oy, oz, dx / d, dy / d, dz / d, d - 0.4) >= d - 0.4;
  };

  /** One bullet from a player. */
  const bullet = (id: PlayerId, weapon: number, ox: number, oy: number, oz: number, ux: number, uy: number, uz: number) => {
    const w = WEAPONS[weapon]!;
    let best = castWorld(ox, oy, oz, ux, uy, uz, w.range);
    let victim: Ai | null = null;
    let head = false;
    for (const ai of npcs.values()) {
      const n = ai.e.get(Npc)!;
      if (n.act === 4) continue;
      const px = ox - n.x;
      const pz = oz - n.z;
      const a = ux * ux + uz * uz;
      if (a < 1e-6) continue;
      const b = px * ux + pz * uz;
      const rad = ai.kind === 3 ? 0.75 : 0.55;
      const disc = b * b - a * (px * px + pz * pz - rad * rad);
      if (disc < 0) continue;
      const t = (-b - Math.sqrt(disc)) / a;
      if (t < 0 || t >= best) continue;
      const yy = oy + uy * t;
      if (yy < 0 || yy > (ai.kind === 3 ? 2.2 : 1.9)) continue;
      best = t;
      victim = ai;
      head = yy > (ai.kind === 3 ? 1.8 : 1.5);
    }
    if (victim !== null) hurtNpc(victim, w.dmg * (head ? 2 : 1), id);
    // Startled civilians nearby run.
    for (const ai of npcs.values()) {
      if (ai.kind !== 1) continue;
      const n = ai.e.get(Npc)!;
      if (Math.hypot(n.x - ox, n.z - oz) < 22) ai.flee = Math.max(ai.flee, ctx.tick + 120);
    }
    ctx.broadcast(NolaProtocol.toClient.shot, {
      sx: ox, sy: oy - 0.1, sz: oz, ex: ox + ux * best, ey: oy + uy * best, ez: oz + uz * best, by: id, weapon, hit: victim === null ? 0 : head ? 2 : 1, npc: false,
    });
  };

  // ───── messages ─────
  ctx.onPlayerJoin((player: Player) => {
    counters.players++;
    const st = ctx.world.spawn(
      Status({
        owner: player.id, name: `Player ${counters.players}`, hp: MAX_HP, armor: 0, weapon: 0, owned: 1, heat: 0, kills: 0, respawn: 0,
        jobTo: -1, jobTime: 0, jobPay: 0,
      }),
    );
    replica.replicate(st);
    statuses.set(player.id, st);
    spawnAvatar(player.id);
  });
  ctx.onPlayerLeave((player) => {
    host.find(avatarId(player.id))?.destroy();
    statuses.get(player.id)?.destroy();
    statuses.delete(player.id);
    lastAv.delete(player.id);
    lastFire.delete(player.id);
    heatClock.delete(player.id);
  });

  ctx.onMessage(NolaProtocol.toServer.fire, (player: Player, { dx, dy, dz }) => {
    const len = Math.hypot(dx, dy, dz);
    if (!(len > 0.5) || !Number.isFinite(len)) return;
    const st = statuses.get(player.id);
    const a = readAvatar(player.id);
    if (st === undefined || a === undefined) return;
    const s = readStatus(st);
    if (s.hp <= 0 || a.drive > 0) return;
    const w = WEAPONS[s.weapon]!;
    if (ctx.tick - (lastFire.get(player.id) ?? -1000) < Math.round(w.cd * ctx.tickRate) - 2) return;
    lastFire.set(player.id, ctx.tick);
    for (let i = 0; i < w.pellets; i++) {
      const jx = (rnd() - 0.5) * 2 * w.spread;
      const jy = (rnd() - 0.5) * 2 * w.spread;
      const jz = (rnd() - 0.5) * 2 * w.spread;
      const ux = dx / len + jx;
      const uy = dy / len + jy;
      const uz = dz / len + jz;
      const l = Math.hypot(ux, uy, uz);
      bullet(player.id, s.weapon, a.x, 1.45, a.z, ux / l, uy / l, uz / l);
    }
  });

  ctx.onMessage(NolaProtocol.toServer.weapon, (player: Player, { weapon }) => {
    const st = statuses.get(player.id);
    if (st === undefined) return;
    const s = readStatus(st);
    if ((s.owned & (1 << weapon)) !== 0) st.set(Status, { ...s, weapon });
  });

  ctx.onMessage(NolaProtocol.toServer.enter, (player: Player, { cid }) => {
    const a = readAvatar(player.id);
    const car = cars.get(cid);
    if (a === undefined || car === undefined) return;
    const c = car.get(Car)!;
    if (Math.hypot(c.x - a.x, c.z - a.z) > 9) return;
    car.destroy();
    cars.delete(cid);
  });

  ctx.onMessage(NolaProtocol.toServer.job, (player: Player, { start }) => {
    const st = statuses.get(player.id);
    const a = readAvatar(player.id);
    if (st === undefined || a === undefined) return;
    const s = readStatus(st);
    if (!start) {
      if (s.jobTo >= 0) st.set(Status, { ...s, jobTo: -1, jobTime: 0, jobPay: 0 });
      return;
    }
    if (s.jobTo >= 0 || s.hp <= 0 || !nearHq(a.x, a.z)) return;
    let idx = 0;
    for (let i = 0; i < 20; i++) {
      idx = Math.floor(rnd() * DROPS.length);
      if (Math.hypot(DROPS[idx]!.x - HQ.x, DROPS[idx]!.z - HQ.z) > 70) break;
    }
    const drop = DROPS[idx]!;
    const dist = Math.hypot(drop.x - HQ.x, drop.z - HQ.z);
    st.set(Status, { ...s, jobTo: idx, jobTime: 30 + dist / 9, jobPay: 600 + Math.floor(dist * 8) });
    feedTo(player.id, `Crates loaded. Deliver them to ${drop.name} by car!`, 1);
  });

  ctx.onMessage(NolaProtocol.toServer.buy, (player: Player, { item }) => {
    const st = statuses.get(player.id);
    const a = readAvatar(player.id);
    if (st === undefined || a === undefined || !nearHq(a.x, a.z)) return;
    const s = readStatus(st);
    const e = empire.get(Empire)!;
    const it = SHOP[item]!;
    if (s.hp <= 0 || e.cash < it.price) return;
    let ok = true;
    if (item === 0 || item === 1) {
      const bit = 1 << (item + 1);
      if ((s.owned & bit) !== 0) ok = false;
      else st.set(Status, { ...s, owned: s.owned | bit, weapon: item + 1 });
    } else if (item === 2) {
      if (s.armor >= 100) ok = false;
      else st.set(Status, { ...s, armor: Math.min(100, s.armor + 50) });
    } else if (item === 3) {
      spawnCar(HQ.x + 10 + (cars.size % 3) * 3, HQ.z - 8, Math.PI / 2, 2, 0xf2c14e);
    } else if (item === 4) {
      if (e.level >= MAX_LEVEL) ok = false;
      else empire.set(Empire, { ...empire.get(Empire)!, level: e.level + 1 });
    } else if (item === 5) {
      if (s.hp >= MAX_HP) ok = false;
      else st.set(Status, { ...s, hp: MAX_HP });
    }
    if (!ok) return;
    const now = empire.get(Empire)!;
    empire.set(Empire, { ...now, cash: now.cash - it.price });
    feedTo(player.id, `Bought: ${it.name}`, 1);
  });

  // ───── per-tick work ─────
  const moveNpc = (ai: Ai, n: ReturnType<typeof readNpc>, tx: number, tz: number, speed: number, dt: number) => {
    let dx = tx - n.x;
    let dz = tz - n.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.2) return { x: n.x, z: n.z, heading: n.heading, moved: false };
    dx /= d;
    dz /= d;
    if (ctx.tick < ai.avoidUntil) {
      const c = Math.cos(ai.avoid);
      const s = Math.sin(ai.avoid);
      [dx, dz] = [dx * c - dz * s, dx * s + dz * c];
    }
    let x = n.x + dx * speed * dt;
    let z = n.z + dz * speed * dt;
    const p = pushOut(x, z, 0.5);
    if (p.hit) {
      x += p.x;
      z += p.z;
      if (ctx.tick >= ai.avoidUntil) {
        ai.avoid = (rnd() < 0.5 ? -1 : 1) * (0.9 + rnd() * 0.7);
        ai.avoidUntil = ctx.tick + 20 + Math.floor(rnd() * 20);
      }
    }
    if (!walkable(x, z)) {
      x = n.x;
      z = n.z;
      ai.avoidUntil = ctx.tick + 20;
      ai.avoid = 1.2;
    }
    return { x, z, heading: Math.atan2(dx, dz), moved: true };
  };
  const readNpc = (e: Entity) => e.get(Npc)!;

  const wander = (ai: Ai, n: ReturnType<typeof readNpc>, dt: number, speed: number, radius: number) => {
    if (ai.wait > 0) {
      ai.wait -= dt;
      return 0;
    }
    if (Math.hypot(ai.tx - n.x, ai.tz - n.z) < 1.2 || ctx.tick % 300 === (n.nid * 7) % 300) {
      const spot = spotAround(ai.home.x, ai.home.z, 0, radius);
      if (spot !== null) {
        ai.tx = spot.x;
        ai.tz = spot.z;
      }
      ai.wait = 1 + rnd() * 4;
      return 0;
    }
    const m = moveNpc(ai, n, ai.tx, ai.tz, speed, dt);
    ai.e.set(Npc, { ...n, x: m.x, z: m.z, heading: m.heading, act: 1 });
    return 1;
  };

  const shootPlayer = (ai: Ai, n: ReturnType<typeof readNpc>, foe: Live, d: number) => {
    const boss = ai.kind === 3;
    const p = Math.max(0.12, 0.5 - d * 0.012) * (boss ? 1.25 : 1);
    const hit = rnd() < p;
    const dmg = boss ? 11 : ai.kind === 2 ? 7 : 6;
    const wob = hit ? 0 : (rnd() - 0.5) * 6;
    ctx.broadcast(NolaProtocol.toClient.shot, {
      sx: n.x, sy: 1.35, sz: n.z, ex: foe.a.x + wob, ey: 1.1, ez: foe.a.z + wob * 0.5, by: `npc:${n.nid}`, weapon: ai.kind === 3 ? 2 : 1, hit: hit ? 1 : 0, npc: true,
    });
    if (hit) damagePlayer(foe.id, dmg);
  };

  const stepFighter = (ai: Ai, n: ReturnType<typeof readNpc>, players: Live[], dt: number) => {
    const isCop = ai.kind === 2;
    const foes = isCop ? players.filter((p) => p.s.heat > 0) : players;
    let near: Live | null = null;
    let nd = Infinity;
    for (const p of foes) {
      const d = Math.hypot(p.a.x - n.x, p.a.z - n.z);
      if (d < nd) {
        nd = d;
        near = p;
      }
    }
    const aggroRange = isCop ? 60 : ai.kind === 3 ? 42 : 30;
    if (near !== null && nd < aggroRange && ctx.tick % 6 === n.nid % 6) {
      ai.los = clearShot(n.x, 1.5, n.z, near.a.x, 1.3, near.a.z);
      if (ai.los || (isCop && nd < 40)) {
        ai.aggro = ctx.tick + 200;
        ai.last = { x: near.a.x, z: near.a.z };
      }
    }
    if (near !== null && ctx.tick < ai.aggro) {
      if (ai.los || nd < 12) ai.last = { x: near.a.x, z: near.a.z };
      const fx = ai.last.x - n.x;
      const fz = ai.last.z - n.z;
      const heading = Math.atan2(fx, fz);
      const shootRange = isCop ? 34 : 26;
      if (ai.los && nd < shootRange) {
        const hold = ai.kind === 3 ? 9 : 12;
        let x = n.x;
        let z = n.z;
        let moved = false;
        if (nd > hold) {
          const m = moveNpc(ai, n, ai.last.x, ai.last.z, isCop ? 5.4 : 3.9, dt);
          x = m.x;
          z = m.z;
          moved = true;
        }
        ai.e.set(Npc, { ...n, x, z, heading, act: moved ? 1 : 2 });
        if (ctx.tick >= ai.nextShot) {
          ai.nextShot = ctx.tick + Math.round((ai.kind === 3 ? 0.55 : 0.95 + rnd() * 0.7) * ctx.tickRate);
          shootPlayer(ai, n, near, nd);
        }
      } else {
        const m = moveNpc(ai, n, ai.last.x, ai.last.z, isCop ? 5.6 : 4.2, dt);
        ai.e.set(Npc, { ...n, x: m.x, z: m.z, heading: m.heading, act: 1 });
      }
      return;
    }
    if (isCop) {
      // Nobody to chase: wander off the street scene.
      wander(ai, n, dt, 2.2, 8);
      return;
    }
    if (wander(ai, n, dt, 1.9, 9) === 0 && n.act !== 0) ai.e.set(Npc, { ...n, act: 0 });
  };

  const stepCivilian = (ai: Ai, n: ReturnType<typeof readNpc>, players: Live[], dt: number) => {
    if (ctx.tick < ai.flee) {
      let near: Live | null = null;
      let nd = Infinity;
      for (const p of players) {
        const d = Math.hypot(p.a.x - n.x, p.a.z - n.z);
        if (d < nd) {
          nd = d;
          near = p;
        }
      }
      if (near !== null) {
        const dx = n.x - near.a.x;
        const dz = n.z - near.a.z;
        const l = Math.hypot(dx, dz) || 1;
        const m = moveNpc(ai, n, n.x + (dx / l) * 10, n.z + (dz / l) * 10, 5.2, dt);
        ai.e.set(Npc, { ...n, x: m.x, z: m.z, heading: m.heading, act: 3 });
        return;
      }
    }
    if (wander(ai, n, dt, 1.5, 14) === 0 && n.act !== 0) ai.e.set(Npc, { ...n, act: 0 });
  };

  const spawnWaves = (players: Live[]) => {
    if (players.length === 0) return;
    // Rival gangs in districts that are not yet owned.
    const gang = count((a) => a.kind === 0 || a.kind === 3);
    for (const info of DISTRICTS) {
      if (info.id === QUARTER) continue;
      const dE = districts[info.id]!;
      const d = dE.get(District)!;
      if (d.owned === 1) continue;
      const here = players.filter((p) => districtAt(p.a.x, p.a.z) === info.id || Math.hypot(p.a.x - info.x, p.a.z - info.z) < 70);
      if (here.length === 0) continue;
      const target = d.kills >= d.need ? 0 : Math.min(5, d.need - d.kills);
      const alive = count((a) => a.kind === 0 && a.district === info.id);
      if (alive < target && gang < MAX_GANG) {
        const p = here[Math.floor(rnd() * here.length)]!;
        const spot = spotAround(p.a.x, p.a.z, 28, 60, (x, z) => districtAt(x, z) === info.id && players.every((q) => Math.hypot(q.a.x - x, q.a.z - z) > 24));
        if (spot !== null) spawnNpc(0, info.id, spot.x, spot.z);
      }
      if (d.kills >= d.need && d.boss === 0) {
        const spot = spotAround(info.x, info.z, 0, 25) ?? spotAround(info.x, info.z, 0, 45);
        if (spot !== null) {
          spawnNpc(3, info.id, spot.x, spot.z);
          dE.set(District, { ...d, boss: 1 });
          feed(`${info.boss} of the ${info.gang} steps out in ${info.name}!`, 2);
        }
      }
    }
    // Civilians stroll around the players.
    if (count((a) => a.kind === 1) < MAX_CIVS) {
      const p = players[Math.floor(rnd() * players.length)]!;
      const spot = spotAround(p.a.x, p.a.z, 22, 85);
      if (spot !== null) spawnNpc(1, districtAt(spot.x, spot.z), spot.x, spot.z);
    }
    // Police match the biggest heat.
    const heat = Math.max(0, ...players.map((p) => p.s.heat));
    const want = Math.min(MAX_COPS, heat * 2);
    if (count((a) => a.kind === 2) < want) {
      const p = players.filter((q) => q.s.heat > 0)[0];
      if (p !== undefined) {
        const spot = spotAround(p.a.x, p.a.z, 40, 60);
        if (spot !== null) spawnNpc(2, districtAt(spot.x, spot.z), spot.x, spot.z);
      }
    }
  };

  ctx.onStep(() => {
    const dt = ctx.dt;
    host.step();
    const players = live();
    const sec = ctx.tick % ctx.tickRate === 0;

    // Players: parked cars where drivers got out, run-overs, jobs, healing.
    for (const p of players) {
      const prev = lastAv.get(p.id);
      if (prev !== undefined && prev.drive > 0 && p.a.drive === 0) spawnCar(prev.x, prev.z, prev.heading, prev.drive);
      lastAv.set(p.id, { x: p.a.x, z: p.a.z, heading: p.a.heading, drive: p.a.drive });
      if (p.a.drive > 0) {
        const speed = Math.hypot(p.a.vx, p.a.vz);
        if (speed > 6) {
          for (const ai of npcs.values()) {
            const n = ai.e.get(Npc)!;
            if (n.act === 4 || ctx.tick < ai.hitUntil) continue;
            if (Math.hypot(n.x - p.a.x, n.z - p.a.z) < 2.3) {
              ai.hitUntil = ctx.tick + 15;
              hurtNpc(ai, speed * 3.2, p.id);
            }
          }
        }
      }
      if (p.s.jobTo >= 0) {
        const drop = DROPS[p.s.jobTo]!;
        const left = p.s.jobTime - dt;
        if (p.a.drive > 0 && Math.hypot(p.a.x - drop.x, p.a.z - drop.z) < 9) {
          const pay = p.s.jobPay + Math.floor(left * 8);
          addCash(pay);
          const e = empire.get(Empire)!;
          empire.set(Empire, { ...e, deliveries: e.deliveries + 1 });
          p.st.set(Status, { ...p.s, jobTo: -1, jobTime: 0, jobPay: 0 });
          feed(`${p.s.name} delivered the crates to ${drop.name}: +$${pay.toLocaleString("en-US")}`, 1);
          cue(0);
        } else if (left <= 0) {
          p.st.set(Status, { ...p.s, jobTo: -1, jobTime: 0, jobPay: 0 });
          feedTo(p.id, "Too slow. The buyer walked away.", 2);
        } else p.st.set(Status, { ...p.s, jobTime: left });
      }
    }

    if (sec) {
      // Income every second, and heat cools while hidden from the police.
      const e = empire.get(Empire)!;
      let income = 0;
      for (const b of BUSINESSES) if (districts[b.district]!.get(District)!.owned === 1) income += b.income;
      income *= 1 + 0.25 * e.level;
      const now = empire.get(Empire)!;
      const won = now.won === 1 || now.earned + income >= GOAL ? 1 : 0;
      empire.set(Empire, { ...now, cash: now.cash + income, earned: now.earned + income, income, won });
      if (won === 1 && now.won === 0) {
        feed("You own New Orleans. Kingpin of the Crescent City!", 1);
        cue(1);
      }
      for (const p of players) {
        if (p.s.heat === 0) continue;
        let copNear = false;
        for (const ai of npcs.values()) {
          if (ai.kind !== 2) continue;
          const n = ai.e.get(Npc)!;
          if (n.act !== 4 && Math.hypot(n.x - p.a.x, n.z - p.a.z) < 35) copNear = true;
        }
        const t = copNear ? 0 : (heatClock.get(p.id) ?? 0) + 1;
        if (t >= 18) {
          p.st.set(Status, { ...p.s, heat: p.s.heat - 1 });
          heatClock.set(p.id, 0);
        } else heatClock.set(p.id, t);
      }
      // Health slowly returns when you are not in a fight.
      for (const p of players) if (p.s.hp < MAX_HP && p.s.hp > 0) p.st.set(Status, { ...readStatus(p.st), hp: Math.min(MAX_HP, p.s.hp + 1.5) });
    }

    if (ctx.tick % 15 === 0) spawnWaves(players);

    for (const [nid, ai] of npcs) {
      const n = ai.e.get(Npc)!;
      if (n.act === 4) {
        if (ctx.tick >= ai.dieAt) {
          ai.e.destroy();
          npcs.delete(nid);
        }
        continue;
      }
      // Far from everyone: remove (civilians and police only).
      if ((ai.kind === 1 || (ai.kind === 2 && players.every((p) => p.s.heat === 0))) && ctx.tick % 30 === nid % 30) {
        if (players.every((p) => Math.hypot(p.a.x - n.x, p.a.z - n.z) > (ai.kind === 1 ? 140 : 60))) {
          ai.e.destroy();
          npcs.delete(nid);
          continue;
        }
      }
      if (ai.kind === 1) stepCivilian(ai, n, players, dt);
      else stepFighter(ai, n, players, dt);
    }

    for (const [id, st] of statuses) {
      const s = readStatus(st);
      if (s.respawn <= 0) continue;
      const left = s.respawn - dt;
      if (left > 0) st.set(Status, { ...s, respawn: left });
      else {
        st.set(Status, { ...s, hp: MAX_HP, respawn: 0 });
        spawnAvatar(id);
      }
    }

    host.publish();
    replica.publish();
  });
});
