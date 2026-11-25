import { ContinentalCupId } from '../../data/leagues/leagues';
import { AnyCompetitionId, getQualifierCompId } from '../../data/world/competitionThemes';
import { ClubSeasonStint } from '../../domains/career-stats/careerHistoryTypes';
import { isTransferWindowOpen } from '../../domains/contracts/transferWindowAndValue';
import { NationalCallUpStatus } from '../../domains/international/callUpEvaluator';
import { FRIENDLY_WEEKS } from '../../domains/international/internationalCalendar';
import { NationalCupTournament } from '../../domains/international/internationalTypes';
import {
  FIFA_WINDOW_WEEKS,
  getQualifierRoundIndex,
} from '../../domains/international/qualifiersEngine';
import {
  ALL_CONTINENTAL_WEEKS,
  CONTINENTAL_GROUP_WEEKS,
  FINAL_WEEK,
  QF_WEEKS,
  R16_WEEKS,
  SF_WEEKS,
} from '../../domains/season/continentalEngine';
import { getLeagueRoundForWeek } from '../../domains/season/roundRobinSchedule';
import {
  ContinentalGroup,
  FixtureMatch,
  KnockoutTie,
  ScheduledClubFixture,
  WorldSeasonState,
} from '../../domains/season/seasonTypes';
import {
  findClubLeagueIdInWorld,
  getClubFixtureOnExactDay,
  TOTAL_SEASON_WEEKS,
} from '../../domains/season/worldSeasonEngine';
import { CalendarDate, CareerStage } from '../types/common';

const WEEKDAYS_3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

export const MONTHS_PT = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
] as const;

const ALL_CUPS: ContinentalCupId[] = [
  'CHAMPIONS_LEAGUE',
  'EUROPA_LEAGUE',
  'LIBERTADORES',
  'SUL_AMERICANA',
];

export interface CalendarDayMatchOverview {
  competitionId: AnyCompetitionId;
  myTeamId: string;
  opponentId: string;
  isHome: boolean;
  neutralVenue?: boolean;
  stageLabel: string;
  played: boolean;
  myGoals: number | null;
  oppGoals: number | null;
  myPenGoals?: number | null;
  oppPenGoals?: number | null;
  outcome: 'W' | 'D' | 'L' | null;
}

export interface RollingDayCell {
  offset: number;
  weekday3: string;
  dayNumber: string;
  monthName: string;
  year: number;
  gameWeek: number;
  gameDayOfWeek: number;
  isTrainingDay: boolean;
  isTransferWindowOpen: boolean;
  fixture: ScheduledClubFixture | null;
  matchOverview: CalendarDayMatchOverview | null;
}

export interface SeasonMonthDescriptor {
  key: string;
  year: number;
  monthIndex0: number; // 0..11
  label: string;
}

export interface MonthlyCalendarCell {
  isoKey: string;
  inCurrentMonth: boolean;
  dayNumber: string;
  weekdayIndexMonday0: number; // 0=SEG .. 6=DOM
  gameWeek: number | null;
  gameDayOfWeek: number | null; // 1=SEG .. 7=DOM
  isToday: boolean;
  isPast: boolean;
  isTrainingDay: boolean;
  isTransferWindowOpen: boolean;
  matchOverview: CalendarDayMatchOverview | null;
}

function getSeasonDayZeroMondayUtcMs(seasonYear: number): number {
  const startUtc = Date.UTC(seasonYear, 7, 10);
  const startDow = new Date(startUtc).getUTCDay();
  const mondayAdjust = startDow === 1 ? 0 : startDow === 0 ? 1 : 8 - startDow;
  return startUtc + mondayAdjust * 86_400_000;
}

