import { getClubById } from '../../data/clubs';
import { applySeasonPromotionRelegation } from '../../domains/competition/leagueSimulator';
import { generateWindowTransferOffers } from '../../domains/contracts/contractEngine';
import { getOwnedEquipmentBonuses } from '../../domains/economy/economyActions';
import { applyFiveSlotsTraining } from '../../domains/training/trainingEngine';
import { generateYouthTransitionProposals } from '../../domains/youth-academy/youthModel';
import { formatMoney } from '../../shared/utils/formatters';
import { clamp } from '../../shared/utils/math';
import { CareerState } from '../careerTypes';
import { makeEvent } from '../helpers/feedHelper';

const SEASON_WEEKS = 20;

export function computeNextDayState(state: CareerState): Partial<CareerState> {
  const { player, contract, calendar, drillSlots, ownedEquipmentIds, trainedToday } = state;
  if (!player || !contract) return {};

  let nextPlayer = { ...player };
  let nextFeed = [...state.feed];
  let nextBalance = state.bankBalance;
  let nextTables = state.leagueTables;
  let nextProposals = state.transitionProposals;
  let nextMarket = state.marketOffers;
  let nextLeveled = state.recentLeveledKeys;

  const club = getClubById(contract.clubId);
  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);

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

    if (nextWeek % 4 === 1) {
      nextBalance += contract.monthlySalary;
      nextFeed = [
        makeEvent(
          calendar.week,
          'Pagamento Mensal Creditado',
          `Recebido ${formatMoney(contract.monthlySalary)} do ${club.name}.`,
          'CONTRACT',
        ),
        ...nextFeed,
      ];
    }

    if (nextWeek === 10 && contract.stage !== 'YOUTH') {
      nextMarket = generateWindowTransferOffers(nextPlayer, contract, state.agentId);
      nextFeed = [
        makeEvent(10, 'Janela Aberta', 'Novas propostas disponíveis em ESCRITÓRIO.', 'CONTRACT'),
        ...nextFeed,
      ];
    }

    if (nextWeek > SEASON_WEEKS) {
      nextWeek = 1;
      nextSeason += 1;
      nextPlayer = { ...nextPlayer, age: nextPlayer.age + 1 };
      nextTables = applySeasonPromotionRelegation(nextTables);

      if (contract.stage === 'YOUTH') {
        nextProposals = generateYouthTransitionProposals(nextPlayer, contract.clubId);
        nextFeed = [
          makeEvent(1, 'Decisão de Subida da Base', 'Veja as opções de Profissional ou Empréstimo em ESCRITÓRIO.', 'CONTRACT'),
          ...nextFeed,
        ];
      } else {
        nextMarket = generateWindowTransferOffers(nextPlayer, contract, state.agentId);
        nextFeed = [
          makeEvent(1, `Temporada ${nextSeason}`, 'Acessos, rebaixamentos e janela atualizados.', 'INFO'),
          ...nextFeed,
        ];
      }
    }
  }

  return {
    player: nextPlayer,
    calendar: { season: nextSeason, week: nextWeek, day: nextDay },
    trainedToday: false,
    recentLeveledKeys: nextLeveled,
    bankBalance: nextBalance,
    leagueTables: nextTables,
    transitionProposals: nextProposals,
    marketOffers: nextMarket,
    feed: nextFeed.slice(0, 25),
  };
}
