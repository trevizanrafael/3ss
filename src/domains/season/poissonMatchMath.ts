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
  customHomeOvr?: number,
  customAwayOvr?: number,
): { homeGoals: number; awayGoals: number } {
  const home = getClubById(homeClubId);
  const away = getClubById(awayClubId);

  const hOvr = customHomeOvr ?? home.squadAvgOvr;
  const aOvr = customAwayOvr ?? away.squadAvgOvr;
  const homeAdv = neutralVenue ? 0 : 1.65;
  const ovrDiff = hOvr - aOvr + homeAdv;

  // Coeficiente 0.040 gera campeões realistas com ~74..82 pontos em 38 rodadas (sem líderes invictos de 95 pts!)
  const lambdaHome = clamp(1.32 * Math.exp(0.04 * ovrDiff), 0.28, 3.15);
  const lambdaAway = clamp(1.08 * Math.exp(-0.04 * ovrDiff), 0.2, 2.75);

  return {
    homeGoals: samplePoissonGoals(lambdaHome),
    awayGoals: samplePoissonGoals(lambdaAway),
  };
}

/**
 * Simula uma disputa real de pênaltis padrão FIFA (5 cobranças + alternadas se empatar),
 * respeitando encerramento matemático antecipado (ex: 4x2 após 4 cobranças).
 */
export function simulatePenaltyShootout(
  homeClubId: string,
  awayClubId: string,
): { homePen: number; awayPen: number; winnerId: string } {
  const h = getClubById(homeClubId);
  const a = getClubById(awayClubId);
  const pHome = clamp(0.76 + (h.squadAvgOvr - a.squadAvgOvr) * 0.008, 0.66, 0.85);
  const pAway = clamp(0.75 + (a.squadAvgOvr - h.squadAvgOvr) * 0.008, 0.65, 0.84);

  let homePen = 0;
  let awayPen = 0;

  for (let round = 1; round <= 5; round++) {
    if (Math.random() < pHome) homePen++;
    const remHome = 5 - round;
    const remAway = 5 - round + 1;
    if (homePen - awayPen > remAway || awayPen - homePen > remHome) break;

    if (Math.random() < pAway) awayPen++;
    const remAfterBoth = 5 - round;
    if (Math.abs(homePen - awayPen) > remAfterBoth) break;
  }

  let guard = 0;
  while (homePen === awayPen && guard < 20) {
    guard++;
    const hScored = Math.random() < pHome;
    const aScored = Math.random() < pAway;
    if (hScored) homePen++;
    if (aScored) awayPen++;
  }

  if (homePen === awayPen) {
    homePen += 1;
  }

  return {
    homePen,
    awayPen,
    winnerId: homePen > awayPen ? homeClubId : awayClubId,
  };
}

export function pickPenaltyShootoutWinner(clubAId: string, clubBId: string): string {
  return simulatePenaltyShootout(clubAId, clubBId).winnerId;
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
