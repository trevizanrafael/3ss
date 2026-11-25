import { AGENTS_CATALOG } from '../../data/agents/catalog';
import { ALL_CLUBS, getClubById } from '../../data/clubs';
import { LeagueId, LEAGUES } from '../../data/leagues/leagues';
import { CareerStage, SquadRole } from '../../shared/types/common';
import { shuffleArray } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';
import {
  computePlayerMarketValue,
  evaluateManagerMetaStanding,
  TransferListStatus,
} from './transferWindowAndValue';

export interface ContractGoal {
  label: string;
  target: number;
  current: number;
  rewardAmount: number;
  completed: boolean;
}

export interface ActiveContract {
  clubId: string;
  parentClubId?: string; // Preenchido quando o atleta está emprestado por 1 temporada
  stage: CareerStage;
  role: SquadRole;
  monthlySalary: number;
  seasonsRemaining: number;
  goalBonusPerContribution: number;
  seasonGoal: ContractGoal;
  transferStatus?: TransferListStatus;
  lastManagerNoticeWeek?: number;
}

export interface TransferMarketOffer {
  id: string;
  clubId: string;
  offerType: 'TRANSFER' | 'LOAN' | 'RENEWAL';
  role: SquadRole;
  monthlySalary: number;
  years: number;
  goalBonus: number;
  transferFee?: number; // Valor de compra pago ao clube atual (baseado no Valor de Mercado)
  signingBonus?: number; // Luvas pagas direto na conta do jogador ao assinar
  reasonTag?: string; // Ex: "DESTAQUE ACIMA DA META", "LISTA DE EMPRÉSTIMOS", "PEDIDO DE TRANSFERÊNCIA"
  headline: string;
}

export function createSeasonContractGoal(
  player: CareerPlayer,
  stage: CareerStage,
  salary: number,
  role: SquadRole = 'TITULAR',
): ContractGoal {
  const sector = getPositionSector(player.position);
  const roleScale =
    role === 'ESTRELA'
      ? 1.25
      : role === 'TITULAR'
        ? 1.0
        : role === 'RESERVA'
          ? 0.72
          : 0.6;

  if (sector === 'ATK') {
    const rawTarget = stage === 'YOUTH' ? 6 : Math.round((10 + Math.max(0, player.overall - 68) * 0.45) * roleScale);
    const target = Math.max(5, rawTarget);
    return {
      label: `Marcar ${target} gols na temporada`,
      target,
      current: 0,
      rewardAmount: salary * 3,
      completed: false,
    };
  }
  if (sector === 'MID') {
    const rawTarget = stage === 'YOUTH' ? 6 : Math.round((9 + Math.max(0, player.overall - 68) * 0.4) * roleScale);
    const target = Math.max(5, rawTarget);
    return {
      label: `Somar ${target} participações em gol (G+A)`,
      target,
      current: 0,
      rewardAmount: salary * 3,
      completed: false,
    };
  }
  const target = Math.max(4, Math.round((stage === 'YOUTH' ? 5 : 9) * roleScale));
  return {
    label: `Alcançar ${target} jogos com 2+ Estrelas`,
    target,
    current: 0,
    rewardAmount: salary * 3,
    completed: false,
  };
}

export function computeFairMonthlySalary(
  player: CareerPlayer,
  targetLeagueId: LeagueId,
  agentBonusPct: number,
  awardPrestigeBoost: number,
  exceedingMeta = false,
): number {
  const isEuroTop = LEAGUES[targetLeagueId]?.continentalPrimary === 'CHAMPIONS_LEAGUE';
  const div2Factor = LEAGUES[targetLeagueId]?.division === 2 ? 0.68 : 1.0;
  const ovrBase = Math.max(6500, Math.pow(Math.max(1, player.overall - 48), 1.68) * (isEuroTop ? 460 : 250));
  const agentMult = 1 + agentBonusPct / 100 + Math.min(0.32, awardPrestigeBoost * 0.03);
  const formMult = exceedingMeta ? 1.18 : 1.0;
  return Math.round((ovrBase * div2Factor * agentMult * formMult) / 500) * 500;
}

