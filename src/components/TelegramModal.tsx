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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-[32px] bg-gradient-to-b from-[#0b1726] via-[#07111b] to-[#04080e] border border-[#1b344d] p-6 text-white text-center shadow-2xl flex flex-col items-center overflow-hidden">
        {/* Ambient decorative glowing backlights */}
        <div className="absolute -top-24 -left-24 w-52 h-52 rounded-full bg-[#0284c7]/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-52 h-52 rounded-full bg-[#38bdf8]/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#101e30] hover:bg-[#162940] border border-[#1e344d] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer z-10"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* GB STUDY Icon with Glowing Halo and Telegram Badge */}
        <div className="relative my-3">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#06b6d4] opacity-60 blur-lg animate-pulse" />
          <div className="relative p-1 rounded-3xl bg-gradient-to-b from-[#38bdf8] to-[#0284c7] shadow-2xl">
            <GbLogo className="w-20 h-20 rounded-[22px] shadow-2xl object-contain bg-[#09111c]" />
          </div>
          {/* Telegram badge overlay on icon */}
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#229ED9] border-2 border-[#08111c] flex items-center justify-center text-white shadow-lg">
            <Send className="w-4 h-4 -rotate-12 translate-x-0.5 fill-white" />
          </div>
        </div>

        {/* Verified Official Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0c2438] border border-[#164e63] text-[10px] font-black text-[#38bdf8] uppercase tracking-wider mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>OFFICIAL TELEGRAM CHANNEL</span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-black tracking-tight text-white mb-1">
          Join GB STUDY Free
        </h3>

        {/* Channel Link Handle */}
        <p className="text-xs text-[#38bdf8] font-mono font-bold mb-3 tracking-wide">
          @GBFreestudy
        </p>

        {/* Subtitle */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4 px-2">
          Instant access to all study materials, PDFs, batch links, and daily updates:
        </p>

        {/* Feature List */}
        <div className="w-full bg-[#081320]/90 border border-[#152a40] rounded-2xl p-3.5 text-left space-y-2.5 mb-5 text-xs text-slate-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#38bdf8] shrink-0" />
            <span className="font-medium">Daily Free Handwritten Notes &amp; DPPs</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#38bdf8] shrink-0" />
            <span className="font-medium">All India Mock Tests &amp; Practice Sets</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#38bdf8] shrink-0" />
            <span className="font-medium">Live Exam Alerts, Batches &amp; Timetables</span>
          </div>
        </div>

        {/* Join Channel Button */}
        <button
          onClick={handleJoin}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#38bdf8] hover:from-[#0369a1] hover:to-[#0ea5e9] text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/25 active:scale-98 transition cursor-pointer mb-2.5"
        >
          <Send className="w-4 h-4 fill-black -rotate-12" />
          <span>Join Channel Now</span>
          <ExternalLink className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Skip for now Button */}
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200 transition py-1 cursor-pointer font-medium"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};
