import { getClubById } from '../../data/clubs';
import { INITIAL_PERIOD_STATS } from '../../domains/awards/awardTypes';
import {
  createSeasonContractGoal,
  generateWindowTransferOffers,
  TransferMarketOffer,
} from '../../domains/contracts/contractEngine';
import { isTransferWindowOpen } from '../../domains/contracts/transferWindowAndValue';
import {
  createInitialWorldSeason,
  findClubLeagueIdInWorld,
} from '../../domains/season/worldSeasonEngine';
import { YouthAcademyOffer } from '../../domains/tryout/generateYouthOffers';
import { YouthTransitionProposal } from '../../domains/youth-academy/youthModel';
import { formatCompactMoney, formatMoney } from '../../shared/utils/formatters';
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
      seasonGoal: createSeasonContractGoal(state.player, 'PRO', offer.monthlyAllowance, offer.role),
      transferStatus: 'UNLISTED',
      lastManagerNoticeWeek: 0,
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
      seasonGoal: createSeasonContractGoal(
        state.player,
        stage,
        proposal.monthlySalary,
        proposal.offeredRole,
      ),
      transferStatus: 'UNLISTED',
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
  if (!state.player || !state.contract) return {};

  // Regra estrita: transferências e empréstimos SÓ podem ser concluídos com a Janela Aberta!
  if (
    (offer.offerType === 'TRANSFER' || offer.offerType === 'LOAN') &&
    !isTransferWindowOpen(state.calendar.week)
  ) {
    return {
      feed: [
        makeEvent(
          state.calendar.week,
          'Janela de Transferências Fechada',
          'Transferências e empréstimos só podem ser assinados durante os períodos de janela aberta.',
          'CONTRACT',
        ),
        ...state.feed,
      ],
    };
  }

  const club = getClubById(offer.clubId);
  const signingBonus = offer.signingBonus ?? 0;

  // 1. RENOVAÇÃO DE VÍNCULO COM O CLUBE ATUAL
  if (offer.offerType === 'RENEWAL') {
    const prevGoal = state.contract.seasonGoal;
    return {
      bankBalance: state.bankBalance + signingBonus,
      contract: {
        ...state.contract,
        role: offer.role,
        monthlySalary: offer.monthlySalary,
        seasonsRemaining: offer.years,
        goalBonusPerContribution: offer.goalBonus,
        transferStatus: 'UNLISTED',
        seasonGoal: {
          ...prevGoal,
          rewardAmount: Math.max(prevGoal.rewardAmount, offer.monthlySalary * 3),
        },
      },
      marketOffers: state.marketOffers.filter((o) => o.id !== offer.id),
      feed: [
        {
          ...makeEvent(
            state.calendar.week,
            `Contrato Renovado com o ${club.name}!`,
            `Novo salário: ${formatMoney(offer.monthlySalary)}/mês por ${offer.years} anos${
              signingBonus > 0 ? ` • Luvas de ${formatMoney(signingBonus)} creditadas!` : '.'
            }`,
            'CONTRACT',
          ),
          clubId: club.id,
        },
        ...state.feed,
      ],
    };
  }

  // 2. TRANSFERÊNCIA DEFINITIVA OU EMPRÉSTIMO DE 1 TEMPORADA NA JANELA ABERTA
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

  const parentOriginId =
    offer.offerType === 'LOAN'
      ? state.contract.parentClubId ?? state.contract.clubId
      : undefined;

  const feeText =
    offer.offerType === 'TRANSFER' && offer.transferFee
      ? `Taxa paga ao ex-clube: ${formatCompactMoney(offer.transferFee)} • `
      : '';

  return {
    bankBalance: state.bankBalance + signingBonus,
    contract: {
      clubId: offer.clubId,
      parentClubId: parentOriginId,
      stage: nextStage,
      role: offer.role,
      monthlySalary: offer.monthlySalary,
      seasonsRemaining: offer.years,
      goalBonusPerContribution: offer.goalBonus,
      seasonGoal: createSeasonContractGoal(state.player, nextStage, offer.monthlySalary, offer.role),
      transferStatus: 'UNLISTED',
      lastManagerNoticeWeek: state.calendar.week,
    },
    currentSeasonStints: nextStints,
    marketOffers: [],
    feed: [
      {
        ...makeEvent(
          state.calendar.week,
          offer.offerType === 'LOAN'
            ? `Emprestado ao ${club.name} por 1 temporada!`
            : `Transferência Oficial: Novo Reforço do ${club.name}!`,
          `${feeText}Salário: ${formatMoney(offer.monthlySalary)}/mês${
            signingBonus > 0 ? ` • Luvas: ${formatMoney(signingBonus)}` : ''
          }.`,
          'CONTRACT',
        ),
        clubId: club.id,
      },
      ...state.feed,
    ],
  };
}

