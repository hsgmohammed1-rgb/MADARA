import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Language } from '../types';

export type TheaterItem =
  | { kind: 'vod'; uuid: string; title: string; kickUrl: string; poster?: string; subOnly?: boolean; meta?: string }
  | { kind: 'clip'; title: string; hls: string; kickUrl: string; poster?: string; meta?: string };

interface VodTheaterProps {
  lang: Language;
  item: TheaterItem | null;
  onClose: () => void;
}

const CHANNEL_URL = 'https://kick.com/mdra9';
const SUBSCRIBE_URL = 'https://kick.com/mdra9/subscribe';

const fmtTime = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(sec).padStart(2, '0')}`;
};

/* ============ PRO PLAYER — custom storm controls ============ */
const ProPlayer: React.FC<{ src?: string; vodUuid?: string; poster?: string; onBlocked?: () => void }> = ({ src, vodUuid, poster, onBlocked }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const hideTimer = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [levels, setLevels] = useState<{ idx: number; label: string }[]>([]);
  const [level, setLevel] = useState(-1);
  const [showQ, setShowQ] = useState(false);
  const [showCtl, setShowCtl] = useState(true);
  const [isFs, setIsFs] = useState(false);

  // load stream (direct m3u8 or resolved Kick VOD file)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    let dead = false;
    (async () => {
      try {
        let url = src || '';
        if (!url && vodUuid) {
          try {
            const r = await fetch('/api/vod?uuid=' + encodeURIComponent(vodUuid));
            const j = await r.json();
            if (j?.source) url = j.source;
          } catch {}
          if (!url) {
            const r = await fetch('/api/kick?endpoint=' + encodeURIComponent(`https://kick.com/api/v1/video/${vodUuid}`));
            if (!r.ok) throw new Error('blocked');
            const j = await r.json();
            url = j?.source || '';
          }
          if (!url) throw new Error('blocked');
        }
        if (dead || !url) return;
        el.volume = volume;
        if (el.canPlayType('application/vnd.apple.mpegurl')) {
          el.src = url;
        } else {
          const mod: any = await import('hls.js');
          const Hls = mod?.default || mod;
          if (dead) return;
          if (Hls?.isSupported?.()) {
            const hls = new Hls({ maxBufferLength: 30 });
            hlsRef.current = hls;
            hls.on(Hls.Events.MANIFEST_PARSED, (_: any, data: any) => {
              const lv = (data?.levels || []).map((l: any, i: number) => ({ idx: i, label: `${l.height || '?'}p` }));
              if (!dead) setLevels(lv);
            });
            hls.on(Hls.Events.LEVEL_SWITCHED, (_: any, data: any) => {
              if (!dead && typeof data?.level === 'number') setLevel(data.level);
            });
            hls.on(Hls.Events.ERROR, (_: any, data: any) => {
              if (!dead && data?.fatal) { setReady(false); onBlocked?.(); }
            });
            hls.loadSource(url);
            hls.attachMedia(el);
          } else {
            el.src = url;
          }
        }
        setReady(true);
        el.play().then(() => !dead && setPlaying(true)).catch(() => {});
      } catch {
        if (!dead) onBlocked?.();
      }
    })();
    return () => { dead = true; try { hlsRef.current?.destroy?.(); } catch {} hlsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, vodUuid]);

  // media events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setTime(el.currentTime || 0);
    const onDur = () => setDur(el.duration || 0);
    const onWait = () => setBuffering(true);
    const onGo = () => setBuffering(false);
    const onVol = () => { setMuted(el.muted); setVolume(el.volume); };
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onDur);
    el.addEventListener('durationchange', onDur);
    el.addEventListener('waiting', onWait);
    el.addEventListener('playing', onGo);
    el.addEventListener('canplay', onGo);
    el.addEventListener('volumechange', onVol);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onDur);
      el.removeEventListener('durationchange', onDur);
      el.removeEventListener('waiting', onWait);
      el.removeEventListener('playing', onGo);
      el.removeEventListener('canplay', onGo);
      el.removeEventListener('volumechange', onVol);
    };
  }, [ready]);

  // fullscreen tracking
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const poke = useCallback(() => {
    setShowCtl(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      const el = videoRef.current;
      if (el && !el.paused) setShowCtl(false);
    }, 2600);
  }, []);
  useEffect(() => { poke(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, [poke]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
    poke();
  }, [poke]);

  const seek = useCallback((v: number) => {
    const el = videoRef.current;
    if (!el || !dur) return;
    el.currentTime = Math.min(dur - 0.2, Math.max(0, (v / 1000) * dur));
    poke();
  }, [dur, poke]);

  const changeVol = useCallback((v: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = v;
    el.muted = v === 0;
    poke();
  }, [poke]);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    if (!el.muted && el.volume === 0) el.volume = 0.9;
    poke();
  }, [poke]);

  const pickLevel = useCallback((idx: number) => {
    const hls = hlsRef.current;
    if (hls) { hls.currentLevel = idx; setLevel(idx); }
    setShowQ(false);
    poke();
  }, [poke]);

  const toggleFs = useCallback(() => {
    const w = wrapRef.current;
    if (!w) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else w.requestFullscreen?.().catch(() => {});
    poke();
  }, [poke]);

  const pct = dur > 0 ? Math.min(100, (time / dur) * 100) : 0;
  const qLabel = level >= 0 && levels[level] ? levels[level].label : 'Auto';

  return (
    <div ref={wrapRef} className="group/player relative w-full h-full bg-black overflow-hidden select-none"
      onMouseMove={poke} onTouchStart={poke} onClick={togglePlay}>
      {poster && !ready && <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />}
      <video ref={videoRef} className="w-full h-full" playsInline preload="metadata" poster={poster} onClick={(e) => e.stopPropagation()} />

      {/* buffering */}
      {buffering && ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-12 h-12 animate-spin text-[#4D8DFF]" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        </div>
      )}

      {/* big center play */}
      {!playing && ready && !buffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#4D8DFF]/30 backdrop-blur-md border border-[#4D8DFF]/70 flex items-center justify-center shadow-[0_0_50px_rgba(77,141,255,0.6)] animate-float-soft">
            <svg className="w-7 h-7 md:w-8 md:h-8 text-white fill-current translate-x-[2px]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </div>
      )}

      {/* control bar */}
      <div className={`absolute bottom-0 inset-x-0 transition-all duration-300 ${showCtl ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-t from-black/95 via-black/60 to-transparent px-3 sm:px-4 pt-8 pb-2.5">
          {/* seek */}
          <div className="flex items-center gap-2 mb-1.5" dir="ltr">
            <span className="text-[10px] font-black text-white/80 tabular-nums shrink-0">{fmtTime(time)}</span>
            <input type="range" min={0} max={1000} value={Math.round(pct * 10)} onChange={(e) => seek(Number(e.target.value))}
              className="vod-seek flex-1 h-1.5 cursor-pointer" style={{ ['--fill' as any]: `${pct}%` }} aria-label="Seek" />
            <span className="text-[10px] font-black text-white/50 tabular-nums shrink-0">{fmtTime(dur)}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* play/pause */}
            <button onClick={togglePlay} aria-label="Play/Pause"
              className="w-9 h-9 rounded-xl bg-[#4D8DFF] text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all shadow-[0_0_18px_rgba(77,141,255,0.6)] shrink-0">
              {playing
                ? <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                : <svg className="w-4 h-4 fill-current translate-x-[1px]" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            {/* mute + volume */}
            <button onClick={toggleMute} aria-label="Mute"
              className="w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 text-white/80 hover:text-white hover:border-[#4D8DFF]/60 flex items-center justify-center transition-colors shrink-0">
              {muted || volume === 0
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.107 12 5v14c0 .893-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.107 12 5v14c0 .893-1.077 1.337-1.707.707L5.586 15z" /></svg>}
            </button>
            <input type="range" min={0} max={100} value={muted ? 0 : Math.round(volume * 100)} onChange={(e) => changeVol(Number(e.target.value) / 100)}
              className="vod-vol w-16 sm:w-24 h-1.5 cursor-pointer hidden min-[420px]:block" style={{ ['--fill' as any]: `${muted ? 0 : Math.round(volume * 100)}%` }} dir="ltr" aria-label="Volume" />
            <span className="flex-1" />
            {/* quality */}
            {levels.length > 1 && (
              <div className="relative shrink-0">
                {showQ && (
                  <div className="absolute bottom-11 end-0 min-w-[110px] rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl overflow-hidden shadow-2xl">
                    <button onClick={() => pickLevel(-1)}
                      className={`w-full text-start px-3.5 py-2 text-[11px] font-black transition-colors ${level === -1 ? 'text-[#7FB2FF] bg-[#4D8DFF]/15' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`}>
                      Auto ✔
                    </button>
                    {levels.map((l) => (
                      <button key={l.idx} onClick={() => pickLevel(l.idx)}
                        className={`w-full text-start px-3.5 py-2 text-[11px] font-black transition-colors ${level === l.idx ? 'text-[#7FB2FF] bg-[#4D8DFF]/15' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`} dir="ltr">
                        {l.label}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowQ(v => !v); poke(); }}
                  className="h-9 px-3 rounded-xl bg-white/[0.07] border border-white/10 text-white/80 hover:text-white hover:border-[#4D8DFF]/60 text-[11px] font-black transition-colors" dir="ltr">
                  {qLabel}
                </button>
              </div>
            )}
            {/* fullscreen */}
            <button onClick={toggleFs} aria-label="Fullscreen"
              className="w-9 h-9 rounded-xl bg-white/[0.07] border border-white/10 text-white/80 hover:text-white hover:border-[#4D8DFF]/60 flex items-center justify-center transition-colors shrink-0">
              {isFs
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9l-5 5m11-5v4.5M15 15h4.5M15 15l5-5M9 15v4.5M9 15H4.5M9 15l-5-5m11 5v-4.5m0 4.5h4.5m-4.5 0l5 5" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15" /></svg>}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .vod-seek, .vod-vol { -webkit-appearance: none; appearance: none; background: transparent; }
        .vod-seek::-webkit-slider-runnable-track, .vod-vol::-webkit-slider-runnable-track { height: 6px; border-radius: 99px; background: linear-gradient(to right, #4D8DFF 0%, #4D8DFF var(--fill, 0%), rgba(255,255,255,0.15) var(--fill, 0%)); }
        .vod-seek::-webkit-slider-thumb, .vod-vol::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 99px; background: #fff; margin-top: -4px; box-shadow: 0 0 10px rgba(77,141,255,0.8); cursor: pointer; }
        .vod-seek::-moz-range-track, .vod-vol::-moz-range-track { height: 6px; border-radius: 99px; background: rgba(255,255,255,0.15); }
        .vod-seek::-moz-range-progress, .vod-vol::-moz-range-progress { height: 6px; border-radius: 99px; background: #4D8DFF; }
        .vod-seek::-moz-range-thumb, .vod-vol::-moz-range-thumb { width: 14px; height: 14px; border: none; border-radius: 99px; background: #fff; box-shadow: 0 0 10px rgba(77,141,255,0.8); cursor: pointer; }
      `}</style>
    </div>
  );
};

