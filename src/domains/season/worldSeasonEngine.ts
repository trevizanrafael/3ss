import { getClubById, getClubsByLeague } from '../../data/clubs';
import {
  ContinentalCupId,
  LeagueId,
  LEAGUES,
  PLAYABLE_LEAGUE_IDS,
} from '../../data/leagues/leagues';
import { CareerStage } from '../../shared/types/common';
import { NationalCallUpStatus } from '../international/callUpEvaluator';
import {
  createInitialInternationalState,
  findNationalTeamFixtureOnDay,
  rolloverInternationalSeason,
  simulateInternationalDay,
} from '../international/internationalCalendar';
import {
  ALL_CONTINENTAL_WEEKS,
  findClubContinentalFixtureInWeek,
  PlayerScoreOverride,
  simulateContinentalWeek,
} from './continentalEngine';
import {
  createContinentalCupFromClubs,
  qualifyContinentalClubs,
} from './continentalQualification';
import {
  applyScoreToStandings,
  createEmptyStandings,
  simulateRealisticScoreline,
  sortStandings,
} from './poissonMatchMath';
import {
  generateRoundRobinSchedule,
  getLeagueRoundForWeek,
} from './roundRobinSchedule';
import {
  ContinentalCupData,
  LeagueSeasonData,
  ScheduledClubFixture,
  WorldSeasonState,
} from './seasonTypes';

// Semanas 1..38 = Clubes + Datas FIFA (Dom) | Semanas 39..42 = Copas de Seleções (Junho) | Semana 43 = Gala & Janela
export const TOTAL_SEASON_WEEKS = 43;

const ALL_CUPS: ContinentalCupId[] = [
  'CHAMPIONS_LEAGUE',
  'EUROPA_LEAGUE',
  'LIBERTADORES',
  'SUL_AMERICANA',
];

function buildLeagueSeason(leagueId: LeagueId, clubIds: string[]): LeagueSeasonData {
  return {
    leagueId,
    clubIds,
    standings: createEmptyStandings(clubIds),
    rounds: generateRoundRobinSchedule(clubIds, leagueId, 38),
  };
}

export function createInitialWorldSeason(seasonYear = 2026): WorldSeasonState {
  const leagues = {} as Record<LeagueId, LeagueSeasonData>;
  for (const lgId of PLAYABLE_LEAGUE_IDS) {
    const clubIds = getClubsByLeague(lgId).map((c) => c.id);
    leagues[lgId] = buildLeagueSeason(lgId, clubIds);
  }

  const qualified = qualifyContinentalClubs(leagues);
  const continentals = {} as Record<ContinentalCupId, ContinentalCupData>;
  for (const cupId of ALL_CUPS) {
    continentals[cupId] = createContinentalCupFromClubs(cupId, qualified[cupId]);
  }

  return {
    seasonYear,
    leagues,
    continentals,
    international: createInitialInternationalState(seasonYear),
    history: [],
  };
}

export function findClubLeagueIdInWorld(world: WorldSeasonState, clubId: string): LeagueId {
  for (const lgId of PLAYABLE_LEAGUE_IDS) {
    if (world.leagues[lgId]?.clubIds.includes(clubId)) return lgId;
  }
  return getClubById(clubId).leagueId;
}

