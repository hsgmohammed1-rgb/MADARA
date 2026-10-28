// creators.sa unified donation leaderboard — MDRA9, MONTHLY only.
// Public endpoint, no token: /v1/kebab/unified/MDRA9/leaderboard?limit=5&duration=monthly
// Response: [{ uname: string, total: number, last_donation_at: string }]
// Layers: 1) /api/kick proxy (dev+prod, no CORS) 2) direct fetch 3) cache.

import { kickFetch } from './kickApi';

export interface Supporter {
  name: string;
  amount: number; // total SAR for the month
  rank: number;
}

const URL_MONTHLY = 'https://api.creators.sa/v1/kebab/unified/MDRA9/leaderboard?limit=5&duration=monthly';
const CACHE_KEY = 'madara_supporters_monthly_v1';
export const SUPPORTERS_TTL_MS = 5 * 60 * 1000;

function normalize(input: any): Supporter[] {
  const arr = Array.isArray(input) ? input : Array.isArray(input?.data) ? input.data : [];
  return arr
    .filter((d: any) => d && typeof d?.uname === 'string' && d.uname.trim())
    .map((d: any, i: number) => ({
      name: d.uname.trim(),
      amount: Math.max(0, Math.round(Number(d.total) || 0)),
      rank: i + 1,
    }))
    .slice(0, 5);
}

function readCache(): Supporter[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, list } = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    if (Date.now() - at > SUPPORTERS_TTL_MS) return null;
    return list;
  } catch {
    return null;
  }
}

function writeCache(list: Supporter[]): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), list }));
  } catch {}
}

/** Monthly supporters only (duration=monthly, top 5). */
export async function getMonthlySupporters(): Promise<Supporter[]> {
  // 1) server proxy
  try {
    const d = await kickFetch(URL_MONTHLY);
    const list = normalize(d);
    if (list.length) {
      writeCache(list);
      return list;
    }
  } catch {}
  // 2) direct
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(URL_MONTHLY, { signal: controller.signal });
    clearTimeout(t);
    if (res.ok) {
      const list = normalize(await res.json());
      if (list.length) {
        writeCache(list);
        return list;
      }
    }
  } catch {}
  // 3) stale cache (even expired — better than nothing)
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { list } = JSON.parse(raw);
      if (Array.isArray(list) && list.length) return list;
    }
  } catch {}
  return [];
}
