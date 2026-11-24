import { CalendarDate, DAYS_OF_WEEK, SquadRole } from '../types/common';

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSquadRole(role: SquadRole): string {
  const labels: Record<SquadRole, string> = {
    BASE_RESERVA: 'Reserva da Base',
    BASE_TITULAR: 'Titular da Base',
    PROMESSA: 'Jovem Promessa (Profissional)',
    RESERVA: 'Reserva / Rotação',
    TITULAR: 'Titular Absoluto',
    ESTRELA: 'Estrela da Equipe',
  };
  return labels[role];
}

export function formatCalendarDate(date: CalendarDate): string {
  const dayName = DAYS_OF_WEEK[date.day - 1] ?? 'Dia';
  return `Temporada ${date.season} • Semana ${date.week} • ${dayName}`;
}

export function getOvrBadgeStyle(ovr: number): string {
  if (ovr >= 85) return 'bg-amber-500/20 text-amber-300 border-amber-400/50';
  if (ovr >= 75) return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50';
  if (ovr >= 65) return 'bg-sky-500/20 text-sky-300 border-sky-400/50';
  return 'bg-slate-700/50 text-slate-200 border-slate-500/40';
}