export function getClubFixtureOnExactDay(
  world: WorldSeasonState,
  clubId: string,
  stage: CareerStage,
  week: number,
  day: number,
  callUp?: NationalCallUpStatus | null,
): ScheduledClubFixture | null {
  // 1. Jogos da Seleção Nacional (Datas FIFA no Domingo ou Copas de Verão nas Semanas 39..42) quando convocado!
  if (callUp?.calledUp && world.international) {
    const ntFx = findNationalTeamFixtureOnDay(
      world.international,
      callUp.nationalTeamId,
      week,
      day,
    );
    if (ntFx) {
      return {
        competitionId: ntFx.competitionId,
        isContinental: false,
        isNationalTeam: true,
        myTeamId: callUp.nationalTeamId,
        nationalRole: callUp.role,
        stageLabel: ntFx.stageLabel,
        opponentId: ntFx.opponentId,
        isHome: ntFx.isHome,
        dayOfWeek: ntFx.dayOfWeek,
      };
    }
  }

  // 2. Quarta-feira (day === 3, Semanas 1..38): Competições Continentais de Clubes
  if (day === 3 && week <= 38 && stage !== 'YOUTH' && ALL_CONTINENTAL_WEEKS.has(week)) {
    for (const cupId of ALL_CUPS) {
      const found = findClubContinentalFixtureInWeek(world.continentals[cupId], clubId, week);
      if (found) {
        return {
          competitionId: cupId,
          isContinental: true,
          myTeamId: clubId,
          stageLabel: found.stageLabel,
          opponentId: found.opponentId,
          isHome: found.isHome,
          dayOfWeek: 3,
        };
      }
    }
  }

  // 3. Sábado (day === 6, Semanas 1..38): Rodada da Liga Nacional / Base
  if (day === 6 && week <= 38) {
    const lgId = findClubLeagueIdInWorld(world, clubId);
    const lg = world.leagues[lgId];
    const rIdx = getLeagueRoundForWeek(week, lg.rounds.length);
    if (rIdx !== null && lg.rounds[rIdx]) {
      const m = lg.rounds[rIdx].find(
        (fx) => !fx.played && (fx.homeClubId === clubId || fx.awayClubId === clubId),
      );
      if (m) {
        const isHome = m.homeClubId === clubId;
        return {
          competitionId: lgId,
          isContinental: false,
          myTeamId: clubId,
          stageLabel: `RODADA ${rIdx + 1}`,
          opponentId: isHome ? m.awayClubId : m.homeClubId,
          isHome,
          dayOfWeek: 6,
        };
      }
    }
  }

  return null;
}

export function findUpcomingFixtureForClub(
  world: WorldSeasonState,
  clubId: string,
  stage: CareerStage,
  startWeek: number,
  startDay: number,
  callUp?: NationalCallUpStatus | null,
): ScheduledClubFixture | null {
  for (let w = startWeek; w <= 42; w++) {
    const dFrom = w === startWeek ? startDay : 1;
    for (const d of [3, 6, 7] as const) {
      if (d < dFrom) continue;
      const fx = getClubFixtureOnExactDay(world, clubId, stage, w, d, callUp);
      if (fx) return fx;
    }
  }
  return null;
}

