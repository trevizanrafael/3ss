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
  age: 16 | 17 | 18;
  nationality: CountryCode;
  startingLeagueCountry?: LeagueCountryCode;
  position: PositionCode;
  preferredFoot: PreferredFoot;
  heightCm: number;
  weightKg: number;
  appearance: PlayerAppearance;
}

export function createInitialPlayer(input: CreatePlayerInput): CareerPlayer {
  const sector = getPositionSector(input.position);
  const ageBase = input.age === 16 ? 52 : input.age === 17 ? 54 : 56;

  const attrs = {} as Record<AttributeKey, number>;
  const xp = {} as Record<AttributeKey, number>;

  for (const key of ALL_ATTRIBUTE_KEYS) {
    attrs[key] = ageBase;
    xp[key] = 0;
  }

  if (sector === 'ATK') {
    attrs.finishing += 7;
    attrs.acceleration += 6;
    attrs.sprintSpeed += 6;
    attrs.dribbling += 6;
    attrs.ballControl += 5;
    attrs.shotPower += 5;
    attrs.positioning += 5;
    attrs.tackling -= 12;
    attrs.interceptions -= 10;
  } else if (sector === 'MID') {
    attrs.shortPass += 7;
    attrs.longPass += 6;
    attrs.ballControl += 6;
    attrs.dribbling += 5;
    attrs.stamina += 6;
    attrs.positioning += 5;
    attrs.agility += 4;
  } else {
    attrs.tackling += 8;
    attrs.interceptions += 7;
    attrs.strength += 6;
    attrs.positioning += 5;
    attrs.stamina += 5;
    attrs.sprintSpeed += 4;
    attrs.finishing -= 12;
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
    attrs[key] = clamp(attrs[key], 35, 72);
  }

  const startingLeagueCountry: LeagueCountryCode =
    input.startingLeagueCountry ??
    (isLeagueCountryCode(input.nationality) ? input.nationality : 'BRA');

  return {
    ...input,
    startingLeagueCountry,
    attributes: attrs,
    attributeXp: xp,
    overall: calculateOverall(attrs, input.position),
    stamina: 100,
    reputationStars: 0,
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
