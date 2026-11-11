import { restoreCampaign, type Campaign } from './campaign.ts';
export const SAVE_KEY = 'cck.campaign.v2';
const RESET_KEY = 'cck.resetAt';
export type Save = { version: 2; savedAt: number; campaign: Campaign; player: Record<string, any> };
function parse(value: unknown): Save | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Save;
  if (v.version !== 2 || !Number.isFinite(v.savedAt) || v.savedAt <= 0) return null;
  const campaign = restoreCampaign(v.campaign);
  return campaign ? { version: 2, savedAt: v.savedAt, campaign, player: v.player && typeof v.player === 'object' ? v.player : {} } : null;
}
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('crescent-city-kingpin', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Save database blocked'));
  });
}
async function database(write?: Save): Promise<unknown> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('saves', write ? 'readwrite' : 'readonly');
      const store = tx.objectStore('saves');
      const request = write ? store.put(write, 'current') : store.get('current');
      tx.oncomplete = () => resolve(write ?? request.result);
      tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export class SaveStore {
  private queue = Promise.resolve();
  load(): Promise<Save | null> {
    return (async () => {
      let local: Save | null = null; let resetAt = 0;
      try { local = parse(JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null')); resetAt = Number(localStorage.getItem(RESET_KEY) ?? 0); } catch { /* fall back to IndexedDB */ }
      let backup: Save | null = null;
      try { backup = parse(await database()); } catch { /* localStorage-only browser */ }
      return [local, backup].filter((s): s is Save => !!s && s.savedAt > resetAt).sort((a, b) => b.savedAt - a.savedAt)[0] ?? null;
    })();
  }
  // localStorage is synchronous for pagehide; the IndexedDB mirror is serialized in the background.
  save(campaign: Campaign, player: Record<string, any>): { local: boolean; mirrored: Promise<boolean> } {
    const snapshot: Save = JSON.parse(JSON.stringify({ version: 2, savedAt: Date.now(), campaign, player }));
    let local = false;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot)); local = true; } catch { /* quota/private mode */ }
    let ok = false;
    const operation = this.queue.then(async () => { try { await database(snapshot); ok = true; } catch { /* report without losing local copy */ } });
    this.queue = operation;
    return { local, mirrored: operation.then(() => ok) };
  }
  async reset() {
    // Timestamp tombstone also excludes an old IDB snapshot if deleting the database is blocked.
    localStorage.setItem(RESET_KEY, String(Date.now()));
    localStorage.removeItem(SAVE_KEY);
    await this.queue;
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').clear();
        tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
      }); db.close();
    } catch { /* tombstone remains authoritative */ }
  }
}
