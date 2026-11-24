import { playNavTickSfx, playStepTickSfx } from '../audio/uiSoundEngine';

export type NavDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const FOCUSABLE_SELECTOR = [
  'button:not(:disabled)',
  'input:not(:disabled)',
  '[data-focusable="true"]',
].join(', ');

// Memória do último elemento focado por escopo (aba ou tela) para nunca perder o cursor!
const scopeFocusMemory = new Map<string, string>();
let currentScopeKey = 'DEFAULT';

export function setActiveNavigationScopeKey(scopeKey: string): void {
  currentScopeKey = scopeKey;
}

export function recordFocusedElement(el: HTMLElement | null): void {
  if (!el || el === document.body) return;
  if (el.closest('[data-modal-scope="true"]')) return;
  if (el.id) {
    scopeFocusMemory.set(currentScopeKey, `#${el.id}`);
  }
}

function getActiveRootScope(): ParentNode {
  const modals = Array.from(document.querySelectorAll<HTMLElement>('[data-modal-scope="true"]'));
  if (modals.length > 0) {
    return modals[modals.length - 1];
  }
  return document;
}

export function getVisibleFocusables(): HTMLElement[] {
  const scope = getActiveRootScope();
  const nodes = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (el.closest('.leaflet-control-container')) return false;
    if (el.dataset.navIgnore === 'true') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 4 && rect.height > 4 && getComputedStyle(el).visibility !== 'hidden';
  });
}

export function focusInitialElementInScope(scopeKey?: string): void {
  if (scopeKey) {
    currentScopeKey = scopeKey;
  }
  const scope = getActiveRootScope();
  const isModal = scope !== document;

  // 1. Se não for modal e houver memória recente desta aba, restaura exatamente onde estava!
  if (!isModal) {
    const savedSelector = scopeFocusMemory.get(currentScopeKey);
    if (savedSelector) {
      const remembered = scope.querySelector<HTMLElement>(savedSelector);
      if (remembered && getVisibleFocusables().includes(remembered)) {
        remembered.focus({ preventScroll: true });
        return;
      }
    }
  }

  // 2. Caso contrário, foca o elemento [data-autofocus="true"]
  const auto = scope.querySelector<HTMLElement>('[data-autofocus="true"]:not(:disabled)');
  if (auto && getVisibleFocusables().includes(auto)) {
    auto.focus({ preventScroll: true });
    return;
  }

  // 3. Fallback garantido para o primeiro item visível (zero foco fantasma)
  const all = getVisibleFocusables();
  if (all[0]) {
    all[0].focus({ preventScroll: true });
  }
}

export function triggerShortcutElement(attrName: string): boolean {
  const scope = getActiveRootScope();
  const el = scope.querySelector<HTMLElement>(`[${attrName}="true"]:not(:disabled)`);
  if (el) {
    playStepTickSfx();
    el.click();
    return true;
  }
  return false;
}

const EXPLICIT_DIR_ATTR: Record<NavDirection, keyof DOMStringMap> = {
  UP: 'navUp',
  DOWN: 'navDown',
  LEFT: 'navLeft',
  RIGHT: 'navRight',
};

export function moveSpatialFocus(dir: NavDirection): void {
  const scope = getActiveRootScope();
  if (scope instanceof HTMLElement && scope.dataset.prematchDirectPad === 'true') {
    playStepTickSfx();
    window.dispatchEvent(new CustomEvent<NavDirection>('prematch-dpad', { detail: dir }));
    return;
  }

  const active = document.activeElement as HTMLElement | null;

  // Se estiver focado num ConsoleStepper e apertar Esquerda/Direita, gira o valor direto!
  if (active && active.dataset.consoleStepper === 'true' && (dir === 'LEFT' || dir === 'RIGHT')) {
    playStepTickSfx();
    active.dispatchEvent(
      new CustomEvent('console-step', { detail: dir === 'LEFT' ? -1 : 1, bubbles: false }),
    );
    return;
  }

  const candidates = getVisibleFocusables();
  if (candidates.length === 0) return;

  if (!active || !candidates.includes(active)) {
    focusInitialElementInScope();
    playNavTickSfx();
    return;
  }

  // 1. Rota explícita determinística (ex: data-nav-down="central-inbox") — padrão ouro de consoles!
  const explicitTargetId = active.dataset[EXPLICIT_DIR_ATTR[dir]];
  if (explicitTargetId) {
    const scope = getActiveRootScope();
    const explicitEl = scope.querySelector<HTMLElement>(`#${explicitTargetId}`);
    if (explicitEl && candidates.includes(explicitEl)) {
      explicitEl.focus({ preventScroll: true });
      explicitEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      recordFocusedElement(explicitEl);
      playNavTickSfx();
      return;
    }
  }

  // 2. Cálculo de Distância Borda-a-Borda com Corredor de Projeção (nunca pula cards altos/assimétricos!)
  const from = active.getBoundingClientRect();
  const fx = from.left + from.width / 2;
  const fy = from.top + from.height / 2;

  let bestEl: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of candidates) {
    if (el === active) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    let primaryGap = 0;
    let perpGap = 0;
    let centerOffset = 0;

    if (dir === 'RIGHT') {
      if (cx <= fx + 4 || r.left < from.left + 4) continue;
      primaryGap = Math.max(0, r.left - from.right);
      const overlapY = Math.min(from.bottom, r.bottom) - Math.max(from.top, r.top);
      perpGap = overlapY > 0 ? 0 : Math.min(Math.abs(r.top - from.bottom), Math.abs(from.top - r.bottom));
      centerOffset = Math.abs(cy - fy);
    } else if (dir === 'LEFT') {
      if (cx >= fx - 4 || r.right > from.right - 4) continue;
      primaryGap = Math.max(0, from.left - r.right);
      const overlapY = Math.min(from.bottom, r.bottom) - Math.max(from.top, r.top);
      perpGap = overlapY > 0 ? 0 : Math.min(Math.abs(r.top - from.bottom), Math.abs(from.top - r.bottom));
      centerOffset = Math.abs(cy - fy);
    } else if (dir === 'DOWN') {
      if (cy <= fy + 4 || r.top < from.top + 4) continue;
      primaryGap = Math.max(0, r.top - from.bottom);
      const overlapX = Math.min(from.right, r.right) - Math.max(from.left, r.left);
      perpGap = overlapX > 0 ? 0 : Math.min(Math.abs(r.left - from.right), Math.abs(from.left - r.right));
      centerOffset = Math.abs(cx - fx);
    } else {
      if (cy >= fy - 4 || r.bottom > from.bottom - 4) continue;
      primaryGap = Math.max(0, from.top - r.bottom);
      const overlapX = Math.min(from.right, r.right) - Math.max(from.left, r.left);
      perpGap = overlapX > 0 ? 0 : Math.min(Math.abs(r.left - from.right), Math.abs(from.left - r.right));
      centerOffset = Math.abs(cx - fx);
    }

    const score = primaryGap + perpGap * 2.8 + centerOffset * 0.14;
    if (score < bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  if (bestEl) {
    bestEl.focus({ preventScroll: true });
    bestEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    recordFocusedElement(bestEl);
    playNavTickSfx();
  }
}
