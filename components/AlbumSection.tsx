import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../types';

/* ============================================================
   ALBUM — final section of the MADARA hub.
   17 photos stacked as a 3D deck, switchable with arrows,
   swipe, filmstrip, keyboard, autoplay and a full lightbox.
   ============================================================ */

const PHOTOS = Array.from({ length: 17 }, (_, i) => ({
    src: `/album/${String(i + 1).padStart(2, '0')}.jpg`,
    n: i + 1,
}));

/* ---------- EDITABLE COPY — replace the text here when the final version arrives ---------- */
const IDENTITY = {
    ar: {
        kicker: 'شخصية مدارا',
        name: 'مدارا',
        latin: 'MADARA',
        short: 'عسكري مثابر قديم في مدينة مستري تاون، صعد حتى رئاسة الشرطة.',
        date: '05 / 05 / 2024',
        chips: ['مستري تاون', 'رئيس شرطة', 'بار ساندي', 'SSF'],
    },
    en: {
        kicker: 'The character of MADARA',
        name: 'MADARA',
        latin: 'MADARA',
        short: 'A veteran officer from Mistri Town who rose to police chief.',
        date: '05 / 05 / 2024',
        chips: ['Mistri Town', 'Police chief', 'Bar Sandy', 'SSF'],
    },
} as const;

const AUTOPLAY_MS = 5200;

const wrapDelta = (d: number, n: number) => {
    const half = Math.floor(n / 2);
    let x = d;
    if (x > half) x -= n;
    if (x < -half) x += n;
    return x;
};

const pad = (n: number) => String(n).padStart(2, '0');

