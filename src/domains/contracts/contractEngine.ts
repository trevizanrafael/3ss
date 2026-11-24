import { AGENTS_CATALOG } from '../../data/agents/catalog';
import { ALL_CLUBS, getClubById } from '../../data/clubs';
import { LEAGUES } from '../../data/leagues/leagues';
import { CareerStage, SquadRole } from '../../shared/types/common';
import { shuffleArray } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';

export interface ContractGoal {
  label: string;
  target: number;
  current: number;
  rewardAmount: number;
  completed: boolean;
}

export interface ActiveContract {
  clubId: string;
  parentClubId?: string; // Preenchido se estiver emprestado
  stage: CareerStage;
  role: SquadRole;
  monthlySalary: number;
  seasonsRemaining: number;
  goalBonusPerContribution: number;
  seasonGoal: ContractGoal;
}

export interface TransferMarketOffer {
  id: string;
  clubId: string;
  offerType: 'TRANSFER' | 'LOAN' | 'RENEWAL';
  role: SquadRole;
  monthlySalary: number;
  years: number;
  goalBonus: number;
  headline: string;
}

export function createSeasonContractGoal(player: CareerPlayer, stage: CareerStage, salary: number): ContractGoal {
  const sector = getPositionSector(player.position);
  if (sector === 'ATK') {
    const target = stage === 'YOUTH' ? 6 : 10;
    return { label: `Marcar ${target} gols na temporada`, target, current: 0, rewardAmount: salary * 3, completed: false };
  }
  if (sector === 'MID') {
    const target = stage === 'YOUTH' ? 6 : 9;
    return { label: `Somar ${target} participações em gol (G+A)`, target, current: 0, rewardAmount: salary * 3, completed: false };
  }
  const target = stage === 'YOUTH' ? 5 : 8;
  return { label: `Alcançar ${target} jogos com 2+ Estrelas`, target, current: 0, rewardAmount: salary * 3, completed: false };
}

export function generateWindowTransferOffers(
  player: CareerPlayer,
  currentContract: ActiveContract,
  agentId: string,
): TransferMarketOffer[] {
  const agent = AGENTS_CATALOG.find((a) => a.id === agentId) ?? AGENTS_CATALOG[0];
  const currentClub = getClubById(currentContract.clubId);
  const salaryMultiplier = 1 + agent.salaryBonusPct / 100;

  const minTargetOvr = Math.max(66, player.overall - 4);
  const maxTargetOvr = player.overall + 8 + agent.stars * 3;

  const eligibleClubs = shuffleArray(
    ALL_CLUBS.filter((c) => {
      if (c.id === currentContract.clubId) return false;
      if (c.leagueId === 'CONMEBOL_POOL' || c.leagueId === 'UEFA_POOL') return false;
      if (!agent.unlocksForeignOffers && c.country !== currentClub.country) return false;
      return c.squadAvgOvr >= minTargetOvr && c.squadAvgOvr <= maxTargetOvr;
    }),
  ).slice(0, 3);

  const offers: TransferMarketOffer[] = eligibleClubs.map((club) => {
    const gap = club.squadAvgOvr - player.overall;
    const role: SquadRole =
      gap <= -2 ? 'ESTRELA' : gap <= 3 ? 'TITULAR' : gap <= 8 ? 'RESERVA' : 'PROMESSA';
    const isEuro = LEAGUES[club.leagueId].continentalPrimary === 'CHAMPIONS_LEAGUE';
    const rawSalary = Math.max(8500, (player.overall - 50) * (isEuro ? 2800 : 1400));
    const monthlySalary = Math.round(rawSalary * salaryMultiplier);

    return {
      id: `mkt_${club.id}_${Math.random().toString(36).slice(2, 6)}`,
      clubId: club.id,
      offerType: 'TRANSFER',
      role,
      monthlySalary,
      years: 3,
      goalBonus: Math.round(monthlySalary * 0.25),
      headline: `${club.name} (${LEAGUES[club.leagueId].name}) fez proposta oficial!`,
    };
  });

  // Opção de renovação com o clube atual se estiver no Profissional
  if (currentContract.stage === 'PRO') {
    const newSal = Math.round(currentContract.monthlySalary * 1.18 * salaryMultiplier);
    offers.unshift({
      id: `renew_${currentClub.id}`,
      clubId: currentClub.id,
      offerType: 'RENEWAL',
      role: player.overall >= currentClub.squadAvgOvr ? 'TITULAR' : currentContract.role,
      monthlySalary: newSal,
      years: 2,
      goalBonus: Math.round(newSal * 0.25),
      headline: `Renovação contratual proposta pelo ${currentClub.name}`,
    });
  }

  return offers;
}
