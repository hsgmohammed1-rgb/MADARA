import React, { useEffect, useState, useMemo, useRef } from 'react';

interface BotrixEntry {
  watchtime: number;
  points: number;
  name: string;
}

interface BotrixLeaderboardProps {
  lang: 'en' | 'ar';
}

const API_URL = '/api/kick?endpoint=' + encodeURIComponent('https://botrix.live//api/public/leaderboard?platform=kick&user=mdra9');
/* direct-from-browser first (CORS on kick.com API works, proxy may be CF-blocked), proxy as fallback */
const kickChannelUrl = (name: string) => `https://kick.com/api/v2/channels/${encodeURIComponent(name)}`;

/* Kick avatars — lazy per-user fetch, cached for the session */
const AVATAR_CACHE = new Map<string, string>();

/* Botrix watchtime unit = minutes.
   12365 -> 8d 14h 5m  =>  d = v/1440, h = (v%1440)/60, m = v%60 */
const splitWatchtime = (mins: number) => {
  const v = Math.max(0, Math.floor(Number(mins) || 0));
  return { d: Math.floor(v / 1440), h: Math.floor((v % 1440) / 60), m: v % 60 };
};

const arUnit = (v: number, one: string, two: string, many: string) =>
  v === 1 ? one : v === 2 ? two : `${v.toLocaleString('en-US')} ${many}`;

/* Botrix watchtime unit = minutes. COMPACT format — long forms looked clunky:
   d>0 → "يومين 15س" / "2d 15h"   (minutes dropped once days exist)
   d=0 → "15س 10د" / "15h 10m"    else → "10د" / "10m"
   pretty=true (podium) → proper Arabic words: "يومين و 9 ساعات" */
const formatWatchtime = (mins: number, lang: 'en' | 'ar', pretty = false) => {
  const { d, h, m } = splitWatchtime(mins);
  if (pretty) {
    if (lang === 'en') {
      const parts = d > 0 ? [`${d}d`] : [];
      if (h > 0) parts.push(`${h}h`);
      return parts.join(' + ') || '0h';
    }
    const parts: string[] = [];
    if (d > 0) parts.push(arUnit(d, 'يوم', 'يومين', 'أيام'));
    if (h > 0) parts.push(arUnit(h, 'ساعة', 'ساعتين', 'ساعات'));
    return parts.join(' و ') || '0 دقيقة';
  }
  if (d > 0) {
    if (lang === 'en') {
      const parts = [`${d}d`];
      if (h > 0) parts.push(`${h}h`);
      return parts.join(' ');
    }
    const parts = [arUnit(d, 'يوم', 'يومين', 'أيام')];
    if (h > 0) parts.push(`${h} س`);
    return parts.join(' ');
  }
  if (h > 0) {
    if (lang === 'en') {
      const parts = [`${h}h`];
      if (m > 0) parts.push(`${m}m`);
      return parts.join(' ');
    }
    const parts = [`${h} س`];
    if (m > 0) parts.push(`${m} د`);
    return parts.join(' ');
  }
  return lang === 'en' ? `${m}m` : `${m} د`;
};

const formatNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return (n || 0).toLocaleString('en-US');
};

const SkeletonRow: React.FC<{ delay: number }> = ({ delay }) => (
  <div className="flex items-center gap-3 p-3 md:p-4 rounded-2xl bg-white/[0.02] animate-pulse" style={{ animationDelay: `${delay}ms` }}>
    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/[0.04]"></div>
    <div className="flex-1 space-y-2">
      <div className="h-3 w-28 bg-white/[0.04] rounded-lg"></div>
      <div className="h-2 w-36 bg-white/[0.02] rounded-lg"></div>
    </div>
    <div className="w-16 h-5 bg-white/[0.04] rounded-lg"></div>
  </div>
);

