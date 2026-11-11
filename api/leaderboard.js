import { randomUUID, createHash } from 'node:crypto';
const metrics = ['cleaned', 'captured', 'heat'];
const labels = { cleaned: 'Total Cash Cleaned', captured: 'Corners Captured', heat: 'Max Heat Survived' };
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
export default {
  async fetch(request) {
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, POST' });
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return json({ error: 'Global leaderboard not connected. Connect a Redis database to this project.' }, 503);
    async function commands(list) {
      const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(list), signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Storage unavailable');
      const data = await response.json();
      if (!Array.isArray(data) || data.some(r => r.error)) throw new Error('Storage command failed');
      return data.map(r => r.result);
    }
    try {
      if (request.method === 'GET') {
        const rankings = await commands(metrics.map(m => ['ZREVRANGE', `cck:board:${m}`, 0, 19, 'WITHSCORES']));
        const ids = [...new Set(rankings.flatMap(rows => rows.filter((_, i) => i % 2 === 0)))];
        const names = ids.length ? await commands(ids.map(id => ['GET', `cck:name:${id}`])) : [];
        const byId = new Map(ids.map((id, i) => [id, names[i] || 'Anonymous Kingpin']));
        const boards = Object.fromEntries(metrics.map((m, index) => {
          const rows = rankings[index]; const entries = [];
          for (let i = 0; i < rows.length; i += 2) entries.push({ name: byId.get(rows[i]), score: Number(rows[i + 1]) });
          return [labels[m], entries];
        }));
        return json({ boards, verification: 'Self-reported single-player scores' });
      }
      const origin = request.headers.get('origin');
      if (origin && origin !== new URL(request.url).origin) return json({ error: 'Cross-origin submissions rejected' }, 403);
      if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'JSON required' }, 415);
      // Bound actual body bytes, not only the client-supplied Content-Length header.
      const reader = request.body?.getReader(); let text = ''; let bytes = 0;
      if (reader) {
        const decoder = new TextDecoder();
        while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 1024) { await reader.cancel(); return json({ error: 'Submission too large' }, 413); } text += decoder.decode(value, { stream: true }); }
        text += decoder.decode();
      }
      let data; try { data = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!data || typeof data.name !== 'string' || !/^[a-zA-Z0-9 _-]{1,24}$/.test(data.name)) return json({ error: 'Alias must be 1–24 letters, numbers, spaces, underscores or hyphens' }, 400);
      const caps = { cleaned: 1e9, captured: 1e6, heat: 100 };
      if (metrics.some(m => !Number.isSafeInteger(data[m]) || data[m] < 0 || data[m] > caps[m])) return json({ error: 'Invalid score values' }, 400);
      const ip = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      // Store only a hash for a short-lived rate-limit key; never publish network identifiers.
      const key = createHash('sha256').update(ip).digest('hex');
      const [allowed] = await commands([['SET', `cck:rate:${key}`, '1', 'NX', 'EX', 60]]);
      if (!allowed) return json({ error: 'Please wait 60 seconds between submissions' }, 429, { 'Retry-After': '60' });
      const cookie = request.headers.get('cookie')?.match(/(?:^|;\s*)cck_player=([a-f0-9-]{36})(?:;|$)/)?.[1];
      const id = cookie || randomUUID();
      await commands([
        ['SET', `cck:name:${id}`, data.name, 'EX', 2592000],
        ...metrics.flatMap(m => [ ['ZADD', `cck:board:${m}`, 'GT', data[m], id], ['ZREMRANGEBYRANK', `cck:board:${m}`, 0, -1001] ]),
      ]);
      return json({ ok: true }, 200, { 'Set-Cookie': `cck_player=${id}; Path=/api/leaderboard; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000` });
    } catch { return json({ error: 'Leaderboard storage is temporarily unavailable' }, 503); }
  },
};
