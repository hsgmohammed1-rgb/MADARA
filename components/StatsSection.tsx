import React, { useEffect, useState, useRef } from 'react';
import { Language, LeaderboardData, Clip, Video, ChannelInfo, LeaderboardEntry } from '../types';
import { KickIcon } from './Icons';
import BotrixLeaderboard from './BotrixLeaderboard';
import { kickFetch } from '../utils/kickApi';

interface StatsSectionProps {
  lang: Language;
  report?: React.ReactNode;
  onPlayVod?: (v: any) => void;
  onPlayClip?: (c: any) => void;
}

const FALLBACK_IMAGE = "/madara-logo.webp";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num || 0);
};

const fmtDur = (ms: number) => {
  const s = Math.floor((ms > 1000000 ? ms / 1000 : ms) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// Skeleton Primitive
const Skeleton: React.FC<{ className: string }> = ({ className }) => (
  <div className={`bg-white/5 animate-pulse rounded-xl ${className}`}></div>
);

// Animated followers counter (rAF, reduced-motion safe)
const KickCount: React.FC<{ value: number }> = ({ value }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(value); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span dir="ltr">{n.toLocaleString('en-US')}</span>;
};

// --- CHAMPION ICONS ---

const CrownIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D6E9FF" />
        <stop offset="55%" stopColor="#4D8DFF" />
        <stop offset="100%" stopColor="#0B1B33" />
      </linearGradient>
    </defs>
    <path fill="url(#crownGold)" d="M2.5 8.5 6.5 12l5.5-7 5.5 7 4-3.5L20 18H4L2.5 8.5z" />
    <rect x="4" y="18.6" width="16" height="2.2" rx="1.1" fill="url(#crownGold)" />
    <circle cx="12" cy="12.6" r="1.4" fill="#EAF4FF" />
  </svg>
);

const BoltIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <linearGradient id="boltRose" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D6E9FF" />
        <stop offset="55%" stopColor="#9CC5FF" />
        <stop offset="100%" stopColor="#12315E" />
      </linearGradient>
    </defs>
    <path fill="url(#boltRose)" d="M13 2 4.5 13.5H10L9 22l8.5-11.5H12L13 2z" />
  </svg>
);

const MedalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <linearGradient id="medalCyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#D8E8FF" />
        <stop offset="55%" stopColor="#7FB2FF" />
        <stop offset="100%" stopColor="#6FA5FF" />
      </linearGradient>
    </defs>
    <path stroke="url(#medalCyan)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M8.5 9.5 6 2h4.5L12 6.8 13.5 2H18l-2.5 7.5" />
    <circle cx="12" cy="15" r="5.2" stroke="url(#medalCyan)" strokeWidth="2.2" />
    <circle cx="12" cy="15" r="1.6" fill="url(#medalCyan)" />
  </svg>
);

