import { AttributeKey } from '../../data/equipment/catalog';

export type DrillTier = 'OURO' | 'PRATA' | 'BRONZE';
export type DrillCategory = 'RITMO_FISICO' | 'FINALIZACAO' | 'PASSE_CRIACAO' | 'DRIBLE' | 'DEFESA';

export interface TrainingDrillDef {
  id: string;
  name: string;
  category: DrillCategory;
  tier: DrillTier;
  xpMultiplier: number;
  attributes: [AttributeKey, AttributeKey];
}

export const TRAINING_DRILLS_CATALOG: TrainingDrillDef[] = [
  {
    id: 'drill_sprint_cones',
    name: 'Tiros de Explosão 20m',
    category: 'RITMO_FISICO',
    tier: 'OURO',
    xpMultiplier: 1.15,
    attributes: ['acceleration', 'sprintSpeed'],
  },
  {
    id: 'drill_box_to_box',
    name: 'Resistência Caixa a Caixa',
    category: 'RITMO_FISICO',
    tier: 'PRATA',
    xpMultiplier: 1.0,
    attributes: ['stamina', 'strength'],
  },
  {
    id: 'drill_plyo_balance',
    name: 'Pliometria & Corpo a Corpo',
    category: 'RITMO_FISICO',
    tier: 'PRATA',
    xpMultiplier: 1.0,
    attributes: ['balance', 'agility'],
  },
  {
    id: 'drill_clinical_finish',
    name: 'Finalização Cara a Cara',
    category: 'FINALIZACAO',
    tier: 'OURO',
    xpMultiplier: 1.15,
    attributes: ['finishing', 'positioning'],
  },
  {
    id: 'drill_long_strike',
    name: 'Batida de Fora da Área',
    category: 'FINALIZACAO',
    tier: 'OURO',
    xpMultiplier: 1.1,
    attributes: ['shotPower', 'longShots'],
  },
  {
    id: 'drill_rondo_press',
    name: 'Roda de Passe sob Pressão',
    category: 'PASSE_CRIACAO',
    tier: 'OURO',
    xpMultiplier: 1.15,
    attributes: ['shortPass', 'ballControl'],
  },
  {
    id: 'drill_switch_play',
    name: 'Inversão & Lançamento Longo',
    category: 'PASSE_CRIACAO',
    tier: 'PRATA',
    xpMultiplier: 1.0,
    attributes: ['longPass', 'positioning'],
  },
  {
    id: 'drill_slalom_dribble',
    name: 'Slalom Curto em Velocidade',
    category: 'DRIBLE',
    tier: 'OURO',
    xpMultiplier: 1.15,
    attributes: ['dribbling', 'agility'],
  },
  {
    id: 'drill_first_touch',
    name: 'Domínio Orientado sob Marcação',
    category: 'DRIBLE',
    tier: 'BRONZE',
    xpMultiplier: 0.9,
    attributes: ['ballControl', 'balance'],
  },
  {
    id: 'drill_1v1_tackle',
    name: 'Contenção & Bote 1x1',
    category: 'DEFESA',
    tier: 'OURO',
    xpMultiplier: 1.15,
    attributes: ['tackling', 'strength'],
  },
  {
    id: 'drill_reading_lanes',
    name: 'Fechamento de Linha de Passe',
    category: 'DEFESA',
    tier: 'OURO',
    xpMultiplier: 1.1,
    attributes: ['interceptions', 'positioning'],
  },
];

export function getDrillById(drillId: string | null): TrainingDrillDef | null {
  if (!drillId) return null;
  return TRAINING_DRILLS_CATALOG.find((d) => d.id === drillId) ?? null;
}

export interface FifaSixMacroStats {
  ritmo: number;
  finalizacao: number;
  passe: number;
  drible: number;
  defesa: number;
  fisico: number;
}

export function computeFifaMacroStats(attrs: Record<AttributeKey, number>): FifaSixMacroStats {
  return {
    ritmo: Math.round(attrs.acceleration * 0.5 + attrs.sprintSpeed * 0.5),
    finalizacao: Math.round(attrs.finishing * 0.55 + attrs.shotPower * 0.25 + attrs.longShots * 0.2),
    passe: Math.round(attrs.shortPass * 0.6 + attrs.longPass * 0.4),
    drible: Math.round(attrs.dribbling * 0.45 + attrs.ballControl * 0.35 + attrs.agility * 0.1 + attrs.balance * 0.1),
    defesa: Math.round(attrs.tackling * 0.5 + attrs.interceptions * 0.35 + attrs.positioning * 0.15),
    fisico: Math.round(attrs.strength * 0.55 + attrs.stamina * 0.45),
  };
}
