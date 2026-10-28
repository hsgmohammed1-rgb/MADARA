import React from 'react';
import { Language } from '../types';

interface StreamPlayerProps {
  lang: Language;
  isLive: boolean;
  viewers: number;
  channelSlug: string;
  poster?: string;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ lang, isLive, viewers, channelSlug, poster }) => {
  const t = {
    offline: lang === 'en' ? 'OFFLINE' : 'غير متصل',
  };

  return (
    <div className="relative w-full h-full bg-black rounded-2xl overflow-hidden group perspective-1000 shadow-2xl border border-white/10">

      {/* --- PLAYER ELEMENT --- */}
      {isLive ? (
        <iframe
          src={`https://player.kick.com/${channelSlug}?autoplay=true&muted=true`}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Kick Stream"
        />
      ) : (
        <div className="relative w-full h-full">
          {poster && <img src={poster} className="w-full h-full object-cover opacity-50" alt="Offline Poster" />}
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center animate-pulse">
                <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </div>
              <p className="text-white/40 font-bold tracking-widest">{t.offline}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};