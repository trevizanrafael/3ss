import { CountryCode } from '../../shared/types/common';
import { LeagueId } from '../leagues/leagues';
import { BRAZIL_CLUBS } from './brazil';
import { ENGLAND_AND_MLS_CLUBS } from './englandAndMls';
import { ITALY_GERMANY_FRANCE_CLUBS } from './italyGermanyFrance';
import { SOUTH_AMERICA_CLUBS } from './southAmerica';
import { SPAIN_AND_PORTUGAL_CLUBS } from './spainAndPortugal';
import { ClubData } from './types';

export const ALL_CLUBS: ClubData[] = [
  ...BRAZIL_CLUBS,
  ...SOUTH_AMERICA_CLUBS,
  ...ENGLAND_AND_MLS_CLUBS,
  ...SPAIN_AND_PORTUGAL_CLUBS,
  ...ITALY_GERMANY_FRANCE_CLUBS,
];

const CLUB_MAP = new Map<string, ClubData>(ALL_CLUBS.map((c) => [c.id, c]));

export function getClubById(clubId: string): ClubData {
  const club = CLUB_MAP.get(clubId);
  if (!club) {
    throw new Error(`Club not found: ${clubId}`);
  }
  return club;
}

export function getClubsByLeague(leagueId: LeagueId): ClubData[] {
  return ALL_CLUBS.filter((c) => c.leagueId === leagueId);
}

export function getNationalClubsByCountry(country: CountryCode): ClubData[] {
  return ALL_CLUBS.filter(
    (c) =>
      c.country === country &&
      c.leagueId !== 'CONMEBOL_POOL' &&
      c.leagueId !== 'UEFA_POOL',
  );
}
