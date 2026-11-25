import { CalendarDate, DAYS_OF_WEEK, SquadRole } from '../types/common';

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactMoney(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}R$ ${(abs / 1_000_000_000).toFixed(2).replace('.', ',')} bi`;
  }
  if (abs >= 1_000_000) {
    const decimals = abs >= 100_000_000 ? 0 : 1;
    return `${sign}R$ ${(abs / 1_000_000).toFixed(decimals).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${Math.round(abs / 1_000)} mil`;
  }
  return formatMoney(amount);
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
