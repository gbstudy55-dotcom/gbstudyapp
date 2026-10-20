import React from 'react';
import { Send, ShieldCheck } from 'lucide-react';
import { GbLogo } from './GbLogo';

interface HeaderProps {
  onLogoClick: () => void;
  adminUnlocked: boolean;
  onOpenAdmin: () => void;
  onOpenTelegram: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLogoClick,
  adminUnlocked,
  onOpenAdmin,
  onOpenTelegram,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#090e17]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[#141e2c]">
      {/* Top-Left: GB STUDY Brand Logo & Title - Secret 10-click triggers Admin password modal */}
      <div 
        onClick={onLogoClick}
        className="flex items-center gap-2.5 select-none cursor-pointer active:scale-95 transition"
        title="GB STUDY"
      >
        <GbLogo className="w-10 h-10" />
        <div className="flex flex-col">
          <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
            <span>GB </span>
            <span className="text-[#38bdf8]">STUDY</span>
          </h1>
          <span className="text-[9px] font-bold text-[#7dd3fc] tracking-wider -mt-0.5">
            LEARN • PRACTICE • SUCCEED
          </span>
        </div>
      </div>

      {/* Right Controls: Quick Telegram Button & Admin Panel (ONLY visible when unlocked) */}
      <div className="flex items-center gap-2">
        {/* Quick Telegram Button */}
        <button
          onClick={onOpenTelegram}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0c2438] hover:bg-[#123652] text-[#38bdf8] border border-[#164e63] text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm"
          title="Join Official Telegram"
        >
          <Send className="w-3.5 h-3.5 fill-[#38bdf8] -rotate-12" />
          <span className="hidden xs:inline">Telegram</span>
        </button>

        {/* Admin Panel button - ONLY visible after entering password (GBADMIN2026) */}
        {adminUnlocked && (
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0d2a33] hover:bg-[#113a47] text-[#38bdf8] border border-[#164e63] text-xs font-black tracking-wide transition active:scale-95 cursor-pointer shadow-sm animate-in fade-in"
            title="Open Admin Panel"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Admin</span>
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          </button>
        )}
      </div>
    </header>
  );
};
