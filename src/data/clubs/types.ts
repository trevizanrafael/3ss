import { CountryCode, PositionCode, StarRating } from '../../shared/types/common';
import { LeagueId } from '../leagues/leagues';

export interface RealSquadStar {
  name: string;
  pos: PositionCode;
  ovr: number;
}

export interface ClubData {
  id: string;
  name: string;
  shortName: string;
  wikiTitle: string;
  country: CountryCode;
  leagueId: LeagueId;
  reputationStars: StarRating;
  squadAvgOvr: number;
  youthAcademyName: string;
  youthQuality: number; // 55..94
  primaryColor: string;
  secondaryColor: string;
  pattern: 'stripes' | 'hoops' | 'halves' | 'diagonal' | 'solid';
  keyPlayers: RealSquadStar[];
}
