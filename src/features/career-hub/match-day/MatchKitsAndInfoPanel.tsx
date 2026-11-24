import React from 'react';
import { ClubData } from '../../../data/clubs/types';
import { TacticalMindset } from '../../../domains/match-sim/matchSimulator';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { ConsoleStepper } from '../../../shared/ui/ConsoleStepper';
import { SquadRole } from '../../../shared/types/common';
import { formatSquadRole } from '../../../shared/utils/formatters';

export type KitChoice = 'HOME' | 'AWAY' | 'THIRD';

interface KitColors {
  shirt: string;
  trim: string;
  shorts: string;
  label: string;
}

export function resolveClubKitColors(club: ClubData, choice: KitChoice): KitColors {
  const p = club.primaryColor || '#1E2430';
  const s = club.secondaryColor || '#F5F5F7';
  const isLightPrimary = p.toLowerCase() === '#ffffff' || p.toLowerCase() === '#fafafc';

  if (choice === 'HOME') {
    return {
      shirt: p,
      trim: s,
      shorts: isLightPrimary ? '#12141A' : s,
      label: 'UNIF. 1 (CASA)',
    };
  }
  if (choice === 'AWAY') {
    return isLightPrimary
      ? { shirt: '#151821', trim: p, shorts: '#151821', label: 'UNIF. 2 (FORA)' }
      : { shirt: '#F2F3F7', trim: p, shorts: p, label: 'UNIF. 2 (FORA)' };
  }
  return {
    shirt: '#111216',
    trim: '#C8A45D',
    shorts: '#111216',
    label: 'UNIF. 3 (ALT)',
  };
}

interface MatchKitsAndInfoPanelProps {
  homeClub: ClubData;
  awayClub: ClubData;
  isPlayerHome: boolean;
  homeRank: number | null;
  awayRank: number | null;
  homeKit: KitChoice;
  awayKit: KitChoice;
  onChangeHomeKit: (k: KitChoice) => void;
  onChangeAwayKit: (k: KitChoice) => void;
  userRole: SquadRole;
  mindset: TacticalMindset;
  onChangeMindset: (m: TacticalMindset) => void;
  isContinentalNight: boolean;
  accentColor: string;
  leg1Info?: {
    myShort: string;
    oppShort: string;
    myGoals: number;
    oppGoals: number;
  };
}

const KIT_ORDER: KitChoice[] = ['HOME', 'AWAY', 'THIRD'];

const MiniKitSvg: React.FC<{ kit: KitColors; club: ClubData }> = ({ kit, club }) => (
  <svg viewBox="0 0 120 132" className="w-24 h-28 mx-auto drop-shadow-md">
    {/* Camisa */}
    <path
      d="M36 12 L48 8 L72 8 L84 12 L106 30 L96 48 L84 40 L84 86 L36 86 L36 40 L24 48 L14 30 Z"
      fill={kit.shirt}
      stroke={kit.trim}
      strokeWidth="2.5"
    />
    <path d="M48 8 Q60 18 72 8" fill="none" stroke={kit.trim} strokeWidth="2.5" />
    {/* Detalhe peito */}
    <circle cx="71" cy="30" r="5" fill={kit.trim} opacity="0.85" />
    {/* Calção */}
    <path
      d="M38 89 L82 89 L86 124 L63 124 L60 106 L57 124 L34 124 Z"
      fill={kit.shorts}
      stroke="#242730"
      strokeWidth="1.8"
    />
    <text
      x="60"
      y="64"
      textAnchor="middle"
      fill={kit.trim}
      fontSize="13"
      fontWeight="800"
      fontFamily="Barlow Condensed, sans-serif"
    >
      {club.shortName}
    </text>
  </svg>
);

