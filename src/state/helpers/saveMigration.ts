import { COUNTRIES, isLeagueCountryCode } from '../../data/countries/countries';
import { INITIAL_PERIOD_STATS } from '../../domains/awards/awardTypes';
import {
  createInitialInternationalState,
  simulateInternationalDay,
} from '../../domains/international/internationalCalendar';
import { CareerState } from '../careerTypes';

const LEGACY_KEYS = ['three-stars-soccer-career-v3', 'three-stars-soccer-career-v2'];

/**
 * Resgata saves de chaves anteriores no localStorage caso a chave v4 ainda esteja vazia,
 * garantindo que NENHUM save antigo seja perdido!
 */
export function rescueLegacySaveIfNeeded(currentStorageKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(currentStorageKey)) return;
    for (const oldKey of LEGACY_KEYS) {
      const raw = window.localStorage.getItem(oldKey);
      if (raw) {
        window.localStorage.setItem(currentStorageKey, raw);
        break;
      }
    }
  } catch {
    // Ignorar caso modo privado bloqueie acesso
  }
}

/**
 * Migra saves antigos de forma 100% não-destrutiva:
 * - Preserva clube, atributos, dinheiro, troféus e temporada em andamento.
 * - Se não tinha `startingLeagueCountry`, copia a nacionalidade (ou vira Brasileiro na Liga Brasileira).
 * - Se `worldSeason.international` não existia, inicializa as Eliminatórias e simula as Datas FIFA passadas!
 */
export function migratePersistedCareerState(
  persistedUnknown: unknown,
  currentState: CareerState,
): CareerState {
  if (!persistedUnknown || typeof persistedUnknown !== 'object') {
    return currentState;
  }

  const persisted = persistedUnknown as Partial<CareerState>;
  const merged: CareerState = {
    ...currentState,
    ...persisted,
  };

  if (merged.player) {
    const rawNat = merged.player.nationality;
    const validNat = rawNat && rawNat in COUNTRIES ? rawNat : 'BRA';
    const rawStartLg = merged.player.startingLeagueCountry;
    const validStartLg =
      rawStartLg && isLeagueCountryCode(rawStartLg)
        ? rawStartLg
        : isLeagueCountryCode(validNat)
          ? validNat
          : 'BRA';

    merged.player = {
      ...merged.player,
      nationality: validNat,
      startingLeagueCountry: validStartLg,
      careerTotals: {
        ...merged.player.careerTotals,
        nationalCaps: merged.player.careerTotals?.nationalCaps ?? 0,
        nationalGoals: merged.player.careerTotals?.nationalGoals ?? 0,
      },
    };
  }

  merged.periodStats = {
    ...INITIAL_PERIOD_STATS,
    ...(persisted.periodStats ?? {}),
  };

  if (merged.worldSeason && !merged.worldSeason.international) {
    const seasonYear = merged.worldSeason.seasonYear ?? merged.calendar?.season ?? 2026;
    let intl = createInitialInternationalState(seasonYear);
    const currWeek = merged.calendar?.week ?? 1;
    const currDay = merged.calendar?.day ?? 1;

    // Avança silenciosamente as Datas FIFA anteriores à semana atual do save antigo!
    for (let w = 1; w <= currWeek; w++) {
      const maxD = w === currWeek ? currDay - 1 : 7;
      for (let d = 1; d <= maxD; d++) {
        if (d === 7 || (w >= 39 && w <= 42 && d === 3)) {
          intl = simulateInternationalDay(intl, w, d);
        }
      }
    }

    merged.worldSeason = {
      ...merged.worldSeason,
      international: intl,
    };
  }

  return merged;
}
