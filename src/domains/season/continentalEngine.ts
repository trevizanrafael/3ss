import {
  applyScoreToStandings,
  pickPenaltyShootoutWinner,
  simulateRealisticScoreline,
  sortStandings,
} from './poissonMatchMath';
import {
  ContinentalCupData,
  FixtureMatch,
  KnockoutTie,
} from './seasonTypes';

export const CONTINENTAL_GROUP_WEEKS = [5, 7, 9, 11, 13, 15] as const;
export const R16_WEEKS = [21, 23] as const;
export const QF_WEEKS = [26, 28] as const;
export const SF_WEEKS = [31, 33] as const;
export const FINAL_WEEK = 36;

export const ALL_CONTINENTAL_WEEKS = new Set<number>([
  ...CONTINENTAL_GROUP_WEEKS,
  ...R16_WEEKS,
  ...QF_WEEKS,
  ...SF_WEEKS,
  FINAL_WEEK,
]);

export interface PlayerScoreOverride {
  clubId: string;
  clubGoals: number;
  oppGoals: number;
}

export function findClubContinentalFixtureInWeek(
  cup: ContinentalCupData,
  clubId: string,
  week: number,
): { opponentId: string; isHome: boolean; stageLabel: string } | null {
  const gRound = CONTINENTAL_GROUP_WEEKS.indexOf(week as (typeof CONTINENTAL_GROUP_WEEKS)[number]);
  if (gRound !== -1) {
    for (const grp of cup.groups) {
      const m = grp.rounds[gRound]?.find(
        (fx) => !fx.played && (fx.homeClubId === clubId || fx.awayClubId === clubId),
      );
      if (m) {
        const isHome = m.homeClubId === clubId;
        return {
          opponentId: isHome ? m.awayClubId : m.homeClubId,
          isHome,
          stageLabel: `${grp.groupName} • RODADA ${gRound + 1}`,
        };
      }
    }
  }

  const checkTies = (ties: KnockoutTie[], leg: 1 | 2, label: string) => {
    for (const t of ties) {
      if (leg === 1 && t.leg1Home === null && (t.homeClubId === clubId || t.awayClubId === clubId)) {
        const isHome = t.homeClubId === clubId;
        return { opponentId: isHome ? t.awayClubId : t.homeClubId, isHome, stageLabel: `${label} (IDA)` };
      }
      if (leg === 2 && t.leg2Home === null && (t.homeClubId === clubId || t.awayClubId === clubId)) {
        // Na volta o mando inverte: awayClubId joga em casa!
        const isHome = t.awayClubId === clubId;
        return { opponentId: isHome ? t.homeClubId : t.awayClubId, isHome, stageLabel: `${label} (VOLTA)` };
      }
    }
    return null;
  };

  if (week === R16_WEEKS[0]) return checkTies(cup.roundOf16, 1, 'OITAVAS DE FINAL');
  if (week === R16_WEEKS[1]) return checkTies(cup.roundOf16, 2, 'OITAVAS DE FINAL');
  if (week === QF_WEEKS[0]) return checkTies(cup.quarterFinals, 1, 'QUARTAS DE FINAL');
  if (week === QF_WEEKS[1]) return checkTies(cup.quarterFinals, 2, 'QUARTAS DE FINAL');
  if (week === SF_WEEKS[0]) return checkTies(cup.semiFinals, 1, 'SEMIFINAL');
  if (week === SF_WEEKS[1]) return checkTies(cup.semiFinals, 2, 'SEMIFINAL');

  if (week === FINAL_WEEK && cup.finalMatch && !cup.finalMatch.played) {
    if (cup.finalMatch.homeClubId === clubId || cup.finalMatch.awayClubId === clubId) {
      const isHome = cup.finalMatch.homeClubId === clubId;
      return {
        opponentId: isHome ? cup.finalMatch.awayClubId : cup.finalMatch.homeClubId,
        isHome,
        stageLabel: 'GRANDE FINAL',
      };
    }
  }
  return null;
}

function resolveScore(homeId: string, awayId: string, neutral: boolean, ovr?: PlayerScoreOverride) {
  if (ovr && (ovr.clubId === homeId || ovr.clubId === awayId)) {
    return ovr.clubId === homeId
      ? { homeGoals: ovr.clubGoals, awayGoals: ovr.oppGoals }
      : { homeGoals: ovr.oppGoals, awayGoals: ovr.clubGoals };
  }
  return simulateRealisticScoreline(homeId, awayId, neutral);
}

function buildNextTies(winners: string[], prefix: string): KnockoutTie[] {
  const ties: KnockoutTie[] = [];
  for (let i = 0; i + 1 < winners.length; i += 2) {
    ties.push({
      id: `${prefix}_${i / 2 + 1}`,
      homeClubId: winners[i],
      awayClubId: winners[i + 1],
      leg1Home: null,
      leg1Away: null,
      leg2Home: null,
      leg2Away: null,
      winnerClubId: null,
    });
  }
  return ties;
}

