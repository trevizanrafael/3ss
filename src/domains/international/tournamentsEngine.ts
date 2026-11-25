import { getNationalTeamsByConfederation } from '../../data/clubs';
import { COUNTRIES } from '../../data/countries/countries';
import { InternationalCompId } from '../../data/world/competitionThemes';
import { LeagueCountryCode } from '../../shared/types/common';
import { shuffleArray } from '../../shared/utils/math';
import { PlayerScoreOverride } from '../season/continentalEngine';
import {
  applyScoreToStandings,
  createEmptyStandings,
  simulatePenaltyShootout,
  simulateRealisticScoreline,
  sortStandings,
} from '../season/poissonMatchMath';
import { generateRoundRobinSchedule } from '../season/roundRobinSchedule';
import { ContinentalGroup, FixtureMatch } from '../season/seasonTypes';
import { NationalCupTournament, QualifierGroupData } from './internationalTypes';

function buildGroupsOfFour(
  teamIds: string[],
  prefix: string,
  doubleRoundRobin: boolean,
): ContinentalGroup[] {
  const groupCount = Math.floor(teamIds.length / 4);
  const buckets: string[][] = Array.from({ length: groupCount }, () => []);
  teamIds.forEach((id, idx) => {
    buckets[idx % groupCount].push(id);
  });

  return buckets.map((gIds, gIdx) => {
    const letter = String.fromCharCode(65 + gIdx);
    return {
      groupName: `GRUPO ${letter}`,
      standings: sortStandings(createEmptyStandings(gIds)),
      rounds: generateRoundRobinSchedule(
        gIds,
        `${prefix}_g${letter}`,
        doubleRoundRobin ? 6 : 3,
      ),
    };
  });
}

function makeSingleMatches(pairs: [string, string][], prefix: string): FixtureMatch[] {
  return pairs.map(([homeClubId, awayClubId], idx) => ({
    id: `${prefix}_${idx + 1}`,
    homeClubId,
    awayClubId,
    homeGoals: null,
    awayGoals: null,
    played: false,
  }));
}

function playSingleKnockoutRound(
  matches: FixtureMatch[],
  override?: PlayerScoreOverride,
): FixtureMatch[] {
  return matches.map((m) => {
    if (m.played) return m;
    const isUser =
      override && (m.homeClubId === override.clubId || m.awayClubId === override.clubId);
    const sc = isUser
      ? m.homeClubId === override.clubId
        ? { homeGoals: override.clubGoals, awayGoals: override.oppGoals }
        : { homeGoals: override.oppGoals, awayGoals: override.clubGoals }
      : simulateRealisticScoreline(m.homeClubId, m.awayClubId, true);

    let winnerId: string;
    let penHome: number | null = null;
    let penAway: number | null = null;

    if (sc.homeGoals > sc.awayGoals) {
      winnerId = m.homeClubId;
    } else if (sc.awayGoals > sc.homeGoals) {
      winnerId = m.awayClubId;
    } else if (
      isUser &&
      override &&
      override.clubPenGoals !== undefined &&
      override.oppPenGoals !== undefined
    ) {
      if (m.homeClubId === override.clubId) {
        penHome = override.clubPenGoals;
        penAway = override.oppPenGoals;
      } else {
        penHome = override.oppPenGoals;
        penAway = override.clubPenGoals;
      }
      winnerId = penHome > penAway ? m.homeClubId : m.awayClubId;
    } else {
      const pen = simulatePenaltyShootout(m.homeClubId, m.awayClubId);
      penHome = pen.homePen;
      penAway = pen.awayPen;
      winnerId = pen.winnerId;
    }

    return {
      ...m,
      homeGoals: sc.homeGoals,
      awayGoals: sc.awayGoals,
      penHome,
      penAway,
      played: true,
      winnerId,
    };
  });
}

function playGroupRound(
  groups: ContinentalGroup[],
  roundIdx: number,
  neutralVenue: boolean,
  override?: PlayerScoreOverride,
): ContinentalGroup[] {
  return groups.map((grp) => {
    const round = grp.rounds[roundIdx];
    if (!round) return grp;
    let standings = grp.standings;
    const updated = round.map((m) => {
      if (m.played) return m;
      const isUser =
        override && (m.homeClubId === override.clubId || m.awayClubId === override.clubId);
      const sc = isUser
        ? m.homeClubId === override.clubId
          ? { homeGoals: override.clubGoals, awayGoals: override.oppGoals }
          : { homeGoals: override.oppGoals, awayGoals: override.clubGoals }
        : simulateRealisticScoreline(m.homeClubId, m.awayClubId, neutralVenue);

      standings = applyScoreToStandings(
        standings,
        m.homeClubId,
        m.awayClubId,
        sc.homeGoals,
        sc.awayGoals,
      );
      return { ...m, homeGoals: sc.homeGoals, awayGoals: sc.awayGoals, played: true };
    });
    const rounds = [...grp.rounds];
    rounds[roundIdx] = updated;
    return { ...grp, standings, rounds };
  });
}

