import React from 'react';
import { AnyCompetitionId, getCompetitionTheme } from '../../../data/world/competitionThemes';

interface MatchDayTileThemeArtProps {
  competitionId: AnyCompetitionId;
}

/**
 * Camada artística de transmissão oficial para o quadradinho inteiro do Dia de Jogo no calendário.
 * Baseada nas identidades visuais reais de TV de cada campeonato:
 * - UEFA Champions League ("Kick of Light": azul meia-noite profundo + Starball translúcida + prisma multicolorido)
 * - Brasileirão Série A (verde esmeralda + amarelo canário + faixas cinéticas laranja/verde de transmissão)
 * - CONMEBOL Libertadores ("Gloria Eterna": preto noturno + feixes dourados metálicos)
 * - Premier League ("Electric Pulse": roxo profundo #38003C + ondas neon verde-menta #00FF85 e rosa #FF2882)
 * - LaLiga EA Sports (vermelho coral #FF4B44 + chevrons duplos angulares estilo HUD)
 * - Serie A (azul azzurro profundo + facetas de diamante + filete tricolore italiano)
 * - Bundesliga (aço escuro + vermelho autêntico #D3010C + linhas técnicas brancas de precisão)
 * - Ligue 1 (azul marinho noturno + geometria octogonal verde-lima #CEF000)
 * - Copa do Mundo FIFA (ouro imperial + bordô/obsidiana + arcos globais e mosaico)
 */
