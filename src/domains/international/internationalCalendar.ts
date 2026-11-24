import { ALL_NATIONAL_TEAMS } from '../../data/clubs';
import { getQualifierCompId, InternationalCompId } from '../../data/world/competitionThemes';
import { shuffleArray } from '../../shared/utils/math';
import { PlayerScoreOverride } from '../season/continentalEngine';
import { simulateRealisticScoreline, sortStandings } from '../season/poissonMatchMath';
import { ContinentalGroup, FixtureMatch } from '../season/seasonTypes';
import {
  InternationalCycleState,
  InternationalHistoryRecord,
  NationalCupTournament,
} from './internationalTypes';
import {
  createWorldCupQualifiers,
  extractWorldCup32FromQualifiers,
  FIFA_WINDOW_WEEKS,
  getQualifierRoundIndex,
  simulateQualifiersWindow,
} from './qualifiersEngine';
import {
  createNationsLeagueTournament,
  createSummer16Tournament,
  createWorldCupTournament,
  simulateNationsLeagueOnSunday,
  simulateSummerCupSlot,
} from './tournamentsEngine';

export const FRIENDLY_WEEKS = [8, 16, 24, 32] as const;

function buildFriendlyRounds(seasonYear: number): FixtureMatch[][] {
  return FRIENDLY_WEEKS.map((wk) => {
    const ids = shuffleArray(ALL_NATIONAL_TEAMS.map((t) => t.id));
    const pairs: FixtureMatch[] = [];
    for (let i = 0; i + 1 < ids.length; i += 2) {
      pairs.push({
        id: `fr_${seasonYear}_w${wk}_${i}`,
        homeClubId: ids[i],
        awayClubId: ids[i + 1],
        homeGoals: null,
        awayGoals: null,
        played: false,
      });
    }
    return pairs;
  });
}

export function createInitialInternationalState(seasonYear = 2026): InternationalCycleState {
  const cycleIndex = (((seasonYear - 2026) % 4) + 4) % 4 as 0 | 1 | 2 | 3;
  const qualifiers = createWorldCupQualifiers();
  const conmebolTop2 = qualifiers[0].standings.slice(0, 2).map((r) => r.clubId);

  return {
    cycleIndex,
    qualifiers,
    conmebolNationsSpots: conmebolTop2,
    qualifiedWorldCupIds: [],
    nationsLeague:
      cycleIndex === 1 ? createNationsLeagueTournament(seasonYear, qualifiers) : null,
    copaAmerica:
      cycleIndex === 1 ? createSummer16Tournament('COPA_AMERICA', seasonYear, qualifiers) : null,
    euroCup:
      cycleIndex === 1 ? createSummer16Tournament('EURO_CUP', seasonYear, qualifiers) : null,
    worldCup:
      cycleIndex === 3
        ? createWorldCupTournament(
            seasonYear,
            ALL_NATIONAL_TEAMS.slice(0, 32).map((t) => t.id),
          )
        : null,
    friendlyRounds: cycleIndex === 3 ? buildFriendlyRounds(seasonYear) : [],
    pastChampions: [],
  };
}

function findInMatchList(
  list: FixtureMatch[],
  teamId: string,
  stageLabel: string,
  compId: InternationalCompId,
  dayOfWeek: 3 | 7,
) {
  const m = list.find(
    (fx) => !fx.played && (fx.homeClubId === teamId || fx.awayClubId === teamId),
  );
  if (!m) return null;
  const isHome = m.homeClubId === teamId;
  return {
    competitionId: compId,
    stageLabel,
    opponentId: isHome ? m.awayClubId : m.homeClubId,
    isHome,
    dayOfWeek,
  };
}

function findInGroups(
  groups: ContinentalGroup[],
  roundIdx: number,
  teamId: string,
  compId: InternationalCompId,
  dayOfWeek: 3 | 7,
  prefixLabel = '',
) {
  for (const g of groups) {
    const r = g.rounds[roundIdx];
    if (!r) continue;
    const hit = findInMatchList(
      r,
      teamId,
      `${prefixLabel}${g.groupName} • RODADA ${roundIdx + 1}`,
      compId,
      dayOfWeek,
    );
    if (hit) return hit;
  }
  return null;
}

function findSummerCupMatch(cup: NationalCupTournament | null, teamId: string, week: number, day: 3 | 7) {
  if (!cup) return null;
  if (week === 39 && day === 3) return findInGroups(cup.groups, 0, teamId, cup.compId, 3);
  if (week === 39 && day === 7) return findInGroups(cup.groups, 1, teamId, cup.compId, 7);
  if (week === 40 && day === 3) return findInGroups(cup.groups, 2, teamId, cup.compId, 3);
  if (week === 40 && day === 7 && cup.roundOf16.length > 0) {
    return findInMatchList(cup.roundOf16, teamId, 'OITAVAS DE FINAL', cup.compId, 7);
  }
  if (week === 41 && day === 3) {
    return findInMatchList(cup.quarterFinals, teamId, 'QUARTAS DE FINAL', cup.compId, 3);
  }
  if (week === 41 && day === 7) {
    return findInMatchList(cup.semiFinals, teamId, 'SEMIFINAL', cup.compId, 7);
  }
  if (week === 42 && day === 7 && cup.finalMatch) {
    return findInMatchList([cup.finalMatch], teamId, 'GRANDE FINAL', cup.compId, 7);
  }
  return null;
}

