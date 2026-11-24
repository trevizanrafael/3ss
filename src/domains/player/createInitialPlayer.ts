import { isLeagueCountryCode } from '../../data/countries/countries';
import { AttributeKey } from '../../data/equipment/catalog';
import {
  CountryCode,
  LeagueCountryCode,
  PositionCode,
  PreferredFoot,
} from '../../shared/types/common';
import { clamp } from '../../shared/utils/math';
import { ALL_ATTRIBUTE_KEYS } from '../attributes/attributeDefinitions';
import { calculateOverall, getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer, PlayerAppearance } from './playerTypes';

export interface CreatePlayerInput {
  fullName: string;
  shirtName: string;
  shirtNumber: number;
  birthDay: number;
  birthMonth: number;
  birthYear: number;
  nationality: CountryCode;
  startingLeagueCountry?: LeagueCountryCode;
  position: PositionCode;
  preferredFoot: PreferredFoot;
  heightCm: number;
  weightKg: number;
  appearance: PlayerAppearance;
}

/**
 * Calcula a idade exata a partir da Data de Nascimento na data de início da temporada (10/Agosto),
 * garantindo idade mínima profissional de 18 anos.
 */
export function calculateAgeFromBirthDate(
  birthDay: number,
  birthMonth: number,
  birthYear: number,
  refYear = 2026,
  refMonth = 8,
  refDay = 10,
): number {
  let age = refYear - birthYear;
  if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
    age -= 1;
  }
  return Math.max(18, age);
}

export function formatBirthDatePt(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function createInitialPlayer(input: CreatePlayerInput): CareerPlayer {
  const sector = getPositionSector(input.position);
  const age = calculateAgeFromBirthDate(input.birthDay, input.birthMonth, input.birthYear);

  // Atleta já estreia no Profissional (~66 a 69 OVR dependendo da idade 18..22)
  const ageBase = clamp(60 + Math.min(4, age - 18), 60, 64);

  const attrs = {} as Record<AttributeKey, number>;
  const xp = {} as Record<AttributeKey, number>;

  for (const key of ALL_ATTRIBUTE_KEYS) {
    attrs[key] = ageBase;
    xp[key] = 0;
  }

  if (sector === 'ATK') {
    attrs.finishing += 8;
    attrs.acceleration += 7;
    attrs.sprintSpeed += 7;
    attrs.dribbling += 7;
    attrs.ballControl += 6;
    attrs.shotPower += 6;
    attrs.positioning += 6;
    attrs.tackling -= 14;
    attrs.interceptions -= 12;
  } else if (sector === 'MID') {
    attrs.shortPass += 8;
    attrs.longPass += 7;
    attrs.ballControl += 7;
    attrs.dribbling += 6;
    attrs.stamina += 7;
    attrs.positioning += 6;
    attrs.agility += 5;
  } else {
    attrs.tackling += 9;
    attrs.interceptions += 8;
    attrs.strength += 7;
    attrs.positioning += 6;
    attrs.stamina += 6;
    attrs.sprintSpeed += 5;
    attrs.finishing -= 14;
  }

  if (input.heightCm >= 185) {
    attrs.strength += 3;
    attrs.agility -= 2;
    attrs.balance -= 2;
  } else if (input.heightCm <= 173) {
    attrs.acceleration += 2;
    attrs.agility += 3;
    attrs.balance += 3;
    attrs.strength -= 2;
  }

  for (const key of ALL_ATTRIBUTE_KEYS) {
    attrs[key] = clamp(attrs[key], 38, 76);
  }

  const startingLeagueCountry: LeagueCountryCode =
    input.startingLeagueCountry ??
    (isLeagueCountryCode(input.nationality) ? input.nationality : 'BRA');

  return {
    fullName: input.fullName,
    shirtName: input.shirtName,
    shirtNumber: input.shirtNumber,
    age,
    birthDay: input.birthDay,
    birthMonth: input.birthMonth,
    birthYear: input.birthYear,
    nationality: input.nationality,
    startingLeagueCountry,
    position: input.position,
    preferredFoot: input.preferredFoot,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    appearance: input.appearance,
    attributes: attrs,
    attributeXp: xp,
    overall: calculateOverall(attrs, input.position),
    stamina: 100,
    reputationStars: 1,
    careerTotals: {
      matches: 0,
      goals: 0,
      assists: 0,
      threeStarMatches: 0,
      trophies: 0,
      nationalCaps: 0,
      nationalGoals: 0,
    },
  };
}
