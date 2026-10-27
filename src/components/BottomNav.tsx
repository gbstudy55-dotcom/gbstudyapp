import React from 'react';
import { Home, Bot, MessageSquare, Calendar } from 'lucide-react';

export type VideoTab = 'platforms' | 'gb_ai' | 'chat' | 'upcoming';

interface BottomNavProps {
  activeTab: VideoTab;
  onTabChange: (tab: VideoTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090e17]/95 backdrop-blur-lg border-t border-[#141e2c] py-2 px-3">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {/* Platforms Tab */}
        <button
          onClick={() => onTabChange('platforms')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'platforms'
              ? 'text-[#38bdf8] font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 mb-0.5 ${activeTab === 'platforms' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] truncate">Platforms</span>
        </button>

        {/* GB AI Tab */}
        <button
          onClick={() => onTabChange('gb_ai')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'gb_ai'
              ? 'text-[#38bdf8] font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className={`w-5 h-5 mb-0.5 ${activeTab === 'gb_ai' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] truncate">GB AI</span>
        </button>

        {/* Chat Tab */}
        <button
          onClick={() => onTabChange('chat')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'chat'
              ? 'text-[#38bdf8] font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className={`w-5 h-5 mb-0.5 ${activeTab === 'chat' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] truncate">Chat</span>
        </button>

        {/* Upcoming Tab */}
        <button
          onClick={() => onTabChange('upcoming')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
            activeTab === 'upcoming'
              ? 'text-[#38bdf8] font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className={`w-5 h-5 mb-0.5 ${activeTab === 'upcoming' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className="text-[11px] truncate">Upcoming</span>
        </button>
      </div>
    </nav>
  );
};
