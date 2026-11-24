import { SquadPosition } from '../../data/clubs/types';
import { LeagueId, LEAGUES } from '../../data/leagues/leagues';
import rawPool from '../../data/world/worldStarsPool.json';
import { CareerStage } from '../../shared/types/common';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';
import { WorldSeasonState } from '../season/seasonTypes';
import { findClubLeagueIdInWorld } from '../season/worldSeasonEngine';
import { PlayerPeriodStats } from './awardTypes';

interface PoolStar {
  id: string;
  name: string;
  clubId: string;
  leagueId: LeagueId;
  pos: SquadPosition;
  age: number;
  ovr: number;
  faceUrl?: string;
}

const STARS_POOL = rawPool as PoolStar[];

const TOP5_EURO = new Set<LeagueId>(['ENG_1', 'ESP_1', 'ITA_1', 'GER_1', 'FRA_1']);

export function getLeaguePrestigeMultiplier(lgId: LeagueId, stage: CareerStage): number {
  if (stage === 'YOUTH') return 0.35;
  if (TOP5_EURO.has(lgId)) return 1.0;
  if (lgId === 'POR_1' || lgId === 'BRA_1' || lgId === 'ARG_1' || lgId === 'UEFA_POOL') return 0.84;
  if (lgId === 'USA_1' || lgId === 'CONMEBOL_POOL') return 0.76;
  return 0.56; // 2ªs divisões (impede ganhar Bola de Ouro jogando na Série B!)
}

export function getBootFactor(lgId: LeagueId): number {
  if (TOP5_EURO.has(lgId)) return 2.0;
  if (LEAGUES[lgId]?.division === 1) return 1.5;
  return 1.0;
}

export interface SimCandidate {
  id: string;
  name: string;
  clubId: string;
  leagueId: LeagueId;
  pos: SquadPosition;
  age: number;
  ovr: number;
  goals: number;
  assists: number;
  worldScore: number;
  leagueScore: number;
  uclScore: number;
  libScore: number;
  isUser: boolean;
  faceUrl?: string;
}

export function buildSeasonAwardCandidates(
  player: CareerPlayer,
  userClubId: string,
  stage: CareerStage,
  period: PlayerPeriodStats,
  world: WorldSeasonState,
  leagueChampions: Map<LeagueId, string>,
  clubRankMap: Map<string, number>,
): SimCandidate[] {
  const userLeagueId = findClubLeagueIdInWorld(world, userClubId);
  const uclWinner = world.continentals.CHAMPIONS_LEAGUE.championClubId;
  const libWinner = world.continentals.LIBERTADORES.championClubId;
  const uclClubs = new Set(world.continentals.CHAMPIONS_LEAGUE.participantIds);
  const libClubs = new Set(world.continentals.LIBERTADORES.participantIds);

  const candidates: SimCandidate[] = STARS_POOL.map((s) => {
    const currLg = findClubLeagueIdInWorld(world, s.clubId);
    const prestige = getLeaguePrestigeMultiplier(currLg, 'PRO');
    const isAtk = s.pos === 'ATA' || s.pos === 'PD' || s.pos === 'PE' || s.pos === 'SA';
    const isMid =
      s.pos === 'MEI' || s.pos === 'MC' || s.pos === 'MD' || s.pos === 'ME' || s.pos === 'VOL';
    const form = (Math.random() - 0.42) * 8;

    const goals =
      s.pos === 'GK'
        ? 0
        : isAtk
          ? Math.max(6, Math.round((s.ovr - 56) * 0.82 + form))
          : isMid
            ? Math.max(2, Math.round((s.ovr - 62) * 0.36 + form * 0.5))
            : Math.max(0, Math.round(Math.random() * 4));

    const assists =
      s.pos === 'GK'
        ? 0
        : s.pos === 'MEI' || s.pos === 'PD' || s.pos === 'PE'
          ? Math.max(5, Math.round((s.ovr - 58) * 0.52 + form * 0.6))
          : isMid || isAtk
            ? Math.max(2, Math.round((s.ovr - 62) * 0.34 + form * 0.4))
            : Math.max(0, Math.round(Math.random() * 4));

    const rank = clubRankMap.get(s.clubId) ?? 10;
    const wonLeague = leagueChampions.get(currLg) === s.clubId ? 9 : 0;
    const wonUcl = uclWinner === s.clubId ? 18 : 0;
    const wonLib = libWinner === s.clubId ? 15 : 0;

    const rawImpact =
      s.ovr * 1.05 + goals * 0.65 + assists * 0.55 + Math.max(0, 8 - rank) * 0.9 + form;
    const worldScore = rawImpact * prestige + wonLeague * prestige + wonUcl + wonLib * 0.7;
    const leagueScore = rawImpact + wonLeague;
    const uclScore = uclClubs.has(s.clubId) ? rawImpact + wonUcl * 1.4 : 0;
    const libScore = libClubs.has(s.clubId) ? rawImpact + wonLib * 1.4 : 0;

    return {
      ...s,
      leagueId: currLg,
      goals,
      assists,
      worldScore,
      leagueScore,
      uclScore,
      libScore,
      isUser: false,
    };
  });

  if (stage !== 'YOUTH' && period.seasonMatches >= 5) {
    const prestige = getLeaguePrestigeMultiplier(userLeagueId, stage);
    const sector = getPositionSector(player.position);
    const avgStars = period.seasonStarPoints / Math.max(1, period.seasonMatches);
    const myRank = clubRankMap.get(userClubId) ?? 10;
    const wonLg = leagueChampions.get(userLeagueId) === userClubId ? 10 : 0;
    const wonUcl = uclWinner === userClubId ? 19 : 0;
    const wonLib = libWinner === userClubId ? 16 : 0;

    const posImpact =
      sector === 'ATK'
        ? period.seasonGoals * 0.95 + period.seasonAssists * 0.65
        : sector === 'MID'
          ? period.seasonGoals * 0.85 + period.seasonAssists * 1.05 + avgStars * 4
          : period.seasonGoals * 1.1 + period.seasonAssists * 0.8 + avgStars * 8.5;

    const rawUser =
      player.overall * 0.92 + avgStars * 9 + posImpact + Math.max(0, 8 - myRank) * 1.1;

    candidates.push({
      id: '__USER__',
      name: player.fullName,
      clubId: userClubId,
      leagueId: userLeagueId,
      pos: player.position,
      age: player.age,
      ovr: player.overall,
      goals: period.seasonGoals,
      assists: period.seasonAssists,
      worldScore: rawUser * prestige + wonLg * prestige + wonUcl + wonLib * 0.75,
      leagueScore: rawUser + wonLg,
      uclScore:
        uclClubs.has(userClubId) && period.continentalMatches > 0
          ? rawUser + period.continentalGoals * 2.5 + wonUcl * 1.4
          : 0,
      libScore:
        libClubs.has(userClubId) && period.continentalMatches > 0
          ? rawUser + period.continentalGoals * 2.5 + wonLib * 1.4
          : 0,
      isUser: true,
    });
  }

  return candidates;
}
