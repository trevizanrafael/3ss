import { AttributeKey } from '../../data/equipment/catalog';
import {
  CountryCode,
  LeagueCountryCode,
  PositionCode,
  PreferredFoot,
  StarRating,
} from '../../shared/types/common';

export interface PlayerAppearance {
  skinTone: string;
  hairStyle: 'CURTO' | 'DEGRADE' | 'TOPETE' | 'TRANCA' | 'AFRO' | 'LONGO' | 'RASPADO';
  hairColor: string;
  facialHair?: 'LIMPO' | 'CAVANHAQUE' | 'BARBA_BAIXA' | 'BARBA_CHEIA';
  eyeColor: string;
  shirtTuck: 'SOLTA' | 'DENTRO_CALCAO';
  sleeveStyle: 'CURTA' | 'LONGA' | 'TERMICA';
  sockHeight?: 'PADRAO' | 'ALTO' | 'BAIXO';
  accessory: 'NENHUM' | 'MUNHEQUEIRA' | 'FAIXA_CABECA' | 'TORNOZELEIRA' | 'LUVAS';
  bootColor: string;
}

export interface CareerStatsTotals {
  matches: number;
  goals: number;
  assists: number;
  threeStarMatches: number;
  trophies: number;
  nationalCaps?: number;
  nationalGoals?: number;
}

export interface CareerPlayer {
  fullName: string;
  shirtName: string;
  shirtNumber: number;
  age: number; // Começa entre 16 e 18
  nationality: CountryCode; // Livre entre as 64 Seleções Nacionais FIFA
  startingLeagueCountry: LeagueCountryCode; // País/Liga onde faz o teste de base inicial
  position: PositionCode;
  preferredFoot: PreferredFoot;
  heightCm: number;
  weightKg: number;
  appearance: PlayerAppearance;
  attributes: Record<AttributeKey, number>;
  attributeXp: Record<AttributeKey, number>; // 0..99% rumo ao próximo ponto
  overall: number;
  stamina: number; // 0..100 energia atual para a partida
  reputationStars: StarRating;
  careerTotals: CareerStatsTotals;
}
