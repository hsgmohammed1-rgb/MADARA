import React, { useState, useEffect, useRef } from 'react';
import { XIcon, YoutubeIcon } from './Icons';
import { Language } from '../types';

interface YoutubeData {
   title: string;
   link: string;
   date: string;
   thumbnail: string;
}

interface CommunityWidgetsProps {
   lang: Language;
}

/* ============ 3D tilt engine (pointer-fine only, GPU transforms) ============ */
function useTilt(max = 9) {
   const ref = useRef<HTMLDivElement>(null);
   const fine = useRef(false);
   const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 20, on: false });
   useEffect(() => {
      fine.current =
         window.matchMedia('(pointer: fine)').matches &&
         !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   }, []);
   const move = (e: React.PointerEvent) => {
      if (!fine.current || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      setTilt({ ry: (px - 0.5) * max * 2, rx: (0.5 - py) * max * 2, gx: px * 100, gy: py * 100, on: true });
   };
   const leave = () => setTilt((s) => ({ ...s, rx: 0, ry: 0, on: false }));
   return { ref, tilt, move, leave };
}

const tiltStyle = (tilt: { rx: number; ry: number; on: boolean }): React.CSSProperties => ({
   transform: `perspective(1100px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.on ? 1.015 : 1})`,
   transition: tilt.on ? 'transform 0.12s ease-out' : 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
   transformStyle: 'preserve-3d',
   willChange: 'transform',
});

const CardSkeleton: React.FC<{ glow: string }> = ({ glow }) => (
   <div className="w-full rounded-[26px] border border-white/10 bg-[#0a0a0a]/80 backdrop-blur-xl p-5 animate-pulse" aria-hidden="true">
      <div className="h-20 rounded-2xl bg-white/[0.06]" />
      <div className="flex items-center gap-3 mt-4">
         <div className="w-14 h-14 rounded-2xl" style={{ background: glow }} />
         <div className="flex-1">
            <div className="h-4 rounded-lg bg-white/10 w-2/3" />
            <div className="h-3 rounded-lg bg-white/[0.07] w-1/3 mt-2" />
         </div>
      </div>
      <div className="h-12 rounded-2xl bg-white/[0.06] mt-4" />
   </div>
);

/* ============================ X — MADARA (@vmadara9) ============================
   Live profile data, refreshed every 5 minutes:
     1) FixTweet API (avatar, banner, bio, followers, verified)
     2) Verified fallback snapshot (fetched 2026-10-28 — fresh images straight from MADARA's X profile) */
const X_HANDLE = 'vmadara9';
const X_URL = 'https://x.com/vmadara9';
const X_AVATAR_FALLBACK = 'https://pbs.twimg.com/profile_images/1987693731173048320/YIy048VT_400x400.jpg';
const X_BANNER_FALLBACK = 'https://pbs.twimg.com/profile_banners/1057972834570588160/1791105556/1500x500';

interface XLive {
   name: string;
   handle: string;
   bio: string;
   location: string;
   followers: number;
   following: number;
   tweets: number;
   avatar: string;
   banner: string;
   verified: boolean;
}

const X_FALLBACK: XLive = {
   name: 'MADARA',
   handle: 'vmadara9',
   bio: 'Streamer and Content Creator For @Level_one — @KickStreaming Partner',
   location: 'kick.com/mdra9',
   followers: 8472,
   following: 169,
   tweets: 181,
   avatar: X_AVATAR_FALLBACK,
   banner: X_BANNER_FALLBACK,
   verified: true,
};

/* Latest post — pinned snapshot from MADARA's X (20 Oct) */
const X_LAST_POST = {
   text: 'هلا شباب من زمان عنكم الزبده\nان شاء الله في بث الفجرية 🤍',
   tag: '',
   timeEn: 'Oct 20',
   timeAr: '20 اكتوبر',
   url: X_URL,
   image: '',  /* text-only per user request */
};

const fmtCompact = (n: number) =>
   n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

