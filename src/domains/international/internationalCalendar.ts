import { ALL_NATIONAL_TEAMS } from '../../data/clubs';
import { getQualifierCompId, InternationalCompId } from '../../data/world/competitionThemes';
import { LeagueCountryCode } from '../../shared/types/common';
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
import {
  pickWorldCupHostCountry,
  resolveWorldCupMatchVenue,
} from './worldCupHostVenues';

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
  const cycleIndex = ((((seasonYear - 2026) % 4) + 4) % 4) as 0 | 1 | 2 | 3;
  const qualifiers = createWorldCupQualifiers();
  const conmebolTop2 = qualifiers[0].standings.slice(0, 2).map((r) => r.clubId);
  const upcomingEditionYear = seasonYear + ((3 - cycleIndex + 4) % 4) + 1;
  const nextWorldCupHost = pickWorldCupHostCountry(upcomingEditionYear, []);

  return {
    cycleIndex,
    nextWorldCupHost,
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
            nextWorldCupHost,
          )
        : null,
    friendlyRounds: cycleIndex === 3 ? buildFriendlyRounds(seasonYear) : [],
    pastChampions: [],
  };
}

export interface NationalTeamDayFixture {
  matchId: string;
  competitionId: InternationalCompId;
  stageLabel: string;
  opponentId: string;
  isHome: boolean;
  dayOfWeek: 3 | 7;
  decidesKnockout: boolean;
  neutralVenue?: boolean;
  venueStadiumName?: string;
  venueCity?: string;
  venueCountry?: LeagueCountryCode;
  venueCountryName?: string;
  venueLat?: number;
  venueLng?: number;
}

function findInMatchList(
  list: FixtureMatch[],
  teamId: string,
  stageLabel: string,
  compId: InternationalCompId,
  dayOfWeek: 3 | 7,
  decidesKnockout = false,
): NationalTeamDayFixture | null {
  const m = list.find(
    (fx) => !fx.played && (fx.homeClubId === teamId || fx.awayClubId === teamId),
  );
  if (!m) return null;
  const isHome = m.homeClubId === teamId;
  return {
    matchId: m.id,
    competitionId: compId,
    stageLabel,
    opponentId: isHome ? m.awayClubId : m.homeClubId,
    isHome,
    dayOfWeek,
    decidesKnockout,
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

function findSummerCupMatch(
  cup: NationalCupTournament | null,
  teamId: string,
  week: number,
  day: 3 | 7,
): NationalTeamDayFixture | null {
  if (!cup) return null;
  let hit = null;
  if (week === 39 && day === 3) hit = findInGroups(cup.groups, 0, teamId, cup.compId, 3);
  else if (week === 39 && day === 7) hit = findInGroups(cup.groups, 1, teamId, cup.compId, 7);
  else if (week === 40 && day === 3) hit = findInGroups(cup.groups, 2, teamId, cup.compId, 3);
  else if (week === 40 && day === 7 && cup.roundOf16.length > 0) {
    hit = findInMatchList(cup.roundOf16, teamId, 'OITAVAS DE FINAL', cup.compId, 7, true);
  } else if (week === 41 && day === 3) {
    hit = findInMatchList(cup.quarterFinals, teamId, 'QUARTAS DE FINAL', cup.compId, 3, true);
  } else if (week === 41 && day === 7) {
    hit = findInMatchList(cup.semiFinals, teamId, 'SEMIFINAL', cup.compId, 7, true);
  } else if (week === 42 && day === 7 && cup.finalMatch) {
    hit = findInMatchList([cup.finalMatch], teamId, 'GRANDE FINAL', cup.compId, 7, true);
  }

  if (!hit) return null;

  // Na Copa do Mundo, todos os jogos são disputados em Estádios Cadastrados do País-Sede (sem casa/fora!)
  if (cup.compId === 'WORLD_CUP') {
    const host: LeagueCountryCode = cup.hostCountry ?? 'ESP';
    const venue = resolveWorldCupMatchVenue(host, hit.matchId, hit.stageLabel);
    return {
      ...hit,
      neutralVenue: true,
      venueStadiumName: venue.stadiumName,
      venueCity: venue.city,
      venueCountry: venue.country,
      venueCountryName: venue.countryName,
      venueLat: venue.lat,
      venueLng: venue.lng,
    };
  }

  return {
    ...hit,
    neutralVenue: true,
  };
}

export function findNationalTeamFixtureOnDay(
  intl: InternationalCycleState,
  nationalTeamId: string,
  week: number,
  day: number,
): NationalTeamDayFixture | null {
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
      if (week === 28) return findInMatchList(nl.quarterFinals, nationalTeamId, 'QUARTAS • LIGA DAS NAÇÕES', 'NATIONS_LEAGUE', 7, true);
      if (week === 32) return findInMatchList(nl.semiFinals, nationalTeamId, 'SEMIFINAL • LIGA DAS NAÇÕES', 'NATIONS_LEAGUE', 7, true);
      if (week === 36 && nl.finalMatch) {
        return findInMatchList([nl.finalMatch], nationalTeamId, 'FINAL • LIGA DAS NAÇÕES', 'NATIONS_LEAGUE', 7, true);
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
      editionYear: cup.editionYear,
      hostCountry: cup.hostCountry,
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

  const prevWcHosts = pastChampions
    .filter((r) => r.compId === 'WORLD_CUP' && r.hostCountry)
    .map((r) => r.hostCountry!);

  const nextCycle = ((intl.cycleIndex + 1) % 4) as 0 | 1 | 2 | 3;

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

  // Transição Ano 3 -> Ano 4: Sorteia/confirma País-Sede e classifica as 32 Seleções (incluindo o País-Sede)!
  if (nextCycle === 3) {
    const editionYear = nextSeasonYear + 1;
    const hostCountry =
      intl.nextWorldCupHost ?? pickWorldCupHostCountry(editionYear, prevWcHosts);
    const qualified32 = extractWorldCup32FromQualifiers(intl.qualifiers, hostCountry);
    return {
      ...intl,
      cycleIndex: 3,
      nextWorldCupHost: hostCountry,
      qualifiedWorldCupIds: qualified32,
      nationsLeague: null,
      copaAmerica: null,
      euroCup: null,
      worldCup: createWorldCupTournament(nextSeasonYear, qualified32, hostCountry),
      friendlyRounds: buildFriendlyRounds(nextSeasonYear),
      pastChampions,
    };
  }

  // Novo Ciclo de 4 Anos: já define o País-Sede da próxima Copa do Mundo (+4 anos à frente)!
  const freshQualifiers = createWorldCupQualifiers();
  const nextCycleEditionYear = nextSeasonYear + 4;
  const nextHost = pickWorldCupHostCountry(nextCycleEditionYear, prevWcHosts);
  return {
    cycleIndex: 0,
    nextWorldCupHost: nextHost,
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
