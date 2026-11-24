import { useEffect } from 'react';
import {
  playBackSfx,
  playConfirmSfx,
  playStepTickSfx,
  playTabSwitchSfx,
} from '../audio/uiSoundEngine';
import { useGamepadStore } from './gamepadStore';
import {
  focusInitialElementInScope,
  moveSpatialFocus,
  NavDirection,
  recordFocusedElement,
  triggerShortcutElement,
} from './spatialNavigator';

function inferFocusHint(el: HTMLElement | null): string | null {
  if (!el || el === document.body) return null;
  if (el.dataset.focusLabel) return el.dataset.focusLabel;
  if (el.dataset.consoleStepper === 'true') return 'MUDAR OPÇÃO (◄ / ►)';
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  if (text.length > 0 && text.length <= 28) return text.toUpperCase();
  return 'CONFIRMAR';
}

export function useGlobalGamepadController(depsForAutoFocus: unknown[]): void {
  const { setPadDetected, setKeyboardUsed, setFocusedHint } = useGamepadStore();
  const scopeKey = depsForAutoFocus.slice(0, 2).map(String).join(':');

  // Auto-foca ou restaura a memória de foco sempre que troca de tela, aba ou modal
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (document.documentElement.dataset.inputMode === 'gamepad') {
        focusInitialElementInScope(scopeKey);
        setFocusedHint(inferFocusHint(document.activeElement as HTMLElement | null));
      }
    }, 40);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, depsForAutoFocus);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      recordFocusedElement(target);
      setFocusedHint(inferFocusHint(target));
    };

    const onMouseDown = () => {
      if (!useGamepadStore.getState().padConnected) {
        delete document.documentElement.dataset.inputMode;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[data-pitch-3d-active="true"]')) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const typingInInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        if (typingInInput && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
        e.preventDefault();
        setKeyboardUsed();
        const map: Record<string, NavDirection> = {
          ArrowUp: 'UP',
          ArrowDown: 'DOWN',
          ArrowLeft: 'LEFT',
          ArrowRight: 'RIGHT',
        };
        moveSpatialFocus(map[e.key]);
      } else if (!typingInInput && (e.key === 'Enter' || e.key === ' ')) {
        playConfirmSfx();
      } else if (!typingInInput && e.key === 'Escape') {
        playBackSfx();
      } else if (!typingInInput && (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E')) {
        playTabSwitchSfx();
      } else if (!typingInInput && (e.key === 'y' || e.key === 'Y')) {
        triggerShortcutElement('data-pad-y');
      } else if (!typingInInput && (e.key === 'x' || e.key === 'X')) {
        triggerShortcutElement('data-pad-x');
      } else if (!typingInInput && e.key === '[') {
        triggerShortcutElement('data-pad-lt');
      } else if (!typingInInput && e.key === ']') {
        triggerShortcutElement('data-pad-rt');
      } else if (!typingInInput && (e.key === 'PageDown' || e.key === 'PageUp')) {
        const scroller = document.querySelector<HTMLElement>('[data-rs-scroll="true"]');
        if (scroller) {
          e.preventDefault();
          scroller.scrollBy({ top: e.key === 'PageDown' ? 220 : -220, behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);

    const prevBtns = new Array<boolean>(18).fill(false);
    let heldDir: NavDirection | null = null;
    let nextRepeatMs = 0;
    let rafId = 0;

    const pollGamepad = (now: number) => {
      if (document.querySelector('[data-pitch-3d-active="true"]')) {
        rafId = requestAnimationFrame(pollGamepad);
        return;
      }
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      const gp = pads.find((p): p is Gamepad => Boolean(p && p.connected));

      if (gp) {
        const anyPressed =
          gp.buttons.some((b) => b.pressed) || gp.axes.some((ax) => Math.abs(ax) > 0.45);
        if (anyPressed) {
          setPadDetected(gp.id);
        }

        const justPressed = (idx: number) => Boolean(gp.buttons[idx]?.pressed) && !prevBtns[idx];

        // A / Cross -> Confirmar!
        if (justPressed(0)) {
          const active = document.activeElement as HTMLElement | null;
          if (active && active !== document.body) {
            if (active.dataset.consoleStepper === 'true') {
              playStepTickSfx();
              active.dispatchEvent(new CustomEvent('console-step', { detail: 1 }));
            } else {
              playConfirmSfx();
              active.click();
            }
          } else {
            focusInitialElementInScope();
          }
        }

        // B / Circle -> Voltar!
        if (justPressed(1)) {
          playBackSfx();
          const active = document.activeElement as HTMLElement | null;
          if (active && active.tagName === 'INPUT') {
            active.blur();
          } else if (!triggerShortcutElement('data-pad-back')) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          }
        }

        // X / Square & Y / Triangle
        if (justPressed(2)) triggerShortcutElement('data-pad-x');
        if (justPressed(3)) triggerShortcutElement('data-pad-y');

        // LB / RB -> Abas principais!
        if (justPressed(4)) {
          playTabSwitchSfx();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
        }
        if (justPressed(5)) {
          playTabSwitchSfx();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
        }

        // LT / RT -> Sub-abas ou mensagens da Caixa de Entrada!
        if (justPressed(6)) triggerShortcutElement('data-pad-lt');
        if (justPressed(7)) triggerShortcutElement('data-pad-rt');

        // D-Pad + Analógico Esquerdo com trava direcional limpa (evita drift diagonal!)
        const axX = gp.axes[0] ?? 0;
        const axY = gp.axes[1] ?? 0;
        let dir: NavDirection | null = null;
        if (gp.buttons[12]?.pressed) dir = 'UP';
        else if (gp.buttons[13]?.pressed) dir = 'DOWN';
        else if (gp.buttons[14]?.pressed) dir = 'LEFT';
        else if (gp.buttons[15]?.pressed) dir = 'RIGHT';
        else if (Math.abs(axY) > 0.52 || Math.abs(axX) > 0.52) {
          if (Math.abs(axY) >= Math.abs(axX)) {
            dir = axY < 0 ? 'UP' : 'DOWN';
          } else {
            dir = axX < 0 ? 'LEFT' : 'RIGHT';
          }
        }

        if (dir) {
          if (dir !== heldDir) {
            heldDir = dir;
            nextRepeatMs = now + 240;
            moveSpatialFocus(dir);
          } else if (now >= nextRepeatMs) {
            nextRepeatMs = now + 110;
            moveSpatialFocus(dir);
          }
        } else {
          heldDir = null;
        }

        // Analógico Direito (RS: axes 2, 3) -> Rolagem suave de listas ou Rotação 3D / Mapa!
        const rsX = gp.axes[2] ?? 0;
        const rsY = gp.axes[3] ?? 0;
        if (Math.abs(rsX) > 0.22 || Math.abs(rsY) > 0.22) {
          window.dispatchEvent(
            new CustomEvent('gamepad-rs-move', {
              detail: {
                dx: Math.abs(rsX) > 0.22 ? rsX : 0,
                dy: Math.abs(rsY) > 0.22 ? rsY : 0,
              },
            }),
          );
          const scroller = document.querySelector<HTMLElement>('[data-rs-scroll="true"]');
          if (scroller && Math.abs(rsY) > 0.22) {
            scroller.scrollTop += rsY * 12;
          }
        }

        for (let i = 0; i < Math.min(18, gp.buttons.length); i++) {
          prevBtns[i] = Boolean(gp.buttons[i]?.pressed);
        }
      }

      rafId = requestAnimationFrame(pollGamepad);
    };

    rafId = requestAnimationFrame(pollGamepad);
    return () => {
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, [setFocusedHint, setKeyboardUsed, setPadDetected]);
}
