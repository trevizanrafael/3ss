import React from 'react';
import { getClubById } from '../../../data/clubs';
import { ContinentalCupId, LeagueId, LEAGUES } from '../../../data/leagues/leagues';
import { AnyCompetitionId, getCompetitionTheme } from '../../../data/world/competitionThemes';
import { evaluateNationalCallUp } from '../../../domains/international/callUpEvaluator';
import {
  ClubStandingRow,
  ContinentalCupData,
  FixtureMatch,
  KnockoutTie,
} from '../../../domains/season/seasonTypes';
import {
  findClubLeagueIdInWorld,
  findUpcomingFixtureForClub,
  getClubFixtureOnExactDay,
} from '../../../domains/season/worldSeasonEngine';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

function sliceStandingsAroundTeam(
  rows: ClubStandingRow[],
  myTeamId: string,
  count = 4,
): { row: ClubStandingRow; pos: number }[] {
  const total = rows.length;
  if (total === 0) return [];
  const myIdx = rows.findIndex((r) => r.clubId === myTeamId);
  const anchor = myIdx === -1 ? 0 : myIdx;
  const maxStart = Math.max(0, total - count);
  const start = Math.min(maxStart, Math.max(0, anchor - 1));
  return rows.slice(start, start + count).map((row, idx) => ({
    row,
    pos: start + idx + 1,
  }));
}

function findMyContinentalTie(
  cup: ContinentalCupData,
  clubId: string,
  stageLabel: string,
): KnockoutTie | null {
  const list = stageLabel.includes('SEMIFINAL')
    ? cup.semiFinals
    : stageLabel.includes('QUARTAS')
      ? cup.quarterFinals
      : cup.roundOf16;
  return (
    list.find((t) => t.homeClubId === clubId || t.awayClubId === clubId) ??
    [...cup.semiFinals, ...cup.quarterFinals, ...cup.roundOf16].find(
      (t) => t.winnerClubId === null && (t.homeClubId === clubId || t.awayClubId === clubId),
    ) ??
    null
  );
}

