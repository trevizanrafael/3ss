import React, { useMemo, useState } from 'react';
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

type TrophyFilter = 'ALL' | 'COLLECTIVE' | 'GALA' | 'POTM';

const SUMMARY_COUNTERS: CounterCardSpec[] = [
  { label: 'BOLA DE OURO', codes: ['BALLON_DOR'], gold: true },
  { label: 'GOLDEN BOY', codes: ['GOLDEN_BOY'], gold: true },
  { label: 'CHUTEIRA DE OURO', codes: ['GOLDEN_BOOT'], gold: true },
  { label: 'GARÇOM DE OURO', codes: ['GOLDEN_PLAYMAKER'] },
  { label: 'CRAQUE CONTINENTAL', codes: ['UCL_BEST', 'REI_DA_AMERICA'], gold: true },
  { label: 'CRAQUE / JOVEM LIGA', codes: ['LEAGUE_MVP', 'LEAGUE_YOUNG_PLAYER'] },
  { label: 'JOGADOR DO MÊS', codes: ['POTM'] },
  { label: 'TAÇAS COLETIVAS', codes: ['COLLECTIVE_TROPHY'], gold: true },
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

  const [filter, setFilter] = useState<TrophyFilter>('ALL');

  const countByCodes = (codes: AwardCode[]) =>
    trophyCabinet.filter((t) => codes.includes(t.code)).length;

  const filteredTrophies = useMemo(() => {
    if (filter === 'COLLECTIVE') {
      return trophyCabinet.filter((t) => t.code === 'COLLECTIVE_TROPHY');
    }
    if (filter === 'POTM') {
      return trophyCabinet.filter((t) => t.code === 'POTM');
    }
    if (filter === 'GALA') {
      return trophyCabinet.filter((t) => t.code !== 'COLLECTIVE_TROPHY' && t.code !== 'POTM');
    }
    return trophyCabinet;
  }, [trophyCabinet, filter]);

  // Agrupa troféus por ano/temporada (do mais recente ao mais antigo)
  const groupedBySeason = useMemo(() => {
    const map = new Map<number, PlayerTrophyEntry[]>();
    for (const entry of filteredTrophies) {
      const list = map.get(entry.season) ?? [];
      list.push(entry);
      map.set(entry.season, list);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [filteredTrophies]);

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

      {/* Barra de Filtros por Categoria + Botão de Rever Gala */}
      <div className="console-tile px-5 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['ALL', `TODOS (${trophyCabinet.length})`],
              ['COLLECTIVE', `TAÇAS COLETIVAS (${countByCodes(['COLLECTIVE_TROPHY'])})`],
              [
                'GALA',
                `PRÊMIOS DE FIM DE ANO (${
                  trophyCabinet.filter((t) => t.code !== 'COLLECTIVE_TROPHY' && t.code !== 'POTM')
                    .length
                })`,
              ],
              ['POTM', `JOGADOR DO MÊS (${countByCodes(['POTM'])})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-focusable="true"
              onClick={() => setFilter(id)}
              className={`px-3 py-1 font-condensed uppercase font-extrabold text-xs tracking-wider border cursor-pointer ${
                filter === id
                  ? 'bg-[#F5F5F7] text-[#0B0B0D] border-[#F5F5F7]'
                  : 'bg-[#0E0F12] text-[#9498A3] border-[#242730] hover:text-[#F5F5F7]'
              }`}
            >
              {label}
            </button>
          ))}

          <span className="hidden xl:inline text-xs uppercase tracking-wider text-[#9498A3] ml-3">
            IMPACTO:{' '}
            <strong className="font-condensed text-sm text-[#2DBE60]">
              +{awardPrestigeBoost} PRESTÍGIO
            </strong>{' '}
            • MÊS ATUAL:{' '}
            <strong className="font-condensed text-sm text-[#C8A45D]">
              {periodStats.monthGoals}G / {periodStats.monthAssists}A
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

      {/* Galeria Separada Ano a Ano (Temporada por Temporada) */}
      <div
        data-rs-scroll="true"
        className="flex-1 console-tile p-5 overflow-y-auto space-y-6 min-h-0"
      >
        {groupedBySeason.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-6">
            <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7]">
              NENHUMA CONQUISTA NESTE FILTRO AINDA
            </div>
            <p className="text-xs text-[#9498A3] mt-2 leading-relaxed">
              Dispute as competições nacionais, continentais e de seleções para erguer{' '}
              <strong className="text-[#2DBE60]">Taças Coletivas</strong> e concorrer à{' '}
              <strong className="text-[#C8A45D]">Gala da Bola de Ouro</strong> ao final de cada
              temporada.
            </p>
          </div>
        ) : (
          groupedBySeason.map(([seasonYear, items]) => {
            const collectiveCount = items.filter((t) => t.code === 'COLLECTIVE_TROPHY').length;
            const individualCount = items.length - collectiveCount;

            return (
              <section key={seasonYear} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-[#242730]">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-sm tracking-widest">
                      TEMPORADA {seasonYear}/{String(seasonYear + 1).slice(-2)}
                    </span>
                    <span className="font-condensed uppercase font-bold text-sm text-[#F5F5F7]">
                      {items.length} CONQUISTA(S) NO ANO
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider">
                    {collectiveCount > 0 && (
                      <span className="text-[#2DBE60] font-bold">
                        ★ {collectiveCount} TAÇA(S) COLETIVA(S)
                      </span>
                    )}
                    {individualCount > 0 && (
                      <span className="text-[#C8A45D] font-bold">
                        ★ {individualCount} PRÊMIO(S) INDIVIDUAL(IS)
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {items.map((entry: PlayerTrophyEntry) => {
                    const club = getClubById(entry.clubId);
                    const badge = getBadgeStyle(entry.code);
                    return (
                      <div
                        key={entry.id}
                        tabIndex={0}
                        data-focusable="true"
                        data-focus-label={entry.title}
                        style={{ borderLeftColor: badge.color }}
                        className="bg-[#0E0F12] border border-[#242730] border-l-[4px] p-4 flex items-center justify-between gap-3 outline-none"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-condensed uppercase font-extrabold text-[10px] tracking-[0.18em]"
                              style={{ color: badge.color }}
                            >
                              {badge.tag}
                            </span>
                            {entry.week && (
                              <span className="text-[10px] uppercase tracking-widest text-[#565A65]">
                                • SEMANA {entry.week}
                              </span>
                            )}
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
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};
