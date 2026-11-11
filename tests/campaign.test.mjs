import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCampaign, tickCampaign, revenuePerMinute, captureBlock, hire, settleWages, failMission, bonus, resolveDefense, price, trade, launder, layLow, heist, unlock, offlineProgress, restoreCampaign, addHeat } from '../src/campaign.ts';

test('standing at spawn and returning offline with no turf grants zero cash', () => {
  const c = newCampaign();
  for (let i = 0; i < 3600; i++) tickCampaign(c, 1, () => 0);
  assert.equal(c.clean, 300); assert.equal(c.dirty, 0); assert.equal(revenuePerMinute(c), 0);
  assert.equal(offlineProgress(c, 86400).income, 0);
});
test('captured turf earns dirty cash, not clean, and cannot be captured twice', () => {
  const c = newCampaign(); assert.ok(captureBlock(c, 'skidrow')); assert.equal(captureBlock(c, 'skidrow'), false);
  tickCampaign(c, 60, () => 0);
  assert.equal(c.dirty, 180); assert.equal(c.stats.captured, 1); assert.ok(c.heat > 14);
  assert.equal(c.clean, 500); // First Corner reward, not passive clean revenue
});
test('defense pauses corner revenue and unresolved attacks lose ownership and loyalty', () => {
  const c = newCampaign(); captureBlock(c, 'uptown'); hire(c, 'muscle'); c.defenseClock = 0;
  tickCampaign(c, 1, () => 0); assert.equal(c.defense.block, 'uptown');
  assert.equal(revenuePerMinute(c), 0);
  tickCampaign(c, 91, () => 0); assert.deepEqual(c.owned, []); assert.equal(c.crew[0].loyalty, 63);
  captureBlock(c, 'uptown'); c.defense = { block: 'uptown', remaining: 50 };
  resolveDefense(c, true); assert.equal(c.stats.defended, 1); assert.ok(c.owned.includes('uptown'));
});
test('crew bonuses require loyalty and wages; missed pay creates arrears', () => {
  const c = newCampaign(); hire(c, 'muscle'); assert.equal(bonus(c).muscle, true);
  c.clean = 0; c.wageClock = 86399; tickCampaign(c, 2, () => 0);
  assert.equal(c.crew[0].owed, 120); assert.equal(c.crew[0].loyalty, 55); assert.equal(bonus(c).muscle, false);
  c.clean = 200; assert.ok(settleWages(c, 'muscle')); assert.equal(c.clean, 80); assert.equal(bonus(c).muscle, true);
  for (let i = 0; i < 5; i++) failMission(c);
  assert.equal(bonus(c).muscle, false);
});
test('market prices respond to district, event and police heat; no instantaneous buy/sell profit', () => {
  const c = newCampaign(); const first = price(c, 0, 0);
  assert.notEqual(first, price(c, 0, 1)); c.marketEvent = 1; assert.ok(price(c, 0, 0) > first);
  c.marketEvent = 0; c.heat = 70; assert.ok(price(c, 0, 0) < first);
  c.heat = 0; const before = c.clean; assert.ok(trade(c, 0, 0, false)); assert.equal(c.inventory[0], 1);
  assert.ok(trade(c, 0, 0, true)); assert.equal(c.inventory[0], 0); assert.ok(c.clean + c.dirty < before);
  assert.equal(trade(c, 0, 0, true), false); assert.equal(trade(c, 99, 0, true), false);
});
test('laundering takes fee, unlocks permanent reward exactly once, clean upgrades are funded explicitly', () => {
  const c = newCampaign(); c.dirty = 10000;
  assert.equal(launder(c, 10000), 8000); assert.equal(c.dirty, 0); assert.equal(c.stats.cleaned, 8000);
  captureBlock(c, 'skidrow'); unlock(c); const revenue = revenuePerMinute(c); const clean = c.clean;
  assert.equal(revenue, 189); assert.deepEqual(unlock(c), []); assert.equal(c.clean, clean);
  assert.equal(launder(c, -100), 0);
});
test('heists have stakes, cooldown and heat; failure lowers loyalty', () => {
  const c = newCampaign(); hire(c, 'muscle'); c.clean = 1000;
  assert.equal(heist(c, () => 0), true); assert.equal(c.clean, 900); assert.equal(c.dirty, 1200); assert.ok(c.heat >= 25);
  assert.equal(heist(c), null); c.heistCooldown = 0;
  assert.equal(heist(c, () => .99), false); assert.equal(c.crew[0].loyalty, 63);
});
test('heat thresholds generate informants, roadblocks and raids; safehouse costs cash with cooldown', () => {
  const c = newCampaign(); c.heat = 40; c.policeClock = 74; tickCampaign(c, 1, () => 0);
  assert.equal(c.intervention, 'Informant'); c.heat = 70; c.policeClock = 74; tickCampaign(c, 1, () => 0);
  assert.equal(c.intervention, 'Patrol roadblock'); c.heat = 95; c.dirty = 1000; c.inventory = [4,2,0]; c.policeClock = 74;
  tickCampaign(c, 1, () => 0); assert.equal(c.intervention, 'Precinct raid'); assert.equal(c.dirty, 800); assert.deepEqual(c.inventory, [2,1,0]);
  const heat = c.heat; assert.ok(layLow(c)); assert.equal(c.clean, 150); assert.equal(c.heat, heat - 30); assert.equal(layLow(c), false);
});
test('smuggler reduces turf and action heat; achievement records maximum survived', () => {
  const c = newCampaign(); c.clean = 1000; hire(c, 'smuggler'); addHeat(c, 20);
  assert.equal(c.heat, 14); assert.equal(c.stats.maxHeat, 14);
  c.stats.maxHeat = 90; c.heat = 10; assert.ok(unlock(c).includes('Too Hot to Handle'));
});
test('offline earnings cap at 24h, award 35% dirty income, accumulate heat and pay daily upkeep', () => {
  const c = newCampaign(); captureBlock(c, 'skidrow'); c.clean = 1000; hire(c, 'muscle');
  const result = offlineProgress(c, 172800);
  assert.equal(result.seconds, 86400); assert.equal(result.income, 90720); assert.equal(c.dirty, 90720);
  assert.ok(c.heat > 14); assert.equal(c.clean, 680); assert.equal(c.crew[0].owed, 0);
  assert.equal(offlineProgress(c, -100).income, 0);
});
test('save restoration rejects invalid values, deduplicates ownership and retains appearance/inventory/crew', () => {
  const c = newCampaign(); captureBlock(c, 'skidrow'); hire(c, 'muscle'); c.avatar = { gender: 'Woman', heritage: 'Mixed heritage', skin: 5, outfit: 3, hair: 5 };
  c.inventory = [1, 2, 3, 0]; c.defense = { block: 'skidrow', remaining: 40 }; c.intervention = 'Informant';
  assert.deepEqual(restoreCampaign(JSON.parse(JSON.stringify(c))), c);
  const restored = restoreCampaign({ clean: Infinity, dirty: -500, owned: ['skidrow','skidrow','hacked'], crew: [{id:'hacked'}], avatar: {skin:99}, stats: {cleaned: NaN} });
  assert.equal(restored.clean, 300); assert.equal(restored.dirty, 0); assert.deepEqual(restored.owned, ['skidrow']); assert.deepEqual(restored.crew, []); assert.equal(restored.avatar.skin, 5);
  assert.equal(restoreCampaign(null), null);
});

test('smuggler passive turf cooling is applied once, independently of action cooling', () => {
  const c = newCampaign(); c.clean = 1000; hire(c, 'smuggler'); captureBlock(c, 'skidrow');
  const before = c.heat; tickCampaign(c, 60, () => 0);
  assert.ok(Math.abs(c.heat - before - .15) < .00001); // 1.5 * .5 - .6 natural cooling
});
