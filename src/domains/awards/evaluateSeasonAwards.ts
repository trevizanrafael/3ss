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

// Regras estritas de posição para a Seleção do Campeonato (4-3-3):
// Goleiro SÓ aceita GK, Zagueiro SÓ aceita ZAG, Atacante NUNCA entra no gol ou na lateral!
const TOTS_SLOTS_SPEC: {
  slot: SquadPosition;
  primary: SquadPosition[];
  fallback: SquadPosition[];
}[] = [
  { slot: 'GK', primary: ['GK'], fallback: ['GK'] },
  { slot: 'LD', primary: ['LD'], fallback: ['MD', 'ZAG'] },
  { slot: 'ZAG', primary: ['ZAG'], fallback: ['VOL'] },
  { slot: 'ZAG', primary: ['ZAG'], fallback: ['VOL'] },
  { slot: 'LE', primary: ['LE'], fallback: ['ME', 'ZAG'] },
  { slot: 'VOL', primary: ['VOL'], fallback: ['MC'] },
  { slot: 'MC', primary: ['MC'], fallback: ['VOL', 'MEI'] },
  { slot: 'MEI', primary: ['MEI'], fallback: ['SA', 'MC', 'MD', 'ME'] },
  { slot: 'PD', primary: ['PD', 'MD'], fallback: ['SA', 'ATA'] },
  { slot: 'PE', primary: ['PE', 'ME'], fallback: ['SA', 'ATA'] },
  { slot: 'ATA', primary: ['ATA', 'SA'], fallback: ['PD', 'PE'] },
];

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
    maxPerClub = 3,
    tieBreakFn?: (a: SimCandidate, b: SimCandidate) => number,
  ): SeasonAwardResult => {
    const sorted = [...pool].sort((a, b) => {
      const diff = scoreFn(b) - scoreFn(a);
      if (Math.abs(diff) > 0.001) return diff;
      if (tieBreakFn) return tieBreakFn(a, b);
      return b.ovr - a.ovr;
    });

    const picked: SimCandidate[] = [];
    const clubCount = new Map<string, number>();
    for (const c of sorted) {
      const cnt = clubCount.get(c.clubId) ?? 0;
      if (!c.isUser && cnt >= maxPerClub) continue;
      picked.push(c);
      clubCount.set(c.clubId, cnt + 1);
      if (picked.length >= 3) break;
    }

    const top3 = picked.map((c) => ({
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

  // Filtra estritamente apenas jogadores dos clubes que disputaram a SUA liga nacional!
  const validClubsInMyLeague = new Set(world.leagues[userLeagueId]?.clubIds ?? []);
  const myLeaguePool = candidates.filter(
    (c) => c.leagueId === userLeagueId && validClubsInMyLeague.has(c.clubId),
  );
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
      'ARTILHARIA PONDERADA (×2.0 TOP-5 EUROPA • ×1.5 DEMAIS 1ª DIV)',
      candidates.filter((c) => c.pos !== 'GK'),
      (c) => c.goals * getBootFactor(c.leagueId),
      (c) => {
        const f = getBootFactor(c.leagueId);
        return `${c.goals} GOLS × ${f.toFixed(1)} = ${(c.goals * f).toFixed(0)} PTS`;
      },
      200000,
      3,
      (a, b) => b.goals - a.goals || b.assists - a.assists || b.ovr - a.ovr,
    ),
    makeAward(
      'GOLDEN_PLAYMAKER',
      'GARÇOM DE OURO',
      'LÍDER MUNDIAL PONDERADO DE ASSISTÊNCIAS',
      candidates.filter((c) => c.pos !== 'GK'),
      (c) => c.assists * getBootFactor(c.leagueId),
      (c) => {
        const f = getBootFactor(c.leagueId);
        return `${c.assists} ASSIST × ${f.toFixed(1)} = ${(c.assists * f).toFixed(0)} PTS`;
      },
      140000,
      3,
      (a, b) => b.assists - a.assists || b.goals - a.goals || b.ovr - a.ovr,
    ),
    makeAward(
      'UCL_BEST',
      'CRAQUE DA CHAMPIONS LEAGUE',
      'MELHOR JOGADOR DA TEMPORADA EUROPEIA',
      candidates.filter((c) => c.uclScore > 0),
      (c) => c.uclScore,
      (c) => `${c.cupGoals}G • ${c.cupAssists}A NA CHAMPIONS`,
      220000,
      2,
    ),
    makeAward(
      'REI_DA_AMERICA',
      'REI DA AMÉRICA',
      'MELHOR JOGADOR DA CONMEBOL LIBERTADORES',
      candidates.filter((c) => c.libScore > 0),
      (c) => c.libScore,
      (c) => `${c.cupGoals}G • ${c.cupAssists}A NA LIBERTADORES`,
      150000,
      2,
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

  // Seleção do Campeonato (11 Ideais — 4-3-3 com posições estritamente respeitadas!)
  const usedTots = new Set<string>();
  const leagueTots: TeamOfTheSeasonSlot[] = TOTS_SLOTS_SPEC.map(({ slot, primary, fallback }) => {
    const primaryMatches = myLeaguePool
      .filter((c) => !usedTots.has(c.id) && primary.includes(c.pos))
      .sort((a, b) => b.leagueScore - a.leagueScore);

    const fallbackMatches =
      primaryMatches.length > 0
        ? []
        : myLeaguePool
            .filter((c) => !usedTots.has(c.id) && fallback.includes(c.pos))
            .sort((a, b) => b.leagueScore - a.leagueScore);

    const best = primaryMatches[0] ?? fallbackMatches[0];
    if (best) {
      usedTots.add(best.id);
      return {
        pos: slot,
        playerName: best.name,
        clubId: best.clubId,
        ovr: best.ovr,
        isUser: best.isUser,
      };
    }
    return { pos: slot, playerName: 'Destaque', clubId: userClubId, ovr: 72, isUser: false };
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
