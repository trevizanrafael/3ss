import { ALL_NATIONAL_TEAMS } from '../../data/clubs';
import { SquadPosition } from '../../data/clubs/types';
import { LeagueId, LEAGUES } from '../../data/leagues/leagues';
import rawPool from '../../data/world/worldStarsPool.json';
import { CareerStage } from '../../shared/types/common';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';
import { ContinentalCupData, WorldSeasonState } from '../season/seasonTypes';
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

const PLAYER_NAT_ID_MAP = new Map<string, string>();
for (const nt of ALL_NATIONAL_TEAMS) {
  for (const kp of nt.keyPlayers) {
    PLAYER_NAT_ID_MAP.set(kp.name.toLowerCase(), nt.id);
  }
}

function detRand(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function getLeaguePrestigeMultiplier(lgId: LeagueId, stage: CareerStage): number {
  if (stage === 'YOUTH') return 0.35;
  if (TOP5_EURO.has(lgId)) return 1.0;
  if (lgId === 'POR_1' || lgId === 'BRA_1' || lgId === 'ARG_1' || lgId === 'UEFA_POOL') return 0.84;
  if (lgId === 'USA_1' || lgId === 'CONMEBOL_POOL') return 0.76;
  return 0.56;
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
  cupGoals: number;
  cupAssists: number;
  worldScore: number;
  leagueScore: number;
  uclScore: number;
  libScore: number;
  isUser: boolean;
  faceUrl?: string;
}

function getNationalTrophyBonus(world: WorldSeasonState, natTeamId?: string): number {
  if (!natTeamId || !world.international) return 0;
  const intl = world.international;
  let bonus = 0;
  if (intl.worldCup?.championTeamId === natTeamId) bonus += 26;
  if (intl.copaAmerica?.championTeamId === natTeamId) bonus += 15;
  if (intl.euroCup?.championTeamId === natTeamId) bonus += 16;
  if (intl.nationsLeague?.championTeamId === natTeamId) bonus += 9;
  return bonus;
}

function getClubContinentalStageBonus(cup: ContinentalCupData, clubId: string): number {
  if (!cup.participantIds.includes(clubId)) return -1;
  if (cup.championClubId === clubId) return 10.5;
  if (
    cup.finalMatch &&
    (cup.finalMatch.homeClubId === clubId || cup.finalMatch.awayClubId === clubId)
  ) {
    return 8.0;
  }
  if (cup.semiFinals.some((t) => t.homeClubId === clubId || t.awayClubId === clubId)) return 5.5;
  if (cup.quarterFinals.some((t) => t.homeClubId === clubId || t.awayClubId === clubId)) return 3.2;
  if (cup.roundOf16.some((t) => t.homeClubId === clubId || t.awayClubId === clubId)) return 1.5;
  return 0;
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
  const ucl = world.continentals.CHAMPIONS_LEAGUE;
  const lib = world.continentals.LIBERTADORES;

  // Mapeia os gols reais marcados por cada clube na sua liga nesta temporada!
  const clubGoalsMap = new Map<string, number>();
  const clubGaMap = new Map<string, number>();
  for (const lgData of Object.values(world.leagues)) {
    for (const row of lgData.standings) {
      clubGoalsMap.set(row.clubId, row.goalsFor);
      clubGaMap.set(row.clubId, row.goalsAgainst);
    }
  }

  // Ranking interno dentro de cada clube para não dar o mesmo nº de gols a 2 colegas de ataque!
  const clubAttackOrder = new Map<string, number>();
  const clubAssistOrder = new Map<string, number>();

  const sortedByOvr = [...STARS_POOL].sort((a, b) => b.ovr - a.ovr);

  const candidates: SimCandidate[] = sortedByOvr.map((s) => {
    const currLg = findClubLeagueIdInWorld(world, s.clubId);
    const prestige = getLeaguePrestigeMultiplier(currLg, 'PRO');
    const r1 = detRand(`${world.seasonYear}_g_${s.id}`);
    const r2 = detRand(`${world.seasonYear}_a_${s.id}`);
    const form = (r1 - 0.45) * 9;

    const teamGoals = clubGoalsMap.get(s.clubId) ?? Math.round((s.ovr - 45) * 1.65);
    const teamGa = clubGaMap.get(s.clubId) ?? 38;

    const isStriker = s.pos === 'ATA' || s.pos === 'SA';
    const isWinger = s.pos === 'PD' || s.pos === 'PE';
    const isPlaymaker = s.pos === 'MEI' || s.pos === 'MD' || s.pos === 'ME';
    const isCentralMid = s.pos === 'MC' || s.pos === 'VOL';

    let atkSlot = 0;
    if (isStriker || isWinger) {
      atkSlot = clubAttackOrder.get(s.clubId) ?? 0;
      clubAttackOrder.set(s.clubId, atkSlot + 1);
    }

    let astSlot = 0;
    if (isPlaymaker || isWinger || isCentralMid) {
      astSlot = clubAssistOrder.get(s.clubId) ?? 0;
      clubAssistOrder.set(s.clubId, astSlot + 1);
    }

    const goalShare =
      s.pos === 'GK'
        ? 0
        : isStriker
          ? (atkSlot === 0 ? 0.31 : 0.17) + r1 * 0.14
          : isWinger
            ? (atkSlot === 0 ? 0.22 : 0.14) + r1 * 0.11
            : isPlaymaker
              ? 0.11 + r1 * 0.09
              : isCentralMid
                ? 0.05 + r1 * 0.06
                : 0.02 + r1 * 0.04;

    const assistShare =
      s.pos === 'GK'
        ? 0
        : isPlaymaker
          ? (astSlot === 0 ? 0.22 : 0.13) + r2 * 0.11
          : isWinger
            ? (astSlot === 0 ? 0.19 : 0.12) + r2 * 0.10
            : isStriker
              ? 0.08 + r2 * 0.08
              : isCentralMid
                ? 0.10 + r2 * 0.08
                : s.pos === 'LD' || s.pos === 'LE'
                  ? 0.08 + r2 * 0.07
                  : 0.02 + r2 * 0.03;

    const ovrBoost = Math.max(0.75, (s.ovr - 52) / 30);
    const goals = s.pos === 'GK' ? 0 : Math.max(0, Math.round(teamGoals * goalShare * ovrBoost));
    const assists =
      s.pos === 'GK' ? 0 : Math.max(0, Math.round(teamGoals * 0.78 * assistShare * ovrBoost));

    const rank = clubRankMap.get(s.clubId) ?? 10;
    const wonLeague = leagueChampions.get(currLg) === s.clubId ? 8 : 0;
    const uclStageBonus = getClubContinentalStageBonus(ucl, s.clubId);
    const libStageBonus = getClubContinentalStageBonus(lib, s.clubId);

    const cupMatchesEst = uclStageBonus >= 8 || libStageBonus >= 8 ? 12 : uclStageBonus >= 3 || libStageBonus >= 3 ? 9 : 6;
    const cupGoals =
      uclStageBonus < 0 && libStageBonus < 0
        ? 0
        : Math.max(0, Math.round((goals / 34) * cupMatchesEst * (0.85 + r2 * 0.5)));
    const cupAssists =
      uclStageBonus < 0 && libStageBonus < 0
        ? 0
        : Math.max(0, Math.round((assists / 34) * cupMatchesEst * (0.85 + r1 * 0.5)));

    // Defensores e Goleiros pontuam também pela solidez defensiva do time na liga!
    const defCleanBonus =
      s.pos === 'GK' || s.pos === 'ZAG' || s.pos === 'LD' || s.pos === 'LE' || s.pos === 'VOL'
        ? Math.max(0, (46 - teamGa) * 0.45)
        : 0;

    const rawImpact =
      s.ovr * 1.02 +
      goals * 0.68 +
      assists * 0.56 +
      defCleanBonus +
      Math.max(0, 8 - rank) * 0.9 +
      form * 0.55;

    const natId = PLAYER_NAT_ID_MAP.get(s.name.toLowerCase());
    const natBonus = getNationalTrophyBonus(world, natId);

    const worldScore =
      rawImpact * prestige +
      wonLeague * prestige +
      Math.max(0, uclStageBonus) * 1.45 +
      Math.max(0, libStageBonus) * 1.1 +
      natBonus;

    const leagueScore = rawImpact + wonLeague;
    const uclScore =
      uclStageBonus >= 0 ? s.ovr * 0.95 + cupGoals * 2.8 + cupAssists * 2.1 + uclStageBonus * 1.8 + r1 * 2 : 0;
    const libScore =
      libStageBonus >= 0 ? s.ovr * 0.95 + cupGoals * 2.8 + cupAssists * 2.1 + libStageBonus * 1.8 + r1 * 2 : 0;

    return {
      ...s,
      leagueId: currLg,
      goals,
      assists,
      cupGoals,
      cupAssists,
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
    const wonLg = leagueChampions.get(userLeagueId) === userClubId ? 9 : 0;
    const uclStage = getClubContinentalStageBonus(ucl, userClubId);
    const libStage = getClubContinentalStageBonus(lib, userClubId);

    const userNatId = `nt_${player.nationality.toLowerCase()}`;
    const userNatBonus =
      period.internationalMatches > 0
        ? getNationalTrophyBonus(world, userNatId) +
          period.internationalGoals * 2.2 +
          period.internationalAssists * 1.5
        : 0;

    const clubGoals = Math.max(0, period.seasonGoals - period.internationalGoals);
    const clubAssists = Math.max(0, period.seasonAssists - period.internationalAssists);

    const posImpact =
      sector === 'ATK'
        ? clubGoals * 0.95 + clubAssists * 0.65
        : sector === 'MID'
          ? clubGoals * 0.85 + clubAssists * 1.05 + avgStars * 4
          : clubGoals * 1.1 + clubAssists * 0.8 + avgStars * 8.5;

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
      goals: clubGoals,
      assists: clubAssists,
      cupGoals: period.continentalGoals,
      cupAssists: period.continentalAssists,
      worldScore:
        rawUser * prestige +
        wonLg * prestige +
        Math.max(0, uclStage) * 1.45 +
        Math.max(0, libStage) * 1.1 +
        userNatBonus,
      leagueScore: rawUser + wonLg,
      uclScore:
        uclStage >= 0 && period.continentalMatches > 0
          ? player.overall * 0.92 +
            period.continentalGoals * 3.0 +
            period.continentalAssists * 2.2 +
            uclStage * 1.8 +
            avgStars * 3
          : 0,
      libScore:
        libStage >= 0 && period.continentalMatches > 0
          ? player.overall * 0.92 +
            period.continentalGoals * 3.0 +
            period.continentalAssists * 2.2 +
            libStage * 1.8 +
            avgStars * 3
          : 0,
      isUser: true,
    });
  }

  return candidates;
}
