export type NavDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const FOCUSABLE_SELECTOR = [
  'button:not(:disabled)',
  'input:not(:disabled)',
  '[data-focusable="true"]',
].join(', ');

function getActiveRootScope(): ParentNode {
  // Se houver modal fullscreen/dialog aberto (z-50), trava a navegação dentro dele!
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

export function focusInitialElementInScope(): void {
  const scope = getActiveRootScope();
  const auto = scope.querySelector<HTMLElement>('[data-autofocus="true"]:not(:disabled)');
  if (auto) {
    auto.focus({ preventScroll: true });
    return;
  }
  const all = getVisibleFocusables();
  if (all[0]) {
    all[0].focus({ preventScroll: true });
  }
}

export function triggerShortcutElement(attrName: string): boolean {
  const scope = getActiveRootScope();
  const el = scope.querySelector<HTMLElement>(`[${attrName}="true"]:not(:disabled)`);
  if (el) {
    el.click();
    return true;
  }
  return false;
}

export function moveSpatialFocus(dir: NavDirection): void {
  const active = document.activeElement as HTMLElement | null;

  // Se estiver focado num ConsoleStepper e apertar Esquerda/Direita, gira o valor direto!
  if (active && active.dataset.consoleStepper === 'true' && (dir === 'LEFT' || dir === 'RIGHT')) {
    active.dispatchEvent(
      new CustomEvent('console-step', { detail: dir === 'LEFT' ? -1 : 1, bubbles: false }),
    );
    return;
  }

  const candidates = getVisibleFocusables();
  if (candidates.length === 0) return;

  if (!active || !candidates.includes(active)) {
    focusInitialElementInScope();
    return;
  }

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
    const dx = cx - fx;
    const dy = cy - fy;

    let primary = 0;
    let perp = 0;
    let overlap = 0;

    if (dir === 'RIGHT') {
      if (dx <= 6) continue;
      primary = dx;
      perp = Math.abs(dy);
      overlap = Math.max(0, Math.min(from.bottom, r.bottom) - Math.max(from.top, r.top));
    } else if (dir === 'LEFT') {
      if (dx >= -6) continue;
      primary = -dx;
      perp = Math.abs(dy);
      overlap = Math.max(0, Math.min(from.bottom, r.bottom) - Math.max(from.top, r.top));
    } else if (dir === 'DOWN') {
      if (dy <= 6) continue;
      primary = dy;
      perp = Math.abs(dx);
      overlap = Math.max(0, Math.min(from.right, r.right) - Math.max(from.left, r.left));
    } else {
      if (dy >= -6) continue;
      primary = -dy;
      perp = Math.abs(dx);
      overlap = Math.max(0, Math.min(from.right, r.right) - Math.max(from.left, r.left));
    }

    const alignDiscount = overlap > 0 ? 0.35 : 1.0;
    const score = primary + perp * 2.4 * alignDiscount;
    if (score < bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  if (bestEl) {
    bestEl.focus({ preventScroll: true });
    bestEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
