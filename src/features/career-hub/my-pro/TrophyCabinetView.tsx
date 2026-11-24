import React from 'react';
import { getClubById } from '../../../data/clubs';
import { AwardCode, PlayerTrophyEntry } from '../../../domains/awards/awardTypes';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { useCareerStore } from '../../../state/useCareerStore';

interface CounterCardSpec {
  label: string;
  codes: AwardCode[];
  gold?: boolean;
}

const SUMMARY_COUNTERS: CounterCardSpec[] = [
  { label: 'BOLA DE OURO', codes: ['BALLON_DOR'], gold: true },
  { label: 'GOLDEN BOY', codes: ['GOLDEN_BOY'], gold: true },
  { label: 'CHUTEIRA DE OURO', codes: ['GOLDEN_BOOT'], gold: true },
  { label: 'GARÇOM DE OURO', codes: ['GOLDEN_PLAYMAKER'] },
  { label: 'CRAQUE CONTINENTAL', codes: ['UCL_BEST', 'REI_DA_AMERICA'], gold: true },
  { label: 'CRAQUE / JOVEM LIGA', codes: ['LEAGUE_MVP', 'LEAGUE_YOUNG_PLAYER'] },
  { label: 'JOGADOR DO MÊS', codes: ['POTM'] },
  { label: 'TÍTULOS & 11 IDEAIS', codes: ['COLLECTIVE_TROPHY', 'LEAGUE_TOTS'] },
];

function getBadgeStyle(code: AwardCode): { tag: string; color: string } {
  if (code === 'BALLON_DOR' || code === 'GOLDEN_BOY') {
    return { tag: 'PRÊMIO MUNDIAL', color: '#C8A45D' };
  }
  if (code === 'GOLDEN_BOOT' || code === 'GOLDEN_PLAYMAKER') {
    return { tag: 'ARTILHARIA / ASSIST', color: '#C8A45D' };
  }
  if (code === 'UCL_BEST' || code === 'REI_DA_AMERICA') {
    return { tag: 'GLÓRIA CONTINENTAL', color: '#C8A45D' };
  }
  if (code === 'COLLECTIVE_TROPHY') {
    return { tag: 'TAÇA COLETIVA', color: '#2DBE60' };
  }
  if (code === 'POTM') {
    return { tag: 'DESTAQUE DO MÊS', color: '#9498A3' };
  }
  return { tag: 'DESTAQUE NACIONAL', color: '#F5F5F7' };
}

export const TrophyCabinetView: React.FC = () => {
  const {
    trophyCabinet,
    periodStats,
    awardPrestigeBoost,
    latestGalaReport,
    setGalaModalOpen,
  } = useCareerStore();

  const countByCodes = (codes: AwardCode[]) =>
    trophyCabinet.filter((t) => codes.includes(t.code)).length;

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* 8 Contadores Superiores das Grandes Honrarias */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 shrink-0">
        {SUMMARY_COUNTERS.map((spec) => {
          const count = countByCodes(spec.codes);
          const highlighted = count > 0;
          return (
            <div
              key={spec.label}
              className={`console-tile p-3 border-t-2 flex flex-col justify-between ${
                highlighted
                  ? spec.gold
                    ? 'border-t-[#C8A45D] bg-[#181610]'
                    : 'border-t-[#F5F5F7] bg-[#16181E]'
                  : 'border-t-[#242730]'
              }`}
            >
              <span className="text-[10px] uppercase tracking-wider text-[#9498A3] leading-tight">
                {spec.label}
              </span>
              <span
                className={`font-condensed font-extrabold text-3xl leading-none mt-2 tabular-nums ${
                  highlighted
                    ? spec.gold
                      ? 'text-[#C8A45D]'
                      : 'text-[#F5F5F7]'
                    : 'text-[#3A3E4A]'
                }`}
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Faixa de Números da Temporada Atual + Botão de Rever Gala */}
      <div className="console-tile px-5 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-6 text-xs uppercase tracking-wider">
          <span className="text-[#9498A3]">
            CAMPANHA NA TEMPORADA:{' '}
            <strong className="font-condensed text-base text-[#F5F5F7]">
              {periodStats.seasonMatches} JOGOS • {periodStats.seasonGoals} GOLS •{' '}
              {periodStats.seasonAssists} ASSIST
            </strong>
          </span>
          <span className="text-[#9498A3]">
            MÊS ATUAL:{' '}
            <strong className="font-condensed text-base text-[#C8A45D]">
              {periodStats.monthGoals}G / {periodStats.monthAssists}A ({periodStats.monthMatches}J)
            </strong>
          </span>
          <span className="text-[#9498A3]">
            IMPACTO NO MERCADO:{' '}
            <strong className="font-condensed text-base text-[#2DBE60]">
              +{awardPrestigeBoost} PRESTÍGIO
            </strong>
          </span>
        </div>

        {latestGalaReport && (
          <button
            type="button"
            data-focusable="true"
            data-pad-y="true"
            onClick={() => setGalaModalOpen(true)}
            className="px-4 py-1.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-xs tracking-widest inline-flex items-center gap-2 cursor-pointer"
          >
            <GamepadBadge action="ALT_Y" darkText />
            <span>REVER GALA {latestGalaReport.season} ›</span>
          </button>
        )}
      </div>

      {/* Galeria Cronológica de Troféus e Prêmios Conquistados */}
      <div
        data-rs-scroll="true"
        className="flex-1 console-tile p-5 overflow-y-auto min-h-0"
      >
        {trophyCabinet.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-6">
            <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7]">
              GALERIA PRONTA PARA SUAS PRIMEIRAS CONQUISTAS
            </div>
            <p className="text-xs text-[#9498A3] mt-2 leading-relaxed">
              Dispute partidas para concorrer ao prêmio de{' '}
              <strong className="text-[#F5F5F7]">Melhor Jogador do Mês</strong> (a cada 4 semanas) e
              à <strong className="text-[#C8A45D]">Gala da Temporada</strong> na Semana 39 (Bola de
              Ouro, Golden Boy, Chuteira de Ouro, Craque do Campeonato e Seleção dos 11 Ideais).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {trophyCabinet.map((entry: PlayerTrophyEntry) => {
              const club = getClubById(entry.clubId);
              const badge = getBadgeStyle(entry.code);
              return (
                <div
                  key={entry.id}
                  style={{ borderLeftColor: badge.color }}
                  className="bg-[#0E0F12] border border-[#242730] border-l-[4px] p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-condensed uppercase font-extrabold text-[10px] tracking-[0.18em]"
                        style={{ color: badge.color }}
                      >
                        {badge.tag}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest text-[#565A65]">
                        • TEMP {entry.season}
                        {entry.week ? ` (SEM ${entry.week})` : ''}
                      </span>
                    </div>
                    <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7] leading-tight mt-1 truncate">
                      {entry.title}
                    </div>
                    <div className="text-xs text-[#9498A3] mt-0.5 truncate">
                      {club.name} • {entry.detail}
                    </div>
                  </div>
                  <ClubCrest clubId={entry.clubId} size="md" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
