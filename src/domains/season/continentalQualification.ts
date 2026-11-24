import { getClubById, getClubsByLeague } from '../../data/clubs';
import { ContinentalCupId, LeagueId } from '../../data/leagues/leagues';
import { shuffleArray } from '../../shared/utils/math';
import { createEmptyStandings, sortStandings } from './poissonMatchMath';
import { generateRoundRobinSchedule } from './roundRobinSchedule';
import {
  ContinentalCupData,
  ContinentalGroup,
  LeagueSeasonData,
} from './seasonTypes';

function getOrderedClubIdsFromLeague(
  leagues: Record<LeagueId, LeagueSeasonData>,
  lgId: LeagueId,
): string[] {
  const lg = leagues[lgId];
  if (!lg) return [];
  const hasPlayed = lg.standings.some((r) => r.played > 0);
  if (hasPlayed) {
    return sortStandings(lg.standings).map((r) => r.clubId);
  }
  return [...lg.clubIds].sort(
    (a, b) => getClubById(b).squadAvgOvr - getClubById(a).squadAvgOvr,
  );
}

function fillUnique(initial: string[], pool: string[], targetCount: number, exclude: Set<string>): string[] {
  const result: string[] = [];
  for (const id of [...initial, ...pool]) {
    if (result.length >= targetCount) break;
    if (!exclude.has(id) && !result.includes(id)) {
      result.push(id);
    }
  }
  return result;
}

export function qualifyContinentalClubs(
  leagues: Record<LeagueId, LeagueSeasonData>,
): Record<ContinentalCupId, string[]> {
  const eng = getOrderedClubIdsFromLeague(leagues, 'ENG_1');
  const esp = getOrderedClubIdsFromLeague(leagues, 'ESP_1');
  const ita = getOrderedClubIdsFromLeague(leagues, 'ITA_1');
  const ger = getOrderedClubIdsFromLeague(leagues, 'GER_1');
  const fra = getOrderedClubIdsFromLeague(leagues, 'FRA_1');
  const por = getOrderedClubIdsFromLeague(leagues, 'POR_1');
  const uefaExtras = getClubsByLeague('UEFA_POOL')
    .sort((a, b) => b.squadAvgOvr - a.squadAvgOvr)
    .map((c) => c.id);

  const usedUefa = new Set<string>();
  const uclDirect = [
    ...eng.slice(0, 4),
    ...esp.slice(0, 4),
    ...ita.slice(0, 4),
    ...ger.slice(0, 4),
    ...fra.slice(0, 3),
    ...por.slice(0, 2),
  ];
  const uclClubs = fillUnique(uclDirect, uefaExtras, 32, usedUefa);
  uclClubs.forEach((id) => usedUefa.add(id));

  const uelDirect = [
    ...eng.slice(4, 7),
    ...esp.slice(4, 7),
    ...ita.slice(4, 7),
    ...ger.slice(4, 7),
    ...fra.slice(3, 6),
    ...por.slice(2, 5),
  ];
  const uelFallbackPool = [
    ...uefaExtras,
    ...eng.slice(7),
    ...esp.slice(7),
    ...ita.slice(7),
    ...ger.slice(7),
  ];
  const uelClubs = fillUnique(uelDirect, uelFallbackPool, 32, usedUefa);

  // CONMEBOL: Libertadores & Sul-Americana (32 clubes cada)
  const bra = getOrderedClubIdsFromLeague(leagues, 'BRA_1');
  const arg = getOrderedClubIdsFromLeague(leagues, 'ARG_1');
  const conmebolExtras = getClubsByLeague('CONMEBOL_POOL')
    .sort((a, b) => b.squadAvgOvr - a.squadAvgOvr)
    .map((c) => c.id);

  const usedConmebol = new Set<string>();
  const libDirect = [...bra.slice(0, 7), ...arg.slice(0, 7)];
  const libClubs = fillUnique(libDirect, [...conmebolExtras, ...bra.slice(7), ...arg.slice(7)], 32, usedConmebol);
  libClubs.forEach((id) => usedConmebol.add(id));

  const sulDirect = [...bra.slice(7, 14), ...arg.slice(7, 14)];
  const sulClubs = fillUnique(sulDirect, [...conmebolExtras, ...bra.slice(14), ...arg.slice(14)], 32, usedConmebol);

  return {
    CHAMPIONS_LEAGUE: uclClubs,
    EUROPA_LEAGUE: uelClubs,
    LIBERTADORES: libClubs,
    SUL_AMERICANA: sulClubs,
  };
}

export function createContinentalCupFromClubs(
  cupId: ContinentalCupId,
  clubIds: string[],
): ContinentalCupData {
  // Potes 1 a 4 ordenados por Overall para grupos equilibrados e realistas
  const sortedByStrength = [...clubIds]
    .slice(0, 32)
    .sort((a, b) => getClubById(b).squadAvgOvr - getClubById(a).squadAvgOvr);

  const pot1 = shuffleArray(sortedByStrength.slice(0, 8));
  const pot2 = shuffleArray(sortedByStrength.slice(8, 16));
  const pot3 = shuffleArray(sortedByStrength.slice(16, 24));
  const pot4 = shuffleArray(sortedByStrength.slice(24, 32));

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const groups: ContinentalGroup[] = groupLetters.map((letter, idx) => {
    const gClubs = [pot1[idx], pot2[idx], pot3[idx], pot4[idx]].filter(Boolean);
    return {
      groupName: `GRUPO ${letter}`,
      standings: createEmptyStandings(gClubs),
      rounds: generateRoundRobinSchedule(gClubs, `${cupId}_G${letter}`, 6),
    };
  });

  return {
    cupId,
    participantIds: sortedByStrength,
    groups,
    roundOf16: [],
    quarterFinals: [],
    semiFinals: [],
    finalMatch: null,
    championClubId: null,
  };
}