export const XWidget: React.FC<CommunityWidgetsProps> = ({ lang }) => {
   const [data, setData] = useState<XLive>(X_FALLBACK);
   const [loading, setLoading] = useState(true);
   const { ref, tilt, move, leave } = useTilt(9);
   const isRTL = lang === 'ar';

   useEffect(() => {
      let dead = false;
      const fetchX = async () => {
         try {
            const res = await fetch(`https://api.fxtwitter.com/${X_HANDLE}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const j = await res.json();
            const u = j?.user;
            if (!dead && u) {
               setData({
                  name: u.name || X_FALLBACK.name,
                  handle: u.screen_name || X_FALLBACK.handle,
                  bio: (u.description || X_FALLBACK.bio).split('\n')[0],
                  location: u.location || X_FALLBACK.location,
                  followers: Number(u.followers) || X_FALLBACK.followers,
                  following: Number(u.following) || X_FALLBACK.following,
                  tweets: Number(u.tweets) || X_FALLBACK.tweets,
                  avatar: String(u.avatar_url || X_FALLBACK.avatar).replace('_normal.', '_400x400.'),
                  banner: u.banner_url ? `${u.banner_url}/1500x500` : X_BANNER_FALLBACK,
                  verified: Boolean(u.verification?.verified ?? true),
               });
            }
         } catch {
            /* silent — verified fallback snapshot stays */
         } finally {
            if (!dead) setLoading(false);
         }
      };
      fetchX();
      const interval = setInterval(fetchX, 5 * 60 * 1000);
      return () => { dead = true; clearInterval(interval); };
   }, []);

   if (loading) return <CardSkeleton glow="rgba(255,255,255,0.22)" />;

   const latest = X_LAST_POST;

   return (
      <div className="perspective-1000 h-full">
         <div
            ref={ref}
            onPointerMove={move}
            onPointerLeave={leave}
            style={tiltStyle(tilt)}
            className="group relative h-full rounded-[26px] p-[1.5px] bg-gradient-to-b from-white/60 via-[#4D8DFF]/40 to-white/[0.06] shadow-[0_24px_70px_-20px_rgba(77,141,255,0.45)]"
         >
            <div className="relative h-full rounded-[24.5px] bg-[#08080a]/95 backdrop-blur-xl overflow-hidden flex flex-col">
               {/* pointer glare */}
               <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
                  style={{
                     opacity: tilt.on ? 1 : 0,
                     background: `radial-gradient(420px circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.14), transparent 65%)`,
                  }}
               />
               {/* color bleed — banner tones wash down the whole card, no boundary */}
               <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <img
                     src={data.banner}
                     alt=""
                     onError={(e) => { (e.target as HTMLImageElement).src = '/bg-madara.png'; }}
                     className="absolute top-0 inset-x-0 h-[48%] w-full object-cover blur-3xl opacity-30"
                     style={{ maskImage: 'linear-gradient(to bottom, black 25%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 25%, transparent 100%)' }}
                  />
               </div>
               {/* orbiting halo */}
               <div className="absolute -top-24 start-1/4 w-72 h-72 rounded-full bg-[#4D8DFF]/25 blur-[90px] animate-aurora pointer-events-none" />
               {/* banner — X cover, seamless melt, no edge lines */}
               <div className="relative h-32 sm:h-40 overflow-hidden shrink-0 bg-black">
                  <img
                     src={data.banner}
                     alt="MADARA X banner"
                     onError={(e) => { (e.target as HTMLImageElement).src = '/bg-madara.png'; }}
                     className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-[2.5s] ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#08080a]/50 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#08080a] via-[#08080a]/55 to-transparent" />
                  <span className="absolute top-3 start-3 inline-flex items-center gap-2 px-3 py-1.5 bg-black/55 backdrop-blur border border-white/15 text-white/85">
                     <span className="led bg-white animate-pulse shadow-[0_0_8px_#fff]" />
                     <span className="kicker" dir="ltr">X // Live</span>
                  </span>
                  <span className="cut-tag absolute top-3 end-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-black tracking-[0.2em]" dir="ltr">
                     <XIcon className="w-3.5 h-3.5" />
                     MADARA
                  </span>
               </div>
               {/* crest + title — straddles the melt */}
               <div className="relative px-5 -mt-10 flex items-end gap-3.5">
                  <div aria-hidden="true" className="absolute -top-8 inset-x-8 h-14 bg-white/10 blur-2xl pointer-events-none" />
                  <div className="relative shrink-0" style={{ transform: 'translateZ(45px)' }}>
                     <div className="absolute -inset-3 bg-[#4D8DFF]/50 blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-500 rounded-full" />
                     <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-white/70 ring-4 ring-[#08080a]/90 bg-black shadow-[0_16px_36px_rgba(0,0,0,0.65)] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-105">
                        <img src={data.avatar} alt="MADARA X avatar" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/madara-logo.webp'; }} />
                     </div>
                     <span className="absolute -bottom-1 -end-1 w-9 h-9 rounded-full bg-black border-2 border-white/70 flex items-center justify-center shadow-[0_0_14px_rgba(77,141,255,0.8)]">
                        <XIcon className="w-4 h-4 text-white" />
                     </span>
                  </div>
                  <div className="min-w-0 pb-1">
                     <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none flex items-center gap-1.5" dir="ltr">
                        {data.name}
                        {data.verified && (
                           <svg className="w-4.5 h-4.5 w-[18px] h-[18px] text-[#1D9BF0] shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3 1.6-1.4 3.2 1.4 3.2-3 1.6-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3-1.6L3.6 12 2.2 8.8l3-1.6 1-3.3 3.4.5L12 2zm-1.1 12.4l4.5-4.5-1.4-1.4-3.1 3.1-1.5-1.5-1.4 1.4 2.9 2.9z" /></svg>
                        )}
                     </h3>
                     <p className="text-[11px] text-white/45 font-bold mt-1" dir="ltr">@{data.handle}</p>
                  </div>
                  <p className="ms-auto text-end shrink-0 pb-1">
                     <span className="jersey block text-3xl sm:text-4xl text-white leading-none" dir="ltr">{fmtCompact(data.followers)}</span>
                     <span className="kicker block text-white/50 mt-1">{lang === 'en' ? 'followers' : 'متابع'}</span>
                  </p>
               </div>
               {/* bio */}
               <div className="px-5 mt-3 relative">
                  <p className="text-[12.5px] leading-relaxed text-white/70 font-medium" dir="auto">{data.bio}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-bold text-white/40">
                     <span className="inline-flex items-center gap-1" dir="ltr">📍 {data.location}</span>
                     <span className="inline-flex items-center gap-1">🗓 {lang === 'en' ? 'Joined Nov 2018' : 'انضم نوفمبر 2018'}</span>
                  </p>
                  <div className="mt-2.5 flex items-center gap-4 text-[11px] font-black text-white/70" dir="ltr">
                     <span><span className="text-white">{data.following.toLocaleString('en-US')}</span> <span className="text-white/40 font-bold">{lang === 'en' ? 'Following' : 'يتابع'}</span></span>
                     <span><span className="text-white">{fmtCompact(data.followers)}</span> <span className="text-white/40 font-bold">{lang === 'en' ? 'Followers' : 'متابع'}</span></span>
                     <span><span className="text-white">{data.tweets.toLocaleString('en-US')}</span> <span className="text-white/40 font-bold">Posts</span></span>
                  </div>
               </div>
               {/* latest post — fused into the flow */}
               <div className="px-5 mt-3.5 relative">
                  <p className="kicker text-white/30 mb-2" dir="ltr">// Latest post</p>
                  <a href={latest.url} target="_blank" rel="noopener noreferrer"
                     className="group/post relative flex items-start gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-3.5 min-h-[88px] transition-all duration-500 hover:border-white/50 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-14px_rgba(77,141,255,0.5)]">
                     <span className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shrink-0 bg-black">
                        <img src={data.avatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/madara-logo.webp'; }} />
                     </span>
                     <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-white" dir="ltr">
                           {data.name}
                           {data.verified && <svg className="w-3.5 h-3.5 text-[#1D9BF0]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3 1.6-1.4 3.2 1.4 3.2-3 1.6-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3-1.6L3.6 12 2.2 8.8l3-1.6 1-3.3 3.4.5L12 2zm-1.1 12.4l4.5-4.5-1.4-1.4-3.1 3.1-1.5-1.5-1.4 1.4 2.9 2.9z" /></svg>}
                           <span className="text-white/35 font-bold">• {lang === 'en' ? latest.timeEn : latest.timeAr}</span>
                        </span>
                        <span className="block text-[12.5px] sm:text-[13px] font-bold text-white/85 leading-snug mt-1 whitespace-pre-line" dir="auto">{latest.text} {latest.tag && <span className="text-[#1D9BF0]">{latest.tag}</span>}</span>
                        {latest.image && (
                           <span className="block mt-2.5 relative rounded-xl overflow-hidden border border-white/12 bg-black">
                              <img src={latest.image} alt="MADARA — latest post" loading="lazy" className="w-full aspect-video object-cover group-hover/post:scale-[1.03] transition-transform duration-700" />
                           </span>
                        )}
                     </span>
                     <XIcon className="w-4 h-4 text-white/30 group-hover/post:text-white shrink-0 mt-1 transition-colors" />
                  </a>
               </div>
               {/* CTA */}
               <div className="px-5 pb-5 mt-4 flex-1 flex items-end">
                  <a
                     href={X_URL}
                     target="_blank"
                     rel="noopener noreferrer"
                     aria-label={lang === 'en' ? 'Follow on X' : 'تابع على X'}
                     className="btn-arena card-sheen cut-btn relative w-full min-h-[54px] inline-flex items-center justify-center gap-2.5 bg-white text-black font-black text-sm tracking-wide shadow-[0_14px_36px_-10px_rgba(255,255,255,0.4)] overflow-hidden hover:bg-[#4D8DFF] hover:text-white transition-colors"
                  >
                     <XIcon className="w-5 h-5 shrink-0" />
                     {lang === 'en' ? 'FOLLOW ON X' : 'تابع على X'}
                     <svg className={`w-4 h-4 shrink-0 ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </a>
               </div>
            </div>
         </div>
      </div>
   );
};

/* Legacy alias kept for any external import */

/* ============================ YOUTUBE — LEVEL ONE CLAN (@leveloneclan) ============================
   Live clan channel data, refreshed every 5 minutes:
     • Server API first (/api/social?platform=youtube → subs + latest video, no CORS)
     • Direct RSS + Mixerno as fallback */
const CLAN_CHANNEL_ID = 'UCD7EpD4o6bw24c5o5vu4hGQ';
const CLAN_CHANNEL_URL = 'https://www.youtube.com/@leveloneclan';
// Level One clan identity — official banner + logo mark.
const CLAN_BANNER = '/levelone-banner.png';
const CLAN_BANNER_FALLBACK = '/levelone-banner.png';
const CLAN_MARK = '/levelone-logo.jpg';
const CLAN_ORANGE = '#4D8DFF';
const CLAN_ORANGE_DEEP = '#0B1B33';

export const YoutubeWidget: React.FC<CommunityWidgetsProps> = ({ lang }) => {
    const [video, setVideo] = useState<YoutubeData | null>(null);
    const [subs, setSubs] = useState<string>('—');
    const [loading, setLoading] = useState(true);
    const { ref, tilt, move, leave } = useTilt(9);
    const isRTL = lang === 'ar';
    const channelId = CLAN_CHANNEL_ID;
    const channelUrl = CLAN_CHANNEL_URL;

    useEffect(() => {
       let dead = false;
       const fmtSubs = (count: number) =>
          count >= 1000000 ? `${(count / 1000000).toFixed(1)}M+` : count >= 1000 ? `${(count / 1000).toFixed(1)}K+` : `${count}`;
       const fmtDate = (d: string) => {
          try {
             return new Date(d).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          } catch { return d || 'LEVEL ONE'; }
       };
       const fetchVideo = async () => {
          // 0) Server API — latest video resolved server-side (no CORS issues)
          try {
             const r = await fetch(`/api/social?platform=youtube`);
             const j = await r.json();
             if (!dead && j?.latest?.link) {
                setVideo({
                   title: j.latest.title,
                   link: j.latest.link,
                   date: fmtDate(j.latest.date),
                   thumbnail: String(j.latest.thumbnail || '').replace('hqdefault.jpg', 'maxresdefault.jpg')
                });
                if (typeof j?.count === 'number' && j.count > 0) setSubs(fmtSubs(j.count));
                setLoading(false);
                return;
             }
          } catch {}
          try {
             let cid = channelId;
             try {
                const r2 = await fetch(`/api/social?platform=youtube`);
                const j2 = await r2.json();
                if (j2?.channelId) cid = j2.channelId;
             } catch {}
             const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${cid}`;
             const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
             const response = await fetch(apiUrl);
             const data = await response.json();

             if (data.items && data.items.length > 0) {
                const latest = data.items[0];
                if (!dead) {
                   setVideo({
                      title: latest.title,
                      link: latest.link,
                      date: new Date(latest.pubDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                      thumbnail: String(latest.thumbnail || '').replace('hqdefault.jpg', 'maxresdefault.jpg')
                   });
                }
             } else {
                throw new Error('No items');
             }
          } catch (err) {
             if (!dead) {
                 setVideo({
                    title: lang === 'en' ? 'LEVEL ONE — OFFICIAL VIDEOS' : 'كلان Level One — الفيديوهات الرسمية',
                    link: channelUrl,
                    date: 'LEVEL ONE',
                    thumbnail: CLAN_BANNER_FALLBACK
                 });
             }
          } finally {
             if (!dead) setLoading(false);
          }
       };
      const fetchSubs = async () => {
         // 0) Our server API — resolves @handle to channel id live
         try {
            const res = await fetch(`/api/social?platform=youtube`);
            const j = await res.json();
            if (!dead && typeof j?.count === 'number' && j.count > 0) { setSubs(fmtSubs(j.count)); return; }
         } catch {}
         // 1) Mixerno — exact subscriber count
         try {
            const res = await fetch(`https://mixerno.space/api/youtube-channel-counter/user/${channelId}`);
            const d = await res.json();
            const entry = Array.isArray(d?.counts) ? d.counts.find((c: any) => c?.value === 'subscribers') : null;
            const n = entry?.count;
            if (!dead && typeof n === 'number' && n > 0) { setSubs(fmtSubs(n)); return; }
         } catch {}
         // 2) Piped fallback
         try {
            const statsRes = await fetch(`https://pipedapi.kavin.rocks/channel/${channelId}`);
            const statsData = await statsRes.json();
            if (!dead && statsData.subscriberCount) setSubs(fmtSubs(statsData.subscriberCount));
         } catch (err) {
            console.warn('Subscriber fetch failed, using fallback:', err);
         }
      };
      fetchVideo();
      fetchSubs();
      const interval = setInterval(() => { fetchVideo(); fetchSubs(); }, 5 * 60 * 1000);
      return () => { dead = true; clearInterval(interval); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [lang]);

     if (loading && !video) return <CardSkeleton glow="rgba(77,141,255,0.35)" />;

     return (
        <div className="perspective-1000 h-full">
           <div
              ref={ref}
              onPointerMove={move}
              onPointerLeave={leave}
              style={tiltStyle(tilt)}
              className="group relative h-full rounded-[26px] p-[1.5px] bg-gradient-to-b from-[#4D8DFF]/80 via-[#9CC5FF]/30 to-white/[0.06] shadow-[0_24px_70px_-20px_rgba(77,141,255,0.5)]"
           >
              <div className="relative h-full rounded-[24.5px] bg-[#060B16]/95 backdrop-blur-xl overflow-hidden flex flex-col">
                 <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10"
                    style={{
                       opacity: tilt.on ? 1 : 0,
                       background: `radial-gradient(420px circle at ${tilt.gx}% ${tilt.gy}%, rgba(77,141,255,0.24), transparent 65%)`,
                    }}
                 />
                 {/* color bleed — storm tones wash down the whole card, no boundary */}
                 <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                    <img
                       src={CLAN_BANNER}
                       alt=""
                       className="absolute top-0 inset-x-0 h-[48%] w-full object-cover blur-3xl opacity-35"
                       style={{ maskImage: 'linear-gradient(to bottom, black 25%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 25%, transparent 100%)' }}
                    />
                 </div>
                 <div className="absolute -top-24 end-1/4 w-72 h-72 rounded-full bg-[#4D8DFF]/25 blur-[90px] animate-aurora pointer-events-none" />
                 <div className="absolute -bottom-28 start-1/4 w-72 h-72 rounded-full bg-[#9CC5FF]/15 blur-[100px] animate-aurora pointer-events-none" style={{ animationDelay: '-8s' }} />
                 {/* banner — MADARA official, seamless melt, no edge lines */}
                 <div className="relative h-32 sm:h-40 overflow-hidden shrink-0">
                    <img
                       src={CLAN_BANNER}
                       alt="Level One clan — official banner"
                       className="absolute inset-0 w-full h-full object-cover object-[center_30%] scale-105 group-hover:scale-110 transition-transform duration-[2.5s] ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#060B16]/60 via-transparent to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#4D8DFF]/25 via-transparent to-transparent mix-blend-overlay" />
                    <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-[#060B16] via-[#060B16]/60 to-transparent" />
                    <span className="absolute top-3 start-3 inline-flex items-center gap-2 px-3 py-1.5 bg-black/55 backdrop-blur border border-white/15 text-white/85">
                       <span className="led bg-[#4D8DFF] animate-pulse shadow-[0_0_8px_#4D8DFF]" />
                       <span className="kicker" dir="ltr">YouTube // Official</span>
                    </span>
                    <span className="absolute top-3 end-3 inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.2em] px-2.5 py-1 rounded-full bg-[#4D8DFF] text-white shadow-[0_0_18px_rgba(77,141,255,0.7)]" dir="ltr">
                       <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                       LEVEL ONE
                    </span>
                 </div>
                 {/* crest + title — straddles the melt */}
                 <div className="relative px-5 -mt-10 flex items-end gap-3.5">
                    <div aria-hidden="true" className="absolute -top-8 inset-x-8 h-14 bg-[#4D8DFF]/20 blur-2xl pointer-events-none" />
                    <div className="relative shrink-0" style={{ transform: 'translateZ(45px)' }}>
                       <div className="absolute -inset-3 bg-[#4D8DFF]/60 blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-500 rounded-full" />
                       <div className="relative w-[72px] h-[72px] rounded-[22px] overflow-hidden border-2 border-[#4D8DFF]/70 ring-4 ring-[#060B16]/90 bg-[#060B16] shadow-[0_16px_36px_rgba(0,0,0,0.65),0_0_28px_rgba(77,141,255,0.45)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
                         <img src={CLAN_MARK} alt="Level One clan logo" className="w-full h-full object-cover" />
                      </div>
                       <span className="absolute -bottom-1 -end-1 w-7 h-7 rounded-full bg-[#FF0000] border-4 border-[#060B16] flex items-center justify-center shadow-[0_0_14px_rgba(255,0,0,0.8)]">
                          <svg className="w-2.5 h-2.5 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                       </span>
                    </div>
                    <div className="min-w-0 pb-1">
                       <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none" dir="ltr">LEVEL ONE</h3>
                       <p className="text-[11px] text-white/45 font-bold mt-1" dir="ltr">@leveloneclan</p>
                    </div>
                   <p className="ms-auto text-end shrink-0 pb-1">
                      <span className="jersey block text-3xl sm:text-4xl text-white leading-none" dir="ltr">{subs}</span>
                      <span className="kicker block mt-1" style={{ color: CLAN_ORANGE }}>{lang === 'en' ? 'subs' : 'مشترك'}</span>
                   </p>
                </div>
                 {/* fortress ribbon — MADARA official */}
                 <div className="px-5 mt-3.5 relative">
                    <div className="rounded-2xl border border-[#4D8DFF]/35 bg-gradient-to-l from-[#4D8DFF]/15 via-[#9CC5FF]/[0.07] to-transparent backdrop-blur-md px-3.5 py-2.5 flex items-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                       <span className="w-12 h-12 rounded-xl overflow-hidden border border-[#9CC5FF]/40 flex items-center justify-center shrink-0 bg-black shadow-[0_0_20px_rgba(77,141,255,0.45)]">
                          <img src="/levelone-logo.jpg" alt="Level One emblem" loading="lazy" className="w-full h-full object-cover" />
                       </span>
                       <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-black text-white truncate">{lang === 'en' ? 'Level One clan — official YouTube channel' : 'قناة كلان Level One الرسمية على يوتيوب'}</p>
                          <p className="text-[10px] font-bold text-[#7FB2FF] mt-0.5" dir="ltr">@leveloneclan • YOUTUBE</p>
                       </div>
                       <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-black tracking-[0.2em] px-2.5 py-1.5 rounded-lg bg-white text-black" dir="ltr">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3 1.6-1.4 3.2 1.4 3.2-3 1.6-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3-1.6L3.6 12 2.2 8.8l3-1.6 1-3.3 3.4.5L12 2z" /></svg>
                          OFFICIAL
                       </span>
                    </div>
                 </div>
                {/* latest video — compact row, same weight as X post box */}
                <div className="px-5 mt-4 relative">
                   <p className="kicker text-white/30 mb-2" dir="ltr">// Latest transmission</p>
                   <a
                      href={video?.link || channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={video?.title || 'Latest video'}
                       className="group/vid relative flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-2.5 min-h-[88px] transition-all duration-500 hover:border-[#4D8DFF]/60 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-14px_rgba(77,141,255,0.5)]"
                   >
                      <span className="relative w-28 aspect-video rounded-xl overflow-hidden shrink-0 bg-black border border-white/10">
                         <img
                            src={video?.thumbnail || CLAN_BANNER_FALLBACK}
                            alt={video?.title || 'Latest video'}
                            loading="lazy"
                            className="w-full h-full object-cover opacity-85 group-hover/vid:opacity-100 group-hover/vid:scale-105 transition-all duration-500"
                            onError={(e) => {
                               const target = e.target as HTMLImageElement;
                               if (target.src.includes('maxresdefault')) target.src = target.src.replace('maxresdefault', 'hqdefault');
                               else target.src = CLAN_BANNER_FALLBACK;
                            }}
                         />
                          <span className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-black/50 backdrop-blur border border-[#4D8DFF]/60 flex items-center justify-center transition-transform duration-300 group-hover/vid:scale-125 shadow-[0_0_16px_rgba(77,141,255,0.6)]">
                            <svg className="w-3 h-3 text-white fill-current translate-x-[1px] rtl:-translate-x-[1px]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                         </span>
                      </span>
                      <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[8px] font-black tracking-[0.2em] text-[#5B8FE8]" dir="ltr">
                             <span className="w-1 h-1 rounded-full bg-[#4D8DFF] animate-pulse" />LATEST
                         </span>
                         <span className="block text-[12px] sm:text-[13px] font-black text-white leading-snug line-clamp-2 mt-1">{video?.title}</span>
                      </span>
                       <span className="shrink-0 w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 hidden sm:flex items-center justify-center text-white/40 group-hover/vid:text-white group-hover/vid:bg-[#4D8DFF] group-hover/vid:border-[#4D8DFF] transition-all duration-300">
                         <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </span>
                   </a>
                </div>
                {/* CTA */}
                <div className="px-5 pb-5 mt-4 flex-1 flex items-end">
                   <a
                      href={channelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={lang === 'en' ? 'Visit YouTube channel' : 'زيارة قناة اليوتيوب'}
                       className="btn-arena card-sheen cut-btn relative w-full min-h-[54px] inline-flex items-center justify-center gap-2.5 bg-gradient-to-b from-[#4D8DFF] to-[#12315E] text-white font-black text-sm tracking-wide shadow-[0_14px_36px_-10px_rgba(77,141,255,0.6)] overflow-hidden"
                   >
                     <YoutubeIcon className="w-5 h-5 shrink-0" />
                     {lang === 'en' ? 'SUBSCRIBE NOW' : 'اشترك الآن'}
                     <svg className={`w-4 h-4 shrink-0 ${isRTL ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </a>
               </div>
            </div>
         </div>
      </div>
   );
};
