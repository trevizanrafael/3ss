import { CountryCode } from '../../shared/types/common';
import { LeagueId } from '../leagues/leagues';
import { ClubData } from './types';

import arg1 from '../world/clubs/arg_1.json';
import arg2 from '../world/clubs/arg_2.json';
import bra1 from '../world/clubs/bra_1.json';
import bra2 from '../world/clubs/bra_2.json';
import conmebolPool from '../world/clubs/conmebol_pool.json';
import eng1 from '../world/clubs/eng_1.json';
import eng2 from '../world/clubs/eng_2.json';
import esp1 from '../world/clubs/esp_1.json';
import esp2 from '../world/clubs/esp_2.json';
import fra1 from '../world/clubs/fra_1.json';
import fra2 from '../world/clubs/fra_2.json';
import ger1 from '../world/clubs/ger_1.json';
import ger2 from '../world/clubs/ger_2.json';
import ita1 from '../world/clubs/ita_1.json';
import ita2 from '../world/clubs/ita_2.json';
import por1 from '../world/clubs/por_1.json';
import por2 from '../world/clubs/por_2.json';
import uefaPool from '../world/clubs/uefa_pool.json';
import usa1 from '../world/clubs/usa_1.json';

export const ALL_CLUBS: ClubData[] = [
  ...(bra1 as ClubData[]),
  ...(bra2 as ClubData[]),
  ...(arg1 as ClubData[]),
  ...(arg2 as ClubData[]),
  ...(usa1 as ClubData[]),
  ...(eng1 as ClubData[]),
  ...(eng2 as ClubData[]),
  ...(esp1 as ClubData[]),
  ...(esp2 as ClubData[]),
  ...(ita1 as ClubData[]),
  ...(ita2 as ClubData[]),
  ...(ger1 as ClubData[]),
  ...(ger2 as ClubData[]),
  ...(fra1 as ClubData[]),
  ...(fra2 as ClubData[]),
  ...(por1 as ClubData[]),
  ...(por2 as ClubData[]),
  ...(conmebolPool as ClubData[]),
  ...(uefaPool as ClubData[]),
];

const CLUB_MAP = new Map<string, ClubData>(ALL_CLUBS.map((c) => [c.id, c]));

export function getClubById(clubId: string): ClubData {
  return CLUB_MAP.get(clubId) ?? ALL_CLUBS[0];
}

export function hasClubId(clubId: string): boolean {
  return CLUB_MAP.has(clubId);
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
