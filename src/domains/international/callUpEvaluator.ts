import { getNationalTeamByCountry } from '../../data/clubs';
import { CareerStage, SquadRole } from '../../shared/types/common';
import { PlayerPeriodStats } from '../awards/awardTypes';
import { CareerPlayer } from '../player/playerTypes';

export interface NationalCallUpStatus {
  calledUp: boolean;
  nationalTeamId: string;
  role: SquadRole;
  effectiveScore: number;
  minOvrRequired: number;
}

/**
 * Avalia por mérito realista se o jogador do usuário tem nível + fase
 * para ser convocado à Seleção Principal de seu país:
 * - Brasil / França / Espanha / Inglaterra / Argentina (86 OVR) exigem ~81+ para Reserva e ~85+ para Titular
 * - Noruega / Japão / Colômbia / Marrocos (80-82 OVR) exigem ~75-77+
 * - Bolívia / Panamá / El Salvador (69-71 OVR) já convocam jovens a partir de ~65-67+
 */
export function evaluateNationalCallUp(
  player: CareerPlayer,
  stage: CareerStage,
  period: PlayerPeriodStats,
): NationalCallUpStatus {
  const natTeam = getNationalTeamByCountry(player.nationality);
  const teamOvr = natTeam.squadAvgOvr;

  // Bônus leve de fase recente no clube (+0 a +3 pontos equivalentes)
  const avgStars =
    period.seasonMatches > 0 ? period.seasonStarPoints / period.seasonMatches : 1.2;
  const gaBoost = Math.min(2, (period.seasonGoals + period.seasonAssists) * 0.08);
  const formBonus = stage === 'YOUTH' ? -6 : Math.round((avgStars - 1.3) * 1.5 + gaBoost);

  const effectiveScore = player.overall + formBonus;
  const minOvrRequired = Math.max(64, teamOvr - 5);

  if (effectiveScore < minOvrRequired) {
    return {
      calledUp: false,
      nationalTeamId: natTeam.id,
      role: 'RESERVA',
      effectiveScore,
      minOvrRequired,
    };
  }

  const role: SquadRole =
    effectiveScore >= teamOvr + 2
      ? 'ESTRELA'
      : effectiveScore >= teamOvr - 1
        ? 'TITULAR'
        : 'RESERVA';

  return {
    calledUp: true,
    nationalTeamId: natTeam.id,
    role,
    effectiveScore,
    minOvrRequired,
  };
}
