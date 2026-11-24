import { AttributeKey } from '../../data/equipment/catalog';
import { PositionCode, PositionSector } from '../../shared/types/common';
import { clamp } from '../../shared/utils/math';

export const POSITION_LABELS: Record<PositionCode, string> = {
  ATA: 'Centroavante (ATA)',
  SA: 'Segundo Atacante (SA)',
  PD: 'Ponta Direita (PD)',
  PE: 'Ponta Esquerda (PE)',
  MEI: 'Meia Ofensivo (MEI)',
  MC: 'Meia Central (MC)',
  VOL: 'Volante (VOL)',
  MD: 'Meia Direita (MD)',
  ME: 'Meia Esquerda (ME)',
  LD: 'Lateral Direito (LD)',
  LE: 'Lateral Esquerdo (LE)',
  ZAG: 'Zagueiro (ZAG)',
};

export function getPositionSector(pos: PositionCode): PositionSector {
  if (pos === 'ATA' || pos === 'SA' || pos === 'PD' || pos === 'PE') return 'ATK';
  if (pos === 'LD' || pos === 'LE' || pos === 'ZAG') return 'DEF';
  return 'MID';
}

const WEIGHTS_BY_POSITION: Record<PositionCode, Partial<Record<AttributeKey, number>>> = {
  ATA: { finishing: 0.28, shotPower: 0.14, positioning: 0.16, acceleration: 0.10, sprintSpeed: 0.10, ballControl: 0.10, dribbling: 0.06, strength: 0.06 },
  SA: { finishing: 0.20, dribbling: 0.16, ballControl: 0.14, shortPass: 0.12, acceleration: 0.12, agility: 0.10, positioning: 0.10, longShots: 0.06 },
  PD: { acceleration: 0.18, sprintSpeed: 0.18, dribbling: 0.18, agility: 0.12, ballControl: 0.12, finishing: 0.12, shortPass: 0.10 },
  PE: { acceleration: 0.18, sprintSpeed: 0.18, dribbling: 0.18, agility: 0.12, ballControl: 0.12, finishing: 0.12, shortPass: 0.10 },
  MEI: { shortPass: 0.22, ballControl: 0.18, dribbling: 0.16, longPass: 0.12, longShots: 0.10, agility: 0.10, positioning: 0.12 },
  MC: { shortPass: 0.22, longPass: 0.18, ballControl: 0.14, stamina: 0.14, positioning: 0.12, interceptions: 0.10, tackling: 0.10 },
  VOL: { tackling: 0.22, interceptions: 0.22, strength: 0.14, stamina: 0.14, shortPass: 0.14, positioning: 0.14 },
  MD: { sprintSpeed: 0.16, acceleration: 0.14, shortPass: 0.16, longPass: 0.14, dribbling: 0.14, stamina: 0.14, ballControl: 0.12 },
  ME: { sprintSpeed: 0.16, acceleration: 0.14, shortPass: 0.16, longPass: 0.14, dribbling: 0.14, stamina: 0.14, ballControl: 0.12 },
  LD: { sprintSpeed: 0.16, acceleration: 0.14, stamina: 0.16, tackling: 0.18, interceptions: 0.14, shortPass: 0.12, longPass: 0.10 },
  LE: { sprintSpeed: 0.16, acceleration: 0.14, stamina: 0.16, tackling: 0.18, interceptions: 0.14, shortPass: 0.12, longPass: 0.10 },
  ZAG: { tackling: 0.28, interceptions: 0.24, strength: 0.20, positioning: 0.14, balance: 0.06, sprintSpeed: 0.08 },
};

export function calculateOverall(
  attributes: Record<AttributeKey, number>,
  position: PositionCode,
): number {
  const weights = WEIGHTS_BY_POSITION[position];
  let total = 0;
  let weightSum = 0;

  for (const [key, weight] of Object.entries(weights) as [AttributeKey, number][]) {
    total += (attributes[key] ?? 50) * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return 55;
  return clamp(Math.round(total / weightSum), 1, 99);
}
