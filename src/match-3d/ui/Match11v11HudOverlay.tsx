import React from 'react';
import { ClubData } from '../../data/clubs/types';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { useGamepadStore } from '../../shared/gamepad/gamepadStore';
import { ClubCrest } from '../../shared/ui/ClubCrest';
import { PITCH } from '../physics/pitchConstants';
import { ReplayCameraAngle } from '../replay/goalReplaySystem';

export type MatchCameraPreset = 'BROADCAST_TV' | 'PRO_TACTICAL' | 'PRO_CLOSE';
export type RadarDisplayMode = 'AUTO_FADE' | 'ALWAYS_VISIBLE' | 'HIDDEN';

export interface RadarDotSnapshot {
  id: string;
  x: number;
  z: number;
  team: 'HOME' | 'AWAY';
  isUser?: boolean;
  isGk?: boolean;
  hasBall?: boolean;
}

export interface LiveMatchStatsSnapshot {
  homePossessionPct: number;
  awayPossessionPct: number;
  homeShots: number;
  awayShots: number;
  homePasses: number;
  awayPasses: number;
  homeTackles: number;
  awayTackles: number;
  homeSaves: number;
  awaySaves: number;
  homeCorners: number;
  awayCorners: number;
  userPasses: number;
  userTackles: number;
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
  pauseTab: 'MAIN' | 'SETTINGS';
  pauseMenuIndex: number;
  isReplayActive: boolean;
  replayAngle: ReplayCameraAngle;
  replayScorerText: string;
  stamina: number;
  maxStamina: number;
  powerPct: number;
  cameraPreset: MatchCameraPreset;
  radarMode: RadarDisplayMode;
  homeFormationLabel: string;
  awayFormationLabel: string;
  /** Pequena etiqueta discreta no placar superior esquerdo (NUNCA no meio da tela!) */
  scorebugTicker: { text: string; color: string } | null;
  ballX: number;
  ballZ: number;
  userX: number;
  radarDots: RadarDotSnapshot[];
  stats: LiveMatchStatsSnapshot;
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
  onOpenSettingsTab: (tab: 'MAIN' | 'SETTINGS') => void;
  onLaunchInstantReplay: () => void;
  onCycleReplayAngle: () => void;
  onCycleCamera: () => void;
  onCycleRadarMode: () => void;
  onSkipReplay: () => void;
  onRestartMatch: () => void;
  onExit: () => void;
}

const CAMERA_LABELS: Record<MatchCameraPreset, string> = {
  BROADCAST_TV: 'TV LATERAL',
  PRO_TACTICAL: 'PRO TÁTICA',
  PRO_CLOSE: 'PRO IMERSIVA',
};

const RADAR_LABELS: Record<RadarDisplayMode, string> = {
  AUTO_FADE: 'AUTO-TRANSPARENTE',
  ALWAYS_VISIBLE: 'SEMPRE VISÍVEL',
  HIDDEN: 'DESLIGADO',
};

