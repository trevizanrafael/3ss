import { useEffect } from 'react';
import {
  playBackSfx,
  playConfirmSfx,
  playStepTickSfx,
  playTabSwitchSfx,
} from '../audio/uiSoundEngine';
import {
  attachGamepadConnectionListeners,
  readNormalizedGamepad,
} from './gamepadHardware';
import { useGamepadStore } from './gamepadStore';
import {
  focusInitialElementInScope,
   getVisibleFocusables,
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

interface PrevPadButtons {
  south: boolean;
  east: boolean;
  west: boolean;
  north: boolean;
  lb: boolean;
  rb: boolean;
  lt: boolean;
  rt: boolean;
  start: boolean;
}

export function useGlobalGamepadController(depsForAutoFocus: unknown[]): void {
  const { setKeyboardUsed, setFocusedHint } = useGamepadStore();
  const scopeKey = depsForAutoFocus.slice(0, 2).map(String).join(':');

  // Auto-foca ou restaura a memória de foco sempre que troca de tela, aba ou modal
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (
        document.documentElement.dataset.inputMode === 'gamepad' ||
        useGamepadStore.getState().padConnected
      ) {
        document.documentElement.dataset.inputMode = 'gamepad';
        focusInitialElementInScope(scopeKey);
        setFocusedHint(inferFocusHint(document.activeElement as HTMLElement | null));
      }
    }, 40);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, depsForAutoFocus);

  useEffect(() => {
    attachGamepadConnectionListeners();

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      recordFocusedElement(target);
      setFocusedHint(inferFocusHint(target));
    };

    const onMouseDown = () => {
      window.focus?.();
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

    const prev: PrevPadButtons = {
      south: false,
      east: false,
      west: false,
      north: false,
      lb: false,
      rb: false,
      lt: false,
      rt: false,
      start: false,
    };
    let hadPadFocusInitialized = false;
    let heldDir: NavDirection | null = null;
    let nextRepeatMs = 0;
    let rafId = 0;

    const pollGamepad = (now: number) => {
      const gp = readNormalizedGamepad();

      // Enquanto a Arena 3D estiver aberta, só sincroniza prev p/ evitar clique fantasma ao sair!
      if (document.querySelector('[data-pitch-3d-active="true"]')) {
        if (gp) {
          prev.south = gp.south;
          prev.east = gp.east;
          prev.west = gp.west;
          prev.north = gp.north;
          prev.lb = gp.lb;
          prev.rb = gp.rb;
          prev.lt = gp.lt;
          prev.rt = gp.rt;
          prev.start = gp.start;
        }
        heldDir = null;
        rafId = requestAnimationFrame(pollGamepad);
        return;
      }

      if (gp) {
        if (!hadPadFocusInitialized && gp.hasAnyInput) {
          hadPadFocusInitialized = true;
          document.documentElement.dataset.inputMode = 'gamepad';
          const active = document.activeElement as HTMLElement | null;
          if (!active || !getVisibleFocusables().includes(active)) {
            focusInitialElementInScope();
          }
        }

        // A / Cross (ou Start) -> Confirmar!
        if ((gp.south && !prev.south) || (gp.start && !prev.start)) {
          const active = document.activeElement as HTMLElement | null;
          const visible = getVisibleFocusables();
          const prematchModal = document.querySelector<HTMLElement>('[data-prematch-direct-pad="true"]');

          if (active && visible.includes(active)) {
            if (active.dataset.consoleStepper === 'true') {
              playStepTickSfx();
              active.dispatchEvent(new CustomEvent('console-step', { detail: 1 }));
            } else {
              playConfirmSfx();
              active.click();
            }
          } else if (prematchModal) {
            const autoBtn = prematchModal.querySelector<HTMLElement>('[data-autofocus="true"]:not(:disabled)');
            if (autoBtn) {
              autoBtn.focus({ preventScroll: true });
              playConfirmSfx();
              autoBtn.click();
            }
          } else {
            focusInitialElementInScope();
          }
        }

        // B / Circle -> Voltar!
        if (gp.east && !prev.east) {
          playBackSfx();
          const active = document.activeElement as HTMLElement | null;
          if (active && active.tagName === 'INPUT') {
            active.blur();
          } else if (!triggerShortcutElement('data-pad-back')) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          }
        }

        // X / Square & Y / Triangle
        if (gp.west && !prev.west) triggerShortcutElement('data-pad-x');
        if (gp.north && !prev.north) triggerShortcutElement('data-pad-y');

        // LB / RB -> Abas principais!
        if (gp.lb && !prev.lb) {
          playTabSwitchSfx();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q' }));
        }
        if (gp.rb && !prev.rb) {
          playTabSwitchSfx();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }));
        }

        // LT / RT -> Sub-abas, uniformes ou mensagens da Caixa de Entrada!
        if (gp.lt && !prev.lt) triggerShortcutElement('data-pad-lt');
        if (gp.rt && !prev.rt) triggerShortcutElement('data-pad-rt');

        // D-Pad + Analógico Esquerdo com trava direcional limpa
        let dir: NavDirection | null = null;
        if (gp.dpadUp) dir = 'UP';
        else if (gp.dpadDown) dir = 'DOWN';
        else if (gp.dpadLeft) dir = 'LEFT';
        else if (gp.dpadRight) dir = 'RIGHT';
        else if (Math.abs(gp.ly) > 0.52 || Math.abs(gp.lx) > 0.52) {
          if (Math.abs(gp.ly) >= Math.abs(gp.lx)) {
            dir = gp.ly < 0 ? 'UP' : 'DOWN';
          } else {
            dir = gp.lx < 0 ? 'LEFT' : 'RIGHT';
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

        // Analógico Direito (RS) -> Rolagem suave de listas ou Rotação 3D / Mapa!
        if (Math.abs(gp.rx) > 0.22 || Math.abs(gp.ry) > 0.22) {
          window.dispatchEvent(
            new CustomEvent('gamepad-rs-move', {
              detail: {
                dx: Math.abs(gp.rx) > 0.22 ? gp.rx : 0,
                dy: Math.abs(gp.ry) > 0.22 ? gp.ry : 0,
              },
            }),
          );
          const scroller = document.querySelector<HTMLElement>('[data-rs-scroll="true"]');
          if (scroller && Math.abs(gp.ry) > 0.22) {
            scroller.scrollTop += gp.ry * 12;
          }
        }

        prev.south = gp.south;
        prev.east = gp.east;
        prev.west = gp.west;
        prev.north = gp.north;
        prev.lb = gp.lb;
        prev.rb = gp.rb;
        prev.lt = gp.lt;
        prev.rt = gp.rt;
        prev.start = gp.start;
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
  }, [setFocusedHint, setKeyboardUsed]);
}
