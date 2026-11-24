import { getClubById } from '../../data/clubs';
import { FullSquadPlayer, SquadPosition } from '../../data/clubs/types';
import { ContinentalCupId, LeagueId } from '../../data/leagues/leagues';
import { AnyCompetitionId } from '../../data/world/competitionThemes';
import { loadClubFullSquad } from '../../data/world/squadLoader';
import { CareerPlayer } from '../player/playerTypes';
import { ClubStandingRow, FixtureMatch, WorldSeasonState } from '../season/seasonTypes';
import { UserCompetitionStatsMap } from './careerHistoryTypes';

export interface CompetitionPlayerStatRow {
  playerId: string;
  playerName: string;
  clubId: string;
  pos: SquadPosition;
  ovr: number;
  faceUrl?: string;
  matches: number;
  goals: number;
  assists: number;
  goalContributions: number; // G + A
  cleanSheets: number;
  isUser: boolean;
}

export interface CompetitionLeaderboards {
  compId: AnyCompetitionId;
  totalMatchesPlayed: number;
  totalGoalsScored: number;
  topScorers: CompetitionPlayerStatRow[];
  topAssisters: CompetitionPlayerStatRow[];
  topParticipations: CompetitionPlayerStatRow[];
  topCleanSheets: CompetitionPlayerStatRow[];
}

function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function getGoalWeight(p: FullSquadPlayer, seedBase: string): number {
  if (p.pos === 'GK') return 0;
  const formFactor = 0.72 + deterministicHash(`${seedBase}_g_${p.id}`) * 0.65;
  const ovrFactor = Math.pow(Math.max(1, p.ovr - 48) / 30, 1.85);
  const posMult =
    p.pos === 'ATA'
      ? 3.8
      : p.pos === 'SA' || p.pos === 'PD' || p.pos === 'PE'
        ? 2.55
        : p.pos === 'MEI'
          ? 1.55
          : p.pos === 'MC' || p.pos === 'MD' || p.pos === 'ME'
            ? 0.85
            : p.pos === 'VOL'
              ? 0.42
              : 0.24;
  return posMult * ovrFactor * formFactor;
}

function getAssistWeight(p: FullSquadPlayer, seedBase: string): number {
  if (p.pos === 'GK') return 0.02;
  const formFactor = 0.72 + deterministicHash(`${seedBase}_a_${p.id}`) * 0.65;
  const ovrFactor = Math.pow(Math.max(1, p.ovr - 48) / 30, 1.75);
  const posMult =
    p.pos === 'MEI'
      ? 3.2
      : p.pos === 'PD' || p.pos === 'PE' || p.pos === 'MD' || p.pos === 'ME'
        ? 2.65
        : p.pos === 'MC' || p.pos === 'SA'
          ? 1.85
          : p.pos === 'ATA'
            ? 1.25
            : p.pos === 'LD' || p.pos === 'LE'
              ? 1.15
              : 0.3;
  return posMult * ovrFactor * formFactor;
}

function distributeIntegerPool(
  players: FullSquadPlayer[],
  totalToDistribute: number,
  weightFn: (p: FullSquadPlayer) => number,
): Map<string, number> {
  const counts = new Map<string, number>();
  if (totalToDistribute <= 0 || players.length === 0) return counts;

  const weights = players.map((p) => Math.max(0, weightFn(p)));
  const sumW = weights.reduce((acc, w) => acc + w, 0);
  if (sumW <= 0) return counts;

  const remainders: { id: string; rem: number }[] = [];
  let assigned = 0;

  players.forEach((p, i) => {
    const exact = (weights[i] / sumW) * totalToDistribute;
    const base = Math.floor(exact);
    if (base > 0) {
      counts.set(p.id, base);
      assigned += base;
    }
    remainders.push({ id: p.id, rem: exact - base });
  });

  remainders.sort((a, b) => b.rem - a.rem);
  let idx = 0;
  while (assigned < totalToDistribute && idx < remainders.length) {
    const targetId = remainders[idx].id;
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
    assigned++;
    idx++;
  }

  return counts;
}