export function simulateWorldCompetitionsOnDay(
  world: WorldSeasonState,
  week: number,
  day: number,
  playerOverride?: PlayerScoreOverride,
): WorldSeasonState {
  let nextWorld = world;

  // Quarta-feira (Semanas 1..38): todas as 4 copas continentais de clubes rodam simultaneamente!
  if (day === 3 && week <= 38 && ALL_CONTINENTAL_WEEKS.has(week)) {
    const nextCont = { ...nextWorld.continentals };
    for (const cupId of ALL_CUPS) {
      nextCont[cupId] = simulateContinentalWeek(nextCont[cupId], week, playerOverride);
    }
    nextWorld = { ...nextWorld, continentals: nextCont };
  }

  // Sábado (Semanas 1..38): todas as 17 ligas nacionais rodam simultaneamente!
  if (day === 6 && week <= 38) {
    const nextLeagues = { ...nextWorld.leagues };
    for (const lgId of PLAYABLE_LEAGUE_IDS) {
      const lg = nextLeagues[lgId];
      const rIdx = getLeagueRoundForWeek(week, lg.rounds.length);
      if (rIdx === null || !lg.rounds[rIdx]) continue;

      let standings = lg.standings;
      const updatedRound = lg.rounds[rIdx].map((m) => {
        if (m.played) return m;
        const isPlayerGame =
          playerOverride &&
          (m.homeClubId === playerOverride.clubId || m.awayClubId === playerOverride.clubId);
        const sc = isPlayerGame
          ? m.homeClubId === playerOverride.clubId
            ? { homeGoals: playerOverride.clubGoals, awayGoals: playerOverride.oppGoals }
            : { homeGoals: playerOverride.oppGoals, awayGoals: playerOverride.clubGoals }
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

      const rounds = [...lg.rounds];
      rounds[rIdx] = updatedRound;
      nextLeagues[lgId] = { ...lg, standings, rounds };
    }
    nextWorld = { ...nextWorld, leagues: nextLeagues };
  }

  // Datas FIFA (Domingo) e Copas de Seleções de Verão (Semanas 39..42, Quarta & Domingo)!
  if (nextWorld.international && (day === 7 || (week >= 39 && week <= 42 && day === 3))) {
    nextWorld = {
      ...nextWorld,
      international: simulateInternationalDay(
        nextWorld.international,
        week,
        day,
        playerOverride,
      ),
    };
  }

  return nextWorld;
}

export function rolloverSeasonWithPromotionAndQualification(
  world: WorldSeasonState,
  playerClubId: string,
  playerSeasonGoals: number,
  playerSeasonAssists: number,
): WorldSeasonState {
  const playerLeagueId = findClubLeagueIdInWorld(world, playerClubId);
  const pSorted = sortStandings(world.leagues[playerLeagueId].standings);
  const playerPos = Math.max(1, pSorted.findIndex((r) => r.clubId === playerClubId) + 1);

  const historyEntry = {
    season: world.seasonYear,
    playerClubId,
    leagueId: playerLeagueId,
    leaguePosition: playerPos,
    leagueChampionId: pSorted[0]?.clubId ?? playerClubId,
    championsLeagueWinnerId: world.continentals.CHAMPIONS_LEAGUE.championClubId,
    libertadoresWinnerId: world.continentals.LIBERTADORES.championClubId,
    worldCupWinnerId:
      world.international?.worldCup?.championTeamId ??
      world.international?.copaAmerica?.championTeamId ??
      null,
    goals: playerSeasonGoals,
    assists: playerSeasonAssists,
  };

  const qualifiedNextYear = qualifyContinentalClubs(world.leagues);

  const nextClubLists = {} as Record<LeagueId, string[]>;
  for (const lgId of PLAYABLE_LEAGUE_IDS) {
    nextClubLists[lgId] = sortStandings(world.leagues[lgId].standings).map((r) => r.clubId);
  }

  for (const lgId of PLAYABLE_LEAGUE_IDS) {
    const cfg = LEAGUES[lgId];
    if (cfg.division === 1 && cfg.hasRelegation && cfg.relegatedTo) {
      const dropCount = lgId === 'BRA_1' ? 4 : 3;
      const div1Ids = nextClubLists[lgId];
      const div2Ids = nextClubLists[cfg.relegatedTo];

      const relegated = div1Ids.slice(-dropCount);
      const promoted = div2Ids.slice(0, dropCount);

      nextClubLists[lgId] = [...div1Ids.slice(0, -dropCount), ...promoted];
      nextClubLists[cfg.relegatedTo] = [...relegated, ...div2Ids.slice(dropCount)];
    }
  }

  const nextLeagues = {} as Record<LeagueId, LeagueSeasonData>;
  for (const lgId of PLAYABLE_LEAGUE_IDS) {
    nextLeagues[lgId] = buildLeagueSeason(lgId, nextClubLists[lgId]);
  }

  const nextContinentals = {} as Record<ContinentalCupId, ContinentalCupData>;
  for (const cupId of ALL_CUPS) {
    nextContinentals[cupId] = createContinentalCupFromClubs(cupId, qualifiedNextYear[cupId]);
  }

  const baseIntl = world.international ?? createInitialInternationalState(world.seasonYear);
  const nextInternational = rolloverInternationalSeason(baseIntl, world.seasonYear + 1);

  return {
    seasonYear: world.seasonYear + 1,
    leagues: nextLeagues,
    continentals: nextContinentals,
    international: nextInternational,
    history: [historyEntry, ...world.history.slice(0, 19)],
  };
}
