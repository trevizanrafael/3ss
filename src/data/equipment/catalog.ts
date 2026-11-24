export type AttributeKey =
  | 'acceleration'   // Explosão
  | 'sprintSpeed'    // Velocidade Final
  | 'agility'        // Agilidade
  | 'balance'        // Equilíbrio
  | 'strength'       // Força
  | 'stamina'        // Fôlego
  | 'finishing'      // Finalização
  | 'shotPower'      // Força do Chute
  | 'longShots'      // Chute de Longe
  | 'shortPass'      // Passe Curto
  | 'longPass'       // Passe Longo
  | 'dribbling'      // Condução / Drible
  | 'ballControl'    // Controle de Bola
  | 'tackling'       // Desarme
  | 'interceptions'  // Interceptação
  | 'positioning';   // Posicionamento

export interface TrainingEquipment {
  id: string;
  name: string;
  category: 'EXPLOSAO_FISICO' | 'TECNICA_BOLA' | 'RECUPERACAO_TATICA';
  price: number;
  instantBoosts: Partial<Record<AttributeKey, number>>;
  trainingXpBonusPct: number; // Bônus permanente de % XP nos treinos
  staminaRecoveryBonus: number;
  description: string;
}

export const EQUIPMENT_CATALOG: TrainingEquipment[] = [
  {
    id: 'eq_jump_rope',
    name: 'Kit Corda & Escada de Coordenação',
    category: 'EXPLOSAO_FISICO',
    price: 1800,
    instantBoosts: { agility: 1, balance: 1 },
    trainingXpBonusPct: 4,
    staminaRecoveryBonus: 0,
    description: 'Acessível já com a bolsa da Base. Melhora a coordenação dos pés e o equilíbrio em divididas.',
  },
  {
    id: 'eq_trampoline',
    name: 'Cama Elástica de Pliometria',
    category: 'EXPLOSAO_FISICO',
    price: 4500,
    instantBoosts: { acceleration: 1, balance: 1 },
    trainingXpBonusPct: 6,
    staminaRecoveryBonus: 0,
    description: 'Treino pliométrico de arrancada curta: concede +1 de Explosão e +1 de Equilíbrio imediatamente.',
  },
  {
    id: 'eq_rebounder',
    name: 'Parede Rebatedora de Passes',
    category: 'TECNICA_BOLA',
    price: 9500,
    instantBoosts: { shortPass: 1, ballControl: 1 },
    trainingXpBonusPct: 8,
    staminaRecoveryBonus: 0,
    description: 'Permite repetir centenas de domínios orientados e tabelas curtas em casa.',
  },
  {
    id: 'eq_compression_boots',
    name: 'Botas Pneumáticas de Recuperação',
    category: 'RECUPERACAO_TATICA',
    price: 18000,
    instantBoosts: { stamina: 1 },
    trainingXpBonusPct: 5,
    staminaRecoveryBonus: 12,
    description: 'Acelera a recuperação muscular entre os jogos da semana, evitando ser substituído cedo.',
  },
  {
    id: 'eq_home_gym',
    name: 'Academia Particular Completa',
    category: 'EXPLOSAO_FISICO',
    price: 55000,
    instantBoosts: { strength: 2, sprintSpeed: 1, acceleration: 1 },
    trainingXpBonusPct: 12,
    staminaRecoveryBonus: 5,
    description: 'Estrutura profissional em casa para ganho de potência física real.',
  },
  {
    id: 'eq_ball_launcher',
    name: 'Máquina Lançadora Automática Pro',
    category: 'TECNICA_BOLA',
    price: 120000,
    instantBoosts: { finishing: 2, shotPower: 1, ballControl: 2 },
    trainingXpBonusPct: 15,
    staminaRecoveryBonus: 0,
    description: 'Simula cruzamentos e bolas rápidas para calibrar finalização de primeira.',
  },
  {
    id: 'eq_private_staff',
    name: 'Preparador Físico & Analista Pessoal',
    category: 'RECUPERACAO_TATICA',
    price: 280000,
    instantBoosts: { positioning: 3, interceptions: 2, stamina: 2 },
    trainingXpBonusPct: 22,
    staminaRecoveryBonus: 20,
    description: 'Equipe dedicada digna de craque europeu: leitura tática superior e evolução acelerada.',
  },
];
