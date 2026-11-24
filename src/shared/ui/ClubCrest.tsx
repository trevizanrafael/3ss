import React, { useState } from 'react';
import { getClubById, hasClubId } from '../../data/clubs';

interface ClubCrestProps {
  clubId: string;
  shortName?: string;
  primaryColor?: string;
  secondaryColor?: string;
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
  size = 'md',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const club = hasClubId(clubId) ? getClubById(clubId) : null;
  const crestUrl = club?.crestUrl ?? '';
  const abbr = (shortName ?? club?.shortName ?? 'CLB').slice(0, 3).toUpperCase();
  const c1 = primaryColor ?? club?.primaryColor ?? '#1A1C22';
  const c2 = secondaryColor ?? club?.secondaryColor ?? '#C8A45D';

  if (crestUrl && !imgFailed) {
    return (
      <div className={`${SIZE_MAP[size]} shrink-0 flex items-center justify-center select-none`}>
        <img
          src={crestUrl}
          alt={abbr}
          className="w-full h-full object-contain drop-shadow-md"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className={`${SIZE_MAP[size]} shrink-0 relative flex items-center justify-center select-none`}>
      <svg viewBox="0 0 64 72" className="w-full h-full">
        <path
          d="M8 6 H56 V34 C56 52 32 66 32 66 C32 66 8 52 8 34 Z"
          fill={c1}
          stroke={c2}
          strokeWidth="3"
        />
        <rect x="10" y="25" width="44" height="18" fill="rgba(11,11,13,0.86)" />
        <text
          x="32"
          y="38"
          textAnchor="middle"
          fill="#f5f5f7"
          fontWeight="800"
          fontSize="13"
          fontFamily="Barlow Condensed, sans-serif"
        >
          {abbr}
        </text>
      </svg>
    </div>
  );
};
