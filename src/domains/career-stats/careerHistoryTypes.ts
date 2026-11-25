import { LeagueId } from '../../data/leagues/leagues';
import { AnyCompetitionId } from '../../data/world/competitionThemes';
import { CareerStage } from '../../shared/types/common';

export interface ClubSeasonStint {
  clubId: string;
  leagueId: LeagueId;
  stage: CareerStage;
  matches: number;
  goals: number;
  assists: number;
  threeStarMatches: number;
  leagueFinishPosition?: number;
}

export interface SeasonCompetitionCampaignEntry {
  competitionId: AnyCompetitionId;
  competitionLabel?: string;
  teamId: string;
  stageType: 'LEAGUE' | 'KNOCKOUT' | 'QUALIFIERS' | 'FRIENDLY';
  outcomeLabel: string;
  isChampion?: boolean;
  isRunnerUp?: boolean;
  matches: number;
  goals: number;
  assists: number;
  threeStarMatches: number;
}

export interface PlayerSeasonCareerLog {
  seasonNumber: number; // 1, 2, 3...
  seasonYear: number; // 2026, 2027...
  age: number;
  ovrEnd: number;
  stints: ClubSeasonStint[];
  competitions?: SeasonCompetitionCampaignEntry[];
  nationalTeamId: string;
  nationalMatches: number;
  nationalGoals: number;
  nationalAssists: number;
  trophyTitles: string[]; // Títulos coletivos e individuais de fim de ano ganhos naquele ano
}

export interface UserCompetitionStatLine {
  clubId: string;
  matches: number;
  goals: number;
  assists: number;
  threeStarMatches: number;
}

export type UserCompetitionStatsMap = Partial<Record<AnyCompetitionId, UserCompetitionStatLine>>;
