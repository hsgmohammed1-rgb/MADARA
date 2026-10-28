import React, { useEffect, useState } from 'react';
import type { Language } from '../types';

interface RosterEntry {
  kick: string; // URL slug (verified via Kick API)
  label?: string; // display name when it differs from the slug
  x: string;
  boss?: boolean;
  kickLink?: boolean; // true = show Kick button, otherwise X only
}

// 9 moderators — Kick slug (verified) + X handle (live data via FixTweet + Kick)
// Verified Kick links: 1HHMMDD→llHMD, 1ahhud→Ahhud, 1liBadr→iiiBADR (X bio), laylax9 (name match), a7medo + xAREEJ1 (known pairing).
// llTuin / halenziii_ / alyazia2o → no confirmed Kick channel → X-only cards.
const ROSTER: RosterEntry[] = [
  { kick: 'xAREEJ1', x: 'itsxAREEJ1', boss: true },
  { kick: 'a7medo', x: '_A7MEDO_', kickLink: true },
  { kick: 'laylax9', x: 'iLAYLAx9', kickLink: true },
  { kick: 'llHMD', x: '1HHMMDD', kickLink: true },
  { kick: 'ahhud', x: '1ahhud', kickLink: true },
  { kick: 'iiiBADR', x: '1liBadr', kickLink: true },
  { kick: 'llTuin', x: 'llTuin' },
  { kick: 'halenziii_', x: 'halenziii_' },
  { kick: 'alyazia2o', x: 'alyazia2o' },
];

interface ModProfile {
  name: string;
  handle: string;
  avatar: string;
  banner: string;
  bio: string;
  followers: number | null;
  tweets: number | null;
  live: boolean;
}

const CACHE_KEY = 'madara_mods_cache_v4';
const CACHE_TTL_MS = 30 * 60 * 1000;
const REFRESH_MS = 10 * 60 * 1000;

// phones download ~4x lighter X images (same look, fraction of the memory)
const IS_PHONE = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

const compact = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return '---';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
};

async function fetchJson(url: string, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ---- Layer 0 (instant): Kick channel base — fast & reliable via own proxy ----
async function fetchKickBase(entry: RosterEntry, timeoutMs = 8000): Promise<ModProfile | null> {
  const url = `https://kick.com/api/v2/channels/${entry.kick.toLowerCase()}`;
  let d: any = null;
  try {
    const via = await fetchJson('/api/kick?endpoint=' + encodeURIComponent(url), timeoutMs);
    d = via?.data || via;
  } catch { /* try direct */ }
  if (!d || (!d.user && d.followers_count === undefined)) {
    try {
      const direct = await fetchJson(url, 7000);
      d = direct?.data || direct;
    } catch { return null; }
  }
  if (!d || (!d.user && d.followers_count === undefined)) return null;
  const user = d.user || {};
  const bannerRaw: any = d.banner_image ?? d.banner ?? null;
  const banner = typeof bannerRaw === 'string'
    ? bannerRaw
    : (bannerRaw?.url || (Array.isArray(bannerRaw?.responsive) && bannerRaw.responsive.length ? bannerRaw.responsive[bannerRaw.responsive.length - 1] : '') || '');
  return {
    name: user.username || d.slug || entry.kick,
    handle: entry.x,
    avatar: user.profile_pic || '',
    banner,
    bio: d.channel_description ?? d.description ?? user.bio ?? '',
    followers: typeof d.followers_count === 'number' ? d.followers_count : null,
    tweets: null,
    live: true,
  };
}

// first non-null settler wins (proxy vs direct raced in parallel)
function firstNonNull<T>(promises: Promise<T | null>[]): Promise<T | null> {
  return new Promise((resolve) => {
    let pending = promises.length;
    if (!pending) { resolve(null); return; }
    promises.forEach((p) =>
      p.then((v) => {
        if (v != null) resolve(v);
        else if (--pending === 0) resolve(null);
      }).catch(() => {
        if (--pending === 0) resolve(null);
      })
    );
  });
}

// ---- Layer 1 (enrichment): X via FixTweet — proxy + direct raced, X wins on arrival ----
async function fetchXMod(handle: string, timeoutMs = 9000): Promise<ModProfile | null> {
  const target = `https://api.fxtwitter.com/${handle}`;
  const viaP = fetchJson('/api/kick?endpoint=' + encodeURIComponent(target), timeoutMs)
    .then((r) => r?.user || null).catch(() => null);
  const directP = fetchJson(target, timeoutMs)
    .then((r) => r?.user || null).catch(() => null);
  const user = await firstNonNull([viaP, directP]);
  if (!user) return null;
  const avatarRaw: string = user.avatar_url || '';
  const bannerRaw: string = user.banner_url || '';
  return {
    name: user.name || handle,
    handle: user.screen_name || handle,
    avatar: avatarRaw ? avatarRaw.replace('_normal.', IS_PHONE ? '_200x200.' : '_400x400.') : '',
    banner: bannerRaw ? `${bannerRaw}${IS_PHONE ? '/600x200' : '/1500x500'}` : '',
    bio: user.description || '',
    followers: typeof user.followers === 'number' ? user.followers : null,
    tweets: typeof user.tweets === 'number' ? user.tweets : null,
    live: true,
  };
}

function readCache(): { at: number; data: Record<string, ModProfile> } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---------- Icons (hand-drawn SVG, no external libs) ----------
const XIconSmall = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const KickIconSmall = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 3h4.5v6.9l6-6.9H19l-7.5 8.4L20 21h-5.4l-5.1-6.6V21H3V3z" />
  </svg>
);

const CrownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="modBossCrownBlood" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D6E9FF" />
        <stop offset="45%" stopColor="#9CC5FF" />
        <stop offset="100%" stopColor="#0B1B33" />
      </linearGradient>
    </defs>
    <path fill="url(#modBossCrownBlood)" d="M2.5 8.5 6.5 12l5.5-7 5.5 7 4-3.5L20 18H4L2.5 8.5z" />
    <rect x="4" y="18.6" width="16" height="2.2" rx="1.1" fill="url(#modBossCrownBlood)" />
    <circle cx="12" cy="12.6" r="1.4" fill="#D6E9FF" />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.1 7.5 10 4.3-1.9 7.5-5.4 7.5-10v-6L12 2.5z" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
    <path d="m9 11.5 2.2 2.2L15.5 9.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------- Section — BLUE STORM edition ----------
const ModeratorsSection: React.FC<{ lang: Language }> = ({ lang }) => {
  const [profiles, setProfiles] = useState<Record<string, ModProfile>>(() => readCache()?.data || {});
  const [loading, setLoading] = useState(true);

  const t = {
    mod: lang === 'ar' ? 'مشرف' : 'MOD',
    followers: lang === 'ar' ? 'متابع' : 'Followers',
    posts: lang === 'ar' ? 'منشور' : 'Posts',
    follow: lang === 'ar' ? 'تابع' : 'Follow',
    viewKick: 'Kick',
  };

  const get = (x: string): ModProfile => {
    const p = profiles[x.toLowerCase()];
    if (p) return p;
    const r = ROSTER.find((m) => m.x.toLowerCase() === x.toLowerCase())!;
    return { name: r.kick, handle: x, avatar: '', banner: '', bio: '', followers: null, tweets: null, live: false };
  };

  useEffect(() => {
    let cancelled = false;
    const xLive = new Set<string>();
    const merged: Record<string, ModProfile> = { ...(readCache()?.data || {}) };
    const persist = () => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: merged }));
      } catch { /* storage full — ignore */ }
    };
    // Kick base fills instantly; never downgrades an X-enriched card
    const applyKick = (p: ModProfile) => {
      if (cancelled || xLive.has(p.handle.toLowerCase())) return;
      merged[p.handle.toLowerCase()] = p;
      setProfiles({ ...merged });
    };
    // X overlay wins whenever it lands
    const applyX = (p: ModProfile) => {
      if (cancelled) return;
      xLive.add(p.handle.toLowerCase());
      merged[p.handle.toLowerCase()] = p;
      setProfiles({ ...merged });
      persist();
    };
    const load = async (useCacheFirst = true) => {
      try {
        const cached = readCache();
        const fresh = cached && Date.now() - cached.at < CACHE_TTL_MS;
        if (useCacheFirst && fresh) {
          if (!cancelled) {
            setProfiles(cached!.data);
            setLoading(false);
          }
          return; // fresh cache — zero requests, instant paint
        }
        if (useCacheFirst) setLoading(true);
        // ALL 9 in parallel — each card paints the moment its own data lands
        const kickJobs = ROSTER.map((m) =>
          fetchKickBase(m).then((p) => { if (p) applyKick(p); }).catch(() => {})
        );
        const xJobs = ROSTER.map((m) =>
          fetchXMod(m.x).then((p) => { if (p) applyX(p); }).catch(() => {})
        );
        await Promise.allSettled([...kickJobs, ...xJobs]);
        if (!cancelled) {
          persist();
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    load(true);
    const timer = setInterval(() => load(false), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const boss = ROSTER[0];
  const rest = ROSTER.slice(1);
  const bossP = get(boss.x);

  return (
    <div className="w-full">
      {/* Sync bar — storm shimmer while fetching X */}
      <div
        className={`h-[2px] w-full overflow-hidden rounded-full bg-white/[0.06] mb-4 md:mb-6 transition-opacity duration-700 ${loading ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#4D8DFF] to-transparent animate-pulse shadow-[0_0_12px_#4D8DFF]" />
      </div>

      {/* ================= 👑 BOSS HERO — قلعة العاصفة ================= */}
      <div className="relative mb-4 md:mb-6">
        {/* ambient storm aura behind the card */}
        <div className="absolute -inset-3 rounded-[36px] bg-gradient-to-b from-[#4D8DFF]/15 via-transparent to-transparent blur-2xl pointer-events-none" aria-hidden="true" />
        <div className="group relative rounded-[28px] p-[1.5px] bg-gradient-to-b from-[#7FB2FF] via-[#4D8DFF]/50 to-transparent shadow-[0_30px_90px_rgba(77,141,255,0.28)] overflow-hidden">
          <div className="card-sheen relative rounded-[26.5px] bg-[#080808] overflow-hidden">
            {/* storm orbs */}
            <div className="absolute -top-24 start-1/4 w-96 h-96 rounded-full bg-[#4D8DFF]/[0.12] blur-[110px] pointer-events-none animate-aurora" aria-hidden="true" />
            <div className="absolute -bottom-28 end-0 w-80 h-80 rounded-full bg-[#9CC5FF]/[0.10] blur-[100px] pointer-events-none animate-aurora" style={{ animationDelay: '-8s' }} aria-hidden="true" />
            {/* البانر العلوي */}
            <div className="relative h-44 sm:h-52 lg:h-60 overflow-hidden bg-gradient-to-l from-[#0E1B33] via-[#141414] to-[#091223]">
              {bossP.banner ? (
                <img src={bossP.banner} alt="" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0" aria-hidden="true">
                  <div className="absolute inset-0 bg-gradient-to-l from-[#4D8DFF]/20 via-transparent to-[#9CC5FF]/10" />
                  <div className="absolute top-0 start-1/3 w-96 h-96 rounded-full bg-[#4D8DFF]/15 blur-[100px]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/25 to-transparent" aria-hidden="true" />
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-[#7FB2FF]/90 to-transparent" aria-hidden="true" />
              {/* زر X أعلى البانر */}
              <a
                href={`https://x.com/${boss.x}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`X — ${boss.x}`}
                className="absolute top-3 end-3 w-9 h-9 rounded-xl bg-black/60 backdrop-blur border border-white/15 text-white/80 hover:text-black hover:bg-white hover:border-white flex items-center justify-center transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)]"
              >
                <XIconSmall className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* صف الهوية تحت البانر: الأفاتار يمين + الاسم بجانبه + الإحصائيات يسار — أفقي دائماً */}
            <div className="relative px-4 sm:px-6 lg:px-8 pb-5 sm:pb-7 -mt-9 sm:-mt-12">
              <div className="flex flex-row items-center gap-3 sm:gap-4">
                {/* الأفاتار بالتاج + هالة دوّارة — يمين */}
                <div className="relative w-fit shrink-0">
                  <CrownIcon className="absolute -top-5 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_0_12px_rgba(77,141,255,0.9)] z-10" />
                  <span className="halo-conic -inset-2" aria-hidden="true" />
                  <span
                    className="relative rounded-full p-[2.5px] sm:p-[3px] w-16 h-16 sm:w-24 sm:h-24 shrink-0 block"
                    style={{
                      background: 'conic-gradient(from 200deg,#D6E9FF,#4D8DFF,#7FB2FF,#0B1B33,#D6E9FF)',
                      boxShadow: '0 0 44px rgba(77,141,255,0.6)',
                    }}
                  >
                    <span className="block w-full h-full rounded-full overflow-hidden bg-black border-2 border-black">
                      {bossP.avatar ? (
                        <img src={bossP.avatar} alt={bossP.name} loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="w-full h-full object-cover" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl font-black text-[#D6E9FF] bg-gradient-to-b from-[#0E1B33] to-black" dir="ltr">
                          {(bossP.name || boss.kick).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                  </span>
                  {bossP.live && (
                    <span className="absolute bottom-0.5 sm:bottom-1 end-0.5 sm:end-1 flex" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-[#9CC5FF] opacity-60 animate-ping" />
                      <span className="relative inline-flex w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#9CC5FF] border-2 border-[#080808] shadow-[0_0_10px_#9CC5FF]" />
                    </span>
                  )}
                </div>

                {/* الاسم + الهاندل بجانب الأفاتار — وسط */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-2xl lg:text-[28px] font-black text-white truncate leading-tight" dir="ltr">
                      {bossP.name}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#9CC5FF]/10 border border-[#9CC5FF]/40 text-[#9CC5FF] text-[10px] sm:text-[11px] font-black shrink-0 shadow-[0_0_14px_-4px_rgba(156,197,255,0.5)]" dir="ltr">
                      @{bossP.handle}
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-[#7FB2FF]/70 tracking-[0.12em] mt-1 sm:mt-1.5 truncate text-right" dir="ltr">
                    KICK: {boss.kick}
                  </p>
                </div>

                {/* صندوقا الإحصائيات — يسار */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="inline-flex flex-col items-center min-w-[60px] sm:min-w-[72px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-[#4D8DFF]/[0.07] border border-[#4D8DFF]/30 shadow-[0_0_24px_-8px_rgba(77,141,255,0.5)]">
                    <span className="text-sm sm:text-lg font-black text-[#7FB2FF]" dir="ltr">{compact(bossP.followers)}</span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-white/40">{t.followers}</span>
                  </span>
                  <span className="inline-flex flex-col items-center min-w-[60px] sm:min-w-[72px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-white/[0.04] border border-white/10">
                    <span className="text-sm sm:text-lg font-black text-white" dir="ltr">{compact(bossP.tweets)}</span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-white/40">{t.posts}</span>
                  </span>
                </div>
              </div>

              {/* البايو تحت صف الهوية — يمين دائماً */}
              {bossP.bio ? (
                <p className="text-[12px] sm:text-[13px] text-white/55 leading-relaxed mt-3.5 max-w-3xl line-clamp-2 text-right" dir="auto">
                  {bossP.bio}
                </p>
              ) : null}

              {/* الزرّان */}
              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <a
                  href={`https://x.com/${boss.x}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-arena inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-black hover:brightness-95 active:scale-[0.98] transition-all shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)]"
                >
                  {t.follow} <span dir="ltr">@{boss.x}</span>
                  <XIconSmall className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://kick.com/${boss.kick}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-arena inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4D8DFF]/10 border border-[#4D8DFF]/45 text-white text-[13px] font-black hover:bg-[#4D8DFF] hover:border-[#4D8DFF] hover:shadow-[0_0_28px_rgba(77,141,255,0.6)] active:scale-[0.98] transition-all"
                >
                  {t.viewKick}
                  <KickIconSmall className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 🛡️ MODS GRID ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {rest.map((m, i) => {
          const p = get(m.x);
          return (
            <article
              key={m.x}
              className="group relative rounded-[22px] border border-white/10 bg-white/[0.03] backdrop-blur-xl overflow-hidden hover:border-[#4D8DFF]/55 hover:-translate-y-1 hover:shadow-[0_24px_60px_-16px_rgba(77,141,255,0.45)] transition-all duration-300 animate-fade-in-up card-sheen"
              style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
            >
              {/* storm orb + top energy line */}
              <div className="absolute -top-16 start-1/4 w-48 h-48 rounded-full bg-[#4D8DFF]/10 blur-[70px] pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
              <span className="absolute top-0 start-6 end-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#4D8DFF]/40 to-transparent group-hover:via-[#9CC5FF] group-hover:shadow-[0_0_14px_#4D8DFF] transition-all duration-500 z-10" aria-hidden="true" />
              {/* البانر: شارة مشرف يمين + زر X يسار */}
              <div className="relative h-24 sm:h-28 overflow-hidden bg-[#101010]">
                {p.banner ? (
                  <img src={p.banner} alt="" loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                ) : (
                  <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                    <div className="absolute inset-0 bg-gradient-to-l from-[#0E1B33] via-[#101010] to-[#091223]" />
                    <div className="absolute -top-10 start-1/4 w-48 h-48 rounded-full bg-[#4D8DFF]/15 blur-[60px] group-hover:bg-[#4D8DFF]/25 transition-colors duration-500" />
                    <span className="absolute -bottom-7 end-2 font-black text-[96px] leading-none text-white/[0.06] group-hover:text-[#4D8DFF]/10 transition-colors duration-500 select-none" dir="ltr">
                      {(m.kick || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/20 to-transparent" aria-hidden="true" />
                <span className="absolute top-2.5 start-2.5 inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full bg-black/60 backdrop-blur border border-[#4D8DFF]/45 text-[#D6E9FF] shadow-[0_0_14px_-4px_rgba(77,141,255,0.6)]">
                  {t.mod}
                  <ShieldIcon className="w-3 h-3 text-[#7FB2FF]" />
                </span>
                <a
                  href={`https://x.com/${m.x}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`X — ${m.x}`}
                  className="absolute top-2.5 end-2.5 w-7 h-7 rounded-lg bg-black/60 backdrop-blur border border-white/15 text-white/70 hover:text-black hover:bg-white flex items-center justify-center transition-all duration-300"
                >
                  <XIconSmall className="w-3 h-3" />
                </a>
              </div>

              {/* الجسم تحت البانر: الأفاتار فقط يتداخل مع البانر، والاسم والوصف تحته */}
              <div className="relative px-4 pt-2 pb-4">
                <div className="flex items-end gap-3">
                  <span className="relative shrink-0 -mt-7">
                    <span className="block w-14 h-14 rounded-full p-[2px] bg-gradient-to-b from-[#D6E9FF] via-[#4D8DFF] to-[#0B1B33] shadow-[0_0_22px_rgba(77,141,255,0.5)] group-hover:shadow-[0_0_30px_rgba(77,141,255,0.7)] transition-shadow duration-500">
                      <span className="block w-full h-full rounded-full overflow-hidden bg-black">
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} loading="lazy" decoding="async" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} className="w-full h-full object-cover" />
                        ) : (
                          <span className="w-full h-full flex items-center justify-center text-xl font-black text-[#D6E9FF] bg-gradient-to-b from-[#0E1B33] to-black" dir="ltr">
                            {(p.name || m.kick).charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                    </span>
                    {p.live && (
                      <span className="absolute bottom-0 end-0 flex" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#9CC5FF] opacity-60 animate-ping" />
                        <span className="relative inline-flex w-3.5 h-3.5 rounded-full bg-[#9CC5FF] border-2 border-[#0b0b0b] shadow-[0_0_10px_#9CC5FF]" />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1 pt-2.5 pb-0.5">
                    <h4 className="text-[15px] font-black text-white truncate leading-tight group-hover:text-[#D6E9FF] transition-colors duration-300" dir="ltr">
                      {p.name}
                    </h4>
                    <p className="text-[11px] font-bold text-white/45 truncate mt-0.5" dir="ltr">
                      @{p.handle}
                    </p>
                    <p className="text-[10px] font-bold text-[#7FB2FF]/80 tracking-wide truncate mt-0.5" dir="ltr">
                      KICK: {m.label || m.kick}
                    </p>
                  </div>
                </div>

                <p className="text-[12px] text-white/55 leading-relaxed mt-2.5 line-clamp-2 min-h-[32px]" dir="auto">
                  {p.bio || '---'}
                </p>

                {/* الصف السفلي: حبة المتابعين يمين + زرّا k وتابع يسار */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4D8DFF]/10 border border-[#4D8DFF]/30 group-hover:border-[#4D8DFF]/50 group-hover:shadow-[0_0_16px_-4px_rgba(77,141,255,0.6)] transition-all duration-300">
                    <span className="text-[12px] font-black text-[#7FB2FF]" dir="ltr">{compact(p.followers)}</span>
                    <span className="text-[9px] font-bold text-white/40">{t.followers}</span>
                  </span>
                  <span className="ms-auto flex items-center gap-1.5">
                    {m.kickLink && (
                      <a
                        href={`https://kick.com/${m.kick}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Kick — ${m.kick}`}
                        className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/15 text-white/75 hover:text-[#9CC5FF] hover:border-[#9CC5FF]/60 hover:shadow-[0_0_16px_-4px_rgba(156,197,255,0.5)] flex items-center justify-center active:scale-95 transition-all"
                      >
                        <KickIconSmall className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <a
                      href={`https://x.com/${m.x}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/[0.05] border border-white/15 text-white/85 text-[11px] font-black hover:border-[#9CC5FF]/60 hover:text-white hover:shadow-[0_0_16px_-4px_rgba(77,141,255,0.6)] active:scale-95 transition-all"
                    >
                      {t.follow}
                      <XIconSmall className="w-3 h-3" />
                    </a>
                  </span>
                </div>
              </div>

              {/* bottom storm line that expands on hover */}
              <span className="absolute bottom-0 start-0 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-[#7FB2FF] via-[#4D8DFF] to-[#9CC5FF] shadow-[0_0_12px_#4D8DFF] transition-all duration-500" aria-hidden="true" />
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default ModeratorsSection;
