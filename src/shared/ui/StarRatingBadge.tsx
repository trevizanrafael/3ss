import React from 'react';
import { Star } from 'lucide-react';
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
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;

  return (
    <div className="inline-flex items-center gap-1">
      {[1, 2, 3].map((idx) => {
        const filled = idx <= stars;
        return (
          <Star
            key={idx}
            size={iconSize}
            className={
              filled
                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]'
                : 'fill-slate-800 text-slate-600'
            }
          />
        );
      })}
      {showLabel && (
        <span className="ml-1.5 text-xs font-semibold text-amber-300">
          {stars}/3 Estrelas
        </span>
      )}
    </div>
  );
};
