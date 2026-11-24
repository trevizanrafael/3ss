import { ScheduledClubFixture, WorldSeasonState } from '../../domains/season/seasonTypes';
import { getClubFixtureOnExactDay } from '../../domains/season/worldSeasonEngine';
import { CalendarDate, CareerStage } from '../types/common';

const WEEKDAYS_3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

const MONTHS_PT = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
] as const;

export interface RollingDayCell {
  offset: number;
  weekday3: string;
  dayNumber: string;
  monthName: string;
  year: number;
  gameWeek: number;
  gameDayOfWeek: number;
  isTrainingDay: boolean;
  fixture: ScheduledClubFixture | null;
}

export function getRollingWeekWindow(
  calendar: CalendarDate,
  world: WorldSeasonState,
  clubId: string,
  stage: CareerStage,
): {
  currentMonthLabel: string;
  days: RollingDayCell[];
} {
  // 40 semanas cobrindo o ciclo anual Julho -> Maio/Junho (~9 dias reais por semana de calendário ou contínuo a partir de 6 Jul)
  const baseYear = calendar.season;
  const startUtc = Date.UTC(baseYear, 6, 6);
  const startDow = new Date(startUtc).getUTCDay();
  const mondayAdjust = startDow === 1 ? 0 : startDow === 0 ? 1 : 8 - startDow;

  const elapsedDays = (calendar.week - 1) * 7 + (calendar.day - 1);
  const todayMs = startUtc + (mondayAdjust + elapsedDays) * 86_400_000;

  const offsets = [-1, 0, 1, 2, 3, 4, 5, 6];
  const days: RollingDayCell[] = offsets.map((offset) => {
    const totalStep = elapsedDays + offset;
    const gameWeek = Math.floor(totalStep / 7) + 1;
    const d = new Date(todayMs + offset * 86_400_000);
    const utcDow = d.getUTCDay();
    const gameDayOfWeek = utcDow === 0 ? 7 : utcDow;

    const fixture =
      gameWeek >= 1 && gameWeek <= 40
        ? getClubFixtureOnExactDay(world, clubId, stage, gameWeek, gameDayOfWeek)
        : null;

    // Se quarta-feira tiver jogo continental, não sobrepõe treino; treino é Terça (2) e Quinta (4)
    const isTrainingDay = (gameDayOfWeek === 2 || gameDayOfWeek === 4) && !fixture;

    return {
      offset,
      weekday3: WEEKDAYS_3[utcDow],
      dayNumber: String(d.getUTCDate()).padStart(2, '0'),
      monthName: MONTHS_PT[d.getUTCMonth()],
      year: d.getUTCFullYear(),
      gameWeek,
      gameDayOfWeek,
      isTrainingDay,
      fixture,
    };
  });

  const todayCell = days[1];
  return {
    currentMonthLabel: `${todayCell.monthName} ${todayCell.year}`,
    days,
  };
}
