import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Platform } from '../types';

interface InAppBrowserProps {
  platform: Platform | null;
  onClose: () => void;
}

export const InAppBrowser: React.FC<InAppBrowserProps> = ({ platform, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-black flex flex-col overflow-hidden animate-in fade-in duration-150">
      {/* Floating Minimal Back Button - No top bar/patti, leaves 100% full screen */}
      <button
        onClick={onClose}
        className="fixed top-3 left-3 z-[60] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/95 active:scale-95 text-white backdrop-blur-md border border-white/20 shadow-2xl transition cursor-pointer select-none"
        title="Back to GB STUDY"
        aria-label="Back to GB STUDY"
      >
        <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
        <span className="text-xs font-bold tracking-wide">Back</span>
      </button>

      {/* Loading progress bar at top edge */}
      {isLoading && (
        <div className="fixed top-0 inset-x-0 h-1 z-[60] bg-transparent overflow-hidden">
          <div className="w-full h-full bg-[#38bdf8] animate-pulse" />
        </div>
      )}

      {/* 100% Full Screen Platform Webview - No top bar, No header strip */}
      <iframe
        src={platform.url}
        title={platform.name}
        className="w-full h-full flex-1 border-0 m-0 p-0 block bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};
