import { getClubById } from '../../data/clubs';
import { CareerStage, SquadRole, StarRating } from '../../shared/types/common';
import { clamp, randomInt } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';

export type TacticalMindset = 'AGRESSIVO_GOL' | 'EQUILIBRADO' | 'COLETIVO_SEGURO';

export interface MatchPerformanceResult {
  clubId: string;
  opponentId: string;
  clubGoals: number;
  opponentGoals: number;
  startedMatch: boolean;
  minuteEntered: number;
  minuteExited: number;
  minutesPlayed: number;
  subbedOffForStamina: boolean;
  playerGoals: number;
  playerAssists: number;
  keyActions: number; // Desarmes / Passes decisivos
  stars: StarRating;
  staminaSpent: number;
  matchNarrative: string[];
}

export function resolveMatchSimulation(
  player: CareerPlayer,
  clubId: string,
  opponentId: string,
  role: SquadRole,
  stage: CareerStage,
  mindset: TacticalMindset,
): MatchPerformanceResult {
  const club = getClubById(clubId);
  const opponent = getClubById(opponentId);
  const sector = getPositionSector(player.position);

  const isStarter =
    role === 'BASE_TITULAR' || role === 'TITULAR' || role === 'ESTRELA';
  const minuteEntered = isStarter ? 1 : randomInt(56, 70);
  const subbedOffForStamina = isStarter && player.stamina < 68;
  const minuteExited = subbedOffForStamina ? randomInt(66, 78) : 90;
  const minutesPlayed = Math.max(15, minuteExited - minuteEntered + (isStarter ? 1 : 0));

  // Comparar Overall do jogador com o nível médio da partida (Base é ~15 pontos abaixo do profissional!)
  const benchmarkOvr =
    stage === 'YOUTH' ? Math.max(54, opponent.squadAvgOvr - 17) : opponent.squadAvgOvr - 3;
  const skillEdge = (player.overall - benchmarkOvr) / 10;
  const playTimeFactor = minutesPlayed / 90;

  let playerGoals = 0;
  let playerAssists = 0;
  let keyActions = Math.max(1, Math.round((2 + skillEdge + Math.random() * 3) * playTimeFactor));

  const attackBoost = mindset === 'AGRESSIVO_GOL' ? 0.16 : mindset === 'COLETIVO_SEGURO' ? -0.05 : 0.05;
  const teamBoost = mindset === 'COLETIVO_SEGURO' ? 0.16 : 0.04;

  const goalChance =
    (sector === 'ATK' ? 0.42 : sector === 'MID' ? 0.22 : 0.07) +
    skillEdge * 0.09 +
    attackBoost;
  const assistChance =
    (sector === 'MID' ? 0.38 : sector === 'ATK' ? 0.22 : 0.14) +
    skillEdge * 0.08 +
    teamBoost;

  if (Math.random() < goalChance * playTimeFactor) playerGoals += 1;
  if (Math.random() < (goalChance - 0.22) * playTimeFactor) playerGoals += 1;
  if (Math.random() < assistChance * playTimeFactor) playerAssists += 1;

  if (sector === 'DEF') {
    keyActions += randomInt(2, 5);
  }

  const teamStrengthDiff = (club.squadAvgOvr - opponent.squadAvgOvr) / 8;
  const otherTeamGoals = Math.max(0, Math.round(randomInt(0, 2) + Math.max(0, teamStrengthDiff * 0.5)));
  const clubGoals = playerGoals + playerAssists + Math.max(0, otherTeamGoals - (playerAssists > 0 ? 1 : 0));
  const opponentGoals = Math.max(
    0,
    Math.round(randomInt(0, 2) + Math.max(0, -teamStrengthDiff * 0.5) - (sector === 'DEF' && keyActions >= 5 ? 1 : 0)),
  );

  // Cálculo da Nota de 0 a 3 Estrelas ("Three Stars Soccer")
  let scorePoints = 28 + skillEdge * 8 + keyActions * 5 + playerGoals * 28 + playerAssists * 20;
  if (clubGoals > opponentGoals) scorePoints += 10;
  if (sector === 'DEF' && opponentGoals === 0) scorePoints += 18;
  if (mindset === 'AGRESSIVO_GOL' && playerGoals === 0 && playerAssists === 0) scorePoints -= 8;

  const stars: StarRating =
    scorePoints >= 75 ? 3 : scorePoints >= 52 ? 2 : scorePoints >= 34 ? 1 : 0;

  const narrative: string[] = [];
  if (!isStarter) {
    narrative.push(`Você começou no banco e foi chamado pelo técnico aos ${minuteEntered}' do 2º tempo.`);
  } else {
    narrative.push(`Escalado entre os 11 iniciais (2 tempos de 2:30 min).`);
  }
  if (playerGoals > 0) narrative.push(`Bola na rede! Você marcou ${playerGoals} gol(s) decisivo(s).`);
  if (playerAssists > 0) narrative.push(`Visão de jogo afiada: ${playerAssists} assistência(s) na conta.`);
  if (sector === 'DEF' && opponentGoals === 0) narrative.push(`Parede defensiva: ajudou a segurar o placar zerado atrás (${keyActions} ações defensivas).`);
  if (subbedOffForStamina) narrative.push(`Substituído aos ${minuteExited}' por desgaste físico.`);

  const baseStaminaDrain = Math.round(minutesPlayed * (mindset === 'AGRESSIVO_GOL' ? 0.34 : 0.26));

  return {
    clubId,
    opponentId,
    clubGoals,
    opponentGoals,
    startedMatch: isStarter,
    minuteEntered,
    minuteExited,
    minutesPlayed,
    subbedOffForStamina,
    playerGoals,
    playerAssists,
    keyActions,
    stars,
    staminaSpent: clamp(baseStaminaDrain, 10, 40),
    matchNarrative: narrative,
  };
}
