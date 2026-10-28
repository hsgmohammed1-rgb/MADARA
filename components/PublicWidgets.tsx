import React, { useState } from 'react';

export const AnnouncementTicker = ({ announcement }: { announcement: any }) => {
    if (!announcement || (announcement.is_active !== true && announcement.is_active !== 'true') || !announcement.message) return null;
    
    return (
        <div className="flex-1 max-w-2xl mx-4 hidden md:flex overflow-hidden relative z-50 animate-fade-in-down rounded-full border border-[#9CC5FF]/30 bg-[#0a0a0a]/80 shadow-[0_0_20px_rgba(77,141,255,0.15)]">
            <div className="flex items-center w-full h-10">
                {/* News Badge */}
                <div className="flex items-center justify-center bg-gradient-to-r from-[#9CC5FF] to-[#12315E] px-4 h-full shrink-0 z-10 relative overflow-hidden border-r rtl:border-l rtl:border-r-0 border-[#9CC5FF]/50">
                    <div className="absolute inset-0 bg-white/20 skew-x-12 -translate-x-full animate-shine"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white] animate-pulse mr-2 rtl:ml-2 rtl:mr-0"></div>
                    <span className="text-white text-[11px] font-black tracking-widest uppercase">عاجل</span>
                </div>
                
                {/* Scrolling Text */}
                <div className="flex-1 overflow-hidden relative h-full flex items-center banner-mask">
                    <div className="marquee-content inline-flex whitespace-nowrap items-center text-white/90 font-bold text-[12px] tracking-wide">
                        <span className="px-8">{announcement.message}</span>
                        <span className="text-[#9CC5FF] text-[8px] animate-pulse">◆</span>
                        <span className="px-8">{announcement.message}</span>
                        <span className="text-[#9CC5FF] text-[8px] animate-pulse">◆</span>
                        <span className="px-8">{announcement.message}</span>
                        <span className="text-[#9CC5FF] text-[8px] animate-pulse">◆</span>
                        <span className="px-8">{announcement.message}</span>
                    </div>
                </div>
            </div>
            <style>{`
                .banner-mask {
                    mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
                }
                .marquee-content {
                    width: max-content;
                    padding-left: 100%;
                    animation: scrollText 15s linear infinite;
                }
                @keyframes scrollText {
                    from { transform: translateX(0); }
                    to { transform: translateX(-100%); }
                }
                [dir="rtl"] .marquee-content, html[dir="rtl"] .marquee-content {
                    padding-left: 0;
                    padding-right: 100%;
                    animation: scrollTextRTL 15s linear infinite;
                }
                @keyframes scrollTextRTL {
                    from { transform: translateX(0); }
                    to { transform: translateX(100%); }
                }
                .animate-shine {
                    animation: shine 4s infinite;
                }
                @keyframes shine {
                    0% { transform: translateX(-150%) skewX(12deg); }
                    20%, 100% { transform: translateX(150%) skewX(12deg); }
                }
            `}</style>
        </div>
    );
};

