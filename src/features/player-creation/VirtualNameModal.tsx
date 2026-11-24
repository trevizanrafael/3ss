import React, { useEffect, useState } from 'react';
import { GamepadBadge } from '../../shared/gamepad/GamepadBadge';
import { focusInitialElementInScope } from '../../shared/gamepad/spatialNavigator';

interface VirtualNameModalProps {
  title: string;
  initialValue: string;
  maxLength: number;
  uppercaseOnly?: boolean;
  onConfirm: (nextVal: string) => void;
  onClose: () => void;
}

const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Á', 'É', 'Ã'],
];

export const VirtualNameModal: React.FC<VirtualNameModalProps> = ({
  title,
  initialValue,
  maxLength,
  uppercaseOnly = false,
  onConfirm,
  onClose,
}) => {
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (document.documentElement.dataset.inputMode === 'gamepad') {
        focusInitialElementInScope();
      }
    }, 35);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      // Permite digitar direto no teclado físico sem precisar clicar em input!
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'Backspace') {
        setDraft((curr) => curr.slice(0, -1));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '[' || e.key === ']') return;
        setDraft((curr) => {
          if (curr.length >= maxLength) return curr;
          const nextChar = uppercaseOnly
            ? e.key.toUpperCase()
            : curr.length === 0 || curr.endsWith(' ')
              ? e.key.toUpperCase()
              : e.key.toLowerCase();
          return curr + nextChar;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [maxLength, onClose, uppercaseOnly]);

  const appendChar = (ch: string) => {
    setDraft((curr) => {
      if (curr.length >= maxLength) return curr;
      const formatted = uppercaseOnly
        ? ch.toUpperCase()
        : curr.length === 0 || curr.endsWith(' ')
          ? ch.toUpperCase()
          : ch.toLowerCase();
      return curr + formatted;
    });
  };

  const commitAndClose = () => {
    onConfirm(draft.trim());
    onClose();
  };

  return (
    <div
      data-modal-scope="true"
      className="fixed inset-0 z-50 bg-[#0B0B0D]/88 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div className="console-tile border-t-[4px] border-t-[#C8A45D] w-full max-w-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#242730] pb-3">
          <div>
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#C8A45D] font-bold">
              EDITOR DE IDENTIDADE • TECLADO OU CONTROLE
            </span>
            <h3 className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] mt-0.5">
              {title}
            </h3>
          </div>
          <span className="text-xs font-condensed text-[#9498A3] tabular-nums">
            {draft.length} / {maxLength}
          </span>
        </div>

        {/* Visor Principal (também editável por clique no PC) */}
        <input
          type="text"
          data-nav-ignore="true"
          value={draft}
          maxLength={maxLength}
          autoFocus={document.documentElement.dataset.inputMode !== 'gamepad'}
          onChange={(e) =>
            setDraft(uppercaseOnly ? e.target.value.toUpperCase() : e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitAndClose();
            }
          }}
          className="w-full h-14 bg-[#08090C] border-2 border-[#C8A45D] px-4 font-condensed font-extrabold text-3xl tracking-wider text-[#F5F5F7] outline-none"
        />

        {/* Grade QWERTY para Controle (Xbox / PlayStation) */}
        <div className="space-y-1.5">
          {KEY_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-10 gap-1.5">
              {row.map((letter, cIdx) => (
                <button
                  key={letter}
                  type="button"
                  data-focusable="true"
                  data-autofocus={rIdx === 0 && cIdx === 0 ? 'true' : undefined}
                  onClick={() => appendChar(letter)}
                  className="h-10 bg-[#14161D] hover:bg-[#222632] focus:bg-[#C8A45D] focus:text-[#0B0B0D] border border-[#242730] font-condensed font-extrabold text-lg text-[#F5F5F7] cursor-pointer outline-none"
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-12 gap-1.5 pt-1">
            {!uppercaseOnly && (
              <button
                type="button"
                data-focusable="true"
                onClick={() => appendChar(' ')}
                className="col-span-4 h-10 bg-[#14161D] hover:bg-[#222632] focus:bg-[#C8A45D] focus:text-[#0B0B0D] border border-[#242730] font-condensed uppercase font-bold text-sm tracking-widest text-[#F5F5F7] cursor-pointer outline-none"
              >
                ESPAÇO
              </button>
            )}
            <button
              type="button"
              data-focusable="true"
              data-pad-x="true"
              onClick={() => setDraft((curr) => curr.slice(0, -1))}
              className={`${uppercaseOnly ? 'col-span-4' : 'col-span-3'} h-10 bg-[#14161D] hover:bg-[#222632] focus:bg-[#C8A45D] focus:text-[#0B0B0D] border border-[#242730] font-condensed uppercase font-bold text-xs tracking-wider text-[#F5F5F7] inline-flex items-center justify-center gap-1.5 cursor-pointer outline-none`}
            >
              <GamepadBadge action="ALT_X" />
              <span>APAGAR</span>
            </button>
            <button
              type="button"
              data-focusable="true"
              onClick={() => setDraft('')}
              className={`${uppercaseOnly ? 'col-span-3' : 'col-span-2'} h-10 bg-[#14161D] hover:bg-[#222632] focus:bg-[#C94040] focus:text-[#F5F5F7] border border-[#242730] font-condensed uppercase font-bold text-xs tracking-wider text-[#9498A3] cursor-pointer outline-none`}
            >
              LIMPAR
            </button>
            <button
              type="button"
              data-focusable="true"
              data-pad-y="true"
              onClick={commitAndClose}
              className={`${uppercaseOnly ? 'col-span-5' : 'col-span-3'} h-10 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-sm tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer outline-none`}
            >
              <GamepadBadge action="ALT_Y" darkText />
              <span>SALVAR</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#242730] text-[11px] uppercase tracking-widest text-[#9498A3]">
          <span>DIGITE NO TECLADO OU USE O D-PAD DO CONTROLE</span>
          <button
            type="button"
            data-pad-back="true"
            data-nav-ignore="true"
            onClick={onClose}
            className="cursor-pointer"
          >
            <GamepadBadge action="BACK" label="CANCELAR" />
          </button>
        </div>
      </div>
    </div>
  );
};
