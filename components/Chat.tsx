import React, { useState, useEffect, useRef } from 'react';
import { Language, ChatMessage } from '../types';
import { chatService } from '../services/chatService';

interface ChatWidgetProps {
  lang: Language;
  isDemo?: boolean;
}

// --- Icons for Badges ---
const OwnerBadge = () => (
  <div className="flex items-center justify-center w-4 h-4 rounded bg-[#4D8DFF] text-[#05060B] shrink-0 shadow-[0_0_10px_rgba(77,141,255,0.4)]" title="Broadcaster">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M5 19h14v2H5v-2zm7-13l3.5 7h-7L12 6zM6 17h12l-3-6H9l-3 6z" />
      <path d="M12 2L2 19h20L12 2zm0 3.5L18.5 17H5.5L12 5.5z" />
    </svg>
  </div>
);

const ModBadge = () => (
  <div className="flex items-center justify-center w-4 h-4 rounded bg-[#4D8DFF]/80 text-[#05060B] shrink-0 shadow-[0_0_8px_rgba(77,141,255,0.4)]" title="Moderator">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M18.828 2.343a3.001 3.001 0 00-4.243 0l-5.071 5.071-3.657-3.657a1 1 0 00-1.414 0l-1.414 1.414a1 1 0 000 1.414l3.657 3.657-5.071 5.071a1 1 0 000 1.414l2.828 2.828a1 1 0 001.414 0l5.071-5.071 3.657 3.657a1 1 0 001.414 0l1.414-1.414a1 1 0 000-1.414l-3.657-3.657 5.071-5.071a3.001 3.001 0 000-4.243zm-2.829 2.829a1 1 0 111.414-1.414 1 1 0 01-1.414 1.414z" />
    </svg>
  </div>
);

const VipBadge = () => (
  <div className="flex items-center justify-center w-4 h-4 rounded bg-[#F542A8] text-white shrink-0 shadow-[0_0_8px_rgba(245,66,168,0.4)]" title="VIP">
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
      <path d="M12 2L2 9l10 13 10-13-10-7z" />
    </svg>
  </div>
);

const INITIAL_MESSAGES: ChatMessage[] = [];

export const ChatWidget: React.FC<ChatWidgetProps> = ({ lang, isDemo }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [statusText, setStatusText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const t = {
    title: lang === 'en' ? 'Live Chat' : 'شات البث',
    connecting: lang === 'en' ? 'Connecting...' : 'جارِ الاتصال...',
    connected: lang === 'en' ? 'Live' : 'متصل',
    error: lang === 'en' ? 'Connection Issue' : 'مشكلة اتصال',
    retry: lang === 'en' ? 'Retry' : 'إعادة المحاولة'
  };

  useEffect(() => {
    // 1. Listen for new messages
    const unbindMessage = chatService.onMessage((msg) => {
      setMessages(prev => {
        const newArr = [...prev, msg];
        return newArr.slice(-75);
      });
    });

    // 2. Listen for deleted messages
    const unbindDelete = chatService.onDeleteMessage((msgId) => {
      setMessages(prev => prev.filter(m => m.id !== msgId));
    });

    // 3. Listen for status changes
    const unbindStatus = chatService.onStatusChange((connected, error, details) => {
      setIsConnected(connected);
      setConnectionError(error);
      setStatusText(details || '');
    });

    // 4. Connect to MADARA channel
    chatService.connect('mdra9');

    // 5. Cleanup
    return () => {
      unbindMessage();
      unbindDelete();
      unbindStatus();
      chatService.disconnect();
    };
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

      if (isNearBottom || messages.length <= 5) {
        chatContainerRef.current.scrollTo({
          top: scrollHeight,
          behavior: 'auto'
        });
      }
    }
  }, [messages]);

  const getBadge = (role: string) => {
    switch (role) {
      case 'owner': return <OwnerBadge />;
      case 'moderator': return <ModBadge />;
      case 'vip': return <VipBadge />;
      default: return null;
    }
  };

  const renderMessage = (content: string) => {
    if (!content) return null;

    // Regex to match Kick emotes: [emote:ID:NAME]
    const emoteRegex = /\[emote:(\d+):([\w\s\-]+)\]/gi;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = emoteRegex.exec(content)) !== null) {
      // Add text before the emote
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const emoteId = match[1];
      const emoteName = match[2];
      const emoteUrl = `https://files.kick.com/emotes/${emoteId}/fullsize`;

      parts.push(
        <img
          key={`${match.index}-${emoteId}`}
          src={emoteUrl}
          alt={emoteName}
          title={emoteName}
          className="inline-block w-8 h-8 md:w-10 md:h-10 mx-0.5 align-middle object-contain hover:scale-125 transition-transform"
        />
      );

      lastIndex = emoteRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="flex flex-col h-full max-h-full min-h-0 w-full bg-[#0b0e0f]/80 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative ring-1 ring-white/5 isolate group">

      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-kick/5 rounded-full blur-3xl -z-10 group-hover:bg-kick/10 transition-colors duration-500"></div>

      {/* --- Header --- */}
      <div className="h-14 shrink-0 bg-white/5 border-b border-white/5 flex items-center justify-between px-5 z-20 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-black/20 border border-white/5 transition-colors duration-500 ${isConnected ? 'text-[#4D8DFF]' : connectionError ? 'text-red-500' : 'text-white/50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className={`text-white font-bold tracking-wide text-sm uppercase ${lang === 'ar' ? 'font-arabic' : ''}`}>{t.title}</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#4D8DFF] shadow-[0_0_8px_#4D8DFF]' : connectionError ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></span>
              <span className="text-[10px] text-white/40 font-mono uppercase">
                {isConnected ? t.connected : connectionError ? t.error : (statusText || t.connecting)}
              </span>
            </div>
          </div>
        </div>

        {/* Retry Button */}
        {connectionError && (
          <button
            onClick={() => chatService.connect('mdra9')}
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs flex items-center gap-1"
            title={t.retry}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden md:inline">{t.retry}</span>
          </button>
        )}
      </div>

      {/* --- Chat List --- */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-1.5 scrollbar-hide bg-gradient-to-b from-[#0b0e0f]/50 to-transparent"
      >
        <div className="sticky top-0 h-8 bg-gradient-to-b from-[#0b0e0f] to-transparent z-10 -mt-4 pointer-events-none"></div>

        {messages.map((msg) => (
          <div key={msg.id} className="group flex items-start gap-2.5 py-1.5 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 animate-fade-in-up border border-transparent hover:border-white/5">

            {/* Badge Area */}
            {(msg.role === 'owner' || msg.role === 'moderator' || msg.role === 'vip') && (
              <div className="mt-1 shrink-0 transform group-hover:scale-110 transition-transform">
                {getBadge(msg.role)}
              </div>
            )}

            {/* Message Content */}
            <div className="flex flex-wrap items-baseline gap-x-2 text-[13px] md:text-sm leading-relaxed break-words min-w-0 w-full">

              {/* Username */}
              <span
                className="font-bold hover:underline cursor-pointer transition-opacity shrink-0 drop-shadow-sm"
                style={{ color: msg.user.color || '#fff' }}
              >
                {msg.user.username}
              </span>

              {/* Text / Emotes */}
              <span className={`text-white/80 font-medium group-hover:text-white transition-colors flex flex-wrap items-center gap-x-1 ${lang === 'ar' ? 'font-arabic' : ''}`}>
                {renderMessage(msg.content)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Decorative Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0b0e0f] to-transparent pointer-events-none z-10"></div>
    </div>
  );
};