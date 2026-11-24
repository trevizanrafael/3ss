import {
  ConfederationCode,
  CountryCode,
  LeagueCountryCode,
} from '../../shared/types/common';
import rawNationalTeams from '../world/nationalTeams.json';

export interface CountryInfo {
  code: CountryCode;
  name: string;
  flag: string;
  youthLeagueLabel: string;
  confederation: ConfederationCode;
  nationalTeamId: string;
  ovr: number;
}

export interface TryoutLeagueCountryInfo {
  code: LeagueCountryCode;
  name: string;
  flag: string;
  leaguesSummary: string;
  youthLeagueLabel: string;
}

export const TRYOUT_LEAGUE_COUNTRIES: Record<LeagueCountryCode, TryoutLeagueCountryInfo> = {
  BRA: {
    code: 'BRA',
    name: 'Brasil',
    flag: '🇧🇷',
    leaguesSummary: 'Brasileirão Série A & B',
    youthLeagueLabel: 'Brasileirão Sub-20',
  },
  ARG: {
    code: 'ARG',
    name: 'Argentina',
    flag: '🇦🇷',
    leaguesSummary: 'Liga Profesional & Primera Nacional',
    youthLeagueLabel: 'Torneo de Reserva Sub-20',
  },
  ENG: {
    code: 'ENG',
    name: 'Inglaterra',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    leaguesSummary: 'Premier League & Championship',
    youthLeagueLabel: 'Premier League 2 (U21)',
  },
  ESP: {
    code: 'ESP',
    name: 'Espanha',
    flag: '🇪🇸',
    leaguesSummary: 'La Liga & La Liga 2',
    youthLeagueLabel: 'División de Honor Juvenil',
  },
  ITA: {
    code: 'ITA',
    name: 'Itália',
    flag: '🇮🇹',
    leaguesSummary: 'Serie A & Serie B',
    youthLeagueLabel: 'Campionato Primavera 1',
  },
  GER: {
    code: 'GER',
    name: 'Alemanha',
    flag: '🇩🇪',
    leaguesSummary: 'Bundesliga & 2. Bundesliga',
    youthLeagueLabel: 'DFB-Nachwuchsliga U19',
  },
  FRA: {
    code: 'FRA',
    name: 'França',
    flag: '🇫🇷',
    leaguesSummary: 'Ligue 1 & Ligue 2',
    youthLeagueLabel: 'Championnat National U19',
  },
  POR: {
    code: 'POR',
    name: 'Portugal',
    flag: '🇵🇹',
    leaguesSummary: 'Liga Portugal 1 & 2',
    youthLeagueLabel: 'Liga Revelação Sub-23',
  },
  USA: {
    code: 'USA',
    name: 'Estados Unidos (MLS)',
    flag: '🇺🇸',
    leaguesSummary: 'Major League Soccer',
    youthLeagueLabel: 'MLS NEXT Pro Academy',
  },
};

export const TRYOUT_LEAGUE_COUNTRY_LIST: TryoutLeagueCountryInfo[] = Object.values(
  TRYOUT_LEAGUE_COUNTRIES,
);

export function isLeagueCountryCode(code: string): code is LeagueCountryCode {
  return code in TRYOUT_LEAGUE_COUNTRIES;
}

interface RawNatMeta {
  id: string;
  nationalCode: CountryCode;
  name: string;
  flag: string;
  confederation: ConfederationCode;
  squadAvgOvr: number;
}

const builtCountries = {} as Record<CountryCode, CountryInfo>;
for (const nt of rawNationalTeams as RawNatMeta[]) {
  const tryoutMeta = isLeagueCountryCode(nt.nationalCode)
    ? TRYOUT_LEAGUE_COUNTRIES[nt.nationalCode]
    : null;
  builtCountries[nt.nationalCode] = {
    code: nt.nationalCode,
    name: nt.name,
    flag: nt.flag,
    youthLeagueLabel: tryoutMeta?.youthLeagueLabel ?? `Seleção ${nt.name} Sub-20`,
    confederation: nt.confederation,
    nationalTeamId: nt.id,
    ovr: nt.squadAvgOvr,
  };
}

export const COUNTRIES: Record<CountryCode, CountryInfo> = builtCountries;

export const COUNTRY_LIST: CountryInfo[] = Object.values(COUNTRIES);
