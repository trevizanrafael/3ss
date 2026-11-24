import { AttributeKey } from '../../data/equipment/catalog';
import { StarRating } from '../../shared/types/common';
import { clamp } from '../../shared/utils/math';
import { calculateOverall } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';
import { getDrillById } from './trainingDrillsCatalog';

export type DrillGrade = 'A' | 'B' | 'C';

export interface FiveSlotTrainingReport {
  mode: 'PASSIVE_50' | 'ACTIVE_100';
  leveledUpKeys: AttributeKey[];
  slotGrades: (DrillGrade | null)[];
}

export const DEFAULT_FIVE_DRILL_SLOTS: (string | null)[] = [
  'drill_sprint_cones',
  'drill_clinical_finish',
  'drill_rondo_press',
  'drill_slalom_dribble',
  null,
];

export function applyFiveSlotsTraining(
  player: CareerPlayer,
  drillSlots: (string | null)[],
  mode: 'PASSIVE_50' | 'ACTIVE_100',
  clubFacilityQuality: number,
  equipmentXpBonusPct: number,
  activeStars: StarRating = 3,
): { updatedPlayer: CareerPlayer; report: FiveSlotTrainingReport } {
  const ageFactor = player.age <= 18 ? 1.25 : player.age <= 22 ? 1.1 : 0.95;
  const facilityFactor = 0.85 + (clubFacilityQuality / 100) * 0.35;
  const eqFactor = 1 + equipmentXpBonusPct / 100;
  const modeFactor =
    mode === 'PASSIVE_50'
      ? 0.5
      : activeStars === 3
        ? 1.05
        : activeStars === 2
          ? 0.9
          : 0.75;

  const nextAttrs = { ...player.attributes };
  const nextXp = { ...player.attributeXp };
  const leveledSet = new Set<AttributeKey>();
  const slotGrades: (DrillGrade | null)[] = [];

  for (const slotId of drillSlots) {
    const drill = getDrillById(slotId);
    if (!drill) {
      slotGrades.push(null);
      continue;
    }

    const roll = Math.random();
    const grade: DrillGrade =
      mode === 'PASSIVE_50'
        ? 'B'
        : activeStars === 3 && roll < 0.75
          ? 'A'
          : roll < 0.8
            ? 'B'
            : 'C';
    slotGrades.push(grade);

    const gradeFactor = mode === 'PASSIVE_50' ? 1.0 : grade === 'A' ? 1.12 : grade === 'B' ? 0.95 : 0.78;
    const rawXp = Math.max(
      4,
      Math.round(16 * drill.xpMultiplier * ageFactor * facilityFactor * eqFactor * modeFactor * gradeFactor),
    );

    for (const key of drill.attributes) {
      if (nextAttrs[key] >= 99) continue;
      const highPenalty = nextAttrs[key] >= 85 ? 0.65 : nextAttrs[key] >= 75 ? 0.82 : 1.0;
      const sumXp = nextXp[key] + Math.round(rawXp * highPenalty);

      if (sumXp >= 100) {
        nextAttrs[key] = clamp(nextAttrs[key] + 1, 1, 99);
        nextXp[key] = nextAttrs[key] >= 99 ? 0 : sumXp - 100;
        leveledSet.add(key);
      } else {
        nextXp[key] = sumXp;
      }
    }
  }

  return {
    updatedPlayer: {
      ...player,
      attributes: nextAttrs,
      attributeXp: nextXp,
      overall: calculateOverall(nextAttrs, player.position),
    },
    report: {
      mode,
      leveledUpKeys: Array.from(leveledSet),
      slotGrades,
    },
  };
}
