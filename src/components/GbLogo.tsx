import React from 'react';

interface GbLogoProps {
  className?: string;
  size?: number;
}

export const GB_LOGO_WEBP = '/gb-logo.webp';
export const GB_LOGO_PNG = '/gb-logo.png';
export const GB_LOGO_REMOTE = 'https://i.ibb.co/Q3g9fGSt/1791541921524.png';

export const GbLogo: React.FC<GbLogoProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative shrink-0 select-none overflow-hidden rounded-2xl bg-[#091522] ${className}`}>
      <picture>
        <source srcSet={GB_LOGO_WEBP} type="image/webp" />
        <source srcSet={GB_LOGO_PNG} type="image/png" />
        <img
          src={GB_LOGO_WEBP}
          alt="GB STUDY"
          className="w-full h-full object-contain block"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== GB_LOGO_REMOTE) {
              target.src = GB_LOGO_REMOTE;
            }
          }}
        />
      </picture>
    </div>
  );
};