export const MatchKitsAndInfoPanel: React.FC<MatchKitsAndInfoPanelProps> = ({
  homeClub,
  awayClub,
  isPlayerHome,
  homeRank,
  awayRank,
  homeKit,
  awayKit,
  onChangeHomeKit,
  onChangeAwayKit,
  userRole,
  mindset,
  onChangeMindset,
  isContinentalNight,
  accentColor,
  leg1Info,
}) => {
  const hk = resolveClubKitColors(homeClub, homeKit);
  const ak = resolveClubKitColors(awayClub, awayKit);

  const cycleKit = (curr: KitChoice, dir: -1 | 1) =>
    KIT_ORDER[(KIT_ORDER.indexOf(curr) + dir + KIT_ORDER.length) % KIT_ORDER.length];

  const leg1Diff = leg1Info ? leg1Info.myGoals - leg1Info.oppGoals : 0;
  const leg1Situation = !leg1Info
    ? ''
    : leg1Diff > 0
      ? `VANTAGEM (+${leg1Diff}) • EMPATE CLASSIFICA VOCÊ`
      : leg1Diff === 0
        ? 'TUDO IGUAL NA IDA • QUEM VENCER AVANÇA'
        : `PRECISA VENCER POR +${Math.abs(leg1Diff) + 1} (OU +${Math.abs(leg1Diff)} P/ PÊNALTIS)`;

  return (
    <div className="console-tile p-5 flex flex-col justify-between h-full min-h-0">
      {/* Confronto: Escudos e Classificação */}
      <div className="border-b border-[#242730] pb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <ClubCrest clubId={homeClub.id} size="md" />
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-[#9498A3]">
              CASA {homeRank ? `• ${homeRank}º` : ''} {isPlayerHome ? '• VOCÊ' : ''}
            </div>
            <div className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] truncate">
              {homeClub.name}
            </div>
          </div>
        </div>

        <span
          className="px-2 py-0.5 font-condensed font-extrabold text-sm shrink-0"
          style={{ backgroundColor: accentColor, color: '#0B0B0D' }}
        >
          VS
        </span>

        <div className="flex items-center gap-2.5 flex-row-reverse text-right min-w-0">
          <ClubCrest clubId={awayClub.id} size="md" />
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-[#9498A3]">
              FORA {awayRank ? `• ${awayRank}º` : ''} {!isPlayerHome ? '• VOCÊ' : ''}
            </div>
            <div className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] truncate">
              {awayClub.name}
            </div>
          </div>
        </div>
      </div>

      {/* Se for JOGO DE VOLTA, destaca o Placar da Ida e o que precisa para passar! */}
      {leg1Info && (
        <div className="mt-2.5 bg-[#12151E] border border-[#C8A45D]/70 px-3 py-2 flex flex-col gap-0.5 text-center">
          <div className="font-condensed uppercase font-extrabold text-sm tracking-wider text-[#F5F5F7]">
            PLACAR DA IDA: <span className="text-[#C8A45D]">{leg1Info.myShort} {leg1Info.myGoals} : {leg1Info.oppGoals} {leg1Info.oppShort}</span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[#9498A3] font-bold">
            {leg1Situation}
          </div>
        </div>
      )}

      {/* Seletor de Uniformes dos 2 Times Estilo FIFA */}
      <div className="my-auto py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#9498A3] text-center mb-1">
          SELEÇÃO DE UNIFORMES
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { club: homeClub, kit: hk, raw: homeKit, set: onChangeHomeKit },
            { club: awayClub, kit: ak, raw: awayKit, set: onChangeAwayKit },
          ].map(({ club, kit, raw, set }, idx) => (
            <div key={idx} className="bg-[#0E0F12] border border-[#242730] p-2.5 text-center">
              <MiniKitSvg kit={kit} club={club} />
              <div className="flex items-center justify-between mt-1 border-t border-[#1C1F26] pt-1.5">
                <button
                  type="button"
                  onClick={() => set(cycleKit(raw, -1))}
                  className="px-2 font-condensed font-bold text-base text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
                >
                  ‹
                </button>
                <span className="font-condensed uppercase font-bold text-xs tracking-wider text-[#F5F5F7]">
                  {kit.label}
                </span>
                <button
                  type="button"
                  onClick={() => set(cycleKit(raw, 1))}
                  className="px-2 font-condensed font-bold text-base text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
                >
                  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ficha de Informações da Partida + Postura */}
      <div className="border-t border-[#242730] pt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[11px] uppercase">
          <div className="bg-[#0E0F12] border border-[#242730] px-2.5 py-1.5">
            <span className="text-[9px] text-[#565A65] block">PALCO DO JOGO</span>
            <span className="font-condensed font-bold text-sm text-[#F5F5F7] truncate block">
              {homeClub.stadiumName ?? homeClub.name}
            </span>
          </div>
          <div className="bg-[#0E0F12] border border-[#242730] px-2.5 py-1.5">
            <span className="text-[9px] text-[#565A65] block">CLIMA & HORÁRIO</span>
            <span className="font-condensed font-bold text-sm text-[#F5F5F7] truncate block">
              {isContinentalNight ? '21:30 • NOITE LIMPA' : '16:00 • GRAMADO BOM'}
            </span>
          </div>
        </div>

        <ConsoleStepper
          compact
          label={`SUA FUNÇÃO (${formatSquadRole(userRole)})`}
          value={mindset}
          onChange={onChangeMindset}
          options={[
            { value: 'EQUILIBRADO', label: 'POSTURA EQUILIBRADA' },
            { value: 'AGRESSIVO_GOL', label: 'BUSCAR O GOL / DECIDIR' },
            { value: 'COLETIVO_SEGURO', label: 'APOIO COLETIVO SEGURO' },
          ]}
        />
      </div>
    </div>
  );
};