/**
 * LIGA DAS NAÇÕES (UEFA + TOP 2 CONMEBOL DAS ELIMINATÓRIAS):
 * - Liga A Elite (16 seleções): Top 14 UEFA + 1º e 2º das Eliminatórias CONMEBOL!
 * - Liga B (12 seleções): Restantes 10 da UEFA + 3º e 4º da CONMEBOL!
 */
export function createNationsLeagueTournament(
  seasonYear: number,
  qualifiers: QualifierGroupData[],
): NationalCupTournament {
  const conmebolGrp = qualifiers.find((q) => q.confederation === 'CONMEBOL');
  const conmebolRanked = conmebolGrp
    ? sortStandings(conmebolGrp.standings).map((r) => r.clubId)
    : getNationalTeamsByConfederation('CONMEBOL').map((t) => t.id);

  const top2Conmebol = conmebolRanked.slice(0, 2);
  const next2Conmebol = conmebolRanked.slice(2, 4);

  const uefaRanked = [...getNationalTeamsByConfederation('UEFA')]
    .sort((a, b) => b.squadAvgOvr - a.squadAvgOvr)
    .map((t) => t.id);

  const leagueATeams = [...uefaRanked.slice(0, 14), ...top2Conmebol];
  const leagueBTeams = [...uefaRanked.slice(14, 24), ...next2Conmebol];

  return {
    compId: 'NATIONS_LEAGUE',
    title: 'LIGA DAS NAÇÕES UEFA + CONMEBOL',
    seasonYear,
    participantIds: [...leagueATeams, ...leagueBTeams],
    conmebolGuestIds: top2Conmebol,
    groups: buildGroupsOfFour(leagueATeams, `unla_${seasonYear}`, true),
    leagueBGroups: buildGroupsOfFour(leagueBTeams, `unlb_${seasonYear}`, true),
    roundOf16: [],
    quarterFinals: [],
    semiFinals: [],
    finalMatch: null,
    championTeamId: null,
  };
}

export function createSummer16Tournament(
  compId: Extract<InternationalCompId, 'COPA_AMERICA' | 'EURO_CUP'>,
  seasonYear: number,
  qualifiers: QualifierGroupData[],
): NationalCupTournament {
  let teams16: string[] = [];
  if (compId === 'COPA_AMERICA') {
    const conmebol10 = getNationalTeamsByConfederation('CONMEBOL').map((t) => t.id);
    const concacafGrp = qualifiers.find((q) => q.confederation === 'CONCACAF');
    const concacaf6 = concacafGrp
      ? sortStandings(concacafGrp.standings).slice(0, 6).map((r) => r.clubId)
      : getNationalTeamsByConfederation('CONCACAF').slice(0, 6).map((t) => t.id);
    teams16 = [...conmebol10, ...concacaf6];
  } else {
    const uefaGrps = qualifiers.filter((q) => q.confederation === 'UEFA');
    for (const g of uefaGrps) {
      teams16.push(...sortStandings(g.standings).slice(0, 4).map((r) => r.clubId));
    }
    if (teams16.length < 16) {
      teams16 = getNationalTeamsByConfederation('UEFA').slice(0, 16).map((t) => t.id);
    }
  }

  return {
    compId,
    title: compId === 'COPA_AMERICA' ? 'CONMEBOL COPA AMÉRICA' : 'UEFA EUROCOPA',
    seasonYear,
    participantIds: teams16.slice(0, 16),
    groups: buildGroupsOfFour(shuffleArray(teams16.slice(0, 16)), `${compId}_${seasonYear}`, false),
    roundOf16: [],
    quarterFinals: [],
    semiFinals: [],
    finalMatch: null,
    championTeamId: null,
  };
}

export function createWorldCupTournament(
  seasonYear: number,
  qualified32Ids: string[],
  hostCountry: LeagueCountryCode = 'ESP',
): NationalCupTournament {
  const editionYear = seasonYear + 1;
  const hostName = COUNTRIES[hostCountry]?.name ?? hostCountry;
  return {
    compId: 'WORLD_CUP',
    title: `COPA DO MUNDO ${editionYear} • ${hostName.toUpperCase()}`,
    seasonYear,
    editionYear,
    hostCountry,
    participantIds: qualified32Ids,
    groups: buildGroupsOfFour(qualified32Ids, `wc_${seasonYear}`, false),
    roundOf16: [],
    quarterFinals: [],
    semiFinals: [],
    finalMatch: null,
    championTeamId: null,
  };
}

const NATIONS_GROUP_WEEKS = [4, 8, 12, 16, 20, 24];