function simTiesLeg(ties: KnockoutTie[], leg: 1 | 2, ovr?: PlayerScoreOverride): KnockoutTie[] {
  return ties.map((t) => {
    if (leg === 1 && t.leg1Home === null) {
      const sc = resolveScore(t.homeClubId, t.awayClubId, false, ovr);
      return { ...t, leg1Home: sc.homeGoals, leg1Away: sc.awayGoals };
    }
    if (leg === 2 && t.leg2Home === null) {
      // Mando invertido na volta: awayClubId é o mandante do Jogo 2!
      const sc = resolveScore(t.awayClubId, t.homeClubId, false, ovr);
      const aggHome = (t.leg1Home ?? 0) + sc.awayGoals;
      const aggAway = (t.leg1Away ?? 0) + sc.homeGoals;
      const winner =
        aggHome > aggAway
          ? t.homeClubId
          : aggAway > aggHome
            ? t.awayClubId
            : pickPenaltyShootoutWinner(t.homeClubId, t.awayClubId);
      return { ...t, leg2Home: sc.homeGoals, leg2Away: sc.awayGoals, winnerClubId: winner };
    }
    return t;
  });
}

export function simulateContinentalWeek(
  cup: ContinentalCupData,
  week: number,
  ovr?: PlayerScoreOverride,
): ContinentalCupData {
  const gRound = CONTINENTAL_GROUP_WEEKS.indexOf(week as (typeof CONTINENTAL_GROUP_WEEKS)[number]);
  if (gRound !== -1) {
    const groups = cup.groups.map((grp) => {
      const round = grp.rounds[gRound];
      if (!round) return grp;
      let standings = grp.standings;
      const nextRound: FixtureMatch[] = round.map((m) => {
        if (m.played) return m;
        const sc = resolveScore(m.homeClubId, m.awayClubId, false, ovr);
        standings = applyScoreToStandings(standings, m.homeClubId, m.awayClubId, sc.homeGoals, sc.awayGoals);
        return { ...m, homeGoals: sc.homeGoals, awayGoals: sc.awayGoals, played: true };
      });
      const rounds = [...grp.rounds];
      rounds[gRound] = nextRound;
      return { ...grp, standings, rounds };
    });

    let roundOf16 = cup.roundOf16;
    if (gRound === 5 && roundOf16.length === 0 && groups.length === 8) {
      // Cruzamento clássico 1º de um grupo vs 2º do grupo vizinho
      const pairs: [string, string][] = [];
      for (let i = 0; i < 8; i += 2) {
        const g1 = sortStandings(groups[i].standings);
        const g2 = sortStandings(groups[i + 1].standings);
        if (g1[0] && g2[1]) pairs.push([g2[1].clubId, g1[0].clubId]);
        if (g2[0] && g1[1]) pairs.push([g1[1].clubId, g2[0].clubId]);
      }
      roundOf16 = pairs.map(([h, a], idx) => ({
        id: `${cup.cupId}_r16_${idx + 1}`,
        homeClubId: h, awayClubId: a,
        leg1Home: null, leg1Away: null, leg2Home: null, leg2Away: null, winnerClubId: null,
      }));
    }
    return { ...cup, groups, roundOf16 };
  }

  if (week === R16_WEEKS[0]) return { ...cup, roundOf16: simTiesLeg(cup.roundOf16, 1, ovr) };
  if (week === R16_WEEKS[1]) {
    const roundOf16 = simTiesLeg(cup.roundOf16, 2, ovr);
    const winners = roundOf16.map((t) => t.winnerClubId!).filter(Boolean);
    return { ...cup, roundOf16, quarterFinals: buildNextTies(winners, `${cup.cupId}_qf`) };
  }
  if (week === QF_WEEKS[0]) return { ...cup, quarterFinals: simTiesLeg(cup.quarterFinals, 1, ovr) };
  if (week === QF_WEEKS[1]) {
    const quarterFinals = simTiesLeg(cup.quarterFinals, 2, ovr);
    const winners = quarterFinals.map((t) => t.winnerClubId!).filter(Boolean);
    return { ...cup, quarterFinals, semiFinals: buildNextTies(winners, `${cup.cupId}_sf`) };
  }
  if (week === SF_WEEKS[0]) return { ...cup, semiFinals: simTiesLeg(cup.semiFinals, 1, ovr) };
  if (week === SF_WEEKS[1]) {
    const semiFinals = simTiesLeg(cup.semiFinals, 2, ovr);
    const w = semiFinals.map((t) => t.winnerClubId!).filter(Boolean);
    const finalMatch: FixtureMatch | null =
      w.length >= 2
        ? { id: `${cup.cupId}_final`, homeClubId: w[0], awayClubId: w[1], homeGoals: null, awayGoals: null, played: false }
        : null;
    return { ...cup, semiFinals, finalMatch };
  }
  if (week === FINAL_WEEK && cup.finalMatch && !cup.finalMatch.played) {
    const sc = resolveScore(cup.finalMatch.homeClubId, cup.finalMatch.awayClubId, true, ovr);
    const champ =
      sc.homeGoals > sc.awayGoals
        ? cup.finalMatch.homeClubId
        : sc.awayGoals > sc.homeGoals
          ? cup.finalMatch.awayClubId
          : pickPenaltyShootoutWinner(cup.finalMatch.homeClubId, cup.finalMatch.awayClubId);
    return {
      ...cup,
      finalMatch: { ...cup.finalMatch, homeGoals: sc.homeGoals, awayGoals: sc.awayGoals, played: true, winnerId: champ },
      championClubId: champ,
    };
  }

  return cup;
}
