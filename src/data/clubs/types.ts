import { CountryCode, PositionCode, StarRating } from '../../shared/types/common';
import { LeagueId } from '../leagues/leagues';

export type SquadPosition = 'GK' | PositionCode;

export interface RealSquadStar {
  name: string;
  pos: SquadPosition;
  ovr: number;
}

export interface FullSquadPlayer {
  id: string;
  name: string;
  pos: SquadPosition;
  age: number;
  ovr: number;
  jersey: number;
  nationality: string;
  faceUrl?: string;
}

export interface ClubData {
  id: string;
  name: string;
  shortName: string;
  wikiTitle?: string;
  country: CountryCode;
  leagueId: LeagueId;
  reputationStars: StarRating;
  squadAvgOvr: number;
  youthAcademyName: string;
  youthQuality: number;
  primaryColor: string;
  secondaryColor: string;
  pattern: 'stripes' | 'hoops' | 'halves' | 'diagonal' | 'solid';
  crestUrl?: string;
  squadSize?: number;
  city?: string;
  stadiumName?: string;
  lat?: number;
  lng?: number;
  keyPlayers: RealSquadStar[];
}
