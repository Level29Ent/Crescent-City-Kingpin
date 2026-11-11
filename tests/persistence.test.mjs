import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { SaveStore, SAVE_KEY } from '../src/persistence.ts';
import { newCampaign } from '../src/campaign.ts';
const entries = new Map();
globalThis.indexedDB = indexedDB;
globalThis.localStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
test('saves mirror both stores, recover corrupted local data and reset without resurrecting backup', async () => {
  const store = new SaveStore(); const c = newCampaign(); c.dirty = 123;
  const result = store.save(c, { x: 10, captured: [0, 1], jobActive: false });
  assert.ok(result.local); assert.ok(await result.mirrored);
  c.dirty = 999; // Saved snapshot must not mutate with in-memory state.
  let read = await store.load(); assert.equal(read.campaign.dirty, 123); assert.deepEqual(read.player.captured, [0, 1]);
  entries.set(SAVE_KEY, 'corrupted-json');
  read = await store.load(); assert.equal(read.campaign.dirty, 123);
  await store.reset(); assert.equal(await store.load(), null);
});
test('IndexedDB still saves when localStorage quota is exceeded', async () => {
  entries.clear(); const store = new SaveStore(); const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('quota'); };
  const result = store.save(newCampaign(), { hp: 80 });
  assert.equal(result.local, false); assert.ok(await result.mirrored);
  localStorage.setItem = original;
  assert.equal((await store.load()).player.hp, 80);
});
