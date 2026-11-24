import { CalendarDate } from '../types/common';

const WEEKDAYS_3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'] as const;

const MONTHS_PT = [
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

export interface RollingDayCell {
  offset: number;       // -1 (ontem), 0 (hoje na 2ª posição), +1..+5
  weekday3: string;     // SEG, TER...
  dayNumber: string;    // "06", "07"...
  monthName: string;    // "JULHO"
  year: number;
  gameDayOfWeek: number; // 1 (Seg) .. 7 (Dom)
  isTrainingDay: boolean;
  isMatchDay: boolean;
}

/**
 * Converte a data interna da temporada em datas reais contínuas de calendário
 * (Temporada inicia na primeira segunda-feira de Julho, ex: 06 Jul).
 */
export function getRollingWeekWindow(calendar: CalendarDate): {
  currentMonthLabel: string;
  absoluteStepKey: number;
  days: RollingDayCell[];
} {
  // 2026-07-06 é uma Segunda-feira (UTC)
  const baseYear = calendar.season;
  const startUtc = Date.UTC(baseYear, 6, 6);
  // Ajusta para garantir que o dia 1 da semana 1 caia sempre em Segunda-feira
  const startDow = new Date(startUtc).getUTCDay(); // 0=Dom, 1=Seg...
  const mondayAdjust = startDow === 1 ? 0 : startDow === 0 ? 1 : 8 - startDow;

  const elapsedDays = (calendar.week - 1) * 7 + (calendar.day - 1);
  const todayMs = startUtc + (mondayAdjust + elapsedDays) * 86_400_000;

  // 8 células: 7 visíveis (-1..+5) + 1 célula extra (+6) fora da borda direita para entrada contínua sem pulo
  const offsets = [-1, 0, 1, 2, 3, 4, 5, 6];
  const days: RollingDayCell[] = offsets.map((offset) => {
    const d = new Date(todayMs + offset * 86_400_000);
    const utcDow = d.getUTCDay(); // 0=Dom .. 6=Sáb
    const gameDayOfWeek = utcDow === 0 ? 7 : utcDow; // 1=Seg .. 7=Dom

    return {
      offset,
      weekday3: WEEKDAYS_3[utcDow],
      dayNumber: String(d.getUTCDate()).padStart(2, '0'),
      monthName: MONTHS_PT[d.getUTCMonth()],
      year: d.getUTCFullYear(),
      gameDayOfWeek,
      isTrainingDay: gameDayOfWeek === 2 || gameDayOfWeek === 4,
      isMatchDay: gameDayOfWeek === 6,
    };
  });

  const todayCell = days[1]; // 2ª posição = HOJE

  return {
    currentMonthLabel: `${todayCell.monthName} ${todayCell.year}`,
    absoluteStepKey: calendar.season * 1000 + elapsedDays,
    days,
  };
}