function buildOverviewFromFixtureMatch(
  m: FixtureMatch,
  myTeamId: string,
  competitionId: AnyCompetitionId,
  stageLabel: string,
  neutralVenue = false,
): CalendarDayMatchOverview {
  const isHome = m.homeClubId === myTeamId;
  const opponentId = isHome ? m.awayClubId : m.homeClubId;
  if (!m.played || m.homeGoals === null || m.awayGoals === null) {
    return {
      competitionId,
      myTeamId,
      opponentId,
      isHome,
      neutralVenue,
      stageLabel,
      played: false,
      myGoals: null,
      oppGoals: null,
      outcome: null,
    };
  }

  const myGoals = isHome ? m.homeGoals : m.awayGoals;
  const oppGoals = isHome ? m.awayGoals : m.homeGoals;
  const myPen = isHome ? (m.penHome ?? null) : (m.penAway ?? null);
  const oppPen = isHome ? (m.penAway ?? null) : (m.penHome ?? null);

  let outcome: 'W' | 'D' | 'L' = 'D';
  if (myGoals > oppGoals) outcome = 'W';
  else if (myGoals < oppGoals) outcome = 'L';
  else if (myPen !== null && oppPen !== null && myPen !== oppPen) {
    outcome = myPen > oppPen ? 'W' : 'L';
  } else if (m.winnerId) {
    outcome = m.winnerId === myTeamId ? 'W' : 'L';
  }

  return {
    competitionId,
    myTeamId,
    opponentId,
    isHome,
    neutralVenue,
    stageLabel,
    played: true,
    myGoals,
    oppGoals,
    myPenGoals: myPen,
    oppPenGoals: oppPen,
    outcome,
  };
}

function findTeamMatchInGroups(
  groups: ContinentalGroup[],
  roundIdx: number,
  teamId: string,
  compId: AnyCompetitionId,
  prefix = '',
  neutralVenue = false,
): CalendarDayMatchOverview | null {
  for (const g of groups) {
    const r = g.rounds[roundIdx];
    if (!r) continue;
    const m = r.find((fx) => fx.homeClubId === teamId || fx.awayClubId === teamId);
    if (m) {
      return buildOverviewFromFixtureMatch(
        m,
        teamId,
        compId,
        `${prefix}${g.groupName} • RODADA ${roundIdx + 1}`,
        neutralVenue,
      );
    }
  }
  return null;
}

function findSummerCupOverview(
  cup: NationalCupTournament | null,
  teamId: string,
  week: number,
  day: number,
): CalendarDayMatchOverview | null {
  if (!cup) return null;
  if (week === 39 && day === 3) return findTeamMatchInGroups(cup.groups, 0, teamId, cup.compId, '', true);
  if (week === 39 && day === 7) return findTeamMatchInGroups(cup.groups, 1, teamId, cup.compId, '', true);
  if (week === 40 && day === 3) return findTeamMatchInGroups(cup.groups, 2, teamId, cup.compId, '', true);
  if (week === 40 && day === 7 && cup.roundOf16.length > 0) {
    const m = cup.roundOf16.find((fx) => fx.homeClubId === teamId || fx.awayClubId === teamId);
    return m ? buildOverviewFromFixtureMatch(m, teamId, cup.compId, 'OITAVAS DE FINAL', true) : null;
  }
  if (week === 41 && day === 3) {
    const m = cup.quarterFinals.find((fx) => fx.homeClubId === teamId || fx.awayClubId === teamId);
    return m ? buildOverviewFromFixtureMatch(m, teamId, cup.compId, 'QUARTAS DE FINAL', true) : null;
  }
  if (week === 41 && day === 7) {
    const m = cup.semiFinals.find((fx) => fx.homeClubId === teamId || fx.awayClubId === teamId);
    return m ? buildOverviewFromFixtureMatch(m, teamId, cup.compId, 'SEMIFINAL', true) : null;
  }
  if (week === 42 && day === 7 && cup.finalMatch) {
    const fm = cup.finalMatch;
    if (fm.homeClubId === teamId || fm.awayClubId === teamId) {
      return buildOverviewFromFixtureMatch(fm, teamId, cup.compId, 'GRANDE FINAL', true);
    }
  }
  return null;
}

