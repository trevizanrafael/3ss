import React from 'react';

export function getFifaStatColor(value: number): string {
  if (value >= 80) return '#2DBE60'; // Elite Green
  if (value >= 65) return '#B8C93A'; // Good Lime-Yellow
  if (value >= 50) return '#D9822B'; // Average Orange
  return '#C94040';                  // Weak Red
}

interface FifaStatBadgeProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
}

export const FifaStatBadge: React.FC<FifaStatBadgeProps> = ({ value, size = 'md' }) => {
  const color = getFifaStatColor(value);
  const sizeCls =
    size === 'lg'
      ? 'w-11 h-9 text-2xl'
      : size === 'sm'
        ? 'w-7 h-6 text-sm'
        : 'w-8 h-7 text-base';

  return (
    <span
      className={`${sizeCls} inline-flex items-center justify-center font-condensed font-extrabold tabular-nums text-[#0B0B0D]`}
      style={{ backgroundColor: color }}
    >
      {value}
    </span>
  );
};
