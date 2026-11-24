import { getClubById } from '../../data/clubs';
import { applySeasonPromotionRelegation } from '../../domains/competition/leagueSimulator';
import { generateWindowTransferOffers } from '../../domains/contracts/contractEngine';
import { getOwnedEquipmentBonuses } from '../../domains/economy/economyActions';
import { applyTrainingProgress } from '../../domains/training/trainingEngine';
import { generateYouthTransitionProposals } from '../../domains/youth-academy/youthModel';
import { formatMoney } from '../../shared/utils/formatters';
import { clamp } from '../../shared/utils/math';
import { CareerState } from '../careerTypes';
import { makeEvent } from '../helpers/feedHelper';

const SEASON_WEEKS = 20;

export function computeNextDayState(state: CareerState): Partial<CareerState> {
  const { player, contract, calendar, focusedAttributes, ownedEquipmentIds, trainedToday } = state;
  if (!player || !contract) return {};

  let nextPlayer = { ...player };
  let nextFeed = [...state.feed];
  let nextBalance = state.bankBalance;
  let nextTables = state.leagueTables;
  let nextProposals = state.transitionProposals;
  let nextMarket = state.marketOffers;

  const club = getClubById(contract.clubId);
  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);

  // Terça (2) e Quinta (4): aplica 50% AUTOMÁTICO caso o jogador não tenha treinado manualmente
  const isTrainingDay = calendar.day === 2 || calendar.day === 4;
  if (isTrainingDay && !trainedToday) {
    const { updatedPlayer, report } = applyTrainingProgress(
      nextPlayer,
      focusedAttributes,
      'PASSIVE_50',
      club.youthQuality,
      bonuses.trainingXpBonusPct,
    );
    nextPlayer = updatedPlayer;
    if (report.leveledUpAttributes.length > 0) {
      nextFeed = [
        makeEvent(
          calendar.week,
          'Evolução no Treino Automático (50%)',
          'Seu trabalho semanal com o elenco rendeu +1 ponto de atributo!',
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
          'Salário Depositado na Conta',
          `Recebido ${formatMoney(contract.monthlySalary)} do ${club.name}.`,
          'CONTRACT',
        ),
        ...nextFeed,
      ];
    }

    if (nextWeek === 10 && contract.stage !== 'YOUTH') {
      nextMarket = generateWindowTransferOffers(nextPlayer, contract, state.agentId);
      nextFeed = [
        makeEvent(10, 'Janela de Transferências Aberta!', 'Novas sondagens chegaram na aba Contratos.', 'CONTRACT'),
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
          makeEvent(
            1,
            'Fim de Temporada na Base — Reunião com a Diretoria!',
            'Confira propostas de Promoção ao Profissional ou Empréstimo na aba Contratos.',
            'CONTRACT',
          ),
          ...nextFeed,
        ];
      } else {
        nextMarket = generateWindowTransferOffers(nextPlayer, contract, state.agentId);
        nextFeed = [
          makeEvent(
            1,
            `Nova Temporada ${nextSeason}! (${nextPlayer.age} anos)`,
            'Tabelas atualizadas com acessos/rebaixamentos e novas propostas disponíveis.',
            'INFO',
          ),
          ...nextFeed,
        ];
      }
    }
  }

  return {
    player: nextPlayer,
    calendar: { season: nextSeason, week: nextWeek, day: nextDay },
    trainedToday: false,
    bankBalance: nextBalance,
    leagueTables: nextTables,
    transitionProposals: nextProposals,
    marketOffers: nextMarket,
    feed: nextFeed.slice(0, 25),
  };
}
