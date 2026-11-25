import { getClubById } from '../../data/clubs';
import { COUNTRIES } from '../../data/countries/countries';
import { INITIAL_PERIOD_STATS } from '../../domains/awards/awardTypes';
import { evaluateMonthlyPotm } from '../../domains/awards/evaluateMonthlyPotm';
import { evaluateEndOfSeasonAwards } from '../../domains/awards/evaluateSeasonAwards';
import { buildSeasonCompetitionCampaigns } from '../../domains/career-stats/seasonCampaignBuilder';
import { generateWindowTransferOffers } from '../../domains/contracts/contractEngine';
import { getOwnedEquipmentBonuses } from '../../domains/economy/economyActions';
import { evaluateNationalCallUp } from '../../domains/international/callUpEvaluator';
import { findNationalTeamFixtureOnDay } from '../../domains/international/internationalCalendar';
import {
  findClubLeagueIdInWorld,
  getClubFixtureOnExactDay,
  rolloverSeasonWithPromotionAndQualification,
  simulateWorldCompetitionsOnDay,
  TOTAL_SEASON_WEEKS,
} from '../../domains/season/worldSeasonEngine';
import { applyFiveSlotsTraining } from '../../domains/training/trainingEngine';
import { StarRating } from '../../shared/types/common';
import { formatMoney, formatSquadRole } from '../../shared/utils/formatters';
import { clamp } from '../../shared/utils/math';
import { CareerState } from '../careerTypes';
import { makeEvent } from '../helpers/feedHelper';

