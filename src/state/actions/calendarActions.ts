import { getClubById } from '../../data/clubs';
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
  let nextSeasonGoals = state.seasonGoalsCount;
  let nextSeasonAssists = state.seasonAssistsCount;

  const club = getClubById(contract.clubId);
  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);

  // Se hoje é Quarta (Continentais) ou Sábado (Ligas) e o jogador NÃO tinha partida hoje (ou pulou),
  // o mundo inteiro joga suas rodadas simultaneamente!
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

  // Terça (2) e Quinta (4): 50% automático nos 5 slots caso não tenha treinado manualmente
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
          'Salário Mensal Depositado',
          `Recebido ${formatMoney(contract.monthlySalary)} do ${club.name}.`,
          'CONTRACT',
        ),
        ...nextFeed,
      ];
    }

    // Janela de Inverno / Meio de Temporada (Semana 20)
    if (nextWeek === 20 && contract.stage !== 'YOUTH') {
      nextMarket = generateWindowTransferOffers(nextPlayer, contract, state.agentId);
      nextFeed = [
        makeEvent(20, 'Janela de Meio de Temporada Aberta', 'Confira propostas em ESCRITÓRIO.', 'CONTRACT'),
        ...nextFeed,
      ];
    }

    // Fim das 38 rodadas (Semana 39): Pós-temporada e abertura da Janela Anual
    if (nextWeek === 39) {
      if (contract.stage === 'YOUTH') {
        nextProposals = generateYouthTransitionProposals(nextPlayer, contract.clubId);
        nextFeed = [
          makeEvent(39, 'Encerramento da Temporada de Base', 'Diretoria abriu propostas de Subida e Empréstimo!', 'CONTRACT'),
          ...nextFeed,
        ];
      } else {
        nextMarket = generateWindowTransferOffers(nextPlayer, contract, state.agentId);
        nextFeed = [
          makeEvent(39, 'Fim das Competições • Janela Anual Aberta', 'Veja campeões em TEMPORADA e propostas em ESCRITÓRIO.', 'CONTRACT'),
          ...nextFeed,
        ];
      }
    }

    // Virada Oficial de Ano (Semana > 40 -> Semana 1 do próximo ano com Acesso/Rebaixamento e vagas Continentais!)
    if (nextWeek > TOTAL_SEASON_WEEKS) {
      nextWeek = 1;
      nextSeason += 1;
      nextPlayer = { ...nextPlayer, age: nextPlayer.age + 1 };
      nextWorld = rolloverSeasonWithPromotionAndQualification(
        nextWorld,
        contract.clubId,
        nextSeasonGoals,
        nextSeasonAssists,
      );
      nextSeasonGoals = 0;
      nextSeasonAssists = 0;
      nextFeed = [
        makeEvent(
          1,
          `Nova Temporada ${nextSeason}! (${nextPlayer.age} anos)`,
          'Acessos, rebaixamentos e novos grupos da Champions e Libertadores sorteados!',
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
    seasonGoalsCount: nextSeasonGoals,
    seasonAssistsCount: nextSeasonAssists,
    transitionProposals: nextProposals,
    marketOffers: nextMarket,
    feed: nextFeed.slice(0, 25),
  };
}
