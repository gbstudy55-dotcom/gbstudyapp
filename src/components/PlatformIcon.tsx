import React, { useState } from 'react';
import { 
  GraduationCap, Target, Award, Atom, Sparkles, Shield, BookOpen, 
  CheckCircle, Layers, Zap, Crosshair, Star, School, Compass, Tv, Video, Play, Globe
} from 'lucide-react';
import { GbLogo } from './GbLogo';

interface PlatformIconProps {
  icon?: string;
  name: string;
  className?: string;
}

// Direct local SVG components map - 0ms delay, 0 network requests!
function getLocalLucideIcon(iconStr?: string, nameStr?: string) {
  const query = `${iconStr || ''} ${nameStr || ''}`.toLowerCase();

  if (query.includes('1791541921524') || query.includes('gb-logo') || query.includes('gb study')) {
    return 'gb-logo';
  }
  if (query.includes('graduation-cap') || query.includes('khan') || query.includes('kgs')) {
    return GraduationCap;
  }
  if (query.includes('crosshair') || query.includes('ankit')) {
    return Crosshair;
  }
  if (query.includes('target')) {
    return Target;
  }
  if (query.includes('award') || query.includes('vidyagram')) {
    return Award;
  }
  if (query.includes('atom') || query.includes('pw') || query.includes('physics')) {
    return Atom;
  }
  if (query.includes('sparkles') || query.includes('vibrant')) {
    return Sparkles;
  }
  if (query.includes('shield') || query.includes('officer') || query.includes('officrr')) {
    return Shield;
  }
  if (query.includes('book-open') || query.includes('sachin')) {
    return BookOpen;
  }
  if (query.includes('check-circle') || query.includes('rwa') || query.includes('rojgar')) {
    return CheckCircle;
  }
  if (query.includes('layers') || query.includes('unacademy')) {
    return Layers;
  }
  if (query.includes('zap') || query.includes('topper')) {
    return Zap;
  }
  if (query.includes('star') || query.includes('utkarsh')) {
    return Star;
  }
  if (query.includes('school')) {
    return School;
  }
  if (query.includes('tv')) {
    return Tv;
  }
  if (query.includes('video') || query.includes('play')) {
    return Video;
  }
  return null;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  icon,
  name,
  className = 'w-11 h-11',
}) => {
  const [imgError, setImgError] = useState(false);

  // 1. Check if we have a direct instant vector component
  const LocalIcon = getLocalLucideIcon(icon, name);

  if (LocalIcon === 'gb-logo') {
    return <GbLogo className={className} />;
  }

  if (LocalIcon && (!icon || icon.includes('iconify') || icon.includes('lucide') || imgError)) {
    const IconComp = LocalIcon;
    return (
      <div
        className={`relative shrink-0 rounded-2xl bg-gradient-to-br from-[#0c2438] via-[#091a2a] to-[#07131e] border border-[#164e63]/50 flex items-center justify-center overflow-hidden shadow-inner aspect-square text-[#38bdf8] ${className}`}
      >
        <IconComp className="w-6 h-6 stroke-[2.2] drop-shadow-[0_2px_8px_rgba(56,189,248,0.35)]" />
      </div>
    );
  }

  // 2. Custom image (data:image/, http/https, /path)
  const isCustomImage =
    icon &&
    !imgError &&
    (icon.startsWith('data:image/') ||
      icon.startsWith('http://') ||
      icon.startsWith('https://') ||
      icon.startsWith('/')) &&
    !icon.includes('api.iconify.design');

  if (isCustomImage) {
    return (
      <div
        className={`relative shrink-0 rounded-2xl bg-[#0f1926] border border-[#1b2b3d] flex items-center justify-center overflow-hidden shadow-inner aspect-square ${className}`}
      >
        <img
          src={icon}
          alt={name}
          className="w-full h-full object-cover block"
          loading="eager"
          decoding="async"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // 3. Fallback: initials badge
  const initials = (name || 'GB')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'GB';

  return (
    <div
      className={`relative shrink-0 rounded-2xl bg-gradient-to-br from-[#0c2438] via-[#091827] to-[#06111c] border border-[#1b2b3d] flex items-center justify-center overflow-hidden shadow-inner aspect-square ${className}`}
    >
      <span className="text-sm sm:text-base font-black text-[#38bdf8] tracking-wider select-none">
        {initials}
      </span>
    </div>
  );
};
