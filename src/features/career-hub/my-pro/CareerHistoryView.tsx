import React from 'react';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { PlayerSeasonCareerLog } from '../../../domains/career-stats/careerHistoryTypes';
import { findClubLeagueIdInWorld } from '../../../domains/season/worldSeasonEngine';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { FifaStatBadge } from '../../../shared/ui/FifaStatBadge';
import { useCareerStore } from '../../../state/useCareerStore';

function formatStageBadge(stage: 'YOUTH' | 'PRO' | 'LOAN', finishPos?: number): string {
  if (stage === 'YOUTH') return 'CATEGORIA DE BASE';
  if (stage === 'LOAN') return finishPos ? `EMPRÉSTIMO • ${finishPos}º LUGAR` : 'EMPRÉSTIMO';
  return finishPos ? `PROFISSIONAL • ${finishPos}º LUGAR` : 'PROFISSIONAL';
}

export const CareerHistoryView: React.FC = () => {
  const {
    player,
    contract,
    calendar,
    worldSeason,
    periodStats,
    currentSeasonStints,
    careerSeasonLogs,
    trophyCabinet,
  } = useCareerStore();

  if (!player || !contract) return null;

  // Monta a temporada atual em andamento em tempo real
  const activeClubLg = findClubLeagueIdInWorld(worldSeason, contract.clubId);
  const liveStints = (
    currentSeasonStints.length > 0
      ? currentSeasonStints
      : [
          {
            clubId: contract.clubId,
            leagueId: activeClubLg,
            stage: contract.stage,
            matches: Math.max(0, periodStats.seasonMatches - periodStats.internationalMatches),
            goals: Math.max(0, periodStats.seasonGoals - periodStats.internationalGoals),
            assists: Math.max(0, periodStats.seasonAssists - periodStats.internationalAssists),
            threeStarMatches: 0,
          },
        ]
  ).map((st) => {
    const rows = worldSeason.leagues[st.leagueId]?.standings ?? [];
    const idx = rows.findIndex((r) => r.clubId === st.clubId);
    return {
      ...st,
      leagueFinishPosition: st.stage === 'YOUTH' || idx === -1 ? undefined : idx + 1,
    };
  });

  const currentSeasonEntry: PlayerSeasonCareerLog & { isCurrent?: boolean } = {
    seasonNumber: careerSeasonLogs.length + 1,
    seasonYear: calendar.season,
    age: player.age,
    ovrEnd: player.overall,
    stints: liveStints,
    nationalTeamId: `nt_${player.nationality.toLowerCase()}`,
    nationalMatches: periodStats.internationalMatches,
    nationalGoals: periodStats.internationalGoals,
    nationalAssists: periodStats.internationalAssists,
    trophyTitles: trophyCabinet
      .filter((t) => t.season === calendar.season)
      .map((t) => t.title),
    isCurrent: true,
  };

  const allSeasons: (PlayerSeasonCareerLog & { isCurrent?: boolean })[] = [
    ...careerSeasonLogs,
    currentSeasonEntry,
  ];

  // Todos os clubes únicos defendidos na carreira (em ordem cronológica!)
  const uniqueClubIds: string[] = [];
  for (const s of allSeasons) {
    for (const st of s.stints) {
      if (!uniqueClubIds.includes(st.clubId)) uniqueClubIds.push(st.clubId);
    }
  }

  const totalMatches = player.careerTotals.matches;
  const totalGoals = player.careerTotals.goals;
  const totalAssists = player.careerTotals.assists;
  const totalGA = totalGoals + totalAssists;
  const natCaps = player.careerTotals.nationalCaps ?? 0;
  const natGoals = player.careerTotals.nationalGoals ?? 0;

  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      {/* PAINEL CONSOLIDADO: SOMA DE TODAS AS TEMPORADAS DA CARREIRA */}
      <div className="console-tile border-t-[3px] border-t-[#C8A45D] px-5 py-4 flex flex-wrap items-center justify-between gap-5 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center -space-x-1.5">
            {uniqueClubIds.map((cid) => (
              <div key={cid} className="bg-[#0B0B0D] p-1 border border-[#242730]">
                <ClubCrest clubId={cid} size="sm" />
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#C8A45D] font-bold">
              TOTAL ACUMULADO NA CARREIRA
            </div>
            <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7]">
              {allSeasons.length} TEMPORADA(S) • {uniqueClubIds.length} CLUBE(S) DEFENDIDO(S)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-5 text-center">
          {[
            ['JOGOS', totalMatches, '#F5F5F7'],
            ['GOLS', totalGoals, '#2DBE60'],
            ['ASSIST', totalAssists, '#38BDF8'],
            ['G + A', totalGA, '#C8A45D'],
            ['SELEÇÃO', `${natCaps}J / ${natGoals}G`, '#F5F5F7'],
            ['TROFÉUS', trophyCabinet.length, '#C8A45D'],
          ].map(([label, val, col]) => (
            <div key={label as string}>
              <div
                className="font-condensed font-extrabold text-2xl leading-none tabular-nums"
                style={{ color: col as string }}
              >
                {val}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3] mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LINHA DO TEMPO TEMPORADA POR TEMPORADA (TEMPORADA 1, TEMPORADA 2...) */}
      <div
        data-rs-scroll="true"
        className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0"
      >
        {allSeasons.map((season) => {
          const seasonClubMatches = season.stints.reduce((acc, s) => acc + s.matches, 0);
          const seasonClubGoals = season.stints.reduce((acc, s) => acc + s.goals, 0);
          const seasonClubAssists = season.stints.reduce((acc, s) => acc + s.assists, 0);
          const totSeasonMatches = seasonClubMatches + season.nationalMatches;
          const totSeasonGoals = seasonClubGoals + season.nationalGoals;
          const totSeasonAssists = seasonClubAssists + season.nationalAssists;

          return (
            <div
              key={`${season.seasonYear}_${season.seasonNumber}`}
              tabIndex={0}
              data-focusable="true"
              data-focus-label={`TEMPORADA ${season.seasonNumber} (${season.seasonYear})`}
              className={`console-tile p-4 border-l-[4px] outline-none ${
                season.isCurrent
                  ? 'border-l-[#C8A45D] bg-[#14161C]'
                  : 'border-l-[#323640]'
              }`}
            >
              {/* Cabeçalho da Temporada */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-3 border-b border-[#242730]">
                <div className="flex items-center gap-3">
                  <span className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7]">
                    TEMPORADA {season.seasonNumber} • {season.seasonYear}/
                    {String(season.seasonYear + 1).slice(-2)}
                  </span>
                  {season.isCurrent && (
                    <span className="px-2 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-[10px] tracking-widest">
                      EM ANDAMENTO (SEM {calendar.week})
                    </span>
                  )}
                  <span className="text-xs uppercase tracking-widest text-[#9498A3]">
                    {season.age} ANOS
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-wider text-[#9498A3]">
                    TOTAL NO ANO:{' '}
                    <strong className="font-condensed text-base text-[#F5F5F7]">
                      {totSeasonMatches}J • {totSeasonGoals}G • {totSeasonAssists}A
                    </strong>
                  </span>
                  <FifaStatBadge value={season.ovrEnd} size="sm" />
                </div>
              </div>

              {/* Passagens por Clube(s) + Seleção naquele ano */}
              <div className="space-y-2">
                {season.stints.map((st, idx) => {
                  const clb = getClubById(st.clubId);
                  const lgName = LEAGUES[st.leagueId]?.name ?? st.leagueId;
                  return (
                    <div
                      key={`${st.clubId}_${st.stage}_${idx}`}
                      className="bg-[#0E0F12] border border-[#242730] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ClubCrest clubId={clb.id} size="sm" />
                        <div className="min-w-0">
                          <div className="font-condensed uppercase font-bold text-lg text-[#F5F5F7] leading-none truncate">
                            {clb.name}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-[#9498A3] mt-0.5">
                            {lgName} • {formatStageBadge(st.stage, st.leagueFinishPosition)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 font-condensed tabular-nums text-right">
                        <div>
                          <span className="text-[10px] text-[#565A65] block">JOGOS</span>
                          <span className="font-bold text-base text-[#F5F5F7]">{st.matches}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#565A65] block">GOLS</span>
                          <span className="font-extrabold text-base text-[#2DBE60]">
                            {st.goals}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#565A65] block">ASSIST</span>
                          <span className="font-extrabold text-base text-[#38BDF8]">
                            {st.assists}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#565A65] block">G+A</span>
                          <span className="font-extrabold text-base text-[#C8A45D]">
                            {st.goals + st.assists}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {season.nationalMatches > 0 && (
                  <div className="bg-[#0E0F12] border border-[#242730] border-l-2 border-l-[#C8A45D] px-3.5 py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ClubCrest clubId={season.nationalTeamId} size="sm" />
                      <div>
                        <div className="font-condensed uppercase font-bold text-base text-[#C8A45D] leading-none">
                          SELEÇÃO {getClubById(season.nationalTeamId).name}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-[#9498A3]">
                          CONVOCAÇÕES OFICIAIS NA TEMPORADA
                        </div>
                      </div>
                    </div>
                    <div className="font-condensed font-bold text-sm text-[#F5F5F7] tabular-nums">
                      {season.nationalMatches}J • {season.nationalGoals}G •{' '}
                      {season.nationalAssists}A
                    </div>
                  </div>
                )}
              </div>

              {/* Títulos & Prêmios conquistados na temporada */}
              <div className="mt-3 pt-2.5 border-t border-[#1C1F26] flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[#565A65] mr-1">
                  CONQUISTAS NO ANO:
                </span>
                {season.trophyTitles.length === 0 ? (
                  <span className="text-[11px] uppercase text-[#565A65]">
                    NENHUM TROFÉU ENCERRADO NESTA TEMPORADA
                  </span>
                ) : (
                  season.trophyTitles.map((title, tIdx) => (
                    <span
                      key={`${title}_${tIdx}`}
                      className="px-2.5 py-0.5 bg-[#1B1810] border border-[#C8A45D]/60 text-[#C8A45D] font-condensed uppercase font-bold text-xs tracking-wider"
                    >
                      ★ {title}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
