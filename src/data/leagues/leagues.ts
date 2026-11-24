import { CountryCode } from '../../shared/types/common';

export type LeagueId =
  | 'BRA_1'
  | 'BRA_2'
  | 'ARG_1'
  | 'ARG_2'
  | 'USA_1'
  | 'ENG_1'
  | 'ENG_2'
  | 'ESP_1'
  | 'ESP_2'
  | 'ITA_1'
  | 'ITA_2'
  | 'GER_1'
  | 'GER_2'
  | 'FRA_1'
  | 'FRA_2'
  | 'POR_1'
  | 'POR_2'
  | 'CONMEBOL_POOL'
  | 'UEFA_POOL';

export type ContinentalCupId =
  | 'LIBERTADORES'
  | 'SUL_AMERICANA'
  | 'CHAMPIONS_LEAGUE'
  | 'EUROPA_LEAGUE';

export interface LeagueConfig {
  id: LeagueId;
  name: string;
  country: CountryCode | 'INT';
  division: 1 | 2;
  hasPromotion: boolean;
  hasRelegation: boolean;
  promotedTo?: LeagueId;
  relegatedTo?: LeagueId;
  continentalPrimary?: ContinentalCupId;
  continentalSecondary?: ContinentalCupId;
}

export const LEAGUES: Record<LeagueId, LeagueConfig> = {
  BRA_1: { id: 'BRA_1', name: 'Brasileirão Série A', country: 'BRA', division: 1, hasPromotion: false, hasRelegation: true, relegatedTo: 'BRA_2', continentalPrimary: 'LIBERTADORES', continentalSecondary: 'SUL_AMERICANA' },
  BRA_2: { id: 'BRA_2', name: 'Brasileirão Série B', country: 'BRA', division: 2, hasPromotion: true, hasRelegation: false, promotedTo: 'BRA_1' },
  ARG_1: { id: 'ARG_1', name: 'Liga Profesional Argentina', country: 'ARG', division: 1, hasPromotion: false, hasRelegation: true, relegatedTo: 'ARG_2', continentalPrimary: 'LIBERTADORES', continentalSecondary: 'SUL_AMERICANA' },
  ARG_2: { id: 'ARG_2', name: 'Primera Nacional (ARG 2ª)', country: 'ARG', division: 2, hasPromotion: true, hasRelegation: false, promotedTo: 'ARG_1' },
  USA_1: { id: 'USA_1', name: 'Major League Soccer (MLS)', country: 'USA', division: 1, hasPromotion: false, hasRelegation: false },
  ENG_1: { id: 'ENG_1', name: 'Premier League', country: 'ENG', division: 1, hasPromotion: false, hasRelegation: true, relegatedTo: 'ENG_2', continentalPrimary: 'CHAMPIONS_LEAGUE', continentalSecondary: 'EUROPA_LEAGUE' },
  ENG_2: { id: 'ENG_2', name: 'EFL Championship', country: 'ENG', division: 2, hasPromotion: true, hasRelegation: false, promotedTo: 'ENG_1' },
  ESP_1: { id: 'ESP_1', name: 'La Liga', country: 'ESP', division: 1, hasPromotion: false, hasRelegation: true, relegatedTo: 'ESP_2', continentalPrimary: 'CHAMPIONS_LEAGUE', continentalSecondary: 'EUROPA_LEAGUE' },
  ESP_2: { id: 'ESP_2', name: 'La Liga 2', country: 'ESP', division: 2, hasPromotion: true, hasRelegation: false, promotedTo: 'ESP_1' },
  ITA_1: { id: 'ITA_1', name: 'Serie A', country: 'ITA', division: 1, hasPromotion: false, hasRelegation: true, relegatedTo: 'ITA_2', continentalPrimary: 'CHAMPIONS_LEAGUE', continentalSecondary: 'EUROPA_LEAGUE' },
  ITA_2: { id: 'ITA_2', name: 'Serie B', country: 'ITA', division: 2, hasPromotion: true, hasRelegation: false, promotedTo: 'ITA_1' },
  GER_1: { id: 'GER_1', name: 'Bundesliga', country: 'GER', division: 1, hasPromotion: false, hasRelegation: true, relegatedTo: 'GER_2', continentalPrimary: 'CHAMPIONS_LEAGUE', continentalSecondary: 'EUROPA_LEAGUE' },
  GER_2: { id: 'GER_2', name: '2. Bundesliga', country: 'GER', division: 2, hasPromotion: true, hasRelegation: false, promotedTo: 'GER_1' },
  FRA_1: { id: 'FRA_1', name: 'Ligue 1', country: 'FRA', division: 1, hasPromotion: false, hasRelegation: true, relegatedTo: 'FRA_2', continentalPrimary: 'CHAMPIONS_LEAGUE', continentalSecondary: 'EUROPA_LEAGUE' },
  FRA_2: { id: 'FRA_2', name: 'Ligue 2', country: 'FRA', division: 2, hasPromotion: true, hasRelegation: false, promotedTo: 'FRA_1' },
  POR_1: { id: 'POR_1', name: 'Liga Portugal (Liga NOS)', country: 'POR', division: 1, hasPromotion: false, hasRelegation: true, relegatedTo: 'POR_2', continentalPrimary: 'CHAMPIONS_LEAGUE', continentalSecondary: 'EUROPA_LEAGUE' },
  POR_2: { id: 'POR_2', name: 'Liga Portugal 2', country: 'POR', division: 2, hasPromotion: true, hasRelegation: false, promotedTo: 'POR_1' },
  CONMEBOL_POOL: { id: 'CONMEBOL_POOL', name: 'Clubes Sul-Americanos (CONMEBOL)', country: 'INT', division: 1, hasPromotion: false, hasRelegation: false, continentalPrimary: 'LIBERTADORES', continentalSecondary: 'SUL_AMERICANA' },
  UEFA_POOL: { id: 'UEFA_POOL', name: 'Clubes Europeus (UEFA)', country: 'INT', division: 1, hasPromotion: false, hasRelegation: false, continentalPrimary: 'CHAMPIONS_LEAGUE', continentalSecondary: 'EUROPA_LEAGUE' },
};

export const PLAYABLE_LEAGUE_IDS: LeagueId[] = (Object.keys(LEAGUES) as LeagueId[]).filter(
  (id) => id !== 'CONMEBOL_POOL' && id !== 'UEFA_POOL',
);
