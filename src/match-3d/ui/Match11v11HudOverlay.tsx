import React from 'react';
import { ClubData } from '../../data/clubs/types';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { useGamepadStore } from '../../shared/gamepad/gamepadStore';
import { ClubCrest } from '../../shared/ui/ClubCrest';
import { PITCH } from '../physics/pitchConstants';

export type MatchCameraPreset = 'BROADCAST_TV' | 'PRO_TACTICAL' | 'PRO_CLOSE';

export interface RadarDotSnapshot {
  id: string;
  x: number;
  z: number;
  team: 'HOME' | 'AWAY';
  isUser?: boolean;
  isGk?: boolean;
  hasBall?: boolean;
}

export interface Match11v11HudSnapshot {
  homeGoals: number;
  awayGoals: number;
  userGoals: number;
  userAssists: number;
  matchMinute: number;
  matchSecond: number;
  stoppageMinutes: number;
  inStoppageTime: boolean;
  half: 1 | 2 | 'HT' | 'FT';
  paused: boolean;
  pauseMenuIndex: number;
  isReplayActive: boolean;
  replayScorerText: string;
  stamina: number;
  maxStamina: number;
  powerPct: number;
  cameraPreset: MatchCameraPreset;
  bannerFeedback: { text: string; subtext?: string; color: string } | null;
  ballX: number;
  ballZ: number;
  radarDots: RadarDotSnapshot[];
}

interface Match11v11HudOverlayProps {
  player: CareerPlayer;
  homeClub: ClubData;
  rivalClub: ClubData;
  awayRenderClub: ClubData;
  derbyName: string;
  accentColor: string;
  hud: Match11v11HudSnapshot;
  onResume: () => void;
  onTogglePause: () => void;
  onCycleCamera: () => void;
  onSkipReplay: () => void;
  onRestartMatch: () => void;
  onExit: () => void;
}

const CAMERA_LABELS: Record<MatchCameraPreset, string> = {
  BROADCAST_TV: 'TV LATERAL',
  PRO_TACTICAL: 'PRO TÁTICA',
  PRO_CLOSE: 'PRO IMERSIVA',
};

