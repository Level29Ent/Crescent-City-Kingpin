import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cityClock, demandIndex, deliveryPay, deliveryBonus, updateReserve } from '../src/dynamics.ts';

test('sprinting drains, locks when exhausted, and recovers before reactivation', () => {
  const energy = { value: 1, exhausted: false };
  assert.equal(updateReserve(energy, true, 0.1, 22, 16), true);
  assert.deepEqual(energy, { value: 0, exhausted: true });
  assert.equal(updateReserve(energy, true, 1, 22, 16), false);
  assert.equal(updateReserve(energy, true, 1, 22, 16), false);
  assert.equal(updateReserve(energy, true, 0.1, 22, 16), true);
  updateReserve(energy, false, 100, 22, 16);
  assert.equal(energy.value, 100);
});

test('nitro is finite and refills without exceeding capacity', () => {
  const fuel = { value: 100, exhausted: false };
  for (let i = 0; i < 80; i++) updateReserve(fuel, true, 0.05, 30, 12);
  assert.equal(fuel.exhausted, true);
  assert.ok(fuel.value < 25);
  for (let i = 0; i < 200; i++) updateReserve(fuel, false, 0.05, 30, 12);
  assert.deepEqual(fuel, { value: 100, exhausted: false });
});

test('city cycles through dusk, night, sunrise and daylight, then wraps', () => {
  assert.equal(cityClock(0).label, 'GOLDEN HOUR');
  assert.equal(cityClock(240).label, 'AFTER HOURS');
  assert.equal(cityClock(520).label, 'SUNRISE');
  assert.equal(cityClock(720).daylight, 1);
  assert.deepEqual(cityClock(960), cityClock(0));
});

test('priority destinations rotate every ninety seconds and wrap', () => {
  assert.equal(demandIndex(89.9, 9), 0);
  assert.equal(demandIndex(90, 9), 1);
  assert.equal(demandIndex(810, 9), 0);
});

test('contracts reward streaks and priority, cap streak scaling and bound speed bonuses', () => {
  assert.equal(deliveryPay(100, 0, false), 1100);
  assert.equal(deliveryPay(100, 2, true), 1980);
  assert.equal(deliveryPay(100, 500, false), 1650);
  assert.equal(deliveryBonus(1000, 30, 60), 125);
  assert.equal(deliveryBonus(1000, -1, 60), 0);
  assert.equal(deliveryBonus(1000, 120, 60), 250);
});
