import React from 'react';
import { ConsoleActionKey, PadBrand, useGamepadStore } from './gamepadStore';

interface GlyphSpec {
  text: string;
  color: string;
}

const GLYPHS: Record<PadBrand, Record<ConsoleActionKey, GlyphSpec>> = {
  XBOX: {
    CONFIRM: { text: 'A', color: '#2DBE60' },
    BACK: { text: 'B', color: '#C94040' },
    ALT_X: { text: 'X', color: '#3B82F6' },
    ALT_Y: { text: 'Y', color: '#EAB308' },
    LB: { text: 'LB', color: '#9498A3' },
    RB: { text: 'RB', color: '#9498A3' },
    LT: { text: 'LT', color: '#9498A3' },
    RT: { text: 'RT', color: '#9498A3' },
    RS: { text: 'RS', color: '#C8A45D' },
  },
  PLAYSTATION: {
    CONFIRM: { text: '✕', color: '#60A5FA' },
    BACK: { text: '○', color: '#F87171' },
    ALT_X: { text: '□', color: '#F472B6' },
    ALT_Y: { text: '△', color: '#34D399' },
    LB: { text: 'L1', color: '#9498A3' },
    RB: { text: 'R1', color: '#9498A3' },
    LT: { text: 'L2', color: '#9498A3' },
    RT: { text: 'R2', color: '#9498A3' },
    RS: { text: 'R3', color: '#C8A45D' },
  },
  KEYBOARD: {
    CONFIRM: { text: 'ENTER', color: '#F5F5F7' },
    BACK: { text: 'ESC', color: '#9498A3' },
    ALT_X: { text: 'X', color: '#3B82F6' },
    ALT_Y: { text: 'Y', color: '#EAB308' },
    LB: { text: 'Q', color: '#9498A3' },
    RB: { text: 'E', color: '#9498A3' },
    LT: { text: '[', color: '#9498A3' },
    RT: { text: ']', color: '#9498A3' },
    RS: { text: 'PGUP/DN', color: '#C8A45D' },
  },
};

interface GamepadBadgeProps {
  action: ConsoleActionKey;
  label?: string;
  darkText?: boolean;
}

export const GamepadBadge: React.FC<GamepadBadgeProps> = ({
  action,
  label,
  darkText = false,
}) => {
  const { brand } = useGamepadStore();
  const g = GLYPHS[brand][action];

  return (
    <span className="inline-flex items-center gap-1.5 select-none">
      <span
        style={{ borderColor: g.color, color: g.color }}
        className="inline-flex items-center justify-center min-w-[1.375rem] h-[1.25rem] px-1.5 bg-[#0B0B0D] border font-condensed font-extrabold text-[11px] leading-none tracking-wider"
      >
        {g.text}
      </span>
      {label && (
        <span
          className={`font-condensed uppercase font-bold text-xs tracking-wider ${
            darkText ? 'text-[#0B0B0D]' : 'text-[#9498A3]'
          }`}
        >
          {label}
        </span>
      )}
    </span>
  );
};
