import React, { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Platform } from '../types';
import { PlatformIcon } from './PlatformIcon';
import { authorizeUrlLaunch } from '../lib/popupShield';

interface InAppBrowserProps {
  platform: Platform | null;
  onClose: () => void;
}

export const InAppBrowser: React.FC<InAppBrowserProps> = ({ platform, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showSlowHint, setShowSlowHint] = useState(false);

  // Reset state when platform changes
  useEffect(() => {
    setIsLoading(true);
    setShowSlowHint(false);

    const slowTimer = setTimeout(() => {
      setShowSlowHint(true);
    }, 3800);

    return () => clearTimeout(slowTimer);
  }, [platform?.url]);

  // Allow pressing Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!platform) return null;

  const handleOpenExternal = () => {
    if (platform.url) {
      authorizeUrlLaunch(platform.url);
      window.open(platform.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#090e17] flex flex-col overflow-hidden animate-in fade-in duration-100">
      {/* Floating Minimal Back Button */}
      <button
        onClick={onClose}
        className="fixed top-3 left-3 z-[70] flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black/95 active:scale-95 text-white backdrop-blur-md border border-white/20 shadow-2xl transition cursor-pointer select-none"
        title="Back to GB STUDY"
        aria-label="Back to GB STUDY"
      >
        <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        <span className="text-xs font-bold tracking-wide">Back</span>
      </button>

      {/* Floating External Option */}
      <button
        onClick={handleOpenExternal}
        className="fixed top-3 right-3 z-[70] flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0c2438]/85 hover:bg-[#123652] active:scale-95 text-[#38bdf8] backdrop-blur-md border border-[#164e63] shadow-2xl transition cursor-pointer select-none text-xs font-bold"
        title="Open in new window / external browser"
      >
        <span>Open</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </button>

      {/* Top Progress bar */}
      {isLoading && (
        <div className="fixed top-0 inset-x-0 h-1 z-[70] bg-transparent overflow-hidden">
          <div className="w-full h-full bg-[#38bdf8] animate-[pulse_1s_infinite]" />
        </div>
      )}

      {/* Instant Branded Connecting Screen (Zero white flash, instant feedback) */}
      {isLoading && (
        <div className="absolute inset-0 z-30 bg-[#090e17] flex flex-col items-center justify-center p-6 text-white text-center select-none pointer-events-none">
          <div className="w-20 h-20 rounded-3xl bg-[#0c1f2b] border border-[#164e63] flex items-center justify-center p-3 mb-4 shadow-2xl shadow-cyan-950/60 animate-pulse">
            <PlatformIcon icon={platform.icon} name={platform.name} className="w-full h-full" />
          </div>

          <h3 className="text-xl font-black text-white tracking-wide uppercase">
            {platform.name}
          </h3>

          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Opening platform instantly...
          </p>

          <div className="w-48 h-1 bg-[#152332] rounded-full overflow-hidden mt-6">
            <div className="h-full bg-[#38bdf8] animate-pulse rounded-full" />
          </div>

          {showSlowHint && (
            <div className="mt-6 pointer-events-auto">
              <button
                type="button"
                onClick={handleOpenExternal}
                className="px-4 py-2 rounded-xl bg-[#0c2438] border border-[#164e63] text-xs font-bold text-[#38bdf8] hover:bg-[#123652] transition cursor-pointer flex items-center gap-1.5 mx-auto shadow-lg"
              >
                <span>Slow hosting? Tap to open in browser</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 100% Full Screen Platform Webview */}
      <iframe
        src={platform.url}
        title={platform.name}
        className="w-full h-full flex-1 border-0 m-0 p-0 block bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="eager"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};
