import { getClubById, getClubsByLeague } from '../../data/clubs';
import { LeagueId, LEAGUES, PLAYABLE_LEAGUE_IDS } from '../../data/leagues/leagues';
import { randomInt } from '../../shared/utils/math';

export interface ClubStandingRow {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export type AllLeagueTables = Record<LeagueId, ClubStandingRow[]>;

export function createInitialLeagueTables(): AllLeagueTables {
  const tables = {} as AllLeagueTables;
  for (const leagueId of PLAYABLE_LEAGUE_IDS) {
    const clubs = getClubsByLeague(leagueId);
    tables[leagueId] = clubs.map((c) => ({
      clubId: c.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    }));
  }
  return tables;
}

export function sortStandingRows(rows: ClubStandingRow[]): ClubStandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

export function recordMatchInRow(
  row: ClubStandingRow,
  gf: number,
  ga: number,
): ClubStandingRow {
  const won = gf > ga ? 1 : 0;
  const drawn = gf === ga ? 1 : 0;
  const lost = gf < ga ? 1 : 0;
  return {
    ...row,
    played: row.played + 1,
    won: row.won + won,
    drawn: row.drawn + drawn,
    lost: row.lost + lost,
    goalsFor: row.goalsFor + gf,
    goalsAgainst: row.goalsAgainst + ga,
    points: row.points + won * 3 + drawn,
  };
}

export function simulateLeagueRound(
  tables: AllLeagueTables,
  playerMatch?: { leagueId: LeagueId; clubId: string; opponentId: string; clubGoals: number; oppGoals: number },
): AllLeagueTables {
  const next = {} as AllLeagueTables;

  for (const leagueId of PLAYABLE_LEAGUE_IDS) {
    const rows = [...(tables[leagueId] ?? [])];
    const used = new Set<string>();
    const updatedMap = new Map<string, ClubStandingRow>(rows.map((r) => [r.clubId, r]));

    if (playerMatch && playerMatch.leagueId === leagueId) {
      const pRow = updatedMap.get(playerMatch.clubId);
      const oRow = updatedMap.get(playerMatch.opponentId);
      if (pRow && oRow) {
        updatedMap.set(playerMatch.clubId, recordMatchInRow(pRow, playerMatch.clubGoals, playerMatch.oppGoals));
        updatedMap.set(playerMatch.opponentId, recordMatchInRow(oRow, playerMatch.oppGoals, playerMatch.clubGoals));
        used.add(playerMatch.clubId);
        used.add(playerMatch.opponentId);
      }
    }

    const remaining = rows.filter((r) => !used.has(r.clubId));
    for (let i = 0; i + 1 < remaining.length; i += 2) {
      const home = getClubById(remaining[i].clubId);
      const away = getClubById(remaining[i + 1].clubId);
      const diff = (home.squadAvgOvr - away.squadAvgOvr) / 6;
      const hGoals = Math.max(0, Math.round(randomInt(0, 3) + Math.max(0, diff * 0.5)));
      const aGoals = Math.max(0, Math.round(randomInt(0, 2) + Math.max(0, -diff * 0.5)));
      updatedMap.set(home.id, recordMatchInRow(remaining[i], hGoals, aGoals));
      updatedMap.set(away.id, recordMatchInRow(remaining[i + 1], aGoals, hGoals));
    }

    next[leagueId] = sortStandingRows(Array.from(updatedMap.values()));
  }

  return next;
}

export function applySeasonPromotionRelegation(tables: AllLeagueTables): AllLeagueTables {
  const next = { ...tables };
  for (const leagueId of PLAYABLE_LEAGUE_IDS) {
    const cfg = LEAGUES[leagueId];
    if (cfg.division === 1 && cfg.hasRelegation && cfg.relegatedTo) {
      const div1Sorted = sortStandingRows(tables[leagueId]);
      const div2Sorted = sortStandingRows(tables[cfg.relegatedTo]);
      if (div1Sorted.length >= 4 && div2Sorted.length >= 4) {
        const relegated = div1Sorted.slice(-2);
        const promoted = div2Sorted.slice(0, 2);
        const stayDiv1 = div1Sorted.slice(0, -2);
        const stayDiv2 = div2Sorted.slice(2);

        next[leagueId] = [...stayDiv1, ...promoted].map((r) => ({
          clubId: r.clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
        }));
        next[cfg.relegatedTo] = [...relegated, ...stayDiv2].map((r) => ({
          clubId: r.clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
        }));
      }
    } else if (!cfg.hasRelegation && !cfg.hasPromotion) {
      next[leagueId] = tables[leagueId].map((r) => ({
        clubId: r.clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0,
      }));
    }
  }
  return next;
}
