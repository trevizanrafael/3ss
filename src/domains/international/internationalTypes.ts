import { InternationalCompId } from '../../data/world/competitionThemes';
import { ConfederationCode } from '../../shared/types/common';
import { ClubStandingRow, ContinentalGroup, FixtureMatch } from '../season/seasonTypes';

export interface QualifierGroupData {
  id: string;
  label: string;
  confederation: ConfederationCode;
  directSpots: number;
  nationsLeagueSpots?: number; // Top 2 da CONMEBOL vão jogar a Liga das Nações com a Europa!
  standings: ClubStandingRow[];
  rounds: FixtureMatch[][];
}

export interface NationalCupTournament {
  compId: InternationalCompId;
  title: string;
  seasonYear: number;
  participantIds: string[];
  conmebolGuestIds?: string[]; // Destaca as 2 seleções CONMEBOL classificadas via Eliminatórias
  groups: ContinentalGroup[];
  leagueBGroups?: ContinentalGroup[]; // Divisão B da Liga das Nações
  roundOf16: FixtureMatch[]; // Usado na Copa do Mundo (32 seleções)
  quarterFinals: FixtureMatch[];
  semiFinals: FixtureMatch[];
  finalMatch: FixtureMatch | null;
  championTeamId: string | null;
}

export interface InternationalHistoryRecord {
  season: number;
  tournamentName: string;
  compId: InternationalCompId;
  championTeamId: string;
  runnerUpTeamId: string;
}

export interface InternationalCycleState {
  cycleIndex: 0 | 1 | 2 | 3; // 0: Elim Turno 1 | 1: Nations + Copa América + Euro | 2: Elim Turno 2 | 3: Copa do Mundo
  qualifiers: QualifierGroupData[];
  conmebolNationsSpots: string[]; // As 2 primeiras da CONMEBOL nas Eliminatórias
  qualifiedWorldCupIds: string[]; // As 32 seleções classificadas para a Copa do Mundo
  nationsLeague: NationalCupTournament | null;
  copaAmerica: NationalCupTournament | null;
  euroCup: NationalCupTournament | null;
  worldCup: NationalCupTournament | null;
  friendlyRounds: FixtureMatch[][]; // Amistosos Data FIFA no ano da Copa
  pastChampions: InternationalHistoryRecord[];
}
