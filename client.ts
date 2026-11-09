// The client: `simulate` predicts your walking and driving and sends shots, shop buys and jobs;
// `present` draws the city, people and cars from a third-person camera, plus the HUD and sound.
import { defineClient } from "@trhs/wildwood/client";
import { createControls } from "@trhs/wildwood/controls";
import { Predicted, networkIdOf } from "@trhs/wildwood/netcode";
import { drawnPose } from "@trhs/wildwood/netcode/drawn";
import { blendPose } from "@trhs/wildwood/netcode/pose";
import { predictClient } from "@trhs/wildwood/predict/client";
import { replicateClient } from "@trhs/wildwood/replicate/client";
import * as THREE from "three";
import { loadCarModels, createCar, createPerson, disposeShared, type Car as CarRig, type Person, type PersonMode } from "./actors.ts";
import { createSound } from "./audio.ts";
import {
  Avatar, avatarPose, BUSINESSES, Car, castWorld, CAR_MAX, District, DISTRICTS, districtAt, DROPS, Empire, game, GOAL, HQ,
  NolaProtocol, Npc, npcPose, simulation, SPAWN, Status, Sync, WEAPONS, type HudModel, type Input, type MapMarker,
} from "./game.ts";
import { createHud } from "./hud.ts";
import { createScenery } from "./scenery.ts";

const BUTTONS = {
  fire: { keys: [] as string[], mouse: 0, label: "Fire" },
  use: { keys: ["KeyE"], label: "Use" },
  sprint: { keys: ["ShiftLeft", "ShiftRight"], label: "Run" },
  w1: { keys: ["Digit1"], label: "Pistol" },
  w2: { keys: ["Digit2"], label: "SMG" },
  w3: { keys: ["Digit3"], label: "Shotgun" },
};
type Btn = keyof typeof BUTTONS;
type Shot = { sx: number; sy: number; sz: number; ex: number; ey: number; ez: number; by: string; weapon: number; hit: number; npc: boolean };

const CAM_DIST_FOOT = 4.6;
const CAM_DIST_CAR = 9.5;

