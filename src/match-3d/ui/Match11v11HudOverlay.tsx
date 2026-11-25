import React from 'react';
import { ClubData } from '../../data/clubs/types';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { PITCH } from '../physics/pitchConstants';
import { useGamepadStore } from '../../shared/gamepad/gamepadStore';
import { ClubCrest } from '../../shared/ui/ClubCrest';

export type MatchCameraPreset = 'PRO_TACTICAL' | 'PRO_CLOSE' | 'BROADCAST_TV';

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
  half: 1 | 2 | 'FT';
  stamina: number;
  maxStamina: number;
  powerPct: number;
  teamPossession: 'HOME' | 'AWAY' | 'NEUTRAL';
  userHasBall: boolean;
  cameraPreset: MatchCameraPreset;
  homeFormationLabel: string;
  awayFormationLabel: string;
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
  onCycleCamera: () => void;
  onRestartMatch: () => void;
  onExit: () => void;
}

const CAMERA_LABELS: Record<MatchCameraPreset, string> = {
  PRO_TACTICAL: 'PRO TÁTICA',
  PRO_CLOSE: 'PRO IMERSIVA',
  BROADCAST_TV: 'TV LATERAL',
};

export const Match11v11HudOverlay: React.FC<Match11v11HudOverlayProps> = ({
  player,
  homeClub,
  rivalClub,
  awayRenderClub,
  derbyName,
  accentColor,
  hud,
  onCycleCamera,
  onRestartMatch,
  onExit,
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

  const staminaPct = Math.max(0, Math.min(100, hud.stamina));
  const maxStaminaPct = Math.max(25, Math.min(100, hud.maxStamina));
  const powerPct = Math.max(0, Math.min(100, hud.powerPct));
  const staminaColor =
    staminaPct < 24 ? '#EF4444' : staminaPct < 48 ? '#F59E0B' : '#E2E8F0';

  // No radar 2D horizontal (196x126), a esquerda é o Gol Sul (+Z, defendido pelo usuário) e a direita é o Gol Norte (-Z, atacado pelo usuário)!
  const toRadarLeftPct = (z: number) => ((PITCH.HALF_L - z) / PITCH.LENGTH) * 100;
  const toRadarTopPct = (x: number) => ((x + PITCH.HALF_W) / PITCH.WIDTH) * 100;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-5 select-none">
      {/* TOPO: Placar Oficial de Transmissão 11v11 + Câmera/Saída */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div
            style={{ borderLeftColor: accentColor }}
            className="bg-[#0B0B0D]/88 border border-white/15 border-l-4 px-4 py-2 flex items-center gap-4 backdrop-blur-md"
          >
            {/* Mandante */}
            <div className="flex items-center gap-2">
              <ClubCrest clubId={homeClub.id} size="sm" />
              <div className="leading-none">
                <span className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7] tracking-wide block">
                  {homeClub.shortName}
                </span>
                <span className="text-[9px] font-condensed uppercase tracking-widest text-[#9498A3]">
                  {hud.homeFormationLabel}
                </span>
              </div>
              <span
                className="w-1.5 h-6 ml-0.5 inline-block"
                style={{ backgroundColor: homeClub.primaryColor || '#2DBE60' }}
              />
            </div>

            {/* Placar Central */}
            <div className="bg-[#141720] border border-white/12 px-3.5 py-1 font-condensed font-extrabold text-2xl text-[#F5F5F7] tabular-nums tracking-wider">
              {hud.homeGoals} <span className="text-[#565A65]">:</span> {hud.awayGoals}
            </div>

            {/* Visitante (Maior Rival) */}
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-6 mr-0.5 inline-block"
                style={{ backgroundColor: awayRenderClub.primaryColor || '#F5F5F7' }}
              />
              <div className="leading-none text-right">
                <span className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7] tracking-wide block">
                  {rivalClub.shortName}
                </span>
                <span className="text-[9px] font-condensed uppercase tracking-widest text-[#9498A3]">
                  {hud.awayFormationLabel}
                </span>
              </div>
              <ClubCrest clubId={rivalClub.id} size="sm" />
            </div>

            {/* Cronômetro & Tempo */}
            <div className="pl-3 border-l border-white/15 text-right leading-none">
              <div className="text-[9px] uppercase tracking-[0.18em] text-[#C8A45D] font-bold">
                {hud.half === 'FT' ? 'ENCERRADO' : `${hud.half}º TEMPO`}
              </div>
              <div className="font-condensed font-extrabold text-xl text-[#F5F5F7] tabular-nums mt-0.5">
                {String(hud.matchMinute).padStart(2, '0')}:
                {String(hud.matchSecond).padStart(2, '0')}
              </div>
            </div>
          </div>

          {/* Fita compacta do Clássico + Atuação do seu Craque */}
          <div className="bg-[#0B0B0D]/72 border border-white/10 px-3 py-1 flex items-center justify-between gap-4 text-[10px] font-condensed uppercase tracking-wider text-[#D4D7E0] backdrop-blur-sm">
            <span className="font-bold text-[#C8A45D] truncate">{derbyName} • 11v11</span>
            <span>
              VOCÊ (#{player.shirtNumber} {player.shirtName} • {player.position}):{' '}
              <strong className="text-[#F5F5F7]">
                {hud.userGoals}G • {hud.userAssists}A
              </strong>
            </span>
          </div>
        </div>

        {/* Botões Rápidos no Topo Direito */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <span
            className={`px-3 py-1.5 border font-condensed uppercase font-extrabold text-xs tracking-wider ${
              padConnected
                ? 'bg-[#12261A]/85 text-[#2DBE60] border-[#2DBE60]'
                : 'bg-[#0B0B0D]/80 text-[#FACC15] border-[#FACC15]/60'
            }`}
          >
            {padConnected ? `CONTROLE (${brand})` : 'TECLADO / CONTROLE'}
          </span>

          <button
            type="button"
            onClick={onCycleCamera}
            className="px-3 py-1.5 bg-[#0B0B0D]/82 hover:bg-[#1C1F28] border border-[#C8A45D]/70 font-condensed uppercase font-bold text-xs tracking-wider text-[#C8A45D] cursor-pointer"
          >
            CÂMERA: {CAMERA_LABELS[hud.cameraPreset]} ({lblBack} / V)
          </button>

          <button
            type="button"
            onClick={onRestartMatch}
            className="px-3 py-1.5 bg-[#0B0B0D]/82 hover:bg-[#1C1F28] border border-white/15 font-condensed uppercase font-bold text-xs tracking-wider text-[#F5F5F7] cursor-pointer"
          >
            REINICIAR JOGO
          </button>

          <button
            type="button"
            onClick={onExit}
            className="px-4 py-1.5 bg-[#C94040] hover:bg-[#DC2626] text-[#F5F5F7] font-condensed uppercase font-extrabold text-xs tracking-wider cursor-pointer"
          >
            SAIR ({lblStart}) ›
          </button>
        </div>
      </div>

      {/* CENTRO: Tarja de Gol / Intervalo / Fim de Jogo */}
      <div className="my-auto flex flex-col items-center justify-center">
        {hud.bannerFeedback && (
          <div
            style={{ borderColor: hud.bannerFeedback.color }}
            className="bg-[#0B0B0D]/90 border-y-2 px-9 py-2.5 text-center shadow-2xl backdrop-blur-md"
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
        )}

        {hud.half === 'FT' && (
          <div className="mt-4 pointer-events-auto flex items-center gap-3">
            <button
              type="button"
              onClick={onRestartMatch}
              style={{ borderLeftColor: accentColor }}
              className="console-btn-primary px-6 py-2.5 text-sm cursor-pointer"
            >
              JOGAR CLÁSSICO NOVAMENTE ›
            </button>
            <button
              type="button"
              onClick={onExit}
              className="px-5 py-2.5 bg-[#16181D] hover:bg-[#22252E] border border-white/20 font-condensed uppercase font-bold text-sm tracking-wider text-[#F5F5F7] cursor-pointer"
            >
              VOLTAR AO MENU
            </button>
          </div>
        )}
      </div>

      {/* RODAPÉ: Barras FIFA (Esq) + Radar Tático 2D 22 Atletas (Centro) + Guia Contextual (Dir) */}
      <div className="grid grid-cols-12 items-end gap-4">
        {/* Esquerda: Barras de Fôlego + Força */}
        <div className="col-span-4 flex items-end">
          <div className="bg-[#080A0F]/52 border border-white/12 px-2.5 py-2 w-56 backdrop-blur-sm space-y-1.5">
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
        </div>

        {/* Centro: Radar Tático 2D (Mostra as duas formações 11v11 se movimentando ao vivo!) */}
        <div className="col-span-4 flex justify-center">
          <div className="relative w-[204px] h-[130px] bg-[#0B1912]/72 border border-white/20 backdrop-blur-sm overflow-hidden shadow-xl">
            {/* Marcações do gramado no radar (Esquerda = Gol Sul / Defesa; Direita = Gol Norte / Ataque) */}
            <svg
              viewBox="0 0 210 136"
              className="absolute inset-0 w-full h-full opacity-35"
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

            <div className="absolute top-0.5 left-1.5 text-[8px] font-condensed uppercase tracking-widest text-white/45">
              DEF ({homeClub.shortName})
            </div>
            <div className="absolute top-0.5 right-1.5 text-[8px] font-condensed uppercase tracking-widest text-white/45">
              ATA ➔
            </div>

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
                    dot.isUser ? 'w-3 h-3 border-2' : 'w-2 h-2'
                  }`}
                />
              );
            })}

            {/* Ponto da Bola */}
            <span
              style={{
                left: `${Math.max(2, Math.min(98, toRadarLeftPct(hud.ballZ)))}%`,
                top: `${Math.max(3, Math.min(97, toRadarTopPct(hud.ballX)))}%`,
                zIndex: 40,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-black shadow"
            />
          </div>
        </div>

        {/* Direita: Guia Contextual Inteligente (Ataque vs Defesa vs Sem Bola) */}
        <div className="col-span-4 flex justify-end">
          <div className="bg-[#0B0B0D]/66 border border-white/10 px-3.5 py-2 text-[11px] font-condensed uppercase tracking-wider text-[#D4D7E0] flex flex-wrap justify-end items-center gap-x-3 gap-y-1 backdrop-blur-sm">
            {hud.userHasBall ? (
              <>
                <span>
                  <strong className="text-[#EF4444]">{lblShoot}:</strong> CHUTE
                </span>
                <span>
                  <strong className="text-[#C8A45D]">{lblRB}+{lblShoot}:</strong> CHAPADA
                </span>
                <span>
                  <strong className="text-[#A78BFA]">{lblLB}+{lblShoot}:</strong> CAVADINHA
                </span>
                <span>
                  <strong className="text-[#2DBE60]">{lblPass}:</strong> PASSE
                </span>
                <span>
                  <strong className="text-[#FACC15]">{lblThrough}:</strong> ENFIADA
                </span>
                <span>
                  <strong className="text-[#38BDF8]">{lblLob}:</strong> CRUZAR
                </span>
              </>
            ) : hud.teamPossession === 'AWAY' ? (
              <>
                <span>
                  <strong className="text-[#2DBE60]">{lblPass}:</strong> DAR BOTE
                </span>
                <span>
                  <strong className="text-[#38BDF8]">{lblLob}:</strong> CARRINHO
                </span>
                <span>
                  <strong className="text-[#C8A45D]">{lblRB}:</strong> DOBRAR PRESSÃO IA
                </span>
                <span>
                  <strong className="text-[#F5F5F7]">{lblRT}:</strong> PIQUE
                </span>
              </>
            ) : (
              <>
                <span>
                  <strong className="text-[#2DBE60]">{lblPass}:</strong> PEDIR NO PÉ
                </span>
                <span>
                  <strong className="text-[#FACC15]">{lblThrough}:</strong> PEDIR ENFIADA
                </span>
                <span>
                  <strong className="text-[#38BDF8]">{lblLob}:</strong> PEDIR CRUZAMENTO
                </span>
                <span>
                  <strong className="text-[#EF4444]">{lblShoot}:</strong> PEDIR CHUTE IA
                </span>
                <span>
                  <strong className="text-[#F5F5F7]">{lblRT}:</strong> PIQUE
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