function findTwoLegTieOverview(
  ties: KnockoutTie[],
  leg: 1 | 2,
  clubId: string,
  compId: ContinentalCupId,
  stageName: string,
): CalendarDayMatchOverview | null {
  const t = ties.find((tie) => tie.homeClubId === clubId || tie.awayClubId === clubId);
  if (!t) return null;

  if (leg === 1) {
    const isHome = t.homeClubId === clubId;
    const opponentId = isHome ? t.awayClubId : t.homeClubId;
    if (t.leg1Home === null || t.leg1Away === null) {
      return {
        competitionId: compId,
        myTeamId: clubId,
        opponentId,
        isHome,
        stageLabel: `${stageName} (IDA)`,
        played: false,
        myGoals: null,
        oppGoals: null,
        outcome: null,
      };
    }
    const myGoals = isHome ? t.leg1Home : t.leg1Away;
    const oppGoals = isHome ? t.leg1Away : t.leg1Home;
    return {
      competitionId: compId,
      myTeamId: clubId,
      opponentId,
      isHome,
      stageLabel: `${stageName} (IDA)`,
      played: true,
      myGoals,
      oppGoals,
      outcome: myGoals > oppGoals ? 'W' : myGoals < oppGoals ? 'L' : 'D',
    };
  }

  // No jogo de VOLTA, t.awayClubId joga em casa (leg2Home = gols do t.awayClubId)!
  const isHome = t.awayClubId === clubId;
  const opponentId = isHome ? t.homeClubId : t.awayClubId;
  if (t.leg2Home === null || t.leg2Away === null) {
    return {
      competitionId: compId,
      myTeamId: clubId,
      opponentId,
      isHome,
      stageLabel: `${stageName} (VOLTA)`,
      played: false,
      myGoals: null,
      oppGoals: null,
      outcome: null,
    };
  }
  const myGoals = isHome ? t.leg2Home : t.leg2Away;
  const oppGoals = isHome ? t.leg2Away : t.leg2Home;
  const myPen = t.homeClubId === clubId ? (t.penHome ?? null) : (t.penAway ?? null);
  const oppPen = t.homeClubId === clubId ? (t.penAway ?? null) : (t.penHome ?? null);

  let outcome: 'W' | 'D' | 'L' = myGoals > oppGoals ? 'W' : myGoals < oppGoals ? 'L' : 'D';
  if (outcome === 'D' && myPen !== null && oppPen !== null && myPen !== oppPen) {
    outcome = myPen > oppPen ? 'W' : 'L';
  }

  return {
    competitionId: compId,
    myTeamId: clubId,
    opponentId,
    isHome,
    stageLabel: `${stageName} (VOLTA)`,
    played: true,
    myGoals,
    oppGoals,
    myPenGoals: myPen,
    oppPenGoals: oppPen,
    outcome,
  };
}

/**
 * Localiza tanto partidas FUTURAS quanto partidas JÁ DISPUTADAS (com placar e Vitória/Empate/Derrota!)
 * em qualquer dia da temporada para alimentar o Calendário Mensal e o Passador de Semana!
 */