function extractTeamAggregates(
  compId: AnyCompetitionId,
  world: WorldSeasonState,
  qualifierGroupId?: string,
): {
  teamStats: Map<string, { played: number; gf: number; cleanSheets: number }>;
  totalMatches: number;
  totalGoals: number;
} {
  const map = new Map<string, { played: number; gf: number; cleanSheets: number }>();
  let totalMatches = 0;
  let totalGoals = 0;

  const ensure = (id: string) => {
    if (!map.has(id)) map.set(id, { played: 0, gf: 0, cleanSheets: 0 });
    return map.get(id)!;
  };

  const ingestFixture = (m: FixtureMatch) => {
    if (!m.played || m.homeGoals === null || m.awayGoals === null) return;
    totalMatches += 1;
    totalGoals += m.homeGoals + m.awayGoals;
    const h = ensure(m.homeClubId);
    const a = ensure(m.awayClubId);
    h.played += 1;
    h.gf += m.homeGoals;
    if (m.awayGoals === 0) h.cleanSheets += 1;
    a.played += 1;
    a.gf += m.awayGoals;
    if (m.homeGoals === 0) a.cleanSheets += 1;
  };

  const seedTeamsFromStandings = (rows: ClubStandingRow[]) => {
    for (const r of rows) ensure(r.clubId);
  };

  if (compId in world.leagues) {
    const lg = world.leagues[compId as LeagueId];
    seedTeamsFromStandings(lg.standings);
    lg.rounds.forEach((rnd) => rnd.forEach(ingestFixture));
    return { teamStats: map, totalMatches, totalGoals };
  }

  if (compId in world.continentals) {
    const cup = world.continentals[compId as ContinentalCupId];
    cup.participantIds.forEach(ensure);
    cup.groups.forEach((g) => g.rounds.forEach((rnd) => rnd.forEach(ingestFixture)));
    for (const stage of [cup.roundOf16, cup.quarterFinals, cup.semiFinals]) {
      for (const tie of stage) {
        if (tie.leg1Home !== null && tie.leg1Away !== null) {
          ingestFixture({
            id: `${tie.id}_1`,
            homeClubId: tie.homeClubId,
            awayClubId: tie.awayClubId,
            homeGoals: tie.leg1Home,
            awayGoals: tie.leg1Away,
            played: true,
          });
        }
        if (tie.leg2Home !== null && tie.leg2Away !== null) {
          ingestFixture({
            id: `${tie.id}_2`,
            homeClubId: tie.awayClubId,
            awayClubId: tie.homeClubId,
            homeGoals: tie.leg2Home,
            awayGoals: tie.leg2Away,
            played: true,
          });
        }
      }
    }
    if (cup.finalMatch) ingestFixture(cup.finalMatch);
    return { teamStats: map, totalMatches, totalGoals };
  }

  const intl = world.international;
  if (!intl) return { teamStats: map, totalMatches, totalGoals };

  if (compId === 'WC_QUALIFIERS') {
    const targetGroups = qualifierGroupId
      ? intl.qualifiers.filter((q) => q.id === qualifierGroupId)
      : intl.qualifiers;
    for (const q of targetGroups) {
      seedTeamsFromStandings(q.standings);
      q.rounds.forEach((rnd) => rnd.forEach(ingestFixture));
    }
    return { teamStats: map, totalMatches, totalGoals };
  }

  const ntCup =
    compId === 'WORLD_CUP'
      ? intl.worldCup
      : compId === 'NATIONS_LEAGUE'
        ? intl.nationsLeague
        : compId === 'COPA_AMERICA'
          ? intl.copaAmerica
          : compId === 'EURO_CUP'
            ? intl.euroCup
            : null;

  if (ntCup) {
    ntCup.participantIds.forEach(ensure);
    ntCup.groups.forEach((g) => g.rounds.forEach((rnd) => rnd.forEach(ingestFixture)));
    ntCup.leagueBGroups?.forEach((g) => g.rounds.forEach((rnd) => rnd.forEach(ingestFixture)));
    ntCup.roundOf16.forEach(ingestFixture);
    ntCup.quarterFinals.forEach(ingestFixture);
    ntCup.semiFinals.forEach(ingestFixture);
    if (ntCup.finalMatch) ingestFixture(ntCup.finalMatch);
  }

  return { teamStats: map, totalMatches, totalGoals };
}