const BotrixLeaderboard: React.FC<BotrixLeaderboardProps> = ({ lang }) => {
  const [data, setData] = useState<BotrixEntry[] | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch(API_URL)
      .then(r => r.json())
      .then((json: any[]) => {
        if (cancelled) return;
        if (!Array.isArray(json)) { setData([]); return; }
        // Only watchtime + points from the API, ranked by most watched
        const clean: BotrixEntry[] = json
          .filter(e => e && typeof e?.name === 'string')
          .map(e => ({
            name: String(e.name),
            watchtime: Math.max(0, Math.floor(Number(e.watchtime) || 0)),
            points: Math.max(0, Math.floor(Number(e.points) || 0)),
          }))
          .sort((a, b) => (b.watchtime || 0) - (a.watchtime || 0))
          .slice(0, 50);
        setData(clean);
      })
      .catch(() => { if (!cancelled) setData([]); });
    return () => { cancelled = true; };
  }, []);

  const rich = useMemo(() => data || [], [data]);

  // Enrich every legend with their Kick profile picture (lazy, batched, cached)
  useEffect(() => {
    if (!rich.length) return;
    const toFetch = rich.map(e => e.name).filter(n => !fetchedRef.current.has(n.toLowerCase()));
    if (!toFetch.length) return;
    toFetch.forEach(n => fetchedRef.current.add(n.toLowerCase()));
    let cancelled = false;
    const fetchOne = async (name: string) => {
      try {
        const cached = AVATAR_CACHE.get(name.toLowerCase());
        if (cached !== undefined) return { name, avatar: cached };
        // direct from the browser first (kick API passes CORS), own proxy as fallback
        let avatar = '';
        try {
          const res = await fetch(kickChannelUrl(name));
          if (res.ok) {
            const j = await res.json();
            const d = j?.data || j;
            avatar = d?.user?.profile_pic || '';
          }
        } catch { /* fall through to proxy */ }
        if (!avatar) {
          try {
            const res = await fetch('/api/kick?endpoint=' + encodeURIComponent(kickChannelUrl(name)));
            if (res.ok) {
              const j = await res.json();
              const d = j?.data || j;
              avatar = d?.user?.profile_pic || '';
            }
          } catch { /* no avatar for this legend */ }
        }
        AVATAR_CACHE.set(name.toLowerCase(), avatar);
        return { name, avatar };
      } catch { return null; }
    };
    (async () => {
      for (let i = 0; i < toFetch.length; i += 4) {
        const batch = await Promise.all(toFetch.slice(i, i + 4).map(fetchOne));
        if (cancelled) return;
        const next: Record<string, string> = {};
        batch.forEach(b => { if (b) next[b.name] = b.avatar; });
        setAvatars(prev => ({ ...prev, ...next }));
      }
    })();
    return () => { cancelled = true; };
  }, [rich]);

  const maxWatch = Math.max(1, ...rich.map(e => e.watchtime || 0));
  const totalWatch = rich.reduce((s, e) => s + (e.watchtime || 0), 0);
  const totalPoints = rich.reduce((s, e) => s + (e.points || 0), 0);

  const t = {
    title: lang === 'ar' ? 'أساطير الشات' : 'Chat Legends',
    subtitle: lang === 'ar' ? 'الأعلى مشاهدة في جميع البثوث' : 'Most watched across all streams',
    empty: lang === 'ar' ? 'لا توجد بيانات حالياً' : 'No data available',
    watched: lang === 'ar' ? 'مشاهدة' : 'Watched',
    points: lang === 'ar' ? 'نقطة' : 'PTS',
    legends: lang === 'ar' ? 'أسطورة' : 'Legends',
  };

  const podium = rich.slice(0, 3);
  const hueOf = (n: string) => [...n].reduce((a, ch) => a + ch.charCodeAt(0), 0) * 37 % 360;

  return (
    <div className="w-full animate-fade-in-up" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="cl-panel">
        {/* header — star + title + pills */}
        <div className="cl-top">
          <div className="cl-star">★</div>
          <div className="min-w-0">
            <h3 className="cl-title">{t.title}</h3>
            <p className="cl-sub">{t.subtitle}</p>
          </div>
          <div className="cl-pills">
            <span className="cl-pill" dir="ltr">{rich.length} {t.legends}</span>
            <span className="cl-pill mn" dir={lang === 'ar' ? 'rtl' : 'ltr'}>{formatWatchtime(totalWatch, lang)}</span>
          </div>
        </div>

        <div className="relative px-4 md:px-7 pb-6 z-10">
          {!data && (
            <div className="space-y-1.5 pt-2">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} delay={i * 60} />)}
            </div>
          )}

          {data && data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4 border border-white/[0.06]">
                <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.72m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
              </div>
              <p className="text-sm text-white/30 font-medium">{t.empty}</p>
            </div>
          )}

          {rich.length > 0 && (
            <>
              {/* podium top-3 — center is #1 (crown + tall base), ranked purely by watchtime */}
              <div className="cl-pod">
                {podium[1] && (
                  <div key={podium[1].name} className="cl-pi cl-p2 animate-fade-in-up transition-transform duration-500 hover:-translate-y-1.5" style={{ animationDelay: '90ms' }} dir="ltr">
                    <span className="cl-av" style={{ '--h': hueOf(podium[1].name) } as React.CSSProperties}>
                      {avatars[podium[1].name]
                        ? <img src={avatars[podium[1].name]} alt={podium[1].name} loading="eager" decoding="async" />
                        : podium[1].name.charAt(0).toUpperCase()}
                    </span>
                    <b dir="auto">{podium[1].name}</b>
                    <small>Lv.{Math.max(1, Math.round((podium[1].points || 0) / 1750))} · {formatNum(podium[1].points)} XP</small>
                    <em dir={lang === 'ar' ? 'rtl' : 'ltr'} className="cl-time"><span className="ico">⏱</span><b>{formatWatchtime(podium[1].watchtime, lang, true)}</b></em>
                    <div className="cl-base">2</div>
                  </div>
                )}
                {podium[0] && (
                  <div key={podium[0].name} className="cl-pi cl-p1 animate-fade-in-up transition-transform duration-500 hover:-translate-y-1.5">
                    <div className="cl-crown">👑</div>
                    <span className="cl-av" style={{ '--h': hueOf(podium[0].name) } as React.CSSProperties}>
                      {avatars[podium[0].name]
                        ? <img src={avatars[podium[0].name]} alt={podium[0].name} loading="eager" decoding="async" />
                        : podium[0].name.charAt(0).toUpperCase()}
                    </span>
                    <b dir="auto">{podium[0].name}</b>
                    <small>Lv.{Math.max(1, Math.round((podium[0].points || 0) / 1750))} · {formatNum(podium[0].points)} XP</small>
                    <em dir={lang === 'ar' ? 'rtl' : 'ltr'} className="cl-time"><span className="ico">⏱</span><b>{formatWatchtime(podium[0].watchtime, lang, true)}</b></em>
                    <div className="cl-base">1</div>
                  </div>
                )}
                {podium[2] && (
                  <div key={podium[2].name} className="cl-pi cl-p3 animate-fade-in-up transition-transform duration-500 hover:-translate-y-1.5" style={{ animationDelay: '180ms' }} dir="ltr">
                    <span className="cl-av" style={{ '--h': hueOf(podium[2].name) } as React.CSSProperties}>
                      {avatars[podium[2].name]
                        ? <img src={avatars[podium[2].name]} alt={podium[2].name} loading="eager" decoding="async" />
                        : podium[2].name.charAt(0).toUpperCase()}
                    </span>
                    <b dir="auto">{podium[2].name}</b>
                    <small>Lv.{Math.max(1, Math.round((podium[2].points || 0) / 1750))} · {formatNum(podium[2].points)} XP</small>
                    <em dir={lang === 'ar' ? 'rtl' : 'ltr'} className="cl-time"><span className="ico">⏱</span><b>{formatWatchtime(podium[2].watchtime, lang, true)}</b></em>
                    <div className="cl-base">3</div>
                  </div>
                )}
              </div>

              {/* rows — chat legends list with progress bars */}
              <div className="cl-list">
                {rich.slice(3).map((e, idx) => {
                  const rank = idx + 4;
                  const pct = Math.max(4, Math.round(((e.watchtime || 0) / maxWatch) * 100));
                  return (
                    <div key={e.name} className="cl-row" style={{ '--i': Math.min(idx, 20), '--w': pct + '%', '--h': hueOf(e.name) } as React.CSSProperties}>
                      <span className="cl-rk" dir="ltr">{String(rank).padStart(2, '0')}</span>
                      <span className="cl-av">
                        {avatars[e.name]
                          ? <img src={avatars[e.name]} alt={e.name} loading="eager" decoding="async" />
                          : e.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="cl-nm min-w-0">
                        <b className="truncate" dir="auto">{e.name}</b>
                        <small>Lv.{Math.max(1, Math.round((e.points || 0) / 1750))}</small>
                      </div>
                      <div className="cl-st" dir="ltr">
                        <span className="h">{formatWatchtime(e.watchtime, 'en')}</span>
                        <span>{formatNum(e.points)} XP</span>
                      </div>
                      <div className="cl-bar"><i /></div>
                    </div>
                  );
                })}
                <div className="h-3"></div>
              </div>
            </>
          )}
        </div>

        <div className="relative px-5 md:px-7 pb-5 flex items-center justify-center gap-3 z-10">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
          <span className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/40 bg-white/[0.04] border border-white/10 rounded-full px-3.5 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9CC5FF] animate-pulse shadow-[0_0_8px_#9CC5FF]" />
            {lang === 'ar' ? 'نخبة الشات المباشر' : 'Live chat elite'}
            {totalPoints > 0 && <span className="text-[#8FC1FF]" dir="ltr">• {formatNum(totalPoints)}</span>}
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};

export default BotrixLeaderboard;
