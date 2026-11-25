import { getNationalTeamsByConfederation } from '../../data/clubs';
import { LeagueCountryCode } from '../../shared/types/common';
import { shuffleArray } from '../../shared/utils/math';
import { PlayerScoreOverride } from '../season/continentalEngine';
import {
  applyScoreToStandings,
  createEmptyStandings,
  simulateRealisticScoreline,
  sortStandings,
} from '../season/poissonMatchMath';
import { generateRoundRobinSchedule } from '../season/roundRobinSchedule';
import { QualifierGroupData } from './internationalTypes';

export const FIFA_WINDOW_WEEKS = [4, 8, 12, 16, 20, 24, 28, 32, 36] as const;

function chunkIntoBalancedGroups(teamIds: string[], groupCount: number): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  // Distribui cabeças-de-chave por potes (já vêm ordenados por OVR ou embaralhados por pote)
  teamIds.forEach((id, idx) => {
    groups[idx % groupCount].push(id);
  });
  return groups;
}

export function createWorldCupQualifiers(): QualifierGroupData[] {
  const groups: QualifierGroupData[] = [];

  // 1. CONMEBOL: Todos contra todos (10 seleções, 18 rodadas — 6 vagas Copa + Top 2 Liga das Nações!)
  const conmebolIds = getNationalTeamsByConfederation('CONMEBOL').map((t) => t.id);
  groups.push({
    id: 'WCQ_CONMEBOL',
    label: 'ELIMINATÓRIAS CONMEBOL (PONTOS CORRIDOS)',
    confederation: 'CONMEBOL',
    directSpots: 6,
    nationsLeagueSpots: 2,
    standings: sortStandings(createEmptyStandings(conmebolIds)),
    rounds: generateRoundRobinSchedule(conmebolIds, 'wcq_sa', 18),
  });

  // 2. UEFA: 4 Grupos de 6 seleções (24 seleções, 10 rodadas — Top 3 de cada = 12 vagas Copa!)
  const uefaSorted = [...getNationalTeamsByConfederation('UEFA')]
    .sort((a, b) => b.squadAvgOvr - a.squadAvgOvr)
    .map((t) => t.id);
  const uefaGroups = chunkIntoBalancedGroups(uefaSorted, 4);
  ['A', 'B', 'C', 'D'].forEach((letter, idx) => {
    const gIds = uefaGroups[idx];
    groups.push({
      id: `WCQ_UEFA_${letter}`,
      label: `ELIMINATÓRIAS UEFA • GRUPO ${letter}`,
      confederation: 'UEFA',
      directSpots: 3,
      standings: sortStandings(createEmptyStandings(gIds)),
      rounds: generateRoundRobinSchedule(gIds, `wcq_eu_${letter}`, 10),
    });
  });

  // 3. CONCACAF: Octogonal Final (8 seleções, 14 rodadas — Top 4 Copa!)
  const concacafIds = getNationalTeamsByConfederation('CONCACAF').map((t) => t.id);
  groups.push({
    id: 'WCQ_CONCACAF',
    label: 'ELIMINATÓRIAS CONCACAF • OCTOGONAL',
    confederation: 'CONCACAF',
    directSpots: 4,
    standings: sortStandings(createEmptyStandings(concacafIds)),
    rounds: generateRoundRobinSchedule(concacafIds, 'wcq_na', 14),
  });

  // 4. CAF: 2 Grupos de 6 seleções (12 seleções, 10 rodadas — 5 vagas africanas!)
  const cafIds = shuffleArray(getNationalTeamsByConfederation('CAF').map((t) => t.id));
  const cafGroups = chunkIntoBalancedGroups(cafIds, 2);
  ['A', 'B'].forEach((letter, idx) => {
    const gIds = cafGroups[idx];
    groups.push({
      id: `WCQ_CAF_${letter}`,
      label: `ELIMINATÓRIAS ÁFRICA (CAF) • GRUPO ${letter}`,
      confederation: 'CAF',
      directSpots: idx === 0 ? 3 : 2,
      standings: sortStandings(createEmptyStandings(gIds)),
      rounds: generateRoundRobinSchedule(gIds, `wcq_af_${letter}`, 10),
    });
  });

  // 5. AFC & OFC: Decagonal Asiático/Oceania (10 seleções, 18 rodadas — Top 5 Copa!)
  const afcIds = getNationalTeamsByConfederation('AFC').map((t) => t.id);
  groups.push({
    id: 'WCQ_AFC',
    label: 'ELIMINATÓRIAS ÁSIA & OCEANIA',
    confederation: 'AFC',
    directSpots: 5,
    standings: sortStandings(createEmptyStandings(afcIds)),
    rounds: generateRoundRobinSchedule(afcIds, 'wcq_as', 18),
  });

  return groups;
}

