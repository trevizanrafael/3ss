import { create } from 'zustand';

const SOUND_MUTE_KEY = 'three-stars-soccer-ui-muted';

function loadInitialMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

interface UiSoundState {
  muted: boolean;
  toggleMuted: () => void;
}

export const useUiSoundStore = create<UiSoundState>((set, get) => ({
  muted: loadInitialMuted(),
  toggleMuted: () => {
    const next = !get().muted;
    try {
      window.localStorage.setItem(SOUND_MUTE_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
    set({ muted: next });
  },
}));

let sharedCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (useUiSoundStore.getState().muted) return null;
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx) {
    sharedCtx = new Ctor();
  }
  if (sharedCtx.state === 'suspended') {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function playTone(
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  peakGain: number,
  type: OscillatorType = 'triangle',
  delaySec = 0,
): void {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const t0 = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1600, t0);

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + durationSec);

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationSec);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t0);
  osc.stop(t0 + durationSec + 0.01);
}

/** Tick curto e aveludado ao mover entre cards no D-Pad / Setas */
export function playNavTickSfx(): void {
  playTone(290, 155, 0.038, 0.032, 'triangle');
}

/** Clique mecânico limpo ao girar seletores ‹ Opção › ou sub-abas LT/RT */
export function playStepTickSfx(): void {
  playTone(420, 260, 0.034, 0.034, 'sine');
}

/** Transição suave de aba principal (LB / RB) */
export function playTabSwitchSfx(): void {
  playTone(210, 350, 0.065, 0.038, 'triangle');
}

/** Confirmação sutil de console (A / Enter) */
export function playConfirmSfx(): void {
  playTone(420, 520, 0.055, 0.042, 'triangle', 0);
  playTone(560, 740, 0.075, 0.038, 'sine', 0.032);
}

/** Retorno grave e discreto (B / Esc) */
export function playBackSfx(): void {
  playTone(250, 130, 0.065, 0.04, 'triangle');
}