export default defineClient(game, {
  simulate(ctx) {
    const controls = createControls<Btn>({
      move: { left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"] },
      look: true,
      buttons: BUTTONS,
    });
    const ui = {
      yaw: SPAWN.heading, pitch: -0.2, wish: 0, shopOpen: false, lastFire: -1000, alive: false, drive: 0, speed: 0, aimUntil: 0,
      /** The camera ray's aim point, kept fresh by `present`. */
      aim: { x: 0, y: 1.4, z: 0, valid: false },
      cam: { x: 0, y: 2, z: 0 },
    };
    const shots: Shot[] = [];
    const feeds: { text: string; tone: number }[] = [];
    const cues: number[] = [];
    const replica = replicateClient(ctx, Sync, {
      smoothing: {
        avatar: {
          type: "interpolate",
          delayMs: 70,
          lerp: (from, to, t) => avatarPose.place(to, blendPose(avatarPose.pose(from), avatarPose.pose(to), t)),
        },
        npc: {
          type: "interpolate",
          delayMs: 90,
          lerp: (from, to, t) => npcPose.place(to, blendPose(npcPose.pose(from), npcPose.pose(to), t)),
        },
      },
    });
    ctx.onMessage(NolaProtocol.toClient.shot, (s) => void shots.push(s));
    ctx.onMessage(NolaProtocol.toClient.feed, (f) => void feeds.push(f));
    ctx.onMessage(NolaProtocol.toClient.cue, (c) => void cues.push(c.kind));

    const myStatus = () => ctx.world.query(Status).map((e) => e.get(Status)).find((s) => s?.owner === ctx.playerId);
    const myAvatar = () => ctx.world.query(Avatar, Predicted)[0]?.get(Avatar);
    const nearestCar = (x: number, z: number) => {
      let best: { cid: number; style: number; d: number } | null = null;
      for (const e of ctx.world.query(Car)) {
        const c = e.get(Car);
        if (c === undefined) continue;
        const d = Math.hypot(c.x - x, c.z - z);
        if (d < 7 && (best === null || d < best.d)) best = { cid: c.cid, style: c.style, d };
      }
      return best;
    };

    const prediction = predictClient(ctx, {
      simulation,
      side: undefined,
      sample: (): Input => {
        const look = controls.look();
        ui.yaw -= look.x * 0.0026;
        ui.pitch = Math.max(-0.7, Math.min(0.75, ui.pitch - look.y * 0.0022));
        controls.pressed("fire");
        const mv = controls.move();
        const live = ui.alive && !ui.shopOpen;
        const fx = Math.sin(ui.yaw);
        const fz = Math.cos(ui.yaw);
        return {
          mx: live ? fx * mv.y - fz * mv.x : 0,
          mz: live ? fz * mv.y + fx * mv.x : 0,
          face: ui.yaw,
          sprint: controls.held("sprint") ? 1 : 0,
          car: ui.alive ? ui.wish : 0,
          thr: live ? mv.y : 0,
          str: live ? mv.x : 0,
        };
      },
      pose: (entity) => {
        const a = entity.get(Avatar);
        return a === undefined ? undefined : avatarPose.pose(a);
      },
      smoothing: { halfLifeMs: 80, snapDistance: 10 },
    });

    const act = {
      buy: (item: number) => ctx.send(NolaProtocol.toServer.buy, { item }),
      startJob: () => ctx.send(NolaProtocol.toServer.job, { start: true }),
      cancelJob: () => ctx.send(NolaProtocol.toServer.job, { start: false }),
      closeShop: () => void (ui.shopOpen = false),
      selectWeapon: (weapon: number) => ctx.send(NolaProtocol.toServer.weapon, { weapon }),
    };

    ctx.onStep(() => {
      replica.apply();
      prediction.step();
      prediction.publish();
      const me = myAvatar();
      const st = myStatus();
      const wasAlive = ui.alive;
      ui.alive = me !== undefined && (st?.hp ?? 0) > 0;
      ui.drive = me?.drive ?? 0;
      ui.speed = me === undefined ? 0 : Math.hypot(me.vx, me.vz);
      if (!ui.alive) {
        ui.wish = 0;
        ui.shopOpen = false;
      }
      if (ui.alive && !wasAlive && me !== undefined) ui.yaw = me.heading;
      if (ui.drive > 0 && ui.wish === 0 && !controls.held("use")) ui.wish = ui.drive;
      if (me === undefined || st === undefined || !ui.alive) {
        for (const b of ["use", "w1", "w2", "w3"] as const) controls.pressed(b);
        return;
      }
      if (controls.pressed("use")) {
        const atHq = Math.hypot(me.x - HQ.x, me.z - HQ.z) < HQ.r;
        if (ui.shopOpen) ui.shopOpen = false;
        else if (ui.drive > 0) ui.wish = 0;
        else {
          const car = nearestCar(me.x, me.z);
          if (car !== null && !(atHq && car.d > 4)) {
            ui.wish = car.style;
            ctx.send(NolaProtocol.toServer.enter, { cid: car.cid });
          } else if (atHq) {
            ui.shopOpen = true;
            if (document.pointerLockElement !== null) document.exitPointerLock();
          }
        }
      }
      for (const [i, b] of (["w1", "w2", "w3"] as const).entries()) {
        if (controls.pressed(b) && (st.owned & (1 << i)) !== 0) act.selectWeapon(i);
      }
      if (ui.drive === 0 && !ui.shopOpen && controls.held("fire")) {
        const w = WEAPONS[st.weapon]!;
        const cd = Math.max(1, Math.round(w.cd * ctx.tickRate));
        if (ctx.tick - ui.lastFire >= cd) {
          ui.lastFire = ctx.tick;
          ui.aimUntil = ctx.tick + 45;
          // Fire from the chest toward the point under the crosshair.
          let dx = ui.aim.x - me.x;
          let dy = ui.aim.y - 1.45;
          let dz = ui.aim.z - me.z;
          if (!ui.aim.valid || Math.hypot(dx, dy, dz) < 2) {
            dx = Math.sin(ui.yaw) * Math.cos(ui.pitch);
            dy = Math.sin(ui.pitch);
            dz = Math.cos(ui.yaw) * Math.cos(ui.pitch);
          }
          ctx.send(NolaProtocol.toServer.fire, { dx, dy, dz });
        }
      }
    });

    return { controls, replica, prediction, ui, shots, feeds, cues, myStatus, myAvatar, nearestCar, act };
  },

  present(ctx, sim) {
    const { controls, replica, prediction, ui, shots, feeds, cues, myStatus, nearestCar, act } = sim;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    ctx.element.append(renderer.domElement);
    const canvas = renderer.domElement;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, 1, 0.2, 1400);
    scene.add(camera);
    void loadCarModels();
    let kick = 0;
    const scenery = createScenery(scene);
    controls.attach(ctx);
    const sound = createSound(ctx.signal);
    const hud = createHud(ctx.element, ctx.signal, act);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault(), { signal: ctx.signal });
    canvas.addEventListener(
      "click",
      () => {
        if (!ctx.page.touch && !ui.shopOpen && ui.alive && document.pointerLockElement !== canvas) void canvas.requestPointerLock?.();
      },
      { signal: ctx.signal },
    );

    // ───────── actors ─────────
    type Rig = { person?: Person; car?: CarRig; kind: string; style: number; x: number; z: number; flash: number; seen: boolean };
    const rigs = new Map<string, Rig>();
    const freeRig = (r: Rig) => {
      if (r.person !== undefined) {
        r.person.root.removeFromParent();
        r.person.dispose();
      }
      if (r.car !== undefined) {
        r.car.root.removeFromParent();
        r.car.dispose();
      }
    };
    const personKinds = ["gangster", "civilian", "cop", "boss"] as const;
    const getPerson = (key: string, kind: "player" | (typeof personKinds)[number], look: number) => {
      let r = rigs.get(key);
      if (r !== undefined && (r.person === undefined || r.kind !== kind)) {
        freeRig(r);
        r = undefined;
      }
      if (r === undefined) {
        r = { person: createPerson(kind, look), kind, style: 0, x: 0, z: 0, flash: 0, seen: true };
        r.person!.root.traverse((o) => void (o.castShadow = true));
        scene.add(r.person!.root);
        rigs.set(key, r);
      }
      r.seen = true;
      return r;
    };
    const getCar = (key: string, style: number, color: number) => {
      let r = rigs.get(key);
      if (r !== undefined && (r.car === undefined || r.style !== style)) {
        freeRig(r);
        r = undefined;
      }
      if (r === undefined) {
        r = { car: createCar(style, color), kind: "car", style, x: 0, z: 0, flash: 0, seen: true };
        r.car!.root.traverse((o) => void (o.castShadow = true));
        scene.add(r.car!.root);
        rigs.set(key, r);
      }
      r.seen = true;
      return r;
    };

    // Tracers and marker beams.
    const tracerGeo = new THREE.BoxGeometry(0.05, 0.05, 1);
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const tracers: { mesh: THREE.Mesh; t: number }[] = [];
    const beamGeo = new THREE.CylinderGeometry(1.4, 1.4, 90, 16, 1, true);
    beamGeo.translate(0, 45, 0);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd45a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.visible = false;
    scene.add(beam);
    const bossMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
    const bossMark = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4).rotateX(Math.PI), bossMat);
    bossMark.visible = false;
    scene.add(bossMark);

    ctx.signal.addEventListener("abort", () => {
      for (const r of rigs.values()) freeRig(r);
      rigs.clear();
      for (const t of tracers) t.mesh.removeFromParent();
      tracerGeo.dispose();
      tracerMat.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      bossMark.geometry.dispose();
      bossMat.dispose();
      scenery.dispose();
      disposeShared();
      renderer.dispose();
    });

    const v1 = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    const camLook = new THREE.Vector3();
    const last = { hp: 100, heat: 0, x: SPAWN.x, z: SPAWN.z, cash: 0, hurt: 0, hit: 0, hitKind: 0, boot: true };
    const mode = (speed: number, running: boolean): PersonMode => (speed < 0.4 ? "idle" : running || speed > 5.5 ? "run" : "walk");

    return {
      render(frame) {
        const dt = Math.min(frame.dt, 0.1);
        const time = frame.time / 1000;
        const { clientWidth: width, clientHeight: height } = ctx.element;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);

        const st = myStatus();
        const empire = ctx.world.query(Empire)[0]?.get(Empire);
        const statusById = new Map<string, NonNullable<typeof st>>();
        for (const e of ctx.world.query(Status)) {
          const s = e.get(Status);
          if (s !== undefined) statusById.set(s.owner, s);
        }
        for (const r of rigs.values()) r.seen = false;
        const markers: MapMarker[] = [];
        let me: { x: number; z: number; heading: number; drive: number; speed: number } | undefined;
        const myPos = { x: last.x, z: last.z };
        let meRig: Rig | undefined;

        // Avatars: yours (also the camera target) and your friends'.
        for (const entity of ctx.world.query(Avatar)) {
          const drawn = drawnPose(entity, frame, { prediction, replica, key: "avatar", posed: avatarPose });
          if (drawn === undefined) continue;
          const v = drawn.value;
          const mine = entity.has(Predicted);
          const key = mine ? "me" : (networkIdOf(entity) as string);
          const rig = getPerson(key + ":p", "player", mine ? 0 : 300 + (key.length % 7) * 40);
          const prev = Math.hypot(v.x - rig.x, v.z - rig.z) / Math.max(dt, 1e-3);
          rig.x = v.x;
          rig.z = v.z;
          const speed = Math.min(12, Math.hypot(v.vx, v.vz) > 0.01 ? Math.hypot(v.vx, v.vz) : prev);
          const s = statusById.get(v.owner);
          if (v.drive > 0) {
            const c = getCar(key + ":c", v.drive, mine ? 0xb8202c : 0x2e6fb5);
            c.car!.root.position.set(v.x, 0, v.z);
            c.car!.root.rotation.y = v.heading;
            const fwd = v.vx * Math.sin(v.heading) + v.vz * Math.cos(v.heading);
            const prevSteer = (c.flash = c.flash + (Math.max(-1, Math.min(1, (mine ? (controls.move().x) : 0))) - c.flash) * Math.min(1, dt * 8));
            c.car!.motion(fwd, prevSteer, false, time);
            rig.person!.root.visible = true;
            if (rig.person!.root.parent !== c.car!.root) {
              c.car!.root.add(rig.person!.root);
              rig.person!.root.position.copy(c.car!.driverSeat);
              rig.person!.root.position.y -= 0.7;
              rig.person!.root.rotation.set(0, 0, 0);
            }
            rig.person!.pose("idle", 0, time, 0, dt);
            if (mine) meRig = undefined;
          } else {
            const carKey = key + ":c";
            const old = rigs.get(carKey);
            if (old !== undefined) {
              freeRig(old);
              rigs.delete(carKey);
            }
            if (rig.person!.root.parent !== scene) scene.add(rig.person!.root);
            rig.person!.root.position.set(v.x, 0, v.z);
            rig.person!.root.rotation.y = v.heading;
            const aiming = mine ? frame.tick < ui.aimUntil : false;
            rig.person!.pose(aiming ? "aim" : mode(speed, speed > 6), speed, time, s?.weapon ?? 0, dt);
            if (mine) meRig = rig;
          }
          if (mine) {
            me = { x: v.x, z: v.z, heading: v.heading, drive: v.drive, speed: Math.hypot(v.vx, v.vz) };
            myPos.x = v.x;
            myPos.z = v.z;
          } else markers.push({ x: v.x, z: v.z, kind: "player" });
        }
        const friends = markers.length;

        // Parked cars.
        for (const e of ctx.world.query(Car)) {
          const c = e.get(Car);
          if (c === undefined) continue;
          const r = getCar(`car:${c.cid}`, c.style, c.color);
          r.car!.root.position.set(c.x, 0, c.z);
          r.car!.root.rotation.y = c.heading;
          if (r.flash === 0) {
            r.car!.motion(0, 0, false, time);
            r.flash = 1;
          }
          if (Math.hypot(c.x - myPos.x, c.z - myPos.z) < 45) markers.push({ x: c.x, z: c.z, kind: "car" });
        }

        // People.
        let copsNear = false;
        let bossAt: { x: number; z: number } | null = null;
        for (const entity of ctx.world.query(Npc)) {
          const drawn = drawnPose(entity, frame, { prediction: null, replica, key: "npc", posed: npcPose });
          if (drawn === undefined) continue;
          const n = drawn.value;
          const kind = n.kind === 3 ? "boss" : personKinds[n.kind]!;
          const r = getPerson(`npc:${n.nid}`, kind, n.look);
          const speed = Math.min(9, Math.hypot(n.x - r.x, n.z - r.z) / Math.max(dt, 1e-3));
          const first = r.x === 0 && r.z === 0;
          r.x = n.x;
          r.z = n.z;
          const p = r.person!;
          p.root.position.set(n.x, 0, n.z);
          p.root.rotation.y = n.heading;
          const weapon = n.kind === 3 ? 2 : n.kind === 2 ? 0 : n.look % 2;
          const md: PersonMode = n.act === 4 ? "down" : n.act === 2 ? "aim" : first ? "idle" : mode(speed, n.act === 3);
          p.pose(md, speed, time, weapon, dt);
          r.flash = Math.max(0, r.flash - dt * 12);
          p.flash(r.flash);
          if (n.act !== 4) {
            const d = Math.hypot(n.x - myPos.x, n.z - myPos.z);
            if (d < 95) markers.push({ x: n.x, z: n.z, kind: n.kind === 3 ? "boss" : n.kind === 2 ? "cop" : n.kind === 1 ? "civ" : "gang" });
            if (n.kind === 2 && d < 70) copsNear = true;
            if (n.kind === 3) bossAt = { x: n.x, z: n.z };
          }
        }
        for (const [key, r] of rigs) {
          if (r.seen) continue;
          freeRig(r);
          rigs.delete(key);
        }

        // Shots: tracers and muzzle flashes.
        for (const s of shots.splice(0)) {
          const rig = s.npc ? rigs.get(`npc:${s.by.slice(4)}`) : s.by === ctx.playerId ? rigs.get("me:p") : undefined;
          if (s.by === ctx.playerId) kick = 1;
          let sx = s.sx;
          let sy = s.sy;
          let sz = s.sz;
          if (rig?.person !== undefined) {
            rig.flash = 1;
            rig.person.flash(1);
            rig.person.root.updateMatrixWorld(true);
            rig.person.muzzle(v1);
            sx = v1.x;
            sy = v1.y;
            sz = v1.z;
          }
          const len = Math.hypot(s.ex - sx, s.ey - sy, s.ez - sz);
          if (len > 0.5) {
            const m = new THREE.Mesh(tracerGeo, tracerMat);
            m.scale.set(1, 1, len);
            m.position.set((sx + s.ex) / 2, (sy + s.ey) / 2, (sz + s.ez) / 2);
            m.lookAt(s.ex, s.ey, s.ez);
            scene.add(m);
            tracers.push({ mesh: m, t: 0.07 });
          }
          const d = Math.hypot(sx - myPos.x, sz - myPos.z);
          const g = Math.max(0.15, 1 - d / 90);
          if (s.npc) sound.sfx("enemyShot", g);
          else sound.sfx(s.weapon === 0 ? "pistol" : s.weapon === 1 ? "smg" : "shotgun", s.by === ctx.playerId ? 1 : g * 0.7);
          if (s.by === ctx.playerId && s.hit > 0) {
            last.hit = 1;
            last.hitKind = s.hit;
            hud.hit(s.hit);
            sound.sfx(s.hit === 2 ? "headshot" : "hit");
          }
        }
        for (let i = tracers.length - 1; i >= 0; i--) {
          const t = tracers[i]!;
          t.t -= dt;
          if (t.t <= 0) {
            t.mesh.removeFromParent();
            tracers.splice(i, 1);
          }
        }
        for (const f of feeds.splice(0)) hud.feed(f.text, f.tone);
        for (const c of cues.splice(0)) sound.sfx(c === 0 ? "cash" : c === 1 ? "capture" : "death");

        // Sound state.
        const hp = st?.hp ?? 100;
        if (hp < last.hp - 0.5 && !last.boot) {
          last.hurt = Math.min(1, last.hurt + (last.hp - hp) / 25);
          sound.sfx("hurt");
        }
        last.hp = hp;
        const heat = st?.heat ?? 0;
        if (heat > last.heat) sound.sfx("wanted");
        last.heat = heat;
        sound.siren(heat > 0 && copsNear);
        sound.engine(me !== undefined && me.drive > 0 && ui.alive ? Math.min(1, me.speed / CAR_MAX[me.drive]!) : null);
        const cash = empire?.cash ?? 0;
        if (!last.boot && cash > last.cash + 500 && cash - last.cash < 400000) sound.sfx("buy", 0.4);
        last.cash = cash;
        last.boot = false;
        last.hurt = Math.max(0, last.hurt - dt * 1.6);
        last.hit = Math.max(0, last.hit - dt * 4);

        // Camera.
        const alive = ui.alive && me !== undefined;
        if (me !== undefined) {
          last.x = me.x;
          last.z = me.z;
        }
        const driving = alive && me!.drive > 0;
        if (driving) {
          // The camera swings in behind the car.
          let dy = me!.heading - ui.yaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          if (me!.speed > 2 && !controls.held("fire")) ui.yaw += dy * Math.min(1, dt * 2.2);
          ui.pitch += (-0.2 - ui.pitch) * Math.min(1, dt * 1.5);
        }
        if (alive) {
          const dist = driving ? CAM_DIST_CAR : CAM_DIST_FOOT;
          const ty = driving ? 1.6 : 1.55;
          const cp = Math.cos(ui.pitch);
          const vx = Math.sin(ui.yaw) * cp;
          const vy = Math.sin(ui.pitch);
          const vz = Math.cos(ui.yaw) * cp;
          const rx = -Math.cos(ui.yaw);
          const rz = Math.sin(ui.yaw);
          const side = driving ? 0 : 0.85;
          const tx = me!.x + rx * side * 0.5;
          const tz = me!.z + rz * side * 0.5;
          let cx = tx - vx * dist + rx * side * 0.5;
          let cy = ty - vy * dist + (driving ? 1.2 : 0.2);
          let cz = tz - vz * dist + rz * side * 0.5;
          // Pull the camera in when a wall is in the way.
          const ddx = cx - tx;
          const ddy = cy - ty;
          const ddz = cz - tz;
          const dl = Math.hypot(ddx, ddy, ddz);
          const hit = castWorld(tx, ty, tz, ddx / dl, ddy / dl, ddz / dl, dl);
          if (hit < dl) {
            const k = Math.max(0.5, hit - 0.5) / dl;
            cx = tx + ddx * k;
            cy = ty + ddy * k;
            cz = tz + ddz * k;
          }
          cy = Math.max(0.6, cy);
          camPos.set(cx, cy, cz);
          camLook.set(tx + vx * 30, ty + vy * 30 + kick * 0.9, tz + vz * 30);
          kick = Math.max(0, kick - dt * 7);
          const fov = 65 + (driving ? Math.min(14, Math.abs(me!.speed) * 0.35) : controls.held("sprint") ? 4 : 0);
          if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
          camera.position.lerp(camPos, 1 - Math.exp(-dt * 30));
          if (camera.position.distanceTo(camPos) > 12) camera.position.copy(camPos);
          camera.lookAt(camLook);
          ui.cam.x = camera.position.x;
          ui.cam.y = camera.position.y;
          ui.cam.z = camera.position.z;
          // Where the crosshair points, for aiming shots.
          const aimT = Math.min(70, castWorld(camera.position.x, camera.position.y, camera.position.z, vx, vy, vz, 70));
          ui.aim.x = camera.position.x + vx * aimT;
          ui.aim.y = camera.position.y + vy * aimT;
          ui.aim.z = camera.position.z + vz * aimT;
          ui.aim.valid = true;
          camera.fov = driving ? 70 + Math.min(14, me!.speed * 0.4) : 62;
        } else {
          const a = time * 0.12;
          camera.position.set(last.x + Math.sin(a) * 18, 12, last.z + Math.cos(a) * 18);
          camera.lookAt(last.x, 1.5, last.z);
          camera.fov = 62;
          ui.aim.valid = false;
        }
        camera.updateProjectionMatrix();
        if (meRig?.person !== undefined) meRig.person.setVisible(true);

        scenery.update(time, last.x, last.z);

        // Job beam and boss arrow.
        const jobIdx = st?.jobTo ?? -1;
        beam.visible = jobIdx >= 0;
        if (jobIdx >= 0) {
          const drop = DROPS[jobIdx]!;
          beam.position.set(drop.x, 0, drop.z);
          markers.push({ x: drop.x, z: drop.z, kind: "job" });
        }
        bossMark.visible = bossAt !== null;
        if (bossAt !== null) {
          bossMark.position.set(bossAt.x, 3.4 + Math.sin(time * 4) * 0.25, bossAt.z);
          bossMark.rotation.y = time * 2;
        }
        for (const b of BUSINESSES) markers.push({ x: b.x, z: b.z, kind: b.id === 0 ? "hq" : "biz" });

        // HUD.
        const districtsE = ctx.world.query(District).map((e) => e.get(District)!).sort((a, b) => a.id - b.id);
        const here = DISTRICTS[districtAt(last.x, last.z)]!;
        const next = districtsE.find((d) => d.owned === 0);
        let objective: string;
        if (st !== undefined && st.jobTo >= 0) objective = `Deliver the crates to ${DROPS[st.jobTo]!.name}`;
        else if (next !== undefined) {
          const info = DISTRICTS[next.id]!;
          objective =
            next.kills >= next.need
              ? `Take down ${info.boss} in ${info.name}!`
              : `Take ${info.name}: beat the ${info.gang} (${next.kills}/${next.need})`;
        } else objective = `Earn $${GOAL.toLocaleString("en-US")} to be crowned Kingpin`;
        let prompt = "";
        const atHq = me !== undefined && Math.hypot(me.x - HQ.x, me.z - HQ.z) < HQ.r;
        let canEnter = false;
        if (alive && !ui.shopOpen) {
          if (driving) {
            if (me!.speed < 14) prompt = "Press E to get out";
          } else {
            const car = nearestCar(me!.x, me!.z);
            canEnter = car !== null;
            if (car !== null) prompt = "Press E to get in the car";
            else if (atHq) prompt = "Press E to open the back room (shop and deliveries)";
          }
        }
        const model: HudModel = {
          alive: ui.alive,
          respawn: st?.respawn ?? 0,
          hp: st?.hp ?? 100,
          armor: st?.armor ?? 0,
          weapon: st?.weapon ?? 0,
          owned: st?.owned ?? 1,
          heat: st?.heat ?? 0,
          cash,
          earned: empire?.earned ?? 0,
          income: empire?.income ?? 0,
          goal: GOAL,
          level: empire?.level ?? 0,
          won: (empire?.won ?? 0) === 1,
          districtName: here.name,
          districts: districtsE.map((d) => ({
            id: d.id, name: DISTRICTS[d.id]!.name, gang: DISTRICTS[d.id]!.gang, owned: d.owned === 1, kills: d.kills, need: d.need, boss: d.boss,
          })),
          objective,
          prompt,
          shopOpen: ui.shopOpen && atHq && ui.alive,
          inCar: driving,
          speed: driving ? me!.speed * 3.6 : 0,
          job: {
            active: jobIdx >= 0,
            label: jobIdx >= 0 ? DROPS[jobIdx]!.name : "",
            timeLeft: st?.jobTime ?? 0,
            pay: st?.jobPay ?? 0,
          },
          me: { x: me?.x ?? last.x, z: me?.z ?? last.z, heading: me?.heading ?? 0 },
          yaw: ui.yaw,
          markers,
          hurt: last.hurt,
          hitMarker: last.hit,
          hitKind: last.hitKind,
          canEnterCar: canEnter,
          friends,
        };
        if (!model.shopOpen) ui.shopOpen = false;
        hud.update(model);
        renderer.render(scene, camera);
      },
    };
  },
});
