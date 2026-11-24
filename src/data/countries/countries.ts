import { CountryCode } from '../../shared/types/common';

export interface CountryInfo {
  code: CountryCode;
  name: string;
  flag: string;
  youthLeagueLabel: string;
  confederation: 'CONMEBOL' | 'UEFA' | 'CONCACAF';
}

export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  BRA: {
    code: 'BRA',
    name: 'Brasil',
    flag: '🇧🇷',
    youthLeagueLabel: 'Brasileirão Sub-20',
    confederation: 'CONMEBOL',
  },
  ARG: {
    code: 'ARG',
    name: 'Argentina',
    flag: '🇦🇷',
    youthLeagueLabel: 'Torneo de Reserva Sub-20',
    confederation: 'CONMEBOL',
  },
  ESP: {
    code: 'ESP',
    name: 'Espanha',
    flag: '🇪🇸',
    youthLeagueLabel: 'División de Honor Juvenil',
    confederation: 'UEFA',
  },
  ENG: {
    code: 'ENG',
    name: 'Inglaterra',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    youthLeagueLabel: 'Premier League 2 (U21)',
    confederation: 'UEFA',
  },
  ITA: {
    code: 'ITA',
    name: 'Itália',
    flag: '🇮🇹',
    youthLeagueLabel: 'Campionato Primavera 1',
    confederation: 'UEFA',
  },
  GER: {
    code: 'GER',
    name: 'Alemanha',
    flag: '🇩🇪',
    youthLeagueLabel: 'DFB-Nachwuchsliga U19',
    confederation: 'UEFA',
  },
  FRA: {
    code: 'FRA',
    name: 'França',
    flag: '🇫🇷',
    youthLeagueLabel: 'Championnat National U19',
    confederation: 'UEFA',
  },
  POR: {
    code: 'POR',
    name: 'Portugal',
    flag: '🇵🇹',
    youthLeagueLabel: 'Liga Revelação Sub-23',
    confederation: 'UEFA',
  },
  USA: {
    code: 'USA',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    youthLeagueLabel: 'MLS NEXT Pro Academy',
    confederation: 'CONCACAF',
  },
};

export const COUNTRY_LIST: CountryInfo[] = Object.values(COUNTRIES);
