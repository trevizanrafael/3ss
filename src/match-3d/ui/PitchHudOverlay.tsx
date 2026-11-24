import React from 'react';
import { ClubData } from '../../data/clubs/types';
import { StarRatingBadge } from '../../shared/ui/StarRatingBadge';
import { getFifaStatColor } from '../../shared/ui/FifaStatBadge';
import { ArenaHudSnapshot, ArenaSessionMode } from '../types';

interface PitchHudOverlayProps {
  mode: ArenaSessionMode;
  club: ClubData;
  playerName: string;
  shirtNumber: number;
  hud: ArenaHudSnapshot;
  accentColor: string;
  onResetBall: () => void;
  onFinishNow: () => void;
  onExitCancel?: () => void;
}

export const PitchHudOverlay: React.FC<PitchHudOverlayProps> = ({
  mode,
  club,
  playerName,
  shirtNumber,
  hud,
  accentColor,
  onResetBall,
  onFinishNow,
  onExitCancel,
}) => {
  const isScoredMode = mode !== 'FREE_PLAY';
  const powerColor =
    hud.shotPowerPct > 90
      ? '#EF4444'
      : hud.shotPowerPct >= 62
        ? '#2DBE60'
        : '#FACC15';

  const mins = Math.floor(hud.timeRemainingSec / 60);
  const secs = Math.floor(hud.timeRemainingSec % 60);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 select-none">
      {/* TOPO: Placar / Progresso de Estrelas + Câmera + Botões Rápidos */}
      <div className="flex items-start justify-between gap-4">
        <div
          style={{ borderLeftColor: accentColor }}
          className="bg-[#0B0B0D]/88 border border-white/15 border-l-4 px-4 py-2.5 flex items-center gap-5 backdrop-blur-md"
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
            className={`px-3 py-1.5 border font-condensed uppercase font-extrabold text-xs tracking-wider ${
              hud.cameraMode === 'BALL_CAM'
                ? 'bg-[#C8A45D] text-[#0B0B0D] border-[#C8A45D]'
                : 'bg-[#0B0B0D]/85 text-[#F5F5F7] border-white/15'
            }`}
          >
            {hud.cameraMode === 'BALL_CAM' ? 'CÂMERA: TRAVA NA BOLA (LB)' : 'CÂMERA: LIVRE 360° (LB)'}
          </span>

          <button
            type="button"
            onClick={onResetBall}
            className="px-3 py-1.5 bg-[#0B0B0D]/88 hover:bg-[#1C1F28] border border-white/15 font-condensed uppercase font-bold text-xs tracking-wider text-[#F5F5F7] cursor-pointer"
          >
            NOVA BOLA (V)
          </button>

          {isScoredMode ? (
            <button
              type="button"
              onClick={onFinishNow}
              style={{ borderLeftColor: accentColor }}
              className="console-btn-primary px-4 py-1.5 text-xs cursor-pointer"
            >
              CONCLUIR ({hud.currentStars}★) ›
            </button>
          ) : (
            onExitCancel && (
              <button
                type="button"
                onClick={onExitCancel}
                className="px-4 py-1.5 bg-[#C94040] hover:bg-[#DC2626] text-[#F5F5F7] font-condensed uppercase font-extrabold text-xs tracking-wider cursor-pointer"
              >
                SAIR DA ARENA ›
              </button>
            )
          )}
        </div>
      </div>

      {/* CENTRO: Feedback Instantâneo de Gol / Gaveta / Trave / Defesa! */}
      <div className="my-auto flex flex-col items-center justify-center">
        {hud.bannerFeedback && (
          <div
            style={{ borderColor: hud.bannerFeedback.color, color: hud.bannerFeedback.color }}
            className="bg-[#0B0B0D]/92 border-y-2 px-8 py-2.5 font-condensed uppercase font-extrabold text-4xl tracking-wider shadow-2xl"
          >
            {hud.bannerFeedback.text}
          </div>
        )}
      </div>

      {/* RODAPÉ: Barra de Força do Chute + Fôlego do Atleta + Guia Rápido FIFA */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* Card do Seu Jogador: Fôlego + Barra de Chute Estilo FIFA */}
        <div className="bg-[#0B0B0D]/88 border border-white/15 p-3.5 w-72 backdrop-blur-md space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-condensed uppercase font-extrabold text-base text-[#F5F5F7] tracking-wider">
              #{shirtNumber} {playerName}
            </span>
            <span
              className="font-condensed font-bold text-xs uppercase"
              style={{ color: getFifaStatColor(hud.stamina) }}
            >
              FÔLEGO {Math.round(hud.stamina)}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-[#161922]">
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${hud.stamina}%`,
                backgroundColor: getFifaStatColor(hud.stamina),
              }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[10px] font-condensed uppercase tracking-wider text-[#9498A3] mb-0.5">
              <span>
                {hud.chargingFinesse ? 'CHUTE COLOCADO C/ CURVA (RB+B)' : 'FORÇA DO CHUTE (SEGURE B / ESPAÇO)'}
              </span>
              <span className="text-[#F5F5F7] font-bold tabular-nums">
                {Math.round(hud.shotPowerPct)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#161922] border border-white/10 relative">
              {/* Marcação da zona verde ideal (62%..88%) */}
              <div
                className="absolute top-0 bottom-0 bg-white/10"
                style={{ left: '62%', width: '26%' }}
              />
              <div
                className="h-full transition-none"
                style={{
                  width: `${hud.shotPowerPct}%`,
                  backgroundColor: powerColor,
                }}
              />
            </div>
          </div>
        </div>

        {/* Comandos Clássicos FIFA (Controle & Teclado) */}
        <div className="bg-[#0B0B0D]/85 border border-white/12 px-4 py-2.5 text-[11px] font-condensed uppercase tracking-wider text-[#D4D7E0] flex flex-wrap items-center gap-x-4 gap-y-1 backdrop-blur-md">
          <span>
            <strong className="text-[#EF4444]">B / ESPAÇO:</strong> CHUTAR
          </span>
          <span>
            <strong className="text-[#C8A45D]">RB+B / Q+ESP:</strong> CURVA COLOCADA
          </span>
          <span>
            <strong className="text-[#2DBE60]">A / E:</strong> PASSE / TABELINHA
          </span>
          <span>
            <strong className="text-[#FACC15]">Y / F:</strong> ENFIADA
          </span>
          <span>
            <strong className="text-[#38BDF8]">X / R:</strong> CRUZAR / CARRINHO
          </span>
          <span>
            <strong className="text-[#F5F5F7]">RT / SHIFT:</strong> CORRER
          </span>
          <span>
            <strong className="text-[#F5F5F7]">RS / MOUSE:</strong> OLHAR 360°
          </span>
        </div>
      </div>
    </div>
  );
};