export const SponsorsSection = ({ sponsors, className = '' }: { sponsors: any[], className?: string }) => {
    if (!sponsors || sponsors.length === 0) return null;
    
    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest drop-shadow-lg whitespace-nowrap">أكواد الخصم 💸</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[#9CC5FF]/50 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                {sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="w-full bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 relative overflow-hidden group hover:-translate-y-2 transition-all duration-300 shadow-2xl hover:shadow-[0_20px_40px_rgba(77,141,255,0.15)] flex flex-col justify-between">
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#9CC5FF]/10 blur-[50px] rounded-full group-hover:bg-[#9CC5FF]/20 transition-colors pointer-events-none"></div>
                        <h3 className="text-xl md:text-2xl font-black text-white mb-2 relative z-10">{sponsor.brand_name}</h3>
                        <p className="text-xs md:text-sm text-white/60 mb-6 font-bold relative z-10">{sponsor.discount_desc}</p>
                        
                        <div className="bg-black/50 border border-white/5 rounded-2xl p-3 flex items-center justify-between mb-4 group-hover:border-[#9CC5FF]/30 transition-colors relative z-10">
                            <span className="text-lg md:text-xl font-black text-[#9CC5FF] tracking-widest">{sponsor.promo_code}</span>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(sponsor.promo_code);
                                    alert('تم نسخ الكود!');
                                }}
                                className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 hover:bg-[#9CC5FF] flex items-center justify-center transition-colors text-white hover:text-black shrink-0 ml-2 rtl:ml-0 rtl:mr-2"
                                title="نسخ الكود"
                            >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        </div>
                        
                        {sponsor.url && (
                            <a href={sponsor.url} target="_blank" rel="noreferrer" className="block w-full text-center bg-white/5 hover:bg-white/10 text-white font-bold py-2.5 md:py-3 rounded-xl transition-colors text-xs md:text-sm uppercase tracking-wider relative z-10">
                                زيارة المتجر
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ClipsSection = ({ clips, className = '' }: { clips: any[], className?: string }) => {
    if (!clips || clips.length === 0) return null;

    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('youtube.com/shorts/')) return url.replace('youtube.com/shorts/', 'youtube.com/embed/');
        if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
        if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
        if (url.includes('tiktok.com')) return `https://www.tiktok.com/embed/v2/${url.split('/').pop()}`;
        return url;
    };

    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-widest drop-shadow-lg whitespace-nowrap">أفضل اللقطات 🎬</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[#9CC5FF]/50 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 items-start">
                {clips.map((clip) => {
                    const isVertical = clip.platform === 'tiktok' || clip.video_url?.includes('youtube.com/shorts/') || clip.video_url?.includes('instagram.com/reel/') || clip.platform === 'instagram';
                    return (
                        <div key={clip.id} className="w-full bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden group hover:border-[#9CC5FF]/50 transition-colors shadow-2xl flex flex-col h-fit">
                            <div className={`${isVertical ? 'aspect-[9/16]' : 'aspect-video'} bg-black relative`}>
                                <iframe src={getEmbedUrl(clip.video_url)} className="w-full h-full" allowFullScreen></iframe>
                            </div>
                            <div className="p-4 bg-gradient-to-t from-[#0a0a0a] to-transparent">
                                <h3 className="text-xs md:text-sm font-bold text-white line-clamp-2 leading-relaxed" dir="auto">{clip.title}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const ScheduleSection = ({ schedule }: { schedule: any[] }) => {
    if (!schedule || schedule.length === 0) return null;
    
    return (
        <div className="w-full max-w-6xl mx-auto mt-20 px-4">
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-lg">جدول البثوث 📅</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[#9CC5FF]/50 to-transparent"></div>
            </div>
            <div className="bg-[#050505]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-6 overflow-hidden shadow-2xl">
                <div className="flex flex-col gap-2">
                    {schedule.map((day, index) => (
                        <div key={day.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl ${index % 2 === 0 ? 'bg-white/5' : 'bg-transparent'} hover:bg-white/10 transition-colors border border-transparent hover:border-white/10`}>
                            <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#9CC5FF]/20 to-[#9CC5FF]/5 flex items-center justify-center border border-[#9CC5FF]/20 shrink-0">
                                    <span className="font-black text-[#9CC5FF] text-sm">{day.day_name}</span>
                                </div>
                                <span className="text-lg font-bold text-white">{day.stream_plan || 'إجازة 💤'}</span>
                            </div>
                            <div className="bg-black/50 px-4 py-2 rounded-xl border border-white/5 shrink-0 self-start sm:self-auto">
                                <span className="text-sm font-black text-[#9CC5FF] tracking-widest">{day.time || '--:--'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const FAQSection = ({ faqs }: { faqs: any[] }) => {
    const [openId, setOpenId] = useState<number | null>(null);

    if (!faqs || faqs.length === 0) return null;

    return (
        <div className="w-full max-w-4xl mx-auto mt-20 px-4 mb-20">
            <div className="flex items-center gap-4 mb-8">
                <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-lg">الأسئلة الشائعة ❓</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-[#9CC5FF]/50 to-transparent"></div>
            </div>
            <div className="flex flex-col gap-4">
                {faqs.map((faq) => (
                    <div 
                        key={faq.id} 
                        className={`bg-[#050505]/80 backdrop-blur-xl border ${openId === faq.id ? 'border-[#9CC5FF]/50 shadow-[0_0_20px_rgba(77,141,255,0.1)]' : 'border-white/10'} rounded-3xl overflow-hidden transition-all duration-300`}
                    >
                        <button 
                            onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                            className="w-full flex items-center justify-between p-6 text-right outline-none"
                        >
                            <span className="text-lg font-bold text-white">{faq.question}</span>
                            <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${openId === faq.id ? 'rotate-180 bg-[#9CC5FF]/20 text-[#9CC5FF]' : 'text-white/50'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </button>
                        <div 
                            className={`transition-all duration-500 ease-in-out ${openId === faq.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                        >
                            <div className="p-6 pt-0 text-white/70 font-medium leading-relaxed">
                                {faq.answer}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
