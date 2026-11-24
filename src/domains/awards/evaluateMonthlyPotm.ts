import { getClubById } from '../../data/clubs';
import { SquadPosition } from '../../data/clubs/types';
import { LeagueId, LEAGUES } from '../../data/leagues/leagues';
import rawPool from '../../data/world/worldStarsPool.json';
import { CareerStage } from '../../shared/types/common';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';
import { WorldSeasonState } from '../season/seasonTypes';
import { findClubLeagueIdInWorld } from '../season/worldSeasonEngine';
import { PlayerPeriodStats, PlayerTrophyEntry } from './awardTypes';

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

export interface MonthlyPotmOutcome {
  winnerName: string;
  winnerClubId: string;
  winnerStatLine: string;
  userWon: boolean;
  cashReward: number;
  trophyEntry: PlayerTrophyEntry | null;
}

export function evaluateMonthlyPotm(
  player: CareerPlayer,
  clubId: string,
  stage: CareerStage,
  period: PlayerPeriodStats,
  world: WorldSeasonState,
  season: number,
  week: number,
): MonthlyPotmOutcome {
  const leagueId = findClubLeagueIdInWorld(world, clubId);
  const leagueCfg = LEAGUES[leagueId];
  const standings = world.leagues[leagueId]?.standings ?? [];
  const rankMap = new Map<string, number>();
  standings.forEach((r, idx) => rankMap.set(r.clubId, idx + 1));

  const sector = getPositionSector(player.position);
  const avgStars = period.monthMatches > 0 ? period.monthStarPoints / period.monthMatches : 0;

  // Pontuação justa por setor (Atacante por gols, Meia por G+A+nota, Defensor por nota+vitórias)
  let userScore = 0;
  if (period.monthMatches >= 2) {
    const basePerf = 48 + avgStars * 13 + (player.overall - 60) * 0.45;
    const contribBonus =
      sector === 'ATK'
        ? period.monthGoals * 9 + period.monthAssists * 5
        : sector === 'MID'
          ? period.monthGoals * 7 + period.monthAssists * 8.5
          : period.monthGoals * 10 + period.monthAssists * 7 + avgStars * 5;
    const myClubRank = rankMap.get(clubId) ?? 10;
    const tableBonus = Math.max(0, (10 - myClubRank) * 1.1);
    userScore = basePerf + contribBonus + tableBonus;
  }

  // Candidatos reais da mesma liga
  const leagueCandidates = STARS_POOL.filter(
    (s) => findClubLeagueIdInWorld(world, s.clubId) === leagueId && s.pos !== 'GK',
  );

  let bestAi: { star: PoolStar; score: number; goals: number; assists: number } | null = null;
  for (const s of leagueCandidates) {
    if (stage === 'YOUTH' && s.age > 20) continue;
    const cRank = rankMap.get(s.clubId) ?? 12;
    const formRoll = (Math.random() - 0.35) * 16;
    const base = stage === 'YOUTH' ? Math.min(68, s.ovr) : s.ovr;
    const aiScore = base * 0.92 + Math.max(0, (8 - cRank) * 1.3) + formRoll;
    if (!bestAi || aiScore > bestAi.score) {
      const isAtk = s.pos === 'ATA' || s.pos === 'PD' || s.pos === 'PE' || s.pos === 'SA';
      const goals = isAtk ? Math.max(2, Math.round(2 + Math.random() * 3)) : Math.round(Math.random() * 2);
      const assists = !isAtk ? Math.max(2, Math.round(1 + Math.random() * 3)) : Math.round(Math.random() * 2);
      bestAi = { star: s, score: aiScore, goals, assists };
    }
  }

  const userWon = period.monthMatches >= 2 && (!bestAi || userScore >= bestAi.score);
  const titlePrefix =
    stage === 'YOUTH'
      ? 'JOGADOR DO MÊS (BASE SUB-20)'
      : `MELHOR DO MÊS • ${leagueCfg.name.toUpperCase()}`;

  const cashReward = userWon
    ? stage === 'YOUTH'
      ? 900
      : leagueCfg.division === 1
        ? 18000
        : 6500
    : 0;

  if (userWon) {
    const statLine = `${period.monthMatches}J • ${period.monthGoals}G • ${period.monthAssists}A`;
    return {
      winnerName: player.fullName,
      winnerClubId: clubId,
      winnerStatLine: statLine,
      userWon: true,
      cashReward,
      trophyEntry: {
        id: `potm_${season}_${week}`,
        season,
        week,
        code: 'POTM',
        title: titlePrefix,
        clubId,
        detail: statLine,
      },
    };
  }

  const fallbackClub = bestAi?.star.clubId ?? standings[0]?.clubId ?? clubId;
  const fallbackName = bestAi?.star.name ?? getClubById(fallbackClub).keyPlayers[0]?.name ?? 'Destaque';
  const aiLine = `4J • ${bestAi?.goals ?? 3}G • ${bestAi?.assists ?? 1}A`;

  return {
    winnerName: fallbackName,
    winnerClubId: fallbackClub,
    winnerStatLine: aiLine,
    userWon: false,
    cashReward: 0,
    trophyEntry: null,
  };
}
