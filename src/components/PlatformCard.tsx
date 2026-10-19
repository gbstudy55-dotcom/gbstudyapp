import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Platform } from '../types';
import { PlatformIcon } from './PlatformIcon';

interface PlatformCardProps {
  platform: Platform;
  onOpen: (platform: Platform) => void;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({ platform, onOpen }) => {
  const handleClick = () => {
    if (platform.url) {
      onOpen(platform);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group w-full rounded-2xl bg-[#0c1520] hover:bg-[#0f1a28] border border-[#172435] hover:border-[#1e3a55] pt-[19px] pb-[19px] px-3.5 sm:px-4 flex items-center justify-between gap-3.5 transition-all duration-200 cursor-pointer active:scale-[0.99] shadow-sm select-none"
    >
      {/* Vargakar (Square) Box: Icon has the exact same length & width as this square box */}
      <div className="w-[72px] h-[72px] sm:w-[78px] sm:h-[78px] aspect-square shrink-0 rounded-2xl overflow-hidden">
        <PlatformIcon
          icon={platform.icon}
          name={platform.name}
          className="w-full h-full rounded-2xl"
        />
      </div>

      {/* Middle Text Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="text-base sm:text-lg font-black text-white tracking-wide truncate group-hover:text-[#38bdf8] transition leading-snug">
            {platform.name}
          </h3>
          {platform.status === 'upcoming' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-800/40">
              Upcoming
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {platform.description || 'Open platform to explore free content and courses.'}
        </p>
      </div>

      {/* Right Circular Action Button */}
      <div className="w-10 h-10 rounded-full bg-[#0d2a33] text-[#38bdf8] border border-[#164e63] flex items-center justify-center group-hover:bg-[#133e4c] group-hover:scale-105 transition shrink-0 shadow-sm">
        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
      </div>
    </div>
  );
};
