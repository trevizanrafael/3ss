import { getClubsByLeague } from '../../data/clubs';
import { COUNTRIES } from '../../data/countries/countries';
import { LeagueId } from '../../data/leagues/leagues';
import { LeagueCountryCode } from '../../shared/types/common';
import { InternationalCycleState } from './internationalTypes';

export interface MatchVenueInfo {
  stadiumName: string;
  city: string;
  country: LeagueCountryCode;
  countryName: string;
  lat: number;
  lng: number;
}

export const WORLD_CUP_HOST_COUNTRIES: readonly LeagueCountryCode[] = [
  'ESP',
  'BRA',
  'GER',
  'ENG',
  'ITA',
  'ARG',
  'FRA',
  'USA',
  'POR',
] as const;

const HOST_TOP_LEAGUE: Record<LeagueCountryCode, LeagueId> = {
  BRA: 'BRA_1',
  ARG: 'ARG_1',
  USA: 'USA_1',
  ENG: 'ENG_1',
  ESP: 'ESP_1',
  ITA: 'ITA_1',
  GER: 'GER_1',
  FRA: 'FRA_1',
  POR: 'POR_1',
};

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Seleciona um País-Sede para a edição da Copa do Mundo (ex: 2030 = ESP, 2034 = BRA/GER/ENG...)
 * garantindo que tenha estádios reais cadastrados e sem repetir sedes recentes!
 */
export function pickWorldCupHostCountry(
  editionYear: number,
  previousHosts: LeagueCountryCode[] = [],
): LeagueCountryCode {
  if (editionYear === 2030 && !previousHosts.includes('ESP')) {
    return 'ESP';
  }
  const recentBlock = new Set(previousHosts.slice(0, 4));
  const pool = WORLD_CUP_HOST_COUNTRIES.filter((c) => !recentBlock.has(c));
  const candidates = pool.length > 0 ? pool : WORLD_CUP_HOST_COUNTRIES;
  const idx = hashString(`wc_host_${editionYear}_${previousHosts.length}`) % candidates.length;
  return candidates[idx];
}

/**
 * Retorna os principais estádios cadastrados de 1ª divisão do País-Sede, ordenados do maior palco (índice 0 = Final) aos demais!
 */
export function getHostCountryWorldCupVenues(hostCountry: LeagueCountryCode): MatchVenueInfo[] {
  const lgId = HOST_TOP_LEAGUE[hostCountry] ?? 'ESP_1';
  const countryName = COUNTRIES[hostCountry]?.name ?? hostCountry;
  const clubs = [...getClubsByLeague(lgId)].sort((a, b) => b.squadAvgOvr - a.squadAvgOvr);

  const seenStadiums = new Set<string>();
  const venues: MatchVenueInfo[] = [];

  for (const club of clubs) {
    if (!club.stadiumName || club.lat === undefined || club.lng === undefined) continue;
    const key = club.stadiumName.trim().toLowerCase();
    if (seenStadiums.has(key)) continue;
    seenStadiums.add(key);

    venues.push({
      stadiumName: club.stadiumName,
      city: club.city ?? club.name,
      country: hostCountry,
      countryName,
      lat: club.lat,
      lng: club.lng,
    });
    if (venues.length >= 10) break;
  }

  if (venues.length === 0) {
    venues.push({
      stadiumName: 'Santiago Bernabéu',
      city: 'Madri',
      country: 'ESP',
      countryName: 'Espanha',
      lat: 40.4531,
      lng: -3.6883,
    });
  }

  return venues;
}

/**
 * Sorteia deterministicamente qual estádio do País-Sede recebe uma partida específica da Copa!
 * A Grande Final sempre acontece no Estádio Principal (#0) do País-Sede!
 */
export function resolveWorldCupMatchVenue(
  hostCountry: LeagueCountryCode,
  matchIdOrStage: string,
  stageLabel: string,
): MatchVenueInfo {
  const venues = getHostCountryWorldCupVenues(hostCountry);
  const upper = stageLabel.toUpperCase();
  if (upper.includes('FINAL') && !upper.includes('SEMI') && !upper.includes('QUARTAS') && !upper.includes('OITAVAS')) {
    return venues[0];
  }
  if (upper.includes('SEMIFINAL') && venues.length >= 2) {
    const idx = hashString(matchIdOrStage) % 2;
    return venues[idx];
  }
  const idx = hashString(`${hostCountry}_${matchIdOrStage}_${stageLabel}`) % venues.length;
  return venues[idx];
}

/**
 * Calcula o ano oficial (2030, 2034, 2038...) e o País-Sede da Copa do Mundo atual ou próxima do ciclo FIFA!
 */
export function getWorldCupEditionInfo(
  seasonYear: number,
  intl?: InternationalCycleState | null,
): {
  editionYear: number;
  hostCountry: LeagueCountryCode;
  hostCountryName: string;
  shortLabel: string;
  fullLabelWithHost: string;
} {
  let editionYear: number;
  let hostCountry: LeagueCountryCode;

  if (intl?.worldCup) {
    editionYear = intl.worldCup.editionYear ?? intl.worldCup.seasonYear + 1;
    hostCountry = intl.worldCup.hostCountry ?? intl.nextWorldCupHost ?? pickWorldCupHostCountry(editionYear);
  } else {
    const cIdx = intl?.cycleIndex ?? ((((seasonYear - 2026) % 4) + 4) % 4);
    const seasonsUntilWc = (3 - cIdx + 4) % 4;
    editionYear = seasonYear + seasonsUntilWc + 1;
    const prevHosts = (intl?.pastChampions ?? [])
      .filter((r) => r.compId === 'WORLD_CUP' && r.hostCountry)
      .map((r) => r.hostCountry!);
    hostCountry = intl?.nextWorldCupHost ?? pickWorldCupHostCountry(editionYear, prevHosts);
  }

  const hostCountryName = COUNTRIES[hostCountry]?.name ?? hostCountry;
  return {
    editionYear,
    hostCountry,
    hostCountryName,
    shortLabel: `COPA DO MUNDO ${editionYear}`,
    fullLabelWithHost: `COPA DO MUNDO ${editionYear} • ${hostCountryName.toUpperCase()}`,
  };
}
