import { LeagueId, LEAGUES } from '../../data/leagues/leagues';
import { PositionCode } from '../../shared/types/common';
import { clamp } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';
import { TOTAL_SEASON_WEEKS } from '../season/worldSeasonEngine';
import type { ActiveContract, ContractGoal } from './contractEngine';

export type TransferListStatus = 'UNLISTED' | 'TRANSFER_LISTED' | 'LOAN_LISTED';

export interface TransferWindowStatus {
  isOpen: boolean;
  windowCode: 'SUMMER_START' | 'WINTER_MID' | 'SUMMER_END' | 'CLOSED';
  windowLabel: string;
  weeksRemainingInWindow: number;
  nextWindowWeek: number;
  nextWindowLabel: string;
}

/**
 * Janelas Oficiais de Transferências (inspiradas no calendário do Modo Carreira FIFA 18):
 * - Semanas 1..8 (Agosto e Setembro — 2 primeiros meses): Janela de Início de Temporada ABERTA
 * - Semanas 20..23 (Janeiro): Janela de Meio de Temporada ABERTA
 * - Semanas 39..43 (Maio e Junho — reta final pós-ligas + Gala): Janela de Fim de Temporada ABERTA
 * Fora dessas semanas, transferências e empréstimos ficam bloqueados!
 */
export function isTransferWindowOpen(week: number): boolean {
  if (week >= 1 && week <= 8) return true;
  if (week >= 20 && week <= 23) return true;
  if (week >= 39 && week <= TOTAL_SEASON_WEEKS) return true;
  return false;
}

export function getTransferWindowStatus(week: number): TransferWindowStatus {
  if (week >= 1 && week <= 8) {
    return {
      isOpen: true,
      windowCode: 'SUMMER_START',
      windowLabel: 'JANELA DE INÍCIO DE TEMPORADA ABERTA',
      weeksRemainingInWindow: 8 - week + 1,
      nextWindowWeek: 20,
      nextWindowLabel: 'Janela de Janeiro (Semana 20)',
    };
  }
  if (week >= 20 && week <= 23) {
    return {
      isOpen: true,
      windowCode: 'WINTER_MID',
      windowLabel: 'JANELA DE MEIO DE TEMPORADA ABERTA (JANEIRO)',
      weeksRemainingInWindow: 23 - week + 1,
      nextWindowWeek: 39,
      nextWindowLabel: 'Janela de Fim de Temporada (Semana 39)',
    };
  }
  if (week >= 39 && week <= TOTAL_SEASON_WEEKS) {
    return {
      isOpen: true,
      windowCode: 'SUMMER_END',
      windowLabel: 'JANELA DE FIM DE TEMPORADA ABERTA',
      weeksRemainingInWindow: TOTAL_SEASON_WEEKS - week + 1,
      nextWindowWeek: 1,
      nextWindowLabel: 'Continua nos 2 primeiros meses da nova temporada',
    };
  }

  if (week < 20) {
    return {
      isOpen: false,
      windowCode: 'CLOSED',
      windowLabel: 'JANELA FECHADA',
      weeksRemainingInWindow: 0,
      nextWindowWeek: 20,
      nextWindowLabel: `Abre em ${20 - week} semana(s) (Semana 20 • Janeiro)`,
    };
  }

  return {
    isOpen: false,
    windowCode: 'CLOSED',
    windowLabel: 'JANELA FECHADA',
    weeksRemainingInWindow: 0,
    nextWindowWeek: 39,
    nextWindowLabel: `Abre em ${39 - week} semana(s) (Semana 39 • Fim de Temporada)`,
  };
}

function getLeagueMarketMultiplier(leagueId: LeagueId): number {
  if (
    leagueId === 'ENG_1' ||
    leagueId === 'ESP_1' ||
    leagueId === 'ITA_1' ||
    leagueId === 'GER_1' ||
    leagueId === 'FRA_1'
  ) {
    return 1.22;
  }
  const cfg = LEAGUES[leagueId];
  if (!cfg) return 1.0;
  return cfg.division === 1 ? 1.0 : 0.82;
}

function getAgeMarketMultiplier(age: number): number {
  if (age <= 20) return 1.36; // Wonderkid / alto potencial estilo FIFA 18
  if (age <= 23) return 1.26;
  if (age <= 26) return 1.12;
  if (age <= 28) return 1.0;
  if (age <= 30) return 0.84;
  if (age <= 32) return 0.64;
  return 0.44;
}

function getPositionMarketMultiplier(pos: PositionCode): number {
  const sec = getPositionSector(pos);
  if (sec === 'ATK') return 1.14;
  if (sec === 'MID') return 1.03;
  return 0.92;
}

function roundMarketValue(raw: number): number {
  if (raw < 1_000_000) return Math.max(150_000, Math.round(raw / 25_000) * 25_000);
  if (raw < 15_000_000) return Math.round(raw / 100_000) * 100_000;
  if (raw < 60_000_000) return Math.round(raw / 500_000) * 500_000;
  return Math.round(raw / 1_000_000) * 1_000_000;
}

/**
 * Calcula Valor de Mercado estilo FIFA 18 (base exponencial em OVR × Idade/Potencial × Posição × Liga × Fase na Meta).
 */
