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
