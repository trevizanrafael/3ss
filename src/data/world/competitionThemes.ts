import { ContinentalCupId, LeagueId } from '../leagues/leagues';
import rawLogos from './competitionLogos.json';

export type AnyCompetitionId = LeagueId | ContinentalCupId;

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
  // BRASIL
  BRA_1: { id: 'BRA_1', shortLabel: 'BRASILEIRÃO A', accentPrimary: '#00A859', accentSecondary: '#FFDF00', bannerBg: '#072417', textOnAccent: '#0B0B0D', logoUrl: getLogo('BRA_1') },
  BRA_2: { id: 'BRA_2', shortLabel: 'BRASILEIRÃO B', accentPrimary: '#009C3B', accentSecondary: '#F5F5F7', bannerBg: '#092016', textOnAccent: '#0B0B0D', logoUrl: getLogo('BRA_2') },

  // ARGENTINA
  ARG_1: { id: 'ARG_1', shortLabel: 'LIGA PROFESIONAL', accentPrimary: '#74ACDF', accentSecondary: '#F5F5F7', bannerBg: '#0B1E32', textOnAccent: '#0B0B0D', logoUrl: getLogo('ARG_1') },
  ARG_2: { id: 'ARG_2', shortLabel: 'PRIMERA NACIONAL', accentPrimary: '#5B9BD5', accentSecondary: '#F5F5F7', bannerBg: '#0B1A2A', textOnAccent: '#0B0B0D', logoUrl: getLogo('ARG_2') },

  // MLS
  USA_1: { id: 'USA_1', shortLabel: 'MLS', accentPrimary: '#E2231A', accentSecondary: '#002F6C', bannerBg: '#1E0B16', textOnAccent: '#F5F5F7', logoUrl: getLogo('USA_1') },

  // INGLATERRA (Premier League Purple + Neon Mint!)
  ENG_1: { id: 'ENG_1', shortLabel: 'PREMIER LEAGUE', accentPrimary: '#00FF85', accentSecondary: '#3D195B', bannerBg: '#260E3A', textOnAccent: '#0B0B0D', logoUrl: getLogo('ENG_1') },
  ENG_2: { id: 'ENG_2', shortLabel: 'EFL CHAMPIONSHIP', accentPrimary: '#1D63DC', accentSecondary: '#D4AF37', bannerBg: '#0C1A36', textOnAccent: '#F5F5F7', logoUrl: getLogo('ENG_2') },

  // ESPANHA (LaLiga Coral Red!)
  ESP_1: { id: 'ESP_1', shortLabel: 'LALIGA EA SPORTS', accentPrimary: '#FF4B44', accentSecondary: '#FFFFFF', bannerBg: '#2A0C0C', textOnAccent: '#0B0B0D', logoUrl: getLogo('ESP_1') },
  ESP_2: { id: 'ESP_2', shortLabel: 'LALIGA HYPERMOTION', accentPrimary: '#00A3E0', accentSecondary: '#FF4B44', bannerBg: '#0A202B', textOnAccent: '#0B0B0D', logoUrl: getLogo('ESP_2') },

  // ITÁLIA (Serie A Electric Azure!)
  ITA_1: { id: 'ITA_1', shortLabel: 'SERIE A', accentPrimary: '#008FD7', accentSecondary: '#081F4D', bannerBg: '#081D3B', textOnAccent: '#F5F5F7', logoUrl: getLogo('ITA_1') },
  ITA_2: { id: 'ITA_2', shortLabel: 'SERIE BKT', accentPrimary: '#1EA84A', accentSecondary: '#F5F5F7', bannerBg: '#0A2114', textOnAccent: '#0B0B0D', logoUrl: getLogo('ITA_2') },

  // ALEMANHA (Bundesliga Iconic Crimson Red + White!)
  GER_1: { id: 'GER_1', shortLabel: 'BUNDESLIGA', accentPrimary: '#D20515', accentSecondary: '#FFFFFF', bannerBg: '#2B0509', textOnAccent: '#F5F5F7', logoUrl: getLogo('GER_1') },
  GER_2: { id: 'GER_2', shortLabel: '2. BUNDESLIGA', accentPrimary: '#D20515', accentSecondary: '#9498A3', bannerBg: '#24070A', textOnAccent: '#F5F5F7', logoUrl: getLogo('GER_2') },

  // FRANÇA (Ligue 1 Volt Lime!)
  FRA_1: { id: 'FRA_1', shortLabel: 'LIGUE 1', accentPrimary: '#CEF000', accentSecondary: '#091C3E', bannerBg: '#0B1A33', textOnAccent: '#0B0B0D', logoUrl: getLogo('FRA_1') },
  FRA_2: { id: 'FRA_2', shortLabel: 'LIGUE 2', accentPrimary: '#00C4B3', accentSecondary: '#091C3E', bannerBg: '#092226', textOnAccent: '#0B0B0D', logoUrl: getLogo('FRA_2') },

  // PORTUGAL
  POR_1: { id: 'POR_1', shortLabel: 'LIGA PORTUGAL', accentPrimary: '#E5B80B', accentSecondary: '#003399', bannerBg: '#0C1933', textOnAccent: '#0B0B0D', logoUrl: getLogo('POR_1') },
  POR_2: { id: 'POR_2', shortLabel: 'LIGA PORTUGAL 2', accentPrimary: '#C8A45D', accentSecondary: '#003399', bannerBg: '#121826', textOnAccent: '#0B0B0D', logoUrl: getLogo('POR_2') },

  // POOLS
  CONMEBOL_POOL: { id: 'CONMEBOL_POOL', shortLabel: 'CONMEBOL', accentPrimary: '#D4AF37', accentSecondary: '#18130A', bannerBg: '#1F1808', textOnAccent: '#0B0B0D', logoUrl: getLogo('LIBERTADORES') },
  UEFA_POOL: { id: 'UEFA_POOL', shortLabel: 'UEFA', accentPrimary: '#3B82F6', accentSecondary: '#071238', bannerBg: '#081438', textOnAccent: '#F5F5F7', logoUrl: getLogo('CHAMPIONS_LEAGUE') },

  // CONTINENTAIS OFICIAIS
  LIBERTADORES: { id: 'LIBERTADORES', shortLabel: 'CONMEBOL LIBERTADORES', accentPrimary: '#D4AF37', accentSecondary: '#12100B', bannerBg: '#231B08', textOnAccent: '#0B0B0D', logoUrl: getLogo('LIBERTADORES') },
  SUL_AMERICANA: { id: 'SUL_AMERICANA', shortLabel: 'CONMEBOL SUL-AMERICANA', accentPrimary: '#0072CE', accentSecondary: '#F2A900', bannerBg: '#081C36', textOnAccent: '#F5F5F7', logoUrl: getLogo('SUL_AMERICANA') },
  CHAMPIONS_LEAGUE: { id: 'CHAMPIONS_LEAGUE', shortLabel: 'UEFA CHAMPIONS LEAGUE', accentPrimary: '#3B82F6', accentSecondary: '#E2E8F0', bannerBg: '#07133A', textOnAccent: '#F5F5F7', logoUrl: getLogo('CHAMPIONS_LEAGUE') },
  EUROPA_LEAGUE: { id: 'EUROPA_LEAGUE', shortLabel: 'UEFA EUROPA LEAGUE', accentPrimary: '#FF6900', accentSecondary: '#12100E', bannerBg: '#261105', textOnAccent: '#0B0B0D', logoUrl: getLogo('EUROPA_LEAGUE') },
};

export function getCompetitionTheme(id: AnyCompetitionId): CompetitionTheme {
  return COMPETITION_THEMES[id] ?? COMPETITION_THEMES.BRA_1;
}
