import { AttributeKey } from '../../data/equipment/catalog';

export type AttributeGroup = 'FISICO' | 'TECNICO' | 'DEF_TATICO';

export interface AttributeMeta {
  key: AttributeKey;
  label: string;
  shortLabel: string;
  group: AttributeGroup;
}

export const ATTRIBUTE_DEFINITIONS: AttributeMeta[] = [
  { key: 'acceleration', label: 'Explosão', shortLabel: 'EXP', group: 'FISICO' },
  { key: 'sprintSpeed', label: 'Velocidade Final', shortLabel: 'VEL', group: 'FISICO' },
  { key: 'agility', label: 'Agilidade', shortLabel: 'AGI', group: 'FISICO' },
  { key: 'balance', label: 'Equilíbrio', shortLabel: 'EQU', group: 'FISICO' },
  { key: 'strength', label: 'Força Física', shortLabel: 'FOR', group: 'FISICO' },
  { key: 'stamina', label: 'Fôlego', shortLabel: 'FOL', group: 'FISICO' },

  { key: 'finishing', label: 'Finalização', shortLabel: 'FIN', group: 'TECNICO' },
  { key: 'shotPower', label: 'Força do Chute', shortLabel: 'FCH', group: 'TECNICO' },
  { key: 'longShots', label: 'Chute de Longe', shortLabel: 'CHL', group: 'TECNICO' },
  { key: 'shortPass', label: 'Passe Curto', shortLabel: 'PAC', group: 'TECNICO' },
  { key: 'longPass', label: 'Passe Longo', shortLabel: 'PAL', group: 'TECNICO' },
  { key: 'dribbling', label: 'Condução / Drible', shortLabel: 'DRI', group: 'TECNICO' },
  { key: 'ballControl', label: 'Controle de Bola', shortLabel: 'CON', group: 'TECNICO' },

  { key: 'tackling', label: 'Desarme', shortLabel: 'DES', group: 'DEF_TATICO' },
  { key: 'interceptions', label: 'Interceptação', shortLabel: 'INT', group: 'DEF_TATICO' },
  { key: 'positioning', label: 'Posicionamento', shortLabel: 'POS', group: 'DEF_TATICO' },
];

export const ALL_ATTRIBUTE_KEYS: AttributeKey[] = ATTRIBUTE_DEFINITIONS.map((d) => d.key);