export function findNationalTeamFixtureOnDay(
  intl: InternationalCycleState,
  nationalTeamId: string,
  week: number,
  day: number,
) {
  // 1. Datas FIFA durante a temporada de clubes (Domingo = 7, Semanas 1..38)
  if (day === 7 && week <= 38) {
    if (intl.cycleIndex === 0 || intl.cycleIndex === 2) {
      const wIdx = FIFA_WINDOW_WEEKS.indexOf(week as (typeof FIFA_WINDOW_WEEKS)[number]);
      if (wIdx !== -1) {
        for (const grp of intl.qualifiers) {
          if (!grp.standings.some((r) => r.clubId === nationalTeamId)) continue;
          const rIdx = getQualifierRoundIndex(grp.rounds.length, wIdx, intl.cycleIndex);
          if (rIdx !== null && grp.rounds[rIdx]) {
            return findInMatchList(
              grp.rounds[rIdx],
              nationalTeamId,
              `${grp.label} • RODADA ${rIdx + 1}`,
              getQualifierCompId(grp.confederation),
              7,
            );
          }
        }
      }
    }

    if (intl.cycleIndex === 1 && intl.nationsLeague) {
      const nl = intl.nationsLeague;
      const gIdx = [4, 8, 12, 16, 20, 24].indexOf(week);
      if (gIdx !== -1) {
        const hitA = findInGroups(nl.groups, gIdx, nationalTeamId, 'NATIONS_LEAGUE', 7, 'LIGA A • ');
        if (hitA) return hitA;
        if (nl.leagueBGroups) {
          return findInGroups(nl.leagueBGroups, gIdx, nationalTeamId, 'NATIONS_LEAGUE', 7, 'LIGA B • ');
        }
      }
      if (week === 28) return findInMatchList(nl.quarterFinals, nationalTeamId, 'QUARTAS • LIGA DAS NAÇÕES', 'NATIONS_LEAGUE', 7);
      if (week === 32) return findInMatchList(nl.semiFinals, nationalTeamId, 'SEMIFINAL • LIGA DAS NAÇÕES', 'NATIONS_LEAGUE', 7);
      if (week === 36 && nl.finalMatch) {
        return findInMatchList([nl.finalMatch], nationalTeamId, 'FINAL • LIGA DAS NAÇÕES', 'NATIONS_LEAGUE', 7);
      }
    }

    if (intl.cycleIndex === 3) {
      const fIdx = FRIENDLY_WEEKS.indexOf(week as (typeof FRIENDLY_WEEKS)[number]);
      if (fIdx !== -1 && intl.friendlyRounds[fIdx]) {
        return findInMatchList(
          intl.friendlyRounds[fIdx],
          nationalTeamId,
          'AMISTOSO PREPARATÓRIO COPA',
          'INTL_FRIENDLY',
          7,
        );
      }
    }
  }

  // 2. Torneios de Verão (Semanas 39..42, Quarta=3 e Domingo=7)
  if (week >= 39 && week <= 42 && (day === 3 || day === 7)) {
    if (intl.cycleIndex === 1) {
      return (
        findSummerCupMatch(intl.copaAmerica, nationalTeamId, week, day) ??
        findSummerCupMatch(intl.euroCup, nationalTeamId, week, day)
      );
    }
    if (intl.cycleIndex === 3) {
      return findSummerCupMatch(intl.worldCup, nationalTeamId, week, day);
    }
  }

  return null;
}

export function simulateInternationalDay(
  intl: InternationalCycleState,
  week: number,
  day: number,
  override?: PlayerScoreOverride,
): InternationalCycleState {
  if (day === 7 && week <= 38) {
    if (intl.cycleIndex === 0 || intl.cycleIndex === 2) {
      return {
        ...intl,
        qualifiers: simulateQualifiersWindow(intl.qualifiers, week, intl.cycleIndex, override),
      };
    }
    if (intl.cycleIndex === 1 && intl.nationsLeague) {
      return {
        ...intl,
        nationsLeague: simulateNationsLeagueOnSunday(intl.nationsLeague, week, override),
      };
    }
    if (intl.cycleIndex === 3) {
      const fIdx = FRIENDLY_WEEKS.indexOf(week as (typeof FRIENDLY_WEEKS)[number]);
      if (fIdx !== -1 && intl.friendlyRounds[fIdx]) {
        const updated = intl.friendlyRounds[fIdx].map((m) => {
          if (m.played) return m;
          const isUser =
            override && (m.homeClubId === override.clubId || m.awayClubId === override.clubId);
          const sc = isUser
            ? m.homeClubId === override.clubId
              ? { homeGoals: override.clubGoals, awayGoals: override.oppGoals }
              : { homeGoals: override.oppGoals, awayGoals: override.clubGoals }
            : simulateRealisticScoreline(m.homeClubId, m.awayClubId, false);
          return { ...m, homeGoals: sc.homeGoals, awayGoals: sc.awayGoals, played: true };
        });
        const friendlyRounds = [...intl.friendlyRounds];
        friendlyRounds[fIdx] = updated;
        return { ...intl, friendlyRounds };
      }
    }
  }

  if (week >= 39 && week <= 42 && (day === 3 || day === 7)) {
    if (intl.cycleIndex === 1) {
      return {
        ...intl,
        copaAmerica: intl.copaAmerica
          ? simulateSummerCupSlot(intl.copaAmerica, week, day, override)
          : null,
        euroCup: intl.euroCup
          ? simulateSummerCupSlot(intl.euroCup, week, day, override)
          : null,
      };
    }
    if (intl.cycleIndex === 3 && intl.worldCup) {
      return {
        ...intl,
        worldCup: simulateSummerCupSlot(intl.worldCup, week, day, override),
      };
    }
  }

  return intl;
}

