import React, { useState } from 'react';
import { Shield } from 'lucide-react';

interface MediaFrameProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
  imgClassName?: string;
  overlayClassName?: string;
}

export const MediaFrame: React.FC<MediaFrameProps> = ({
  src,
  alt,
  fallbackTitle,
  className = '',
  imgClassName = 'w-full h-full object-cover',
  overlayClassName = '',
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-[#0D1628] ${className}`}>
      {!failed ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
          className={imgClassName}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-[#0D1628] via-[#091221] to-[#060B14] text-center">
          <div className="h-11 w-11 rounded-lg bg-[#00C8E8]/10 border border-[#00C8E8]/30 flex items-center justify-center text-[#22D3EE]">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-sm font-medium text-slate-300">{fallbackTitle}</span>
        </div>
      )}
      {overlayClassName ? <div className={overlayClassName} aria-hidden="true" /> : null}
    </div>
  );
};
