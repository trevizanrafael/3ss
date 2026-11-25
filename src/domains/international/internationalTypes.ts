import { InternationalCompId } from '../../data/world/competitionThemes';
import { ConfederationCode, LeagueCountryCode } from '../../shared/types/common';
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
  editionYear?: number; // Ex: 2030, 2034, 2038...
  hostCountry?: LeagueCountryCode; // País-sede com estádios reais cadastrados!
  participantIds: string[];
  conmebolGuestIds?: string[];
  groups: ContinentalGroup[];
  leagueBGroups?: ContinentalGroup[];
  roundOf16: FixtureMatch[];
  quarterFinals: FixtureMatch[];
  semiFinals: FixtureMatch[];
  finalMatch: FixtureMatch | null;
  championTeamId: string | null;
}

export interface InternationalHistoryRecord {
  season: number;
  editionYear?: number;
  hostCountry?: LeagueCountryCode;
  tournamentName: string;
  compId: InternationalCompId;
  championTeamId: string;
  runnerUpTeamId: string;
}

export interface InternationalCycleState {
  cycleIndex: 0 | 1 | 2 | 3; // 0: Elim Turno 1 | 1: Nations + Copa América + Euro | 2: Elim Turno 2 | 3: Copa do Mundo
  nextWorldCupHost?: LeagueCountryCode; // País-sede já definido para a Copa deste ciclo de 4 anos!
  qualifiers: QualifierGroupData[];
  conmebolNationsSpots: string[];
  qualifiedWorldCupIds: string[];
  nationsLeague: NationalCupTournament | null;
  copaAmerica: NationalCupTournament | null;
  euroCup: NationalCupTournament | null;
  worldCup: NationalCupTournament | null;
  friendlyRounds: FixtureMatch[][];
  pastChampions: InternationalHistoryRecord[];
}