/**
 * Ações estilo FIFA 18: Pedir Transferência ou Pedir Empréstimo ao Treinador do Clube!
 */
export function buildManagerTransferRequestPatch(
  state: CareerState,
  kind: 'TRANSFER' | 'LOAN',
): { patch: Partial<CareerState>; ok: boolean; message: string } {
  const { player, contract, calendar, worldSeason, agentId, awardPrestigeBoost, feed } = state;
  if (!player || !contract) {
    return { patch: {}, ok: false, message: 'Sem contrato ativo.' };
  }

  const club = getClubById(contract.clubId);

  if (contract.stage === 'LOAN') {
    return {
      patch: {},
      ok: false,
      message: 'Você já está atuando por empréstimo nesta temporada.',
    };
  }

  // No FIFA 18, se você é Estrela absoluta do time (OVR bem acima do elenco) e pede empréstimo, o técnico nega!
  if (kind === 'LOAN' && (contract.role === 'ESTRELA' || player.overall >= club.squadAvgOvr + 4)) {
    const msg = `Treinador do ${club.shortName} negou: você é peça importante demais para sair por empréstimo.`;
    return {
      ok: false,
      message: msg,
      patch: {
        feed: [
          {
            ...makeEvent(
              calendar.week,
              `📩 Treinador do ${club.shortName}: Pedido de Empréstimo Negado`,
              'Você é peça fundamental do elenco principal; não vamos liberá-lo por empréstimo.',
              'CONTRACT',
            ),
            clubId: club.id,
          },
          ...feed,
        ],
      },
    };
  }

  const nextStatus = kind === 'LOAN' ? 'LOAN_LISTED' : 'TRANSFER_LISTED';
  const nextContract = {
    ...contract,
    transferStatus: nextStatus as 'LOAN_LISTED' | 'TRANSFER_LISTED',
  };

  const windowOpen = isTransferWindowOpen(calendar.week);
  const clubLg = findClubLeagueIdInWorld(worldSeason, contract.clubId);
  const generatedNow = windowOpen
    ? generateWindowTransferOffers(
        player,
        nextContract,
        agentId,
        awardPrestigeBoost,
        calendar.week,
        clubLg,
      )
    : state.marketOffers;

  const statusText = kind === 'LOAN' ? 'Lista de Empréstimos' : 'Lista de Transferências';
  const replyDetail = windowOpen
    ? `Você foi incluído na ${statusText} e já há ${generatedNow.length} proposta(s) na janela aberta!`
    : `Você foi incluído na ${statusText}. As propostas chegarão assim que a Janela de Transferências abrir!`;

  return {
    ok: true,
    message: windowOpen
      ? `Incluído na ${statusText}! Propostas disponíveis na janela aberta.`
      : `Incluído na ${statusText}! Aguarde a abertura da janela (barra azul no calendário).`,
    patch: {
      contract: nextContract,
      marketOffers: generatedNow,
      feed: [
        {
          ...makeEvent(
            calendar.week,
            `📩 Treinador do ${club.shortName}: ${statusText} Aprovada`,
            replyDetail,
            'CONTRACT',
          ),
          clubId: club.id,
        },
        ...feed,
      ],
    },
  };
}

export function buildWithdrawTransferRequestPatch(state: CareerState): {
  patch: Partial<CareerState>;
  ok: boolean;
  message: string;
} {
  if (!state.contract) return { patch: {}, ok: false, message: 'Sem contrato ativo.' };
  const club = getClubById(state.contract.clubId);
  return {
    ok: true,
    message: 'Seu nome foi retirado da lista de transferências/empréstimos.',
    patch: {
      contract: {
        ...state.contract,
        transferStatus: 'UNLISTED',
      },
      marketOffers: state.marketOffers.filter((o) => o.offerType === 'RENEWAL'),
      feed: [
        {
          ...makeEvent(
            state.calendar.week,
            `📩 Treinador do ${club.shortName}: Permanência Confirmada`,
            'Ficamos felizes que você decidiu focar no clube e retirar seu pedido de saída.',
            'CONTRACT',
          ),
          clubId: club.id,
        },
        ...state.feed,
      ],
    },
  };
}