export const VodTheater: React.FC<VodTheaterProps> = ({ lang, item, onClose }) => {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [item, onClose]);

  if (!item) return null;
  const subOnly = item.kind === 'vod' && item.subOnly;

  return (
    <VodBody key={item.kind === 'vod' ? item.uuid : item.hls} lang={lang} item={item} subOnly={!!subOnly} onClose={onClose} />
  );
};

const VodBody: React.FC<{ lang: Language; item: TheaterItem; subOnly: boolean; onClose: () => void }> = ({ lang, item, subOnly, onClose }) => {
  const isAr = lang === 'ar';
  const [blocked, setBlocked] = useState(false);
  // Broken VOD pages never play — header opens the channel only
  const openUrl = item.kind === 'vod' ? CHANNEL_URL : item.kickUrl;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="absolute inset-0 bg-black/88 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-4xl animate-fade-in-up">
        <div className="rounded-[24px] p-[1.5px] bg-gradient-to-b from-[#4D8DFF]/70 via-white/10 to-transparent shadow-[0_30px_90px_rgba(77,141,255,0.25)]">
          <div className="rounded-[22.5px] bg-[#060B16] overflow-hidden">
            {/* header */}
            <div className="flex items-center gap-2.5 px-4 md:px-5 py-3 border-b border-white/[0.07] bg-black/60">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.2em] text-[#5B8FE8]" dir="ltr">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4D8DFF] animate-pulse" />
                {item.kind === 'vod' ? 'VOD' : 'CLIP'}
              </span>
              {subOnly && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#9CC5FF]/10 border border-[#9CC5FF]/40 text-[#D6E9FF]">
                  {isAr ? 'للمشتركين' : 'SUB ONLY'}
                </span>
              )}
              <p className="min-w-0 flex-1 text-[13px] md:text-sm font-black text-white truncate" dir="auto">{item.title}</p>
              <a href={openUrl} target="_blank" rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 hover:text-white hover:border-[#4D8DFF]/60 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                {isAr ? 'قناة كيك' : 'Kick channel'}
              </a>
              <button onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}
                className="shrink-0 w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 text-white/70 hover:text-white hover:border-[#4D8DFF]/60 hover:bg-[#4D8DFF]/15 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* player */}
            <div className="aspect-video bg-black">
              {blocked ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6">
                  <span className="w-14 h-14 rounded-2xl bg-[#4D8DFF]/10 border border-[#4D8DFF]/40 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#7FB2FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </span>
                  <p className="text-white font-black text-sm md:text-base">{isAr ? 'هذا التسجيل للمشتركين فقط' : 'Subscribers only'}</p>
                  <p className="text-white/45 text-[12px] font-medium">{isAr ? 'اشترك في قناة كيك عشان تشوفه كامل' : 'Subscribe on Kick to watch the full VOD'}</p>
                  <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-[#5B8FE8] via-[#4D8DFF] to-[#12315E] text-white text-[13px] font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_28px_rgba(77,141,255,0.55)]">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3 1.6-1.4 3.2 1.4 3.2-3 1.6-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3-1.6L3.6 12 2.2 8.8l3-1.6 1-3.3 3.4.5L12 2zm-1.1 12.4l4.5-4.5-1.4-1.4-3.1 3.1-1.5-1.5-1.4 1.4 2.9 2.9z" /></svg>
                    {isAr ? 'اشترك الآن' : 'SUBSCRIBE NOW'}
                  </a>
                </div>
              ) : item.kind === 'clip' ? (
                <ProPlayer src={item.hls} poster={item.poster} onBlocked={() => setBlocked(true)} />
              ) : (
                <ProPlayer vodUuid={item.uuid} poster={item.poster} onBlocked={() => setBlocked(true)} />
              )}
            </div>
            {/* footer */}
            <div className="flex items-center gap-2 px-4 md:px-5 py-3 border-t border-white/[0.07] bg-black/60">
              <span className="text-[11px] text-white/40 font-medium truncate" dir="auto">
                {subOnly
                  ? (isAr ? 'هذا التسجيل للمشتركين — اشترك في كيك للمشاهدة الكاملة' : 'This VOD is for subscribers — sub on Kick to watch fully')
                  : (item.meta || (isAr ? 'مشاهدة داخل الموقع' : 'Watching inside the site'))}
              </span>
              <span className="ms-auto shrink-0 text-[10px] font-black tracking-[0.25em] text-white/30" dir="ltr">MADARA • THEATER</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VodTheater;
