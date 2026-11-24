import { getClubById } from '../../data/clubs';
import { INITIAL_PERIOD_STATS } from '../../domains/awards/awardTypes';
import { evaluateMonthlyPotm } from '../../domains/awards/evaluateMonthlyPotm';
import { evaluateEndOfSeasonAwards } from '../../domains/awards/evaluateSeasonAwards';
import { generateWindowTransferOffers } from '../../domains/contracts/contractEngine';
import { getOwnedEquipmentBonuses } from '../../domains/economy/economyActions';
import {
  getClubFixtureOnExactDay,
  rolloverSeasonWithPromotionAndQualification,
  simulateWorldCompetitionsOnDay,
  TOTAL_SEASON_WEEKS,
} from '../../domains/season/worldSeasonEngine';
import { applyFiveSlotsTraining } from '../../domains/training/trainingEngine';
import { generateYouthTransitionProposals } from '../../domains/youth-academy/youthModel';
import { StarRating } from '../../shared/types/common';
import { formatMoney } from '../../shared/utils/formatters';
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
  let nextFeed = [...state.feed];
  let nextBalance = state.bankBalance;
  let nextWorld = state.worldSeason;
  let nextProposals = state.transitionProposals;
  let nextMarket = state.marketOffers;
  let nextLeveled = state.recentLeveledKeys;
  let nextPeriod = { ...state.periodStats };
  let nextCabinet = [...state.trophyCabinet];
  let nextPrestige = state.awardPrestigeBoost;
  let nextGala = state.latestGalaReport;
  let nextGalaOpen = state.galaModalOpen;

  const club = getClubById(contract.clubId);
  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);

  if (!alreadySimulatedMatchToday && (calendar.day === 3 || calendar.day === 6)) {
    const myFixture = getClubFixtureOnExactDay(
      nextWorld,
      contract.clubId,
      contract.stage,
      calendar.week,
      calendar.day,
    );
    if (!myFixture) {
      nextWorld = simulateWorldCompetitionsOnDay(nextWorld, calendar.week, calendar.day);
    }
  }

  const isTrainingDay = calendar.day === 2 || calendar.day === 4;
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
    stamina: clamp(nextPlayer.stamina + 14 + Math.round(bonuses.staminaRecoveryBonus / 3), 0, 100),
  };

  let nextDay = calendar.day + 1;
  let nextWeek = calendar.week;
  let nextSeason = calendar.season;

  if (nextDay > 7) {
    nextDay = 1;
    nextWeek += 1;

    // A cada 4 semanas (fim de mês de competição, Semanas 4..36): Prêmio de MELHOR JOGADOR DO MÊS + Salário!
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
          careerTotals: {
            ...nextPlayer.careerTotals,
            trophies: nextPlayer.careerTotals.trophies + 1,
          },
        };
        nextFeed = [
          {
            ...makeEvent(
              calendar.week,
              `★ VOCÊ ELEITO ${potm.trophyEntry.title}!`,
              `${potm.winnerStatLine} • Bônus de ${formatMoney(potm.cashReward)} creditado na conta!`,
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
      // Zera acumuladores do mês
      nextPeriod = {
        ...nextPeriod,
        monthMatches: 0,
        monthGoals: 0,
        monthAssists: 0,
        monthStarPoints: 0,
      };
    }

    if (nextWeek % 4 === 1) {
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

    if (nextWeek === 20 && contract.stage !== 'YOUTH') {
      nextMarket = generateWindowTransferOffers(nextPlayer, contract, state.agentId, nextPrestige);
      nextFeed = [
        makeEvent(20, 'Janela de Meio de Temporada Aberta', 'Confira propostas em ESCRITÓRIO.', 'CONTRACT'),
        ...nextFeed,
      ];
    }

    // Fim das 38 rodadas (entrando na Semana 39): GALA DE PREMIAÇÃO ANUAL (Bola de Ouro, Golden Boy, Chuteira, Liga)!
    if (nextWeek === 39) {
      const { gala, newTrophies } = evaluateEndOfSeasonAwards(
        nextPlayer,
        contract.clubId,
        contract.stage,
        nextPeriod,
        nextWorld,
      );
      nextGala = gala;
      nextGalaOpen = true;
      nextBalance += gala.totalCashWon;
      nextPrestige += gala.prestigeBoostEarned;

      if (newTrophies.length > 0) {
        nextCabinet = [...newTrophies, ...nextCabinet];
        const wonWorld = newTrophies.some((t) => t.code === 'BALLON_DOR' || t.code === 'GOLDEN_BOY');
        nextPlayer = {
          ...nextPlayer,
          reputationStars: (wonWorld ? 3 : Math.min(3, nextPlayer.reputationStars + 1)) as StarRating,
          careerTotals: {
            ...nextPlayer.careerTotals,
            trophies: nextPlayer.careerTotals.trophies + newTrophies.length,
          },
        };
        nextFeed = [
          {
            ...makeEvent(
              39,
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
              39,
              `Gala da Temporada • Bola de Ouro: ${bdWinner?.playerName ?? 'Definido'}`,
              'Confira todos os pódios Top 3 e a Seleção do Campeonato!',
              'AWARD',
            ),
            clubId: bdWinner?.clubId,
          },
          ...nextFeed,
        ];
      }

      if (contract.stage === 'YOUTH') {
        nextProposals = generateYouthTransitionProposals(nextPlayer, contract.clubId);
      } else {
        nextMarket = generateWindowTransferOffers(nextPlayer, contract, state.agentId, nextPrestige);
      }
    }

    if (nextWeek > TOTAL_SEASON_WEEKS) {
      nextWeek = 1;
      nextSeason += 1;
      nextPlayer = { ...nextPlayer, age: nextPlayer.age + 1 };
      nextWorld = rolloverSeasonWithPromotionAndQualification(
        nextWorld,
        contract.clubId,
        nextPeriod.seasonGoals,
        nextPeriod.seasonAssists,
      );
      nextPeriod = { ...INITIAL_PERIOD_STATS };
      nextPrestige = Math.max(0, nextPrestige - 2);
      nextFeed = [
        makeEvent(
          1,
          `Nova Temporada ${nextSeason}! (${nextPlayer.age} anos)`,
          'Acessos, rebaixamentos e novos grupos continentais sorteados!',
          'INFO',
        ),
        ...nextFeed,
      ];
    }
  }

  return {
    player: nextPlayer,
    calendar: { season: nextSeason, week: nextWeek, day: nextDay },
    trainedToday: false,
    recentLeveledKeys: nextLeveled,
    bankBalance: nextBalance,
    worldSeason: nextWorld,
    periodStats: nextPeriod,
    trophyCabinet: nextCabinet,
    awardPrestigeBoost: nextPrestige,
    latestGalaReport: nextGala,
    galaModalOpen: nextGalaOpen,
    transitionProposals: nextProposals,
    marketOffers: nextMarket,
    feed: nextFeed.slice(0, 30),
  };
}
