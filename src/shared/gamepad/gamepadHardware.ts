import { useGamepadStore } from './gamepadStore';

export interface NormalizedGamepadState {
  id: string;
  index: number;
  south: boolean; // A / Cross (Confirmar / Passe)
  east: boolean; // B / Circle (Voltar / Chute)
  west: boolean; // X / Square (Cruzamento / Carrinho / Alt X)
  north: boolean; // Y / Triangle (Enfiada / Alt Y)
  lb: boolean;
  rb: boolean;
  lt: boolean;
  rt: boolean;
  ltValue: number; // 0..1
  rtValue: number; // 0..1
  back: boolean; // View / Select / Share
  start: boolean; // Menu / Start / Options
  l3: boolean;
  r3: boolean;
  dpadUp: boolean;
  dpadDown: boolean;
  dpadLeft: boolean;
  dpadRight: boolean;
  lx: number; // -1..1
  ly: number; // -1..1
  rx: number; // -1..1
  ry: number; // -1..1
  hasAnyInput: boolean;
}

let activePadIndex: number | null = null;
let listenersAttached = false;

function isRawSonyController(gp: Gamepad): boolean {
  if (gp.mapping === 'standard') return false;
  const lower = gp.id.toLowerCase();
  return (
    lower.includes('054c') ||
    lower.includes('dualsense') ||
    lower.includes('dualshock') ||
    lower.includes('wireless controller') ||
    lower.includes('playstation')
  );
}

function decodeHatSwitchDpad(hatVal: number | undefined): {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
} {
  // Em DirectInput (axes[9]), repouso costuma ser > 1.1 (ex: 1.2857 ou 3.2857) ou NaN.
  // Direções de -1.0 a +1.0 em passos de 2/7 (~0.2857):
  // -1.0 = N, -0.714 = NE, -0.428 = E, -0.143 = SE, +0.143 = S, +0.428 = SW, +0.714 = W, +1.0 = NW
  if (hatVal === undefined || !Number.isFinite(hatVal) || hatVal > 1.08 || hatVal < -1.08) {
    return { up: false, down: false, left: false, right: false };
  }
  // Evita falso positivo se axes[9] for exatamente 0.0 por eixo não usado
  if (Math.abs(hatVal) < 0.04) {
    return { up: false, down: false, left: false, right: false };
  }
  const step = Math.round(((hatVal + 1) / 2) * 7); // 0..7
  return {
    up: step === 0 || step === 1 || step === 7,
    right: step === 1 || step === 2 || step === 3,
    down: step === 3 || step === 4 || step === 5,
    left: step === 5 || step === 6 || step === 7,
  };
}

