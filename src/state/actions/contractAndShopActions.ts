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
import {
  createInitialYouthState,
  YouthTransitionProposal,
} from '../../domains/youth-academy/youthModel';
import { formatMoney } from '../../shared/utils/formatters';
import { CareerState } from '../careerTypes';
import { makeEvent } from '../helpers/feedHelper';

export function buildSignYouthPatch(state: CareerState, offer: YouthAcademyOffer): Partial<CareerState> {
  if (!state.player) return {};
  const club = getClubById(offer.clubId);
  return {
    hasActiveSave: true,
    calendar: { season: 2026, week: 1, day: 1 },
    bankBalance: 1500,
    agentId: 'agent_family',
    ownedEquipmentIds: [],
    trainedToday: false,
    contract: {
      clubId: offer.clubId,
      stage: 'YOUTH',
      role: offer.role,
      monthlySalary: offer.monthlyAllowance,
      seasonsRemaining: 2,
      goalBonusPerContribution: 350,
      seasonGoal: createSeasonContractGoal(state.player, 'YOUTH', offer.monthlyAllowance),
    },
    youthState: createInitialYouthState(offer.role),
    transitionProposals: [],
    marketOffers: [],
    worldSeason: createInitialWorldSeason(2026),
    periodStats: { ...INITIAL_PERIOD_STATS },
    currentSeasonStints: [
      {
        clubId: offer.clubId,
        leagueId: club.leagueId,
        stage: 'YOUTH',
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
        `Bem-vindo à base do ${club.name}!`,
        `Vínculo assinado no ${offer.youthTeamName} com bolsa de ${formatMoney(offer.monthlyAllowance)}/mês.`,
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
  const targetLg = findClubLeagueIdInWorld(state.worldSeason, offer.clubId);
  const hasStint = state.currentSeasonStints.some(
    (s) => s.clubId === offer.clubId && s.stage === 'PRO',
  );
  const nextStints = hasStint
    ? state.currentSeasonStints
    : [
        ...state.currentSeasonStints.filter((s) => s.matches > 0),
        {
          clubId: offer.clubId,
          leagueId: targetLg,
          stage: 'PRO' as const,
          matches: 0,
          goals: 0,
          assists: 0,
          threeStarMatches: 0,
        },
      ];

  return {
    contract: {
      clubId: offer.clubId,
      stage: 'PRO',
      role: offer.role,
      monthlySalary: offer.monthlySalary,
      seasonsRemaining: offer.years,
      goalBonusPerContribution: offer.goalBonus,
      seasonGoal: createSeasonContractGoal(state.player, 'PRO', offer.monthlySalary),
    },
    currentSeasonStints: nextStints,
    marketOffers: [],
    feed: [
      makeEvent(
        state.calendar.week,
        `Contrato Assinado com ${club.name}!`,
        `Papel: ${offer.role} • Salário: ${formatMoney(offer.monthlySalary)}/mês.`,
        'CONTRACT',
      ),
      ...state.feed,
    ],
  };
}
