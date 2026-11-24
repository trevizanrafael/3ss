import React, { useEffect, useRef } from 'react';

export interface StepperOption<T extends string | number> {
  value: T;
  label: string;
  subLabel?: string;
  leadingVisual?: React.ReactNode;
  colorSwatch?: string;
}

interface ConsoleStepperProps<T extends string | number> {
  label?: string;
  options: StepperOption<T>[];
  value: T;
  onChange: (next: T) => void;
  compact?: boolean;
  autoFocus?: boolean;
  onFocusRow?: () => void;
}

export function ConsoleStepper<T extends string | number>({
  label,
  options,
  value,
  onChange,
  compact = false,
  autoFocus = false,
  onFocusRow,
}: ConsoleStepperProps<T>) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[idx] ?? options[0];

  const stepBy = (delta: -1 | 1) => {
    if (options.length === 0) return;
    const nextIdx = (idx + delta + options.length) % options.length;
    onChange(options[nextIdx].value);
  };

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const onStep = (ev: Event) => {
      const dir = (ev as CustomEvent<-1 | 1>).detail;
      stepBy(dir);
    };
    el.addEventListener('console-step', onStep);
    return () => el.removeEventListener('console-step', onStep);
  });

  return (
    <div className="w-full">
      {label && (
        <div className="text-[11px] uppercase tracking-widest text-[#9498A3] mb-1 font-medium">
          {label}
        </div>
      )}
      <div
        ref={barRef}
        tabIndex={0}
        data-focusable="true"
        data-console-stepper="true"
        data-autofocus={autoFocus ? 'true' : undefined}
        onFocus={onFocusRow}
        className={`group flex items-center justify-between bg-[#0E0F12] border border-[#242730] hover:border-[#C8A45D] focus:border-[#C8A45D] focus:bg-[#151820] transition-colors outline-none ${
          compact ? 'h-9' : 'h-11'
        }`}
      >
        <button
          type="button"
          tabIndex={-1}
          data-nav-ignore="true"
          onClick={() => stepBy(-1)}
          className="h-full px-3.5 text-[#9498A3] group-focus:text-[#C8A45D] hover:text-[#F5F5F7] hover:bg-[#191B20] font-condensed text-lg font-bold cursor-pointer"
          aria-label="Anterior"
        >
          ‹
        </button>

        <div
          onClick={() => stepBy(1)}
          className="flex-1 flex items-center justify-center gap-2.5 px-2 truncate cursor-pointer min-w-0"
        >
          {current?.leadingVisual && (
            <span className="shrink-0 flex items-center">{current.leadingVisual}</span>
          )}
          {current?.colorSwatch && (
            <span
              className="w-5 h-3.5 border border-[#3A3E4A] shrink-0"
              style={{ backgroundColor: current.colorSwatch }}
            />
          )}
          <span className="font-condensed uppercase font-bold tracking-wider text-base text-[#F5F5F7] truncate">
            {current?.label}
          </span>
          {current?.subLabel && (
            <span className="text-[11px] text-[#9498A3] shrink-0 hidden sm:inline">
              {current.subLabel}
            </span>
          )}
        </div>

        <button
          type="button"
          tabIndex={-1}
          data-nav-ignore="true"
          onClick={() => stepBy(1)}
          className="h-full px-3.5 text-[#9498A3] group-focus:text-[#C8A45D] hover:text-[#F5F5F7] hover:bg-[#191B20] font-condensed text-lg font-bold cursor-pointer"
          aria-label="Próximo"
        >
          ›
        </button>
      </div>
    </div>
  );
}
