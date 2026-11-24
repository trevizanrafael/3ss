import { ConfederationCode } from '../../shared/types/common';
import { ContinentalCupId, LeagueId } from '../leagues/leagues';
import rawLogos from './competitionLogos.json';

export type QualifierCompId =
  | 'WCQ_CONMEBOL'
  | 'WCQ_UEFA'
  | 'WCQ_CONCACAF'
  | 'WCQ_CAF'
  | 'WCQ_AFC';

export type InternationalCompId =
  | QualifierCompId
  | 'WC_QUALIFIERS'
  | 'NATIONS_LEAGUE'
  | 'COPA_AMERICA'
  | 'EURO_CUP'
  | 'WORLD_CUP'
  | 'INTL_FRIENDLY';

export type AnyCompetitionId = LeagueId | ContinentalCupId | InternationalCompId;

export type BroadcastMotif =
  | 'SLASHES'
  | 'PRISMS'
  | 'CHEVRONS'
  | 'STARBURST'
  | 'RAYS';

export function getQualifierCompId(confederation: ConfederationCode): QualifierCompId {
  if (confederation === 'UEFA') return 'WCQ_UEFA';
  if (confederation === 'CONCACAF') return 'WCQ_CONCACAF';
  if (confederation === 'CAF') return 'WCQ_CAF';
  if (confederation === 'AFC') return 'WCQ_AFC';
  return 'WCQ_CONMEBOL';
}

export interface CompetitionTheme {
  id: AnyCompetitionId;
  shortLabel: string;
  accentPrimary: string;
  accentSecondary: string;
  bannerBg: string;
  canvasBg: string;
  spotlightSecondary: string;
  motif: BroadcastMotif;
  textOnAccent: string;
  logoUrl: string;
}

const LOGOS = rawLogos as Record<string, { light?: string; dark?: string }>;

function getLogo(id: string): string {
  return LOGOS[id]?.dark || LOGOS[id]?.light || '';
}

