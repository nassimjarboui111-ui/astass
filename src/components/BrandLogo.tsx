import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
      <img
        src="/assets/aistudio/Logo_futuriste_ASTASECURE_sur_fond_noir_581a41ea.png"
        alt="AstaSecure official logo"
        referrerPolicy="no-referrer"
        className={compact ? 'h-9 w-9 object-contain rounded-md bg-black' : 'h-10 w-10 object-contain rounded-md bg-black'}
      />
      <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
        ASTASECURE
      </span>
    </div>
  );
};
