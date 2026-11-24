import { useUiSoundStore } from '../../shared/audio/uiSoundEngine';

let matchAudioCtx: AudioContext | null = null;

function ctxOrNull(): AudioContext | null {
  if (useUiSoundStore.getState().muted) return null;
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!matchAudioCtx) {
    matchAudioCtx = new Ctor();
  }
  if (matchAudioCtx.state === 'suspended') {
    matchAudioCtx.resume().catch(() => {});
  }
  return matchAudioCtx;
}

/** Batida seca no couro da bola (escala grave + impacto conforme força 0..1) */
export function playBallKickSfx(power01 = 0.7): void {
  const ctx = ctxOrNull();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const p = Math.max(0.2, Math.min(1, power01));

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(135 + p * 65, t0);
  osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.095);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(0.09 + p * 0.14, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.12);
}

/** Batida metálica oca quando a bola explode na trave ou travessão! */
export function playPostClangSfx(): void {
  const ctx = ctxOrNull();
  if (!ctx) return;
  const t0 = ctx.currentTime;

  for (const [freq, dur, vol] of [
    [485, 0.28, 0.11],
    [910, 0.19, 0.07],
    [1360, 0.12, 0.04],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.94, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.01);
  }
}

/** Chiado da rede estufando + explosão vibrante da arquibancada ao marcar GOL! */
export function playGoalRoarSfx(): void {
  const ctx = ctxOrNull();
  if (!ctx) return;
  const t0 = ctx.currentTime;

  // Ruído filtrado simulando o "SWISH" da rede seguido pelo rugido da torcida!
  const bufSize = Math.floor(ctx.sampleRate * 1.45);
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.85;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, t0); // Swish agudo da rede nos primeiros 90ms
  filter.frequency.exponentialRampToValueAtTime(520, t0 + 0.22); // Rugido encorpado da torcida!
  filter.Q.setValueAtTime(0.85, t0);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(0.16, t0 + 0.05);
  gain.gain.linearRampToValueAtTime(0.13, t0 + 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.42);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + 1.45);
}

/** Apito curto de árbitro ao iniciar jogada ou encerrar sessão */
export function playWhistleSfx(doubleWhistle = false): void {
  const ctx = ctxOrNull();
  if (!ctx) return;

  const blow = (delay: number, len: number) => {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2780, t0);

    lfo.frequency.setValueAtTime(38, t0);
    lfoGain.gain.setValueAtTime(75, t0);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.linearRampToValueAtTime(0.065, t0 + 0.02);
    gain.gain.setValueAtTime(0.06, t0 + len - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    lfo.start(t0);
    osc.stop(t0 + len + 0.01);
    lfo.stop(t0 + len + 0.01);
  };

  blow(0, doubleWhistle ? 0.16 : 0.24);
  if (doubleWhistle) {
    blow(0.22, 0.34);
  }
}
