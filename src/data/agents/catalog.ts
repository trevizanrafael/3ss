import { StarRating } from '../../shared/types/common';

export interface AgentProfile {
  id: string;
  name: string;
  agencyName: string;
  stars: StarRating;
  signingFee: number;        // Valor único para contratar o empresário
  salaryBonusPct: number;    // % a mais negociado nas propostas salariais
  unlocksForeignOffers: boolean;
  unlocksLoanRequest: boolean;
  description: string;
}

export const AGENTS_CATALOG: AgentProfile[] = [
  {
    id: 'agent_family',
    name: 'Sem Empresário (Família)',
    agencyName: 'Representação Própria',
    stars: 0,
    signingFee: 0,
    salaryBonusPct: 0,
    unlocksForeignOffers: false,
    unlocksLoanRequest: false,
    description: 'Começo humilde na base. Recebe apenas convites diretos de olheiros locais.',
  },
  {
    id: 'agent_local',
    name: 'Carlos Eduardo',
    agencyName: 'Talentos da Base Sports',
    stars: 1,
    signingFee: 8000,
    salaryBonusPct: 12,
    unlocksForeignOffers: false,
    unlocksLoanRequest: true,
    description: 'Especialista em transição da Base pro Profissional. Consegue cavar empréstimos para você jogar como titular.',
  },
  {
    id: 'agent_continental',
    name: 'Renata Vasconcelos',
    agencyName: ' Sul-América & Atlântico Management',
    stars: 2,
    signingFee: 65000,
    salaryBonusPct: 25,
    unlocksForeignOffers: true,
    unlocksLoanRequest: true,
    description: 'Abre portas em grandes clubes da 1ª divisão, MLS, Portugal e mercados médios da Europa.',
  },
  {
    id: 'agent_worldclass',
    name: 'Jorge Montovani',
    agencyName: 'Three Stars Global Agency',
    stars: 3,
    signingFee: 350000,
    salaryBonusPct: 45,
    unlocksForeignOffers: true,
    unlocksLoanRequest: true,
    description: 'Empresário de elite mundial. Negocia salários de estrela e coloca seu nome na mesa dos gigantes da Champions League.',
  },
];
