import { startTestGame } from "@trhs/wildwood/testing";
import { expect, it } from "vitest";
import client from "./client.ts";
import { Avatar, castWorld, District, Empire, HQ, pushOut, Status, walkable, BUILDINGS, SPAWN } from "./game.ts";
import server from "./server.ts";

it("buildings block walking and bullets, the river blocks walking", () => {
  const b = BUILDINGS.find((x) => x.style === 6)!;
  const cx = (b.x0 + b.x1) / 2;
  const cz = (b.z0 + b.z1) / 2;
  expect(pushOut(cx, cz, 0.5).hit).toBe(true);
  expect(pushOut(SPAWN.x, SPAWN.z, 0.5).hit).toBe(false);
  expect(castWorld(cx, 1.5, cz - 30, 0, 0, 1, 100)).toBeLessThan(30);
  expect(walkable(0, 215)).toBe(false);
  expect(walkable(35, 200)).toBe(true);
});

it("a player joins at the street by the shop, buys a weapon and gets income", () => {
  const test = startTestGame({ server, client, clients: 1 });
  test.settle();
  test.advance(2500);
  const avatars = () => test.server.world.query(Avatar).map((e) => e.get(Avatar)!);
  expect(avatars()).toHaveLength(1);
  expect(test.server.world.query(Status)).toHaveLength(1);
  expect(test.server.world.query(District)).toHaveLength(5);
  const cash = test.server.world.query(Empire)[0]!.get(Empire)!.cash;
  expect(cash).toBeGreaterThan(500);
  const me = test.clients[0]!;
  const a = avatars()[0]!;
  expect(Math.hypot(a.x - HQ.x, a.z - HQ.z)).toBeLessThan(40);
  me.runtime.simulation.controls.set({ move: { x: 0, y: 1 } });
  test.advance(1000);
  const moved = avatars()[0]!;
  expect(Math.hypot(moved.x - a.x, moved.z - a.z)).toBeGreaterThan(2);
});