export function getCalendarDayMatchOverview(
  world: WorldSeasonState,
  activeClubId: string,
  stage: CareerStage,
  week: number,
  day: number,
  callUp?: NationalCallUpStatus | null,
  stints?: ClubSeasonStint[],
): CalendarDayMatchOverview | null {
  if (week < 1 || week > TOTAL_SEASON_WEEKS) return null;

  // 1. Jogos da Seleção Nacional (quando convocado)
  if (callUp?.calledUp && world.international) {
    const intl = world.international;
    const ntId = callUp.nationalTeamId;

    if (day === 7 && week <= 38) {
      if (intl.cycleIndex === 0 || intl.cycleIndex === 2) {
        const wIdx = FIFA_WINDOW_WEEKS.indexOf(week as (typeof FIFA_WINDOW_WEEKS)[number]);
        if (wIdx !== -1) {
          for (const grp of intl.qualifiers) {
            if (!grp.standings.some((r) => r.clubId === ntId)) continue;
            const rIdx = getQualifierRoundIndex(grp.rounds.length, wIdx, intl.cycleIndex);
            if (rIdx !== null && grp.rounds[rIdx]) {
              const m = grp.rounds[rIdx].find(
                (fx) => fx.homeClubId === ntId || fx.awayClubId === ntId,
              );
              if (m) {
                return buildOverviewFromFixtureMatch(
                  m,
                  ntId,
                  getQualifierCompId(grp.confederation),
                  `${grp.label} • RODADA ${rIdx + 1}`,
                );
              }
            }
          }
        }
      } else if (intl.cycleIndex === 1 && intl.nationsLeague) {
        const nl = intl.nationsLeague;
        const gIdx = [4, 8, 12, 16, 20, 24].indexOf(week);
        if (gIdx !== -1) {
          const hitA = findTeamMatchInGroups(nl.groups, gIdx, ntId, 'NATIONS_LEAGUE', 'LIGA A • ');
          if (hitA) return hitA;
          if (nl.leagueBGroups) {
            const hitB = findTeamMatchInGroups(
              nl.leagueBGroups,
              gIdx,
              ntId,
              'NATIONS_LEAGUE',
              'LIGA B • ',
            );
            if (hitB) return hitB;
          }
        } else if (week === 28) {
          const m = nl.quarterFinals.find((fx) => fx.homeClubId === ntId || fx.awayClubId === ntId);
          if (m) return buildOverviewFromFixtureMatch(m, ntId, 'NATIONS_LEAGUE', 'QUARTAS • NATIONS', true);
        } else if (week === 32) {
          const m = nl.semiFinals.find((fx) => fx.homeClubId === ntId || fx.awayClubId === ntId);
          if (m) return buildOverviewFromFixtureMatch(m, ntId, 'NATIONS_LEAGUE', 'SEMIFINAL • NATIONS', true);
        } else if (week === 36 && nl.finalMatch) {
          const fm = nl.finalMatch;
          if (fm.homeClubId === ntId || fm.awayClubId === ntId) {
            return buildOverviewFromFixtureMatch(fm, ntId, 'NATIONS_LEAGUE', 'FINAL • NATIONS', true);
          }
        }
      } else if (intl.cycleIndex === 3) {
        const fIdx = FRIENDLY_WEEKS.indexOf(week as (typeof FRIENDLY_WEEKS)[number]);
        if (fIdx !== -1 && intl.friendlyRounds[fIdx]) {
          const m = intl.friendlyRounds[fIdx].find(
            (fx) => fx.homeClubId === ntId || fx.awayClubId === ntId,
          );
          if (m) return buildOverviewFromFixtureMatch(m, ntId, 'INTL_FRIENDLY', 'AMISTOSO DATA FIFA');
        }
      }
    }

    if (week >= 39 && week <= 42 && (day === 3 || day === 7)) {
      if (intl.cycleIndex === 1) {
        const hit =
          findSummerCupOverview(intl.copaAmerica, ntId, week, day) ??
          findSummerCupOverview(intl.euroCup, ntId, week, day);
        if (hit) return hit;
      } else if (intl.cycleIndex === 3) {
        const hit = findSummerCupOverview(intl.worldCup, ntId, week, day);
        if (hit) return hit;
      }
    }
  }

  // Determina qual clube o jogador defendia naquela semana (caso tenha se transferido na Janela de Janeiro!)
  let clubId = activeClubId;
  if (stints && stints.length > 1 && week < 20) {
    clubId = stints[0].clubId;
  }

  // 2. Quarta-feira (day === 3): Copas Continentais de Clubes
  if (day === 3 && week <= 38 && stage !== 'YOUTH' && ALL_CONTINENTAL_WEEKS.has(week)) {
    for (const cupId of ALL_CUPS) {
      const cup = world.continentals[cupId];
      if (!cup) continue;
      const gRound = CONTINENTAL_GROUP_WEEKS.indexOf(
        week as (typeof CONTINENTAL_GROUP_WEEKS)[number],
      );
      if (gRound !== -1) {
        const hit = findTeamMatchInGroups(cup.groups, gRound, clubId, cupId);
        if (hit) return hit;
      } else if (week === R16_WEEKS[0]) {
        const hit = findTwoLegTieOverview(cup.roundOf16, 1, clubId, cupId, 'OITAVAS DE FINAL');
        if (hit) return hit;
      } else if (week === R16_WEEKS[1]) {
        const hit = findTwoLegTieOverview(cup.roundOf16, 2, clubId, cupId, 'OITAVAS DE FINAL');
        if (hit) return hit;
      } else if (week === QF_WEEKS[0]) {
        const hit = findTwoLegTieOverview(cup.quarterFinals, 1, clubId, cupId, 'QUARTAS DE FINAL');
        if (hit) return hit;
      } else if (week === QF_WEEKS[1]) {
        const hit = findTwoLegTieOverview(cup.quarterFinals, 2, clubId, cupId, 'QUARTAS DE FINAL');
        if (hit) return hit;
      } else if (week === SF_WEEKS[0]) {
        const hit = findTwoLegTieOverview(cup.semiFinals, 1, clubId, cupId, 'SEMIFINAL');
        if (hit) return hit;
      } else if (week === SF_WEEKS[1]) {
        const hit = findTwoLegTieOverview(cup.semiFinals, 2, clubId, cupId, 'SEMIFINAL');
        if (hit) return hit;
      } else if (week === FINAL_WEEK && cup.finalMatch) {
        const fm = cup.finalMatch;
        if (fm.homeClubId === clubId || fm.awayClubId === clubId) {
          return buildOverviewFromFixtureMatch(fm, clubId, cupId, 'GRANDE FINAL', true);
        }
      }
    }
  }

  // 3. Sábado (day === 6): Rodada da Liga Nacional
  if (day === 6 && week <= 38) {
    const lgId = findClubLeagueIdInWorld(world, clubId);
    const lg = world.leagues[lgId];
    const rIdx = getLeagueRoundForWeek(week, lg.rounds.length);
    if (rIdx !== null && lg.rounds[rIdx]) {
      const m = lg.rounds[rIdx].find(
        (fx) => fx.homeClubId === clubId || fx.awayClubId === clubId,
      );
      if (m) {
        return buildOverviewFromFixtureMatch(m, clubId, lgId, `RODADA ${rIdx + 1}`);
      }
    }
  }

  return null;
}