/**
 * Mapeia a Data FIFA (índice 0..8 da temporada) + fase do ciclo (0 = 1º Turno, 2 = 2º Turno)
 * para o índice exato da rodada de cada grupo eliminatório!
 */
export function getQualifierRoundIndex(
  totalGroupRounds: number,
  windowIdx: number,
  cycleTurn: 0 | 2,
): number | null {
  if (windowIdx < 0 || windowIdx >= 9) return null;
  const halfOffset = cycleTurn === 2 ? Math.floor(totalGroupRounds / 2) : 0;

  if (totalGroupRounds === 18) {
    return halfOffset + windowIdx; // 9 rodadas no Turno 1 + 9 no Turno 2
  }
  if (totalGroupRounds === 14) {
    return windowIdx < 7 ? halfOffset + windowIdx : null; // 7 no Turno 1 + 7 no Turno 2
  }
  if (totalGroupRounds === 10) {
    // 5 rodadas espaçadas nas janelas pares (0, 2, 4, 6, 8)
    return windowIdx % 2 === 0 ? halfOffset + windowIdx / 2 : null;
  }
  return null;
}

export function simulateQualifiersWindow(
  qualifiers: QualifierGroupData[],
  week: number,
  cycleTurn: 0 | 2,
  override?: PlayerScoreOverride,
): QualifierGroupData[] {
  const windowIdx = FIFA_WINDOW_WEEKS.indexOf(week as (typeof FIFA_WINDOW_WEEKS)[number]);
  if (windowIdx === -1) return qualifiers;

  return qualifiers.map((grp) => {
    const rIdx = getQualifierRoundIndex(grp.rounds.length, windowIdx, cycleTurn);
    if (rIdx === null || !grp.rounds[rIdx]) return grp;

    let standings = grp.standings;
    const updatedRound = grp.rounds[rIdx].map((m) => {
      if (m.played) return m;
      const isUserMatch =
        override && (m.homeClubId === override.clubId || m.awayClubId === override.clubId);
      const sc = isUserMatch
        ? m.homeClubId === override.clubId
          ? { homeGoals: override.clubGoals, awayGoals: override.oppGoals }
          : { homeGoals: override.oppGoals, awayGoals: override.clubGoals }
        : simulateRealisticScoreline(m.homeClubId, m.awayClubId, false);

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
    rounds[rIdx] = updatedRound;
    return { ...grp, standings, rounds };
  });
}

export function extractWorldCup32FromQualifiers(
  qualifiers: QualifierGroupData[],
  hostCountry?: LeagueCountryCode,
): string[] {
  const qualified: string[] = [];
  const cafThirds: { clubId: string; points: number; gd: number }[] = [];

  for (const grp of qualifiers) {
    const sorted = sortStandings(grp.standings);
    if (grp.confederation === 'CAF') {
      qualified.push(...sorted.slice(0, 2).map((r) => r.clubId));
      if (sorted[2]) {
        cafThirds.push({
          clubId: sorted[2].clubId,
          points: sorted[2].points,
          gd: sorted[2].goalsFor - sorted[2].goalsAgainst,
        });
      }
    } else {
      qualified.push(...sorted.slice(0, grp.directSpots).map((r) => r.clubId));
    }
  }

  cafThirds.sort((a, b) => b.points - a.points || b.gd - a.gd);
  if (cafThirds[0]) qualified.push(cafThirds[0].clubId);

  const final32 = qualified.slice(0, 32);
  if (hostCountry) {
    const hostTeamId = `nt_${hostCountry.toLowerCase()}`;
    if (!final32.includes(hostTeamId) && final32.length === 32) {
      final32[31] = hostTeamId;
    }
  }
  return final32;
}