export const MatchDayTileThemeArt: React.FC<MatchDayTileThemeArtProps> = ({ competitionId }) => {
  const theme = getCompetitionTheme(competitionId);

  const renderCompetitionSvg = () => {
    switch (competitionId) {
      case 'CHAMPIONS_LEAGUE':
      case 'UEFA_POOL':
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="uclBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#030824" />
                <stop offset="52%" stopColor="#0A1D5E" />
                <stop offset="100%" stopColor="#132F8C" />
              </linearGradient>
              <linearGradient id="uclPrism" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="38%" stopColor="#FFFFFF" />
                <stop offset="72%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#818CF8" />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill="url(#uclBg)" />
            {/* Arcos de Cúpula e Starball Translúcida */}
            <circle cx="60" cy="82" r="56" fill="none" stroke="#38BDF8" strokeOpacity="0.22" strokeWidth="1.2" />
            <circle cx="60" cy="82" r="40" fill="none" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1" />
            <polygon
              points="60,26 67,48 90,48 71,61 78,83 60,70 42,83 49,61 30,48 53,48"
              fill="#FFFFFF"
              fillOpacity="0.09"
              stroke="#38BDF8"
              strokeOpacity="0.28"
              strokeWidth="0.9"
            />
            <polygon
              points="104,18 108,30 120,30 110,38 114,50 104,42 94,50 98,38 88,30 100,30"
              fill="#EC4899"
              fillOpacity="0.14"
            />
            <polygon
              points="16,112 20,124 32,124 22,131 26,143 16,135 6,143 10,131 0,124 12,124"
              fill="#38BDF8"
              fillOpacity="0.16"
            />
            {/* Feixes Prismáticos "Kick of Light" */}
            <polygon points="-10,138 130,68 130,84 -10,152" fill="url(#uclPrism)" fillOpacity="0.22" />
            <rect x="0" y="0" width="120" height="3" fill="url(#uclPrism)" />
          </svg>
        );

      case 'EUROPA_LEAGUE':
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="uelBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#140802" />
                <stop offset="60%" stopColor="#2B1103" />
                <stop offset="100%" stopColor="#471C05" />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill="url(#uelBg)" />
            {/* Energy Wave Angular da Europa League */}
            <polyline
              points="-8,118 34,76 62,102 104,48 128,68"
              fill="none"
              stroke="#FF6900"
              strokeOpacity="0.42"
              strokeWidth="12"
            />
            <polyline
              points="-8,134 34,92 62,118 104,64 128,84"
              fill="none"
              stroke="#FDBA74"
              strokeOpacity="0.24"
              strokeWidth="3"
            />
            <rect x="0" y="0" width="120" height="3" fill="#FF6900" />
          </svg>
        );

      case 'LIBERTADORES':
      case 'CONMEBOL_POOL':
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="libBg" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#0E0B05" />
                <stop offset="55%" stopColor="#261D08" />
                <stop offset="100%" stopColor="#3E2E0A" />
              </linearGradient>
              <radialGradient id="libGlow" cx="50%" cy="52%" r="55%">
                <stop offset="0%" stopColor="#FCD069" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#FCD069" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="120" height="160" fill="url(#libBg)" />
            <rect width="120" height="160" fill="url(#libGlow)" />
            {/* Feixes Dourados "Gloria Eterna" */}
            <polygon points="60,-10 18,160 40,160" fill="#FCD069" fillOpacity="0.14" />
            <polygon points="60,-10 80,160 102,160" fill="#EAB308" fillOpacity="0.14" />
            <circle cx="60" cy="84" r="38" fill="none" stroke="#FCD069" strokeOpacity="0.28" strokeWidth="1.2" />
            <rect x="0" y="0" width="120" height="3" fill="#FCD069" />
          </svg>
        );

      case 'SUL_AMERICANA':
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="sulaBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#061329" />
                <stop offset="60%" stopColor="#0B2956" />
                <stop offset="100%" stopColor="#123D7A" />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill="url(#sulaBg)" />
            <polygon points="-10,126 130,52 130,74 -10,148" fill="#0072CE" fillOpacity="0.32" />
            <polygon points="-10,144 130,70 130,76 -10,150" fill="#F2A900" fillOpacity="0.45" />
            <circle cx="60" cy="84" r="38" fill="none" stroke="#38BDF8" strokeOpacity="0.22" strokeWidth="1.2" />
            <rect x="0" y="0" width="120" height="3" fill="#0072CE" />
          </svg>
        );

      case 'BRA_1':
      case 'BRA_2': {
        const isSerieA = competitionId === 'BRA_1';
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id={`braBg_${competitionId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#051C11" />
                <stop offset="55%" stopColor="#0A3520" />
                <stop offset="100%" stopColor={isSerieA ? '#114A2B' : '#0E3D2E'} />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill={`url(#braBg_${competitionId})`} />
            {/* Losango & Cortes Cinéticos Brasileirão (Verde, Amarelo Canário & Toque Laranja Broadcast) */}
            <polygon points="60,28 106,82 60,136 14,82" fill="#FFDF00" fillOpacity={isSerieA ? '0.11' : '0.06'} />
            <polygon points="-12,38 56,-8 74,-8 -12,54" fill="#00C853" fillOpacity="0.28" />
            <polygon
              points="46,168 132,96 132,116 68,168"
              fill={isSerieA ? '#FF6B00' : '#34D399'}
              fillOpacity="0.28"
            />
            <polygon points="66,168 132,114 132,122 76,168" fill="#FFDF00" fillOpacity="0.45" />
            <rect x="0" y="0" width="84" height="3" fill="#00C853" />
            <rect x="84" y="0" width="36" height="3" fill={isSerieA ? '#FFDF00' : '#34D399'} />
          </svg>
        );
      }

      case 'ENG_1':
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="eplBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#210026" />
                <stop offset="55%" stopColor="#38003C" />
                <stop offset="100%" stopColor="#4F0654" />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill="url(#eplBg)" />
            {/* Premier League "Electric Pulse" — Verde Menta #00FF85 + Rosa Neon #FF2882 + Ciano #04F5FF */}
            <polygon points="0,0 74,0 26,68 0,48" fill="#FF2882" fillOpacity="0.28" />
            <polygon points="120,160 44,160 94,86 120,108" fill="#00FF85" fillOpacity="0.24" />
            <polyline
              points="-6,120 38,88 76,106 126,54"
              fill="none"
              stroke="#04F5FF"
              strokeOpacity="0.34"
              strokeWidth="2.5"
            />
            <rect x="0" y="0" width="76" height="3" fill="#00FF85" />
            <rect x="76" y="0" width="44" height="3" fill="#FF2882" />
          </svg>
        );

      case 'ESP_1':
      case 'ESP_2': {
        const isFirst = competitionId === 'ESP_1';
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id={`espBg_${competitionId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={isFirst ? '#1D0606' : '#061923'} />
                <stop offset="60%" stopColor={isFirst ? '#3D0C0B' : '#0C3245'} />
                <stop offset="100%" stopColor={isFirst ? '#5C1311' : '#134963'} />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill={`url(#espBg_${competitionId})`} />
            {/* Duplo Chevron Cinético LALIGA EA SPORTS */}
            <polyline
              points="74,22 108,82 74,142"
              fill="none"
              stroke="#FF4B44"
              strokeOpacity="0.42"
              strokeWidth="12"
            />
            <polyline
              points="56,34 84,82 56,130"
              fill="none"
              stroke={isFirst ? '#FFFFFF' : '#00A3E0'}
              strokeOpacity="0.22"
              strokeWidth="5"
            />
            <rect x="0" y="0" width="120" height="3" fill={isFirst ? '#FF4B44' : '#00A3E0'} />
          </svg>
        );
      }

      case 'ITA_1':
      case 'ITA_2': {
        const isSerieA = competitionId === 'ITA_1';
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id={`itaBg_${competitionId}`} x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor={isSerieA ? '#04122B' : '#071B10'} />
                <stop offset="60%" stopColor={isSerieA ? '#0A295E' : '#0F3822'} />
                <stop offset="100%" stopColor={isSerieA ? '#103E8A' : '#165232'} />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill={`url(#itaBg_${competitionId})`} />
            {/* Diamante Arquitetônico Serie A + Filete Tricolore */}
            <polygon
              points="60,22 108,82 60,142 12,82"
              fill="none"
              stroke={isSerieA ? '#38BDF8' : '#22C55E'}
              strokeOpacity="0.32"
              strokeWidth="2"
            />
            <polygon
              points="60,38 94,82 60,126 26,82"
              fill={isSerieA ? '#0099FF' : '#22C55E'}
              fillOpacity="0.14"
            />
            <rect x="0" y="0" width="40" height="3" fill="#009246" />
            <rect x="40" y="0" width="40" height="3" fill="#F5F5F7" />
            <rect x="80" y="0" width="40" height="3" fill="#CE2B37" />
          </svg>
        );
      }

      case 'GER_1':
      case 'GER_2':
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="gerBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#14161C" />
                <stop offset="52%" stopColor="#2B070B" />
                <stop offset="100%" stopColor="#540810" />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill="url(#gerBg)" />
            {/* Precisão Modular Bundesliga: Corte Diagonal Vermelho #D3010C + Grade Branca */}
            <polygon points="58,0 120,0 120,96 22,160 0,160" fill="#D3010C" fillOpacity="0.28" />
            <line x1="0" y1="42" x2="120" y2="42" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1" />
            <line x1="0" y1="124" x2="120" y2="124" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1" />
            <rect x="0" y="0" width="90" height="3" fill="#D3010C" />
            <rect x="90" y="0" width="30" height="3" fill="#F5F5F7" />
          </svg>
        );

      case 'FRA_1':
      case 'FRA_2': {
        const isL1 = competitionId === 'FRA_1';
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id={`fraBg_${competitionId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={isL1 ? '#061024' : '#061B1F'} />
                <stop offset="60%" stopColor={isL1 ? '#0D234A' : '#0C343B'} />
                <stop offset="100%" stopColor={isL1 ? '#15346B' : '#124B54'} />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill={`url(#fraBg_${competitionId})`} />
            {/* Hexágono / Geometria Ligue 1 Verde-Lima #CEF000 */}
            <polygon
              points="60,30 98,54 98,108 60,132 22,108 22,54"
              fill="none"
              stroke={isL1 ? '#CEF000' : '#00C4B3'}
              strokeOpacity="0.34"
              strokeWidth="2.2"
            />
            <polygon
              points="-10,134 130,78 130,90 -10,146"
              fill={isL1 ? '#CEF000' : '#00C4B3'}
              fillOpacity="0.22"
            />
            <rect x="0" y="0" width="120" height="3" fill={isL1 ? '#CEF000' : '#00C4B3'} />
          </svg>
        );
      }

      case 'ARG_1':
      case 'ARG_2':
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="argBg" x1="0" y1="0" x2="0.8" y2="1">
                <stop offset="0%" stopColor="#071726" />
                <stop offset="58%" stopColor="#0E2D4B" />
                <stop offset="100%" stopColor="#184773" />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill="url(#argBg)" />
            <rect x="16" y="0" width="22" height="160" fill="#74ACDF" fillOpacity="0.16" />
            <rect x="82" y="0" width="22" height="160" fill="#74ACDF" fillOpacity="0.16" />
            <circle cx="60" cy="82" r="28" fill="#F6B40E" fillOpacity="0.12" />
            <rect x="0" y="0" width="45" height="3" fill="#74ACDF" />
            <rect x="45" y="0" width="30" height="3" fill="#F5F5F7" />
            <rect x="75" y="0" width="45" height="3" fill="#74ACDF" />
          </svg>
        );

      case 'WORLD_CUP':
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id="wcBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#170F05" />
                <stop offset="50%" stopColor="#332008" />
                <stop offset="100%" stopColor="#4A1123" />
              </linearGradient>
              <radialGradient id="wcGoldGlow" cx="50%" cy="50%" r="58%">
                <stop offset="0%" stopColor="#FDE047" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#E5C158" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="120" height="160" fill="url(#wcBg)" />
            <rect width="120" height="160" fill="url(#wcGoldGlow)" />
            {/* Arcos Planetários e Mosaico Dourado da Copa do Mundo */}
            <ellipse cx="60" cy="82" rx="50" ry="32" fill="none" stroke="#E5C158" strokeOpacity="0.32" strokeWidth="1.3" />
            <ellipse cx="60" cy="82" rx="30" ry="54" fill="none" stroke="#FDE047" strokeOpacity="0.22" strokeWidth="1.1" />
            <polygon points="0,0 38,0 0,38" fill="#E5C158" fillOpacity="0.22" />
            <polygon points="120,160 82,160 120,122" fill="#BE123C" fillOpacity="0.32" />
            <rect x="0" y="0" width="120" height="3" fill="#E5C158" />
          </svg>
        );

      case 'COPA_AMERICA':
      case 'EURO_CUP':
      case 'NATIONS_LEAGUE': {
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id={`ntCupBg_${competitionId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={theme.canvasBg} />
                <stop offset="55%" stopColor={theme.bannerBg} />
                <stop offset="100%" stopColor={`${theme.accentPrimary}44`} />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill={`url(#ntCupBg_${competitionId})`} />
            <circle cx="60" cy="82" r="44" fill="none" stroke={theme.accentPrimary} strokeOpacity="0.32" strokeWidth="1.5" />
            <polygon points="-8,128 128,62 128,84 -8,148" fill={theme.accentSecondary} fillOpacity="0.22" />
            <rect x="0" y="0" width="120" height="3" fill={theme.accentPrimary} />
          </svg>
        );
      }

      default:
        // Demais Ligas Nacionais (ENG_2, POR_1, POR_2, USA_1) e Eliminatórias FIFA
        return (
          <svg
            viewBox="0 0 120 160"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <linearGradient id={`genBg_${competitionId}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={theme.canvasBg} />
                <stop offset="55%" stopColor={theme.bannerBg} />
                <stop offset="100%" stopColor={`${theme.accentPrimary}3B`} />
              </linearGradient>
            </defs>
            <rect width="120" height="160" fill={`url(#genBg_${competitionId})`} />
            <polygon points="-10,32 58,-10 78,-10 -10,52" fill={theme.accentPrimary} fillOpacity="0.28" />
            <polygon points="44,170 130,98 130,122 68,170" fill={theme.spotlightSecondary} fillOpacity="0.26" />
            <rect x="0" y="0" width="120" height="3" fill={theme.accentPrimary} />
          </svg>
        );
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {renderCompetitionSvg()}

      {/* Marca d'Água Sutil da Competição no Canto Inferior */}
      {theme.logoUrl && (
        <img
          src={theme.logoUrl}
          alt=""
          aria-hidden="true"
          className="absolute -right-4 -bottom-3 w-20 h-20 object-contain opacity-[0.11] contrast-125"
        />
      )}

      {/* Vinheta suave para garantir leitura perfeita do escudo e data */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,8,13,0.34) 0%, rgba(6,8,13,0.04) 48%, rgba(6,8,13,0.58) 100%)',
        }}
      />
    </div>
  );
};
