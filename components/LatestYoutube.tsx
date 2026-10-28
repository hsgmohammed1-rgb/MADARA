import React, { useState, useEffect } from 'react';
import { Language } from '../types';

interface LatestYoutubeProps {
  lang: Language;
}

export const LatestYoutube: React.FC<LatestYoutubeProps> = ({ lang }) => {
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Level One clan channel (@leveloneclan)
  const channelId = 'UCD7EpD4o6bw24c5o5vu4hGQ';
  const channelUrl = 'https://www.youtube.com/@leveloneclan';

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          const latest = data.items[0];
          // Try to get higher res thumbnail
          const highResThumbnail = latest.thumbnail.replace('hqdefault.jpg', 'maxresdefault.jpg');
          
          setVideo({
            title: latest.title,
            link: latest.link,
            date: new Date(latest.pubDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            thumbnail: highResThumbnail
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [lang]);

  if (loading || !video) return null;

  return (
    <a 
        href={video.link} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="group relative flex flex-col md:flex-row h-full w-full bg-[#080808] border border-white/10 rounded-2xl overflow-hidden hover:border-[#FF0000]/40 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.1)] animate-fade-in-up"
    >
        {/* Background Glow */}
        <div className="absolute inset-0 bg-[#FF0000]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        {/* Thumbnail Section - Optimized for Grid */}
        <div className="relative w-full md:w-2/5 h-48 md:h-full shrink-0 overflow-hidden">
            <img 
            src={video.thumbnail} 
            alt={video.title} 
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            onError={(e) => { (e.target as HTMLImageElement).src = video.thumbnail.replace('maxresdefault', 'hqdefault'); }}
            />
            
            {/* Play Overlay */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-10 h-10 rounded-full bg-[#FF0000] text-white flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300 border border-white/20">
                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>

            {/* Badge Overlay */}
            <div className="absolute top-2 left-2 z-10">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-black/70 backdrop-blur-md border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse"></div>
                    <span className="text-[8px] font-bold text-white uppercase tracking-wider">
                        {lang === 'en' ? 'LATEST' : 'جديد'}
                    </span>
                </div>
            </div>
        </div>

        {/* Content Section */}
        <div className="p-4 md:p-5 flex flex-col justify-center min-w-0 relative z-10 flex-1">
            <div className="flex items-center gap-2 mb-2 opacity-60">
                <span className="text-[9px] text-white font-mono uppercase tracking-widest">{video.date}</span>
            </div>
            
            <h3 className={`text-sm md:text-base font-bold text-white leading-snug group-hover:text-[#FF0000] transition-colors line-clamp-2 mb-3 ${lang === 'ar' ? 'font-arabic' : ''}`}>
                {video.title}
            </h3>
            
            <div className="mt-auto flex items-center gap-2 text-white/40 group-hover:text-white/80 transition-colors text-[10px] font-bold uppercase tracking-wider">
                <span>{lang === 'en' ? 'Watch Now' : 'شاهد الآن'}</span>
                <svg className={`w-3 h-3 transition-transform duration-300 group-hover:translate-x-1 ${lang === 'ar' ? 'rotate-180 group-hover:-translate-x-1 group-hover:translate-x-0' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
            </div>
        </div>
    </a>
  );
};