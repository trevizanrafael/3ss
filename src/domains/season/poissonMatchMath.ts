import { getClubById } from '../../data/clubs';
import { clamp } from '../../shared/utils/math';
import { ClubStandingRow } from './seasonTypes';

/**
 * Amostrador de Poisson (Knuth) calibrado para futebol real:
 * Evita placares irreais (ex: 13x0) mantendo favoritismo estatístico fiel ao Overall.
 */
export function samplePoissonGoals(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 7);
  return clamp(k - 1, 0, 6);
}

export function simulateRealisticScoreline(
  homeClubId: string,
  awayClubId: string,
  neutralVenue = false,
): { homeGoals: number; awayGoals: number } {
  const home = getClubById(homeClubId);
  const away = getClubById(awayClubId);

  const homeAdv = neutralVenue ? 0 : 1.7;
  const ovrDiff = home.squadAvgOvr - away.squadAvgOvr + homeAdv;

  // Bayern (86) em casa vs Bochum (74) -> diff ~13.7 -> lambdaH ~2.55, lambdaA ~0.55 (típico 2x0, 3x1, 2x1)
  const lambdaHome = clamp(1.32 * Math.exp(0.048 * ovrDiff), 0.28, 3.05);
  const lambdaAway = clamp(1.08 * Math.exp(-0.048 * ovrDiff), 0.20, 2.70);

  return {
    homeGoals: samplePoissonGoals(lambdaHome),
    awayGoals: samplePoissonGoals(lambdaAway),
  };
}

export function pickPenaltyShootoutWinner(clubAId: string, clubBId: string): string {
  const a = getClubById(clubAId);
  const b = getClubById(clubBId);
  const probA = clamp(0.5 + (a.squadAvgOvr - b.squadAvgOvr) * 0.015, 0.32, 0.68);
  return Math.random() < probA ? clubAId : clubBId;
}

export function createEmptyStandings(clubIds: string[]): ClubStandingRow[] {
  return clubIds.map((clubId) => ({
    clubId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
}

export function sortStandings(rows: ClubStandingRow[]): ClubStandingRow[] {
  return [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return getClubById(b.clubId).squadAvgOvr - getClubById(a.clubId).squadAvgOvr;
  });
}

export function applyScoreToStandings(
  rows: ClubStandingRow[],
  homeId: string,
  awayId: string,
  hg: number,
  ag: number,
): ClubStandingRow[] {
  const updated = rows.map((r) => {
    if (r.clubId !== homeId && r.clubId !== awayId) return r;
    const gf = r.clubId === homeId ? hg : ag;
    const ga = r.clubId === homeId ? ag : hg;
    const won = gf > ga ? 1 : 0;
    const drawn = gf === ga ? 1 : 0;
    const lost = gf < ga ? 1 : 0;
    return {
      ...r,
      played: r.played + 1,
      won: r.won + won,
      drawn: r.drawn + drawn,
      lost: r.lost + lost,
      goalsFor: r.goalsFor + gf,
      goalsAgainst: r.goalsAgainst + ga,
      points: r.points + won * 3 + drawn,
    };
  });
  return sortStandings(updated);
}
