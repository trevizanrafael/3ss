import { ALL_CLUBS, getClubById } from '../../data/clubs';
import { LEAGUES } from '../../data/leagues/leagues';
import { SquadRole, StarRating } from '../../shared/types/common';
import { clamp, shuffleArray } from '../../shared/utils/math';
import { CareerPlayer } from '../player/playerTypes';

export interface YouthAcademyState {
  coachTrust: number;          // 0..100 (aos 55 vira Titular da Base)
  seniorScoutProgress: number; // 0..100 (aos 100 o Diretor chama pro Profissional!)
  youthMatches: number;
  youthGoals: number;
  youthAssists: number;
  starSum: number;
  transitionReady: boolean;
}

export interface YouthTransitionProposal {
  id: string;
  type: 'PROMOTE_SENIOR' | 'LOAN_STARTER' | 'SIGN_LOWER_CLUB';
  targetClubId: string;
  parentClubId?: string;
  offeredRole: SquadRole;
  monthlySalary: number;
  contractYears: number;
  goalBonus: number;
  summary: string;
}

export function createInitialYouthState(initialRole: SquadRole): YouthAcademyState {
  return {
    coachTrust: initialRole === 'BASE_TITULAR' ? 62 : 35,
    seniorScoutProgress: 12,
    youthMatches: 0,
    youthGoals: 0,
    youthAssists: 0,
    starSum: 0,
    transitionReady: false,
  };
}

export function updateYouthAfterMatch(
  youth: YouthAcademyState,
  player: CareerPlayer,
  clubId: string,
  matchStars: StarRating,
  goals: number,
  assists: number,
): { updatedYouth: YouthAcademyState; newRole?: SquadRole; eventNote?: string } {
  const club = getClubById(clubId);
  const trustDelta = matchStars === 3 ? 16 : matchStars === 2 ? 9 : matchStars === 1 ? 2 : -7;
  const ovrGap = club.squadAvgOvr - player.overall;
  const baseScoutGain = matchStars === 3 ? 22 : matchStars === 2 ? 13 : matchStars === 1 ? 5 : 0;
  const difficultyFactor = ovrGap > 18 ? 0.7 : ovrGap < 10 ? 1.3 : 1.0;

  const coachTrust = clamp(youth.coachTrust + trustDelta, 5, 100);
  const seniorScoutProgress = clamp(
    Math.round(youth.seniorScoutProgress + baseScoutGain * difficultyFactor),
    0,
    100,
  );

  const updatedYouth: YouthAcademyState = {
    coachTrust,
    seniorScoutProgress,
    youthMatches: youth.youthMatches + 1,
    youthGoals: youth.youthGoals + goals,
    youthAssists: youth.youthAssists + assists,
    starSum: youth.starSum + matchStars,
    transitionReady: seniorScoutProgress >= 100 || player.age >= 19,
  };

  let newRole: SquadRole | undefined;
  let eventNote: string | undefined;

  if (coachTrust >= 55 && youth.coachTrust < 55) {
    newRole = 'BASE_TITULAR';
    eventNote = 'Você conquistou a confiança do técnico e virou TITULAR da Base!';
  }
  if (updatedYouth.transitionReady && !youth.transitionReady) {
    eventNote = 'O Diretor do Profissional quer definir sua subida para o elenco de cima!';
  }

  return { updatedYouth, newRole, eventNote };
}

export function generateYouthTransitionProposals(
  player: CareerPlayer,
  currentClubId: string,
): YouthTransitionProposal[] {
  const club = getClubById(currentClubId);
  const proposals: YouthTransitionProposal[] = [];

  const ovrDiff = club.squadAvgOvr - player.overall;
  const seniorRole: SquadRole =
    ovrDiff <= 5 ? 'TITULAR' : ovrDiff <= 12 ? 'RESERVA' : 'PROMESSA';
  const baseSalary = Math.round((club.squadAvgOvr - 52) * 950);

  proposals.push({
    id: `prom_${club.id}`,
    type: 'PROMOTE_SENIOR',
    targetClubId: club.id,
    offeredRole: seniorRole,
    monthlySalary: Math.max(9000, baseSalary),
    contractYears: 3,
    goalBonus: Math.round(baseSalary * 0.35),
    summary:
      seniorRole === 'PROMESSA'
        ? `Subir ao profissional do ${club.name} entrando aos poucos no 2º tempo.`
        : `Integrar o elenco principal do ${club.name} já brigando por espaço real!`,
  });

  // Buscar clubes menores (preferência 2ª divisão do mesmo país) para Empréstimo como Titular!
  const loanCandidates = shuffleArray(
    ALL_CLUBS.filter(
      (c) =>
        c.id !== club.id &&
        (c.country === club.country || LEAGUES[c.leagueId].division === 2) &&
        c.squadAvgOvr <= Math.max(73, player.overall + 11),
    ),
  ).slice(0, 2);

  for (const target of loanCandidates) {
    proposals.push({
      id: `loan_${target.id}`,
      type: 'LOAN_STARTER',
      targetClubId: target.id,
      parentClubId: club.id,
      offeredRole: 'TITULAR',
      monthlySalary: Math.max(7500, Math.round(baseSalary * 0.85)),
      contractYears: 1,
      goalBonus: 3500,
      summary: `Renovar com o ${club.name} e sair emprestado por 1 ano ao ${target.name} para jogar como TITULAR!`,
    });
  }

  return proposals;
}
