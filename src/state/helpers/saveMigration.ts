import { COUNTRIES, isLeagueCountryCode } from '../../data/countries/countries';
import { INITIAL_PERIOD_STATS } from '../../domains/awards/awardTypes';
import { evaluateEndOfSeasonAwards } from '../../domains/awards/evaluateSeasonAwards';
import { resolveSeasonCompetitionsForDisplay } from '../../domains/career-stats/seasonCampaignBuilder';
import {
  createInitialInternationalState,
  simulateInternationalDay,
} from '../../domains/international/internationalCalendar';
import { pickWorldCupHostCountry } from '../../domains/international/worldCupHostVenues';
import { findClubLeagueIdInWorld } from '../../domains/season/worldSeasonEngine';
import { CareerState } from '../careerTypes';

const LEGACY_KEYS = ['three-stars-soccer-career-v3', 'three-stars-soccer-career-v2'];

/**
 * Resgata saves de chaves anteriores no localStorage caso a chave v4 ainda esteja vazia,
 * garantindo que NENHUM save antigo seja perdido!
 */
export function rescueLegacySaveIfNeeded(currentStorageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(currentStorageKey)) return;
    for (const oldKey of LEGACY_KEYS) {
      const raw = window.localStorage.getItem(oldKey);
      if (raw) {
        window.localStorage.setItem(currentStorageKey, raw);
        break;
      }
    }
  } catch {
    // Ignorar caso modo privado bloqueie acesso
  }
}

/**
 * Migra saves antigos de forma 100% não-destrutiva:
 * - Preserva clube, atributos, dinheiro, troféus e temporada em andamento.
 * - Se não tinha `startingLeagueCountry`, copia a nacionalidade (ou vira Brasileiro na Liga Brasileira).
 * - Se `worldSeason.international` não existia, inicializa as Eliminatórias e simula as Datas FIFA passadas!
 */
export function migratePersistedCareerState(
  persistedUnknown: unknown,
  currentState: CareerState,
): CareerState {
  if (!persistedUnknown || typeof persistedUnknown !== 'object') {
    return currentState;
  }

  const persisted = persistedUnknown as Partial<CareerState>;
  const merged: CareerState = {
    ...currentState,
    ...persisted,
  };

  if (merged.player) {
    const rawNat = merged.player.nationality;
    const validNat = rawNat && rawNat in COUNTRIES ? rawNat : 'BRA';
    const rawStartLg = merged.player.startingLeagueCountry;
    const validStartLg =
      rawStartLg && isLeagueCountryCode(rawStartLg)
        ? rawStartLg
        : isLeagueCountryCode(validNat)
          ? validNat
          : 'BRA';

    const safeAge = Math.max(18, merged.player.age ?? 18);
    const currSeason = merged.calendar?.season ?? 2026;
    const birthDay = merged.player.birthDay ?? 15;
    const birthMonth = merged.player.birthMonth ?? 5;
    const birthYear = merged.player.birthYear ?? currSeason - safeAge;

    merged.player = {
      ...merged.player,
      age: safeAge,
      birthDay,
      birthMonth,
      birthYear,
      nationality: validNat,
      startingLeagueCountry: validStartLg,
      careerTotals: {
        ...merged.player.careerTotals,
        nationalCaps: merged.player.careerTotals?.nationalCaps ?? 0,
        nationalGoals: merged.player.careerTotals?.nationalGoals ?? 0,
      },
    };
  }

  // Se save antigo estava na Base ('YOUTH'), promove automaticamente ao Profissional!
  if (merged.contract && merged.contract.stage === 'YOUTH') {
    merged.contract = {
      ...merged.contract,
      stage: 'PRO',
      role: merged.contract.role === 'BASE_TITULAR' ? 'TITULAR' : 'RESERVA',
      monthlySalary: Math.max(12000, merged.contract.monthlySalary),
      goalBonusPerContribution: Math.max(2500, merged.contract.goalBonusPerContribution),
    };
    merged.youthState = null;
    merged.transitionProposals = [];
  }

  merged.periodStats = {
    ...INITIAL_PERIOD_STATS,
    ...(persisted.periodStats ?? {}),
  };

  // Reconstrói automaticamente temporadas passadas de saves antigos caso `careerSeasonLogs` ainda não existisse!
  if ((!merged.careerSeasonLogs || merged.careerSeasonLogs.length === 0) && merged.worldSeason?.history?.length && merged.player) {
    const sortedHist = [...merged.worldSeason.history].sort((a, b) => a.season - b.season);
    merged.careerSeasonLogs = sortedHist.map((h, idx) => ({
      seasonNumber: idx + 1,
      seasonYear: h.season,
      age: Math.max(16, merged.player!.age - (sortedHist.length - idx)),
      ovrEnd: merged.player!.overall,
      stints: [
        {
          clubId: h.playerClubId,
          leagueId: h.leagueId,
          stage: 'PRO',
          matches: 30,
          goals: h.goals,
          assists: h.assists,
          threeStarMatches: 0,
          leagueFinishPosition: h.leaguePosition,
        },
      ],
      nationalTeamId: `nt_${merged.player!.nationality.toLowerCase()}`,
      nationalMatches: 0,
      nationalGoals: 0,
      nationalAssists: 0,
      trophyTitles: (merged.trophyCabinet ?? [])
        .filter((t) => t.season === h.season && t.code !== 'POTM')
        .map((t) => t.title),
    }));
  }

  if (merged.careerSeasonLogs?.length && merged.player) {
    const nat = merged.player.nationality;
    merged.careerSeasonLogs = merged.careerSeasonLogs.map((log) => ({
      ...log,
      competitions: resolveSeasonCompetitionsForDisplay(log, nat),
      trophyTitles: (log.trophyTitles ?? []).filter(
        (title) =>
          !title.toUpperCase().includes('MELHOR DO MÊS') &&
          !title.toUpperCase().includes('JOGADOR DO MÊS'),
      ),
    }));
  }

  if ((!merged.currentSeasonStints || merged.currentSeasonStints.length === 0) && merged.contract && merged.worldSeason) {
    const clubLg = findClubLeagueIdInWorld(merged.worldSeason, merged.contract.clubId);
    const clubMatches = Math.max(0, merged.periodStats.seasonMatches - merged.periodStats.internationalMatches);
    const clubGoals = Math.max(0, merged.periodStats.seasonGoals - merged.periodStats.internationalGoals);
    const clubAssists = Math.max(0, merged.periodStats.seasonAssists - merged.periodStats.internationalAssists);

    merged.currentSeasonStints = [
      {
        clubId: merged.contract.clubId,
        leagueId: clubLg,
        stage: merged.contract.stage,
        matches: clubMatches,
        goals: clubGoals,
        assists: clubAssists,
        threeStarMatches: 0,
      },
    ];

    if (!merged.userCompStats || Object.keys(merged.userCompStats).length === 0) {
      merged.userCompStats =
        merged.contract.stage !== 'YOUTH' && clubMatches > 0
          ? {
              [clubLg]: {
                clubId: merged.contract.clubId,
                matches: Math.max(0, clubMatches - merged.periodStats.continentalMatches),
                goals: Math.max(0, clubGoals - merged.periodStats.continentalGoals),
                assists: Math.max(0, clubAssists - merged.periodStats.continentalAssists),
                threeStarMatches: 0,
              },
            }
          : {};
    }
  }

  if (!merged.userCompStats) {
    merged.userCompStats = {};
  }

  if (persisted.periodStats?.seasonThreeStarMatches === undefined) {
    merged.periodStats = {
      ...merged.periodStats,
      seasonThreeStarMatches: Object.values(merged.userCompStats).reduce(
        (acc, s) => acc + (s.threeStarMatches ?? 0),
        0,
      ),
    };
  }

  // Garante que a meta contratual da temporada recomece zerada caso uma nova temporada já tenha iniciado
  if (
    merged.contract &&
    merged.periodStats.seasonMatches === 0 &&
    (merged.contract.seasonGoal.current > 0 || merged.contract.seasonGoal.completed)
  ) {
    merged.contract = {
      ...merged.contract,
      seasonGoal: {
        ...merged.contract.seasonGoal,
        current: 0,
        completed: false,
      },
    };
  }

  if (merged.worldSeason && !merged.worldSeason.international) {
    const seasonYear = merged.worldSeason.seasonYear ?? merged.calendar?.season ?? 2026;
    let intl = createInitialInternationalState(seasonYear);
    const currWeek = merged.calendar?.week ?? 1;
    const currDay = merged.calendar?.day ?? 1;

    // Avança silenciosamente as Datas FIFA anteriores à semana atual do save antigo!
    for (let w = 1; w <= currWeek; w++) {
      const maxD = w === currWeek ? currDay - 1 : 7;
      for (let d = 1; d <= maxD; d++) {
        if (d === 7 || (w >= 39 && w <= 42 && d === 3)) {
          intl = simulateInternationalDay(intl, w, d);
        }
      }
    }

    merged.worldSeason = {
      ...merged.worldSeason,
      international: intl,
    };
  } else if (merged.worldSeason?.international) {
    // Backfill não-destrutivo de País-Sede e Ano da Copa do Mundo em saves abertos!
    const intl = merged.worldSeason.international;
    const sYear = merged.worldSeason.seasonYear ?? merged.calendar?.season ?? 2026;
    const prevHosts = (intl.pastChampions ?? [])
      .filter((r) => r.compId === 'WORLD_CUP' && r.hostCountry)
      .map((r) => r.hostCountry!);
    const cIdx = intl.cycleIndex ?? 0;
    const upcomingEdition = sYear + ((3 - cIdx + 4) % 4) + 1;
    const host = intl.nextWorldCupHost ?? pickWorldCupHostCountry(upcomingEdition, prevHosts);

    let updatedWc = intl.worldCup;
    if (updatedWc && (!updatedWc.hostCountry || !updatedWc.editionYear)) {
      const wcYear = updatedWc.seasonYear + 1;
      const wcHost = updatedWc.hostCountry ?? host;
      const hostName = COUNTRIES[wcHost]?.name ?? wcHost;
      updatedWc = {
        ...updatedWc,
        editionYear: wcYear,
        hostCountry: wcHost,
        title: `COPA DO MUNDO ${wcYear} • ${hostName.toUpperCase()}`,
      };
    }

    merged.worldSeason = {
      ...merged.worldSeason,
      international: {
        ...intl,
        nextWorldCupHost: host,
        worldCup: updatedWc,
      },
    };
  }

  // Se o save está na Semana da Gala (mesma temporada ativa), recalcula a Gala e troféus de fim de ano com ligas e posições 100% certas!
  if (
    merged.latestGalaReport &&
    merged.player &&
    merged.contract &&
    merged.worldSeason &&
    merged.latestGalaReport.season === merged.worldSeason.seasonYear
  ) {
    const recomputed = evaluateEndOfSeasonAwards(
      merged.player,
      merged.contract.clubId,
      merged.contract.stage,
      merged.periodStats,
      merged.worldSeason,
      merged.userCompStats,
    );
    merged.latestGalaReport = recomputed.gala;

    const galaSeason = merged.worldSeason.seasonYear;
    const preservedOtherTrophies = (merged.trophyCabinet ?? []).filter(
      (t) => t.season !== galaSeason || t.code === 'POTM',
    );
    merged.trophyCabinet = [...recomputed.newTrophies, ...preservedOtherTrophies];
  }

  return merged;
}
