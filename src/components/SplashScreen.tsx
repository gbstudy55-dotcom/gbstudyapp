import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GbLogo } from './GbLogo';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Lightning-fast responsive loader (~160ms total)
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 40);
          return 100;
        }
        return prev + 20;
      });
    }, 20);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070e17] text-white px-6 overflow-hidden select-none cursor-pointer"
      title="Tap anywhere to skip"
    >
      {/* Concentric radar / glow rings around center logo */}
      <div className="absolute w-[360px] h-[360px] rounded-full border border-cyan-500/5 animate-pulse pointer-events-none" />
      <div className="absolute w-[280px] h-[280px] rounded-full border border-cyan-500/10 pointer-events-none" />
      <div className="absolute w-[200px] h-[200px] rounded-full border border-cyan-500/15 pointer-events-none" />

      {/* Center Official GB STUDY Logo */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center"
      >
        <GbLogo className="w-28 h-28 mb-4 rounded-3xl shadow-2xl shadow-cyan-950/80" />

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          <span>GB </span>
          <span className="text-[#38bdf8]">STUDY</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[11px] font-bold text-[#7dd3fc] tracking-[0.25em] mt-2">
          LEARN • PRACTICE • SUCCEED
        </p>

        {/* Fast Progress Loading Bar */}
        <div className="w-48 h-1 bg-[#152332] rounded-full overflow-hidden mt-6">
          <div 
            className="h-full bg-[#38bdf8] transition-all duration-75 ease-linear rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Footnote */}
        <p className="text-[11px] text-slate-400 mt-3 font-medium">
          Loading Platforms...
        </p>
      </motion.div>
    </motion.div>
  );
};
