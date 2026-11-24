import { AttributeKey } from '../../data/equipment/catalog';
import { StarRating } from '../../shared/types/common';
import { clamp } from '../../shared/utils/math';
import { calculateOverall } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';

export interface TrainingGainReport {
  mode: 'PASSIVE_50' | 'ACTIVE_100';
  leveledUpAttributes: { key: AttributeKey; newValue: number }[];
  xpGainedPerAttribute: number;
}

/**
 * Aplica o treino nas barras de % dos atributos em foco:
 * - PASSIVE_50: 50% automático quando o jogador apenas avança o calendário (zero cliques!)
 * - ACTIVE_100: até 100%+ quando o jogador decide realizar o treino do dia
 */
export function applyTrainingProgress(
  player: CareerPlayer,
  focusedAttributes: AttributeKey[],
  mode: 'PASSIVE_50' | 'ACTIVE_100',
  clubFacilityQuality: number,
  equipmentXpBonusPct: number,
  activeStars: StarRating = 3,
): { updatedPlayer: CareerPlayer; report: TrainingGainReport } {
  const targets: AttributeKey[] =
    focusedAttributes.length > 0
      ? focusedAttributes
      : ['acceleration', 'finishing', 'shortPass'];

  // Base para 100% ativo: ~24 XP por sessão dividida ou concentrada
  const baseFullXp = 26;
  const ageMultiplier = player.age <= 18 ? 1.25 : player.age <= 22 ? 1.1 : 0.95;
  const facilityMultiplier = 0.85 + (clubFacilityQuality / 100) * 0.35;
  const equipmentMultiplier = 1 + equipmentXpBonusPct / 100;

  let modeMultiplier = 0.5; // 50% garantido automaticamente sem fazer nada!
  if (mode === 'ACTIVE_100') {
    modeMultiplier = activeStars === 3 ? 1.1 : activeStars === 2 ? 0.95 : 0.78;
  }

  const focusSplitFactor = targets.length === 1 ? 1.0 : targets.length === 2 ? 0.72 : 0.56;
  const xpGain = Math.max(
    4,
    Math.round(
      baseFullXp *
        ageMultiplier *
        facilityMultiplier *
        equipmentMultiplier *
        modeMultiplier *
        focusSplitFactor,
    ),
  );

  const nextAttrs = { ...player.attributes };
  const nextXp = { ...player.attributeXp };
  const leveledUp: { key: AttributeKey; newValue: number }[] = [];

  for (const key of targets) {
    if (nextAttrs[key] >= 99) continue;

    // Atributos muito altos (85+) exigem um pouco mais para subir
    const highStatPenalty = nextAttrs[key] >= 85 ? 0.65 : nextAttrs[key] >= 75 ? 0.82 : 1.0;
    const totalXp = nextXp[key] + Math.round(xpGain * highStatPenalty);

    if (totalXp >= 100) {
      nextAttrs[key] = clamp(nextAttrs[key] + 1, 1, 99);
      nextXp[key] = nextAttrs[key] >= 99 ? 0 : totalXp - 100;
      leveledUp.push({ key, newValue: nextAttrs[key] });
    } else {
      nextXp[key] = totalXp;
    }
  }

  const updatedPlayer: CareerPlayer = {
    ...player,
    attributes: nextAttrs,
    attributeXp: nextXp,
    overall: calculateOverall(nextAttrs, player.position),
  };

  return {
    updatedPlayer,
    report: {
      mode,
      leveledUpAttributes: leveledUp,
      xpGainedPerAttribute: xpGain,
    },
  };
}
