import { create } from 'zustand';

export type PadBrand = 'XBOX' | 'PLAYSTATION' | 'KEYBOARD';

export type ConsoleActionKey =
  | 'CONFIRM' // A / Cross / Enter
  | 'BACK'    // B / Circle / Esc
  | 'ALT_X'   // X / Square / X
  | 'ALT_Y'   // Y / Triangle / Y
  | 'LB'
  | 'RB'
  | 'LT'
  | 'RT'
  | 'RS';

interface GamepadUiState {
  brand: PadBrand;
  padConnected: boolean;
  padName: string;
  focusedHint: string | null;
  setPadDetected: (idString: string) => void;
  setPadDisconnected: () => void;
  setKeyboardUsed: () => void;
  setFocusedHint: (hint: string | null) => void;
}

export function detectBrandFromGamepadId(id: string): PadBrand {
  const lower = id.toLowerCase();
  if (
    lower.includes('054c') ||
    lower.includes('playstation') ||
    lower.includes('dualsense') ||
    lower.includes('dualshock') ||
    lower.includes('wireless controller')
  ) {
    return 'PLAYSTATION';
  }
  return 'XBOX';
}

export const useGamepadStore = create<GamepadUiState>((set, get) => ({
  brand: 'XBOX',
  padConnected: false,
  padName: '',
  focusedHint: null,
  setPadDetected: (idString) => {
    document.documentElement.dataset.inputMode = 'gamepad';
    const curr = get();
    if (curr.padConnected && curr.padName === idString) return;
    set({
      brand: detectBrandFromGamepadId(idString),
      padConnected: true,
      padName: idString,
    });
  },
  setPadDisconnected: () => {
    set({
      padConnected: false,
      padName: '',
    });
  },
  setKeyboardUsed: () => {
    document.documentElement.dataset.inputMode = 'gamepad';
  },
  setFocusedHint: (focusedHint) => set({ focusedHint }),
}));
