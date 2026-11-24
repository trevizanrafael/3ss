import { getClubById } from '../../data/clubs';
import { INITIAL_PERIOD_STATS } from '../../domains/awards/awardTypes';
import {
  createSeasonContractGoal,
  TransferMarketOffer,
} from '../../domains/contracts/contractEngine';
import {
  createInitialWorldSeason,
  findClubLeagueIdInWorld,
} from '../../domains/season/worldSeasonEngine';
import { YouthAcademyOffer } from '../../domains/tryout/generateYouthOffers';
import { YouthTransitionProposal } from '../../domains/youth-academy/youthModel';
import { formatMoney } from '../../shared/utils/formatters';
import { CareerState } from '../careerTypes';
import { makeEvent } from '../helpers/feedHelper';

export function buildSignYouthPatch(state: CareerState, offer: YouthAcademyOffer): Partial<CareerState> {
  if (!state.player) return {};
  const club = getClubById(offer.clubId);
  const goalBonus = Math.round(offer.monthlyAllowance * 0.22);
  return {
    hasActiveSave: true,
    calendar: { season: 2026, week: 1, day: 1 },
    bankBalance: 5000,
    agentId: 'agent_family',
    ownedEquipmentIds: [],
    trainedToday: false,
    contract: {
      clubId: offer.clubId,
      stage: 'PRO',
      role: offer.role,
      monthlySalary: offer.monthlyAllowance,
      seasonsRemaining: 3,
      goalBonusPerContribution: goalBonus,
      seasonGoal: createSeasonContractGoal(state.player, 'PRO', offer.monthlyAllowance),
    },
    youthState: null,
    transitionProposals: [],
    marketOffers: [],
    worldSeason: createInitialWorldSeason(2026),
    periodStats: { ...INITIAL_PERIOD_STATS },
    currentSeasonStints: [
      {
        clubId: offer.clubId,
        leagueId: club.leagueId,
        stage: 'PRO',
        matches: 0,
        goals: 0,
        assists: 0,
        threeStarMatches: 0,
      },
    ],
    careerSeasonLogs: [],
    userCompStats: {},
    trophyCabinet: [],
    awardPrestigeBoost: 0,
    latestGalaReport: null,
    galaModalOpen: false,
    lastMatchResult: null,
    feed: [
      makeEvent(
        1,
        `Contrato Profissional Assinado com ${club.name}!`,
        `Apresentado ao elenco principal como ${offer.role} com salário de ${formatMoney(offer.monthlyAllowance)}/mês.`,
        'CONTRACT',
      ),
    ],
  };
}

export function buildYouthTransitionPatch(
  state: CareerState,
  proposal: YouthTransitionProposal,
): Partial<CareerState> {
  if (!state.player) return {};
  const targetClub = getClubById(proposal.targetClubId);
  const stage: 'LOAN' | 'PRO' = proposal.type === 'LOAN_STARTER' ? 'LOAN' : 'PRO';
  const targetLg = findClubLeagueIdInWorld(state.worldSeason, proposal.targetClubId);
  const hasStint = state.currentSeasonStints.some(
    (s) => s.clubId === proposal.targetClubId && s.stage === stage,
  );
  const nextStints = hasStint
    ? state.currentSeasonStints
    : [
        ...state.currentSeasonStints.filter((s) => s.matches > 0),
        {
          clubId: proposal.targetClubId,
          leagueId: targetLg,
          stage,
          matches: 0,
          goals: 0,
          assists: 0,
          threeStarMatches: 0,
        },
      ];

  return {
    contract: {
      clubId: proposal.targetClubId,
      parentClubId: proposal.parentClubId,
      stage,
      role: proposal.offeredRole,
      monthlySalary: proposal.monthlySalary,
      seasonsRemaining: proposal.contractYears,
      goalBonusPerContribution: proposal.goalBonus,
      seasonGoal: createSeasonContractGoal(state.player, stage, proposal.monthlySalary),
    },
    currentSeasonStints: nextStints,
    youthState: null,
    transitionProposals: [],
    feed: [
      makeEvent(
        state.calendar.week,
        stage === 'LOAN'
          ? `Emprestado ao ${targetClub.name} como Titular!`
          : `Promovido ao Profissional do ${targetClub.name}!`,
        `Novo salário: ${formatMoney(proposal.monthlySalary)}/mês.`,
        'CONTRACT',
      ),
      ...state.feed,
    ],
  };
}

export function buildMarketSignPatch(
  state: CareerState,
  offer: TransferMarketOffer,
): Partial<CareerState> {
  if (!state.player) return {};
  const club = getClubById(offer.clubId);
  const nextStage: 'PRO' | 'LOAN' = offer.offerType === 'LOAN' ? 'LOAN' : 'PRO';
  const targetLg = findClubLeagueIdInWorld(state.worldSeason, offer.clubId);
  const hasStint = state.currentSeasonStints.some(
    (s) => s.clubId === offer.clubId && s.stage === nextStage,
  );
  const nextStints = hasStint
    ? state.currentSeasonStints
    : [
        ...state.currentSeasonStints.filter((s) => s.matches > 0),
        {
          clubId: offer.clubId,
          leagueId: targetLg,
          stage: nextStage,
          matches: 0,
          goals: 0,
          assists: 0,
          threeStarMatches: 0,
        },
      ];

  return {
    contract: {
      clubId: offer.clubId,
      parentClubId: offer.offerType === 'LOAN' ? state.contract?.clubId : undefined,
      stage: nextStage,
      role: offer.role,
      monthlySalary: offer.monthlySalary,
      seasonsRemaining: offer.years,
      goalBonusPerContribution: offer.goalBonus,
      seasonGoal: createSeasonContractGoal(state.player, nextStage, offer.monthlySalary),
    },
    currentSeasonStints: nextStints,
    marketOffers: [],
    feed: [
      makeEvent(
        state.calendar.week,
        offer.offerType === 'LOAN'
          ? `Emprestado ao ${club.name} por 1 temporada!`
          : `Contrato Assinado com ${club.name}!`,
        `Papel: ${offer.role} • Salário: ${formatMoney(offer.monthlySalary)}/mês.`,
        'CONTRACT',
      ),
      ...state.feed,
    ],
  };
}
