import { shuffleArray } from '../../shared/utils/math';
import { FixtureMatch } from './seasonTypes';

/**
 * Gera tabela Turno e Returno pelo método circular de Berger
 * (limitando a até maxRounds rodadas para caber nas 38 semanas anuais).
 */
export function generateRoundRobinSchedule(
  rawClubIds: string[],
  prefix: string,
  maxRounds = 38,
): FixtureMatch[][] {
  const list = shuffleArray(rawClubIds);
  if (list.length < 2) return [];

  const teams = list.length % 2 === 0 ? [...list] : [...list, '__BYE__'];
  const n = teams.length;
  const half = n / 2;
  const firstHalfRounds: [string, string][][] = [];

  const rotating = teams.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const current = [teams[0], ...rotating];
    const pairs: [string, string][] = [];

    for (let i = 0; i < half; i++) {
      const t1 = current[i];
      const t2 = current[n - 1 - i];
      if (t1 !== '__BYE__' && t2 !== '__BYE__') {
        pairs.push(r % 2 === 0 ? [t1, t2] : [t2, t1]);
      }
    }
    firstHalfRounds.push(pairs);

    // Rotaciona no sentido horário mantendo o índice 0 fixo
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  const secondHalfRounds: [string, string][][] = firstHalfRounds.map((pairs) =>
    pairs.map(([h, a]) => [a, h]),
  );

  const allPairRounds = [...firstHalfRounds, ...secondHalfRounds].slice(0, maxRounds);

  return allPairRounds.map((pairs, rIdx) =>
    pairs.map(([homeClubId, awayClubId], mIdx) => ({
      id: `${prefix}_r${rIdx + 1}_m${mIdx + 1}`,
      homeClubId,
      awayClubId,
      homeGoals: null,
      awayGoals: null,
      played: false,
    })),
  );
}

/**
 * Mapeia a Semana Anual (1..38) para o índice da rodada da liga,
 * distribuindo ligas de 34 rodadas (ex: Bundesliga) uniformemente até a Semana 38.
 */
export function getLeagueRoundForWeek(week: number, totalRounds: number): number | null {
  if (week < 1 || week > 38 || totalRounds === 0) return null;
  if (totalRounds >= 38) return week - 1;
  // Para ligas de 34 rodadas (18 clubes), folga nas semanas 12, 20, 27, 35
  const prevIdx = week === 1 ? -1 : Math.floor(((week - 2) * totalRounds) / 38);
  const currIdx = Math.floor(((week - 1) * totalRounds) / 38);
  return currIdx > prevIdx ? currIdx : null;
}
