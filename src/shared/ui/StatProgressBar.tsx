import React from 'react';
import { getOvrBadgeStyle } from '../utils/formatters';

interface StatProgressBarProps {
  label: string;
  value: number;
  progressPct: number;
  isFocused?: boolean;
  onToggleFocus?: () => void;
}

export const StatProgressBar: React.FC<StatProgressBarProps> = ({
  label,
  value,
  progressPct,
  isFocused = false,
  onToggleFocus,
}) => {
  return (
    <div
      onClick={onToggleFocus}
      className={`rounded-xl border p-3 transition-all ${
        onToggleFocus ? 'cursor-pointer hover:border-emerald-500/50' : ''
      } ${
        isFocused
          ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
          : 'bg-slate-900/70 border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">{label}</span>
          {isFocused && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
              Em Foco
            </span>
          )}
        </div>
        <span
          className={`px-2 py-0.5 text-xs font-bold rounded border tabular-nums ${getOvrBadgeStyle(
            value,
          )}`}
        >
          {value}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isFocused ? 'bg-emerald-400' : 'bg-sky-500/70'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400 tabular-nums">
        <span>Próximo nível ({Math.min(99, value + 1)})</span>
        <span>{Math.floor(progressPct)}%</span>
      </div>
    </div>
  );
};
