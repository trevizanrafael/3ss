import React from 'react';
import { getClubById } from '../../../data/clubs';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import { PlayerSeasonCareerLog } from '../../../domains/career-stats/careerHistoryTypes';
import {
  buildSeasonCompetitionCampaigns,
  resolveSeasonCompetitionsForDisplay,
} from '../../../domains/career-stats/seasonCampaignBuilder';
import { findClubLeagueIdInWorld } from '../../../domains/season/worldSeasonEngine';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { FifaStatBadge } from '../../../shared/ui/FifaStatBadge';
import { useCareerStore } from '../../../state/useCareerStore';

function isMonthlyAwardTitle(title: string): boolean {
  const upper = title.toUpperCase();
  return upper.includes('MELHOR DO MÊS') || upper.includes('JOGADOR DO MÊS');
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
    userCompStats,
    trophyCabinet,
  } = useCareerStore();

  if (!player || !contract) return null;

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

  const liveCompetitions = buildSeasonCompetitionCampaigns(
    worldSeason,
    liveStints,
    userCompStats,
    player.nationality,
    false,
    calendar.week,
  );

  const currentSeasonEntry: PlayerSeasonCareerLog & { isCurrent?: boolean } = {
    seasonNumber: careerSeasonLogs.length + 1,
    seasonYear: calendar.season,
    age: player.age,
    ovrEnd: player.overall,
    stints: liveStints,
    competitions: liveCompetitions,
    nationalTeamId: `nt_${player.nationality.toLowerCase()}`,
    nationalMatches: periodStats.internationalMatches,
    nationalGoals: periodStats.internationalGoals,
    nationalAssists: periodStats.internationalAssists,
    trophyTitles: trophyCabinet
      .filter((t) => t.season === calendar.season && t.code !== 'POTM')
      .map((t) => t.title),
    isCurrent: true,
  };

  const allSeasonsChronological: (PlayerSeasonCareerLog & { isCurrent?: boolean })[] = [
    ...careerSeasonLogs,
    currentSeasonEntry,
  ];

  // Todos os clubes únicos defendidos na carreira (em ordem cronológica)
  const uniqueClubIds: string[] = [];
  for (const s of allSeasonsChronological) {
    for (const st of s.stints) {
      if (!uniqueClubIds.includes(st.clubId)) uniqueClubIds.push(st.clubId);
    }
  }

  // Exibe da temporada mais recente (atual) para a mais antiga para leitura imediata
  const seasonsNewestFirst = [...allSeasonsChronological].reverse();

  const totalMatches = player.careerTotals.matches;
  const totalGoals = player.careerTotals.goals;
  const totalAssists = player.careerTotals.assists;
  const totalGA = totalGoals + totalAssists;
  const natCaps = player.careerTotals.nationalCaps ?? 0;
  const natGoals = player.careerTotals.nationalGoals ?? 0;
  const majorTrophiesCount = trophyCabinet.filter((t) => t.code !== 'POTM').length;

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
              {allSeasonsChronological.length} TEMPORADA(S) • {uniqueClubIds.length} CLUBE(S) DEFENDIDO(S)
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
            ['TROFÉUS', majorTrophiesCount, '#C8A45D'],
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

      {/* TEMPORADA POR TEMPORADA: TODAS AS COMPETIÇÕES DISPUTADAS, COLOCAÇÃO/FASE E DESEMPENHO */}
      <div
        data-rs-scroll="true"
        className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0"
      >
        {seasonsNewestFirst.map((season) => {
          const competitions = resolveSeasonCompetitionsForDisplay(season, player.nationality);
          const seasonClubMatches = season.stints.reduce((acc, s) => acc + s.matches, 0);
          const seasonClubGoals = season.stints.reduce((acc, s) => acc + s.goals, 0);
          const seasonClubAssists = season.stints.reduce((acc, s) => acc + s.assists, 0);
          const totSeasonMatches = seasonClubMatches + season.nationalMatches;
          const totSeasonGoals = seasonClubGoals + season.nationalGoals;
          const totSeasonAssists = seasonClubAssists + season.nationalAssists;

          const seasonClubsUnique = Array.from(new Set(season.stints.map((s) => s.clubId)));
          const cleanTrophies = season.trophyTitles.filter((t) => !isMonthlyAwardTitle(t));

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
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7]">
                    TEMPORADA {season.seasonNumber} • {season.seasonYear}/
                    {String(season.seasonYear + 1).slice(-2)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {seasonClubsUnique.map((cid) => {
                      const c = getClubById(cid);
                      return (
                        <span
                          key={cid}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#0E0F12] border border-[#242730] font-condensed uppercase font-bold text-xs text-[#D4D7E0]"
                        >
                          <ClubCrest clubId={cid} size="sm" />
                          <span>{c.name}</span>
                        </span>
                      );
                    })}
                  </div>

                  {season.isCurrent && (
                    <span className="px-2 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-[10px] tracking-widest">
                      EM ANDAMENTO (SEM {calendar.week})
                    </span>
                  )}

                  <span className="text-xs uppercase tracking-widest text-[#9498A3]">
                    {season.age} ANOS • {competitions.length} COMPETIÇÃO(ÕES)
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

              {/* Lista de Todas as Competições Participadas naquela Temporada */}
              <div className="space-y-2">
                {competitions.map((comp, idx) => {
                  const compTheme = getCompetitionTheme(comp.competitionId);
                  const team = getClubById(comp.teamId);
                  const compTitle = comp.competitionLabel ?? compTheme.shortLabel;
                  const stageTypeTag =
                    comp.stageType === 'KNOCKOUT'
                      ? 'COPA / MATA-MATA'
                      : comp.stageType === 'QUALIFIERS'
                        ? 'ELIMINATÓRIAS'
                        : comp.stageType === 'FRIENDLY'
                          ? 'DATA FIFA'
                          : 'PONTOS CORRIDOS';

                  return (
                    <div
                      key={`${comp.competitionId}_${comp.teamId}_${idx}`}
                      style={{ borderLeftColor: compTheme.accentPrimary }}
                      className="bg-[#0E0F12] border border-[#242730] border-l-[3px] px-3.5 py-2.5 grid grid-cols-1 lg:grid-cols-12 items-center gap-3"
                    >
                      {/* Coluna 1 (5/12): Logo da Competição + Nome + Equipe Defendida */}
                      <div className="lg:col-span-5 flex items-center gap-3 min-w-0">
                        <CompetitionBadge
                          competitionId={comp.competitionId}
                          size="md"
                          showName={false}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-condensed uppercase font-extrabold text-base leading-tight truncate"
                            style={{ color: compTheme.accentPrimary }}
                          >
                            {compTitle}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#9498A3] mt-0.5">
                            <ClubCrest clubId={team.id} size="sm" />
                            <span className="text-[#D4D7E0] font-semibold truncate">
                              {team.name}
                            </span>
                            <span>• {stageTypeTag}</span>
                          </div>
                        </div>
                      </div>

                      {/* Coluna 2 (4/12): Colocação Final ou Fase de Mata-Mata Alcançada */}
                      <div className="lg:col-span-4 flex items-center lg:justify-center">
                        <span
                          className={`px-2.5 py-1 font-condensed uppercase font-extrabold text-xs tracking-wider border ${
                            comp.isChampion
                              ? 'bg-[#1D190E] border-[#C8A45D] text-[#C8A45D]'
                              : comp.isRunnerUp
                                ? 'bg-[#181B22] border-[#9498A3] text-[#F5F5F7]'
                                : 'bg-[#14171F] border-[#242730] text-[#D4D7E0]'
                          }`}
                        >
                          {comp.isChampion ? `★ ${comp.outcomeLabel}` : comp.outcomeLabel}
                        </span>
                      </div>

                      {/* Coluna 3 (3/12): Seu Desempenho na Competição (Jogos, Gols, Assistências, G+A) */}
                      <div className="lg:col-span-3 flex items-center justify-end gap-4 font-condensed tabular-nums text-right">
                        <div>
                          <span className="text-[10px] text-[#565A65] block">JOGOS</span>
                          <span className="font-bold text-base text-[#F5F5F7]">
                            {comp.matches}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#565A65] block">GOLS</span>
                          <span className="font-extrabold text-base text-[#2DBE60]">
                            {comp.goals}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#565A65] block">ASSIST</span>
                          <span className="font-extrabold text-base text-[#38BDF8]">
                            {comp.assists}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#565A65] block">G+A</span>
                          <span className="font-extrabold text-base text-[#C8A45D]">
                            {comp.goals + comp.assists}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Títulos Coletivos & Grandes Prêmios do Ano */}
              {cleanTrophies.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-[#1C1F26] flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#565A65] mr-1">
                    TROFÉUS & PRÊMIOS NO ANO:
                  </span>
                  {cleanTrophies.map((title, tIdx) => (
                    <span
                      key={`${title}_${tIdx}`}
                      className="px-2.5 py-0.5 bg-[#1B1810] border border-[#C8A45D]/60 text-[#C8A45D] font-condensed uppercase font-bold text-xs tracking-wider"
                    >
                      ★ {title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
