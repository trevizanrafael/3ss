import { AGENTS_CATALOG } from '../../data/agents/catalog';
import { AttributeKey, EQUIPMENT_CATALOG } from '../../data/equipment/catalog';
import { clamp } from '../../shared/utils/math';
import { calculateOverall } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';

export function getOwnedEquipmentBonuses(ownedEquipmentIds: string[]): {
  trainingXpBonusPct: number;
  staminaRecoveryBonus: number;
} {
  let trainingXpBonusPct = 0;
  let staminaRecoveryBonus = 0;

  for (const id of ownedEquipmentIds) {
    const item = EQUIPMENT_CATALOG.find((e) => e.id === id);
    if (item) {
      trainingXpBonusPct += item.trainingXpBonusPct;
      staminaRecoveryBonus += item.staminaRecoveryBonus;
    }
  }
  return { trainingXpBonusPct, staminaRecoveryBonus };
}

export function purchaseTrainingEquipment(
  player: CareerPlayer,
  bankBalance: number,
  ownedIds: string[],
  equipmentId: string,
): {
  ok: boolean;
  updatedPlayer: CareerPlayer;
  updatedBalance: number;
  updatedOwnedIds: string[];
  message: string;
} {
  const item = EQUIPMENT_CATALOG.find((e) => e.id === equipmentId);
  if (!item) {
    return { ok: false, updatedPlayer: player, updatedBalance: bankBalance, updatedOwnedIds: ownedIds, message: 'Equipamento não encontrado.' };
  }
  if (ownedIds.includes(equipmentId)) {
    return { ok: false, updatedPlayer: player, updatedBalance: bankBalance, updatedOwnedIds: ownedIds, message: 'Você já possui este equipamento.' };
  }
  if (bankBalance < item.price) {
    return { ok: false, updatedPlayer: player, updatedBalance: bankBalance, updatedOwnedIds: ownedIds, message: 'Saldo insuficiente para esta estrutura.' };
  }

  const nextAttrs = { ...player.attributes };
  for (const [key, boost] of Object.entries(item.instantBoosts) as [AttributeKey, number][]) {
    nextAttrs[key] = clamp((nextAttrs[key] ?? 50) + boost, 1, 99);
  }

  const updatedPlayer: CareerPlayer = {
    ...player,
    attributes: nextAttrs,
    overall: calculateOverall(nextAttrs, player.position),
  };

  return {
    ok: true,
    updatedPlayer,
    updatedBalance: bankBalance - item.price,
    updatedOwnedIds: [...ownedIds, equipmentId],
    message: `${item.name} adquirido! Atributos atualizados imediatamente.`,
  };
}

export function hireCareerAgent(
  bankBalance: number,
  currentAgentId: string,
  targetAgentId: string,
): { ok: boolean; updatedBalance: number; updatedAgentId: string; message: string } {
  const agent = AGENTS_CATALOG.find((a) => a.id === targetAgentId);
  if (!agent || targetAgentId === currentAgentId) {
    return { ok: false, updatedBalance: bankBalance, updatedAgentId: currentAgentId, message: 'Empresário já contratado.' };
  }
  if (bankBalance < agent.signingFee) {
    return { ok: false, updatedBalance: bankBalance, updatedAgentId: currentAgentId, message: 'Saldo insuficiente para pagar as luvas do empresário.' };
  }
  return {
    ok: true,
    updatedBalance: bankBalance - agent.signingFee,
    updatedAgentId: agent.id,
    message: `${agent.name} (${agent.agencyName}) agora gerencia sua carreira!`,
  };
}
