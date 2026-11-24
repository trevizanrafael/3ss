import { ALL_NATIONAL_TEAMS } from '../../data/clubs';
import { SquadPosition } from '../../data/clubs/types';
import { LeagueId, LEAGUES } from '../../data/leagues/leagues';
import rawPool from '../../data/world/worldStarsPool.json';
import { CareerStage } from '../../shared/types/common';
import { clamp } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { UserCompetitionStatsMap } from '../career-stats/careerHistoryTypes';
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
  /** Gols totais na temporada inteira (Liga + Copa Continental + Seleção) -> Bola de Ouro & Golden Boy */
  totalGoals: number;
  totalAssists: number;
  /** Gols exclusivos na Liga Nacional -> Craque da Liga, Jovem da Liga e Chuteira de Ouro */
  leagueGoals: number;
  leagueAssists: number;
  /** Gols exclusivos na Champions / Libertadores -> Craque da Champions & Rei da América */
  cupGoals: number;
  cupAssists: number;
  worldScore: number;
  leagueScore: number;
  totsScore: number;
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

function getClubContinentalStageInfo(
  cup: ContinentalCupData,
  clubId: string,
): { stageBonus: number; matchesPlayed: number } {
  if (!cup.participantIds.includes(clubId)) return { stageBonus: -1, matchesPlayed: 0 };
  if (cup.championClubId === clubId) return { stageBonus: 11.5, matchesPlayed: 13 };
  if (
    cup.finalMatch &&
    (cup.finalMatch.homeClubId === clubId || cup.finalMatch.awayClubId === clubId)
  ) {
    return { stageBonus: 8.8, matchesPlayed: 13 };
  }
  if (cup.semiFinals.some((t) => t.homeClubId === clubId || t.awayClubId === clubId)) {
    return { stageBonus: 6.2, matchesPlayed: 12 };
  }
  if (cup.quarterFinals.some((t) => t.homeClubId === clubId || t.awayClubId === clubId)) {
    return { stageBonus: 3.8, matchesPlayed: 10 };
  }
  if (cup.roundOf16.some((t) => t.homeClubId === clubId || t.awayClubId === clubId)) {
    return { stageBonus: 1.8, matchesPlayed: 8 };
  }
  return { stageBonus: 0, matchesPlayed: 6 };
}