interface LeaderboardCardProps {
  title: string;
  subtitle: string;
  data: LeaderboardEntry[];
  icon: React.ReactNode;
  accentColor: 'yellow' | 'rose' | 'cyan';
  isMain?: boolean;
  lang: Language;
  t: any;
  delay: number;
  emptyLabel?: string;
  className?: string;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ title, subtitle, data, icon, accentColor, isMain, lang, t, delay, emptyLabel, className }) => {

  // Modern glass config — vibrant but harmonious with storm identity
  const config = {
    yellow: {
      border: 'border-[#4D8DFF]/25',
      text: 'text-[#7FB2FF]',
      bgIcon: 'bg-[#4D8DFF]/10',
      gradient: 'from-[#D6E9FF] to-[#1E4E8C]',
      subText: 'text-[#7FB2FF]/50',
      glowColor: '77,141,255',
      barBright: '#D6E9FF',
      barDeep: '#1E4E8C',
      medalBg: 'linear-gradient(160deg,#D6E9FF,#4D8DFF 55%,#0B1B33)',
      orb: 'bg-[#4D8DFF]/15'
    },
    rose: {
      border: 'border-[#4D8DFF]/25',
      text: 'text-[#7FB2FF]',
      bgIcon: 'bg-[#4D8DFF]/10',
      gradient: 'from-[#D6E9FF] to-[#1E4E8C]',
      subText: 'text-[#7FB2FF]/50',
      glowColor: '77,141,255',
      barBright: '#D6E9FF',
      barDeep: '#1E4E8C',
      medalBg: 'linear-gradient(160deg,#D6E9FF,#4D8DFF 55%,#0B1B33)',
      orb: 'bg-[#4D8DFF]/15'
    },
    cyan: {
      border: 'border-[#6FA5FF]/25',
      text: 'text-[#9CC5FF]',
      bgIcon: 'bg-[#6FA5FF]/10',
      gradient: 'from-[#D6E9FF] to-[#9CC5FF]',
      subText: 'text-[#9CC5FF]/50',
      glowColor: '156,197,255',
      barBright: '#D6E9FF',
      barDeep: '#9CC5FF',
      medalBg: 'linear-gradient(160deg,#D6E9FF,#9CC5FF 60%,#0B1B33)',
      orb: 'bg-[#6FA5FF]/15'
    }
  }[accentColor];

  // Helper for Rank Badges — modern pills
  const renderRankBadge = (rank: number) => {
    if (rank === 1) return (
      <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#D6E9FF] to-[#1E4E8C] shadow-[0_0_20px_rgba(77,141,255,0.5)] border border-white/40 text-[#05060B] font-black text-sm shrink-0 rotate-3">
        1
      </div>
    );
    if (rank === 2) return (
      <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-gradient-to-br from-white to-white/60 shadow-[0_0_14px_rgba(255,255,255,0.3)] border border-white/60 text-black font-black text-xs shrink-0 -rotate-3">
        2
      </div>
    );
    if (rank === 3) return (
      <div className="w-8 h-8 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#7FB2FF] to-[#1E4E8C] shadow-[0_0_14px_rgba(255,138,92,0.4)] border border-white/30 text-white font-black text-xs shrink-0 rotate-2">
        3
      </div>
    );
    return (
      <span className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-[11px] font-black text-white/40 shrink-0" dir="ltr">
        {rank < 10 ? `0${rank}` : rank}
      </span>
    );
  };

  // Render Empty State — premium emerald glass (matches filled cards)
  if (!data || data.length === 0) {
    return (
      <div className={`
                 relative flex flex-col items-center justify-center p-4 sm:p-6 text-center rounded-[28px] overflow-hidden
                 bg-white/[0.04] backdrop-blur-2xl border border-white/10
                 transition-all duration-500 hover:border-[#4D8DFF]/30 hover:bg-white/[0.05] hover:-translate-y-1 group
                 ${isMain ? 'lg:mt-8 z-10 min-h-[210px] md:min-h-[300px]' : 'min-h-[210px] md:min-h-[280px]'}
                 ${className}
             `}
        style={{ animationDelay: `${delay}ms` }}>
        <div className={`absolute -top-16 start-1/4 w-64 h-64 rounded-full ${config.orb} blur-[80px] pointer-events-none`} aria-hidden="true" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-white/30 to-transparent" aria-hidden="true" />
        <div className="absolute opacity-[0.05] scale-[3] pointer-events-none transition-transform duration-700 group-hover:scale-[3.3]" aria-hidden="true">
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-10 h-10 ${config.text}` })}
        </div>
        <div className={`relative p-4 md:p-5 rounded-3xl ${config.bgIcon} mb-4 transition-all duration-500 group-hover:scale-110 border border-white/10`}
          style={{ boxShadow: `0 12px 32px -12px rgba(${config.glowColor},0.5), inset 0 1px 0 rgba(255,255,255,0.15)` }}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: `w-6 h-6 md:w-8 md:h-8 ${config.text} drop-shadow-lg` })}
        </div>
        <h3 className={`relative text-sm md:text-base font-black text-white/80 mb-1 uppercase tracking-[0.2em]`}>{title}</h3>
        <p className={`relative text-[10px] md:text-xs ${config.subText} font-medium`}>{emptyLabel || t.noData}</p>
        <span className="relative mt-4 inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.22em] px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-white/35 uppercase">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: config.barBright, boxShadow: `0 0 8px ${config.barBright}` }} />
          {lang === 'ar' ? 'بانتظار الأبطال' : 'WAITING FOR HEROES'}
        </span>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  const maxQ = Math.max(1, ...sorted.map(e => e.quantity || 0));
  const totalQ = sorted.reduce((s, e) => s + (e.quantity || 0), 0);
  const champ = sorted[0];

  return (
    <div
      className={`group relative rounded-[28px] transition-all duration-500 hover:-translate-y-1.5 ${isMain ? 'md:mt-10 z-20 md:scale-[1.03]' : ''} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="absolute -inset-2 rounded-[32px] blur-3xl opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none" style={{ background: `linear-gradient(180deg, rgba(${config.glowColor},0.25), transparent 65%)` }} aria-hidden="true" />
      <div className="card-sheen relative rounded-[28px] bg-white/[0.04] backdrop-blur-2xl border border-white/10 overflow-hidden transition-colors duration-500 group-hover:border-white/20 group-hover:bg-white/[0.06]">
        <div className={`absolute -top-20 end-0 w-72 h-72 rounded-full ${config.orb} blur-[90px] pointer-events-none`} aria-hidden="true" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-white/40 to-transparent" aria-hidden="true" />

        {/* Header — stacks vertically on narrow/mobile cards, single row on desktop */}
        <div className="relative p-4 sm:p-5 md:p-6 pb-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-white/[0.07] z-10">
          <div className="flex items-center gap-3 md:gap-3.5 min-w-0 flex-1">
            <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
              style={{ background: 'linear-gradient(180deg, rgba(4,18,13,0.95), rgba(4,18,13,0.85))', borderColor: `${config.barBright}44`, boxShadow: `0 12px 32px -8px rgba(${config.glowColor},0.55), inset 0 1px 0 rgba(255,255,255,0.12)` }}>
              {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6 md:w-7 md:h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]' }) : icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-tight truncate ${lang === 'ar' ? 'font-arabic' : ''}`}>{title}</h3>
              <span className={`block text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.24em] bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent mt-1 truncate`}>{subtitle}</span>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-3 rounded-2xl bg-black/40 border border-white/10 px-3.5 py-2 md:px-3 md:py-2 shrink-0">
            <p className="text-base md:text-lg font-black text-white leading-none" dir="ltr">{formatNumber(totalQ)}</p>
            <p className={`text-[8px] font-bold uppercase tracking-[0.18em] ${config.subText} whitespace-nowrap`}>{t.gift} • {sorted.length}</p>
          </div>
        </div>

        {/* Champion spotlight — biggest supporter, breathing room below header */}
        {champ && (
          <div className="mx-3 md:mx-4 mt-5">
            <p className="text-[9px] font-black tracking-[0.24em] text-white/30 uppercase mb-2 px-1">{lang === 'ar' ? 'أكبر الداعمين' : 'TOP SUPPORTER'}</p>
            <div className="rounded-2xl p-[1.5px] transition-transform duration-500 hover:scale-[1.01]" style={{ background: `linear-gradient(120deg, ${config.barBright}, ${config.barDeep}, ${config.barBright})` }}>
            <div className="card-sheen rounded-[14.5px] bg-black/85 backdrop-blur px-3 py-2.5 flex items-center gap-2.5 overflow-hidden">
              <span className="relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-black text-sm" style={{ background: config.medalBg }}>
                {(champ.username || '?').charAt(0).toUpperCase()}
                <span className="absolute -top-1.5 -end-1 w-5 h-5"><CrownIcon className="w-5 h-5 drop-shadow-[0_0_8px_rgba(255,215,106,0.8)]" /></span>
              </span>
              <p className="flex-1 min-w-0 text-xs sm:text-sm md:text-[15px] font-black text-white truncate" dir="auto">{champ.username}</p>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${config.bgIcon} ${config.text} border border-white/15`} dir="ltr">{formatNumber(champ.quantity)}</span>
            </div>
            </div>
          </div>
        )}

        {/* List with progress bars — airy modern rows */}
        <div className="flex-1 p-2.5 md:p-3.5 space-y-1 relative overflow-y-auto max-h-[300px] md:max-h-[400px] scrollbar-hide">
          {sorted.slice(1).map((entry, idx) => {
            const rank = idx + 2;
            const pct = Math.max(4, Math.round(((entry.quantity || 0) / maxQ) * 100));
            return (
              <div key={idx} className="relative rounded-2xl p-2.5 md:p-3 transition-all duration-300 group/row hover:bg-white/[0.05] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-14px_rgba(77,141,255,0.35)] border border-transparent hover:border-[#4D8DFF]/25 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 70, 420)}ms` }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0 flex justify-center">
                    {renderRankBadge(rank)}
                  </div>
                  <span className="w-8 h-8 rounded-full hidden sm:flex items-center justify-center text-[11px] font-black text-white/70 bg-white/[0.06] border border-white/10 shrink-0">
                    {(entry.username || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0 text-[13px] md:text-sm font-bold text-white/90 truncate group-hover/row:text-white transition-colors" dir="auto">
                    {entry.username}
                  </span>
                  <span className={`text-[13px] md:text-sm font-black tracking-wide ${config.text} shrink-0 rounded-lg bg-black/30 border border-white/10 group-hover/row:border-white/25 px-2 py-1 transition-colors duration-300`} dir="ltr"
                    style={{ boxShadow: `0 0 14px -6px rgba(${config.glowColor},0.7)` }}>
                    {formatNumber(entry.quantity)}
                  </span>
                </div>
                <div className="mt-2 ms-[42px] sm:ms-[76px] h-1 rounded-full bg-white/[0.06] overflow-hidden" dir="ltr">
                  <div className="bar-grow h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${config.barBright}, ${config.barDeep})`, boxShadow: `0 0 10px rgba(${config.glowColor},0.6)`, animationDelay: `${idx * 80}ms` }} />
                </div>
              </div>
            );
          })}
          <div className="h-2"></div>
        </div>

        {/* Bottom Fade Mask */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-20"></div>
      </div>
    </div>
  );
};


export const HonorSection: React.FC<StatsSectionProps> = ({ lang, report }) => {
  // Initialize as null to indicate "loading"
  const [leaderboards, setLeaderboards] = useState<LeaderboardData | null>(null);
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);


  const t = {
    followers: lang === 'en' ? 'Followers' : 'متابع',
    topGifters: lang === 'en' ? 'Top Gifters' : 'كبار الداعمين',
    allTime: lang === 'en' ? 'All Time' : 'الأفضل',
    monthly: lang === 'en' ? 'Monthly' : 'شهرياً',
    weekly: lang === 'en' ? 'Weekly' : 'أسبوعياً',
    gift: lang === 'en' ? 'Gifts' : 'هدية',
    subBadges: lang === 'en' ? 'Sub Badges' : 'شارات المشتركين',
    noData: lang === 'en' ? 'No Data' : 'لا يوجد بيانات',

    // Custom Empty States
    noDataWeekly: lang === 'en' ? 'No active gifters this week' : 'لا يوجد داعمين هذا الأسبوع',
    noDataMonthly: lang === 'en' ? 'No active gifters this month' : 'لا يوجد داعمين لهذا الشهر',
    noDataAllTime: lang === 'en' ? 'No records found' : 'لا يوجد سجلات بعد',
  };

  useEffect(() => {
    const channelSlug = 'mdra9';

    // جلب معلومات القناة (المتابعين)
    kickFetch(`https://kick.com/api/v2/channels/${channelSlug}`).then(rawData => {
        const data = rawData?.data || rawData; // فك التغليف إن وجد
        if (data) {
            setChannelInfo({
                followers_count: data.followers_count || 0,
                subscriber_badges: data.subscriber_badges || []
            });
        }
    }).catch(() => setChannelInfo({ followers_count: 0, subscriber_badges: [] }));

    // جلب الداعمين
    kickFetch(`https://kick.com/api/v2/channels/${channelSlug}/leaderboards`).then(rawData => {
        const data = rawData?.data || rawData; // فك التغليف
        if (data) {
            setLeaderboards({
                gifts: data.gifts || [],
                gifts_week: data.gifts_week || [],
                gifts_month: data.gifts_month || []
            });
        }
    }).catch(() => setLeaderboards({ gifts: [], gifts_week: [], gifts_month: [] }));

  }, []);

  return (
    <>
      <div className="w-full space-y-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

        {/* --- KICK FORTRESS: followers + sub badges in 3D --- */}
        {channelInfo ? (
          <div className="relative [perspective:1200px]">
            <div className="absolute -inset-2 rounded-[36px] bg-gradient-to-b from-[#4D8DFF]/15 via-transparent to-transparent blur-2xl pointer-events-none" aria-hidden="true" />
            <div className="group card-sheen relative overflow-hidden rounded-[30px] border border-[#4D8DFF]/25 bg-[#05060B]/90 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(77,141,255,0.3)] [transform-style:preserve-3d]">
              <div aria-hidden="true" className="absolute -end-8 -bottom-12 opacity-[0.07] scale-[3.2] origin-bottom-right pointer-events-none text-[#4D8DFF]">
                <KickIcon className="w-24 h-24" />
              </div>
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-l from-transparent via-[#4D8DFF]/70 to-transparent" />
              <div className="relative p-5 sm:p-8 flex flex-col lg:flex-row items-center gap-6 lg:gap-10 [transform-style:preserve-3d]">

                {/* 3D K emblem + live followers */}
                <div className="flex items-center justify-center sm:justify-start gap-4 sm:gap-5 shrink-0 w-full sm:w-auto">
                  <div className="relative w-[72px] h-[72px] sm:w-24 sm:h-24 shrink-0 [transform:translateZ(36px)]">
                    <KickIcon className="absolute inset-0 m-auto w-9 h-9 sm:w-12 sm:h-12 translate-x-[6px] translate-y-[7px] text-[#0b1b33]" aria-hidden="true" />
                    <KickIcon className="absolute inset-0 m-auto w-9 h-9 sm:w-12 sm:h-12 translate-x-[3px] translate-y-[3px] text-[#2E5FA3]" aria-hidden="true" />
                    <div className="absolute inset-0 rounded-[22px] sm:rounded-[24px] bg-gradient-to-b from-[#D6E9FF] via-[#9CC5FF] to-[#2E5FA3] border border-[#D6E9FF]/60 shadow-[0_0_44px_rgba(156,197,255,0.55),inset_0_2px_0_rgba(255,255,255,0.5)] flex items-center justify-center transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                      <KickIcon className="w-9 h-9 sm:w-12 sm:h-12 text-black" />
                    </div>
                    <span className="absolute -bottom-2 inset-x-6 h-3 rounded-full bg-[#9CC5FF]/50 blur-md" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 text-center sm:text-start [transform:translateZ(18px)]">
                    <p className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.25em] text-[#7FB2FF] uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4D8DFF] animate-pulse shadow-[0_0_8px_#4D8DFF]" />
                      {t.followers} • KICK
                    </p>
                    <p className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none mt-1 drop-shadow-lg">
                      <KickCount value={channelInfo.followers_count} />
                    </p>
                    <a href="https://kick.com/mdra9/subscribe" target="_blank" rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-black px-5 py-2.5 rounded-full border border-[#4D8DFF]/60 text-[#7FB2FF] hover:bg-[#4D8DFF] hover:text-white hover:shadow-[0_0_24px_rgba(77,141,255,0.6)] active:scale-95 transition-all duration-300">
                      {lang === 'en' ? 'SUBSCRIBE NOW' : 'اشترك الآن'}
                      <svg className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </a>
                  </div>
                </div>

                {/* sub badges podium */}
                <div className="flex-1 w-full min-w-0">
                  {channelInfo.subscriber_badges && channelInfo.subscriber_badges.length > 0 && (
                    <>
                      <div className="flex items-center justify-center lg:justify-end gap-2.5 mb-4">
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.25em]">{t.subBadges}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#4D8DFF]/15 border border-[#4D8DFF]/40 text-[#7FB2FF]" dir="ltr">{channelInfo.subscriber_badges.length}</span>
                      </div>
                      <div className="flex flex-wrap justify-center lg:justify-end gap-2 sm:gap-3.5">
                        {[...channelInfo.subscriber_badges].sort((a, b) => a.months - b.months).map((badge, i) => (
                          <div key={badge.id} className="flex flex-col items-center basis-[calc(25%-6px)] sm:basis-auto opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 90}ms` }}>
                            <div className="group/badge relative w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 p-2 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#4D8DFF]/60 hover:shadow-[0_14px_30px_-8px_rgba(77,141,255,0.55)]">
                              <div className="absolute inset-x-3 top-0 h-px bg-gradient-to-l from-transparent via-white/40 to-transparent" />
                              <img
                                src={badge.badge_image.src}
                                alt={`${badge.months} months subscriber badge`}
                                loading="lazy"
                                className="w-full h-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)] transition-transform duration-300 group-hover/badge:scale-110"
                                title={`${badge.months} Months`}
                              />
                            </div>
                            <span className="mt-1.5 text-[9px] sm:text-[10px] font-black text-white/50 tracking-wider" dir="ltr">{badge.months}M</span>
                            <span className="w-8 h-[3px] rounded-full bg-black/60 border-b border-white/10 mt-1" aria-hidden="true" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        ) : (
          <Skeleton className="h-32 w-full rounded-[30px]" />
        )}

        {/* --- LEADERBOARDS --- */}
        <div className="relative space-y-7">

          {/* Modern Header */}
          <div className="relative rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden">
            <div className="absolute -top-20 start-1/3 w-96 h-96 rounded-full bg-[#4D8DFF]/[0.08] blur-[100px] pointer-events-none" aria-hidden="true" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-[#4D8DFF]/60 to-transparent" aria-hidden="true" />
            <div className="relative p-5 sm:p-6 lg:p-7 flex flex-col md:flex-row items-center gap-4 lg:gap-5 text-center md:text-start">
              <span className="relative w-14 h-14 lg:w-16 lg:h-16 rounded-[20px] flex items-center justify-center shrink-0 border border-[#4D8DFF]/50 bg-[#05060B] transition-transform duration-500 hover:scale-110 hover:-rotate-6"
                style={{ boxShadow: '0 16px 40px -12px rgba(77,141,255,0.65), inset 0 1px 0 rgba(167,243,208,0.25), 0 0 28px -6px rgba(77,141,255,0.5)' }}>
                <CrownIcon className="w-7 h-7 lg:w-8 lg:h-8" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className={`text-[22px] sm:text-[26px] lg:text-4xl font-black text-white tracking-tight leading-tight lg:leading-none ${lang === 'ar' ? 'font-arabic' : ''}`}>
                  {t.topGifters}
                </h2>
                <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.28em] bg-gradient-to-r from-[#D6E9FF] to-[#1E4E8C] bg-clip-text text-transparent mt-1.5 lg:mt-2" dir="ltr">HALL OF GENEROSITY • LIVE</p>
              </div>
              <span className="shrink-0 inline-flex items-center justify-center gap-2 text-[10px] font-black px-3.5 py-2 rounded-full bg-[#4D8DFF]/10 border border-[#4D8DFF]/30 text-[#7FB2FF] self-center md:self-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4D8DFF] animate-pulse shadow-[0_0_10px_#4D8DFF]" />
                {lang === 'en' ? 'UPDATED LIVE' : 'يتحدث مباشرة'}
              </span>
            </div>
          </div>

          {leaderboards ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 items-start relative px-1">

              {/* All Time (Center on Desktop, Top Full on Mobile) - Blue/Ice Theme */}
              <LeaderboardCard
                title={t.allTime}
                subtitle="Legends"
                data={leaderboards.gifts}
                icon={<CrownIcon />}
                accentColor="yellow"
                isMain={true}
                lang={lang}
                t={t}
                delay={0}
                emptyLabel={t.noDataAllTime}
                className="col-span-2 md:col-span-1 order-1 md:order-2"
              />

              {/* Weekly (Left on Desktop, Side-by-side on Mobile) - Rose Theme */}
              <LeaderboardCard
                title={t.weekly}
                subtitle="Active"
                data={leaderboards.gifts_week}
                icon={<BoltIcon />}
                accentColor="rose"
                lang={lang}
                t={t}
                delay={100}
                emptyLabel={t.noDataWeekly}
                className="col-span-1 md:col-span-1 order-2 md:order-1 md:mt-28"
              />

              {/* Monthly (Right on Desktop, Side-by-side on Mobile) - Cyan/Blue Theme */}
              <LeaderboardCard
                title={t.monthly}
                subtitle="Stars"
                data={leaderboards.gifts_month}
                icon={<MedalIcon />}
                accentColor="cyan"
                lang={lang}
                t={t}
                delay={200}
                emptyLabel={t.noDataMonthly}
                className="col-span-1 md:col-span-1 order-3 md:order-3 md:mt-28"
              />

            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
              <Skeleton className="col-span-2 md:col-span-1 order-1 md:order-2 h-80 md:h-[480px] w-full rounded-3xl mt-0 md:mt-10" />
              <Skeleton className="col-span-1 order-2 md:order-1 h-64 md:h-96 w-full rounded-3xl md:mt-28" />
              <Skeleton className="col-span-1 order-3 md:order-3 h-64 md:h-96 w-full rounded-3xl md:mt-28" />
            </div>
          )}
        </div>

        {/* --- LAST SESSION REPORT (right under top gifters when offline) --- */}
        {report}

        {/* --- BOTRIX LEADERBOARD (Most Active Across Streams) --- */}
        <div className="pt-8 border-t border-white/5">
          <BotrixLeaderboard lang={lang} />
        </div>
      </div>
    </>
  );
};

export const ArchiveSection: React.FC<StatsSectionProps> = ({ lang, onPlayVod, onPlayClip }) => {
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [videos, setVideos] = useState<Video[] | null>(null);

  const t = {
    recentClips: lang === 'en' ? 'Recent Clips' : 'آخر اللقطات',
    recentVods: lang === 'en' ? 'Past Streams' : 'البثوث السابقة',
    views: lang === 'en' ? 'Views' : 'مشاهدة',
    noData: lang === 'en' ? 'No Data' : 'لا يوجد بيانات',
  };

  useEffect(() => {
    const channelSlug = 'mdra9';

    // جلب اللقطات (آخر اللقطات مع منطق استخراج قوي لضمان ظهور البيانات)
    kickFetch(`https://kick.com/api/v2/channels/${channelSlug}/clips`).then(rawData => {
        // فك التغليف لجميع الهياكل المحتملة من Kick API
        const data = rawData?.data || rawData;
        const clipsArray = data?.clips || (Array.isArray(data) ? data : (data?.data && Array.isArray(data.data) ? data.data : []));

        // ترتيب تنازلي حسب التاريخ (الأحدث أولاً)
        const sortedClips = [...clipsArray].sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setClips(sortedClips.slice(0, 6));
    }).catch(() => setClips([]));

    // جلب الفيديوهات
    kickFetch(`https://kick.com/api/v2/channels/${channelSlug}/videos`).then(rawData => {
        const data = rawData?.data || rawData; // فك التغليف
        const videosArray = data?.videos || (Array.isArray(data) ? data : []);
        setVideos(videosArray.slice(0, 3));
    }).catch(() => setVideos([]));

  }, []);

  return (
    <>
      <div className="w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        {/* --- CLIPS & VODS GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7">

          {/* CLIPS — modern reel */}
          <div className="group/sec relative rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden transition-colors duration-500 hover:border-white/20">
            <div className="absolute -top-24 end-0 w-80 h-80 rounded-full bg-[#9CC5FF]/[0.10] blur-[100px] pointer-events-none" aria-hidden="true" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-white/40 to-transparent" aria-hidden="true" />
            <div className="relative p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute -inset-1.5 bg-[#4D8DFF]/40 blur-xl opacity-40 rounded-2xl" aria-hidden="true" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-[#D6E9FF] via-[#4D8DFF] to-[#0B1B33] border border-[#D6E9FF]/40 shadow-[0_12px_32px_-8px_rgba(77,141,255,0.6)] flex items-center justify-center transition-transform duration-500 hover:rotate-6 hover:scale-110">
                  <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">{t.recentClips}</h3>
                <p className="text-[10px] font-black text-white/35 uppercase tracking-[0.24em] mt-1.5" dir="ltr">{clips?.length || 0} CLIPS • FRESH</p>
              </div>
              <a href="https://kick.com/mdra9/clips" target="_blank" rel="noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-black px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-white/60 hover:text-[#05060B] hover:bg-[#7FB2FF] hover:border-[#7FB2FF] hover:shadow-[0_0_24px_rgba(77,141,255,0.5)] active:scale-95 transition-all duration-300">
                {lang === 'en' ? 'VIEW ALL' : 'عرض الكل'}
                <svg className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
            </div>

            {clips ? (
              clips.length > 0 ? (
                <div className="mt-4 max-h-[330px] lg:max-h-[420px] overflow-y-auto scrollbar-hide rounded-3xl">
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  {clips.map((clip, i) => (
                    <div key={clip.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 90}ms` }}>
                      <a
                        href={`https://kick.com/mdra9/clips/${clip.id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={onPlayClip ? (e) => { e.preventDefault(); onPlayClip(clip); } : undefined}
                        className="group relative block aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black transition-all duration-500 hover:border-[#4D8DFF]/60 hover:-translate-y-1.5 hover:shadow-[0_24px_60px_-16px_rgba(77,141,255,0.45)]"
                      >
                        <img
                          src={clip.thumbnail_url || FALLBACK_IMAGE}
                          alt={clip.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                          }}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-85 group-hover:opacity-100"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                        <span className="absolute top-2 start-2 min-w-[26px] h-[26px] px-2 rounded-xl bg-black/70 backdrop-blur border border-white/20 text-white text-[10px] font-black flex items-center justify-center" dir="ltr">#{i + 1}</span>
                        <span className="absolute top-2 end-2 inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-lg bg-[#4D8DFF] text-[#05060B] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                          <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          PLAY
                        </span>
                        <span className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                          <svg className="w-5 h-5 fill-white translate-x-[1px] rtl:-translate-x-[1px]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                        <div className="absolute bottom-0 inset-x-0 p-2.5 sm:p-3">
                          <p className="text-[11px] sm:text-xs font-black text-white truncate drop-shadow-md">{clip.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-white/70 bg-black/50 border border-white/15 rounded-lg px-1.5 py-0.5">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              <span dir="ltr">{formatNumber(clip.view_count)}</span>
                            </span>
                            {(clip.creator as any)?.username && (
                              <span className="text-[9px] sm:text-[10px] text-[#7FB2FF] font-bold truncate" dir="auto">@{(clip.creator as any).username}</span>
                            )}
                          </div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
                </div>
              ) : (
                <div className="mt-4 p-8 rounded-3xl bg-white/[0.03] border border-dashed border-white/10 text-center text-white/30 text-sm">{t.noData}</div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="aspect-video w-full rounded-3xl" />)}
              </div>
            )}
            </div>
          </div>

          {/* VIDEOS — modern archive */}
          <div className="group/sec relative rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden transition-colors duration-500 hover:border-white/20">
            <div className="absolute -top-24 start-0 w-80 h-80 rounded-full bg-[#6FA5FF]/[0.08] blur-[100px] pointer-events-none" aria-hidden="true" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-white/40 to-transparent" aria-hidden="true" />
            <div className="relative p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="absolute -inset-1.5 bg-[#6FA5FF]/30 blur-xl opacity-40 rounded-2xl" aria-hidden="true" />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-[#D6E9FF] via-[#9CC5FF] to-[#0B1B33] border border-white/25 shadow-[0_12px_32px_-8px_rgba(77,141,255,0.55)] flex items-center justify-center transition-transform duration-500 hover:rotate-6 hover:scale-110">
                  <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">{t.recentVods}</h3>
                <p className="text-[10px] font-black text-white/35 uppercase tracking-[0.24em] mt-1.5" dir="ltr">{videos?.length || 0} VODS • ARCHIVE</p>
              </div>
              <a href="https://kick.com/mdra9/videos" target="_blank" rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-black px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-white/60 hover:text-black hover:bg-[#D6E9FF] hover:border-[#D6E9FF] hover:shadow-[0_0_24px_rgba(156,197,255,0.5)] active:scale-95 transition-all duration-300">
                {lang === 'en' ? 'VIEW ALL' : 'عرض الكل'}
                <svg className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
            </div>

            {videos ? (
              videos.length > 0 ? (
                <div className="space-y-2.5 mt-4">
                  {videos.map((video, i) => {
                    // Kick VOD pages need the video UUID (numeric ids land on the wrong page)
                    const vv: any = video as any;
                    const videoUUID = vv.uuid || vv.video?.uuid || vv.id;
                    const dur = (video as any).duration || 0;
                    return (
                      <div key={video.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                        <a
                          href={`https://kick.com/mdra9/videos/${videoUUID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={onPlayVod ? (e) => { e.preventDefault(); onPlayVod(video); } : undefined}
                          className="group flex gap-3 p-2.5 rounded-3xl bg-black/40 border border-white/[0.07] hover:border-[#D6E9FF]/50 hover:bg-white/[0.05] hover:-translate-y-1 hover:shadow-[0_20px_50px_-16px_rgba(156,197,255,0.35)] active:scale-[0.99] transition-all duration-300 cursor-pointer"
                        >
                          <div className="relative w-32 sm:w-44 aspect-video rounded-2xl overflow-hidden shrink-0 bg-black border border-white/10 group-hover:border-white/25 transition-colors duration-300">
                            <img
                              src={video.thumbnail?.url || video.thumbnail?.src || (typeof video.thumbnail === 'string' ? video.thumbnail : '') || FALLBACK_IMAGE}
                              alt={video.session_title || video.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                              }}
                              className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/30 opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-[0_0_24px_rgba(255,255,255,0.3)]">
                                <svg className="w-4 h-4 text-white translate-x-[1px] rtl:-translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                              </div>
                            </div>
                            {dur > 0 && <span className="absolute bottom-1.5 end-1.5 text-[9px] font-black px-2 py-1 rounded-lg bg-black/80 backdrop-blur border border-white/20 text-white" dir="ltr">{fmtDur(dur)}</span>}
                            <span className="absolute top-1.5 start-1.5 text-[8px] font-black px-2 py-1 rounded-lg bg-[#D6E9FF] text-black" dir="ltr">VOD</span>
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5 py-1">
                            <h4 className="text-[13px] sm:text-sm font-black text-white leading-snug line-clamp-2 group-hover:text-[#D6E9FF] transition-colors">
                              {video.session_title || video.title || 'Past Stream'}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-white/45 font-bold">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.05] border border-white/10 px-2 py-1 truncate">{video.created_at ? new Date(video.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short' }) : 'Recent'}</span>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.05] border border-white/10 px-2 py-1 shrink-0" dir="ltr">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                {formatNumber(video.views || video.view_count || 0)}
                              </span>
                            </div>
                          </div>
                          <span className="self-center shrink-0 w-10 h-10 rounded-2xl bg-white/[0.05] border border-white/10 hidden sm:flex items-center justify-center text-white/40 group-hover:text-black group-hover:bg-[#D6E9FF] group-hover:border-[#D6E9FF] group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all duration-300">
                            <svg className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          </span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 p-8 rounded-3xl bg-white/[0.03] border border-dashed border-white/10 text-center text-white/30 text-sm">{t.noData}</div>
              )
            ) : (
              <div className="space-y-3 mt-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-32 aspect-video shrink-0 rounded-2xl" />
                    <div className="flex-1 space-y-2 py-2">
                      <Skeleton className="w-full h-4 rounded-md" />
                      <Skeleton className="w-2/3 h-3 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};