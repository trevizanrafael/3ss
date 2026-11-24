import { useEffect } from 'react';
import { useGamepadStore } from './gamepadStore';
import {
  focusInitialElementInScope,
  moveSpatialFocus,
  NavDirection,
  triggerShortcutElement,
} from './spatialNavigator';

/**
 * Motor Global de Controle (W3C Standard Gamepad + Setas do Teclado):
 * - D-Pad / Analógico Esquerdo (LS): navegação espacial 2D + troca rápida em seletores ‹ Opção ›
 * - A / ✕ (botão 0): confirma / clica no item focado
 * - B / ○ (botão 1): voltar / fechar modal / parar simulação
 * - X / □ (botão 2): ação secundária contextual ([data-pad-x="true"])
 * - Y / △ (botão 3): ação principal rápida ([data-pad-y="true"])
 * - LB / RB (4 / 5): abas principais ([data-pad-lb] / evento global)
 * - LT / RT (6 / 7): sub-abas / filtros / zoom ([data-pad-lt] / [data-pad-rt])
 * - Analógico Direito (RS): rolagem suave de listas ([data-rs-scroll="true"]) ou pan no mapa
 */
export function useGlobalGamepadController(depsForAutoFocus: unknown[]): void {
  const { setPadDetected, setKeyboardUsed } = useGamepadStore();

  // Auto-foca o elemento principal sempre que troca de tela, aba ou modal
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (document.documentElement.dataset.inputMode === 'gamepad') {
        focusInitialElementInScope();
      }
    }, 45);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, depsForAutoFocus);

  useEffect(() => {
    const onMouseDown = () => {
      delete document.documentElement.dataset.inputMode;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const typingInInput = tag === 'INPUT' || tag === 'TEXTAREA';

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
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
      } else if (!typingInInput && (e.key === 'y' || e.key === 'Y')) {
        triggerShortcutElement('data-pad-y');
      } else if (!typingInInput && (e.key === 'x' || e.key === 'X')) {
        triggerShortcutElement('data-pad-x');
      } else if (!typingInInput && e.key === '[') {
        triggerShortcutElement('data-pad-lt');
      } else if (!typingInInput && e.key === ']') {
        triggerShortcutElement('data-pad-rt');
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);

    const prevBtns = new Array<boolean>(18).fill(false);
    let heldDir: NavDirection | null = null;
    let nextRepeatMs = 0;
    let rafId = 0;

    const pollGamepad = (now: number) => {
      const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
      const gp = pads.find((p): p is Gamepad => Boolean(p && p.connected));

      if (gp) {
        const anyPressed = gp.buttons.some((b) => b.pressed) || gp.axes.some((ax) => Math.abs(ax) > 0.45);
        if (anyPressed) {
          setPadDetected(gp.id);
        }

        const justPressed = (idx: number) => Boolean(gp.buttons[idx]?.pressed) && !prevBtns[idx];

        // A / Cross -> Click no item focado!
        if (justPressed(0)) {
          const active = document.activeElement as HTMLElement | null;
          if (active && active !== document.body) {
            if (active.dataset.consoleStepper === 'true') {
              active.dispatchEvent(new CustomEvent('console-step', { detail: 1 }));
            } else {
              active.click();
            }
          } else {
            focusInitialElementInScope();
          }
        }

        // B / Circle -> Ação de voltar contextual ou Escape
        if (justPressed(1)) {
          const active = document.activeElement as HTMLElement | null;
          if (active && active.tagName === 'INPUT') {
            active.blur();
          } else if (!triggerShortcutElement('data-pad-back')) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          }
        }

        // X / Square & Y / Triangle -> Atalhos contextuais estilo FIFA
        if (justPressed(2)) triggerShortcutElement('data-pad-x');
        if (justPressed(3)) triggerShortcutElement('data-pad-y');

        // LB / RB -> Abas principais (dispara Q / E já escutados nas telas!)
        if (justPressed(4)) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
        if (justPressed(5)) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));

        // LT / RT -> Sub-abas ou filtros rápidos
        if (justPressed(6)) triggerShortcutElement('data-pad-lt');
        if (justPressed(7)) triggerShortcutElement('data-pad-rt');

        // D-Pad (12..15) + Analógico Esquerdo (axes 0, 1) com repetição suave de console
        const axX = gp.axes[0] ?? 0;
        const axY = gp.axes[1] ?? 0;
        let dir: NavDirection | null = null;
        if (gp.buttons[12]?.pressed || axY < -0.52) dir = 'UP';
        else if (gp.buttons[13]?.pressed || axY > 0.52) dir = 'DOWN';
        else if (gp.buttons[14]?.pressed || axX < -0.52) dir = 'LEFT';
        else if (gp.buttons[15]?.pressed || axX > 0.52) dir = 'RIGHT';

        if (dir) {
          if (dir !== heldDir) {
            heldDir = dir;
            nextRepeatMs = now + 250;
            moveSpatialFocus(dir);
          } else if (now >= nextRepeatMs) {
            nextRepeatMs = now + 115;
            moveSpatialFocus(dir);
          }
        } else {
          heldDir = null;
        }

        // Analógico Direito (RS: axes 2, 3) -> Rolagem suave de elencos/listas ou Evento de Pan no Mapa!
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
            scroller.scrollTop += rsY * 11;
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
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      cancelAnimationFrame(rafId);
    };
  }, [setKeyboardUsed, setPadDetected]);
}