const REPLAY_ANGLE_LABELS: Record<ReplayCameraAngle, string> = {
  BEHIND_WIDE: 'AMPLA DE COSTAS',
  TV_BROADCAST: 'TV TRANSMISSÃO',
  BEHIND_GOAL: 'ATRÁS DO GOL',
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
  onOpenSettingsTab,
  onLaunchInstantReplay,
  onCycleReplayAngle,
  onCycleCamera,
  onCycleRadarMode,
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
  const lblStart = isPS ? 'OPTIONS' : 'START';

  const staminaPct = Math.max(0, Math.min(100, hud.stamina));
  const maxStaminaPct = Math.max(25, Math.min(100, hud.maxStamina));
  const powerPct = Math.max(0, Math.min(100, hud.powerPct));
  const staminaColor =
    staminaPct < 24 ? '#EF4444' : staminaPct < 48 ? '#F59E0B' : '#E2E8F0';

  const toRadarLeftPct = (z: number) => ((PITCH.HALF_L - z) / PITCH.LENGTH) * 100;
  const toRadarTopPct = (x: number) => ((x + PITCH.HALF_W) / PITCH.WIDTH) * 100;

  // 1. MODO REPLAY DE TRANSMISSÃO (Ângulo aberto + troca de câmera no Y + pular no A!)
  if (hud.isReplayActive) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-6 select-none">
        <div className="flex items-center justify-between">
          <div className="bg-[#0B0B0D]/88 border-l-4 border-l-[#EF4444] border border-white/15 px-4 py-2 flex items-center gap-3 backdrop-blur-md">
            <span className="w-2.5 h-2.5 bg-[#EF4444] inline-block animate-pulse" />
            <div>
              <div className="text-[10px] font-condensed uppercase tracking-[0.24em] text-[#C8A45D] font-bold">
                REPLAY • {REPLAY_ANGLE_LABELS[hud.replayAngle]}
              </div>
              <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7] leading-none mt-0.5">
                {hud.replayScorerText || `${homeClub.shortName} ${hud.homeGoals} : ${hud.awayGoals} ${rivalClub.shortName}`}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pointer-events-auto">
          <button
            type="button"
            onClick={onCycleReplayAngle}
            className="bg-[#0B0B0D]/88 hover:bg-[#1C1F28] border border-white/20 px-4 py-2 font-condensed uppercase font-bold text-xs tracking-wider text-[#C8A45D] cursor-pointer"
          >
            [{lblThrough}] CÂMERA: {REPLAY_ANGLE_LABELS[hud.replayAngle]}
          </button>
          <button
            type="button"
            onClick={onSkipReplay}
            className="bg-[#F5F5F7] hover:bg-[#E2E8F0] text-[#0B0B0D] px-5 py-2 font-condensed uppercase font-extrabold text-xs tracking-wider cursor-pointer"
          >
            [{lblConfirm} / ESPAÇO] CONTINUAR ›
          </button>
        </div>
      </div>
    );
  }

  // 2. MENU DE PAUSA / FIM DE PARTIDA EM TELA CHEIA ESTILO EA SPORTS FC (100vw × 100vh)
  if (hud.paused || hud.half === 'FT') {
    const isFT = hud.half === 'FT';
    const mainItems = isFT
      ? [
          { title: 'JOGAR CLÁSSICO NOVAMENTE', sub: 'Reiniciar partida desde o 1º tempo', action: onRestartMatch },
          { title: 'REPLAY DO ÚLTIMO LANCE', sub: 'Rever os últimos segundos em múltiplos ângulos', action: onLaunchInstantReplay },
          { title: 'CONFIGURAÇÕES DE JOGO', sub: `Câmera (${CAMERA_LABELS[hud.cameraPreset]}) & Radar`, action: () => onOpenSettingsTab('SETTINGS') },
          { title: 'SAIR PARA O MENU PRINCIPAL', sub: 'Encerrar sessão e voltar ao início', action: onExit },
        ]
      : [
          { title: 'CONTINUAR PARTIDA', sub: 'Voltar imediatamente ao gramado', action: onResume },
          { title: 'REPLAY DO LANCE', sub: 'Rever os últimos 5 segundos em câmera aberta', action: onLaunchInstantReplay },
          { title: 'CONFIGURAÇÕES DE JOGO', sub: `Câmera (${CAMERA_LABELS[hud.cameraPreset]}) & Radar`, action: () => onOpenSettingsTab('SETTINGS') },
          { title: 'REINICIAR PARTIDA', sub: 'Zerar placar e dar nova saída de bola', action: onRestartMatch },
          { title: 'SAIR PARA O MENU PRINCIPAL', sub: 'Voltar à tela inicial', action: onExit },
        ];

    const settingsItems = [
      {
        title: 'CÂMERA DE JOGO',
        value: CAMERA_LABELS[hud.cameraPreset],
        action: onCycleCamera,
      },
      {
        title: 'RADAR TÁTICO 2D',
        value: RADAR_LABELS[hud.radarMode],
        action: onCycleRadarMode,
      },
      {
        title: 'VOLTAR AO MENU DA PARTIDA',
        value: lblBackBtn,
        action: () => onOpenSettingsTab('MAIN'),
      },
    ];

    const statRows: { label: string; home: number | string; away: number | string; hPct: number }[] = [
      {
        label: 'POSSE DE BOLA',
        home: `${hud.stats.homePossessionPct}%`,
        away: `${hud.stats.awayPossessionPct}%`,
        hPct: hud.stats.homePossessionPct,
      },
      {
        label: 'FINALIZAÇÕES',
        home: hud.stats.homeShots,
        away: hud.stats.awayShots,
        hPct:
          hud.stats.homeShots + hud.stats.awayShots > 0
            ? (hud.stats.homeShots / (hud.stats.homeShots + hud.stats.awayShots)) * 100
            : 50,
      },
      {
        label: 'PASSES TOTAIS',
        home: hud.stats.homePasses,
        away: hud.stats.awayPasses,
        hPct:
          hud.stats.homePasses + hud.stats.awayPasses > 0
            ? (hud.stats.homePasses / (hud.stats.homePasses + hud.stats.awayPasses)) * 100
            : 50,
      },
      {
        label: 'DESARMES',
        home: hud.stats.homeTackles,
        away: hud.stats.awayTackles,
        hPct:
          hud.stats.homeTackles + hud.stats.awayTackles > 0
            ? (hud.stats.homeTackles / (hud.stats.homeTackles + hud.stats.awayTackles)) * 100
            : 50,
      },
      {
        label: 'ESCANTEIOS',
        home: hud.stats.homeCorners,
        away: hud.stats.awayCorners,
        hPct:
          hud.stats.homeCorners + hud.stats.awayCorners > 0
            ? (hud.stats.homeCorners / (hud.stats.homeCorners + hud.stats.awayCorners)) * 100
            : 50,
      },
      {
        label: 'DEFESAS DO GOLEIRO',
        home: hud.stats.homeSaves,
        away: hud.stats.awaySaves,
        hPct:
          hud.stats.homeSaves + hud.stats.awaySaves > 0
            ? (hud.stats.homeSaves / (hud.stats.homeSaves + hud.stats.awaySaves)) * 100
            : 50,
      },
    ];

    const userRating = Math.min(
      10.0,
      Math.max(
        5.5,
        6.2 +
          hud.userGoals * 1.3 +
          hud.userAssists * 0.9 +
          hud.stats.userPasses * 0.08 +
          hud.stats.userTackles * 0.18,
      ),
    ).toFixed(1);

    return (
      <div className="pointer-events-auto absolute inset-0 z-40 w-screen h-screen bg-[#090B10]/94 backdrop-blur-md flex flex-col justify-between px-8 md:px-14 py-7 select-none">
        {/* CABEÇALHO DE TRANSMISSÃO DO CLÁSSICO */}
        <header className="flex items-center justify-between border-b border-[#242730] pb-4 shrink-0">
          <div>
            <div className="text-[11px] uppercase tracking-[0.26em] text-[#C8A45D] font-bold">
              {isFT ? 'FIM DE JOGO • ESTATÍSTICAS OFICIAIS' : `JOGO PAUSADO • ${derbyName}`}
            </div>
            <div className="text-xs uppercase tracking-widest text-[#9498A3] mt-0.5">
              {homeClub.stadiumName ?? homeClub.name} • {String(hud.matchMinute).padStart(2, '0')}&apos; ({isFT ? '90 MIN' : `${hud.half}º TEMPO`})
            </div>
          </div>

          {/* Placar Monumental Centralizado à Direita */}
          <div className="flex items-center gap-5 bg-[#11141C] border border-[#242730] px-6 py-2.5">
            <div className="flex items-center gap-3">
              <ClubCrest clubId={homeClub.id} size="md" />
              <div className="text-right">
                <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] leading-none">
                  {homeClub.name}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">
                  {hud.homeFormationLabel}
                </div>
              </div>
            </div>

            <div className="px-4 py-1 bg-[#0B0B0D] border border-white/12 font-condensed font-extrabold text-4xl text-[#F5F5F7] tabular-nums">
              {hud.homeGoals} <span className="text-[#565A65]">:</span> {hud.awayGoals}
            </div>

            <div className="flex items-center gap-3">
              <div>
                <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] leading-none">
                  {rivalClub.name}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">
                  {hud.awayFormationLabel}
                </div>
              </div>
              <ClubCrest clubId={rivalClub.id} size="md" />
            </div>
          </div>
        </header>

        {/* CORPO BENTO EM 12 COLUNAS: Navegação/Configurações (Esq 5) + Central de Estatísticas FIFA (Dir 7) */}
        <main className="flex-1 grid lg:grid-cols-12 gap-7 py-6 min-h-0 overflow-hidden">
          <div className="lg:col-span-5 flex flex-col justify-between gap-3 min-h-0">
            <div className="flex flex-col gap-2.5">
              {hud.pauseTab === 'MAIN'
                ? mainItems.map((item, idx) => {
                    const active = hud.pauseMenuIndex === idx;
                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={item.action}
                        style={{ borderLeftColor: active ? accentColor : '#242730' }}
                        className={`w-full text-left p-4 border border-l-4 cursor-pointer transition-colors flex items-center justify-between ${
                          active
                            ? 'bg-[#191D28] border-white/35 text-[#F5F5F7]'
                            : 'bg-[#101218] border-[#242730] text-[#9498A3] hover:bg-[#151821] hover:text-[#F5F5F7]'
                        }`}
                      >
                        <div>
                          <div className="font-condensed uppercase font-extrabold text-xl tracking-wide leading-none text-[#F5F5F7]">
                            {item.title}
                          </div>
                          <div className="text-[11px] uppercase tracking-wider text-[#9498A3] mt-1">
                            {item.sub}
                          </div>
                        </div>
                        {active && (
                          <span className="px-2.5 py-1 bg-[#F5F5F7] text-[#0B0B0D] font-condensed font-extrabold text-xs tracking-wider shrink-0">
                            [{lblConfirm}]
                          </span>
                        )}
                      </button>
                    );
                  })
                : settingsItems.map((item, idx) => {
                    const active = hud.pauseMenuIndex === idx;
                    return (
                      <button
                        key={item.title}
                        type="button"
                        onClick={item.action}
                        style={{ borderLeftColor: active ? accentColor : '#242730' }}
                        className={`w-full text-left p-4 border border-l-4 cursor-pointer transition-colors flex items-center justify-between ${
                          active
                            ? 'bg-[#191D28] border-white/35 text-[#F5F5F7]'
                            : 'bg-[#101218] border-[#242730] text-[#9498A3] hover:bg-[#151821]'
                        }`}
                      >
                        <span className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7]">
                          {item.title}
                        </span>
                        <span className="px-3 py-1 bg-[#0B0B0D] border border-[#C8A45D] font-condensed uppercase font-extrabold text-sm text-[#C8A45D]">
                          ◄ {item.value} ►
                        </span>
                      </button>
                    );
                  })}
            </div>

            {/* Card Resumo de Comandos */}
            <div className="bg-[#101218] border border-[#242730] p-3.5 text-[11px] font-condensed uppercase tracking-wider text-[#9498A3] space-y-1">
              <div className="text-[#C8A45D] font-bold tracking-widest text-[10px]">
                COMANDOS DE CAMPO ({brand})
              </div>
              <div>
                <strong className="text-[#F5F5F7]">COM BOLA:</strong> {lblBackBtn} Chute • {lblRB}+{lblBackBtn} Chapada • {lblConfirm} Passe Rasteiro • {lblThrough} Enfiada • {lblLob} Cruzar
              </div>
              <div>
                <strong className="text-[#F5F5F7]">SEM BOLA / DEFESA:</strong> {lblConfirm} Pedir Passe / Dar Bote • {lblThrough} Pedir Enfiada • {lblLob} Carrinho • {lblRB} Pressão IA
              </div>
            </div>
          </div>

          {/* Coluna Direita: Estatísticas Completas da Partida + Sua Nota */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4 min-h-0">
            <div className="bg-[#101218] border border-[#242730] p-5 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#242730] pb-2.5">
                <span className="font-condensed uppercase font-extrabold text-sm tracking-widest text-[#F5F5F7]">
                  {homeClub.shortName}
                </span>
                <span className="text-[11px] uppercase tracking-[0.24em] text-[#C8A45D] font-bold">
                  CENTRAL DE ESTATÍSTICAS DA PARTIDA
                </span>
                <span className="font-condensed uppercase font-extrabold text-sm tracking-widest text-[#F5F5F7]">
                  {rivalClub.shortName}
                </span>
              </div>

              <div className="space-y-3.5 my-auto py-2">
                {statRows.map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between font-condensed uppercase font-extrabold text-base">
                      <span className="text-[#F5F5F7] tabular-nums w-14">{row.home}</span>
                      <span className="text-xs tracking-[0.2em] text-[#9498A3] font-bold">
                        {row.label}
                      </span>
                      <span className="text-[#F5F5F7] tabular-nums w-14 text-right">{row.away}</span>
                    </div>
                    <div className="w-full h-2 bg-[#1E222D] flex overflow-hidden">
                      <div
                        style={{
                          width: `${Math.max(4, Math.min(96, row.hPct))}%`,
                          backgroundColor: homeClub.primaryColor || accentColor,
                        }}
                        className="h-full border-r-2 border-[#090B10]"
                      />
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: awayRenderClub.primaryColor || '#9498A3',
                        }}
                        className="h-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ficha de Desempenho Individual do seu Craque */}
            <div
              style={{ borderLeftColor: accentColor }}
              className="bg-[#101218] border border-[#242730] border-l-4 px-5 py-3.5 flex items-center justify-between gap-4 shrink-0"
            >
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#9498A3]">
                  SEU DESEMPENHO EM CAMPO ({player.position})
                </div>
                <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] mt-0.5">
                  #{player.shirtNumber} {player.fullName}
                </div>
              </div>

              <div className="flex items-center gap-5 text-center font-condensed uppercase">
                <div>
                  <div className="text-2xl font-extrabold text-[#F5F5F7] leading-none">{hud.userGoals}</div>
                  <div className="text-[10px] tracking-widest text-[#9498A3]">GOLS</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#F5F5F7] leading-none">{hud.userAssists}</div>
                  <div className="text-[10px] tracking-widest text-[#9498A3]">ASSIST</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#F5F5F7] leading-none">{hud.stats.userPasses}</div>
                  <div className="text-[10px] tracking-widest text-[#9498A3]">PASSES</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#F5F5F7] leading-none">{hud.stats.userTackles}</div>
                  <div className="text-[10px] tracking-widest text-[#9498A3]">DESARMES</div>
                </div>
                <div className="pl-4 border-l border-[#242730]">
                  <div className="px-3 py-1 bg-[#2DBE60] text-[#0B0B0D] font-extrabold text-2xl leading-none">
                    {userRating}
                  </div>
                  <div className="text-[9px] tracking-widest text-[#9498A3] mt-1">NOTA</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-[#242730] pt-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-[#9498A3] shrink-0">
          <span>D-PAD ↑↓ NAVEGAR • [{lblConfirm}] SELECIONAR • [{lblBackBtn}] VOLTAR AO JOGO</span>
          <span>THREE STARS SOCCER • 11v11 BROADCAST ENGINE</span>
        </footer>
      </div>
    );
  }

  // 3. JOGO AO VIVO: ZERO AVISOS NO MEIO DA TELA + RADAR FANTASMA TRANSLÚCIDO ESTILO FIFA!
  const ballOrUserInBottomZone = hud.ballX > 9.5 || hud.userX > 9.5;
  const radarOpacity =
    hud.radarMode === 'AUTO_FADE' && ballOrUserInBottomZone ? 0.13 : 0.78;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 select-none">
      {/* TOPO: Scorebug compacto à esquerda (com ticker embutido embaixo dele) + Botão discreto de Pausa */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col items-start">
          <div
            style={{ borderLeftColor: accentColor }}
            className="bg-[#0B0B0D]/86 border border-white/15 border-l-4 px-3 py-1.5 flex items-center gap-2.5 backdrop-blur-md"
          >
            <div className="flex items-center gap-1.5">
              <ClubCrest clubId={homeClub.id} size="sm" />
              <span className="font-condensed uppercase font-extrabold text-base text-[#F5F5F7] tracking-wide">
                {homeClub.shortName}
              </span>
              <span
                className="w-1 h-3.5 inline-block"
                style={{ backgroundColor: homeClub.primaryColor || '#2DBE60' }}
              />
            </div>

            <div className="bg-[#141720] border border-white/10 px-2 py-0.5 font-condensed font-extrabold text-lg text-[#F5F5F7] tabular-nums leading-none">
              {hud.homeGoals} : {hud.awayGoals}
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className="w-1 h-3.5 inline-block"
                style={{ backgroundColor: awayRenderClub.primaryColor || '#F5F5F7' }}
              />
              <span className="font-condensed uppercase font-extrabold text-base text-[#F5F5F7] tracking-wide">
                {rivalClub.shortName}
              </span>
              <ClubCrest clubId={rivalClub.id} size="sm" />
            </div>

            <div className="pl-2 border-l border-white/15 flex items-center gap-1.5">
              <span className="font-condensed font-extrabold text-base text-[#F5F5F7] tabular-nums">
                {String(hud.matchMinute).padStart(2, '0')}:{String(hud.matchSecond).padStart(2, '0')}
              </span>
              {hud.inStoppageTime && hud.stoppageMinutes > 0 && (
                <span className="px-1 bg-[#C8A45D] text-[#0B0B0D] font-condensed font-extrabold text-[11px]">
                  +{hud.stoppageMinutes}&apos;
                </span>
              )}
              <span className="text-[10px] font-condensed uppercase tracking-wider text-[#9498A3] font-bold">
                {hud.half === 'HT' ? 'INT' : `${hud.half}ºT`}
              </span>
            </div>
          </div>

          {/* Ticker discreto colado sob o placar no canto superior esquerdo (NUNCA tampa o campo!) */}
          {hud.scorebugTicker && (
            <div
              style={{ borderLeftColor: hud.scorebugTicker.color, color: hud.scorebugTicker.color }}
              className="bg-[#0B0B0D]/82 border border-t-0 border-white/10 border-l-4 px-3 py-0.5 font-condensed uppercase font-extrabold text-xs tracking-wider"
            >
              {hud.scorebugTicker.text}
            </div>
          )}
        </div>

        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={onTogglePause}
            className="px-2.5 py-1 bg-[#0B0B0D]/65 hover:bg-[#1C1F28] border border-white/15 font-condensed uppercase font-bold text-[11px] tracking-wider text-[#D4D7E0] cursor-pointer"
          >
            PAUSA ({lblStart} / ESC)
          </button>
        </div>
      </div>

      {/* RODAPÉ: Duas Barrinhas FIFA (Esq) + Radar 2D Auto-Transparente (Centro) */}
      <div className="grid grid-cols-12 items-end gap-4">
        <div className="col-span-4 flex items-end">
          <div className="bg-[#080A0F]/45 border border-white/12 px-2 py-1.5 w-40 backdrop-blur-sm space-y-1">
            <div className="w-full h-[4px] bg-black/55 relative overflow-hidden">
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

            <div className="w-full h-[7px] bg-black/60 border border-white/10 relative overflow-hidden">
              <div
                className="h-full overflow-hidden transition-none"
                style={{ width: `${powerPct}%` }}
              >
                <div
                  className="h-full w-40"
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
          {hud.radarMode !== 'HIDDEN' && (
            <div
              style={{ opacity: radarOpacity }}
              className="relative w-[150px] h-[92px] bg-black/28 border border-white/20 overflow-hidden transition-opacity duration-200"
            >
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
                      dot.isUser ? 'w-2.5 h-2.5 border-2' : 'w-1.5 h-1.5'
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
          )}
        </div>

        <div className="col-span-4" />
      </div>
    </div>
  );
};
