import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/leaderboard.js';
const request = (body, headers = {}) => new Request('https://example.com/api/leaderboard', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const score = { name: 'Test Kingpin', cleaned: 1200, captured: 3, heat: 80 };
test('unconfigured shared storage is explicitly unavailable, never a fake global board', async () => {
  const saved = { ...process.env };
  for (const key of ['KV_REST_API_URL','KV_REST_API_TOKEN','UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN']) delete process.env[key];
  const response = await handler.fetch(new Request('https://example.com/api/leaderboard'));
  assert.equal(response.status, 503); assert.match((await response.json()).error, /not connected/);
  Object.assign(process.env, saved);
});
test('leaderboard validates payloads, rate limits submissions, and reads three metric boards', async () => {
  const savedFetch = globalThis.fetch;
  const originalUrl = process.env.KV_REST_API_URL, originalToken = process.env.KV_REST_API_TOKEN;
  process.env.KV_REST_API_URL = 'https://example.com'; process.env.KV_REST_API_TOKEN = 'test-fixture';
  let locked = false; const calls = [];
  globalThis.fetch = async (_, options) => {
    const commands = JSON.parse(options.body); calls.push(...commands);
    return Response.json(commands.map(cmd => ({ result: cmd[0] === 'SET' && cmd[1].includes(':rate:') ? (locked ? null : (locked = true, 'OK')) : ['ZREVRANGE','ZRANGE'].includes(cmd[0]) ? ['test-id','1200'] : cmd[0] === 'GET' ? 'Test Kingpin' : 'OK' })));
  };
  try {
    assert.equal((await handler.fetch(request({ ...score, heat: -1 }))).status, 400);
    assert.equal((await handler.fetch(request({ ...score, name: '<script>' }))).status, 400);
    assert.equal((await handler.fetch(request(score, { origin: 'https://other.example' }))).status, 403);
    const response = await handler.fetch(request(score)); assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure/);
    assert.equal((await handler.fetch(request(score))).status, 429);
    const get = await handler.fetch(new Request('https://example.com/api/leaderboard'));
    const data = await get.json(); assert.equal(Object.keys(data.boards).length, 4); assert.equal(data.boards['Total Cash Cleaned'][0].name, 'Test Kingpin');
    assert.ok(calls.some(cmd => cmd[0] === 'ZADD'));
  } finally {
    globalThis.fetch = savedFetch;
    if (originalUrl === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = originalUrl;
    if (originalToken === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = originalToken;
  }
});
