import { create } from 'zustand';

export type PadBrand = 'XBOX' | 'PLAYSTATION' | 'KEYBOARD';

export type ConsoleActionKey =
  | 'CONFIRM' // A / Cross / Enter
  | 'BACK'    // B / Circle / Esc
  | 'ALT_X'   // X / Square / X
  | 'ALT_Y'   // Y / Triangle / Space
  | 'LB'
  | 'RB'
  | 'LT'
  | 'RT'
  | 'RS';

interface GamepadUiState {
  brand: PadBrand;
  padConnected: boolean;
  padName: string;
  setPadDetected: (idString: string) => void;
  setKeyboardUsed: () => void;
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

export const useGamepadStore = create<GamepadUiState>((set) => ({
  brand: 'XBOX',
  padConnected: false,
  padName: '',
  setPadDetected: (idString) => {
    document.documentElement.dataset.inputMode = 'gamepad';
    set({
      brand: detectBrandFromGamepadId(idString),
      padConnected: true,
      padName: idString,
    });
  },
  setKeyboardUsed: () => {
    document.documentElement.dataset.inputMode = 'gamepad';
  },
}));
