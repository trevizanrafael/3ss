import { ContinentalCupId, LeagueId } from '../../data/leagues/leagues';
import { AnyCompetitionId } from '../../data/world/competitionThemes';
import { LeagueCountryCode, SquadRole } from '../../shared/types/common';
import { InternationalCycleState } from '../international/internationalTypes';

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
  penHome?: number | null;
  penAway?: number | null;
  played: boolean;
  winnerId?: string;
}

export interface LeagueSeasonData {
  leagueId: LeagueId;
  clubIds: string[];
  standings: ClubStandingRow[];
  rounds: FixtureMatch[][];
}

export interface ContinentalGroup {
  groupName: string;
  standings: ClubStandingRow[];
  rounds: FixtureMatch[][];
}

export interface KnockoutTie {
  id: string;
  homeClubId: string;
  awayClubId: string;
  leg1Home: number | null;
  leg1Away: number | null;
  leg2Home: number | null;
  leg2Away: number | null;
  penHome?: number | null;
  penAway?: number | null;
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
  isNationalTeam?: boolean;
  myTeamId?: string;
  nationalRole?: SquadRole;
  stageLabel: string;
  opponentId: string;
  isHome: boolean;
  /** True em Copas de Sede Única (ex: Copa do Mundo), sem mando de casa/fora! */
  neutralVenue?: boolean;
  venueStadiumName?: string;
  venueCity?: string;
  venueCountry?: LeagueCountryCode;
  venueCountryName?: string;
  venueLat?: number;
  venueLng?: number;
  dayOfWeek: 3 | 6 | 7;
  /** True quando este jogo decide mata-mata (jogo único eliminatório ou jogo de VOLTA)! */
  decidesKnockout?: boolean;
  /** Placar da IDA (na perspectiva do time do usuário) quando for jogo de VOLTA */
  prevLegMyGoals?: number;
  prevLegOppGoals?: number;
}

export interface SeasonHistoryRecord {
  season: number;
  playerClubId: string;
  leagueId: LeagueId;
  leaguePosition: number;
  leagueChampionId: string;
  championsLeagueWinnerId: string | null;
  libertadoresWinnerId: string | null;
  worldCupWinnerId?: string | null;
  internationalCupLabel?: string;
  goals: number;
  assists: number;
}

export interface WorldSeasonState {
  seasonYear: number;
  leagues: Record<LeagueId, LeagueSeasonData>;
  continentals: Record<ContinentalCupId, ContinentalCupData>;
  international: InternationalCycleState;
  history: SeasonHistoryRecord[];
}