export function buildSeasonAwardCandidates(
  player: CareerPlayer,
  userClubId: string,
  stage: CareerStage,
  period: PlayerPeriodStats,
  world: WorldSeasonState,
  leagueChampions: Map<LeagueId, string>,
  clubRankMap: Map<string, number>,
  userCompStats?: UserCompetitionStatsMap,
): SimCandidate[] {
  const userLeagueId = findClubLeagueIdInWorld(world, userClubId);
  const ucl = world.continentals.CHAMPIONS_LEAGUE;
  const lib = world.continentals.LIBERTADORES;

  const clubGoalsMap = new Map<string, number>();
  const clubGaMap = new Map<string, number>();
  for (const lgData of Object.values(world.leagues)) {
    for (const row of lgData.standings) {
      clubGoalsMap.set(row.clubId, row.goalsFor);
      clubGaMap.set(row.clubId, row.goalsAgainst);
    }
  }

  // Topo de Overall relativo de cada liga para que artilheiros de BRA_1 / ARG_1 / POR_1 façam 18..26 gols reais!
  const leagueMaxOvr = new Map<LeagueId, number>();
  for (const s of STARS_POOL) {
    const lg = findClubLeagueIdInWorld(world, s.clubId);
    const prev = leagueMaxOvr.get(lg) ?? 75;
    if (s.ovr > prev) leagueMaxOvr.set(lg, s.ovr);
  }

  // Slots separados por função dentro de cada clube (Ponta não rouba a cota de gols do Camisa 9!)
  const clubStrikerOrder = new Map<string, number>();
  const clubWingerOrder = new Map<string, number>();
  const clubCreatorOrder = new Map<string, number>();

  const sortedByOvr = [...STARS_POOL].sort((a, b) => b.ovr - a.ovr);

  const candidates: SimCandidate[] = sortedByOvr.map((s) => {
    const currLg = findClubLeagueIdInWorld(world, s.clubId);
    const prestige = getLeaguePrestigeMultiplier(currLg, 'PRO');
    const r1 = detRand(`${world.seasonYear}_g_${s.id}`);
    const r2 = detRand(`${world.seasonYear}_a_${s.id}`);
    const r3 = detRand(`${world.seasonYear}_c_${s.id}`);
    const form = (r1 - 0.42) * 10;

    const topLgOvr = leagueMaxOvr.get(currLg) ?? 80;
    const u21Breakout = s.age <= 21 && r1 > 0.45 ? 0.16 : s.age <= 21 ? 0.08 : 0;
    const relStar = clamp(1.04 - (topLgOvr - s.ovr) * 0.036 + u21Breakout, 0.72, 1.18);

    // Gols reais marcados pelo clube na liga (ou estimativa realista de 52..66 para pools continentais)
    const rawTeamGoals = clubGoalsMap.get(s.clubId);
    const teamGoals =
      rawTeamGoals && rawTeamGoals > 0
        ? Math.max(36, rawTeamGoals)
        : Math.round(48 + (s.ovr - 70) * 1.15);
    const teamGa = clubGaMap.get(s.clubId) ?? 38;

    const isStriker = s.pos === 'ATA' || s.pos === 'SA';
    const isWinger = s.pos === 'PD' || s.pos === 'PE';
    const isPlaymaker = s.pos === 'MEI' || s.pos === 'MD' || s.pos === 'ME';
    const isCentralMid = s.pos === 'MC' || s.pos === 'VOL';

    let strkSlot = 0;
    if (isStriker) {
      strkSlot = clubStrikerOrder.get(s.clubId) ?? 0;
      clubStrikerOrder.set(s.clubId, strkSlot + 1);
    }

    let wingSlot = 0;
    if (isWinger) {
      wingSlot = clubWingerOrder.get(s.clubId) ?? 0;
      clubWingerOrder.set(s.clubId, wingSlot + 1);
    }

    let astSlot = 0;
    if (isPlaymaker || isWinger || isCentralMid) {
      astSlot = clubCreatorOrder.get(s.clubId) ?? 0;
      clubCreatorOrder.set(s.clubId, astSlot + 1);
    }

    const goalShare =
      s.pos === 'GK'
        ? 0
        : isStriker
          ? (strkSlot === 0 ? 0.34 : 0.19) + r1 * 0.14
          : isWinger
            ? (wingSlot === 0 ? 0.24 : 0.15) + r1 * 0.12
            : isPlaymaker
              ? 0.13 + r1 * 0.10
              : isCentralMid
                ? 0.05 + r1 * 0.06
                : 0.02 + r1 * 0.04;

    const assistShare =
      s.pos === 'GK'
        ? 0
        : isPlaymaker
          ? (astSlot === 0 ? 0.24 : 0.15) + r2 * 0.12
          : isWinger
            ? (astSlot <= 1 ? 0.21 : 0.13) + r2 * 0.11
            : isStriker
              ? 0.09 + r2 * 0.09
              : isCentralMid
                ? 0.11 + r2 * 0.09
                : s.pos === 'LD' || s.pos === 'LE'
                  ? 0.09 + r2 * 0.08
                  : 0.02 + r2 * 0.03;

    const leagueGoals =
      s.pos === 'GK' ? 0 : Math.max(0, Math.round(teamGoals * goalShare * relStar));
    const leagueAssists =
      s.pos === 'GK' ? 0 : Math.max(0, Math.round(teamGoals * 0.82 * assistShare * relStar));

    const rank = clubRankMap.get(s.clubId) ?? 10;
    const wonLeague = leagueChampions.get(currLg) === s.clubId ? 4.5 : 0;
    const uclInfo = getClubContinentalStageInfo(ucl, s.clubId);
    const libInfo = getClubContinentalStageInfo(lib, s.clubId);
    const activeCupMatches = Math.max(uclInfo.matchesPlayed, libInfo.matchesPlayed);

    // Gols e assistências realistas em Champions e Libertadores (artilheiros fazem 8..13 gols em 12..13 jogos!)
    const cupGoalPerMatch =
      s.pos === 'GK'
        ? 0
        : isStriker
          ? (strkSlot === 0 ? 0.62 : 0.36) + r3 * 0.28
          : isWinger
            ? (wingSlot === 0 ? 0.46 : 0.28) + r3 * 0.24
            : isPlaymaker
              ? 0.26 + r3 * 0.20
              : isCentralMid
                ? 0.11 + r3 * 0.10
                : 0.05 + r3 * 0.06;

    const cupAssistPerMatch =
      s.pos === 'GK'
        ? 0
        : isPlaymaker || isWinger
          ? 0.32 + r2 * 0.26
          : isStriker || isCentralMid
            ? 0.18 + r2 * 0.18
            : 0.08 + r2 * 0.10;

    const cupGoals =
      activeCupMatches === 0
        ? 0
        : Math.max(0, Math.round(activeCupMatches * cupGoalPerMatch * relStar));
    const cupAssists =
      activeCupMatches === 0
        ? 0
        : Math.max(0, Math.round(activeCupMatches * cupAssistPerMatch * relStar));

    const natId = PLAYER_NAT_ID_MAP.get(s.name.toLowerCase());
    const natBonus = getNationalTrophyBonus(world, natId);
    const intlGoalsEst =
      natId && s.pos !== 'GK' && (isStriker || isWinger || isPlaymaker)
        ? Math.round((isStriker ? 3.2 : 1.8) * (0.6 + r1 * 0.8))
        : 0;
    const intlAssistsEst =
      natId && s.pos !== 'GK' && (isPlaymaker || isWinger)
        ? Math.round(2.2 * (0.5 + r2 * 0.8))
        : 0;

    const totalGoals = leagueGoals + cupGoals + intlGoalsEst;
    const totalAssists = leagueAssists + cupAssists + intlAssistsEst;

    // Bônus defensivo pesa forte na Seleção dos 11 Ideais (totsScore), sem fazer volante 2G/3A ganhar Craque da Liga!
    const defCleanBonus =
      s.pos === 'GK' || s.pos === 'ZAG' || s.pos === 'LD' || s.pos === 'LE' || s.pos === 'VOL'
        ? Math.max(0, (48 - teamGa) * 0.65)
        : 0;

    // Score do Craque / Jovem da Liga: protagonismo real em campo (gols, assistências, vitórias e nível técnico)
    const leagueScore =
      s.ovr * 0.82 +
      leagueGoals * 1.65 +
      leagueAssists * 1.35 +
      defCleanBonus * 0.22 +
      Math.max(0, 7 - rank) * 0.85 +
      wonLeague +
      form * 0.45;

    // Score dos 11 Ideais (TOTS): valoriza paredões na defesa/gol e artilheiros/garçons no ataque
    const totsScore =
      s.ovr * 0.95 +
      leagueGoals * 1.35 +
      leagueAssists * 1.15 +
      defCleanBonus +
      Math.max(0, 8 - rank) * 0.9 +
      wonLeague;

    const worldRaw =
      s.ovr * 0.96 +
      totalGoals * 0.95 +
      totalAssists * 0.78 +
      defCleanBonus * 0.35 +
      Math.max(0, 7 - rank) * 0.8 +
      form * 0.45;

    const worldScore =
      worldRaw * prestige +
      wonLeague * 1.5 * prestige +
      Math.max(0, uclInfo.stageBonus) * 1.5 +
      Math.max(0, libInfo.stageBonus) * 1.15 +
      natBonus;

    const uclScore =
      uclInfo.stageBonus >= 0
        ? s.ovr * 0.82 +
          cupGoals * 3.9 +
          cupAssists * 2.7 +
          uclInfo.stageBonus * 1.7 +
          r3 * 2
        : 0;

    const libScore =
      libInfo.stageBonus >= 0
        ? s.ovr * 0.82 +
          cupGoals * 3.9 +
          cupAssists * 2.7 +
          libInfo.stageBonus * 1.7 +
          r3 * 2
        : 0;

    return {
      ...s,
      leagueId: currLg,
      totalGoals,
      totalAssists,
      leagueGoals,
      leagueAssists,
      cupGoals,
      cupAssists,
      worldScore,
      leagueScore,
      totsScore,
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
    const wonLg = leagueChampions.get(userLeagueId) === userClubId ? 5.5 : 0;
    const uclInfo = getClubContinentalStageInfo(ucl, userClubId);
    const libInfo = getClubContinentalStageInfo(lib, userClubId);

    const userNatId = `nt_${player.nationality.toLowerCase()}`;
    const userNatBonus =
      period.internationalMatches > 0
        ? getNationalTrophyBonus(world, userNatId) +
          period.internationalGoals * 1.8 +
          period.internationalAssists * 1.2
        : 0;

    // Separa estritamente os gols e assistências da LIGA NACIONAL do total da temporada!
    const trackedLg = userCompStats?.[userLeagueId];
    const userLeagueGoals =
      trackedLg && trackedLg.matches > 0
        ? trackedLg.goals
        : Math.max(0, period.seasonGoals - period.continentalGoals - period.internationalGoals);
    const userLeagueAssists =
      trackedLg && trackedLg.matches > 0
        ? trackedLg.assists
        : Math.max(0, period.seasonAssists - period.continentalAssists - period.internationalAssists);

    const leagueImpact =
      sector === 'ATK'
        ? userLeagueGoals * 1.65 + userLeagueAssists * 1.35 + avgStars * 3.5
        : sector === 'MID'
          ? userLeagueGoals * 1.45 + userLeagueAssists * 1.6 + avgStars * 4.5
          : userLeagueGoals * 1.6 + userLeagueAssists * 1.3 + avgStars * 9.5;

    const userLeagueScore =
      player.overall * 0.82 +
      leagueImpact +
      Math.max(0, 7 - myRank) * 0.9 +
      wonLg;

    const worldRawUser =
      player.overall * 0.92 +
      period.seasonGoals * 0.98 +
      period.seasonAssists * 0.8 +
      avgStars * (sector === 'DEF' ? 9 : 4.5) +
      Math.max(0, 7 - myRank) * 0.85;

    candidates.push({
      id: '__USER__',
      name: player.fullName,
      clubId: userClubId,
      leagueId: userLeagueId,
      pos: player.position,
      age: player.age,
      ovr: player.overall,
      totalGoals: period.seasonGoals,
      totalAssists: period.seasonAssists,
      leagueGoals: userLeagueGoals,
      leagueAssists: userLeagueAssists,
      cupGoals: period.continentalGoals,
      cupAssists: period.continentalAssists,
      worldScore:
        worldRawUser * prestige +
        wonLg * 1.5 * prestige +
        Math.max(0, uclInfo.stageBonus) * 1.5 +
        Math.max(0, libInfo.stageBonus) * 1.15 +
        userNatBonus,
      leagueScore: userLeagueScore,
      totsScore: userLeagueScore + avgStars * 2,
      uclScore:
        uclInfo.stageBonus >= 0 && period.continentalMatches > 0
          ? player.overall * 0.82 +
            period.continentalGoals * 3.9 +
            period.continentalAssists * 2.7 +
            uclInfo.stageBonus * 1.7 +
            avgStars * 2.5
          : 0,
      libScore:
        libInfo.stageBonus >= 0 && period.continentalMatches > 0
          ? player.overall * 0.82 +
            period.continentalGoals * 3.9 +
            period.continentalAssists * 2.7 +
            libInfo.stageBonus * 1.7 +
            avgStars * 2.5
          : 0,
      isUser: true,
    });
  }

  return candidates;
}
