import { AttributeKey } from '../../data/equipment/catalog';
import {
  CountryCode,
  LeagueCountryCode,
  PositionCode,
  PreferredFoot,
  StarRating,
} from '../../shared/types/common';

export type HairStyleCode =
  | 'DEGRADE'
  | 'ARREPIADO'
  | 'CURTO'
  | 'TOPETE'
  | 'TRANCA'
  | 'AFRO'
  | 'MOICANO'
  | 'COQUE'
  | 'LONGO'
  | 'RASPADO';

export type FacialHairCode =
  | 'LIMPO'
  | 'BIGODE'
  | 'CAVANHAQUE'
  | 'BARBA_BAIXA'
  | 'BARBA_CHEIA';

export type FaceExpressionCode = 'CONFIANTE' | 'FOCADO' | 'ALEGRE' | 'MARRENTO';

export interface PlayerAppearance {
  skinTone: string;
  hairStyle: HairStyleCode;
  hairColor: string;
  facialHair?: FacialHairCode;
  expression?: FaceExpressionCode;
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
  age: number; // Mínimo 18 anos no Profissional
  birthDay: number; // 1..31
  birthMonth: number; // 1..12
  birthYear: number; // ex: 2008 (18 anos em Ago/2026)
  nationality: CountryCode;
  startingLeagueCountry: LeagueCountryCode;
  position: PositionCode;
  preferredFoot: PreferredFoot;
  heightCm: number;
  weightKg: number;
  appearance: PlayerAppearance;
  attributes: Record<AttributeKey, number>;
  attributeXp: Record<AttributeKey, number>;
  overall: number;
  stamina: number;
  reputationStars: StarRating;
  careerTotals: CareerStatsTotals;
}