export function computeHistoricalMarketValue(
  ovr: number,
  age: number,
  position: PositionCode,
  leagueId: LeagueId,
  prestigeBonus = 0,
): number {
  const clampedOvr = clamp(ovr, 50, 99);
  // Curva exponencial realista: ~R$ 950 mil aos 60 OVR -> ~R$ 7,5M aos 70 -> ~R$ 48M aos 80 -> ~R$ 195M aos 90
  const baseValue = 320_000 * Math.pow(1.205, clampedOvr - 54);
  const ageMult = getAgeMarketMultiplier(age);
  const posMult = getPositionMarketMultiplier(position);
  const lgMult = getLeagueMarketMultiplier(leagueId);
  const prestigeMult = 1 + Math.min(0.32, prestigeBonus * 0.03);

  return roundMarketValue(baseValue * ageMult * posMult * lgMult * prestigeMult);
}

export function computePlayerMarketValue(
  player: CareerPlayer,
  leagueId: LeagueId,
  seasonGoal?: ContractGoal | null,
  currentWeek = 1,
  awardPrestigeBoost = 0,
): number {
  const base = computeHistoricalMarketValue(
    player.overall,
    player.age,
    player.position,
    leagueId,
    awardPrestigeBoost + (player.careerTotals.nationalCaps ? Math.min(4, Math.floor(player.careerTotals.nationalCaps / 4)) : 0),
  );

  if (!seasonGoal || currentWeek <= 3) {
    return base;
  }

  const expectedProgress = Math.max(1, seasonGoal.target * clamp(currentWeek / 36, 0.1, 1.0));
  const ratio = seasonGoal.current / expectedProgress;
  // Acima da meta valoriza até +30%; muito abaixo da meta desvaloriza até -16%
  const formFactor =
    ratio >= 1.0
      ? 1 + Math.min(0.3, (ratio - 1.0) * 0.25)
      : Math.max(0.84, 1 - (1.0 - ratio) * 0.22);

  return roundMarketValue(base * formFactor);
}

export type MetaStandingTier = 'EXCEEDING' | 'ON_TRACK' | 'WARNING' | 'BELOW_META';

export interface ManagerMetaStanding {
  tier: MetaStandingTier;
  ratio: number;
  expectedNow: number;
  trustScore: number; // 0..100
  statusLabel: string;
  managerNote: string;
  color: string;
}

/**
 * Avalia o ritmo do jogador em relação à Meta Contratual estipulada pelo Treinador (estilo FIFA 18 Manager Rating).
 */
export function evaluateManagerMetaStanding(
  contract: ActiveContract,
  currentWeek: number,
): ManagerMetaStanding {
  const goal = contract.seasonGoal;
  if (goal.completed) {
    const overRatio = goal.current / Math.max(1, goal.target);
    return {
      tier: 'EXCEEDING',
      ratio: Math.max(1.2, overRatio),
      expectedNow: goal.target,
      trustScore: 96,
      statusLabel: 'ACIMA DA META ★ COBIÇADO NO MERCADO',
      managerNote:
        'Treinador encantado com sua entrega! Clubes maiores já monitoram você para a janela.',
      color: '#2DBE60',
    };
  }

  // Nas primeiras 6 semanas o treinador ainda está avaliando o início de trabalho
  if (currentWeek <= 6) {
    const earlyTrust = clamp(72 + goal.current * 6, 65, 92);
    return {
      tier: goal.current >= 3 ? 'EXCEEDING' : 'ON_TRACK',
      ratio: 1,
      expectedNow: Math.max(1, Math.round((goal.target * currentWeek) / 36)),
      trustScore: earlyTrust,
      statusLabel: goal.current >= 3 ? 'INÍCIO METEÓRICO' : 'EM AVALIAÇÃO INICIAL',
      managerNote: 'Início de temporada: mantenha constância para ganhar moral com o técnico.',
      color: goal.current >= 3 ? '#2DBE60' : '#C8A45D',
    };
  }

  const seasonFrac = clamp((currentWeek - 1) / 35, 0.14, 1.0);
  const expectedRaw = Math.max(1, goal.target * seasonFrac);
  const expectedNow = Math.max(1, Math.round(expectedRaw));
  const ratio = goal.current / expectedRaw;

  if (ratio >= 1.22) {
    return {
      tier: 'EXCEEDING',
      ratio,
      expectedNow,
      trustScore: clamp(Math.round(85 + (ratio - 1.2) * 20), 85, 99),
      statusLabel: 'MUITO ACIMA DA META • EM ALTA',
      managerNote:
        'Desempenho de destaque! Você atrai olheiros de clubes maiores para a janela de transferências.',
      color: '#2DBE60',
    };
  }

  if (ratio >= 0.78) {
    return {
      tier: 'ON_TRACK',
      ratio,
      expectedNow,
      trustScore: clamp(Math.round(68 + (ratio - 0.78) * 38), 68, 84),
      statusLabel: 'DENTRO DA META DO CLUBE',
      managerNote: `Ritmo sólido (${goal.current}/${goal.target}; esperado hoje: ~${expectedNow}).`,
      color: '#C8A45D',
    };
  }

  if (ratio >= 0.48) {
    return {
      tier: 'WARNING',
      ratio,
      expectedNow,
      trustScore: clamp(Math.round(46 + (ratio - 0.48) * 65), 45, 65),
      statusLabel: 'ATENÇÃO • ABAIXO DO RITMO',
      managerNote: `Treinador cobra reação (${goal.current}/${goal.target}; esperado hoje: ~${expectedNow}).`,
      color: '#D9822B',
    };
  }

  return {
    tier: 'BELOW_META',
    ratio,
    expectedNow,
    trustScore: clamp(Math.round(24 + ratio * 42), 20, 44),
    statusLabel: 'MUITO ABAIXO DA META • RISCO DE EMPRÉSTIMO',
    managerNote: `Rendimento insuficiente (${goal.current}/${goal.target}). O técnico cogita emprestá-lo na janela.`,
    color: '#C94040',
  };
}
