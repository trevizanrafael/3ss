import React from 'react';
import { ClubData } from '../../data/clubs/types';
import { useGamepadStore } from '../../shared/gamepad/gamepadStore';
import { StarRatingBadge } from '../../shared/ui/StarRatingBadge';
import { ArenaHudSnapshot, ArenaSessionMode } from '../types';

interface PitchHudOverlayProps {
  mode: ArenaSessionMode;
  club: ClubData;
  hud: ArenaHudSnapshot;
  accentColor: string;
  onResetBall: () => void;
  onFinishNow: () => void;
  onExitCancel?: () => void;
}

export const PitchHudOverlay: React.FC<PitchHudOverlayProps> = ({
  mode,
  club,
  hud,
  accentColor,
  onResetBall,
  onFinishNow,
  onExitCancel,
}) => {
  const { padConnected, brand } = useGamepadStore();
  const isPS = brand === 'PLAYSTATION';
  const lblShoot = isPS ? '○' : 'B';
  const lblPass = isPS ? '✕' : 'A';
  const lblThrough = isPS ? '△' : 'Y';
  const lblLob = isPS ? '□' : 'X';
  const lblLB = isPS ? 'L1' : 'LB';
  const lblRB = isPS ? 'R1' : 'RB';
  const lblRT = isPS ? 'R2' : 'RT';
  const lblBack = isPS ? 'SHARE' : 'SELECT';
  const lblStart = isPS ? 'OPTIONS' : 'START';
  const isScoredMode = mode !== 'FREE_PLAY';

  const mins = Math.floor(hud.timeRemainingSec / 60);
  const secs = Math.floor(hud.timeRemainingSec % 60);

  const staminaPct = Math.max(0, Math.min(100, hud.stamina));
  const maxStaminaPct = Math.max(25, Math.min(100, hud.maxStamina));
  const powerPct = Math.max(0, Math.min(100, hud.powerPct));
  const staminaColor =
    staminaPct < 24 ? '#EF4444' : staminaPct < 48 ? '#F59E0B' : '#E2E8F0';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 select-none">
      {/* TOPO: Placar / Progresso de Estrelas + Câmera + Botões Rápidos */}
      <div className="flex items-start justify-between gap-4">
        <div
          style={{ borderLeftColor: accentColor }}
          className="bg-[#0B0B0D]/80 border border-white/15 border-l-4 px-4 py-2 flex items-center gap-5 backdrop-blur-md"
        >
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#9498A3] font-bold">
              {mode === 'TRYOUT_PRO'
                ? 'SELETIVA PROFISSIONAL • CAMPO 3D'
                : mode === 'TRAINING_SESSION'
                  ? `SESSÃO 100% • ${club.shortName}`
                  : `ARENA LIVRE 3D • ${club.shortName}`}
            </div>
            <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] leading-none mt-0.5">
              {hud.goals} GOLS{' '}
              <span className="text-[#9498A3] text-lg">
                • {hud.comboPoints} PTS
              </span>
            </div>
          </div>

          {isScoredMode && (
            <div className="pl-4 border-l border-white/12 flex items-center gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-[#9498A3]">
                  NOTA ATUAL
                </div>
                <StarRatingBadge stars={hud.currentStars} size="md" />
              </div>
              <div className="text-right pl-2">
                <div className="text-[9px] uppercase tracking-widest text-[#9498A3]">
                  TEMPO / LANCES
                </div>
                <div className="font-condensed font-extrabold text-xl text-[#C8A45D] tabular-nums leading-none">
                  {mins}:{String(secs).padStart(2, '0')} • {hud.attemptsDone}/{hud.maxAttempts}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <span
            className={`px-3 py-1.5 border font-condensed uppercase font-extrabold text-xs tracking-wider ${padConnected
              ? 'bg-[#12261A]/85 text-[#2DBE60] border-[#2DBE60]'
              : 'bg-[#0B0B0D]/80 text-[#FACC15] border-[#FACC15]/60'
              }`}
          >
            {padConnected ? `CONTROLE (${brand})` : 'APERTE UM BOTÃO NO CONTROLE'}
          </span>

          <span
            className={`px-3 py-1.5 border font-condensed uppercase font-extrabold text-xs tracking-wider ${hud.cameraMode === 'BALL_CAM'
              ? 'bg-[#C8A45D] text-[#0B0B0D] border-[#C8A45D]'
              : 'bg-[#0B0B0D]/80 text-[#F5F5F7] border-white/15'
              }`}
          >
            {hud.cameraMode === 'BALL_CAM'
              ? `CÂMERA: BOLA (${lblLB})`
              : `CÂMERA: LIVRE 360° (${lblLB})`}
          </span>

          <button
            type="button"
            onClick={onResetBall}
            className="px-3 py-1.5 bg-[#0B0B0D]/80 hover:bg-[#1C1F28] border border-white/15 font-condensed uppercase font-bold text-xs tracking-wider text-[#F5F5F7] cursor-pointer"
          >
            NOVA BOLA ({lblBack} / V)
          </button>

          {isScoredMode ? (
            <button
              type="button"
              onClick={onFinishNow}
              style={{ borderLeftColor: accentColor }}
              className="console-btn-primary px-4 py-1.5 text-xs cursor-pointer"
            >
              CONCLUIR ({hud.currentStars}★ • {lblStart}) ›
            </button>
          ) : (
            onExitCancel && (
              <button
                type="button"
                onClick={onExitCancel}
                className="px-4 py-1.5 bg-[#C94040] hover:bg-[#DC2626] text-[#F5F5F7] font-condensed uppercase font-extrabold text-xs tracking-wider cursor-pointer"
              >
                SAIR ({lblStart}) ›
              </button>
            )
          )}
        </div>
      </div>

      {/* CENTRO: Feedback Instantâneo */}
      <div className="my-auto flex flex-col items-center justify-center">
        {hud.bannerFeedback && (
          <div
            style={{ borderColor: hud.bannerFeedback.color, color: hud.bannerFeedback.color }}
            className="bg-[#0B0B0D]/88 border-y-2 px-8 py-2 font-condensed uppercase font-extrabold text-3xl tracking-wider shadow-2xl"
          >
            {hud.bannerFeedback.text}
          </div>
        )}
      </div>

      {/* RODAPÉ: Duas Barrinhas Semitransparentes Estilo FIFA (Fôlego em cima + Mapa de Calor de Força embaixo) */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="bg-[#080A0F]/48 border border-white/12 px-2.5 py-2 w-56 backdrop-blur-sm space-y-1.5">
          {/* Linha Superior: Fôlego Atual limitado ao Teto Pré-Jogo (ex: 75% ou 100%) */}
          <div className="w-full h-[5px] bg-black/55 relative overflow-hidden">
            {maxStaminaPct < 99.5 && (
              <div
                className="absolute top-0 bottom-0 right-0 bg-white/[0.08] border-l border-white/35"
                style={{ width: `${100 - maxStaminaPct}%` }}
              />
            )}
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${staminaPct}%`,
                backgroundColor: staminaColor,
              }}
            />
          </div>

          {/* Linha Inferior: Barra de Força em Mapa de Calor (Verde -> Amarelo -> Laranja -> Vermelho) */}
          <div className="w-full h-[9px] bg-black/60 border border-white/10 relative overflow-hidden">
            <div
              className="h-full overflow-hidden transition-none"
              style={{ width: `${powerPct}%` }}
            >
              <div
                className="h-full w-56"
                style={{
                  background:
                    'linear-gradient(90deg, #22C55E 0%, #84CC16 32%, #FACC15 58%, #F97316 80%, #EF4444 100%)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Guia Enxuto de Comandos */}
        <div className="bg-[#0B0B0D]/60 border border-white/10 px-3.5 py-2 text-[11px] font-condensed uppercase tracking-wider text-[#D4D7E0] flex flex-wrap items-center gap-x-4 gap-y-1 backdrop-blur-sm">
          <span>
            <strong className="text-[#EF4444]">{lblShoot}:</strong> CHUTE
          </span>
          <span>
            <strong className="text-[#C8A45D]">{lblRB}+{lblShoot}:</strong> COLOCADO
          </span>
          <span>
            <strong className="text-[#2DBE60]">{lblPass}:</strong> PASSE
          </span>
          <span>
            <strong className="text-[#FACC15]">{lblThrough}:</strong> ENFIADA
          </span>
          <span>
            <strong className="text-[#38BDF8]">{lblLob}:</strong> CRUZAR / CARRINHO
          </span>
          <span>
            <strong className="text-[#F5F5F7]">{lblRT}:</strong> PIQUE
          </span>
        </div>
      </div>
    </div>
  );
};
