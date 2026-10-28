import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { KickIcon, XIcon, TikTokIcon, WhatsAppIcon, YoutubeIcon } from './components/Icons';
import { SocialLink, Language } from './types';
import { StreamPlayer } from './components/StreamPlayer';
import { SiteHeader } from './components/SiteHeader';
import type { TheaterItem } from './components/VodTheater';

// Heavy below-fold / on-demand chunks — split out of the first paint
const HonorSection = lazy(() => import('./components/StatsSection').then(m => ({ default: m.HonorSection })));
const ArchiveSection = lazy(() => import('./components/StatsSection').then(m => ({ default: m.ArchiveSection })));
const ModeratorsSection = lazy(() => import('./components/ModeratorsSection'));
const ChatWidget = lazy(() => import('./components/Chat').then(m => ({ default: m.ChatWidget })));
const XWidget = lazy(() => import('./components/CommunityWidgets').then(m => ({ default: m.XWidget })));
const YoutubeWidget = lazy(() => import('./components/CommunityWidgets').then(m => ({ default: m.YoutubeWidget })));
const VodTheater = lazy(() => import('./components/VodTheater').then(m => ({ default: m.VodTheater })));

// --- Constants (MADARA) ---
const DEFAULT_PROFILE_IMAGE = "/madara-logo.webp";
import { kickFetch } from './utils/kickApi';
import { getMonthlySupporters, Supporter as ApiSupporter } from './utils/supportersApi';
import { getAllSocialMediaStats, formatFollowerCount, readSocialCache, SOCIAL_TTL_MS } from './utils/socialMediaApi';

const PC_BACKGROUND = "/bg-madara.png";
const MOBILE_BACKGROUND = "/bg-madara.png";
const CHANNEL_SLUG = 'mdra9';

const createSocialLink = (key: string, value: string, followerCount?: string, specialDetail?: string): SocialLink | null => {
    if (!value) return null;
    const handle = value.replace(/^https?:\/\/(www\.)?(twitter|x|instagram|youtube|tiktok|facebook|snapchat|whatsapp)\.com\//i, '')
        .replace(/\/channel\//i, '')
        .replace(/^@/, '')
        .replace(/\/$/, '');
    switch (key) {
        case 'twitter': return { name: 'X', url: value.startsWith('http') ? value : `https://x.com/${handle}`, icon: <XIcon className="w-7 h-7" />, color: '', username: `@${handle}`, hex: '#FFFFFF', followerCount, specialDetail };
        case 'youtube': return { name: 'YouTube', url: value.startsWith('http') ? value : `https://youtube.com/@${handle}`, icon: <YoutubeIcon className="w-7 h-7" />, color: '', username: `@${handle}`, hex: '#FF0000', followerCount, specialDetail };
        case 'snapchat': return { name: 'Snapchat', url: value.startsWith('http') ? value : `https://snapchat.com/add/${handle}`, icon: <SnapchatIcon className="w-7 h-7" />, color: '', username: `@${handle}`, hex: '#FFFC00', followerCount, specialDetail };
        case 'tiktok': return { name: 'TikTok', url: value.startsWith('http') ? value : `https://tiktok.com/@${handle}`, icon: <TikTokIcon className="w-7 h-7" />, color: '', username: `@${handle}`, hex: '#FE2C55', followerCount, specialDetail };
        case 'whatsapp': return { name: 'WhatsApp', url: value, icon: <WhatsAppIcon className="w-7 h-7" />, color: '', username: 'قناة مدارا', hex: '#25D366', followerCount, specialDetail };
        default: return null;
    }
};

const KICK_SOCIAL: SocialLink = {
    name: 'KICK',
    url: 'https://kick.com/mdra9',
    icon: <KickIcon className="w-8 h-8" />,
    color: '',
    username: 'mdra9',
    hex: '#9CC5FF',
    followerCount: '—',
    specialDetail: 'المسرح الرئيسي والبث المباشر'
};

// MADARA roster — 6 platforms, built synchronously so all cards render on first
// paint even before live follower counts arrive (no empty grid gaps).
const buildDefaultSocials = (stats: Record<string, string>): SocialLink[] => ([
    { ...KICK_SOCIAL, followerCount: stats['KICK'] || KICK_SOCIAL.followerCount },
    createSocialLink('whatsapp', 'https://www.whatsapp.com/channel/0029Vajy8hQ2ZjCs85K37d3y', stats['WhatsApp'] || '11K', 'قناة الواتساب — كل جديد أول بأول'),
    createSocialLink('twitter', 'https://x.com/vmadara9', stats['X'], 'الأخبار والتحديثات أول بأول'),
    createSocialLink('tiktok', 'https://www.tiktok.com/@vmadara9', stats['TikTok'], 'أقوى المقاطع والترند'),
].filter(Boolean) as SocialLink[]);

const TRANSLATIONS = {
    en: {
        status: 'LIVE NOW', statusOffline: 'OFFLINE',
        headerTitle: 'MADARA STREAM HUB',
        eyebrow: 'Beyond Ordinary — MADARA',
        nameAr: 'MADARA',
        bio: 'MADARA — Streamer and Content Creator for Level One, King of Kick. Live IAA & MT RP action, his iconic Javara character, legendary challenges and worldwide nights.',
        tags: ['Just Chatting', 'IAA', 'MT RP', 'Level One'],
        defaultStreamTitle: 'CHECK OUT THE VODS | FOLLOW NOW',
        defaultCategory: 'Offline',
        footer: '© 2026 MADARA. All Rights Reserved.',
        poweredBy: 'POWERED BY MADARA ERA',
        watchLive: 'Watch Live', followX: 'Follow on X',
        subOnly: 'SUB ONLY', dropsEnabled: 'DROPS ENABLED', noTags: 'No tags',
        shareTitle: 'MADARA Stream Hub', shareText: 'Check out MADARA live on Kick!',         copied: 'Link copied!',
        lastSessionReport: 'Last session report', ago: 'Ago', duration: 'Duration',
        categoriesSpent: 'Categories in this stream', highlights: 'Stream highlights',
        socialsTitle: 'Social Arena', socialsSub: 'One hub — every platform. Pick your battlefield.',
        communityTitle: 'Community HQ', supportTitle: 'Support the Channel', supportSub: 'Your support keeps the storm fortress legendary.',
        honorTitle: 'Hall of Fame', honorSub: 'Top supporters across every stream.',
        modsTitle: 'Moderators', modsSub: 'The guardians of the fortress — live from X.',
        archiveTitle: 'Archive', archiveSub: 'Clips and past streams.',
        statsTitle: 'Stream Stats', statsSub: 'Live numbers from the storm fortress.',
        tiersTitle: 'Special alert tiers',
        theaterTitle: 'Live Theater', viewers: 'watching',
        statsKick: 'Kick followers', statsPlatforms: 'Platforms', statsStatus: 'Status',
        follow: 'Follow', open: 'Open', followers: 'followers',
    },
    ar: {
        status: 'بث مباشر الآن', statusOffline: 'غير متصل حالياً',
        headerTitle: 'مركز بث MADARA',
        eyebrow: 'خارج المألوف — MADARA',
        nameAr: 'MADARA',
        bio: 'MADARA — ستريمر وصانع محتوى في لفل ون، ملك الكيك. بثوث IAA و MT RP مباشرة وصاحب شخصية جيفارا الأسطورية، تحديات أسطورية وسهرات عالمية.',
        tags: ['Just Chatting', 'IAA', 'MT RP', 'Level One'],
        defaultStreamTitle: 'تابع البثوث السابقة | تابعني الآن',
        defaultCategory: 'غير متصل',
        footer: '© 2026 MADARA. جميع الحقوق محفوظة.',
        poweredBy: 'بدعم من MADARA ERA',
        watchLive: 'شاهد البث', followX: 'تابع على X',
        subOnly: 'للمشتركين فقط', dropsEnabled: 'الجوائز مفعلة', noTags: 'لا يوجد وسوم',
        shareTitle: 'مركز بث MADARA', shareText: 'تابع بث MADARA المباشر على كيك!',         copied: 'تم نسخ الرابط!',
        lastSessionReport: 'تقرير الجلسة الأخيرة', ago: 'منذ', duration: 'المدة',
        categoriesSpent: 'الفئات التي تم بثها', highlights: 'لقطات ممتعة من البث',
        socialsTitle: 'ساحة التواصل', socialsSub: 'كل المنصات في مكان واحد — اختر ساحتك.',
        communityTitle: 'مقر المجتمع', supportTitle: 'دعم القناة', supportSub: 'دعمك يخلي قلعة العاصفة أسطورية وتستمر.',
        honorTitle: 'لوحة الشرف', honorSub: 'كبار الداعمين عبر كل البثوث.',
        modsTitle: 'المشرفون', modsSub: 'حراس القلعة — مباشرة من منصة X.',
        archiveTitle: 'الأرشيف', archiveSub: 'اللقطات والبثوث السابقة.',
        statsTitle: 'إحصائيات البث', statsSub: 'أرقام قلعة العاصفة لحظة بلحظة.',
        tiersTitle: 'مستويات التنبيه الخاصة',
        theaterTitle: 'مسرح البث المباشر', viewers: 'مشاهد',
        statsKick: 'متابع كيك', statsPlatforms: 'منصة', statsStatus: 'الحالة',
        follow: 'تابع', open: 'افتح', followers: 'متابع',
    }
};

// ================= DESIGN SYSTEM =================

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string; as?: 'div' | 'section' }> = ({ children, delay = 0, className = '' }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') { el.classList.add('is-visible'); return; }
        const obs = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) { el.classList.add('is-visible'); obs.disconnect(); } });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
};

const ArenaBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;
        let raf = 0; let w = 0; let h = 0;
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 1.5);
        // Storm fortress: rising blue sparks + ember fire — lite edition:
        // no shadowBlur (GPU killer), fewer particles, ~30fps throttle
        type P = { x: number; y: number; r: number; vy: number; vx: number; sway: number; phase: number; a: number; ember: boolean; spark: boolean };
        let parts: P[] = [];
        const resize = () => {
            w = window.innerWidth; h = window.innerHeight;
            canvas.width = Math.floor(w * DPR); canvas.height = Math.floor(h * DPR);
            canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
            const n = Math.min(isMobile ? 14 : 40, Math.floor(w / 38));
            parts = Array.from({ length: n }, () => ({
                x: Math.random() * w, y: Math.random() * h,
                r: 0.7 + Math.random() * 2.2,
                vy: -(0.25 + Math.random() * 0.7), vx: (Math.random() - 0.5) * 0.2,
                sway: 0.3 + Math.random() * 0.9, phase: Math.random() * Math.PI * 2,
                a: 0.2 + Math.random() * 0.55, ember: Math.random() > 0.4, spark: Math.random() > 0.45,
            }));
        };
        resize();
        window.addEventListener('resize', resize);
        let t = 0; let last = 0;
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick);
            if (document.hidden) return;
            if (now - last < (isMobile ? 42 : 34)) return; // phones ~24fps, desktop ~30fps
            last = now;
            t += 0.034;
            ctx.clearRect(0, 0, w, h);
            for (const p of parts) {
                p.y += p.vy * 2;
                p.x += p.vx * 2 + Math.sin(t * p.sway + p.phase) * 0.5;
                if (p.y < -12) { p.y = h + 12; p.x = Math.random() * w; }
                if (p.x < -12) p.x = w + 12; if (p.x > w + 12) p.x = -12;
                const flick = p.ember ? (0.72 + 0.28 * Math.sin(t * 5 + p.phase)) : 1;
                const alpha = Math.max(0, Math.min(1, p.a * flick));
                const col = p.spark ? '77,141,255' : p.ember ? '140,190,255' : '220,235,255';
                const dim = p.spark || p.ember ? 1 : 0.5;
                // cheap two-pass glow: faint halo + solid core (zero shadowBlur)
                ctx.globalAlpha = alpha * 0.22 * dim;
                ctx.fillStyle = `rgb(${col})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = alpha * dim;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        };
        raf = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
    }, []);
    return (
        <div className="fixed inset-0 z-0 bg-[#05060B] overflow-hidden" aria-hidden="true">
            {/* the storm fortress artwork — hero of the whole design */}
            <div className="absolute inset-0 fortress_bg" />
            <div className="absolute inset-0 fortress_overlay" />
            {/* god-ray beams through the storm haze */}
            <div className="beam left-[8%] hidden md:block" />
            <div className="beam left-[16%] opacity-60 hidden md:block" style={{ animationDelay: '-4s', width: 70 }} />
            {/* blue glow left + ember aura right */}
            <div className="absolute -top-32 -left-32 w-[46vw] h-[46vw] max-w-[560px] max-h-[560px] rounded-full bg-[#4D8DFF]/[0.14] blur-[130px] animate-aurora" />
            <div className="absolute top-[8%] right-[-8%] w-[34vw] h-[34vw] max-w-[440px] max-h-[440px] rounded-full bg-[#9CC5FF]/[0.16] blur-[120px] animate-aurora" style={{ animationDelay: '-8s' }} />
            <canvas ref={canvasRef} className="absolute inset-0 opacity-90" />
            {/* readability vignette: dark void in the middle, deep blue ink at content depth */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_44%_at_50%_30%,transparent_30%,rgba(5,6,11,0.5)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-[36%] bg-gradient-to-t from-[#05060B] via-[#05060B]/70 to-transparent" />
        </div>
    );
};

const SectionHeading: React.FC<{ no: string; title: string; sub?: string; en?: string; compact?: boolean }> = ({ no, title, sub, en, compact }) => (
    <div className={`flex items-end gap-3 md:gap-5 ${compact ? 'mb-5 md:mb-7' : 'mb-6 md:mb-9'}`}>
        <span className="relative font-gaming text-4xl sm:text-5xl md:text-7xl leading-none text-stroke-ice select-none shrink-0"
            style={{ filter: 'drop-shadow(0 0 22px rgba(77,141,255,.35))' }}
            dir="ltr"
            aria-hidden="true">{no}</span>
        <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-3 flex-wrap">
                <h2 className="text-[26px] sm:text-3xl md:text-[42px] font-black leading-tight tracking-tight text-white">{title}</h2>
                {en && (
                    <span className="hidden sm:inline-flex items-center text-[10px] font-black tracking-[0.32em] uppercase text-[#9CC5FF]/70"
                        style={{ transform: 'translateY(-2px)' }} dir="ltr">{en}</span>
                )}
            </div>
            {sub && <p className="text-[13px] md:text-[15px] text-white/55 mt-2 font-medium leading-relaxed">{sub}</p>}
            <div className="relative mt-3.5 md:mt-4 h-[2px] w-full rounded-full bg-gradient-to-l from-[#9CC5FF]/55 via-[#4D8DFF]/28 to-transparent">
                <span className="absolute inset-y-0 start-0 w-14 rounded-full"
                    style={{ background: 'linear-gradient(90deg,#D6E9FF,#9CC5FF)', boxShadow: '0 0 14px rgba(77,141,255,.7)' }} aria-hidden="true" />
            </div>
        </div>
    </div>
);

const Marquee: React.FC<{ lang: Language }> = ({ lang }) => {
    const items = lang === 'ar'
        ? ['بثوث أسطورية', 'قلعة MADARA', 'عاصفة زرقاء', 'تفاعل لا يتوقف', 'جوائز ودروبس', 'تحديات مدارا', 'سهرات القلعة']
        : ['EPIC STREAMS', 'MADARA ERA', 'BLUE STORM', 'NONSTOP HYPE', 'DROPS & REWARDS', 'MADARA VIBES', 'FORTRESS NIGHTS'];
    const row = [...items, ...items];
    return (
        <div className="relative -mx-3 sm:-mx-4 md:-mx-8 overflow-hidden border-y border-[#9CC5FF]/20 bg-black/60 backdrop-blur-md marquee-mask" dir="ltr" aria-hidden="true">
            <div className="flex w-max animate-marquee gap-0 py-2.5 md:py-3">
                {row.map((t, i) => (
                    <span key={i} className="flex items-center gap-6 px-6 whitespace-nowrap text-[12px] md:text-sm font-black tracking-[0.25em] text-white/60">
                        <span className={i % 2 ? 'text-white/60' : 'text-[#7FB2FF]'}>{t}</span>
                        <span className="w-1.5 h-1.5 rotate-45 bg-[#9CC5FF]/70 inline-block" />
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- Count-up number (rAF, reduced-motion safe) ---
const CountUp: React.FC<{ value: number; duration?: number }> = ({ value, duration = 1300 }) => {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(value); return; }
        let raf = 0;
        const t0 = performance.now();
        const step = (t: number) => {
            const p = Math.min(1, (t - t0) / duration);
            setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [value, duration]);
    return <span dir="ltr">{n.toLocaleString('en-US')}</span>;
};

// --- Last Session Report: MISSION DEBRIEF edition (rich Kick data) ---
const LastSessionReport: React.FC<{ lang: Language; data: any; clips: any[]; past?: any[]; onPlayVod?: (v: any) => void; onPlayClip?: (c: any) => void }> = ({ lang, data, clips, past = [], onPlayVod, onPlayClip }) => {
    if (!data && (!clips || clips.length === 0)) return null;
    const timeAgo = (date: string) => {
        if (!date) return '---';
        const now = new Date(); const pastD = new Date(date);
        if (isNaN(pastD.getTime())) return '---';
        const diff = Math.floor((now.getTime() - pastD.getTime()) / 1000);
        if (diff < 60) return lang === 'en' ? `${diff}s ago` : `منذ ${diff} ثانية`;
        if (diff < 3600) return lang === 'en' ? `${Math.floor(diff / 60)}m ago` : `منذ ${Math.floor(diff / 60)} دقيقة`;
        if (diff < 86400) return lang === 'en' ? `${Math.floor(diff / 3600)}h ago` : `منذ ${Math.floor(diff / 3600)} ساعة`;
        return lang === 'en' ? `${Math.floor(diff / 86400)}d ago` : `منذ ${Math.floor(diff / 86400)} يوم`;
    };
    const formatDuration = (val: number) => {
        if (!val) return '0h 0m';
        const totalSeconds = val > 1000000 ? Math.floor(val / 1000) : val;
        return `${Math.floor(totalSeconds / 3600)}h ${Math.floor((totalSeconds % 3600) / 60)}m`;
    };
    const t = TRANSLATIONS[lang] as any;
    const thumbnail = data.thumbnail?.url || data.thumbnail?.src || (typeof data.thumbnail === 'string' ? data.thumbnail : '') || (data.responsive_url) || PC_BACKGROUND;
    const views = Number(data.views ?? data.video?.views ?? 0);
    const peak = Number(data.viewer_count ?? 0);
    const durH = data.duration > 1000000 ? data.duration / 3600000 : (Number(data.duration) || 0) / 3600;
    const vph = durH > 0.05 ? Math.round(views / durH) : views;
    // Kick VOD pages are addressed by the video UUID (numeric ids land on the wrong page)
    const vodUuidOf = (v: any) => v?.uuid || v?.video?.uuid || v?.id;
    const vodUrl = `https://kick.com/${CHANNEL_SLUG}/videos/${vodUuidOf(data)}`;
    const isSubOnly = data.video?.status === 'subscriber_only' || data.video?.is_private === true;
    const fullDate = (() => { try { return new Date(data.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } })();
    const sessions = [data, ...past].slice(0, 4);
    const maxV = Math.max(1, ...sessions.map((s: any) => Number(s.views ?? s.video?.views ?? 0)));
    const compact = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`;
    const vodUrlOf = (v: any) => `https://kick.com/${CHANNEL_SLUG}/videos/${vodUuidOf(v)}`;
    // Categories across the last sessions combined — every game played, not just the latest one
    const allSessions = [data, ...past].filter(Boolean);
    const allCats: any[] = [];
    allSessions.forEach((s: any) => {
        const raw = s?.categories;
        const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
        arr.forEach((c: any) => {
            const inner = c?.category || c;
            if (inner && !allCats.some(x => (x.id ?? x.slug ?? x.name) === (inner.id ?? inner.slug ?? inner.name))) allCats.push(inner);
        });
    });
    const catTags: string[] = [...new Set(allCats.flatMap((c: any) => c.tags || []))].slice(0, 6) as string[];
    const L = {
        views: lang === 'en' ? 'VIEWS' : 'المشاهدات',
        peak: lang === 'en' ? 'PEAK' : 'الذروة',
        perHour: lang === 'en' ? 'VIEWS / HR' : 'مشاهدة / ساعة',
        pulse: lang === 'en' ? 'RECENT SESSIONS PULSE' : 'نبض الجلسات الأخيرة',
        watch: lang === 'en' ? 'WATCH VOD' : 'مشاهدة التسجيل',
        family: lang === 'en' ? 'FAMILY' : 'عائلي',
    };
    const stats = [
        { label: t.duration, value: <span dir="ltr">{formatDuration(data.duration)}</span>, hot: true, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { label: L.views, value: <CountUp value={views} />, hot: false, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> },
        { label: L.peak, value: <CountUp value={peak} />, hot: true, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 1015 12a3 3 0 00-2.88 3.12z" clipRule="evenodd" /></svg> },
        { label: L.perHour, value: <CountUp value={vph} />, hot: false, icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg> },
    ];
    return (
        <Reveal className="w-full">
            <div className="relative overflow-hidden rounded-[28px] md:rounded-[36px] border border-white/10 bg-[#0a0a0a]/85 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
                {/* cinematic ambient from thumbnail */}
                <img src={thumbnail} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-25 scale-110 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 pointer-events-none" />
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-l from-transparent via-[#4D8DFF] to-transparent" />
                <div className="relative p-5 sm:p-8 md:p-10">
                    {/* header */}
                    <div className="flex flex-wrap items-center gap-3 mb-6 md:mb-8 animate-fade-in-up">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#4D8DFF] shadow-[0_0_14px_#4D8DFF] animate-pulse shrink-0" />
                        <span className="text-[11px] font-black tracking-[0.35em] text-white/45 uppercase">{t.lastSessionReport}</span>
                        <span className="ms-auto flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-white/70">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {fullDate} • {timeAgo(data.created_at)}
                            </span>
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border tracking-widest ${isSubOnly ? 'bg-[#9CC5FF]/10 border-[#9CC5FF]/40 text-[#D6E9FF]' : 'bg-[#9CC5FF]/10 border-[#9CC5FF]/40 text-[#9CC5FF]'}`}>
                                {isSubOnly ? t.subOnly : 'PUBLIC'}
                            </span>
                        </span>
                    </div>

                    {/* hero */}
                    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start">
                        <div className="[perspective:1200px] w-full lg:w-[380px] shrink-0 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                            <a href={vodUrl} target="_blank" rel="noopener noreferrer" onClick={onPlayVod ? (e) => { e.preventDefault(); onPlayVod(data); } : undefined}
                                className="group relative block aspect-video rounded-2xl overflow-hidden border border-[#4D8DFF]/30 bg-black shadow-[0_24px_60px_-16px_rgba(77,141,255,0.4)] [transform:rotateY(-7deg)_rotateX(2deg)] hover:[transform:rotateY(0deg)_rotateX(0deg)] transition-transform duration-700 cursor-pointer">
                                <img src={thumbnail} alt="Last Session" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                                <span className="absolute top-3 start-3 text-[10px] font-black px-2.5 py-1 rounded-full bg-black/70 border border-white/15 text-white/80 backdrop-blur">VOD</span>
                                <span className="absolute inset-0 m-auto w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#4D8DFF]/25 backdrop-blur-md border border-[#4D8DFF]/70 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-[0_0_36px_rgba(77,141,255,0.55)]">
                                    <svg className="w-6 h-6 text-white fill-current translate-x-[1px] rtl:-translate-x-[1px]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                </span>
                                <span className="absolute bottom-3 end-3 text-[10px] font-black px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 text-white" dir="ltr">{formatDuration(data.duration)}</span>
                                <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 text-white" dir="ltr">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    {compact(views)}
                                </span>
                            </a>
                            <a href={vodUrl} target="_blank" rel="noopener noreferrer" onClick={onPlayVod ? (e) => { e.preventDefault(); onPlayVod(data); } : undefined}
                                className="mt-3 w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#7FB2FF] via-[#4D8DFF] to-[#0B1B33] text-white font-black text-sm shadow-[0_12px_30px_-10px_rgba(77,141,255,0.6)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
                                {L.watch}
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </a>
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-wrap items-center gap-2 mb-3 animate-fade-in-up" style={{ animationDelay: '140ms' }}>
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/[0.07] border border-white/10 text-white/70" dir="ltr">{data.language || 'AR'}</span>
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white/[0.07] border border-white/10 text-white/70">{data.is_mature ? '18+' : L.family}</span>
                                {catTags.map((tag, i) => <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#4D8DFF]/10 border border-[#4D8DFF]/30 text-[#7FB2FF]" dir="ltr">#{tag}</span>)}
                            </div>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-snug mb-5 animate-fade-in-up" style={{ animationDelay: '180ms' }}>{data.session_title || data.title}</h3>
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
                                {stats.map((s, i) => (
                                    <div key={i} className={`card-sheen relative overflow-hidden rounded-2xl border px-4 py-4 text-center backdrop-blur-md animate-fade-in-up ${s.hot ? 'bg-[#4D8DFF]/[0.07] border-[#4D8DFF]/25' : 'bg-white/[0.04] border-white/10'}`} style={{ animationDelay: `${220 + i * 80}ms` }}>
                                        <span className={`mx-auto w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${s.hot ? 'bg-[#4D8DFF]/15 text-[#7FB2FF]' : 'bg-white/[0.07] text-white/60'}`}>{s.icon}</span>
                                        <p className="text-lg sm:text-xl md:text-2xl font-black text-white">{s.value}</p>
                                        <p className="text-[9px] sm:text-[10px] font-bold text-white/35 uppercase tracking-widest mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* recent sessions pulse */}
                            {sessions.length > 1 && (
                                <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '540ms' }}>
                                    <p className="text-[10px] font-black tracking-[0.25em] text-white/30 uppercase mb-3">{L.pulse}</p>
                                    <div className="flex items-end gap-2 sm:gap-3 h-28 sm:h-32" dir="ltr">
                                        {sessions.map((s: any, i: number) => {
                                            const v = Number(s.views ?? s.video?.views ?? 0);
                                            const h = Math.max(10, Math.round((v / maxV) * 100));
                                            const cur = i === 0;
                                            return (
                                                <a key={s.id || i} href={vodUrlOf(s)} target="_blank" rel="noopener noreferrer" onClick={onPlayVod ? (e) => { e.preventDefault(); onPlayVod(s); } : undefined} title={s.session_title || s.title}
                                                    className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group/bar min-w-0">
                                                    <span className={`text-[10px] sm:text-[11px] font-black ${cur ? 'text-[#7FB2FF]' : 'text-white/45'}`} dir="ltr">{compact(v)}</span>
                                                    <span className="tier-bar w-full max-w-[90px] rounded-t-lg border-x border-t relative overflow-hidden"
                                                        style={{
                                                            height: `${h}%`, animationDelay: `${i * 120}ms`,
                                                            background: cur ? 'linear-gradient(to bottom, #4D8DFF, #4D8DFF55 60%, rgba(0,0,0,0.5))' : 'linear-gradient(to bottom, rgba(255,255,255,0.35), rgba(255,255,255,0.06))',
                                                            borderColor: cur ? '#4D8DFF88' : 'rgba(255,255,255,0.15)',
                                                            boxShadow: cur ? '0 0 22px -4px rgba(77,141,255,0.7)' : 'none',
                                                        }}>
                                                        <span className="absolute top-0 inset-x-2 h-1 rounded-full bg-white/40 blur-[1px]" />
                                                    </span>
                                                    <span className={`w-full max-w-[90px] h-1.5 rounded-b bg-black/70 border-x border-b ${cur ? 'border-[#4D8DFF]/50' : 'border-white/10'}`} />
                                                </a>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {allCats.length > 0 && (
                                <div className="mt-6 animate-fade-in-up" style={{ animationDelay: '620ms' }}>
                                    <p className="kicker text-white/30 mb-3" dir="ltr">// {t.categoriesSpent}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {allCats.map((cat: any, i: number) => {
                                            const catName = cat.name || cat.category?.name || 'Just Chatting';
                                            const slug = cat.slug || cat.category?.slug || catName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
                                            const catImg = cat.banner?.url || cat.banner?.responsive || cat.category?.banner?.url || cat.category?.banner?.responsive || cat.responsive_url || cat.thumbnail?.url || cat.category?.responsive_url || cat.category?.thumbnail?.url || `https://files.kick.com/categories/${slug}/fullsize.png`;
                                            return (
                                                <span key={i} className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-full ps-1 pe-3 py-1 hover:border-[#4D8DFF]/40 transition-colors">
                                                    <span className="w-7 h-7 rounded-full overflow-hidden bg-black border border-white/10 block">
                                                        <img src={catImg} alt={catName} loading="lazy" className="w-full h-full object-cover"
                                                            onError={(e) => { const tg = e.target as HTMLImageElement; tg.src = tg.src.includes('picsum') ? DEFAULT_PROFILE_IMAGE : `https://picsum.photos/seed/${slug}/100/100`; }} />
                                                    </span>
                                                    <span className="text-[11px] font-bold text-white/75">{catName}</span>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {clips && clips.length > 0 && (
                        <div className="mt-8 md:mt-10 pt-7 border-t border-white/[0.07] animate-fade-in-up" style={{ animationDelay: '680ms' }}>
                            <div className="flex items-center gap-2.5 mb-5">
                                <span className="w-2 h-2 rounded-full bg-neon shadow-[0_0_10px_#9CC5FF]" />
                                <span className="text-[11px] font-black tracking-[0.25em] text-white/40 uppercase">{t.highlights}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 md:gap-4">
                                {clips.slice(0, 3).map((clip: any, i: number) => (
                                    <a key={clip.id || i} href={`https://kick.com/${CHANNEL_SLUG}/clips/${clip.id}`} target="_blank" rel="noopener noreferrer" onClick={onPlayClip ? (e) => { e.preventDefault(); onPlayClip(clip); } : undefined}
                                        className="group relative aspect-video rounded-xl md:rounded-2xl overflow-hidden border border-white/10 bg-black hover:border-[#4D8DFF]/60 hover:-translate-y-1 transition-all duration-300">
                                        <img src={clip.thumbnail_url || clip.thumbnail?.url || PC_BACKGROUND} alt={clip.title} loading="lazy"
                                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                                        <span className="absolute top-1.5 start-1.5 w-5 h-5 md:w-6 md:h-6 rounded-lg bg-black/70 border border-white/15 text-white/80 text-[9px] md:text-[10px] font-black flex items-center justify-center backdrop-blur" dir="ltr">{i + 1}</span>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-[#4D8DFF]/25 backdrop-blur border border-[#4D8DFF]/60 flex items-center justify-center shadow-[0_0_16px_rgba(77,141,255,0.6)]">
                                                <svg className="w-4 h-4 md:w-5 md:h-5 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                            </span>
                                        </div>
                                        <div className="absolute bottom-0 inset-x-0 p-2 md:p-3">
                                            <p className="text-[8px] md:text-[11px] font-bold text-white truncate">{clip.title}</p>
                                            <p className="text-[7px] md:text-[10px] text-white/45 font-medium" dir="ltr">{clip.view_count || 0} {lang === 'en' ? 'views' : 'مشاهدة'}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Reveal>
    );
};

// --- Platform identity gradients (storm fortress palette) ---
const BRAND_GRADIENTS: Record<string, string> = {
    KICK: 'linear-gradient(135deg, rgba(156,197,255,0.28), rgba(156,197,255,0.05) 55%, transparent)',
    WhatsApp: 'linear-gradient(135deg, rgba(37,211,102,0.28), rgba(37,211,102,0.08) 55%, transparent)',
    TikTok: 'linear-gradient(135deg, rgba(254,44,85,0.24), rgba(37,244,238,0.12) 60%, transparent)',
    X: 'linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.02) 60%, transparent)',
    YouTube: 'linear-gradient(135deg, rgba(255,0,0,0.26), rgba(255,0,0,0.05) 55%, transparent)',
};

// --- EN descriptions for social links (Arabic originals live in buildDefaultSocials) ---
const SOCIAL_DESC_EN: Record<string, string> = {
    'المسرح الرئيسي والبث المباشر': 'Main stage & live stream',
    'قناة الواتساب — كل جديد أول بأول': 'WhatsApp channel — everything first',
    'الأخبار والتحديثات أول بأول': 'News & updates first',
    'أقوى المقاطع والترند': 'Best clips & trends',
    'قناة مدارا': 'MADARA Channel',
};

// --- Social Card — premium storm edition (MADARA identity) ---
const SocialCard: React.FC<{ social: SocialLink; index: number; featured?: boolean; lang: Language }> = ({ social, index, featured = false, lang }) => {
    const [hover, setHover] = useState(false);
    const [launching, setLaunching] = useState(false);
    const [pressed, setPressed] = useState(false);
    const brand = social.hex || '#ffffff';
    const bright = social.name === 'KICK';
    const go = (e: React.MouseEvent) => {
        e.preventDefault();
        if (launching) return;
        setLaunching(true);
        window.setTimeout(() => { window.location.href = social.url; }, 420);
    };
    const active = hover || launching;
    const card = (
        <div className={`card-sheen relative h-full rounded-[22px] border bg-[#0b0b0b]/92 backdrop-blur-xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-active:translate-y-0 group-active:scale-[0.985] ${launching ? 'glitch-active' : ''} ${pressed ? 'scale-[0.985]' : ''}`}
            style={{ borderColor: launching ? brand : active ? `${brand}99` : 'rgba(255,255,255,0.09)', boxShadow: active ? `0 18px 44px -16px ${brand}66, inset 0 1px 0 rgba(255,255,255,0.08)` : '0 10px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {/* brand wash */}
            <div className="absolute inset-0 pointer-events-none transition-opacity duration-500" style={{ background: BRAND_GRADIENTS[social.name] || `linear-gradient(135deg, ${brand}22, transparent 60%)`, opacity: active ? 1 : 0.75 }} />
            {/* giant watermark icon */}
            <div className="absolute -end-3 -bottom-5 opacity-[0.07] group-hover:opacity-[0.13] transition-opacity duration-500 pointer-events-none scale-[2.6] origin-bottom" style={{ color: brand }}>
                {social.icon}
            </div>
            {/* top energy line */}
            <span className="absolute top-0 start-6 end-6 h-[2.5px] rounded-full transition-all duration-500" style={{ background: `linear-gradient(90deg, transparent, ${brand}, transparent)`, opacity: active ? 1 : 0.3, boxShadow: active ? `0 0 18px ${brand}` : 'none' }} />
            {launching && <span className="absolute bottom-0 start-0 h-1 animate-charge z-30" style={{ width: '100%', backgroundColor: brand, boxShadow: `0 0 12px ${brand}` }} />}
            <div className={`relative p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 ${featured ? 'min-h-[112px] sm:min-h-[128px]' : 'min-h-[96px] sm:min-h-[104px]'}`}>
                {/* icon medallion */}
                <div className={`${featured ? 'w-[54px] h-[54px] sm:w-[68px] sm:h-[68px]' : 'w-[50px] h-[50px] sm:w-[60px] sm:h-[60px]'} rounded-[18px] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-[1.06] group-hover:-rotate-3`}
                    style={{
                        color: active && bright ? '#000' : brand,
                        background: active && bright ? brand : `linear-gradient(160deg, ${brand}2e, rgba(255,255,255,0.04))`,
                        border: `1.5px solid ${active ? brand : 'rgba(255,255,255,0.13)'}`,
                        boxShadow: active ? `0 0 26px ${brand}55, inset 0 1px 0 rgba(255,255,255,0.25)` : `inset 0 1px 0 rgba(255,255,255,0.08)`
                    }}>
                    {launching
                        ? <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                        : social.icon}
                </div>
                {/* texts */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: launching ? brand : active ? brand : 'rgba(255,255,255,0.48)' }}>
                            {launching ? 'LAUNCHING…' : social.name}
                        </span>
                        {featured && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-[3px] rounded-full bg-[#9CC5FF]/15 border border-[#9CC5FF]/45 text-[#9CC5FF] tracking-[0.14em]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#9CC5FF] animate-pulse" />MAIN STAGE
                            </span>
                        )}
                    </div>
                    <p className={`font-black text-white truncate leading-tight mt-0.5 ${featured ? 'text-[19px] min-[400px]:text-[21px] sm:text-2xl' : 'text-[15px] min-[400px]:text-[16px] sm:text-[17px]'}`} dir="ltr">{(lang === 'en' && SOCIAL_DESC_EN[social.username]) || social.username}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {social.followerCount && social.followerCount !== '—' && (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-black text-white/85`} dir="ltr">
                                <svg className="w-3 h-3 text-white/40" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                                {social.followerCount}
                            </span>
                        )}
                        {social.specialDetail && <span className="text-[11px] text-white/40 font-medium truncate max-w-full">{(lang === 'en' && SOCIAL_DESC_EN[social.specialDetail]) || social.specialDetail}</span>}
                    </div>
                </div>
                {/* CTA */}
                <span className={`shrink-0 flex items-center justify-center rounded-full font-black transition-all duration-300 ${featured ? 'w-11 h-11 sm:w-12 sm:h-12' : 'w-10 h-10 sm:w-11 sm:h-11'}`}
                    style={{
                        background: active ? brand : 'rgba(255,255,255,0.07)',
                        color: active ? (bright ? '#000' : '#fff') : '#fff',
                        border: `1.5px solid ${active ? brand : 'rgba(255,255,255,0.14)'}`,
                        boxShadow: active ? `0 0 20px ${brand}66` : 'none'
                    }}>
                    <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
            </div>
            {/* bottom fill line */}
            <span className="absolute bottom-0 start-0 h-[2px] transition-all duration-500" style={{ width: active ? '100%' : '0%', background: brand, boxShadow: `0 0 10px ${brand}` }} />
        </div>
    );
    return (
        <a href={social.url} onClick={go} onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPressed(false); }}
            onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
            style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
            className={`group relative block animate-fade-in-up select-none rounded-[22px] ${launching ? 'z-40' : ''}`}
            title={`${social.name} - MADARA Official`} aria-label={lang === 'ar' ? `تابع مدارا على ${social.name}` : `Visit MADARA on ${social.name}`}>
            {featured ? (
                <div className="rounded-[24px] p-[1.5px] bg-gradient-to-l from-[#9CC5FF] via-[#9CC5FF]/25 to-[#9CC5FF]/70 shadow-[0_0_35px_rgba(156,197,255,0.15)]">
                    <div className="rounded-[22.5px] bg-[#0b0b0b]">{card}</div>
                </div>
            ) : (
                <>
                    <div className="absolute -inset-0.5 rounded-[24px] opacity-0 group-hover:opacity-100 group-active:opacity-60 transition-opacity duration-500 blur-xl pointer-events-none" style={{ background: `linear-gradient(135deg, ${brand}44, transparent 65%)` }} />
                    {card}
                </>
            )}
        </a>
    );
};

// ============ SUPPORT — modern glass system + monthly supporters board (creators.sa) ============

// Special alert tiers — storm fortress interactive cards with perks
const TIERS = [
    { amount: 50, label: '50$', c: '#D6E9FF', glow: 'rgba(77,141,255,0.45)', name: 'STORM', nameAr: 'العاصفة', perk: 'تنبيه عاصفي أنيق يظهر اسمك في الشات', perkEn: 'Sleek storm on-screen alert', icon: '✦' },
    { amount: 100, label: '100$', c: '#7FB2FF', glow: 'rgba(156,197,255,0.5)', name: 'BOLT', nameAr: 'صاعقة', perk: 'تنبيه صاعقة + شكر صوتي مباشر من مدارا', perkEn: 'Bolt alert + live shoutout', icon: '⬣' },
    { amount: 200, label: '200$', c: '#9CC5FF', glow: 'rgba(77,141,255,0.6)', name: 'STORM', nameAr: 'أزرق', perk: 'تنبيه سينمائي يليق عليك — يظهر اليرت بشكل احترافي جداً', perkEn: 'A cinematic alert worthy of you — ultra-professional on-screen alert', icon: '◈', popular: true },
    { amount: 500, label: '500$', c: '#4D8DFF', glow: 'rgba(77,141,255,0.55)', name: 'FORTRESS', nameAr: 'القلعة', perk: 'عرض اسمك بحجم الشاشة + مقطع شكر خاص', perkEn: 'Fullscreen takeover + clip', icon: '⬥' },
    { amount: 1000, label: '1000$', c: '#5B8FE8', glow: 'rgba(91,143,232,0.55)', name: 'LEGEND', nameAr: 'أسطوري', perk: 'دخول قاعة الخلود + فيديو تكريم خاص', perkEn: 'Hall of fame + tribute video', icon: '❖' },
];

const AlertTiers: React.FC<{ title: string; note: string; lang: Language }> = ({ title, note, lang }) => {
    const [active, setActive] = useState(2);
    const max = 1000;
    const isAr = lang === 'ar';
    return (
        <div id="store" className="relative mt-5 md:mt-7 rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden scroll-mt-32">
            <div className="absolute -top-24 start-1/4 w-96 h-96 rounded-full bg-[#9CC5FF]/[0.10] blur-[110px] pointer-events-none" aria-hidden="true" />
            <div className="absolute -bottom-24 end-0 w-80 h-80 rounded-full bg-[#2E5FA3]/[0.10] blur-[100px] pointer-events-none" aria-hidden="true" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-[#9CC5FF]/70 to-transparent" aria-hidden="true" />
            <div className="relative p-5 sm:p-7 md:p-8">
                <div className="flex items-center justify-center gap-2.5 mb-1">
                    <span className="w-1.5 h-1.5 rotate-45 bg-[#9CC5FF] inline-block" aria-hidden="true" />
                    <p className="text-[11px] md:text-xs font-black text-white/60 tracking-[0.32em] uppercase">{title}</p>
                    <span className="w-1.5 h-1.5 rotate-45 bg-[#9CC5FF] inline-block" aria-hidden="true" />
                </div>
                <p className="text-center text-[12px] text-white/40 font-medium mb-6">{isAr ? 'الوصف الكامل للمستوى المميز بالنصف' : 'Full perk preview on the featured middle tier'}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3" role="list">
                    {TIERS.map((tr, i) => {
                        const featured = i === 2;
                        const on = active === i;
                        const pct = Math.max(8, Math.round((tr.amount / max) * 100));
                        return (
                            <button key={tr.label} role="listitem" onClick={() => setActive(i)}
                                className={`group relative text-start rounded-3xl border p-4 sm:p-5 overflow-hidden transition-all duration-500 active:scale-[0.97] ${on ? 'border-white/25 bg-white/[0.07] -translate-y-1.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.7)]' : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05] hover:-translate-y-1'}`}>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                    style={{ background: `radial-gradient(220px circle at 50% 0%, ${tr.glow}, transparent 70%)` }} aria-hidden="true" />
                                {tr.popular && (
                                    <span className="absolute top-3 end-3 text-[8px] font-black tracking-[0.18em] px-2 py-1 rounded-full bg-[#9CC5FF] text-black shadow-[0_0_18px_rgba(77,141,255,0.7)]">HOT</span>
                                )}
                                <span className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black border border-white/15 bg-white/[0.06] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
                                    style={{ color: tr.c, boxShadow: on ? `0 0 24px ${tr.glow}` : 'none' }}>{tr.icon}</span>
                                <p className="relative text-2xl sm:text-[26px] font-black text-white tracking-tight mt-3" dir="ltr">{tr.label}</p>
                                <p className="relative text-[10px] font-black tracking-[0.22em] mt-1" style={{ color: tr.c }} dir="ltr">{tr.name}</p>
                                <p className="relative text-[11px] font-bold text-white/45 mt-0.5">{isAr ? tr.nameAr : tr.name}</p>
                                <div className="relative mt-3 h-1.5 rounded-full bg-white/[0.07] overflow-hidden" dir="ltr">
                                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tr.c}, ${tr.c}88)`, boxShadow: `0 0 12px ${tr.glow}` }} />
                                </div>
                                <div className={`relative grid transition-all duration-500 overflow-hidden ${on && featured ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <p className="overflow-hidden text-[11px] leading-relaxed font-medium text-white/70">{isAr ? tr.perk : tr.perkEn}</p>
                                </div>
                                <span className="absolute bottom-0 start-0 h-[2px] transition-all duration-500" style={{ width: on ? '100%' : '0%', background: tr.c, boxShadow: `0 0 12px ${tr.c}` }} aria-hidden="true" />
                            </button>
                        );
                    })}
                </div>
                <p className="text-center text-[10px] text-white/30 mt-5 font-medium">{note}</p>
            </div>
        </div>
    );
};

// Modern donate gate — glass, glow orbs, magnetic CTA, smooth micro-interactions
const DonateGate: React.FC<{
    lang: Language; title: string; url: string;
    color: string; color2?: string; label: string;
    markImg?: string; glyph?: string;
    secure: string; cta: string; sub: string;
}> = ({ lang, title, url, color, color2, label, markImg, glyph = '$', secure, cta, sub }) => {
    const [hover, setHover] = useState(false);
    const [busy, setBusy] = useState(false);
    const go = (e: React.MouseEvent) => {
        e.preventDefault(); if (busy) return; setBusy(true);
        window.setTimeout(() => { window.open(url, '_blank'); window.setTimeout(() => setBusy(false), 600); }, 350);
    };
    const ctaBg = color2 ? `linear-gradient(135deg, ${color}, ${color2})` : `linear-gradient(135deg, #fff 0%, ${color} 60%, ${color})`;
    const ctaColor = color2 ? '#fff' : '#061A33';
    return (
        <a href={url} onClick={go} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            className="group relative block rounded-[28px] transition-transform duration-500 hover:-translate-y-1.5 active:translate-y-0 active:scale-[0.99]" aria-label={`${title} donation`}>
            <div className="absolute -inset-2 rounded-[32px] blur-3xl pointer-events-none transition-opacity duration-700" style={{ background: `linear-gradient(150deg, ${color}40, ${color2 ? color2 + '33' : 'transparent'} 60%, transparent)`, opacity: hover ? 1 : 0.5 }} aria-hidden="true" />
            <div className="card-sheen relative rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl overflow-hidden transition-all duration-500 group-hover:border-white/25 group-hover:bg-white/[0.06] group-hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(420px circle at 85% -10%, ${color}26, transparent 65%), radial-gradient(320px circle at 0% 110%, ${color2 || color}1f, transparent 60%)` }} aria-hidden="true" />
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-white/40 to-transparent" aria-hidden="true" />
                <span className="absolute top-4 end-4 inline-flex items-center gap-1.5 text-[9px] font-black tracking-[0.2em] px-2.5 py-1.5 rounded-full bg-black/50 border border-white/15 text-white/60 backdrop-blur">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
                    {busy ? (lang === 'en' ? 'OPENING…' : 'جاري الفتح…') : 'LIVE'}
                </span>
                <div className="relative p-4 sm:p-5 md:p-7">
                    <div className="flex items-center gap-3.5 sm:gap-4">
                        <span className="relative w-[58px] h-[58px] sm:w-20 sm:h-20 rounded-[20px] flex items-center justify-center shrink-0 overflow-hidden border border-white/20 bg-black/40 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
                            style={{ boxShadow: hover ? `0 18px 44px -12px ${color}aa, inset 0 1px 0 rgba(255,255,255,0.25)` : `0 12px 30px -12px ${color}77, inset 0 1px 0 rgba(255,255,255,0.15)` }}>
                            {markImg
                                ? <img src={markImg} alt={`${title} logo`} className="w-full h-full object-cover" loading="lazy" />
                                : <span className="text-3xl font-black" style={{ color }}>{glyph}</span>}
                            <span className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black tracking-[0.3em] uppercase truncate" style={{ color }}>{label}</p>
                            <h3 className="font-black text-white tracking-tight leading-none mt-1.5 text-[23px] min-[400px]:text-[26px] sm:text-[30px] md:text-4xl break-words" dir="ltr">{title}</h3>
                            <p className="text-[12px] text-white/50 font-medium mt-2 leading-relaxed">{sub}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        {[(lang === 'en' ? 'Instant alert' : 'تنبيه فوري'), (lang === 'en' ? 'On-screen name' : 'اسمك على الشاشة'), (lang === 'en' ? 'Chat shoutout' : 'شكر في الشات')].map((f) => (
                            <span key={f} className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-white/60">
                                <svg className="w-3 h-3 shrink-0" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                {f}
                            </span>
                        ))}
                    </div>
                    <span className="mt-5 w-full min-h-[54px] inline-flex items-center justify-between gap-3 rounded-2xl ps-4 sm:ps-5 pe-2 py-2 font-black text-[13px] sm:text-sm transition-all duration-300 group-hover:brightness-110"
                        style={{ background: ctaBg, color: ctaColor, boxShadow: hover ? `0 0 32px ${color}88, 0 16px 40px -12px ${color}66` : `0 12px 28px -12px ${color}66` }}>
                        <span className="inline-flex items-center gap-2">
                            {busy
                                ? <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                : null}
                            {cta}
                        </span>
                        <span className="w-11 h-11 rounded-xl bg-black/20 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </span>
                    </span>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-bold tracking-[0.2em] text-white/35 uppercase">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        {secure}
                    </p>
                </div>
            </div>
        </a>
    );
};

const SupportArena: React.FC<{ lang: Language }> = ({ lang }) => {
    const t = TRANSLATIONS[lang];
    /* Monthly supporters — creators.sa unified leaderboard (top 5, this month only) */
    const [supporters, setSupporters] = useState<ApiSupporter[] | null>(null);
    useEffect(() => {
        let dead = false;
        getMonthlySupporters().then(list => { if (!dead) setSupporters(list); }).catch(() => { if (!dead) setSupporters([]); });
        return () => { dead = true; };
    }, []);
    const maxAmt = Math.max(1, ...(supporters || []).map(s => s.amount || 0));
    const hueOf = (n: string) => [...n].reduce((a, ch) => a + ch.charCodeAt(0), 0) * 37 % 360;
    return (
        <div className="w-full">
            {/* gates — modern glass duo */}
            <div className="relative">
                <div className="absolute -top-10 right-0 w-64 h-64 rounded-full bg-[#4D8DFF]/15 blur-[90px] animate-aurora pointer-events-none" aria-hidden="true" />
                <div className="absolute -bottom-10 left-0 w-72 h-72 rounded-full bg-[#9CC5FF]/20 blur-[100px] animate-aurora pointer-events-none" style={{ animationDelay: '-7s' }} aria-hidden="true" />
                <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5" dir="rtl">
                    <DonateGate lang={lang} title="STREAMLABS" url="https://streamlabs.com/mdra9" color="#4D8DFF" markImg="/streamlabs-mdra9.png"
                        label={lang === 'en' ? 'STREAMLABS' : 'ستريم لابس'} secure={lang === 'en' ? 'SECURE • INSTANT ALERT' : 'آمن • تنبيه فوري'} cta={lang === 'en' ? 'Donate via Streamlabs' : 'ادعم عبر ستريم لابس'}
                        sub={lang === 'en' ? 'Global cards • instant on-screen alert' : 'بطاقات عالمية • تنبيه فوري على الشاشة'} />
                    <DonateGate lang={lang} title="CREATORS" url="https://creators.sa/MDRA9" color="#9CC5FF" color2="#4D8DFF" markImg="/creators-mdra9.png"
                        label={lang === 'en' ? 'CREATORS • SEND TIP' : 'كرييتورز • تيب'}
                        secure={lang === 'en' ? 'SECURE • MADA & APPLE PAY' : 'آمن • مدى وآبل باي'} cta={lang === 'en' ? 'Donate via Creators' : 'ادعم عبر كرييتورز'}
                        sub={lang === 'en' ? 'Mada • Apple Pay • instant vibe' : 'مدى • آبل باي • تنبيه يهز الشات'} />
                </div>
            </div>

            {/* supporters board — chat legends design, monthly only */}
            <div className="cl-panel mt-6 md:mt-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <div className="cl-top">
                    <div className="cl-star">♥</div>
                    <div className="min-w-0">
                        <h3 className="cl-title">{lang === 'ar' ? 'أبطال الدعم' : 'Support Legends'}</h3>
                        <p className="cl-sub">{lang === 'ar' ? 'أفضل الداعمين هذا الشهر — عبر creators.sa' : 'Top supporters this month — via creators.sa'}</p>
                    </div>
                    <div className="cl-pills">
                        <span className="cl-pill" dir="ltr">{supporters ? `${supporters.length}` : '…'} {lang === 'ar' ? 'داعم' : 'supporters'}</span>
                        <span className="cl-pill mn">{lang === 'ar' ? 'هذا الشهر' : 'MONTHLY'}</span>
                    </div>
                </div>
                <div className="relative px-3 md:px-6 pb-6 z-10">
                    {!supporters && Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="cl-row" style={{ '--i': i } as React.CSSProperties}>
                            <span className="cl-rk">0{i + 1}</span>
                            <span className="w-[44px] h-[44px] rounded-full bg-white/[0.04] animate-pulse shrink-0" />
                            <div className="cl-nm"><span className="block h-3 w-24 rounded bg-white/[0.06] animate-pulse" /></div>
                            <span className="cl-st"><span className="h w-14 animate-pulse" /></span>
                        </div>
                    ))}
                    {supporters && supporters.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center relative">
                            <div className="w-16 h-16 rounded-2xl bg-[#9CC5FF]/[0.12] border border-[#9CC5FF]/35 grid place-items-center text-2xl text-[#9CC5FF] mb-4 shadow-[0_0_34px_rgba(77,141,255,0.4)]">♥</div>
                            <p className="text-white/85 font-black text-sm">{lang === 'ar' ? 'كن أول داعم هذا الشهر' : 'Be the first supporter this month'}</p>
                            <p className="text-[#7FB2FF] font-bold text-[12px] mt-1.5">{lang === 'ar' ? 'اسمك يظهر هنا مباشرة بعد أول تيب — عبر creators.sa' : 'Your name appears here right after your first tip — via creators.sa'}</p>
                        </div>
                    )}
                    {supporters && supporters.length > 0 && (
                        <>
                            {/* podium — top 3 of the month */}
                            <div className="cl-pod">
                                {supporters[1] && (
                                    <div key={supporters[1].name} className="cl-pi cl-p2 animate-fade-in-up transition-transform duration-500 hover:-translate-y-1.5" style={{ animationDelay: '90ms' }} dir="ltr">
                                        <span className="cl-av" style={{ '--h': hueOf(supporters[1].name) } as React.CSSProperties}>
                                            {supporters[1].name.charAt(0).toUpperCase()}
                                        </span>
                                        <b dir="auto">{supporters[1].name}</b>
                                        <small dir="ltr">{supporters[1].amount.toLocaleString('en-US')} SAR</small>
                                        <em dir={lang === 'ar' ? 'rtl' : 'ltr'}>{lang === 'ar' ? 'داعم هذا الشهر' : 'monthly supporter'}</em>
                                        <div className="cl-base">2</div>
                                    </div>
                                )}
                                {supporters[0] && (
                                    <div key={supporters[0].name} className="cl-pi cl-p1 animate-fade-in-up transition-transform duration-500 hover:-translate-y-1.5">
                                        <div className="cl-crown">👑</div>
                                        <span className="cl-av" style={{ '--h': hueOf(supporters[0].name) } as React.CSSProperties}>
                                            {supporters[0].name.charAt(0).toUpperCase()}
                                        </span>
                                        <b dir="auto">{supporters[0].name}</b>
                                        <small dir="ltr">{supporters[0].amount.toLocaleString('en-US')} SAR</small>
                                        <em dir={lang === 'ar' ? 'rtl' : 'ltr'}>{lang === 'ar' ? 'داعم هذا الشهر' : 'monthly supporter'}</em>
                                        <div className="cl-base">1</div>
                                    </div>
                                )}
                                {supporters[2] && (
                                    <div key={supporters[2].name} className="cl-pi cl-p3 animate-fade-in-up transition-transform duration-500 hover:-translate-y-1.5" style={{ animationDelay: '180ms' }} dir="ltr">
                                        <span className="cl-av" style={{ '--h': hueOf(supporters[2].name) } as React.CSSProperties}>
                                            {supporters[2].name.charAt(0).toUpperCase()}
                                        </span>
                                        <b dir="auto">{supporters[2].name}</b>
                                        <small dir="ltr">{supporters[2].amount.toLocaleString('en-US')} SAR</small>
                                        <em dir={lang === 'ar' ? 'rtl' : 'ltr'}>{lang === 'ar' ? 'داعم هذا الشهر' : 'monthly supporter'}</em>
                                        <div className="cl-base">3</div>
                                    </div>
                                )}
                            </div>
                            {/* rows 4+ */}
                            {supporters.length > 3 && (
                                <div className="cl-list">
                                    {supporters.slice(3).map((s, i) => (
                                        <div key={s.name + i} className="cl-row" style={{ '--i': Math.min(i, 8), '--w': `${Math.max(6, Math.round((s.amount / maxAmt) * 100))}%`, '--h': hueOf(s.name) } as React.CSSProperties}>
                                            <span className="cl-rk" dir="ltr">{String(s.rank || i + 4).padStart(2, '0')}</span>
                                            <span className="cl-av">{s.name.charAt(0).toUpperCase()}</span>
                                            <div className="cl-nm min-w-0">
                                                <b className="truncate" dir="auto">{s.name}</b>
                                                <small>{lang === 'ar' ? 'داعم هذا الشهر' : 'monthly supporter'}</small>
                                            </div>
                                            <div className="cl-st" dir="ltr">
                                                <span className="h">{s.amount.toLocaleString('en-US')} SAR</span>
                                            </div>
                                            <div className="cl-bar"><i /></div>
                                        </div>
                                    ))}
                                    <div className="h-3"></div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <AlertTiers lang={lang} title={t.tiersTitle} note={lang === 'en' ? 'Donations are non-refundable • name appears live' : 'التبرعات غير قابلة للاسترداد • اسمك يظهر مباشرة على البث'} />
        </div>
    );
};

export default function App() {
    const [isHoveringProfile, setIsHoveringProfile] = useState(false);
    const [lang, setLang] = useState<Language>('ar');
    const [branding] = useState({ profileImage: DEFAULT_PROFILE_IMAGE, bannerImage: PC_BACKGROUND });

    const [socialStats, setSocialStats] = useState<Record<string, string>>({
        'KICK': '—', 'TikTok': '—',
        'X': '—', 'WhatsApp': '11K'
    });

    const [socials, setSocials] = useState<SocialLink[]>(() => buildDefaultSocials({
        'KICK': '—', 'TikTok': '—',
        'X': '—', 'WhatsApp': '11K'
    }));
    const [lastSession, setLastSession] = useState<any>(null);
    const [pastSessions, setPastSessions] = useState<any[]>([]);
    const [clips, setClips] = useState<any[]>([]);
    const [theater, setTheater] = useState<TheaterItem | null>(null);

    /* In-site theater — real Kick video file (main VOD source), clips play native HLS */
    const openVod = useCallback((v: any) => {
        if (!v) return;
        const uuid = v?.uuid || v?.video?.uuid || v?.id;
        const thumb = v?.thumbnail?.url || v?.thumbnail?.src || (typeof v?.thumbnail === 'string' ? v.thumbnail : '') || PC_BACKGROUND;
        const subOnly = v?.video?.status === 'subscriber_only' || v?.video?.is_private === true;
        setTheater({
            kind: 'vod', uuid,
            title: v?.session_title || v?.title || 'VOD',
            kickUrl: `https://kick.com/${CHANNEL_SLUG}/videos/${uuid}`,
            poster: thumb, subOnly,
            meta: v?.created_at ? String(v.created_at).slice(0, 10) : '',
        });
    }, []);
    const openClip = useCallback((c: any) => {
        if (!c) return;
        const hls = c?.clip_url || c?.video_url;
        if (!hls) { window.open(`https://kick.com/${CHANNEL_SLUG}/clips/${c?.id}`, '_blank'); return; }
        setTheater({
            kind: 'clip',
            title: c?.title || 'Clip',
            hls,
            kickUrl: `https://kick.com/${CHANNEL_SLUG}/clips/${c?.id}`,
            poster: c?.thumbnail_url || c?.thumbnail?.url,
            meta: `${Number(c?.view_count || c?.views || 0).toLocaleString('en-US')} views`,
        });
    }, []);

    // Live social counters — dedicated 5-minute loop + instant cache paint (API-style)
    useEffect(() => {
        const apply = (stats: { tiktok?: number; twitter?: number }) => {
            setSocialStats(prev => ({
                ...prev,
                'TikTok': formatFollowerCount(stats.tiktok || 0),
                'X': formatFollowerCount(stats.twitter || 0),
            }));
        };
        const cached = readSocialCache();
        if (cached) apply(cached);
        let dead = false;
        const refreshSocials = () => {
            getAllSocialMediaStats().then(stats => { if (!dead) apply(stats); }).catch(() => {});
        };
        refreshSocials();
        const socialInterval = setInterval(refreshSocials, SOCIAL_TTL_MS);
        return () => { dead = true; clearInterval(socialInterval); };
    }, []);

    useEffect(() => {
        setSocials(buildDefaultSocials(socialStats));
    }, [socialStats]);

    const [streamInfo, setStreamInfo] = useState({ isLive: false, viewers: 0, title: '', category: '', tags: [] as string[] });
    const t = TRANSLATIONS[lang];

    const fetchKickStatus = useCallback(async () => {
        try {
            const data = await kickFetch(`https://kick.com/api/v2/channels/${CHANNEL_SLUG}`, true);
            if (data) {
                const livestreamData = data.livestream || data.live_stream;
                const isLive = livestreamData && (livestreamData.is_live === true || livestreamData.is_live === 1);
                if (isLive) {
                    setStreamInfo({
                        isLive: true,
                        viewers: livestreamData.viewer_count || 0,
                        title: livestreamData.session_title || livestreamData.title || 'Live Stream',
                        category: livestreamData.categories?.[0]?.name || 'Just Chatting',
                        tags: livestreamData.tags ? livestreamData.tags.map((tg: any) => tg.name || tg) : []
                    });
                } else setStreamInfo(prev => ({ ...prev, isLive: false }));
                if (data.followers_count !== undefined) {
                    const count = data.followers_count;
                    setSocialStats(prev => ({ ...prev, 'KICK': count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count.toString() }));
                }
                const videosRawDataPromise = kickFetch(`https://kick.com/api/v2/channels/${CHANNEL_SLUG}/videos`, true);
                const clipsRawDataPromise = kickFetch(`https://kick.com/api/v2/channels/${CHANNEL_SLUG}/clips?limit=5`, true);
                const [videosRawData, clipsRawData] = await Promise.all([videosRawDataPromise, clipsRawDataPromise]);
                const videosArray = videosRawData?.videos || (Array.isArray(videosRawData) ? videosRawData : []);
                if (videosArray?.length > 0) { setLastSession(videosArray[0]); setPastSessions(videosArray.slice(1, 4)); }
                else {
                    const streams = data.previous_livestreams || data.recent_streams || [];
                    if (streams?.length > 0) { setLastSession(streams[0]); setPastSessions(streams.slice(1, 4)); }
                }
                const clipsData = clipsRawData?.data || clipsRawData;
                const clipsArray = clipsData?.clips || (Array.isArray(clipsData) ? clipsData : (clipsData?.data && Array.isArray(clipsData.data) ? clipsData.data : []));
                setClips((clipsArray || []).slice(0, 3));
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchKickStatus();
        const kickInterval = setInterval(fetchKickStatus, 60000);
        return () => clearInterval(kickInterval);
    }, [fetchKickStatus]);

    const handleShare = async () => {
        const shareUrl = "https://kick.com/mdra9";
        if (navigator.share) { try { await navigator.share({ title: t.shareTitle, text: t.shareText, url: shareUrl }); } catch { /* dismissed */ } }
        else { try { await navigator.clipboard.writeText(shareUrl); } catch { /* clipboard blocked */ } alert(t.copied); }
    };

    const displayTitle = streamInfo.isLive ? streamInfo.title : t.defaultStreamTitle;
    const displayCategory = streamInfo.isLive ? streamInfo.category : t.defaultCategory;
    const kickCard = socials.find(s => s.name === 'KICK');
    const restSocials = socials.filter(s => s.name !== 'KICK');

    useEffect(() => {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }, [lang]);

    /* deep links — smooth-land on the requested section if it exists */
    useEffect(() => {
        const land = () => {
            const h = window.location.hash;
            if (h && h.startsWith('#')) {
                const id = h.slice(1);
                window.setTimeout(() => {
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 120);
            }
        };
        land();
        window.addEventListener('hashchange', land);
        return () => window.removeEventListener('hashchange', land);
    }, []);

    return (
        <div className={`grain relative min-h-screen w-full overflow-x-hidden ${lang === 'ar' ? 'font-arabic' : 'font-sans'}`}>
                <>
                    <ArenaBackground />
                    <div className="relative z-20">
                        <SiteHeader
                            lang={lang}
                            onToggleLang={() => setLang(p => p === 'en' ? 'ar' : 'en')}
                            profileImage={branding.profileImage}
                            headerTitle={t.headerTitle}
                            isLive={streamInfo.isLive}
                            viewers={streamInfo.viewers}
                            statusText={streamInfo.isLive ? t.status : t.statusOffline}
                            onRefresh={() => fetchKickStatus()}
                        />
                    </div>
                    <div className="relative z-10 w-full max-w-[1200px] mx-auto px-3 sm:px-4 md:px-8 pb-10 overflow-clip">

                        {/* ===== HERO — ascension in the storm void ===== */}
                        <section id="top" className="relative pt-4 md:pt-20 pb-8 md:pb-12 overflow-clip">
                            <div className="relative mx-auto w-full max-w-3xl text-center">
                                {/* emblem seal */}
                                <div className="animate-fade-in relative mx-auto w-fit" onMouseEnter={() => setIsHoveringProfile(true)} onMouseLeave={() => setIsHoveringProfile(false)}>
                                    <span className="halo-conic -inset-3" aria-hidden="true" />
                                    <span className="profile-3d-ring-inner" aria-hidden="true" />
                                    <span className="relative block w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-[#D6E9FF]/70 shadow-[0_0_60px_rgba(77,141,255,0.5)] bg-black">
                                        <img src={branding.profileImage} alt="MADARA official emblem" className={`w-full h-full object-cover transition-transform duration-700 ${isHoveringProfile ? 'scale-110' : ''}`} loading="eager" />
                                    </span>
                                    <span className={`absolute -bottom-1 -end-1 flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-[0.18em] ${streamInfo.isLive ? 'border-[#9CC5FF]/60 bg-black/85 text-[#9CC5FF]' : 'border-[#4D8DFF]/60 bg-black/85 text-[#7FB2FF]'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${streamInfo.isLive ? 'bg-[#9CC5FF] animate-pulse' : 'bg-[#4D8DFF] animate-pulse'}`} />
                                        {streamInfo.isLive ? 'LIVE' : 'MADARA'}
                                    </span>
                                </div>

                                <div className="animate-fade-in-up mt-6" style={{ animationDelay: '100ms' }}>
                                    <span className="eyebrow-chip">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${streamInfo.isLive ? 'bg-[#9CC5FF] animate-pulse shadow-[0_0_10px_#9CC5FF]' : 'bg-[#4D8DFF] animate-pulse shadow-[0_0_10px_#4D8DFF]'}`} />
                                        {t.eyebrow}
                                    </span>
                                </div>

                                {/* giant backdrop word */}
                                <p className="font-gaming text-stroke-ice pointer-events-none select-none absolute inset-x-0 top-[6%] md:top-2 text-[23vw] md:text-[190px] leading-none opacity-20 md:opacity-30" dir="ltr" aria-hidden="true">MADARA</p>

                                <h1 className="animate-fade-in-up relative font-heading font-black text-white leading-[1.05] tracking-tight text-[clamp(2.8rem,9vw,5.2rem)] mt-3" style={{ animationDelay: '180ms' }}>
                                    <span dir="ltr" className="hero-mdra9 inline-block drop-shadow-[0_10px_35px_rgba(77,141,255,0.45)]">
                                        MADARA
                                    </span>
                                </h1>
                                <div className="flex justify-center mt-3" aria-hidden="true">
                                    <span className="xt-line">
                                        <span className="xt-line-dot" />
                                    </span>
                                </div>
                                <p className="animate-fade-in-up text-white/70 text-[15px] md:text-lg leading-relaxed max-w-2xl mt-6 md:mt-7 font-medium mx-auto" style={{ animationDelay: '300ms' }}>{t.bio}</p>

                                <div className="animate-fade-in-up flex flex-wrap justify-center gap-2 sm:gap-2.5 mt-5" style={{ animationDelay: '360ms' }}>
                                    {t.tags.map((tag, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#9CC5FF]/35 bg-black/50 backdrop-blur text-[11px] sm:text-xs font-bold text-[#D6E9FF]">
                                            <span className="w-1 h-1 rotate-45 bg-[#9CC5FF]" aria-hidden="true" />#{tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="animate-fade-in-up flex flex-col sm:flex-row justify-center gap-2.5 sm:gap-3 mt-7" style={{ animationDelay: '420ms' }}>
                                    <a href="https://kick.com/mdra9" target="_blank" rel="noopener noreferrer"
                                        className="btn-arena btn-watch inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-2xl font-black text-[15px] md:text-base active:scale-[0.98]">
                                        <span className="play-badge shrink-0">
                                            <svg className="w-4 h-4 fill-current translate-x-[1px]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </span>
                                        <span className="watch-label">{t.watchLive}</span>
                                        {streamInfo.isLive && streamInfo.viewers > 0 && <span className="rounded-lg bg-[#9CC5FF]/15 border border-[#9CC5FF]/30 px-2 py-0.5 text-xs font-black text-[#D6E9FF]" dir="ltr">{streamInfo.viewers.toLocaleString()}</span>}
                                    </a>
                                    <a href="https://x.com/vmadara9" target="_blank" rel="noopener noreferrer"
                                        className="btn-arena btn-x inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-[15px] md:text-base active:scale-[0.98]">
                                        <XIcon className="w-5 h-5 shrink-0" />
                                        {t.followX}
                                    </a>
                                    <a href="https://www.whatsapp.com/channel/0029Vajy8hQ2ZjCs85K37d3y" target="_blank" rel="noopener noreferrer"
                                        className="btn-arena btn-wa inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-[15px] md:text-base active:scale-[0.98]">
                                        <WhatsAppIcon className="w-5 h-5 shrink-0" />
                                        {lang === 'en' ? 'WhatsApp 11K' : 'قناة الواتساب 11K'}
                                    </a>
                                </div>

                                {/* stat band */}
                                <div className="animate-fade-in-up citadel-frame rounded-3xl mt-8 md:mt-10 overflow-hidden" style={{ animationDelay: '500ms' }}>
                                    {streamInfo.isLive && <div className="h-[3px] bg-gradient-to-l from-[#4D8DFF] via-[#9CC5FF]/40 to-transparent" />}
                                    <div className="grid grid-cols-2 divide-x divide-x-reverse divide-[#9CC5FF]/15">
                                        {[
                                            { v: socialStats['KICK'] || '—', l: t.statsKick },
                                            { v: '4', l: t.statsPlatforms },
                                        ].map((s, i) => (
                                            <div key={i} className="px-2 sm:px-4 py-4 sm:py-5 text-center min-w-0">
                                                <p className="font-heading text-xl sm:text-2xl md:text-3xl font-black text-white truncate" dir="ltr">{s.v}</p>
                                                <p className="text-[9px] md:text-[10px] font-bold text-[#7FB2FF]/60 uppercase tracking-[0.2em] mt-1.5 truncate">{s.l}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <Marquee lang={lang} />

                        {/* ===== SOCIALS BENTO ===== */}
                        <section id="socials" className="pt-12 md:pt-16 scroll-mt-28">
                            <Reveal><SectionHeading no="01" title={t.socialsTitle} sub={t.socialsSub} en="SOCIAL ARENA" /></Reveal>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                {kickCard && (
                                    <Reveal delay={0} className="sm:col-span-2">
                                        <SocialCard social={kickCard} index={0} featured lang={lang} />
                                    </Reveal>
                                )}
                                {restSocials.map((s, i) => (
                                    <Reveal key={s.name} delay={Math.min(i * 60, 300)}>
                                        <SocialCard social={s} index={i + 1} lang={lang} />
                                    </Reveal>
                                ))}
                            </div>
                        </section>

                        {/* ===== LIVE THEATER ===== */}
                        {streamInfo.isLive && (
                            <section id="live" className="pt-12 md:pt-16 scroll-mt-28 animate-slide-down">
                                <Reveal><SectionHeading no="02" title={t.theaterTitle} sub={`${streamInfo.viewers.toLocaleString()} ${t.viewers}`} en="LIVE THEATER" /></Reveal>
                                <div className="relative rounded-[28px] p-[1px] bg-gradient-to-b from-[#9CC5FF]/60 via-white/10 to-transparent shadow-[0_30px_90px_rgba(77,141,255,0.18)]">
                                    <div className="rounded-[27px] bg-[#080808] overflow-hidden">
                                    <div className="flex items-center gap-2.5 px-4 md:px-6 py-3 border-b border-white/[0.07] bg-black/60">
                                        <span className="flex gap-1.5" aria-hidden="true">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#9CC5FF]/80" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.24em] text-[#9CC5FF]" dir="ltr">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#9CC5FF] animate-pulse" />LIVE
                                        </span>
                                        <span className="ms-auto text-[11px] font-black text-white/45" dir="ltr">{streamInfo.viewers.toLocaleString()} {t.viewers}</span>
                                    </div>
                                    <div className="flex flex-col xl:flex-row gap-0">
                                        <div className="flex-1 min-w-0 min-h-0 p-3 md:p-4">
                                            <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-[#9CC5FF]/20">
                                                <StreamPlayer lang={lang} isLive={streamInfo.isLive} viewers={streamInfo.viewers} channelSlug={CHANNEL_SLUG} poster={branding.bannerImage} />
                                            </div>
                                            <div className="p-4 md:p-5 flex flex-col gap-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-lg md:text-2xl font-black text-white truncate" title={displayTitle}>{displayTitle}</h3>
                                                        <p className="text-sm text-white/50 font-bold mt-1"><span className="ice-text font-black" dir="ltr">MADARA</span> <span className="text-white/25 mx-1">•</span> {displayCategory}</p>
                                                    </div>
                                                    <button onClick={handleShare} aria-label="Share"
                                                        className="btn-arena w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 hover:text-white flex items-center justify-center shrink-0">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.07]">
                                                    <span className="px-2.5 py-1 rounded-lg bg-[#9CC5FF]/10 border border-[#9CC5FF]/30 text-[#9CC5FF] text-[10px] font-black uppercase tracking-wider animate-tick">{t.dropsEnabled}</span>
                                                    {streamInfo.tags.length > 0
                                                        ? streamInfo.tags.map((tag, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-white/[0.05] text-white/55 text-[11px] font-bold">#{tag}</span>)
                                                        : <span className="text-white/30 text-xs italic">{t.noTags}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full xl:w-[360px] shrink-0 min-w-0 p-3 md:p-4 xl:ps-0">
                                            <div className="h-[480px] xl:h-[620px] xl:max-h-[78vh] rounded-2xl overflow-hidden border border-white/10 min-h-0 bg-[#0a0e1a]">
                                                {/* Kick's own live chat — official popout embed (site chat had glitches) */}
                                                <iframe
                                                    src="https://kick.com/popout/mdra9/chat"
                                                    title={lang === 'ar' ? 'شات كيك المباشر' : 'Kick Live Chat'}
                                                    className="w-full h-full"
                                                    style={{ border: 0, display: 'block' }}
                                                    allow="autoplay; fullscreen"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ===== COMMUNITY ===== */}
                        <section id="community" className="pt-12 md:pt-16 scroll-mt-28">
                            <Reveal><SectionHeading no="03" title={t.communityTitle} en="COMMUNITY HQ" /></Reveal>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                                <Reveal delay={0}><Suspense fallback={<div className="w-full h-40 rounded-[26px] border border-white/10 bg-white/[0.02] animate-pulse" />}><XWidget lang={lang} /></Suspense></Reveal>
                                <Reveal delay={100}><Suspense fallback={<div className="w-full h-40 rounded-[26px] border border-white/10 bg-white/[0.02] animate-pulse" />}><YoutubeWidget lang={lang} /></Suspense></Reveal>
                            </div>
                        </section>

                        {/* ===== SUPPORT ===== */}
                        <section id="support" className="pt-12 md:pt-16 scroll-mt-28">
                            <Reveal><SectionHeading no="04" title={t.supportTitle} sub={t.supportSub} en="SUPPORT" /></Reveal>
                            <Reveal delay={80}><SupportArena lang={lang} /></Reveal>
                        </section>

                        {/* ===== MODERATORS (above Hall of Fame) ===== */}
                        <section id="moderators" className="pt-12 md:pt-16 scroll-mt-28">
                            <Reveal><SectionHeading no="05" title={t.modsTitle} sub={t.modsSub} en="MODERATORS" /></Reveal>
                            <Reveal delay={80}><Suspense fallback={<div className="w-full h-64 rounded-[26px] border border-white/10 bg-white/[0.02] animate-pulse" />}><ModeratorsSection lang={lang} /></Suspense></Reveal>
                        </section>

                        {/* ===== HONOR (gifters + last session when offline + chat legends) ===== */}
                        <section id="honor" className="pt-12 md:pt-16 scroll-mt-28">
                            <Reveal><SectionHeading no="06" title={t.honorTitle} sub={t.honorSub} en="HALL OF FAME" /></Reveal>
                            <Reveal delay={80}><Suspense fallback={<div className="w-full h-40 rounded-[26px] border border-white/10 bg-white/[0.02] animate-pulse" />}><HonorSection lang={lang} report={!streamInfo.isLive ? (<div id="live" className="scroll-mt-28"><LastSessionReport lang={lang} data={lastSession} clips={clips} past={pastSessions} onPlayVod={openVod} onPlayClip={openClip} /></div>) : null} /></Suspense></Reveal>
                        </section>

                        {/* ===== ARCHIVE ===== */}
                        <section id="archive" className="pt-12 md:pt-16 scroll-mt-28">
                            <Reveal><SectionHeading no="07" title={t.archiveTitle} sub={t.archiveSub} en="ARCHIVE" /></Reveal>
                            <Reveal delay={80}><Suspense fallback={<div className="w-full h-40 rounded-[26px] border border-white/10 bg-white/[0.02] animate-pulse" />}><ArchiveSection lang={lang} onPlayVod={openVod} onPlayClip={openClip} /></Suspense></Reveal>
                        </section>

                        {/* ===== FOOTER ===== */}
                        <footer className="mt-16 md:mt-24 rounded-[28px] border border-white/10 bg-black/60 backdrop-blur-xl overflow-hidden relative">
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-l from-transparent via-[#4D8DFF]/70 to-transparent" />
                            <div className="p-8 md:p-12 text-center relative">
                                <p className="font-gaming text-[18vw] md:text-[120px] leading-none text-stroke opacity-40 select-none" dir="ltr" aria-hidden="true">MADARA</p>
                                <div className="flex flex-wrap justify-center gap-2.5 -mt-4 md:-mt-8 relative">
                                    {socials.slice(0, 5).map(s => (
                                        <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name}
                                            className="btn-arena w-11 h-11 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-[#9CC5FF]/50">
                                            <span className="scale-[0.8] block">{s.icon}</span>
                                        </a>
                                    ))}
                                </div>
                                <p className="text-[11px] font-black tracking-[0.3em] text-white/50 mt-6 uppercase">{t.poweredBy}</p>
                                <p className="text-[11px] text-white/35 mt-1">{t.footer}</p>
                                {/* HSG credit — bottom of the footer, styled pill */}
                                <div className="mt-8 md:mt-9 flex flex-col items-center gap-3 relative">
                                    <p className="text-[10.5px] font-black tracking-[0.22em] text-white/40">
                                        {lang === 'en' ? <>Powered by <span className="text-white/75">HSG</span></> : <>بدعم من <span className="text-white/75">HSG</span></>}
                                    </p>
                                    <a href="https://mohhsg.vercel.app/" target="_blank" rel="noopener noreferrer"
                                        title="HSG — mohhsg.vercel.app"
                                        className="group/hsg inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] backdrop-blur px-4 py-2.5 transition-all duration-300 hover:border-white/40 hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-14px_rgba(0,0,0,0.9)] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.85)]">
                                        <span className="w-7 h-7 rounded-full overflow-hidden grid place-items-center bg-[#0b0b0b] ring-1 ring-white/25 shadow-[0_2px_10px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover/hsg:rotate-12" aria-hidden="true">
                                            <img src="/hsg-icon-touch.png" alt="HSG" className="w-5 h-5 object-cover" loading="eager" />
                                        </span>
                                        <span className="text-[12px] font-black text-white/85">{lang === 'en' ? 'Want a site of your own?' : 'تبي موقع خاص بك؟'}</span>
                                        <span className="text-white/25 font-black">·</span>
                                        <span className="text-[12px] font-black text-white/70 group-hover/hsg:text-white transition-colors">{lang === 'en' ? 'Request yours' : 'اطلب موقعك'}</span>
                                    </a>
                                </div>
                            </div>
                        </footer>
                    </div>
                    {theater && (
                        <Suspense fallback={null}>
                            <VodTheater lang={lang} item={theater} onClose={() => setTheater(null)} />
                        </Suspense>
                    )}
                </>
        </div>
    );
}
