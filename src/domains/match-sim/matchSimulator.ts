import { getClubById } from '../../data/clubs';
import { AnyCompetitionId } from '../../data/world/competitionThemes';
import { CareerStage, SquadRole, StarRating } from '../../shared/types/common';
import { clamp, randomInt } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';
import {
  resolveRivalryMatchContext,
  RivalryMatchContext,
} from '../rivalry/rivalryEngine';
import { samplePoissonGoals } from '../season/poissonMatchMath';
import { UserPenaltyShootoutSummary } from './penaltyShootoutEngine';

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
  penaltyShootout?: UserPenaltyShootoutSummary;
  aggregateNote?: string;
  rivalry?: RivalryMatchContext;
  twoLegSummary?: {
    leg1MyGoals: number;
    leg1OppGoals: number;
    aggMyGoals: number;
    aggOppGoals: number;
    qualified: boolean;
  };
}

export interface Played3DMatchStatsInput {
  myTeamGoals: number;
  opponentGoals: number;
  userGoals: number;
  userAssists: number;
  userPasses: number;
  userTackles: number;
  myShots: number;
  oppShots: number;
  myPossessionPct: number;
  staminaRemaining: number;
  minutesPlayed: number;
}

/**
 * Converte o desempenho real jogado no campo 3D 11v11 em um `MatchPerformanceResult` oficial da Carreira,
 * inclusive completando via simulação os minutos finais caso o usuário acione "Simular Restante" na pausa!
 */
