export type StarRating = 0 | 1 | 2 | 3;

export type PositionCode =
  | 'ATA'
  | 'SA'
  | 'PD'
  | 'PE'
  | 'MEI'
  | 'MC'
  | 'VOL'
  | 'MD'
  | 'ME'
  | 'LD'
  | 'LE'
  | 'ZAG';

export type PositionSector = 'ATK' | 'MID' | 'DEF';

export type PreferredFoot = 'DIREITA' | 'ESQUERDA' | 'AMBAS';

export type LeagueCountryCode =
  | 'BRA'
  | 'ARG'
  | 'ESP'
  | 'ENG'
  | 'ITA'
  | 'GER'
  | 'FRA'
  | 'POR'
  | 'USA';

export type CountryCode =
  | LeagueCountryCode
  | 'URU' | 'COL' | 'ECU' | 'PAR' | 'VEN' | 'CHI' | 'PER' | 'BOL'
  | 'NED' | 'BEL' | 'CRO' | 'SUI' | 'DEN' | 'AUT' | 'TUR' | 'SRB'
  | 'UKR' | 'POL' | 'SWE' | 'NOR' | 'SCO' | 'CZE' | 'GRE' | 'HUN' | 'ROU' | 'WAL'
  | 'MEX' | 'CAN' | 'PAN' | 'CRC' | 'JAM' | 'HON' | 'SLV'
  | 'MAR' | 'SEN' | 'NGA' | 'EGY' | 'CIV' | 'ALG' | 'CMR' | 'MLI' | 'TUN' | 'GHA' | 'RSA' | 'COD'
  | 'JPN' | 'KOR' | 'IRN' | 'AUS' | 'KSA' | 'QAT' | 'UZB' | 'IRQ' | 'UAE' | 'NZL';

export type ConfederationCode = 'CONMEBOL' | 'UEFA' | 'CONCACAF' | 'CAF' | 'AFC';

export type CareerStage = 'YOUTH' | 'PRO' | 'LOAN';

export type SquadRole =
  | 'BASE_RESERVA'
  | 'BASE_TITULAR'
  | 'PROMESSA'
  | 'RESERVA'
  | 'TITULAR'
  | 'ESTRELA';

export interface CalendarDate {
  season: number; // ex: 2026
  week: number;   // 1..43
  day: number;    // 1 (Seg) .. 7 (Dom)
}

export const DAYS_OF_WEEK = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const;
