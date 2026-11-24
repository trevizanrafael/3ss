import React from 'react';
import { StarRating } from '../types/common';

interface StarRatingBadgeProps {
  stars: StarRating;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const StarRatingBadge: React.FC<StarRatingBadgeProps> = ({
  stars,
  size = 'md',
  showLabel = false,
}) => {
  const px = size === 'sm' ? 13 : size === 'lg' ? 22 : 16;

  return (
    <div className="inline-flex items-center gap-1.5">
      {[1, 2, 3].map((idx) => {
        const filled = idx <= stars;
        return (
          <svg
            key={idx}
            width={px}
            height={px}
            viewBox="0 0 24 24"
            className="shrink-0"
          >
            <polygon
              points="12,2 15.1,8.5 22.2,9.3 17,14.2 18.4,21.2 12,17.7 5.6,21.2 7,14.2 1.8,9.3 8.9,8.5"
              fill={filled ? '#C8A45D' : '#1E2026'}
              stroke={filled ? '#DFC07F' : '#323640'}
              strokeWidth="1.5"
            />
          </svg>
        );
      })}
      {showLabel && (
        <span className="ml-1 font-condensed uppercase font-bold tracking-wider text-xs text-[#C8A45D]">
          {stars} / 3 ESTRELAS
        </span>
      )}
    </div>
  );
};