export function getRollingWeekWindow(
  calendar: CalendarDate,
  world: WorldSeasonState,
  clubId: string,
  stage: CareerStage,
  callUp?: NationalCallUpStatus | null,
  stints?: ClubSeasonStint[],
): {
  currentMonthLabel: string;
  days: RollingDayCell[];
} {
  const dayZeroMs = getSeasonDayZeroMondayUtcMs(calendar.season);
  const elapsedDays = (calendar.week - 1) * 7 + (calendar.day - 1);
  const todayMs = dayZeroMs + elapsedDays * 86_400_000;

  const offsets = [-1, 0, 1, 2, 3, 4, 5, 6];
  const days: RollingDayCell[] = offsets.map((offset) => {
    const totalStep = elapsedDays + offset;
    const gameWeek = Math.floor(totalStep / 7) + 1;
    const d = new Date(todayMs + offset * 86_400_000);
    const utcDow = d.getUTCDay();
    const gameDayOfWeek = utcDow === 0 ? 7 : utcDow;

    const fixture =
      gameWeek >= 1 && gameWeek <= TOTAL_SEASON_WEEKS
        ? getClubFixtureOnExactDay(world, clubId, stage, gameWeek, gameDayOfWeek, callUp)
        : null;

    const matchOverview =
      gameWeek >= 1 && gameWeek <= TOTAL_SEASON_WEEKS
        ? getCalendarDayMatchOverview(
            world,
            clubId,
            stage,
            gameWeek,
            gameDayOfWeek,
            callUp,
            stints,
          )
        : null;

    const isTrainingDay =
      gameWeek >= 1 &&
      gameWeek <= 38 &&
      (gameDayOfWeek === 2 || gameDayOfWeek === 4) &&
      !matchOverview;

    const windowOpen =
      gameWeek >= 1 && gameWeek <= TOTAL_SEASON_WEEKS && isTransferWindowOpen(gameWeek);

    return {
      offset,
      weekday3: WEEKDAYS_3[utcDow],
      dayNumber: String(d.getUTCDate()).padStart(2, '0'),
      monthName: MONTHS_PT[d.getUTCMonth()],
      year: d.getUTCFullYear(),
      gameWeek,
      gameDayOfWeek,
      isTrainingDay,
      isTransferWindowOpen: windowOpen,
      fixture,
      matchOverview,
    };
  });

  const todayCell = days[1];
  return {
    currentMonthLabel: `${todayCell.monthName} ${todayCell.year}`,
    days,
  };
}

