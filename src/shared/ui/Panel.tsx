import React from 'react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  rightSlot,
  children,
  className = '',
}) => {
  return (
    <section
      className={`rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-sm p-5 shadow-lg ${className}`}
    >
      {(title || rightSlot) && (
        <header className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-800/80">
          <div>
            {title && (
              <h2 className="text-xl font-bold text-slate-100 tracking-wide">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {rightSlot && <div>{rightSlot}</div>}
        </header>
      )}
      {children}
    </section>
  );
};