export const NextMatchCompetitionTile: React.FC = () => {
  const { player, contract, calendar, worldSeason, periodStats } = useCareerStore();
  const { openSeasonCompetition } = useNavigationStore();

  if (!player || !contract) return null;

  const callUp = evaluateNationalCallUp(player, contract.stage, periodStats);
  const todayFx = getClubFixtureOnExactDay(
    worldSeason,
    contract.clubId,
    contract.stage,
    calendar.week,
    calendar.day,
    callUp,
  );
  const nextFx =
    todayFx ??
    findUpcomingFixtureForClub(
      worldSeason,
      contract.clubId,
      contract.stage,
      calendar.week,
      calendar.day,
      callUp,
    );

  const fallbackLgId = findClubLeagueIdInWorld(worldSeason, contract.clubId);
  const compId: AnyCompetitionId = nextFx?.competitionId ?? fallbackLgId;
  const myTeamId = nextFx?.myTeamId ?? contract.clubId;
  const oppId = nextFx?.opponentId ?? null;
  const stageLabel = nextFx?.stageLabel ?? 'CLASSIFICAÇÃO ATUAL';
  const theme = getCompetitionTheme(compId);

  // Determinar se o próximo jogo é Tabela/Grupo ou Mata-Mata!
  let tableRows: { row: ClubStandingRow; pos: number }[] | null = null;
  let tableTag = '';
  let qualifyCutoff = 0;
  let dropStartPos = 999;
  let twoLegTie: KnockoutTie | null = null;
  let singleKnockout: { homeId: string; awayId: string; note: string; otherMatch?: FixtureMatch } | null =
    null;

  if (compId in worldSeason.leagues) {
    const lgId = compId as LeagueId;
    const full = worldSeason.leagues[lgId]?.standings ?? [];
    const cfg = LEAGUES[lgId];
    tableRows = sliceStandingsAroundTeam(full, myTeamId, 4);
    const myRank = full.findIndex((r) => r.clubId === myTeamId) + 1;
    tableTag = myRank > 0 ? `${myRank}º DE ${full.length}` : `${full.length} CLUBES`;
    qualifyCutoff = cfg.hasPromotion
      ? lgId === 'BRA_2'
        ? 4
        : 3
      : cfg.continentalPrimary
        ? 4
        : 1;
    if (cfg.hasRelegation) {
      dropStartPos = full.length - (lgId === 'BRA_1' ? 4 : 3) + 1;
    }
  } else if (compId in worldSeason.continentals) {
    const cup = worldSeason.continentals[compId as ContinentalCupId];
    const isGroup = stageLabel.includes('GRUPO') || cup.roundOf16.length === 0;
    if (isGroup) {
      const grp = cup.groups.find((g) => g.standings.some((r) => r.clubId === myTeamId));
      if (grp) {
        tableRows = grp.standings.map((row, i) => ({ row, pos: i + 1 }));
        tableTag = grp.groupName;
        qualifyCutoff = 2;
      }
    } else if (stageLabel.includes('FINAL') && !stageLabel.includes('SEMI') && cup.finalMatch) {
      singleKnockout = {
        homeId: cup.finalMatch.homeClubId,
        awayId: cup.finalMatch.awayClubId,
        note: 'GRANDE FINAL EM JOGO ÚNICO • EMPATE VAI AOS PÊNALTIS',
      };
      tableTag = 'FINAL ÚNICA';
    } else {
      twoLegTie = findMyContinentalTie(cup, myTeamId, stageLabel);
      tableTag = stageLabel;
    }
  } else if (worldSeason.international) {
    const intl = worldSeason.international;
    if (compId === 'WC_QUALIFIERS' || compId.startsWith('WCQ_')) {
      const grp = intl.qualifiers.find((q) => q.standings.some((r) => r.clubId === myTeamId));
      if (grp) {
        tableRows = sliceStandingsAroundTeam(grp.standings, myTeamId, 4);
        const myRank = grp.standings.findIndex((r) => r.clubId === myTeamId) + 1;
        tableTag = `${myRank}º • ${grp.confederation}`;
        qualifyCutoff = grp.directSpots;
      }
    } else if (compId === 'INTL_FRIENDLY' && nextFx) {
      singleKnockout = {
        homeId: nextFx.isHome ? myTeamId : nextFx.opponentId,
        awayId: nextFx.isHome ? nextFx.opponentId : myTeamId,
        note: 'AMISTOSO OFICIAL DATA FIFA',
      };
      tableTag = 'DATA FIFA';
    } else {
      const ntCup =
        compId === 'WORLD_CUP'
          ? intl.worldCup
          : compId === 'NATIONS_LEAGUE'
            ? intl.nationsLeague
            : compId === 'COPA_AMERICA'
              ? intl.copaAmerica
              : compId === 'EURO_CUP'
                ? intl.euroCup
                : null;
      if (ntCup) {
        const allGroups = [...ntCup.groups, ...(ntCup.leagueBGroups ?? [])];
        const isGroup = stageLabel.includes('GRUPO');
        if (isGroup) {
          const grp = allGroups.find((g) => g.standings.some((r) => r.clubId === myTeamId));
          if (grp) {
            tableRows = grp.standings.map((row, i) => ({ row, pos: i + 1 }));
            tableTag = grp.groupName;
            qualifyCutoff = 2;
          }
        } else if (nextFx) {
          const koList = stageLabel.includes('OITAVAS')
            ? ntCup.roundOf16
            : stageLabel.includes('QUARTAS')
              ? ntCup.quarterFinals
              : stageLabel.includes('SEMI')
                ? ntCup.semiFinals
                : ntCup.finalMatch
                  ? [ntCup.finalMatch]
                  : [];
          const otherMatch = koList.find(
            (m) => m.homeClubId !== myTeamId && m.awayClubId !== myTeamId,
          );
          singleKnockout = {
            homeId: nextFx.isHome ? myTeamId : nextFx.opponentId,
            awayId: nextFx.isHome ? nextFx.opponentId : myTeamId,
            note: 'MATA-MATA EM JOGO ÚNICO • EMPATE DECIDE NOS PÊNALTIS',
            otherMatch,
          };
          tableTag = stageLabel;
        }
      }
    }
  }

  return (
    <section
      tabIndex={0}
      data-focusable="true"
      onClick={() => openSeasonCompetition(compId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openSeasonCompetition(compId);
        }
      }}
      style={{ borderTopColor: theme.accentPrimary }}
      className="lg:col-span-4 lg:row-span-2 console-tile console-tile-interactive border-t-[3px] px-4 py-3 flex flex-col justify-between cursor-pointer outline-none min-h-0"
    >
      {/* Cabeçalho Compacto da Competição do Próximo Jogo */}
      <div className="flex items-center justify-between gap-2 border-b border-[#242730] pb-1.5 shrink-0">
        <div className="min-w-0">
          <CompetitionBadge competitionId={compId} size="sm" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tableTag && (
            <span className="px-1.5 py-0.5 bg-[#16181F] border border-[#242730] font-condensed uppercase font-bold text-[10px] tracking-wider text-[#C8A45D]">
              {tableTag}
            </span>
          )}
          <span className="font-condensed uppercase font-bold text-[11px] tracking-wider text-[#9498A3]">
            VER ›
          </span>
        </div>
      </div>

      {/* Corpo Dinâmico: Fatia da Tabela OU Confronto de Mata-Mata */}
      {tableRows && tableRows.length > 0 ? (
        <div className="my-auto pt-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-condensed uppercase tracking-wider text-[#565A65]">
                <th className="text-left w-5 pb-0.5">#</th>
                <th className="text-left pb-0.5">EQUIPE</th>
                <th className="text-center w-6 pb-0.5">J</th>
                <th className="text-center w-8 pb-0.5">SG</th>
                <th className="text-right w-8 pb-0.5 text-[#9498A3]">PTS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1D24]">
              {tableRows.map(({ row, pos }) => {
                const c = getClubById(row.clubId);
                const isMe = c.id === myTeamId;
                const isOpp = c.id === oppId;
                const gd = row.goalsFor - row.goalsAgainst;
                const posColor =
                  pos <= qualifyCutoff
                    ? 'text-[#2DBE60]'
                    : pos >= dropStartPos
                      ? 'text-[#C94040]'
                      : 'text-[#9498A3]';

                return (
                  <tr
                    key={c.id}
                    className={
                      isMe
                        ? 'bg-[#1D1B14] text-[#C8A45D]'
                        : 'text-[#D4D7E0]'
                    }
                  >
                    <td className={`py-1 font-condensed font-extrabold text-sm tabular-nums ${posColor}`}>
                      {pos}
                    </td>
                    <td className="py-1 pr-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ClubCrest clubId={c.id} size="sm" />
                        <span className="font-condensed uppercase font-bold text-sm truncate">
                          {c.name}
                        </span>
                        {isMe && (
                          <span className="px-1 bg-[#C8A45D] text-[#0B0B0D] font-condensed font-extrabold text-[9px] shrink-0">
                            VOCÊ
                          </span>
                        )}
                        {isOpp && !isMe && (
                          <span className="px-1 bg-[#242730] text-[#F5F5F7] font-condensed font-extrabold text-[9px] shrink-0">
                            PRÓX
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1 text-center font-condensed text-xs text-[#9498A3] tabular-nums">
                      {row.played}
                    </td>
                    <td className="py-1 text-center font-condensed text-xs text-[#9498A3] tabular-nums">
                      {gd > 0 ? `+${gd}` : gd}
                    </td>
                    <td className="py-1 text-right font-condensed font-extrabold text-sm text-[#F5F5F7] tabular-nums">
                      {row.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : twoLegTie ? (
        <div className="my-auto space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-condensed uppercase tracking-wider text-[#9498A3]">
            <span>CHAVE DE MATA-MATA</span>
            <div className="grid grid-cols-3 gap-1 w-24 text-center font-bold">
              <span>IDA</span>
              <span>VOLTA</span>
              <span className="text-[#C8A45D]">AGREG.</span>
            </div>
          </div>

          {[
            {
              club: getClubById(twoLegTie.homeClubId),
              l1: twoLegTie.leg1Home,
              l2: twoLegTie.leg2Away,
              agg: (twoLegTie.leg1Home ?? 0) + (twoLegTie.leg2Away ?? 0),
            },
            {
              club: getClubById(twoLegTie.awayClubId),
              l1: twoLegTie.leg1Away,
              l2: twoLegTie.leg2Home,
              agg: (twoLegTie.leg1Away ?? 0) + (twoLegTie.leg2Home ?? 0),
            },
          ].map(({ club, l1, l2, agg }) => {
            const isMe = club.id === myTeamId;
            return (
              <div
                key={club.id}
                className={`flex items-center justify-between px-2 py-1.5 border-l-2 ${
                  isMe
                    ? 'bg-[#1D1B14] border-l-[#C8A45D] text-[#F5F5F7]'
                    : 'bg-[#0E0F12] border-l-[#242730] text-[#D4D7E0]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <ClubCrest clubId={club.id} size="sm" />
                  <span className="font-condensed uppercase font-bold text-sm truncate">
                    {club.name}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 w-24 text-center font-condensed font-bold text-sm tabular-nums shrink-0">
                  <span className="text-[#9498A3]">{l1 ?? '—'}</span>
                  <span className="text-[#9498A3]">{l2 ?? '—'}</span>
                  <span className="bg-[#161922] text-[#C8A45D] font-extrabold">
                    {l1 !== null ? agg : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : singleKnockout ? (
        <div className="my-auto space-y-2 pt-1">
          <div className="bg-[#0E0F12] border border-[#242730] px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ClubCrest clubId={singleKnockout.homeId} size="sm" />
              <span className="font-condensed uppercase font-extrabold text-base text-[#F5F5F7] truncate">
                {getClubById(singleKnockout.homeId).name}
              </span>
            </div>
            <span
              className="px-2 py-0.5 font-condensed font-extrabold text-xs shrink-0"
              style={{ backgroundColor: theme.accentPrimary, color: theme.textOnAccent }}
            >
              VS
            </span>
            <div className="flex items-center gap-2 flex-row-reverse text-right min-w-0">
              <ClubCrest clubId={singleKnockout.awayId} size="sm" />
              <span className="font-condensed uppercase font-extrabold text-base text-[#F5F5F7] truncate">
                {getClubById(singleKnockout.awayId).name}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#9498A3]">
            <span className="truncate">{singleKnockout.note}</span>
            {singleKnockout.otherMatch && (
              <span className="text-[#C8A45D] font-condensed font-bold shrink-0 ml-2">
                OUTRA CHAVE: {getClubById(singleKnockout.otherMatch.homeClubId).shortName} x{' '}
                {getClubById(singleKnockout.otherMatch.awayClubId).shortName}
              </span>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};
