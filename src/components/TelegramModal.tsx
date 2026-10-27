import React from 'react';
import { Send, X, CheckCircle2, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { GbLogo } from './GbLogo';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramUrl: string;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({
  isOpen,
  onClose,
  telegramUrl,
}) => {
  if (!isOpen) return null;

  const handleJoin = () => {
    window.open(telegramUrl || 'https://t.me/GBFreestudy', '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-[310px] rounded-2xl bg-gradient-to-b from-[#0b1726] via-[#07111b] to-[#04080e] border border-[#1b344d] p-4 text-white text-center shadow-2xl flex flex-col items-center overflow-hidden">
        {/* Ambient decorative glowing backlights */}
        <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-[#0284c7]/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-[#38bdf8]/15 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#101e30] hover:bg-[#162940] border border-[#1e344d] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* GB STUDY Icon with Glowing Halo and Telegram Badge */}
        <div className="relative my-1">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#06b6d4] opacity-50 blur-md animate-pulse" />
          <div className="relative p-0.5 rounded-2xl bg-gradient-to-b from-[#38bdf8] to-[#0284c7] shadow-xl">
            <GbLogo className="w-13 h-13 rounded-[14px] shadow-lg object-contain bg-[#09111c]" />
          </div>
          {/* Telegram badge overlay on icon */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#229ED9] border-2 border-[#08111c] flex items-center justify-center text-white shadow-md">
            <Send className="w-3 h-3 -rotate-12 translate-x-0.5 fill-white" />
          </div>
        </div>

        {/* Verified Official Pill */}
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0c2438] border border-[#164e63] text-[9px] font-black text-[#38bdf8] uppercase tracking-wider mb-1 mt-1">
          <ShieldCheck className="w-3 h-3 text-[#38bdf8]" />
          <span>OFFICIAL TELEGRAM</span>
        </div>

        {/* Title */}
        <h3 className="text-base font-black tracking-tight text-white mb-0.5">
          Join GB STUDY Free
        </h3>

        {/* Channel Link Handle */}
        <p className="text-[11px] text-[#38bdf8] font-mono font-bold mb-2 tracking-wide">
          @GBFreestudy
        </p>

        {/* Compact Feature List */}
        <div className="w-full bg-[#081320]/90 border border-[#152a40] rounded-xl p-2.5 text-left space-y-1.5 mb-3 text-[11px] text-slate-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <span className="font-medium truncate">Free Handwritten Notes &amp; DPPs</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
            <span className="font-medium truncate">All India Mock Tests &amp; Batches</span>
          </div>
        </div>

        {/* Join Channel Button */}
        <button
          onClick={handleJoin}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] hover:from-[#0369a1] hover:to-[#0ea5e9] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-98 transition cursor-pointer mb-1.5"
        >
          <Send className="w-3.5 h-3.5 fill-black -rotate-12" />
          <span>Join Channel Now</span>
          <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        {/* Skip for now Button */}
        <button
          onClick={onClose}
          className="text-[11px] text-slate-400 hover:text-slate-200 transition py-0.5 cursor-pointer font-medium"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};