function pushChampionRecord(
  records: InternationalHistoryRecord[],
  cup: NationalCupTournament | null,
): InternationalHistoryRecord[] {
  if (!cup || !cup.championTeamId || !cup.finalMatch) return records;
  const runnerUp =
    cup.finalMatch.homeClubId === cup.championTeamId
      ? cup.finalMatch.awayClubId
      : cup.finalMatch.homeClubId;
  return [
    {
      season: cup.seasonYear,
      tournamentName: cup.title,
      compId: cup.compId,
      championTeamId: cup.championTeamId,
      runnerUpTeamId: runnerUp,
    },
    ...records,
  ];
}

export function rolloverInternationalSeason(
  intl: InternationalCycleState,
  nextSeasonYear: number,
): InternationalCycleState {
  let pastChampions = [...intl.pastChampions];
  pastChampions = pushChampionRecord(pastChampions, intl.nationsLeague);
  pastChampions = pushChampionRecord(pastChampions, intl.copaAmerica);
  pastChampions = pushChampionRecord(pastChampions, intl.euroCup);
  pastChampions = pushChampionRecord(pastChampions, intl.worldCup);
  pastChampions = pastChampions.slice(0, 24);

  const nextCycle = ((intl.cycleIndex + 1) % 4) as 0 | 1 | 2 | 3;

  // Transição Ano 1 -> Ano 2: Top 2 das Eliminatórias CONMEBOL entram na Liga das Nações com a Europa!
  if (nextCycle === 1) {
    const conmebolGrp = intl.qualifiers.find((q) => q.confederation === 'CONMEBOL');
    const conmebolTop2 = conmebolGrp
      ? sortStandings(conmebolGrp.standings).slice(0, 2).map((r) => r.clubId)
      : intl.conmebolNationsSpots;

    return {
      ...intl,
      cycleIndex: 1,
      conmebolNationsSpots: conmebolTop2,
      nationsLeague: createNationsLeagueTournament(nextSeasonYear, intl.qualifiers),
      copaAmerica: createSummer16Tournament('COPA_AMERICA', nextSeasonYear, intl.qualifiers),
      euroCup: createSummer16Tournament('EURO_CUP', nextSeasonYear, intl.qualifiers),
      worldCup: null,
      friendlyRounds: [],
      pastChampions,
    };
  }

  // Transição Ano 2 -> Ano 3: Retoma o 2º Turno das MESMAS Eliminatórias!
  if (nextCycle === 2) {
    return {
      ...intl,
      cycleIndex: 2,
      nationsLeague: null,
      copaAmerica: null,
      euroCup: null,
      worldCup: null,
      friendlyRounds: [],
      pastChampions,
    };
  }

  // Transição Ano 3 -> Ano 4: Classifica as 32 Seleções para a Copa do Mundo FIFA!
  if (nextCycle === 3) {
    const qualified32 = extractWorldCup32FromQualifiers(intl.qualifiers);
    return {
      ...intl,
      cycleIndex: 3,
      qualifiedWorldCupIds: qualified32,
      nationsLeague: null,
      copaAmerica: null,
      euroCup: null,
      worldCup: createWorldCupTournament(nextSeasonYear, qualified32),
      friendlyRounds: buildFriendlyRounds(nextSeasonYear),
      pastChampions,
    };
  }

  // Transição Ano 4 -> Ano 1 de novo Ciclo Olímpico/FIFA: Zera Eliminatórias para a próxima Copa!
  const freshQualifiers = createWorldCupQualifiers();
  return {
    cycleIndex: 0,
    qualifiers: freshQualifiers,
    conmebolNationsSpots: freshQualifiers[0].standings.slice(0, 2).map((r) => r.clubId),
    qualifiedWorldCupIds: [],
    nationsLeague: null,
    copaAmerica: null,
    euroCup: null,
    worldCup: null,
    friendlyRounds: [],
    pastChampions,
  };
}
