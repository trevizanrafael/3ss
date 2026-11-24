export interface StepperOption<T extends string | number> {
  value: T;
  label: string;
  subLabel?: string;
}

interface ConsoleStepperProps<T extends string | number> {
  label?: string;
  options: StepperOption<T>[];
  value: T;
  onChange: (next: T) => void;
  compact?: boolean;
}

export function ConsoleStepper<T extends string | number>({
  label,
  options,
  value,
  onChange,
  compact = false,
}: ConsoleStepperProps<T>) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const current = options[idx] ?? options[0];

  const handlePrev = () => {
    const prevIdx = (idx - 1 + options.length) % options.length;
    onChange(options[prevIdx].value);
  };

  const handleNext = () => {
    const nextIdx = (idx + 1) % options.length;
    onChange(options[nextIdx].value);
  };

  return (
    <div className="w-full">
      {label && (
        <div className="text-[11px] uppercase tracking-widest text-[#9498A3] mb-1.5 font-medium">
          {label}
        </div>
      )}
      <div
        className={`flex items-center justify-between bg-[#0E0F12] border border-[#242730] hover:border-[#C8A45D] transition-colors ${
          compact ? 'h-9' : 'h-11'
        }`}
      >
        <button
          type="button"
          onClick={handlePrev}
          className="h-full px-3.5 text-[#9498A3] hover:text-[#F5F5F7] hover:bg-[#191B20] font-condensed text-lg font-bold cursor-pointer"
          aria-label="Anterior"
        >
          ‹
        </button>

        <div className="flex-1 text-center px-2 truncate">
          <span className="font-condensed uppercase font-bold tracking-wider text-base text-[#F5F5F7]">
            {current?.label}
          </span>
          {current?.subLabel && (
            <span className="ml-2 text-[11px] text-[#9498A3]">{current.subLabel}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="h-full px-3.5 text-[#9498A3] hover:text-[#F5F5F7] hover:bg-[#191B20] font-condensed text-lg font-bold cursor-pointer"
          aria-label="Próximo"
        >
          ›
        </button>
      </div>
    </div>
  );
}