export function buildMatchResultFromPlayed3D(
  player: CareerPlayer,
  clubId: string,
  opponentId: string,
  isHome: boolean,
  competitionId: AnyCompetitionId,
  stageLabel: string,
  mindset: TacticalMindset,
  neutralVenue: boolean,
  stats: Played3DMatchStatsInput,
  simulatedRestFromMinute?: number,
): MatchPerformanceResult {
  const myClub = getClubById(clubId);
  const opponent = getClubById(opponentId);
  const sector = getPositionSector(player.position);

  const isNeutralMatch =
    neutralVenue ||
    competitionId === 'WORLD_CUP' ||
    competitionId === 'COPA_AMERICA' ||
    competitionId === 'EURO_CUP' ||
    (stageLabel.includes('FINAL') && !stageLabel.includes('SEMI'));
  const rivalry =
    resolveRivalryMatchContext(clubId, opponentId, isHome, isNeutralMatch) ?? undefined;

  let clubGoals = stats.myTeamGoals;
  let opponentGoals = stats.opponentGoals;
  let playerGoals = stats.userGoals;
  let playerAssists = stats.userAssists;

  // Se acionou "Simular Restante" antes dos 90', simula proporcionalmente os minutos faltantes!
  if (simulatedRestFromMinute !== undefined && simulatedRestFromMinute < 89) {
    const remFrac = clamp((90 - simulatedRestFromMinute) / 90, 0.04, 1.0);
    const homeAdv = isNeutralMatch ? 0 : isHome ? 1.5 : -1.5;
    const ovrDiff = myClub.squadAvgOvr - opponent.squadAvgOvr + homeAdv;
    const extraMy = samplePoissonGoals(clamp(1.25 * Math.exp(0.04 * ovrDiff) * remFrac, 0.05, 2.4));
    const extraOpp = samplePoissonGoals(clamp(1.18 * Math.exp(-0.04 * ovrDiff) * remFrac, 0.05, 2.2));
    clubGoals += extraMy;
    opponentGoals += extraOpp;

    for (let g = 0; g < extraMy; g++) {
      const r = Math.random();
      if (r < (sector === 'ATK' ? 0.38 : sector === 'MID' ? 0.2 : 0.06)) playerGoals += 1;
      else if (r < (sector === 'MID' ? 0.5 : 0.34)) playerAssists += 1;
    }
  }

  const keyActions = Math.max(1, stats.userPasses + stats.userTackles * 2);
  const matchRating =
    6.2 +
    playerGoals * 1.35 +
    playerAssists * 0.95 +
    stats.userPasses * 0.08 +
    stats.userTackles * 0.22 +
    (clubGoals > opponentGoals ? 0.45 : clubGoals === opponentGoals ? 0.1 : -0.2) +
    (sector === 'DEF' && opponentGoals === 0 ? 1.15 : 0);

  const stars: StarRating =
    matchRating >= 8.0 ? 3 : matchRating >= 6.8 ? 2 : matchRating >= 5.9 ? 1 : 0;

  const rawSpent = Math.max(12, player.stamina - stats.staminaRemaining);
  const staminaSpent = clamp(Math.round(rawSpent * 0.58) + (rivalry ? 2 : 0), 10, 38);

  const narrative: string[] = [];
  if (simulatedRestFromMinute !== undefined && simulatedRestFromMinute < 89) {
    narrative.push(
      `Atuou em campo até os ${simulatedRestFromMinute}' e simulou os minutos finais (${stageLabel}).`,
    );
  } else {
    narrative.push(
      `Partida 3D disputada em tempo integral • Posse: ${stats.myPossessionPct}% • Finalizações: ${stats.myShots}x${stats.oppShots}.`,
    );
  }
  if (playerGoals > 0) narrative.push(`Você balançou as redes ${playerGoals} vez(es)!`);
  if (playerAssists > 0) narrative.push(`Distribuiu ${playerAssists} assistência(s) decisiva(s).`);
  if (stats.userPasses > 0 || stats.userTackles > 0) {
    narrative.push(
      `Participação ativa: ${stats.userPasses} passe(s) conectado(s) e ${stats.userTackles} desarme(s).`,
    );
  }
  if (mindset === 'AGRESSIVO_GOL' && playerGoals > 0) {
    narrative.push('Postura ofensiva recompensada no terço final.');
  }

  return {
    competitionId,
    stageLabel,
    clubId,
    opponentId,
    isHome,
    clubGoals,
    opponentGoals,
    startedMatch: true,
    minuteEntered: 1,
    minuteExited: 90,
    minutesPlayed: 90,
    subbedOffForStamina: false,
    playerGoals,
    playerAssists,
    keyActions,
    stars,
    staminaSpent,
    matchNarrative: narrative,
    rivalry,
  };
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
  neutralVenue = false,
): MatchPerformanceResult {
  const myClub = getClubById(clubId);
  const opponent = getClubById(opponentId);
  const sector = getPositionSector(player.position);

  const isStarter =
    role === 'BASE_TITULAR' || role === 'TITULAR' || role === 'ESTRELA';
  const minuteEntered = isStarter ? 1 : randomInt(56, 72);
  const subbedOffForStamina = isStarter && player.stamina < 65;
  const minuteExited = subbedOffForStamina ? randomInt(68, 81) : 90;
  const minutesPlayed = Math.max(15, minuteExited - minuteEntered + (isStarter ? 1 : 0));
  const playTimeFactor = minutesPlayed / 90;

  // Impacto Real de Craque: quando seu Overall supera a média do elenco, você eleva o patamar competitivo do time!
  const starCarryBoost =
    Math.max(0, player.overall - myClub.squadAvgOvr) *
    (isStarter ? 0.52 : 0.25) *
    playTimeFactor;

  const effectiveMyOvr = myClub.squadAvgOvr + starCarryBoost;
  const isNeutralMatch =
    neutralVenue ||
    competitionId === 'WORLD_CUP' ||
    competitionId === 'COPA_AMERICA' ||
    competitionId === 'EURO_CUP' ||
    (stageLabel.includes('FINAL') && !stageLabel.includes('SEMI'));
  const rivalry =
    resolveRivalryMatchContext(clubId, opponentId, isHome, isNeutralMatch) ?? undefined;

  // Pressão do Caldeirão em Clássicos: torcida hostil pesa mais fora de casa, e mosaico empurra em casa!
  // Na Copa do Mundo (sede única neutra), NÃO há vantagem/desvantagem de casa ou fora!
  const derbyCauldronShift = !rivalry
    ? 0
    : rivalry.tier === 'FEROZ'
      ? 0.72
      : rivalry.tier === 'HISTORICO'
        ? 0.46
        : 0.28;
  const homeAdv = isNeutralMatch
    ? 0
    : isHome
      ? 1.65 + derbyCauldronShift
      : -(1.65 + derbyCauldronShift);
  const ovrDiffForMyClub = effectiveMyOvr - opponent.squadAvgOvr + homeAdv;

  const atkMindsetMult =
    mindset === 'AGRESSIVO_GOL' ? 1.13 : mindset === 'COLETIVO_SEGURO' ? 0.94 : 1.0;
  const defMindsetMult =
    mindset === 'AGRESSIVO_GOL' ? 1.06 : mindset === 'COLETIVO_SEGURO' ? 0.86 : 1.0;

  const baseMyLambda = isNeutralMatch ? 1.22 : isHome ? 1.34 : 1.1;
  const baseOppLambda = isNeutralMatch ? 1.22 : isHome ? 1.06 : 1.3;

  const lambdaMy = clamp(
    baseMyLambda * Math.exp(0.042 * ovrDiffForMyClub) * atkMindsetMult,
    0.3,
    3.35,
  );
  const lambdaOpp = clamp(
    baseOppLambda * Math.exp(-0.042 * ovrDiffForMyClub) * defMindsetMult,
    0.18,
    2.7,
  );

  let clubGoals = samplePoissonGoals(lambdaMy);
  const opponentGoals = samplePoissonGoals(lambdaOpp);

  const benchmarkOvr =
    stage === 'YOUTH' ? Math.max(54, opponent.squadAvgOvr - 16) : opponent.squadAvgOvr - 2;
  const skillEdge = (player.overall - benchmarkOvr) / 10;

  let playerGoals = 0;
  let playerAssists = 0;
  let keyActions = Math.max(1, Math.round((2 + skillEdge + Math.random() * 3) * playTimeFactor));

  const goalShareProb = clamp(
    (sector === 'ATK' ? 0.45 : sector === 'MID' ? 0.23 : 0.07) +
    skillEdge * 0.08 +
    (mindset === 'AGRESSIVO_GOL' ? 0.1 : -0.02),
    0.04,
    0.74,
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

  // Poder de decisão: em jogos empatados ou perdendo por 1 gol, craques acima do nível rival podem decidir!
  if (clubGoals <= opponentGoals && opponentGoals - clubGoals <= 1) {
    const clutchProb =
      clamp(0.14 + Math.max(0, skillEdge) * 0.14, 0.08, 0.52) *
      (sector === 'ATK' ? 1.0 : sector === 'MID' ? 0.78 : 0.4) *
      playTimeFactor;
    if (Math.random() < clutchProb) {
      clubGoals += 1;
      if (sector === 'MID' && Math.random() < 0.45) {
        playerAssists += 1;
      } else {
        playerGoals += 1;
      }
    }
  }

  if (sector === 'DEF') keyActions += randomInt(2, 5);

  let scorePoints = 28 + skillEdge * 8 + keyActions * 5 + playerGoals * 28 + playerAssists * 20;
  if (clubGoals > opponentGoals) scorePoints += 10;
  if (rivalry && (playerGoals > 0 || playerAssists > 0)) scorePoints += 8;
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

  const derbyDrain = rivalry ? (rivalry.tier === 'FEROZ' ? 3 : 2) : 0;
  const baseStaminaDrain =
    Math.round(minutesPlayed * (mindset === 'AGRESSIVO_GOL' ? 0.32 : 0.23)) + derbyDrain;

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
    staminaSpent: clamp(baseStaminaDrain, 10, 40),
    matchNarrative: narrative,
    rivalry,
  };
}
