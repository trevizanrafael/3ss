import { SquadPosition } from '../../data/clubs/types';
import { LeagueId, LEAGUES } from '../../data/leagues/leagues';
import { CareerStage } from '../../shared/types/common';
import { CareerPlayer } from '../player/playerTypes';
import { WorldSeasonState } from '../season/seasonTypes';
import { findClubLeagueIdInWorld } from '../season/worldSeasonEngine';
import {
  AwardCode,
  PlayerPeriodStats,
  PlayerTrophyEntry,
  SeasonAwardResult,
  SeasonAwardsGalaReport,
  TeamOfTheSeasonSlot,
} from './awardTypes';
import {
  buildSeasonAwardCandidates,
  getBootFactor,
  SimCandidate,
} from './seasonCandidatesBuilder';

export function evaluateEndOfSeasonAwards(
  player: CareerPlayer,
  userClubId: string,
  stage: CareerStage,
  period: PlayerPeriodStats,
  world: WorldSeasonState,
): { gala: SeasonAwardsGalaReport; newTrophies: PlayerTrophyEntry[] } {
  const userLeagueId = findClubLeagueIdInWorld(world, userClubId);
  const uclWinner = world.continentals.CHAMPIONS_LEAGUE.championClubId;
  const libWinner = world.continentals.LIBERTADORES.championClubId;
  const uelWinner = world.continentals.EUROPA_LEAGUE.championClubId;
  const sulWinner = world.continentals.SUL_AMERICANA.championClubId;

  const leagueChampions = new Map<LeagueId, string>();
  const clubRankMap = new Map<string, number>();
  for (const [lgId, lgData] of Object.entries(world.leagues) as [
    LeagueId,
    (typeof world.leagues)[LeagueId],
  ][]) {
    if (lgData.standings[0]) leagueChampions.set(lgId, lgData.standings[0].clubId);
    lgData.standings.forEach((r, idx) => clubRankMap.set(r.clubId, idx + 1));
  }

  const candidates = buildSeasonAwardCandidates(
    player,
    userClubId,
    stage,
    period,
    world,
    leagueChampions,
    clubRankMap,
  );

  const makeAward = (
    code: AwardCode,
    title: string,
    subtitle: string,
    pool: SimCandidate[],
    scoreFn: (c: SimCandidate) => number,
    lineFn: (c: SimCandidate) => string,
    cash: number,
  ): SeasonAwardResult => {
    const sorted = [...pool].sort((a, b) => scoreFn(b) - scoreFn(a));
    const top3 = sorted.slice(0, 3).map((c) => ({
      playerId: c.id,
      playerName: c.name,
      clubId: c.clubId,
      pos: c.pos,
      age: c.age,
      ovr: c.ovr,
      statLine: lineFn(c),
      score: Math.round(scoreFn(c)),
      isUser: c.isUser,
      faceUrl: c.faceUrl,
    }));
    const uIdx = top3.findIndex((n) => n.isUser);
    return {
      code,
      title,
      subtitle,
      podium: top3,
      userRank: uIdx !== -1 ? uIdx + 1 : null,
      cashReward: uIdx === 0 ? cash : 0,
    };
  };

  const myLeaguePool = candidates.filter((c) => c.leagueId === userLeagueId);
  const myLeagueName = LEAGUES[userLeagueId].name.toUpperCase();
  const isDiv1 = LEAGUES[userLeagueId].division === 1;

  const majorAwards: SeasonAwardResult[] = [
    makeAward(
      'BALLON_DOR',
      'BOLA DE OURO',
      'MELHOR JOGADOR DO MUNDO NA TEMPORADA',
      candidates,
      (c) => c.worldScore,
      (c) => `${c.goals}G • ${c.assists}A • ${c.ovr} OVR`,
      450000,
    ),
    makeAward(
      'GOLDEN_BOY',
      'GOLDEN BOY (YOUNGSTER)',
      'MELHOR JOGADOR SUB-21 DO MUNDO',
      candidates.filter((c) => c.age <= 21),
      (c) => c.worldScore,
      (c) => `${c.age} ANOS • ${c.goals}G ${c.assists}A`,
      180000,
    ),
    makeAward(
      'GOLDEN_BOOT',
      'CHUTEIRA DE OURO',
      'MAIOR ARTILHEIRO PONDERADO DA TEMPORADA',
      candidates.filter((c) => c.pos !== 'GK'),
      (c) => c.goals * getBootFactor(c.leagueId),
      (c) => `${c.goals} GOLS (${Math.round(c.goals * getBootFactor(c.leagueId))} PTS)`,
      200000,
    ),
    makeAward(
      'GOLDEN_PLAYMAKER',
      'GARÇOM DE OURO',
      'LÍDER MUNDIAL DE ASSISTÊNCIAS',
      candidates.filter((c) => c.pos !== 'GK'),
      (c) => c.assists * getBootFactor(c.leagueId),
      (c) => `${c.assists} ASSISTÊNCIAS`,
      140000,
    ),
    makeAward(
      'UCL_BEST',
      'CRAQUE DA CHAMPIONS LEAGUE',
      'MELHOR JOGADOR DA TEMPORADA EUROPEIA',
      candidates.filter((c) => c.uclScore > 0),
      (c) => c.uclScore,
      (c) => `${c.goals}G • ${c.assists}A`,
      220000,
    ),
    makeAward(
      'REI_DA_AMERICA',
      'REI DA AMÉRICA',
      'MELHOR JOGADOR DA CONMEBOL LIBERTADORES',
      candidates.filter((c) => c.libScore > 0),
      (c) => c.libScore,
      (c) => `${c.goals}G • ${c.assists}A`,
      150000,
    ),
    makeAward(
      'LEAGUE_MVP',
      `CRAQUE • ${myLeagueName}`,
      'MELHOR JOGADOR DO SEU CAMPEONATO',
      myLeaguePool,
      (c) => c.leagueScore,
      (c) => `${c.goals}G • ${c.assists}A • ${c.ovr} OVR`,
      isDiv1 ? 95000 : 28000,
    ),
    makeAward(
      'LEAGUE_YOUNG_PLAYER',
      `JOVEM DO ANO • ${myLeagueName}`,
      'REVELAÇÃO SUB-21 DO SEU CAMPEONATO',
      myLeaguePool.filter((c) => c.age <= 21),
      (c) => c.leagueScore,
      (c) => `${c.age} ANOS • ${c.goals}G ${c.assists}A`,
      isDiv1 ? 55000 : 18000,
    ),
  ];

  // Seleção do Campeonato (11 Ideais — 4-3-3)
  const totsPositions: SquadPosition[] = [
    'GK',
    'LD',
    'ZAG',
    'ZAG',
    'LE',
    'VOL',
    'MC',
    'MEI',
    'PD',
    'PE',
    'ATA',
  ];
  const usedTots = new Set<string>();
  const leagueTots: TeamOfTheSeasonSlot[] = totsPositions.map((slotPos) => {
    const best = [...myLeaguePool]
      .filter((c) => !usedTots.has(c.id))
      .sort((a, b) => {
        const matchA = a.pos === slotPos ? 18 : 0;
        const matchB = b.pos === slotPos ? 18 : 0;
        return b.leagueScore + matchB - (a.leagueScore + matchA);
      })[0];

    if (best) {
      usedTots.add(best.id);
      return {
        pos: slotPos,
        playerName: best.name,
        clubId: best.clubId,
        ovr: best.ovr,
        isUser: best.isUser,
      };
    }
    return { pos: slotPos, playerName: 'Destaque', clubId: userClubId, ovr: 72, isUser: false };
  });

  const userInTots = leagueTots.some((s) => s.isUser);
  const totsCash = userInTots ? (isDiv1 ? 35000 : 12000) : 0;

  const newTrophies: PlayerTrophyEntry[] = [];
  let totalCashWon = totsCash;
  let prestigeBoostEarned = userInTots ? 2 : 0;

  for (const aw of majorAwards) {
    if (aw.userRank === 1) {
      totalCashWon += aw.cashReward;
      prestigeBoostEarned += aw.code === 'BALLON_DOR' ? 8 : aw.code === 'GOLDEN_BOY' ? 5 : 3;
      newTrophies.push({
        id: `${aw.code}_${world.seasonYear}`,
        season: world.seasonYear,
        code: aw.code,
        title: aw.title,
        clubId: userClubId,
        detail: aw.podium[0]?.statLine ?? '1º LUGAR',
      });
    }
  }

  if (userInTots) {
    newTrophies.push({
      id: `tots_${world.seasonYear}`,
      season: world.seasonYear,
      code: 'LEAGUE_TOTS',
      title: `SELEÇÃO DO CAMPEONATO • ${myLeagueName}`,
      clubId: userClubId,
      detail: `ELEITO ENTRE OS 11 IDEAIS (${player.position})`,
    });
  }

  if (stage !== 'YOUTH' && period.seasonMatches >= 5) {
    if (leagueChampions.get(userLeagueId) === userClubId) {
      newTrophies.push({
        id: `champ_lg_${world.seasonYear}`,
        season: world.seasonYear,
        code: 'COLLECTIVE_TROPHY',
        title: `CAMPEÃO • ${myLeagueName}`,
        clubId: userClubId,
        detail: 'TÍTULO NACIONAL OFICIAL',
      });
    }
    for (const [winnerId, cupTitle] of [
      [uclWinner, 'CAMPEÃO • UEFA CHAMPIONS LEAGUE'],
      [uelWinner, 'CAMPEÃO • UEFA EUROPA LEAGUE'],
      [libWinner, 'CAMPEÃO • CONMEBOL LIBERTADORES'],
      [sulWinner, 'CAMPEÃO • CONMEBOL SUL-AMERICANA'],
    ] as const) {
      if (winnerId === userClubId) {
        newTrophies.push({
          id: `champ_cup_${cupTitle}_${world.seasonYear}`,
          season: world.seasonYear,
          code: 'COLLECTIVE_TROPHY',
          title: cupTitle,
          clubId: userClubId,
          detail: 'GLÓRIA CONTINENTAL',
        });
      }
    }

    // Títulos oficiais pela Seleção Nacional se foi convocado na temporada!
    const userNatId = `nt_${player.nationality.toLowerCase()}`;
    if (period.internationalMatches > 0 && world.international) {
      const intl = world.international;
      for (const [champId, ntTitle, ntDetail] of [
        [intl.worldCup?.championTeamId, 'CAMPEÃO • COPA DO MUNDO FIFA', 'GLÓRIA MÁXIMA MUNDIAL'],
        [intl.copaAmerica?.championTeamId, 'CAMPEÃO • CONMEBOL COPA AMÉRICA', 'TÍTULO DE SELEÇÕES'],
        [intl.euroCup?.championTeamId, 'CAMPEÃO • UEFA EUROCOPA', 'TÍTULO DE SELEÇÕES'],
        [intl.nationsLeague?.championTeamId, 'CAMPEÃO • LIGA DAS NAÇÕES', 'UEFA + CONMEBOL'],
      ] as const) {
        if (champId === userNatId) {
          newTrophies.push({
            id: `nt_champ_${ntTitle}_${world.seasonYear}`,
            season: world.seasonYear,
            code: 'COLLECTIVE_TROPHY',
            title: ntTitle,
            clubId: userNatId,
            detail: ntDetail,
          });
        }
      }
    }
  }

  return {
    gala: {
      season: world.seasonYear,
      leagueId: userLeagueId,
      majorAwards,
      leagueTots,
      userInTots,
      totalCashWon,
      prestigeBoostEarned,
    },
    newTrophies,
  };
}