/**
 * Gera propostas realistas APENAS quando a Janela de Transferências está ABERTA,
 * guiadas pelo sistema de Metas, Valor de Mercado e Lista de Transferência/Empréstimo do FIFA 18!
 */
export function generateWindowTransferOffers(
  player: CareerPlayer,
  currentContract: ActiveContract,
  agentId: string,
  awardPrestigeBoost = 0,
  currentWeek = 20,
  clubLeagueId?: LeagueId,
): TransferMarketOffer[] {
  const agent = AGENTS_CATALOG.find((a) => a.id === agentId) ?? AGENTS_CATALOG[0];
  const currentClub = getClubById(currentContract.clubId);
  const activeLg = clubLeagueId ?? currentClub.leagueId;
  const standing = evaluateManagerMetaStanding(currentContract, currentWeek);
  const marketValue = computePlayerMarketValue(
    player,
    activeLg,
    currentContract.seasonGoal,
    currentWeek,
    awardPrestigeBoost,
  );

  const status: TransferListStatus = currentContract.transferStatus ?? 'UNLISTED';
  const exceeding = standing.tier === 'EXCEEDING';
  const belowMeta = standing.tier === 'BELOW_META';
  const unlockedAbroad =
    agent.unlocksForeignOffers || awardPrestigeBoost >= 3 || player.overall >= 74 || exceeding;

  const offers: TransferMarketOffer[] = [];

  // 1. RENOVAÇÃO DE CONTRATO: se você está bem na meta (ou no último ano de vínculo) e não está emprestado nem pediu p/ sair
  if (
    currentContract.stage === 'PRO' &&
    status === 'UNLISTED' &&
    !belowMeta &&
    (exceeding || currentContract.seasonsRemaining <= 1 || currentWeek >= 39)
  ) {
    const fairSal = computeFairMonthlySalary(
      player,
      activeLg,
      agent.salaryBonusPct,
      awardPrestigeBoost,
      exceeding,
    );
    const newSal = Math.max(Math.round(currentContract.monthlySalary * 1.18), fairSal);
    const signBonus = Math.round(newSal * (exceeding ? 2.5 : 1.5));
    offers.push({
      id: `renew_${currentClub.id}_${currentWeek}`,
      clubId: currentClub.id,
      offerType: 'RENEWAL',
      role:
        exceeding && player.overall >= currentClub.squadAvgOvr + 1
          ? 'ESTRELA'
          : player.overall >= currentClub.squadAvgOvr - 1
            ? 'TITULAR'
            : currentContract.role,
      monthlySalary: newSal,
      years: 3,
      goalBonus: Math.round(newSal * 0.25),
      signingBonus: signBonus,
      reasonTag: exceeding ? 'VALORIZAÇÃO POR META BATIDA' : 'RENOVAÇÃO DE VÍNCULO',
      headline: `${currentClub.name} propõe renovação salarial!`,
    });
  }

  // 2. CASO LISTA DE EMPRÉSTIMO (ou Muito Abaixo da Meta): clubes menores/médios buscam você por EMPRÉSTIMO como TITULAR!
  if (
    currentContract.stage === 'PRO' &&
    (status === 'LOAN_LISTED' || belowMeta)
  ) {
    const loanClubs = shuffleArray(
      ALL_CLUBS.filter((c) => {
        if (c.id === currentContract.clubId) return false;
        if (c.leagueId === 'CONMEBOL_POOL' || c.leagueId === 'UEFA_POOL') return false;
        if (!unlockedAbroad && c.country !== currentClub.country) return false;
        return c.squadAvgOvr <= player.overall + 2 && c.squadAvgOvr >= player.overall - 8;
      }),
    ).slice(0, 3);

    for (const lc of loanClubs) {
      offers.push({
        id: `loan_${lc.id}_${Math.random().toString(36).slice(2, 6)}`,
        clubId: lc.id,
        offerType: 'LOAN',
        role: 'TITULAR',
        monthlySalary: currentContract.monthlySalary,
        years: 1,
        goalBonus: currentContract.goalBonusPerContribution,
        transferFee: 0,
        signingBonus: Math.round(currentContract.monthlySalary * 0.5),
        reasonTag:
          status === 'LOAN_LISTED' && belowMeta
            ? 'DISPONIBILIZADO PELO TREINADOR (ABAIXO DA META)'
            : 'LISTA DE EMPRÉSTIMOS • MINUTAGEM DE TITULAR',
        headline: `Empréstimo de 1 temporada como Titular no ${lc.name}`,
      });
    }
  }

  // 3. PROPOSTAS DE COMPRA DEFINITIVA (TRANSFER):
  // Chegam se você está ACIMA DA META, se pediu TRANSFERÊNCIA (TRANSFER_LISTED), ou se já tem prestígio/contrato no fim!
  const shouldReceiveTransferBids =
    exceeding ||
    status === 'TRANSFER_LISTED' ||
    (status === 'UNLISTED' && !belowMeta && (currentContract.seasonsRemaining <= 1 || awardPrestigeBoost >= 3));

  if (shouldReceiveTransferBids) {
    const minOvr = exceeding
      ? Math.max(64, Math.max(currentClub.squadAvgOvr - 1, player.overall - 2))
      : Math.max(60, player.overall - 5);
    const maxOvr = exceeding
      ? player.overall + 8 + agent.stars * 2 + Math.min(4, awardPrestigeBoost)
      : player.overall + 4 + agent.stars * 2;

    const transferCount = exceeding ? 3 : 2;
    const buyingClubs = shuffleArray(
      ALL_CLUBS.filter((c) => {
        if (c.id === currentContract.clubId || c.id === currentContract.parentClubId) return false;
        if (c.leagueId === 'CONMEBOL_POOL' || c.leagueId === 'UEFA_POOL') return false;
        if (!unlockedAbroad && c.country !== currentClub.country) return false;
        return c.squadAvgOvr >= minOvr && c.squadAvgOvr <= maxOvr;
      }),
    ).slice(0, transferCount);

    for (const club of buyingClubs) {
      const gap = club.squadAvgOvr - player.overall;
      const role: SquadRole =
        gap <= -2 ? 'ESTRELA' : gap <= 3 ? 'TITULAR' : gap <= 7 ? 'RESERVA' : 'PROMESSA';
      const feeFactor = exceeding
        ? 1.08 + Math.random() * 0.24
        : status === 'TRANSFER_LISTED'
          ? 0.88 + Math.random() * 0.16
          : 0.96 + Math.random() * 0.16;
      const transferFee = Math.round((marketValue * feeFactor) / 50_000) * 50_000;
      const monthlySalary = computeFairMonthlySalary(
        player,
        club.leagueId,
        agent.salaryBonusPct,
        awardPrestigeBoost,
        exceeding,
      );
      const signingBonus = Math.round(monthlySalary * (exceeding ? 3.0 : 1.8));
      const years = player.age >= 30 ? 2 : 3;

      offers.push({
        id: `mkt_${club.id}_${Math.random().toString(36).slice(2, 6)}`,
        clubId: club.id,
        offerType: 'TRANSFER',
        role,
        monthlySalary,
        years,
        goalBonus: Math.round(monthlySalary * 0.25),
        transferFee,
        signingBonus,
        reasonTag: exceeding
          ? 'INTERESSE POR DESEMPENHO ACIMA DA META'
          : status === 'TRANSFER_LISTED'
            ? 'PROPOSTA PELA LISTA DE TRANSFERÊNCIAS'
            : 'SONDAGEM DE JANELA ABERTA',
        headline: `${club.name} (${LEAGUES[club.leagueId].name}) ofereceu compra oficial!`,
      });
    }
  }

  return offers;
}
