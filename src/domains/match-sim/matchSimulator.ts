import { getClubById } from '../../data/clubs';
import { AnyCompetitionId } from '../../data/world/competitionThemes';
import { CareerStage, SquadRole, StarRating } from '../../shared/types/common';
import { clamp, randomInt } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';
import { simulateRealisticScoreline } from '../season/poissonMatchMath';

export type TacticalMindset = 'AGRESSIVO_GOL' | 'EQUILIBRADO' | 'COLETIVO_SEGURO';

export interface MatchPerformanceResult {
  competitionId: AnyCompetitionId;
  stageLabel: string;
  clubId: string;
  opponentId: string;
  isHome: boolean;
  clubGoals: number;
  opponentGoals: number;
  startedMatch: boolean;
  minuteEntered: number;
  minuteExited: number;
  minutesPlayed: number;
  subbedOffForStamina: boolean;
  playerGoals: number;
  playerAssists: number;
  keyActions: number;
  stars: StarRating;
  staminaSpent: number;
  matchNarrative: string[];
}

export function resolveMatchSimulation(
  player: CareerPlayer,
  clubId: string,
  opponentId: string,
  isHome: boolean,
  competitionId: AnyCompetitionId,
  stageLabel: string,
  role: SquadRole,
  stage: CareerStage,
  mindset: TacticalMindset,
): MatchPerformanceResult {
  const opponent = getClubById(opponentId);
  const sector = getPositionSector(player.position);

  const isStarter =
    role === 'BASE_TITULAR' || role === 'TITULAR' || role === 'ESTRELA';
  const minuteEntered = isStarter ? 1 : randomInt(56, 72);
  const subbedOffForStamina = isStarter && player.stamina < 68;
  const minuteExited = subbedOffForStamina ? randomInt(66, 79) : 90;
  const minutesPlayed = Math.max(15, minuteExited - minuteEntered + (isStarter ? 1 : 0));

  // Placar base gerado pelo modelo Poisson realista (zero 13x0!)
  const rawScore = isHome
    ? simulateRealisticScoreline(clubId, opponentId, stageLabel.includes('FINAL') && !stageLabel.includes('SEMI'))
    : simulateRealisticScoreline(opponentId, clubId, stageLabel.includes('FINAL') && !stageLabel.includes('SEMI'));

  let clubGoals = isHome ? rawScore.homeGoals : rawScore.awayGoals;
  const opponentGoals = isHome ? rawScore.awayGoals : rawScore.homeGoals;

  const benchmarkOvr =
    stage === 'YOUTH' ? Math.max(54, opponent.squadAvgOvr - 16) : opponent.squadAvgOvr - 2;
  const skillEdge = (player.overall - benchmarkOvr) / 10;
  const playTimeFactor = minutesPlayed / 90;

  let playerGoals = 0;
  let playerAssists = 0;
  let keyActions = Math.max(1, Math.round((2 + skillEdge + Math.random() * 3) * playTimeFactor));

  // Distribuir participação realista nos gols do seu time (ou criar 1 gol decisivo extra se destruiu)
  const goalShareProb = clamp(
    (sector === 'ATK' ? 0.44 : sector === 'MID' ? 0.22 : 0.07) +
      skillEdge * 0.08 +
      (mindset === 'AGRESSIVO_GOL' ? 0.1 : -0.02),
    0.04,
    0.72,
  );
  const assistShareProb = clamp(
    (sector === 'MID' ? 0.36 : sector === 'ATK' ? 0.2 : 0.14) +
      skillEdge * 0.07 +
      (mindset === 'COLETIVO_SEGURO' ? 0.1 : 0),
    0.05,
    0.6,
  );

  for (let g = 0; g < clubGoals; g++) {
    const roll = Math.random();
    if (roll < goalShareProb * playTimeFactor) {
      playerGoals++;
    } else if (roll < (goalShareProb + assistShareProb) * playTimeFactor) {
      playerAssists++;
    }
  }

  // Chance de um lance individual seu mudar um jogo truncado (máx +1 gol, mantendo placar 100% realista!)
  if (clubGoals === 0 && Math.random() < goalShareProb * 0.35 * playTimeFactor) {
    clubGoals += 1;
    playerGoals += 1;
  }

  if (sector === 'DEF') keyActions += randomInt(2, 5);

  let scorePoints = 28 + skillEdge * 8 + keyActions * 5 + playerGoals * 28 + playerAssists * 20;
  if (clubGoals > opponentGoals) scorePoints += 10;
  if (sector === 'DEF' && opponentGoals === 0) scorePoints += 18;
  if (mindset === 'AGRESSIVO_GOL' && playerGoals === 0 && playerAssists === 0) scorePoints -= 8;

  const stars: StarRating =
    scorePoints >= 75 ? 3 : scorePoints >= 52 ? 2 : scorePoints >= 34 ? 1 : 0;

  const narrative: string[] = [];
  narrative.push(
    !isStarter
      ? `Entrou vindo do banco aos ${minuteEntered}' do 2º tempo (${stageLabel}).`
      : `Titular desde o apito inicial (${stageLabel}).`,
  );
  if (playerGoals > 0) narrative.push(`Decisivo: marcou ${playerGoals} gol(s) na partida!`);
  if (playerAssists > 0) narrative.push(`Serviu ${playerAssists} assistência(s) limpa(s).`);
  if (sector === 'DEF' && opponentGoals === 0) narrative.push(`Defesa intacta: ${keyActions} ações defensivas.`);
  if (subbedOffForStamina) narrative.push(`Substituído aos ${minuteExited}' por desgaste.`);

  const baseStaminaDrain = Math.round(minutesPlayed * (mindset === 'AGRESSIVO_GOL' ? 0.34 : 0.25));

  return {
    competitionId,
    stageLabel,
    clubId,
    opponentId,
    isHome,
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
    staminaSpent: clamp(baseStaminaDrain, 10, 42),
    matchNarrative: narrative,
  };
}