export const COMPETITION_THEMES: Record<AnyCompetitionId, CompetitionTheme> = {
  // AMÉRICA DO SUL & MLS
  BRA_1: {
    id: 'BRA_1',
    shortLabel: 'BRASILEIRÃO A',
    accentPrimary: '#00C853',
    accentSecondary: '#FFDF00',
    bannerBg: '#072417',
    canvasBg: '#08130E',
    spotlightSecondary: '#EAB308',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('BRA_1'),
  },
  BRA_2: {
    id: 'BRA_2',
    shortLabel: 'BRASILEIRÃO B',
    accentPrimary: '#10B981',
    accentSecondary: '#F5F5F7',
    bannerBg: '#092016',
    canvasBg: '#091411',
    spotlightSecondary: '#34D399',
    motif: 'SLASHES',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('BRA_2'),
  },
  ARG_1: {
    id: 'ARG_1',
    shortLabel: 'LIGA PROFESIONAL',
    accentPrimary: '#74ACDF',
    accentSecondary: '#F5F5F7',
    bannerBg: '#0B1E32',
    canvasBg: '#09131F',
    spotlightSecondary: '#E2E8F0',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('ARG_1'),
  },
  ARG_2: {
    id: 'ARG_2',
    shortLabel: 'PRIMERA NACIONAL',
    accentPrimary: '#5B9BD5',
    accentSecondary: '#F5F5F7',
    bannerBg: '#0B1A2A',
    canvasBg: '#0A121C',
    spotlightSecondary: '#93C5FD',
    motif: 'SLASHES',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('ARG_2'),
  },
  USA_1: {
    id: 'USA_1',
    shortLabel: 'MLS',
    accentPrimary: '#EF3340',
    accentSecondary: '#1D4ED8',
    bannerBg: '#1E0B16',
    canvasBg: '#110B18',
    spotlightSecondary: '#2563EB',
    motif: 'CHEVRONS',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('USA_1'),
  },

  // EUROPA — CADA LIGA COM SUA ATMOSFERA PRÓPRIA ESTILO FIFA 23!
  ENG_1: {
    id: 'ENG_1',
    shortLabel: 'PREMIER LEAGUE',
    accentPrimary: '#00FF85',
    accentSecondary: '#FF2882',
    bannerBg: '#260E3A',
    canvasBg: '#130920',
    spotlightSecondary: '#A855F7',
    motif: 'PRISMS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('ENG_1'),
  },
  ENG_2: {
    id: 'ENG_2',
    shortLabel: 'EFL CHAMPIONSHIP',
    accentPrimary: '#3B82F6',
    accentSecondary: '#D4AF37',
    bannerBg: '#0C1A36',
    canvasBg: '#0B1222',
    spotlightSecondary: '#C8A45D',
    motif: 'SLASHES',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('ENG_2'),
  },
  ESP_1: {
    id: 'ESP_1',
    shortLabel: 'LALIGA EA SPORTS',
    accentPrimary: '#FF4B44',
    accentSecondary: '#FFFFFF',
    bannerBg: '#2A0C0C',
    canvasBg: '#160B0C',
    spotlightSecondary: '#FB923C',
    motif: 'CHEVRONS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('ESP_1'),
  },
  ESP_2: {
    id: 'ESP_2',
    shortLabel: 'LALIGA HYPERMOTION',
    accentPrimary: '#00A3E0',
    accentSecondary: '#FF4B44',
    bannerBg: '#0A202B',
    canvasBg: '#09151D',
    spotlightSecondary: '#FF4B44',
    motif: 'CHEVRONS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('ESP_2'),
  },
  ITA_1: {
    id: 'ITA_1',
    shortLabel: 'SERIE A',
    accentPrimary: '#0099FF',
    accentSecondary: '#38BDF8',
    bannerBg: '#081D3B',
    canvasBg: '#071124',
    spotlightSecondary: '#22D3EE',
    motif: 'PRISMS',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('ITA_1'),
  },
  ITA_2: {
    id: 'ITA_2',
    shortLabel: 'SERIE BKT',
    accentPrimary: '#22C55E',
    accentSecondary: '#F5F5F7',
    bannerBg: '#0A2114',
    canvasBg: '#0A1510',
    spotlightSecondary: '#86EFAC',
    motif: 'SLASHES',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('ITA_2'),
  },
  // BUNDESLIGA: Cinza-aço técnico + Vermelho vivo + Branco seco igual ao FIFA 23!
  GER_1: {
    id: 'GER_1',
    shortLabel: 'BUNDESLIGA',
    accentPrimary: '#E10600',
    accentSecondary: '#E5E7EB',
    bannerBg: '#2B080C',
    canvasBg: '#16181E',
    spotlightSecondary: '#9CA3AF',
    motif: 'SLASHES',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('GER_1'),
  },
  GER_2: {
    id: 'GER_2',
    shortLabel: '2. BUNDESLIGA',
    accentPrimary: '#D20515',
    accentSecondary: '#9CA3AF',
    bannerBg: '#24070A',
    canvasBg: '#15171C',
    spotlightSecondary: '#6B7280',
    motif: 'SLASHES',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('GER_2'),
  },
  FRA_1: {
    id: 'FRA_1',
    shortLabel: 'LIGUE 1',
    accentPrimary: '#CEF000',
    accentSecondary: '#38BDF8',
    bannerBg: '#0B1A33',
    canvasBg: '#091122',
    spotlightSecondary: '#2563EB',
    motif: 'SLASHES',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('FRA_1'),
  },
  FRA_2: {
    id: 'FRA_2',
    shortLabel: 'LIGUE 2',
    accentPrimary: '#00C4B3',
    accentSecondary: '#091C3E',
    bannerBg: '#092226',
    canvasBg: '#081619',
    spotlightSecondary: '#2DD4BF',
    motif: 'SLASHES',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('FRA_2'),
  },
  POR_1: {
    id: 'POR_1',
    shortLabel: 'LIGA PORTUGAL',
    accentPrimary: '#E5B80B',
    accentSecondary: '#2563EB',
    bannerBg: '#0C1933',
    canvasBg: '#0B1222',
    spotlightSecondary: '#3B82F6',
    motif: 'PRISMS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('POR_1'),
  },
  POR_2: {
    id: 'POR_2',
    shortLabel: 'LIGA PORTUGAL 2',
    accentPrimary: '#C8A45D',
    accentSecondary: '#003399',
    bannerBg: '#121826',
    canvasBg: '#0D121D',
    spotlightSecondary: '#60A5FA',
    motif: 'SLASHES',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('POR_2'),
  },
  CONMEBOL_POOL: {
    id: 'CONMEBOL_POOL',
    shortLabel: 'CONMEBOL',
    accentPrimary: '#D4AF37',
    accentSecondary: '#18130A',
    bannerBg: '#1F1808',
    canvasBg: '#120E07',
    spotlightSecondary: '#F59E0B',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('LIBERTADORES'),
  },
  UEFA_POOL: {
    id: 'UEFA_POOL',
    shortLabel: 'UEFA',
    accentPrimary: '#3B82F6',
    accentSecondary: '#071238',
    bannerBg: '#081438',
    canvasBg: '#060C22',
    spotlightSecondary: '#38BDF8',
    motif: 'STARBURST',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('CHAMPIONS_LEAGUE'),
  },

  // CONTINENTAIS DE CLUBES
  LIBERTADORES: {
    id: 'LIBERTADORES',
    shortLabel: 'CONMEBOL LIBERTADORES',
    accentPrimary: '#EAB308',
    accentSecondary: '#FEF08A',
    bannerBg: '#231B08',
    canvasBg: '#141006',
    spotlightSecondary: '#CA8A04',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('LIBERTADORES'),
  },
  SUL_AMERICANA: {
    id: 'SUL_AMERICANA',
    shortLabel: 'CONMEBOL SUL-AMERICANA',
    accentPrimary: '#0072CE',
    accentSecondary: '#F2A900',
    bannerBg: '#081C36',
    canvasBg: '#081324',
    spotlightSecondary: '#F59E0B',
    motif: 'RAYS',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('SUL_AMERICANA'),
  },
  CHAMPIONS_LEAGUE: {
    id: 'CHAMPIONS_LEAGUE',
    shortLabel: 'UEFA CHAMPIONS LEAGUE',
    accentPrimary: '#38BDF8',
    accentSecondary: '#E2E8F0',
    bannerBg: '#07133A',
    canvasBg: '#050B24',
    spotlightSecondary: '#6366F1',
    motif: 'STARBURST',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('CHAMPIONS_LEAGUE'),
  },
  EUROPA_LEAGUE: {
    id: 'EUROPA_LEAGUE',
    shortLabel: 'UEFA EUROPA LEAGUE',
    accentPrimary: '#FF6900',
    accentSecondary: '#FDBA74',
    bannerBg: '#261105',
    canvasBg: '#160B05',
    spotlightSecondary: '#EA580C',
    motif: 'CHEVRONS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('EUROPA_LEAGUE'),
  },

  // ELIMINATÓRIAS DA COPA DO MUNDO POR CONFEDERAÇÃO
  WCQ_CONMEBOL: {
    id: 'WCQ_CONMEBOL',
    shortLabel: 'ELIMINATÓRIAS CONMEBOL',
    accentPrimary: '#10B981',
    accentSecondary: '#C8A45D',
    bannerBg: '#07221B',
    canvasBg: '#071511',
    spotlightSecondary: '#EAB308',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('WCQ_CONMEBOL'),
  },
  WCQ_UEFA: {
    id: 'WCQ_UEFA',
    shortLabel: 'EUROPEAN QUALIFIERS (UEFA)',
    accentPrimary: '#E11D48',
    accentSecondary: '#38BDF8',
    bannerBg: '#230914',
    canvasBg: '#150812',
    spotlightSecondary: '#2563EB',
    motif: 'STARBURST',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('WCQ_UEFA'),
  },
  WCQ_CONCACAF: {
    id: 'WCQ_CONCACAF',
    shortLabel: 'ELIMINATÓRIAS CONCACAF',
    accentPrimary: '#F59E0B',
    accentSecondary: '#1E3A8A',
    bannerBg: '#211607',
    canvasBg: '#130F08',
    spotlightSecondary: '#3B82F6',
    motif: 'CHEVRONS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('WCQ_CONCACAF'),
  },
  WCQ_CAF: {
    id: 'WCQ_CAF',
    shortLabel: 'ELIMINATÓRIAS ÁFRICA (CAF)',
    accentPrimary: '#16A34A',
    accentSecondary: '#EAB308',
    bannerBg: '#092112',
    canvasBg: '#09150D',
    spotlightSecondary: '#FACC15',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('WCQ_CAF'),
  },
  WCQ_AFC: {
    id: 'WCQ_AFC',
    shortLabel: 'ELIMINATÓRIAS ÁSIA & OCEANIA',
    accentPrimary: '#38BDF8',
    accentSecondary: '#F59E0B',
    bannerBg: '#081B2B',
    canvasBg: '#08131E',
    spotlightSecondary: '#F59E0B',
    motif: 'PRISMS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('WCQ_AFC'),
  },
  WC_QUALIFIERS: {
    id: 'WC_QUALIFIERS',
    shortLabel: 'ELIMINATÓRIAS FIFA',
    accentPrimary: '#C8A45D',
    accentSecondary: '#F5F5F7',
    bannerBg: '#19160E',
    canvasBg: '#100E0A',
    spotlightSecondary: '#E5C158',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('WORLD_CUP'),
  },

  // COPAS DE SELEÇÕES
  WORLD_CUP: {
    id: 'WORLD_CUP',
    shortLabel: 'COPA DO MUNDO FIFA',
    accentPrimary: '#E5C158',
    accentSecondary: '#8A1538',
    bannerBg: '#231807',
    canvasBg: '#150F07',
    spotlightSecondary: '#BE123C',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('WORLD_CUP'),
  },
  NATIONS_LEAGUE: {
    id: 'NATIONS_LEAGUE',
    shortLabel: 'LIGA DAS NAÇÕES UEFA+CONMEBOL',
    accentPrimary: '#38BDF8',
    accentSecondary: '#C8A45D',
    bannerBg: '#081B2E',
    canvasBg: '#071222',
    spotlightSecondary: '#EAB308',
    motif: 'STARBURST',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('NATIONS_LEAGUE'),
  },
  COPA_AMERICA: {
    id: 'COPA_AMERICA',
    shortLabel: 'CONMEBOL COPA AMÉRICA',
    accentPrimary: '#F59E0B',
    accentSecondary: '#1D4ED8',
    bannerBg: '#221506',
    canvasBg: '#130E08',
    spotlightSecondary: '#2563EB',
    motif: 'RAYS',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('COPA_AMERICA'),
  },
  EURO_CUP: {
    id: 'EURO_CUP',
    shortLabel: 'UEFA EUROCOPA',
    accentPrimary: '#3B82F6',
    accentSecondary: '#FACC15',
    bannerBg: '#091736',
    canvasBg: '#071026',
    spotlightSecondary: '#EAB308',
    motif: 'STARBURST',
    textOnAccent: '#F5F5F7',
    logoUrl: getLogo('EURO_CUP'),
  },
  INTL_FRIENDLY: {
    id: 'INTL_FRIENDLY',
    shortLabel: 'AMISTOSO DATA FIFA',
    accentPrimary: '#C8A45D',
    accentSecondary: '#F5F5F7',
    bannerBg: '#171510',
    canvasBg: '#0F0E0C',
    spotlightSecondary: '#94A3B8',
    motif: 'SLASHES',
    textOnAccent: '#0B0B0D',
    logoUrl: getLogo('WORLD_CUP'),
  },
};

export function getCompetitionTheme(id: AnyCompetitionId): CompetitionTheme {
  return COMPETITION_THEMES[id] ?? COMPETITION_THEMES.BRA_1;
}