export function computeNextDayState(
  state: CareerState,
  alreadySimulatedMatchToday = false,
): Partial<CareerState> {
  const { player, contract, calendar, drillSlots, ownedEquipmentIds, trainedToday } = state;
  if (!player || !contract) return {};

  let nextPlayer = { ...player };
  let nextContract = { ...contract };
  let nextFeed = [...state.feed];
  let nextBalance = state.bankBalance;
  let nextWorld = state.worldSeason;
  let nextProposals = state.transitionProposals;
  let nextMarket = state.marketOffers;
  let nextLeveled = state.recentLeveledKeys;
  let nextPeriod = { ...state.periodStats };
  let nextStints = [...state.currentSeasonStints];
  let nextSeasonLogs = [...state.careerSeasonLogs];
  let nextUserCompStats = state.userCompStats;
  let nextCabinet = [...state.trophyCabinet];
  let nextPrestige = state.awardPrestigeBoost;
  let nextGala = state.latestGalaReport;
  let nextGalaOpen = state.galaModalOpen;

  const club = getClubById(contract.clubId);
  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);
  const callUp = evaluateNationalCallUp(nextPlayer, contract.stage, nextPeriod);

  if (
    !alreadySimulatedMatchToday &&
    (calendar.day === 3 || calendar.day === 6 || calendar.day === 7)
  ) {
    const myFixture = getClubFixtureOnExactDay(
      nextWorld,
      contract.clubId,
      contract.stage,
      calendar.week,
      calendar.day,
      callUp,
    );
    if (!myFixture) {
      nextWorld = simulateWorldCompetitionsOnDay(nextWorld, calendar.week, calendar.day);
    }
  }

  const isTrainingDay = calendar.week <= 38 && (calendar.day === 2 || calendar.day === 4);
  if (isTrainingDay && !trainedToday) {
    const { updatedPlayer, report } = applyFiveSlotsTraining(
      nextPlayer,
      drillSlots,
      'PASSIVE_50',
      club.youthQuality,
      bonuses.trainingXpBonusPct,
    );
    nextPlayer = updatedPlayer;
    if (report.leveledUpKeys.length > 0) {
      nextLeveled = report.leveledUpKeys;
      nextFeed = [
        makeEvent(
          calendar.week,
          'Evolução nos Slots de Treino (50% Auto)',
          `Subiu +1 em ${report.leveledUpKeys.length} atributo(s) durante a rotina semanal.`,
          'TRAINING',
        ),
        ...nextFeed,
      ];
    }
  }

  nextPlayer = {
    ...nextPlayer,
    stamina: clamp(
      nextPlayer.stamina + 17 + Math.round(bonuses.staminaRecoveryBonus / 3),
      0,
      100,
    ),
  };

  let nextDay = calendar.day + 1;
  let nextWeek = calendar.week;
  let nextSeason = calendar.season;

  if (nextDay > 7) {
    nextDay = 1;
    nextWeek += 1;

    // Prêmio de MELHOR JOGADOR DO MÊS a cada 4 semanas da temporada de clubes (Semanas 4..36)
    if (calendar.week % 4 === 0 && calendar.week <= 36) {
      const potm = evaluateMonthlyPotm(
        nextPlayer,
        contract.clubId,
        contract.stage,
        nextPeriod,
        nextWorld,
        calendar.season,
        calendar.week,
      );
      if (potm.userWon && potm.trophyEntry) {
        nextBalance += potm.cashReward;
        nextPrestige += 1;
        nextCabinet = [potm.trophyEntry, ...nextCabinet];
        nextPlayer = {
          ...nextPlayer,
          reputationStars: Math.min(3, Math.max(1, nextPlayer.reputationStars)) as StarRating,
        };
        nextFeed = [
          {
            ...makeEvent(
              calendar.week,
              `★ VOCÊ ELEITO ${potm.trophyEntry.title}!`,
              `${potm.winnerStatLine} • Bônus de ${formatMoney(potm.cashReward)} creditado!`,
              'AWARD',
            ),
            clubId: contract.clubId,
          },
          ...nextFeed,
        ];
      } else {
        const winClub = getClubById(potm.winnerClubId);
        nextFeed = [
          {
            ...makeEvent(
              calendar.week,
              `Jogador do Mês: ${potm.winnerName} (${winClub.shortName})`,
              `Desempenho no mês: ${potm.winnerStatLine}`,
              'AWARD',
            ),
            clubId: potm.winnerClubId,
          },
          ...nextFeed,
        ];
      }
      nextPeriod = {
        ...nextPeriod,
        monthMatches: 0,
        monthGoals: 0,
        monthAssists: 0,
        monthStarPoints: 0,
      };
    }

    if (nextWeek % 4 === 1 && nextWeek <= 40) {
      nextBalance += contract.monthlySalary;
      nextFeed = [
        makeEvent(
          calendar.week,
          'Salário Mensal Depositado',
          `Recebido ${formatMoney(contract.monthlySalary)} do ${club.name}.`,
          'CONTRACT',
        ),
        ...nextFeed,
      ];
    }

    // Boletim de CONVOCAÇÃO OFICIAL quando a nova semana tem jogo da Seleção e você atingiu o mérito!
    const nextCallUp = evaluateNationalCallUp(nextPlayer, contract.stage, nextPeriod);
    if (nextCallUp.calledUp && nextWorld.international && nextWeek <= 42) {
      const hasNtGameThisWeek =
        Boolean(findNationalTeamFixtureOnDay(nextWorld.international, nextCallUp.nationalTeamId, nextWeek, 3)) ||
        Boolean(findNationalTeamFixtureOnDay(nextWorld.international, nextCallUp.nationalTeamId, nextWeek, 7));

      if (hasNtGameThisWeek) {
        const natMeta = COUNTRIES[nextPlayer.nationality] ?? COUNTRIES.BRA;
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `★ CONVOCADO PARA A SELEÇÃO (${natMeta.name.toUpperCase()})!`,
              `Você integra a lista oficial como ${formatSquadRole(nextCallUp.role)} nesta Data FIFA / Copa!`,
              'AWARD',
            ),
            clubId: nextCallUp.nationalTeamId,
          },
          ...nextFeed,
        ];
      }
    }

    if (nextWeek === 20 && contract.stage !== 'YOUTH') {
      nextMarket = generateWindowTransferOffers(
        nextPlayer,
        contract,
        state.agentId,
        nextPrestige,
      );
      nextFeed = [
        makeEvent(
          20,
          'Janela de Meio de Temporada Aberta',
          'Confira propostas em ESCRITÓRIO.',
          'CONTRACT',
        ),
        ...nextFeed,
      ];
    }

    // Semana 43 (logo após as Finais de Copa do Mundo / Copa América / Eurocopa na Semana 42!): GALA DA BOLA DE OURO + JANELA ANUAL!
    if (nextWeek === TOTAL_SEASON_WEEKS) {
      const { gala, newTrophies } = evaluateEndOfSeasonAwards(
        nextPlayer,
        contract.clubId,
        contract.stage,
        nextPeriod,
        nextWorld,
        nextUserCompStats,
      );
      nextGala = gala;
      nextGalaOpen = true;
      nextBalance += gala.totalCashWon;
      nextPrestige += gala.prestigeBoostEarned;

      if (newTrophies.length > 0) {
        nextCabinet = [...newTrophies, ...nextCabinet];
        const wonWorld = newTrophies.some(
          (t) => t.code === 'BALLON_DOR' || t.code === 'GOLDEN_BOY',
        );
        nextPlayer = {
          ...nextPlayer,
          reputationStars: (wonWorld
            ? 3
            : Math.min(3, nextPlayer.reputationStars + 1)) as StarRating,
          careerTotals: {
            ...nextPlayer.careerTotals,
            trophies: nextPlayer.careerTotals.trophies + newTrophies.length,
          },
        };
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `★ GALA ${calendar.season}: ${newTrophies.length} PRÊMIO(S) CONQUISTADO(S)!`,
              newTrophies.map((t) => t.title).join(' • '),
              'AWARD',
            ),
            clubId: contract.clubId,
          },
          ...nextFeed,
        ];
      } else {
        const bdWinner = gala.majorAwards[0]?.podium[0];
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `Gala da Temporada • Bola de Ouro: ${bdWinner?.playerName ?? 'Definido'}`,
              'Confira todos os pódios Top 3 e a Seleção do Campeonato!',
              'AWARD',
            ),
            clubId: bdWinner?.clubId,
          },
          ...nextFeed,
        ];
      }

      nextMarket = generateWindowTransferOffers(
        nextPlayer,
        contract,
        state.agentId,
        nextPrestige,
      );
    }

    if (nextWeek > TOTAL_SEASON_WEEKS) {
      // Arquiva o registro completo da temporada encerrada antes do rollover!
      const finishedSeasonYear = calendar.season;
      const stintsWithFinish = (
        nextStints.length > 0
          ? nextStints
          : [
              {
                clubId: contract.clubId,
                leagueId: findClubLeagueIdInWorld(nextWorld, contract.clubId),
                stage: contract.stage,
                matches: Math.max(0, nextPeriod.seasonMatches - nextPeriod.internationalMatches),
                goals: Math.max(0, nextPeriod.seasonGoals - nextPeriod.internationalGoals),
                assists: Math.max(0, nextPeriod.seasonAssists - nextPeriod.internationalAssists),
                threeStarMatches: 0,
              },
            ]
      ).map((st) => {
        const lgRows = nextWorld.leagues[st.leagueId]?.standings ?? [];
        const posIdx = lgRows.findIndex((r) => r.clubId === st.clubId);
        return {
          ...st,
          leagueFinishPosition: st.stage === 'YOUTH' || posIdx === -1 ? undefined : posIdx + 1,
        };
      });

      const seasonTrophies = nextCabinet
        .filter((t) => t.season === finishedSeasonYear && t.code !== 'POTM')
        .map((t) => t.title);

      const archivedCompetitions = buildSeasonCompetitionCampaigns(
        nextWorld,
        stintsWithFinish,
        nextUserCompStats,
        nextPlayer.nationality,
        true,
        TOTAL_SEASON_WEEKS,
      );

      nextSeasonLogs = [
        ...nextSeasonLogs,
        {
          seasonNumber: nextSeasonLogs.length + 1,
          seasonYear: finishedSeasonYear,
          age: nextPlayer.age,
          ovrEnd: nextPlayer.overall,
          stints: stintsWithFinish,
          competitions: archivedCompetitions,
          nationalTeamId: `nt_${nextPlayer.nationality.toLowerCase()}`,
          nationalMatches: nextPeriod.internationalMatches,
          nationalGoals: nextPeriod.internationalGoals,
          nationalAssists: nextPeriod.internationalAssists,
          trophyTitles: seasonTrophies,
        },
      ];

      nextWeek = 1;
      nextSeason += 1;
      nextPlayer = { ...nextPlayer, age: nextPlayer.age + 1 };
      nextContract = {
        ...nextContract,
        seasonsRemaining: Math.max(1, nextContract.seasonsRemaining - 1),
        seasonGoal: {
          ...nextContract.seasonGoal,
          current: 0,
          completed: false,
        },
      };
      nextWorld = rolloverSeasonWithPromotionAndQualification(
        nextWorld,
        contract.clubId,
        nextPeriod.seasonGoals,
        nextPeriod.seasonAssists,
      );
      nextPeriod = { ...INITIAL_PERIOD_STATS };
      nextStints = [
        {
          clubId: contract.clubId,
          leagueId: findClubLeagueIdInWorld(nextWorld, contract.clubId),
          stage: contract.stage,
          matches: 0,
          goals: 0,
          assists: 0,
          threeStarMatches: 0,
        },
      ];
      nextUserCompStats = {};
      nextPrestige = Math.max(0, nextPrestige - 2);
      nextFeed = [
        makeEvent(
          1,
          `Nova Temporada ${nextSeason}! (${nextPlayer.age} anos)`,
          'Acessos, rebaixamentos, grupos continentais e calendário FIFA atualizados!',
          'INFO',
        ),
        ...nextFeed,
      ];
    }
  }

  return {
    player: nextPlayer,
    contract: nextContract,
    calendar: { season: nextSeason, week: nextWeek, day: nextDay },
    trainedToday: false,
    recentLeveledKeys: nextLeveled,
    bankBalance: nextBalance,
    worldSeason: nextWorld,
    periodStats: nextPeriod,
    currentSeasonStints: nextStints,
    careerSeasonLogs: nextSeasonLogs,
    userCompStats: nextUserCompStats,
    trophyCabinet: nextCabinet,
    awardPrestigeBoost: nextPrestige,
    latestGalaReport: nextGala,
    galaModalOpen: nextGalaOpen,
    transitionProposals: nextProposals,
    marketOffers: nextMarket,
    feed: nextFeed.slice(0, 30),
  };
}