export async function buildCompetitionLeaderboards(
  compId: AnyCompetitionId,
  world: WorldSeasonState,
  userPlayer: CareerPlayer | null,
  userClubId: string | null,
  userCompStats: UserCompetitionStatsMap,
  qualifierGroupId?: string,
): Promise<CompetitionLeaderboards> {
  const { teamStats, totalMatches, totalGoals } = extractTeamAggregates(
    compId,
    world,
    qualifierGroupId,
  );
  const teamIds = Array.from(teamStats.keys());
  const squads = await Promise.all(teamIds.map((id) => loadClubFullSquad(id)));

  const userLine = userCompStats[compId];
  const userNatId = userPlayer ? `nt_${userPlayer.nationality.toLowerCase()}` : null;
  const rows: CompetitionPlayerStatRow[] = [];

  teamIds.forEach((clubId, idx) => {
    const agg = teamStats.get(clubId)!;
    const rawSquad = [...squads[idx]].sort((a, b) => b.ovr - a.ovr);
    const activeRotation = rawSquad.slice(0, 16); // Titulares + reservas imediatos que entram nos jogos
    const seedBase = `${world.seasonYear}_${compId}_${clubId}`;

    const isUsersTeamInThisComp =
      userPlayer &&
      userLine &&
      (userLine.clubId === clubId || clubId === userClubId || clubId === userNatId);

    const remGoals = Math.max(0, agg.gf - (isUsersTeamInThisComp ? userLine.goals : 0));
    const estTotalAssists = Math.round(agg.gf * 0.72);
    const remAssists = Math.max(
      0,
      estTotalAssists - (isUsersTeamInThisComp ? userLine.assists : 0),
    );

    const goalMap = distributeIntegerPool(activeRotation, remGoals, (p) =>
      getGoalWeight(p, seedBase),
    );
    const assistMap = distributeIntegerPool(activeRotation, remAssists, (p) =>
      getAssistWeight(p, seedBase),
    );

    const starterGk = activeRotation.find((p) => p.pos === 'GK') ?? rawSquad.find((p) => p.pos === 'GK');

    activeRotation.forEach((p, sIdx) => {
      const g = goalMap.get(p.id) ?? 0;
      const a = assistMap.get(p.id) ?? 0;
      const cs = starterGk && p.id === starterGk.id ? agg.cleanSheets : 0;
      const estApps =
        agg.played === 0
          ? 0
          : sIdx < 11
            ? agg.played
            : Math.max(1, Math.round(agg.played * 0.65));

      if (g > 0 || a > 0 || cs > 0 || (agg.played === 0 && sIdx < 2)) {
        rows.push({
          playerId: p.id,
          playerName: p.name,
          clubId,
          pos: p.pos,
          ovr: p.ovr,
          faceUrl: p.faceUrl,
          matches: estApps,
          goals: g,
          assists: a,
          goalContributions: g + a,
          cleanSheets: cs,
          isUser: false,
        });
      }
    });
  });

  // Injeta os números exatos do jogador do usuário se ele disputou (ou pertence a time deste campeonato)!
  if (userPlayer) {
    const candidateTeamId =
      userLine?.clubId ??
      (userNatId && teamStats.has(userNatId) ? userNatId : null) ??
      (userClubId && teamStats.has(userClubId) ? userClubId : null);

    if (candidateTeamId && teamStats.has(candidateTeamId)) {
      rows.push({
        playerId: '__USER_PRO__',
        playerName: userPlayer.fullName,
        clubId: candidateTeamId,
        pos: userPlayer.position,
        ovr: userPlayer.overall,
        matches: userLine?.matches ?? 0,
        goals: userLine?.goals ?? 0,
        assists: userLine?.assists ?? 0,
        goalContributions: (userLine?.goals ?? 0) + (userLine?.assists ?? 0),
        cleanSheets: 0,
        isUser: true,
      });
    }
  }

  const byScorers = [...rows]
    .filter((r) => r.pos !== 'GK' || r.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.matches - b.matches || b.ovr - a.ovr)
    .slice(0, 20);

  const byAssisters = [...rows]
    .filter((r) => r.pos !== 'GK' || r.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.matches - b.matches || b.ovr - a.ovr)
    .slice(0, 20);

  const byParticipations = [...rows]
    .filter((r) => r.pos !== 'GK' || r.goalContributions > 0)
    .sort(
      (a, b) =>
        b.goalContributions - a.goalContributions ||
        b.goals - a.goals ||
        b.ovr - a.ovr,
    )
    .slice(0, 20);

  const byCleanSheets = [...rows]
    .filter((r) => r.pos === 'GK')
    .sort((a, b) => b.cleanSheets - a.cleanSheets || b.ovr - a.ovr || getClubById(b.clubId).squadAvgOvr - getClubById(a.clubId).squadAvgOvr)
    .slice(0, 16);

  return {
    compId,
    totalMatchesPlayed: totalMatches,
    totalGoalsScored: totalGoals,
    topScorers: byScorers,
    topAssisters: byAssisters,
    topParticipations: byParticipations,
    topCleanSheets: byCleanSheets,
  };
}
