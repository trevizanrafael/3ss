import { ContinentalCupId, LeagueId } from '../leagues/leagues';
import rawLogos from './competitionLogos.json';

export type InternationalCompId =
  | 'WC_QUALIFIERS'
  | 'NATIONS_LEAGUE'
  | 'COPA_AMERICA'
  | 'EURO_CUP'
  | 'WORLD_CUP'
  | 'INTL_FRIENDLY';

export type AnyCompetitionId = LeagueId | ContinentalCupId | InternationalCompId;

export interface CompetitionTheme {
  id: AnyCompetitionId;
  shortLabel: string;
  accentPrimary: string;
  accentSecondary: string;
  bannerBg: string;
  textOnAccent: string;
  logoUrl: string;
}

const LOGOS = rawLogos as Record<string, { light?: string; dark?: string }>;

function getLogo(id: string): string {
  return LOGOS[id]?.dark || LOGOS[id]?.light || '';
}

export const COMPETITION_THEMES: Record<AnyCompetitionId, CompetitionTheme> = {
  BRA_1: { id: 'BRA_1', shortLabel: 'BRASILEIRÃO A', accentPrimary: '#00A859', accentSecondary: '#FFDF00', bannerBg: '#072417', textOnAccent: '#0B0B0D', logoUrl: getLogo('BRA_1') },
  BRA_2: { id: 'BRA_2', shortLabel: 'BRASILEIRÃO B', accentPrimary: '#009C3B', accentSecondary: '#F5F5F7', bannerBg: '#092016', textOnAccent: '#0B0B0D', logoUrl: getLogo('BRA_2') },
  ARG_1: { id: 'ARG_1', shortLabel: 'LIGA PROFESIONAL', accentPrimary: '#74ACDF', accentSecondary: '#F5F5F7', bannerBg: '#0B1E32', textOnAccent: '#0B0B0D', logoUrl: getLogo('ARG_1') },
  ARG_2: { id: 'ARG_2', shortLabel: 'PRIMERA NACIONAL', accentPrimary: '#5B9BD5', accentSecondary: '#F5F5F7', bannerBg: '#0B1A2A', textOnAccent: '#0B0B0D', logoUrl: getLogo('ARG_2') },
  USA_1: { id: 'USA_1', shortLabel: 'MLS', accentPrimary: '#E2231A', accentSecondary: '#002F6C', bannerBg: '#1E0B16', textOnAccent: '#F5F5F7', logoUrl: getLogo('USA_1') },
  ENG_1: { id: 'ENG_1', shortLabel: 'PREMIER LEAGUE', accentPrimary: '#00FF85', accentSecondary: '#3D195B', bannerBg: '#260E3A', textOnAccent: '#0B0B0D', logoUrl: getLogo('ENG_1') },
  ENG_2: { id: 'ENG_2', shortLabel: 'EFL CHAMPIONSHIP', accentPrimary: '#1D63DC', accentSecondary: '#D4AF37', bannerBg: '#0C1A36', textOnAccent: '#F5F5F7', logoUrl: getLogo('ENG_2') },
  ESP_1: { id: 'ESP_1', shortLabel: 'LALIGA EA SPORTS', accentPrimary: '#FF4B44', accentSecondary: '#FFFFFF', bannerBg: '#2A0C0C', textOnAccent: '#0B0B0D', logoUrl: getLogo('ESP_1') },
  ESP_2: { id: 'ESP_2', shortLabel: 'LALIGA HYPERMOTION', accentPrimary: '#00A3E0', accentSecondary: '#FF4B44', bannerBg: '#0A202B', textOnAccent: '#0B0B0D', logoUrl: getLogo('ESP_2') },
  ITA_1: { id: 'ITA_1', shortLabel: 'SERIE A', accentPrimary: '#008FD7', accentSecondary: '#081F4D', bannerBg: '#081D3B', textOnAccent: '#F5F5F7', logoUrl: getLogo('ITA_1') },
  ITA_2: { id: 'ITA_2', shortLabel: 'SERIE BKT', accentPrimary: '#1EA84A', accentSecondary: '#F5F5F7', bannerBg: '#0A2114', textOnAccent: '#0B0B0D', logoUrl: getLogo('ITA_2') },
  GER_1: { id: 'GER_1', shortLabel: 'BUNDESLIGA', accentPrimary: '#D20515', accentSecondary: '#FFFFFF', bannerBg: '#2B0509', textOnAccent: '#F5F5F7', logoUrl: getLogo('GER_1') },
  GER_2: { id: 'GER_2', shortLabel: '2. BUNDESLIGA', accentPrimary: '#D20515', accentSecondary: '#9498A3', bannerBg: '#24070A', textOnAccent: '#F5F5F7', logoUrl: getLogo('GER_2') },
  FRA_1: { id: 'FRA_1', shortLabel: 'LIGUE 1', accentPrimary: '#CEF000', accentSecondary: '#091C3E', bannerBg: '#0B1A33', textOnAccent: '#0B0B0D', logoUrl: getLogo('FRA_1') },
  FRA_2: { id: 'FRA_2', shortLabel: 'LIGUE 2', accentPrimary: '#00C4B3', accentSecondary: '#091C3E', bannerBg: '#092226', textOnAccent: '#0B0B0D', logoUrl: getLogo('FRA_2') },
  POR_1: { id: 'POR_1', shortLabel: 'LIGA PORTUGAL', accentPrimary: '#E5B80B', accentSecondary: '#003399', bannerBg: '#0C1933', textOnAccent: '#0B0B0D', logoUrl: getLogo('POR_1') },
  POR_2: { id: 'POR_2', shortLabel: 'LIGA PORTUGAL 2', accentPrimary: '#C8A45D', accentSecondary: '#003399', bannerBg: '#121826', textOnAccent: '#0B0B0D', logoUrl: getLogo('POR_2') },
  CONMEBOL_POOL: { id: 'CONMEBOL_POOL', shortLabel: 'CONMEBOL', accentPrimary: '#D4AF37', accentSecondary: '#18130A', bannerBg: '#1F1808', textOnAccent: '#0B0B0D', logoUrl: getLogo('LIBERTADORES') },
  UEFA_POOL: { id: 'UEFA_POOL', shortLabel: 'UEFA', accentPrimary: '#3B82F6', accentSecondary: '#071238', bannerBg: '#081438', textOnAccent: '#F5F5F7', logoUrl: getLogo('CHAMPIONS_LEAGUE') },

  // CONTINENTAIS DE CLUBES
  LIBERTADORES: { id: 'LIBERTADORES', shortLabel: 'CONMEBOL LIBERTADORES', accentPrimary: '#D4AF37', accentSecondary: '#12100B', bannerBg: '#231B08', textOnAccent: '#0B0B0D', logoUrl: getLogo('LIBERTADORES') },
  SUL_AMERICANA: { id: 'SUL_AMERICANA', shortLabel: 'CONMEBOL SUL-AMERICANA', accentPrimary: '#0072CE', accentSecondary: '#F2A900', bannerBg: '#081C36', textOnAccent: '#F5F5F7', logoUrl: getLogo('SUL_AMERICANA') },
  CHAMPIONS_LEAGUE: { id: 'CHAMPIONS_LEAGUE', shortLabel: 'UEFA CHAMPIONS LEAGUE', accentPrimary: '#3B82F6', accentSecondary: '#E2E8F0', bannerBg: '#07133A', textOnAccent: '#F5F5F7', logoUrl: getLogo('CHAMPIONS_LEAGUE') },
  EUROPA_LEAGUE: { id: 'EUROPA_LEAGUE', shortLabel: 'UEFA EUROPA LEAGUE', accentPrimary: '#FF6900', accentSecondary: '#12100E', bannerBg: '#261105', textOnAccent: '#0B0B0D', logoUrl: getLogo('EUROPA_LEAGUE') },

  // COMPETIÇÕES OFICIAIS DE SELEÇÕES FIFA
  WORLD_CUP: { id: 'WORLD_CUP', shortLabel: 'COPA DO MUNDO FIFA', accentPrimary: '#E5C158', accentSecondary: '#8A1538', bannerBg: '#231807', textOnAccent: '#0B0B0D', logoUrl: getLogo('WORLD_CUP') },
  WC_QUALIFIERS: { id: 'WC_QUALIFIERS', shortLabel: 'ELIMINATÓRIAS DA COPA', accentPrimary: '#10B981', accentSecondary: '#C8A45D', bannerBg: '#07221B', textOnAccent: '#0B0B0D', logoUrl: getLogo('WC_QUALIFIERS') },
  NATIONS_LEAGUE: { id: 'NATIONS_LEAGUE', shortLabel: 'LIGA DAS NAÇÕES UEFA+CONMEBOL', accentPrimary: '#38BDF8', accentSecondary: '#C8A45D', bannerBg: '#081B2E', textOnAccent: '#0B0B0D', logoUrl: getLogo('NATIONS_LEAGUE') },
  COPA_AMERICA: { id: 'COPA_AMERICA', shortLabel: 'CONMEBOL COPA AMÉRICA', accentPrimary: '#F59E0B', accentSecondary: '#1D4ED8', bannerBg: '#221506', textOnAccent: '#0B0B0D', logoUrl: getLogo('COPA_AMERICA') },
  EURO_CUP: { id: 'EURO_CUP', shortLabel: 'UEFA EUROCOPA', accentPrimary: '#2563EB', accentSecondary: '#FACC15', bannerBg: '#091736', textOnAccent: '#F5F5F7', logoUrl: getLogo('EURO_CUP') },
  INTL_FRIENDLY: { id: 'INTL_FRIENDLY', shortLabel: 'AMISTOSO DATA FIFA', accentPrimary: '#C8A45D', accentSecondary: '#F5F5F7', bannerBg: '#171510', textOnAccent: '#0B0B0D', logoUrl: getLogo('WORLD_CUP') },
};

export function getCompetitionTheme(id: AnyCompetitionId): CompetitionTheme {
  return COMPETITION_THEMES[id] ?? COMPETITION_THEMES.BRA_1;
}