function normalizeSingleGamepad(gp: Gamepad): NormalizedGamepadState {
  const btn = (idx: number) => Boolean(gp.buttons[idx]?.pressed);
  const btnVal = (idx: number) => gp.buttons[idx]?.value ?? (btn(idx) ? 1 : 0);

  const rawSony = isRawSonyController(gp);
  const isStandard = gp.mapping === 'standard';

  let south: boolean;
  let east: boolean;
  let west: boolean;
  let north: boolean;
  let lb: boolean;
  let rb: boolean;
  let ltValue: number;
  let rtValue: number;
  let back: boolean;
  let start: boolean;
  let l3: boolean;
  let r3: boolean;
  let lx = gp.axes[0] ?? 0;
  let ly = gp.axes[1] ?? 0;
  let rx = gp.axes[2] ?? 0;
  let ry = gp.axes[3] ?? 0;

  if (rawSony) {
    // DualShock 4 / DualSense em modo DirectInput cru no Windows/Chrome:
    // 0=Square, 1=Cross, 2=Circle, 3=Triangle, 4=L1, 5=R1, 6=L2, 7=R2, 8=Share, 9=Options, 10=L3, 11=R3
    // axes[2]=RS_X, axes[5]=RS_Y (axes[3] e axes[4] são gatilhos L2/R2 que repousam em -1.0!)
    west = btn(0);
    south = btn(1);
    east = btn(2);
    north = btn(3);
    lb = btn(4);
    rb = btn(5);
    ltValue = btn(6) ? Math.max(btnVal(6), gp.axes.length >= 6 ? ((gp.axes[3] ?? -1) + 1) * 0.5 : 1) : 0;
    rtValue = btn(7) ? Math.max(btnVal(7), gp.axes.length >= 6 ? ((gp.axes[4] ?? -1) + 1) * 0.5 : 1) : 0;
    back = btn(8);
    start = btn(9);
    l3 = btn(10);
    r3 = btn(11);
    rx = gp.axes[2] ?? 0;
    ry = gp.axes.length >= 6 ? (gp.axes[5] ?? 0) : 0;
  } else {
    // Mapeamento Padrão W3C (Xbox XInput, Steam Input, DS4Windows, controles modernos)
    south = btn(0);
    east = btn(1);
    west = btn(2);
    north = btn(3);
    lb = btn(4);
    rb = btn(5);
    ltValue = Math.max(btn(6) ? 1 : 0, btnVal(6));
    rtValue = Math.max(btn(7) ? 1 : 0, btnVal(7));
    back = btn(8);
    start = btn(9);
    l3 = btn(10);
    r3 = btn(11);
    rx = gp.axes[2] ?? 0;
    // Alguns controles USB genéricos sem mapping='standard' colocam RS_Y em axes[5] ou axes[3]
    if (!isStandard && gp.axes.length >= 6 && Math.abs((gp.axes[3] ?? 0) + 1) < 0.04) {
      ry = gp.axes[5] ?? 0;
    } else {
      ry = gp.axes[3] ?? 0;
    }
  }

  const hat = !isStandard ? decodeHatSwitchDpad(gp.axes[9]) : { up: false, down: false, left: false, right: false };
  const dpadUp = btn(12) || hat.up;
  const dpadDown = btn(13) || hat.down;
  const dpadLeft = btn(14) || hat.left;
  const dpadRight = btn(15) || hat.right;

  const lt = ltValue > 0.35;
  const rt = rtValue > 0.35;

  const anyButton =
    south ||
    east ||
    west ||
    north ||
    lb ||
    rb ||
    lt ||
    rt ||
    back ||
    start ||
    l3 ||
    r3 ||
    dpadUp ||
    dpadDown ||
    dpadLeft ||
    dpadRight;

  const anyStick =
    Math.abs(lx) > 0.24 ||
    Math.abs(ly) > 0.24 ||
    Math.abs(rx) > 0.24 ||
    Math.abs(ry) > 0.24;

  return {
    id: gp.id,
    index: gp.index,
    south,
    east,
    west,
    north,
    lb,
    rb,
    lt,
    rt,
    ltValue,
    rtValue,
    back,
    start,
    l3,
    r3,
    dpadUp,
    dpadDown,
    dpadLeft,
    dpadRight,
    lx: Number.isFinite(lx) ? lx : 0,
    ly: Number.isFinite(ly) ? ly : 0,
    rx: Number.isFinite(rx) ? rx : 0,
    ry: Number.isFinite(ry) ? ry : 0,
    hasAnyInput: anyButton || anyStick,
  };
}

export function attachGamepadConnectionListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    activePadIndex = e.gamepad.index;
    useGamepadStore.getState().setPadDetected(e.gamepad.id);
  });

  window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
    if (activePadIndex === e.gamepad.index) {
      activePadIndex = null;
    }
    const rawPads = navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    const remaining = rawPads.find((p): p is Gamepad => Boolean(p && p.connected));
    if (remaining) {
      activePadIndex = remaining.index;
      useGamepadStore.getState().setPadDetected(remaining.id);
    } else {
      useGamepadStore.getState().setPadDisconnected();
    }
  });
}

/**
 * Lê TODOS os slots (0..3) de `navigator.getGamepads()`, ignora dispositivos virtuais mortos
 * no slot 0 quando o controle real está no slot 1..3, e promove automaticamente o controle
 * que tiver botão ou analógico acionado!
 */
export function readNormalizedGamepad(): NormalizedGamepadState | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;

  let rawList: (Gamepad | null)[];
  try {
    rawList = Array.from(navigator.getGamepads());
  } catch {
    return null;
  }

  const connected = rawList.filter((p): p is Gamepad => Boolean(p && p.connected));
  if (connected.length === 0) return null;

  const normalizedAll = connected.map(normalizeSingleGamepad);

  // 1. Se qualquer controle conectado tiver input ativo AGORA, assume ele imediatamente!
  const withLiveInput = normalizedAll.find((s) => s.hasAnyInput);
  if (withLiveInput) {
    activePadIndex = withLiveInput.index;
    useGamepadStore.getState().setPadDetected(withLiveInput.id);
    return withLiveInput;
  }

  // 2. Mantém o último controle ativo se continuar conectado
  if (activePadIndex !== null) {
    const remembered = normalizedAll.find((s) => s.index === activePadIndex);
    if (remembered) {
      return remembered;
    }
  }

  // 3. Fallback inicial: prioriza controle com mapping === 'standard' sobre adaptadores virtuais
  const standardPad = connected.find((p) => p.mapping === 'standard') ?? connected[0];
  activePadIndex = standardPad.index;
  return normalizedAll.find((s) => s.index === standardPad.index) ?? normalizedAll[0];
}