export const AlbumSection: React.FC<{ lang: Language }> = ({ lang }) => {
    const isAr = lang === 'ar';
    const copy = isAr ? IDENTITY.ar : IDENTITY.en;
    const dir = isAr ? -1 : 1;

    const total = PHOTOS.length;
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const [box, setBox] = useState(false);
    const stripRef = useRef<HTMLDivElement | null>(null);
    const touchX = useRef<number | null>(null);

    const go = useCallback((step: number) => {
        setActive((p) => (p + step + total) % total);
    }, [total]);

    /* autoplay — pauses on hover, focus, touch or when the lightbox is open */
    useEffect(() => {
        if (paused || box) return;
        const id = window.setTimeout(() => go(1), AUTOPLAY_MS);
        return () => window.clearTimeout(id);
    }, [active, paused, box, go]);

    /* keep the active filmstrip chip in view — scrolls the STRIP only,
       never the page (scrollIntoView would yank the whole site down) */
    useEffect(() => {
        const strip = stripRef.current;
        const el = strip?.querySelector<HTMLElement>(`[data-i="${active}"]`);
        if (strip && el) {
            strip.scrollTo({
                left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2,
                behavior: 'smooth',
            });
        }
    }, [active]);

    /* lightbox: lock scroll + keyboard */
    useEffect(() => {
        if (!box) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setBox(false);
            if (e.key === 'ArrowRight') go(isAr ? -1 : 1);
            if (e.key === 'ArrowLeft') go(isAr ? 1 : -1);
        };
        document.addEventListener('keydown', onKey);
        return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
    }, [box, go, isAr]);

    const prev = () => go(isAr ? 1 : -1);
    const next = () => go(isAr ? -1 : 1);

    /* ---------- deck ---------- */
    const deck = PHOTOS.map((p, i) => {
        const d = wrapDelta(i - active, total);
        const ad = Math.abs(d);
        if (ad > 2) return null;

        const x = d * 54 * dir;
        const y = ad * 12;
        const rot = d * 4.5 * dir;
        const sc = 1 - ad * 0.06;
        const op = d === 0 ? 1 : Math.max(0.2, 0.66 - (ad - 1) * 0.24);
        const filt = d === 0 ? 'brightness(1) saturate(1.05)' : `brightness(${1 - ad * 0.4}) saturate(.75) blur(${ad === 1 ? 1 : 2.4}px)`;

        return (
            <div
                key={p.src}
                className="absolute inset-0 select-none"
                style={{
                    transform: `translate3d(${x}%, ${y}px, 0) rotate(${rot}deg) scale(${sc})`,
                    opacity: op,
                    filter: filt,
                    zIndex: 50 - ad,
                    transition: 'transform .78s cubic-bezier(.16,1,.3,1), opacity .6s ease, filter .6s ease',
                    willChange: 'transform',
                    pointerEvents: d === 0 ? 'auto' : 'none',
                }}
            >
                {d === 0 ? (
                    /* uniform frame — every photo uses the same box, so the deck
                       never changes size and the art is letterboxed, never cropped */
                    <div
                        className="relative h-full w-full rounded-[22px] p-[1.5px]"
                        style={{ background: 'linear-gradient(160deg,#D6E9FF 0%,rgba(77,141,255,.35) 42%,#9CC5FF 100%)', boxShadow: '0 0 70px -12px rgba(77,141,255,.65)' }}
                    >
                        <div className="relative h-full w-full overflow-hidden rounded-[20.5px] border border-white/10 bg-[#05060B]">
                            {/* blurred copy fills the letterbox bars */}
                            <img
                                src={p.src}
                                alt=""
                                aria-hidden="true"
                                loading={p.n <= 3 ? 'eager' : 'lazy'}
                                decoding="async"
                                className="absolute inset-0 h-full w-full object-cover scale-125 blur-2xl opacity-40 saturate-125"
                            />
                            {/* full art, always whole */}
                            <img
                                src={p.src}
                                alt={`${copy.name} — ${isAr ? 'صورة' : 'photo'} ${pad(p.n)}`}
                                loading={p.n <= 3 ? 'eager' : 'lazy'}
                                decoding="async"
                                className="relative h-full w-full object-contain"
                                onClick={() => setBox(true)}
                            />
                            <span className="alb-sheen pointer-events-none absolute inset-0" aria-hidden="true" />
                            <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.07]" aria-hidden="true" />
                            <span className="absolute bottom-3 start-3 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-[10px] font-black text-white/85 backdrop-blur border border-white/15">
                                <span className="h-1.5 w-1.5 rotate-45 bg-[#9CC5FF]" aria-hidden="true" />
                                <span dir="ltr">{pad(p.n)} / {pad(total)}</span>
                            </span>
                            <span className="pointer-events-none absolute inset-0 cursor-zoom-in" onClick={() => setBox(true)} aria-hidden="true" />
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full overflow-hidden rounded-[20px] border border-white/10 bg-[#05060B]">
                        <img src={p.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    </div>
                )}
            </div>
        );
    });

    return (
        <div className="w-full">
            <style>{`
            .alb-shell{position:relative;border-radius:32px;padding:1px;min-width:0;overflow:hidden;
                background:linear-gradient(150deg,rgba(77,141,255,.5),rgba(77,141,255,.22) 45%,rgba(77,141,255,.5));
                box-shadow:0 40px 90px -30px rgba(0,0,0,.9)}
            .alb-shell-in{position:relative;border-radius:31px;overflow:hidden;
                background:linear-gradient(180deg,rgba(9,36,28,.92),rgba(3,11,8,.96))}
            .alb-aura{position:absolute;inset:0;pointer-events:none;
                background:radial-gradient(520px 220px at 82% -10%,rgba(77,141,255,.18),transparent 70%),
                           radial-gradient(420px 200px at 8% 108%,rgba(77,141,255,.14),transparent 70%);
                animation:alb-drift 16s ease-in-out infinite alternate}
            @keyframes alb-drift{from{transform:translate3d(-2%,0,0) scale(1)}to{transform:translate3d(2%,1.5%,0) scale(1.06)}}
            /* tall enough that portrait and wide art both breathe inside it */
            .alb-stage{position:relative;aspect-ratio:1/1;perspective:1600px;transform-style:preserve-3d}
            @media(min-width:768px){.alb-stage{aspect-ratio:5/4}}
            @media(min-width:1280px){.alb-stage{aspect-ratio:4/3}}
            .alb-reflect{position:absolute;left:8%;right:8%;bottom:-14px;height:70px;border-radius:50%;pointer-events:none;
                background:radial-gradient(closest-side,rgba(77,141,255,.30),transparent 78%);filter:blur(10px)}
            .alb-sheen{position:absolute;inset:0;mix-blend-mode:screen;opacity:.5;
                background:linear-gradient(115deg,transparent 32%,rgba(255,255,255,.22) 46%,transparent 60%);
                transform:translateX(-120%);animation:alb-sweep 6.5s ease-in-out infinite}
            @keyframes alb-sweep{0%,72%{transform:translateX(-120%)}88%,100%{transform:translateX(120%)}}
            .alb-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;
                border-radius:99px;cursor:pointer;color:#D6E9FF;flex:none;
                background:rgba(77,141,255,.07);border:1px solid rgba(77,141,255,.28);
                box-shadow:inset 0 1px 0 rgba(255,255,255,.08);transition:all .35s cubic-bezier(.16,1,.3,1)}
            .alb-btn:hover{color:#05060B;border-color:transparent;transform:translateY(-2px) scale(1.05);
                background:linear-gradient(180deg,#D6E9FF,#4D8DFF 55%,#0B1B33);
                box-shadow:0 16px 34px -12px rgba(77,141,255,.8)}
            .alb-btn:active{transform:scale(.94)}
            .alb-btn:disabled{opacity:.35;cursor:not-allowed}
            .alb-track{position:relative;height:4px;border-radius:99px;background:rgba(255,255,255,.07);overflow:hidden}
            .alb-fill{position:absolute;inset-block:0;inset-inline-start:0;border-radius:99px;
                background:linear-gradient(90deg,#9CC5FF,#D6E9FF 45%,#4D8DFF);
                box-shadow:0 0 14px rgba(77,141,255,.7);transition:width .6s cubic-bezier(.16,1,.3,1)}
            .alb-auto{position:absolute;inset-block:0;inset-inline-start:0;border-radius:99px;
                background:linear-gradient(90deg,rgba(255,255,255,.55),rgba(167,243,208,.75));
                animation:alb-prog 5.2s linear forwards}
            @keyframes alb-prog{from{width:0%}to{width:100%}}
            .alb-strip{max-width:100%;overflow-x:auto;overflow-y:hidden}
            .alb-chip{position:relative;flex:none;width:64px;height:46px;border-radius:13px;overflow:hidden;cursor:pointer;
                border:1px solid rgba(255,255,255,.1);background:#05060B;padding:0;
                transition:transform .45s cubic-bezier(.16,1,.3,1),border-color .35s ease,box-shadow .35s ease,opacity .35s ease;opacity:.5}
            .alb-chip img{width:100%;height:100%;object-fit:cover;display:block}
            .alb-chip:hover{opacity:.9;transform:translateY(-3px)}
            .alb-chip.is-active{opacity:1;transform:translateY(-4px) scale(1.06);border-color:transparent;
                box-shadow:0 0 0 2px #4D8DFF,0 14px 30px -10px rgba(77,141,255,.75)}
            .alb-chip:focus-visible{outline:2px solid #D6E9FF;outline-offset:3px}
            .alb-id-name{position:relative;display:inline-block;
                background:linear-gradient(165deg,#FFFFFF 0%,#EAF4FF 34%,#D6E9FF 78%,#5B8FE8 100%);
                -webkit-background-clip:text;background-clip:text;color:transparent;
                filter:drop-shadow(0 6px 30px rgba(77,141,255,.35))}
            [dir="rtl"] .alb-id-name{letter-spacing:0!important}
            .alb-rule{position:relative;height:2px;border-radius:99px;
                background:linear-gradient(90deg,rgba(77,141,255,.85),rgba(77,141,255,.55) 45%,transparent)}
            .alb-rule::before{content:"";position:absolute;inset-inline-start:0;top:50%;width:56px;height:2px;
                transform:translateY(-50%);border-radius:99px;
                background:linear-gradient(90deg,#D6E9FF,#9CC5FF);box-shadow:0 0 16px rgba(77,141,255,.75)}
            .alb-pill{padding:6px 13px;border-radius:99px;background:rgba(77,141,255,.1);border:1px solid rgba(77,141,255,.28)}
            /* primary cinematic CTA — emerald, glowing, with a shine sweep + rain shimmer */
            .alb-prime{background:linear-gradient(180deg,#D6E9FF 0%,#4D8DFF 52%,#0B1B33 100%);
                box-shadow:0 20px 44px -14px rgba(77,141,255,.85),inset 0 1px 0 rgba(255,255,255,.55),0 0 34px -10px rgba(77,141,255,.6)}
            .alb-prime:hover{box-shadow:0 26px 56px -14px rgba(77,141,255,.95),inset 0 1px 0 rgba(255,255,255,.55),0 0 44px -10px rgba(77,141,255,.75)}
            .alb-prime::after{content:"";position:absolute;top:-40%;bottom:-40%;width:34%;left:-75%;
                background:linear-gradient(105deg,transparent,rgba(255,255,255,.6),transparent);
                transform:skewX(-18deg);animation:alb-prime-shine 4.6s ease-in-out infinite}
            @keyframes alb-prime-shine{0%{left:-75%;opacity:0}14%{opacity:1}36%,100%{left:150%;opacity:0}}
            .alb-prime>*{position:relative;z-index:1}
            .alb-prime-ic{display:inline-flex;align-items:center;justify-content:center;flex:none;
                width:44px;height:44px;border-radius:999px;
                background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.08) 55%,rgba(4,18,13,.18));
                box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -2px 6px rgba(4,18,13,.25),0 0 0 1.5px rgba(4,18,13,.35),0 8px 20px -8px rgba(4,18,13,.6);
                animation:alb-ic-pulse 2.8s ease-in-out infinite;
                transition:transform .35s cubic-bezier(.16,1,.3,1)}
            @keyframes alb-ic-pulse{
                0%,100%{transform:scale(1)}
                50%{transform:scale(1.07)}}
            .alb-tag{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:99px;
                font-size:11px;font-weight:800;color:rgba(255,255,255,.68);
                background:rgba(77,141,255,.06);border:1px solid rgba(77,141,255,.18);transition:all .3s ease}
            .alb-tag:hover{color:#D6E9FF;border-color:rgba(77,141,255,.45);background:rgba(77,141,255,.1)}
            .alb-box{position:fixed;inset:0;z-index:130;display:flex;align-items:center;justify-content:center;padding:16px;
                background:rgba(2,9,7,.9);backdrop-filter:blur(18px) saturate(1.1);-webkit-backdrop-filter:blur(18px) saturate(1.1);
                animation:alb-fade .35s ease both}
            @keyframes alb-fade{from{opacity:0}to{opacity:1}}
            .alb-box-panel{position:relative;width:min(1080px,100%);animation:alb-zoom .5s cubic-bezier(.16,1,.3,1) both}
            @keyframes alb-zoom{from{opacity:0;transform:translateY(26px) scale(.94)}to{opacity:1;transform:none}}
            .alb-box-img{max-height:74vh;width:auto;max-width:100%;border-radius:22px;object-fit:contain;
                border:1px solid rgba(255,255,255,.14);box-shadow:0 50px 120px -30px rgba(0,0,0,.95)}
            .alb-x{position:absolute;top:-52px;inset-inline-end:0;width:42px;height:42px;border-radius:14px;cursor:pointer;
                display:inline-flex;align-items:center;justify-content:center;color:rgba(255,255,255,.75);
                background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);transition:all .3s ease}
            .alb-x:hover{color:#05060B;background:#D6E9FF;border-color:transparent;transform:rotate(90deg)}
            .alb-prime:hover .alb-prime-ic{transform:scale(1.12) rotate(-8deg)}
            @media(prefers-reduced-motion:reduce){.alb-aura,.alb-sheen,.alb-auto,.alb-prime::after,.alb-prime-ic{animation:none}.alb-stage>div{transition:none}}
            a:focus-visible,button:focus-visible{outline:2px solid #4D8DFF;outline-offset:3px;border-radius:12px}
            `}</style>

            {/* flexbox, not grid: a wide child (the filmstrip / the fanned deck) can never
                stretch a flex track, so the panel can never escape the container. */}
            <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-stretch lg:gap-7 xl:gap-9">

                {/* ================= DECK ================= */}
                <div className="alb-shell order-1 w-full lg:w-[46%] lg:max-w-[540px] lg:shrink-0">
                    <div className="alb-shell-in">
                        <span className="alb-aura" aria-hidden="true" />

                        {/* stage */}
                        <div
                            className="relative px-4 pt-5 pb-6 sm:px-6"
                            onMouseEnter={() => setPaused(true)}
                            onMouseLeave={() => setPaused(false)}
                            onFocus={() => setPaused(true)}
                            onBlur={() => setPaused(false)}
                            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; setPaused(true); }}
                            onTouchEnd={(e) => {
                                if (touchX.current !== null) {
                                    const dx = e.changedTouches[0].clientX - touchX.current;
                                    if (Math.abs(dx) > 45) (dx < 0 ? next : prev)();
                                }
                                touchX.current = null;
                                setPaused(false);
                            }}
                        >
                            {/* header row */}
                            <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
                                <span className="inline-flex items-center gap-2.5 text-[10px] font-black uppercase text-[#7FB2FF]/70">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#4D8DFF] animate-pulse shadow-[0_0_10px_#4D8DFF]" />
                                    <span dir="ltr">PHOTO DECK</span>
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-black/45 border border-white/10 px-3 py-1.5">
                                    <span className="text-[11px] font-black text-white" dir="ltr">{pad(active + 1)}</span>
                                    <span className="h-3 w-px bg-white/15" />
                                    <span className="text-[11px] font-black text-white/40" dir="ltr">{pad(total)}</span>
                                </span>
                            </div>

                            {/* overflow-hidden clips the fanned neighbours so the deck stays inside its panel */}
                            <div className="alb-stage overflow-hidden">{deck}</div>
                            <span className="alb-reflect" aria-hidden="true" />

                            {/* controls */}
                            <div className="relative z-10 mt-6 flex items-center gap-3 sm:gap-4">
                                <button type="button" className="alb-btn" onClick={prev} aria-label={isAr ? 'السابق' : 'Previous'}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M15 6l-6 6 6 6" />
                                    </svg>
                                </button>

                                <div className="flex-1 min-w-0">
                                    <div className="alb-track">
                                        <span className="alb-fill" style={{ width: `${((active + 1) / total) * 100}%` }} />
                                        {!paused && !box && (
                                            <span key={active} className="alb-auto" />
                                        )}
                                    </div>
                                    <div className="mt-2.5 flex items-center justify-between gap-3">
                                        <p className="text-[11px] font-bold text-white/40 truncate">
                                            {isAr ? 'اسحب أو استخدم الأسهم للتنقل' : 'Swipe or use the arrows to browse'}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setBox(true)}
                                            className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-white/60 hover:text-[#05060B] hover:bg-[#D6E9FF] hover:border-[#D6E9FF] transition-all duration-300"
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden="true">
                                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                            </svg>
                                            {isAr ? 'ملء الشاشة' : 'Fullscreen'}
                                        </button>
                                    </div>
                                </div>

                                <button type="button" className="alb-btn" onClick={next} aria-label={isAr ? 'التالي' : 'Next'}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M9 6l6 6-6 6" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* filmstrip */}
                        <div className="relative border-t border-white/[0.07] bg-black/35">
                            <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between gap-3">
                                <span className="text-[10px] font-black uppercase text-white/30">
                                    {isAr ? 'كل الصور' : 'All frames'}
                                </span>
                                <span className="text-[10px] font-black text-[#9CC5FF]/80" dir="ltr">{pad(total)}</span>
                            </div>
                            <div
                                ref={stripRef}
                                className="scrollbar-hide alb-strip flex gap-2 overflow-x-auto px-4 sm:px-6 pb-4"
                                dir="ltr"
                            >
                                {PHOTOS.map((p) => (
                                    <button
                                        key={p.src}
                                        type="button"
                                        data-i={p.n - 1}
                                        onClick={() => setActive(p.n - 1)}
                                        className={`alb-chip${active === p.n - 1 ? ' is-active' : ''}`}
                                        aria-label={`${isAr ? 'صورة' : 'Photo'} ${p.n}`}
                                        aria-current={active === p.n - 1 ? 'true' : undefined}
                                    >
                                        <img src={p.src} alt="" loading="lazy" decoding="async" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= IDENTITY ================= */}
                <aside className="order-2 w-full min-w-0 flex-1 flex flex-col justify-center">
                    <div className="relative h-full rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden">
                        <div
                            className="absolute -top-24 start-0 h-72 w-72 rounded-full blur-[100px] pointer-events-none"
                            style={{ background: 'radial-gradient(circle, rgba(77,141,255,.20), transparent 70%)' }}
                            aria-hidden="true"
                        />
                        <div
                            className="absolute -bottom-24 end-0 h-72 w-72 rounded-full blur-[100px] pointer-events-none"
                            style={{ background: 'radial-gradient(circle, rgba(77,141,255,.16), transparent 70%)' }}
                            aria-hidden="true"
                        />
                        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[#9CC5FF]/60 to-transparent" aria-hidden="true" />

                        <div className="relative p-6 sm:p-9 lg:p-10 xl:p-11">
                            {/* ---- primary dossier ---- */}
                            <div className="flex items-center gap-2.5 text-[10px] font-black uppercase text-white/35">
                                <span className="h-1.5 w-1.5 rotate-45 bg-[#9CC5FF]" aria-hidden="true" />
                                <span>{copy.kicker}</span>
                            </div>

                            <h3 className={`alb-id-name mt-4 text-[34px] leading-[1.05] font-black tracking-tight sm:text-[46px] lg:text-[56px] xl:text-[62px] ${isAr ? 'font-arabic' : ''}`}>
                                {copy.name}
                            </h3>

                            <p className="mt-2 text-[11px] sm:text-xs font-black uppercase text-white/25" dir="ltr">
                                {copy.latin}
                            </p>

                            <span className="alb-rule mt-6 block" aria-hidden="true" />

                            {/* نبذة بسيطة جداً — سطر واحد فقط */}
                            <p className="mt-6 text-[15px] sm:text-[16px] leading-[1.9] font-medium text-white/65">
                                {copy.short}
                            </p>

                            {/* verdict date */}
                            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#9CC5FF]/25 bg-[#9CC5FF]/[0.07] px-4 py-3">
                                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#9CC5FF]/15 border border-[#9CC5FF]/40 shrink-0" aria-hidden="true">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CC5FF" strokeWidth={2.2} strokeLinecap="round">
                                        <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18" />
                                    </svg>
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase text-white/35">
                                        {isAr ? 'تاريخ التنفيذ' : 'Date of execution'}
                                    </p>
                                    <p className="text-[15px] sm:text-base font-black text-[#D6E9FF] mt-0.5" dir="ltr">{copy.date}</p>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-2">
                                {copy.chips.map((c) => (
                                    <span key={c} className="alb-tag" dir={/^[\x00-\x7F]+$/.test(c) ? 'ltr' : undefined}>
                                        <span className="h-1 w-1 rotate-45 bg-[#4D8DFF]" aria-hidden="true" />
                                        {c}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-8 flex flex-col gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <a href="https://kick.com/mdra9" target="_blank" rel="noopener noreferrer"
                                        className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-black text-[14px] text-white/75 transition-all duration-300 bg-white/[0.05] border border-white/10 hover:text-white hover:border-[#4D8DFF]/50 active:scale-[0.98]"
                                    >
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#4D8DFF]/20 text-[#7FB2FF]" aria-hidden="true">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                        </span>
                                        {isAr ? 'شاهد البث' : 'Watch Live'}
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => setBox(true)}
                                        className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black text-[14px] text-white/70 transition-all duration-300 bg-white/[0.05] border border-white/10 hover:text-white hover:border-[#4D8DFF]/50 active:scale-[0.98]"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                                            <rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-4.5-4.5L7 19" />
                                        </svg>
                                        {isAr ? `كل الصور (${total})` : `All photos (${total})`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* ================= LIGHTBOX ================= */}
            {box && (
                <div className="alb-box" role="dialog" aria-modal="true" aria-label={isAr ? 'عارض الصور' : 'Photo viewer'} onClick={() => setBox(false)}>
                    <div className="alb-box-panel" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="alb-x" onClick={() => setBox(false)} aria-label={isAr ? 'إغلاق' : 'Close'}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                        </button>

                        <div className="relative">
                            <img src={PHOTOS[active].src} alt={`${copy.name} — ${pad(PHOTOS[active].n)}`} className="alb-box-img mx-auto" />
                        </div>

                        <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6">
                            <button type="button" className="alb-btn" onClick={prev} aria-label={isAr ? 'السابق' : 'Previous'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                            </button>
                            <span className="text-[12px] font-black text-white/70" dir="ltr">{pad(active + 1)} / {pad(total)}</span>
                            <button type="button" className="alb-btn" onClick={next} aria-label={isAr ? 'التالي' : 'Next'}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlbumSection;