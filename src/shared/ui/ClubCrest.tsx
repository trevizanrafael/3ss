import React, { useState } from 'react';
import { CLUB_CREST_URLS } from '../../data/clubs/crestUrls';

interface ClubCrestProps {
  clubId: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  pattern?: 'stripes' | 'hoops' | 'halves' | 'diagonal' | 'solid';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_MAP = {
  sm: 'w-6 h-6 text-[9px]',
  md: 'w-9 h-9 text-[11px]',
  lg: 'w-14 h-14 text-sm',
  xl: 'w-20 h-20 text-base',
};

export const ClubCrest: React.FC<ClubCrestProps> = ({
  clubId,
  shortName,
  primaryColor,
  secondaryColor,
  pattern = 'stripes',
  size = 'md',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const crestUrl = CLUB_CREST_URLS[clubId];

  if (crestUrl && !imgFailed) {
    return (
      <div className={`${SIZE_MAP[size]} shrink-0 flex items-center justify-center select-none`}>
        <img
          src={crestUrl}
          alt={shortName}
          className="w-full h-full object-contain drop-shadow-md"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  const gradId = `crest-${clubId}-${size}`;

  return (
    <div className={`${SIZE_MAP[size]} shrink-0 relative flex items-center justify-center select-none`}>
      <svg viewBox="0 0 64 72" className="w-full h-full drop-shadow-md">
        <defs>
          {pattern === 'stripes' && (
            <pattern id={gradId} width="16" height="72" patternUnits="userSpaceOnUse">
              <rect width="8" height="72" fill={primaryColor} />
              <rect x="8" width="8" height="72" fill={secondaryColor} />
            </pattern>
          )}
          {pattern === 'hoops' && (
            <pattern id={gradId} width="64" height="16" patternUnits="userSpaceOnUse">
              <rect width="64" height="8" fill={primaryColor} />
              <rect y="8" width="64" height="8" fill={secondaryColor} />
            </pattern>
          )}
          {pattern === 'halves' && (
            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
              <stop offset="50%" stopColor={primaryColor} />
              <stop offset="50%" stopColor={secondaryColor} />
            </linearGradient>
          )}
          {pattern === 'diagonal' && (
            <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
              <stop offset="44%" stopColor={primaryColor} />
              <stop offset="44%" stopColor={secondaryColor} />
              <stop offset="56%" stopColor={secondaryColor} />
              <stop offset="56%" stopColor={primaryColor} />
            </linearGradient>
          )}
        </defs>
        <path
          d="M8 6 H56 V34 C56 52 32 66 32 66 C32 66 8 52 8 34 Z"
          fill={pattern === 'solid' ? primaryColor : `url(#${gradId})`}
          stroke="#e2e8f0"
          strokeWidth="3"
        />
        <rect x="10" y="25" width="44" height="18" rx="3" fill="rgba(6,10,18,0.82)" />
        <text
          x="32"
          y="38"
          textAnchor="middle"
          fill="#f8fafc"
          fontWeight="800"
          fontSize="13"
          fontFamily="Rajdhani, Inter, sans-serif"
        >
          {shortName.slice(0, 3).toUpperCase()}
        </text>
      </svg>
    </div>
  );
};
