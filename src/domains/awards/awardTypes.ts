import { SquadPosition } from '../../data/clubs/types';
import { LeagueId } from '../../data/leagues/leagues';

export type AwardCode =
  | 'BALLON_DOR'
  | 'GOLDEN_BOY'
  | 'GOLDEN_BOOT'
  | 'GOLDEN_PLAYMAKER'
  | 'UCL_BEST'
  | 'REI_DA_AMERICA'
  | 'LEAGUE_MVP'
  | 'LEAGUE_YOUNG_PLAYER'
  | 'LEAGUE_TOTS'
  | 'POTM'
  | 'COLLECTIVE_TROPHY';

export interface AwardNominee {
  playerId: string;
  playerName: string;
  clubId: string;
  pos: SquadPosition;
  age: number;
  ovr: number;
  statLine: string; // ex: "31 GOLS • 9 ASSIST" ou "84 PTS • NOTA 3★"
  score: number;
  isUser: boolean;
  faceUrl?: string;
}

export interface SeasonAwardResult {
  code: AwardCode;
  title: string;
  subtitle: string;
  podium: AwardNominee[]; // Top 3 (1º, 2º, 3º)
  userRank: number | null; // 1, 2, 3 ou null
  cashReward: number;
}

export interface TeamOfTheSeasonSlot {
  pos: SquadPosition;
  playerName: string;
  clubId: string;
  ovr: number;
  isUser: boolean;
}

export interface SeasonAwardsGalaReport {
  season: number;
  leagueId: LeagueId;
  majorAwards: SeasonAwardResult[];
  leagueTots: TeamOfTheSeasonSlot[];
  userInTots: boolean;
  totalCashWon: number;
  prestigeBoostEarned: number;
}

export interface PlayerTrophyEntry {
  id: string;
  season: number;
  week?: number;
  code: AwardCode;
  title: string;
  clubId: string;
  detail: string;
}

export interface PlayerPeriodStats {
  monthMatches: number;
  monthGoals: number;
  monthAssists: number;
  monthStarPoints: number; // Soma de estrelas (0..3 por jogo)
  seasonMatches: number;
  seasonGoals: number;
  seasonAssists: number;
  seasonStarPoints: number;
  seasonThreeStarMatches: number;
  continentalMatches: number;
  continentalGoals: number;
  continentalAssists: number;
  internationalMatches: number;
  internationalGoals: number;
  internationalAssists: number;
}

export const INITIAL_PERIOD_STATS: PlayerPeriodStats = {
  monthMatches: 0,
  monthGoals: 0,
  monthAssists: 0,
  monthStarPoints: 0,
  seasonMatches: 0,
  seasonGoals: 0,
  seasonAssists: 0,
  seasonStarPoints: 0,
  seasonThreeStarMatches: 0,
  continentalMatches: 0,
  continentalGoals: 0,
  continentalAssists: 0,
  internationalMatches: 0,
  internationalGoals: 0,
  internationalAssists: 0,
};