/**
 * Lista todos os meses abrangidos pelas 43 semanas da temporada (Agosto -> Junho).
 */
export function getSeasonMonthsCatalog(seasonYear: number): SeasonMonthDescriptor[] {
  const dayZeroMs = getSeasonDayZeroMondayUtcMs(seasonYear);
  const totalDays = TOTAL_SEASON_WEEKS * 7;
  const seen = new Set<string>();
  const months: SeasonMonthDescriptor[] = [];

  for (let step = 0; step < totalDays; step++) {
    const d = new Date(dayZeroMs + step * 86_400_000);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    if (!seen.has(key)) {
      seen.add(key);
      months.push({
        key,
        year: y,
        monthIndex0: m,
        label: `${MONTHS_PT[m]} ${y}`,
      });
    }
  }
  return months;
}

export function getCurrentCalendarMonthKey(calendar: CalendarDate): string {
  const dayZeroMs = getSeasonDayZeroMondayUtcMs(calendar.season);
  const elapsedDays = (calendar.week - 1) * 7 + (calendar.day - 1);
  const d = new Date(dayZeroMs + elapsedDays * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Monta a grade completa de um mês (colunas SEG..DOM) com todos os jogos passados (placar V/E/D),
 * jogos futuros, treinos e o traço azul superior da Janela de Transferências aberta!
 */
export function buildFullMonthCalendarGrid(
  monthDesc: SeasonMonthDescriptor,
  calendar: CalendarDate,
  world: WorldSeasonState,
  clubId: string,
  stage: CareerStage,
  callUp?: NationalCallUpStatus | null,
  stints?: ClubSeasonStint[],
): MonthlyCalendarCell[] {
  const dayZeroMs = getSeasonDayZeroMondayUtcMs(calendar.season);
  const todayElapsed = (calendar.week - 1) * 7 + (calendar.day - 1);

  const firstOfMonthMs = Date.UTC(monthDesc.year, monthDesc.monthIndex0, 1);
  const firstUtcDow = new Date(firstOfMonthMs).getUTCDay(); // 0=DOM, 1=SEG..6=SÁB
  const leadingDays = firstUtcDow === 0 ? 6 : firstUtcDow - 1;

  const daysInMonth = new Date(Date.UTC(monthDesc.year, monthDesc.monthIndex0 + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const gridStartMs = firstOfMonthMs - leadingDays * 86_400_000;

  const cells: MonthlyCalendarCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const cellMs = gridStartMs + i * 86_400_000;
    const d = new Date(cellMs);
    const inCurrentMonth = d.getUTCMonth() === monthDesc.monthIndex0;
    const stepFromSeasonStart = Math.round((cellMs - dayZeroMs) / 86_400_000);
    const inSeasonBounds =
      stepFromSeasonStart >= 0 && stepFromSeasonStart < TOTAL_SEASON_WEEKS * 7;

    const gameWeek = inSeasonBounds ? Math.floor(stepFromSeasonStart / 7) + 1 : null;
    const utcDow = d.getUTCDay();
    const gameDayOfWeek = inSeasonBounds ? (utcDow === 0 ? 7 : utcDow) : null;

    const matchOverview =
      gameWeek !== null && gameDayOfWeek !== null
        ? getCalendarDayMatchOverview(
            world,
            clubId,
            stage,
            gameWeek,
            gameDayOfWeek,
            callUp,
            stints,
          )
        : null;

    const isTrainingDay =
      gameWeek !== null &&
      gameWeek <= 38 &&
      (gameDayOfWeek === 2 || gameDayOfWeek === 4) &&
      !matchOverview;

    const windowOpen = gameWeek !== null && isTransferWindowOpen(gameWeek);

    cells.push({
      isoKey: d.toISOString().slice(0, 10),
      inCurrentMonth,
      dayNumber: String(d.getUTCDate()).padStart(2, '0'),
      weekdayIndexMonday0: i % 7,
      gameWeek,
      gameDayOfWeek,
      isToday: stepFromSeasonStart === todayElapsed,
      isPast: stepFromSeasonStart < todayElapsed,
      isTrainingDay,
      isTransferWindowOpen: windowOpen,
      matchOverview,
    });
  }

  return cells;
}
