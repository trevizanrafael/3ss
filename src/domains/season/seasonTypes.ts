import { ContinentalCupId, LeagueId } from '../../data/leagues/leagues';
import { AnyCompetitionId } from '../../data/world/competitionThemes';

export interface ClubStandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface FixtureMatch {
  id: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  played: boolean;
  winnerId?: string; // Em caso de final única com pênaltis
}

export interface LeagueSeasonData {
  leagueId: LeagueId;
  clubIds: string[];
  standings: ClubStandingRow[];
  rounds: FixtureMatch[][];
}

export interface ContinentalGroup {
  groupName: string; // 'GRUPO A' .. 'GRUPO H'
  standings: ClubStandingRow[];
  rounds: FixtureMatch[][]; // 6 rodadas
}

export interface KnockoutTie {
  id: string;
  homeClubId: string;
  awayClubId: string;
  leg1Home: number | null;
  leg1Away: number | null;
  leg2Home: number | null;
  leg2Away: number | null;
  winnerClubId: string | null;
}

export interface ContinentalCupData {
  cupId: ContinentalCupId;
  participantIds: string[];
  groups: ContinentalGroup[];
  roundOf16: KnockoutTie[];
  quarterFinals: KnockoutTie[];
  semiFinals: KnockoutTie[];
  finalMatch: FixtureMatch | null;
  championClubId: string | null;
}

export interface ScheduledClubFixture {
  competitionId: AnyCompetitionId;
  isContinental: boolean;
  stageLabel: string;
  opponentId: string;
  isHome: boolean;
  dayOfWeek: 3 | 6; // Quarta (3) = Continental | Sábado (6) = Liga Nacional
}

export interface SeasonHistoryRecord {
  season: number;
  playerClubId: string;
  leagueId: LeagueId;
  leaguePosition: number;
  leagueChampionId: string;
  championsLeagueWinnerId: string | null;
  libertadoresWinnerId: string | null;
  goals: number;
  assists: number;
}

export interface WorldSeasonState {
  seasonYear: number;
  leagues: Record<LeagueId, LeagueSeasonData>;
  continentals: Record<ContinentalCupId, ContinentalCupData>;
  history: SeasonHistoryRecord[];
}