export function simulateNationsLeagueOnSunday(
  cup: NationalCupTournament,
  week: number,
  override?: PlayerScoreOverride,
): NationalCupTournament {
  const gIdx = NATIONS_GROUP_WEEKS.indexOf(week);
  if (gIdx !== -1) {
    const groups = playGroupRound(cup.groups, gIdx, false, override);
    const leagueBGroups = cup.leagueBGroups
      ? playGroupRound(cup.leagueBGroups, gIdx, false, override)
      : undefined;

    let quarterFinals = cup.quarterFinals;
    if (gIdx === 5) {
      const s = groups.map((g) => sortStandings(g.standings));
      quarterFinals = makeSingleMatches(
        [
          [s[0][0].clubId, s[1][1].clubId],
          [s[1][0].clubId, s[0][1].clubId],
          [s[2][0].clubId, s[3][1].clubId],
          [s[3][0].clubId, s[2][1].clubId],
        ],
        `unl_qf_${cup.seasonYear}`,
      );
    }
    return { ...cup, groups, leagueBGroups, quarterFinals };
  }

  if (week === 28 && cup.quarterFinals.length === 4) {
    const qf = playSingleKnockoutRound(cup.quarterFinals, override);
    const semiFinals = makeSingleMatches(
      [
        [qf[0].winnerId!, qf[2].winnerId!],
        [qf[1].winnerId!, qf[3].winnerId!],
      ],
      `unl_sf_${cup.seasonYear}`,
    );
    return { ...cup, quarterFinals: qf, semiFinals };
  }

  if (week === 32 && cup.semiFinals.length === 2) {
    const sf = playSingleKnockoutRound(cup.semiFinals, override);
    const finalMatch = makeSingleMatches(
      [[sf[0].winnerId!, sf[1].winnerId!]],
      `unl_fin_${cup.seasonYear}`,
    )[0];
    return { ...cup, semiFinals: sf, finalMatch };
  }

  if (week === 36 && cup.finalMatch && !cup.finalMatch.played) {
    const fin = playSingleKnockoutRound([cup.finalMatch], override)[0];
    return { ...cup, finalMatch: fin, championTeamId: fin.winnerId ?? null };
  }

  return cup;
}

/**
 * Simula Copa América (16), Eurocopa (16) ou Copa do Mundo (32) nas Semanas 39..42 (Quarta=3 e Domingo=7)!
 */
export function simulateSummerCupSlot(
  cup: NationalCupTournament,
  week: number,
  day: number,
  override?: PlayerScoreOverride,
): NationalCupTournament {
  const is32 = cup.groups.length === 8;

  if (week === 39 && day === 3) return { ...cup, groups: playGroupRound(cup.groups, 0, true, override) };
  if (week === 39 && day === 7) return { ...cup, groups: playGroupRound(cup.groups, 1, true, override) };

  if (week === 40 && day === 3) {
    const groups = playGroupRound(cup.groups, 2, true, override);
    const s = groups.map((g) => sortStandings(g.standings));
    if (is32) {
      const pairs: [string, string][] = [];
      for (let i = 0; i < 8; i += 2) {
        pairs.push([s[i][0].clubId, s[i + 1][1].clubId]);
        pairs.push([s[i + 1][0].clubId, s[i][1].clubId]);
      }
      return { ...cup, groups, roundOf16: makeSingleMatches(pairs, `${cup.compId}_r16`) };
    }
    const qfPairs: [string, string][] = [
      [s[0][0].clubId, s[1][1].clubId],
      [s[1][0].clubId, s[0][1].clubId],
      [s[2][0].clubId, s[3][1].clubId],
      [s[3][0].clubId, s[2][1].clubId],
    ];
    return { ...cup, groups, quarterFinals: makeSingleMatches(qfPairs, `${cup.compId}_qf`) };
  }

  if (week === 40 && day === 7 && is32 && cup.roundOf16.length === 8) {
    const r16 = playSingleKnockoutRound(cup.roundOf16, override);
    const qfPairs: [string, string][] = [];
    for (let i = 0; i < 8; i += 2) {
      qfPairs.push([r16[i].winnerId!, r16[i + 1].winnerId!]);
    }
    return { ...cup, roundOf16: r16, quarterFinals: makeSingleMatches(qfPairs, `${cup.compId}_qf`) };
  }

  if (week === 41 && day === 3 && cup.quarterFinals.length === 4) {
    const qf = playSingleKnockoutRound(cup.quarterFinals, override);
    const sfPairs: [string, string][] = [
      [qf[0].winnerId!, qf[1].winnerId!],
      [qf[2].winnerId!, qf[3].winnerId!],
    ];
    return { ...cup, quarterFinals: qf, semiFinals: makeSingleMatches(sfPairs, `${cup.compId}_sf`) };
  }

  if (week === 41 && day === 7 && cup.semiFinals.length === 2) {
    const sf = playSingleKnockoutRound(cup.semiFinals, override);
    const finalMatch = makeSingleMatches(
      [[sf[0].winnerId!, sf[1].winnerId!]],
      `${cup.compId}_fin`,
    )[0];
    return { ...cup, semiFinals: sf, finalMatch };
  }

  if (week === 42 && day === 7 && cup.finalMatch && !cup.finalMatch.played) {
    const fin = playSingleKnockoutRound([cup.finalMatch], override)[0];
    return { ...cup, finalMatch: fin, championTeamId: fin.winnerId ?? null };
  }

  return cup;
}