export const Match11v11HudOverlay: React.FC<Match11v11HudOverlayProps> = ({
  player,
  homeClub,
  rivalClub,
  awayRenderClub,
  derbyName,
  accentColor,
  hud,
  onResume,
  onTogglePause,
  onCycleCamera,
  onSkipReplay,
  onRestartMatch,
  onExit,
}) => {
  const { brand } = useGamepadStore();
  const isPS = brand === 'PLAYSTATION';
  const lblConfirm = isPS ? '✕' : 'A';
  const lblBackBtn = isPS ? '○' : 'B';
  const lblThrough = isPS ? '△' : 'Y';
  const lblLob = isPS ? '□' : 'X';
  const lblRB = isPS ? 'R1' : 'RB';
  const lblSelect = isPS ? 'SHARE' : 'SELECT';
  const lblStart = isPS ? 'OPTIONS' : 'START';

  const staminaPct = Math.max(0, Math.min(100, hud.stamina));
  const maxStaminaPct = Math.max(25, Math.min(100, hud.maxStamina));
  const powerPct = Math.max(0, Math.min(100, hud.powerPct));
  const staminaColor =
    staminaPct < 24 ? '#EF4444' : staminaPct < 48 ? '#F59E0B' : '#E2E8F0';

  const toRadarLeftPct = (z: number) => ((PITCH.HALF_L - z) / PITCH.LENGTH) * 100;
  const toRadarTopPct = (x: number) => ((x + PITCH.HALF_W) / PITCH.WIDTH) * 100;

  // MODO REPLAY DE TV LIMPO: só a etiqueta de Replay no topo e o botão Pular [A] no canto!
  if (hud.isReplayActive) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 select-none">
        <div className="flex items-center justify-between">
          <div className="bg-[#0B0B0D]/88 border-l-4 border-l-[#EF4444] border border-white/15 px-4 py-2 flex items-center gap-3 backdrop-blur-md">
            <span className="w-2.5 h-2.5 bg-[#EF4444] inline-block animate-pulse" />
            <div>
              <div className="text-[10px] font-condensed uppercase tracking-[0.24em] text-[#C8A45D] font-bold">
                REPLAY OFICIAL DA TRANSMISSÃO
              </div>
              <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7] leading-none mt-0.5">
                {hud.replayScorerText}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pointer-events-auto">
          <button
            type="button"
            onClick={onSkipReplay}
            className="bg-[#0B0B0D]/90 hover:bg-[#F5F5F7] hover:text-[#0B0B0D] border border-white/25 px-5 py-2 font-condensed uppercase font-extrabold text-sm tracking-wider text-[#F5F5F7] cursor-pointer transition-colors"
          >
            [{lblConfirm} / ESPAÇO] PULAR REPLAY ›
          </button>
        </div>
      </div>
    );
  }

  const pauseOptions =
    hud.half === 'FT'
      ? [
          { label: 'JOGAR CLÁSSICO NOVAMENTE', action: onRestartMatch },
          { label: 'VOLTAR AO MENU INICIAL', action: onExit },
        ]
      : [
          { label: 'CONTINUAR PARTIDA', action: onResume },
          { label: `CÂMERA: ${CAMERA_LABELS[hud.cameraPreset]}`, action: onCycleCamera },
          { label: 'REINICIAR CLÁSSICO', action: onRestartMatch },
          { label: 'VOLTAR AO MENU INICIAL', action: onExit },
        ];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 select-none">
      {/* TOPO ENXUTO: Placar estilo TV à esquerda + Pílula discreta de Pausa/Câmera à direita */}
      <div className="flex items-start justify-between gap-4">
        <div
          style={{ borderLeftColor: accentColor }}
          className="bg-[#0B0B0D]/86 border border-white/15 border-l-4 px-3.5 py-1.5 flex items-center gap-3 backdrop-blur-md"
        >
          <div className="flex items-center gap-1.5">
            <ClubCrest clubId={homeClub.id} size="sm" />
            <span className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] tracking-wide">
              {homeClub.shortName}
            </span>
            <span
              className="w-1 h-4 inline-block"
              style={{ backgroundColor: homeClub.primaryColor || '#2DBE60' }}
            />
          </div>

          <div className="bg-[#141720] border border-white/10 px-2.5 py-0.5 font-condensed font-extrabold text-xl text-[#F5F5F7] tabular-nums">
            {hud.homeGoals} : {hud.awayGoals}
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-1 h-4 inline-block"
              style={{ backgroundColor: awayRenderClub.primaryColor || '#F5F5F7' }}
            />
            <span className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] tracking-wide">
              {rivalClub.shortName}
            </span>
            <ClubCrest clubId={rivalClub.id} size="sm" />
          </div>

          <div className="pl-2.5 border-l border-white/15 flex items-center gap-2">
            <span className="font-condensed font-extrabold text-lg text-[#F5F5F7] tabular-nums">
              {String(hud.matchMinute).padStart(2, '0')}:{String(hud.matchSecond).padStart(2, '0')}
            </span>
            {hud.inStoppageTime && hud.stoppageMinutes > 0 && (
              <span className="px-1.5 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed font-extrabold text-xs">
                +{hud.stoppageMinutes}&apos;
              </span>
            )}
            <span className="text-[10px] font-condensed uppercase tracking-wider text-[#9498A3] font-bold">
              {hud.half === 'FT'
                ? 'FIM'
                : hud.half === 'HT'
                  ? 'INT'
                  : `${hud.half}ºT`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={onCycleCamera}
            className="px-2.5 py-1 bg-[#0B0B0D]/72 hover:bg-[#1C1F28] border border-white/15 font-condensed uppercase font-bold text-[11px] tracking-wider text-[#D4D7E0] cursor-pointer"
          >
            {CAMERA_LABELS[hud.cameraPreset]} ({lblSelect}/V)
          </button>
          <button
            type="button"
            onClick={onTogglePause}
            className="px-2.5 py-1 bg-[#0B0B0D]/72 hover:bg-[#1C1F28] border border-white/15 font-condensed uppercase font-bold text-[11px] tracking-wider text-[#C8A45D] cursor-pointer"
          >
            MENU ({lblStart}/ESC)
          </button>
        </div>
      </div>

      {/* CENTRO: Tarja de Evento OU Menu Enxuto de Pausa / Fim de Jogo (100% Controle & Mouse!) */}
      <div className="my-auto flex flex-col items-center justify-center">
        {(hud.paused || hud.half === 'FT') ? (
          <div
            style={{ borderTopColor: accentColor }}
            className="pointer-events-auto bg-[#0B0B0D]/95 border border-white/20 border-t-4 p-6 w-full max-w-md shadow-2xl backdrop-blur-md"
          >
            <div className="text-center border-b border-[#242730] pb-3 mb-4">
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#C8A45D] font-bold">
                {hud.half === 'FT' ? 'FIM DO CLÁSSICO 11v11' : derbyName}
              </div>
              <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] mt-0.5">
                {homeClub.shortName} {hud.homeGoals} : {hud.awayGoals} {rivalClub.shortName}
              </div>
              <div className="text-[11px] font-condensed uppercase tracking-wider text-[#9498A3] mt-1">
                #{player.shirtNumber} {player.shirtName} • {hud.userGoals} GOLS • {hud.userAssists} ASSIST
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {pauseOptions.map((opt, idx) => {
                const selected = hud.pauseMenuIndex === idx;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={opt.action}
                    className={`w-full px-4 py-2.5 font-condensed uppercase font-extrabold text-base tracking-wider text-left flex items-center justify-between cursor-pointer border transition-colors ${
                      selected
                        ? 'bg-[#F5F5F7] text-[#0B0B0D] border-[#F5F5F7]'
                        : 'bg-[#141720] text-[#D4D7E0] border-[#242730] hover:bg-[#1E2230]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selected && <span className="text-xs">[{lblConfirm}] ›</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-[#242730] text-[10px] font-condensed uppercase tracking-wider text-[#9498A3] text-center leading-relaxed">
              <strong className="text-[#F5F5F7]">ATAQUE:</strong> {lblBackBtn} Chute • {lblRB}+{lblBackBtn} Chapada • {lblConfirm} Passe • {lblThrough} Enfiada • {lblLob} Cruzar
              <br />
              <strong className="text-[#F5F5F7]">DEFESA:</strong> {lblConfirm} Bote • {lblLob} Carrinho • {lblRB} Pressão IA
            </div>
          </div>
        ) : (
          hud.bannerFeedback && (
            <div
              style={{ borderColor: hud.bannerFeedback.color }}
              className="bg-[#0B0B0D]/88 border-y-2 px-8 py-2 text-center shadow-2xl backdrop-blur-md"
            >
              <div
                style={{ color: hud.bannerFeedback.color }}
                className="font-condensed uppercase font-extrabold text-3xl tracking-wider leading-none"
              >
                {hud.bannerFeedback.text}
              </div>
              {hud.bannerFeedback.subtext && (
                <div className="font-condensed uppercase font-bold text-xs tracking-[0.22em] text-[#E2E8F0] mt-1">
                  {hud.bannerFeedback.subtext}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* RODAPÉ LIMPO: Duas Barrinhas FIFA (Esq) + Radar 2D Compacto (Centro) */}
      <div className="grid grid-cols-12 items-end gap-4">
        <div className="col-span-4 flex items-end">
          <div className="bg-[#080A0F]/48 border border-white/12 px-2 py-1.5 w-44 backdrop-blur-sm space-y-1.5">
            <div className="w-full h-[5px] bg-black/55 relative overflow-hidden">
              {maxStaminaPct < 99.5 && (
                <div
                  className="absolute top-0 bottom-0 right-0 bg-white/[0.08] border-l border-white/35"
                  style={{ width: `${100 - maxStaminaPct}%` }}
                />
              )}
              <div
                className="h-full transition-all duration-75"
                style={{ width: `${staminaPct}%`, backgroundColor: staminaColor }}
              />
            </div>

            <div className="w-full h-[8px] bg-black/60 border border-white/10 relative overflow-hidden">
              <div
                className="h-full overflow-hidden transition-none"
                style={{ width: `${powerPct}%` }}
              >
                <div
                  className="h-full w-44"
                  style={{
                    background:
                      'linear-gradient(90deg, #22C55E 0%, #84CC16 32%, #FACC15 58%, #F97316 80%, #EF4444 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-4 flex justify-center">
          <div className="relative w-[176px] h-[112px] bg-[#0B1912]/68 border border-white/18 backdrop-blur-sm overflow-hidden shadow-lg">
            <svg
              viewBox="0 0 210 136"
              className="absolute inset-0 w-full h-full opacity-30"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1.2"
            >
              <rect x="4" y="4" width="202" height="128" />
              <line x1="105" y1="4" x2="105" y2="132" />
              <circle cx="105" cy="68" r="18" />
              <rect x="4" y="28" width="32" height="80" />
              <rect x="174" y="28" width="32" height="80" />
            </svg>

            {hud.radarDots.map((dot) => {
              const leftPct = Math.max(2, Math.min(98, toRadarLeftPct(dot.z)));
              const topPct = Math.max(3, Math.min(97, toRadarTopPct(dot.x)));
              const bg = dot.isUser
                ? '#FACC15'
                : dot.team === 'HOME'
                  ? homeClub.primaryColor || '#2DBE60'
                  : awayRenderClub.primaryColor || '#F8FAFC';

              return (
                <span
                  key={dot.id}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    backgroundColor: bg,
                    borderColor: dot.isUser ? '#FFFFFF' : '#0B0B0D',
                    zIndex: dot.isUser ? 30 : dot.hasBall ? 25 : 10,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 border ${
                    dot.isUser ? 'w-2.5 h-2.5 border-2' : 'w-2 h-2'
                  }`}
                />
              );
            })}

            <span
              style={{
                left: `${Math.max(2, Math.min(98, toRadarLeftPct(hud.ballZ)))}%`,
                top: `${Math.max(3, Math.min(97, toRadarTopPct(hud.ballX)))}%`,
                zIndex: 40,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-black"
            />
          </div>
        </div>

        <div className="col-span-4" />
      </div>
    </div>
  );
};
