import { getClubById } from '../../data/clubs';
import {
  GLOBAL_RIVALRIES_CATALOG,
  NamedRivalrySpec,
  RivalryTier,
} from '../../data/world/rivalriesCatalog';

export type StadiumDerbyMood =
  | 'HOSTIL_CONTRA'
  | 'CALDEIRAO_FAVOR'
  | 'DIVIDIDO_NEUTRO';

/**
 * Contexto completo de Clássico & Atmosfera de Estádio.
 * Projetado para alimentar tanto o Modo Carreira atual quanto a futura engine 3D de estádio/torcida!
 */
export interface RivalryMatchContext {
  derbyName: string;
  tier: RivalryTier;
  stadiumMood: StadiumDerbyMood;
  /** 0 a 100 — nível de hostilidade/pressão contra o time do usuário (usado para vaias, fumaça e pressão no estádio!) */
  hostilityAgainstPlayer: number;
  /** Volume sonoro estimado da arquibancada em decibéis (ex: 106..117 dB) */
  crowdDecibels: number;
  /** Ativa sinalizadores, fumaça densa e mosaicos quando a partida 3D entrar em campo */
  pyroAndTifoActive: boolean;
  /** Probabilidade de vaia sonora nas tocadas do jogador quando visitante */
  whistleIntensity: number;
  /** Manchete curta de clima para o Pré-Jogo e Mapa */
  atmosphereHeadline: string;
  /** Multiplicador de bicho financeiro por gol/assistência no Clássico */
  bonusMultiplier: number;
}

const PAIR_LOOKUP = new Map<string, NamedRivalrySpec>();
for (const item of GLOBAL_RIVALRIES_CATALOG) {
  const k1 = `${item.clubA}__${item.clubB}`;
  const k2 = `${item.clubB}__${item.clubA}`;
  PAIR_LOOKUP.set(k1, item);
  PAIR_LOOKUP.set(k2, item);
}

function approxDistanceKm(
  lat1?: number,
  lng1?: number,
  lat2?: number,
  lng2?: number,
): number {
  if (
    lat1 === undefined ||
    lng1 === undefined ||
    lat2 === undefined ||
    lng2 === undefined
  ) {
    return 9999;
  }
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolveRivalryMatchContext(
  myTeamId: string,
  opponentId: string,
  isHome: boolean,
  isNeutralVenue = false,
): RivalryMatchContext | null {
  if (!myTeamId || !opponentId || myTeamId === opponentId) return null;

  const catalogHit = PAIR_LOOKUP.get(`${myTeamId}__${opponentId}`);
  let derbyName = catalogHit?.name ?? null;
  let tier: RivalryTier = catalogHit?.tier ?? 'LOCAL';

  // Fallback Geográfico: clubes profissionais da mesma cidade / < 22km viram Dérbi Local automaticamente!
  if (!derbyName) {
    const cA = getClubById(myTeamId);
    const cB = getClubById(opponentId);
    if (!cA.isNationalTeam && !cB.isNationalTeam && cA.country === cB.country) {
      const sameCity =
        Boolean(cA.city && cB.city) &&
        cA.city!.trim().toLowerCase() === cB.city!.trim().toLowerCase();
      const dist = approxDistanceKm(cA.lat, cA.lng, cB.lat, cB.lng);
      if (sameCity || dist <= 20) {
        derbyName = cA.city ? `DÉRBI DE ${cA.city.toUpperCase()}` : 'DÉRBI LOCAL';
        tier = 'LOCAL';
      }
    }
  }

  if (!derbyName) return null;

  const stadiumMood: StadiumDerbyMood = isNeutralVenue
    ? 'DIVIDIDO_NEUTRO'
    : isHome
      ? 'CALDEIRAO_FAVOR'
      : 'HOSTIL_CONTRA';

  const baseDb = tier === 'FEROZ' ? 116 : tier === 'HISTORICO' ? 111 : 106;

  const hostilityAgainstPlayer =
    stadiumMood === 'HOSTIL_CONTRA'
      ? tier === 'FEROZ'
        ? 96
        : tier === 'HISTORICO'
          ? 85
          : 74
      : stadiumMood === 'DIVIDIDO_NEUTRO'
        ? tier === 'FEROZ'
          ? 62
          : 50
        : tier === 'FEROZ'
          ? 22
          : 15;

  const whistleIntensity =
    stadiumMood === 'HOSTIL_CONTRA'
      ? tier === 'FEROZ'
        ? 0.92
        : tier === 'HISTORICO'
          ? 0.72
          : 0.52
      : stadiumMood === 'DIVIDIDO_NEUTRO'
        ? 0.45
        : 0.08;

  const atmosphereHeadline =
    stadiumMood === 'HOSTIL_CONTRA'
      ? tier === 'FEROZ'
        ? 'TERRITÓRIO INIMIGO • VAIAS PESADAS, FUMAÇA & PRESSÃO MÁXIMA'
        : 'ESTÁDIO HOSTIL • TORCIDA RIVAL PRESSIONANDO CADA LANCE'
      : stadiumMood === 'DIVIDIDO_NEUTRO'
        ? 'ARQUIBANCADA MEIO A MEIO • CLIMA TENSO DE DECISÃO'
        : tier === 'FEROZ'
          ? 'CALDEIRÃO A FAVOR • MOSAICO, SINALIZADORES & APOIO TOTAL'
          : 'CASA CHEIA DE CLÁSSICO • TORCIDA EMPURRANDO O TIME';

  const bonusMultiplier = tier === 'FEROZ' ? 1.6 : tier === 'HISTORICO' ? 1.38 : 1.2;

  return {
    derbyName,
    tier,
    stadiumMood,
    hostilityAgainstPlayer,
    crowdDecibels: baseDb,
    pyroAndTifoActive: tier === 'FEROZ' || tier === 'HISTORICO',
    whistleIntensity,
    atmosphereHeadline,
    bonusMultiplier,
  };
}
