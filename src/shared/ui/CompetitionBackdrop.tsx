import React from 'react';
import { BroadcastMotif, CompetitionTheme } from '../../data/world/competitionThemes';

interface CompetitionBackdropProps {
  theme: CompetitionTheme;
  clubPrimaryColor?: string;
}

const MotifVectors: React.FC<{ motif: BroadcastMotif; primary: string; secondary: string }> = ({
  motif,
  primary,
  secondary,
}) => {
  if (motif === 'SLASHES') {
    // Estilo FIFA 23 Bundesliga / Ligue 1: cortes diagonais técnicos em aço + cor viva da liga
    return (
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-[0.14]"
      >
        <defs>
          <linearGradient id="slashGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={primary} stopOpacity="0.95" />
            <stop offset="100%" stopColor={primary} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points="-80,0 210,0 -140,900 -320,900" fill="url(#slashGrad)" />
        <polygon points="240,0 264,0 -86,900 -110,900" fill={secondary} fillOpacity="0.45" />
        <polygon points="1310,0 1680,0 1330,900 960,900" fill="url(#slashGrad)" fillOpacity="0.55" />
        <polygon points="1265,0 1280,0 930,900 915,900" fill={primary} fillOpacity="0.8" />
        {/* Malha técnica sutil de fundo */}
        <line x1="0" y1="180" x2="1600" y2="180" stroke={secondary} strokeOpacity="0.16" strokeWidth="1" />
        <line x1="0" y1="720" x2="1600" y2="720" stroke={secondary} strokeOpacity="0.16" strokeWidth="1" />
      </svg>
    );
  }

  if (motif === 'PRISMS') {
    // Estilo Premier League / Serie A: prismas angulares e fitas de transmissão
    return (
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-[0.15]"
      >
        <polygon points="0,0 540,0 220,460 0,320" fill={primary} fillOpacity="0.45" />
        <polygon points="1600,0 1120,0 1380,520 1600,380" fill={secondary} fillOpacity="0.5" />
        <polygon points="980,900 1380,440 1600,640 1600,900" fill={primary} fillOpacity="0.32" />
        <polyline
          points="80,900 460,380 860,620 1340,120"
          fill="none"
          stroke={primary}
          strokeOpacity="0.5"
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  if (motif === 'CHEVRONS') {
    // Estilo LaLiga EA Sports / Europa League: chevrons cinéticos angulares
    return (
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-[0.14]"
      >
        <polyline
          points="-40,140 240,450 -40,760"
          fill="none"
          stroke={primary}
          strokeWidth="36"
          strokeOpacity="0.55"
        />
        <polyline
          points="60,140 340,450 60,760"
          fill="none"
          stroke={secondary}
          strokeWidth="8"
          strokeOpacity="0.45"
        />
        <polyline
          points="1640,110 1320,450 1640,790"
          fill="none"
          stroke={primary}
          strokeWidth="44"
          strokeOpacity="0.45"
        />
      </svg>
    );
  }

  if (motif === 'STARBURST') {
    // Estilo Champions League / Euro / Nations League: arcos orbitais e feixes estelares noturnos
    return (
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-[0.16]"
      >
        <circle cx="800" cy="-120" r="560" fill="none" stroke={primary} strokeOpacity="0.4" strokeWidth="2" />
        <circle cx="800" cy="-120" r="760" fill="none" stroke={secondary} strokeOpacity="0.24" strokeWidth="1.5" />
        <polygon points="800,-80 735,280 865,280" fill={primary} fillOpacity="0.22" />
        <polygon points="800,-80 320,440 430,490" fill={primary} fillOpacity="0.18" />
        <polygon points="800,-80 1280,440 1170,490" fill={primary} fillOpacity="0.18" />
      </svg>
    );
  }

  // 'RAYS' — Estilo Libertadores / Brasileirão / Copa do Mundo: feixes de holofote de estádio + linhas de campo
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full opacity-[0.14]"
    >
      <polygon points="180,-40 40,900 340,900" fill={primary} fillOpacity="0.32" />
      <polygon points="1420,-40 1240,900 1560,900" fill={secondary} fillOpacity="0.28" />
      <rect x="140" y="790" width="1320" height="2" fill={primary} fillOpacity="0.35" />
      <circle cx="800" cy="920" r="240" fill="none" stroke={primary} strokeOpacity="0.3" strokeWidth="2" />
    </svg>
  );
};

/**
 * Fundo Atmosférico Dinâmico de Transmissão (Estilo FIFA 23 por Campeonato):
 * Muda a cor base da arena, os feixes de holofote superiores, a geometria da liga
 * e a marca d'água oficial, mantendo os blocos retangulares fixos e legíveis por cima.
 */
export const CompetitionBackdrop: React.FC<CompetitionBackdropProps> = ({
  theme,
  clubPrimaryColor,
}) => {
  const rightGlow = clubPrimaryColor || theme.spotlightSecondary;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden transition-colors duration-500"
      style={{ backgroundColor: theme.canvasBg }}
    >
      {/* Holofotes Volumétricos Superiores da Competição + Clube */}
      <div
        className="absolute inset-0 transition-all duration-500"
        style={{
          background: [
            `radial-gradient(ellipse 62% 58% at 14% -6%, ${theme.accentPrimary}3B 0%, transparent 68%)`,
            `radial-gradient(ellipse 56% 52% at 88% -4%, ${rightGlow}36 0%, transparent 66%)`,
            `radial-gradient(ellipse 75% 42% at 50% 106%, ${theme.bannerBg}CC 0%, transparent 72%)`,
          ].join(', '),
        }}
      />

      {/* Geometria Vetorial Exclusiva do Pacote de Transmissão da Liga */}
      <MotifVectors
        motif={theme.motif}
        primary={theme.accentPrimary}
        secondary={theme.spotlightSecondary}
      />

      {/* Textura Técnica Micro-Pontilhada Estilo Broadcast Frostbite */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.65) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Marca d'Água Gigante Oficial da Liga / Copa no Canto */}
      {theme.logoUrl && (
        <img
          src={theme.logoUrl}
          alt=""
          aria-hidden="true"
          className="absolute -right-10 -bottom-12 w-[360px] h-[360px] object-contain opacity-[0.045] select-none grayscale contrast-125"
        />
      )}

      {/* Vinheta Escura nas Bordas para Leitura Perfeita de Console */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, transparent 54%, rgba(5, 6, 9, 0.62) 100%)',
        }}
      />
    </div>
  );
};
