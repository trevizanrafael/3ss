import { ALL_CLUBS, ALL_NATIONAL_TEAMS, getClubById } from '../../data/clubs';
import { ClubData } from '../../data/clubs/types';
import {
  GLOBAL_RIVALRIES_CATALOG,
  NamedRivalrySpec,
  RivalryTier,
} from '../../data/world/rivalriesCatalog';

export interface PrimaryDerbyMatchup {
  homeClub: ClubData;
  rivalClub: ClubData;
  /** Versão com uniforme ajustado caso as cores principais colidam no gramado 3D */
  awayRenderClub: ClubData;
  derbyName: string;
  tier: RivalryTier;
}

const TIER_PRIORITY: Record<RivalryTier, number> = {
  FEROZ: 3,
  HISTORICO: 2,
  LOCAL: 1,
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 0;
    const g = parseInt(clean[1] + clean[1], 16) || 0;
    const b = parseInt(clean[2] + clean[2], 16) || 0;
    return [r, g, b];
  }
  const num = parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(num)) return [30, 36, 48];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function perceptualColorDistance(hexA: string, hexB: string): number {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const rMean = (r1 + r2) * 0.5;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
}

function approxGeoDistKm(a: ClubData, b: ClubData): number {
  if (a.lat === undefined || a.lng === undefined || b.lat === undefined || b.lng === undefined) {
    return 9999;
  }
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * Garante contraste nítido entre os 10 jogadores de linha do Mandante e os 10 do Visitante!
 */
export function buildNonClashingAwayClub(homeClub: ClubData, rivalClub: ClubData): ClubData {
  const homeP = homeClub.primaryColor || '#1E2430';
  const awayP = rivalClub.primaryColor || '#F5F5F7';
  const awayS = rivalClub.secondaryColor || '#111827';

  if (perceptualColorDistance(homeP, awayP) >= 165) {
    return rivalClub;
  }

  // Tenta usar o Uniforme 2 (cor secundária oficial do rival) se contrastar bem com o mandante
  if (perceptualColorDistance(homeP, awayS) >= 175) {
    return {
      ...rivalClub,
      primaryColor: awayS,
      secondaryColor: awayP,
      pattern: 'solid',
    };
  }

  // Fallback de Uniforme Reserva de Contraste Total (Branco Gelo contra escuro, ou Obsidiana Dourada contra claro)
  const [hr, hg, hb] = hexToRgb(homeP);
  const homeLuma = 0.299 * hr + 0.587 * hg + 0.114 * hb;
  if (homeLuma < 145) {
    return {
      ...rivalClub,
      primaryColor: '#F4F6FA',
      secondaryColor: awayP,
      pattern: 'solid',
    };
  }

  return {
    ...rivalClub,
    primaryColor: '#131722',
    secondaryColor: '#F4F6FA',
    pattern: 'solid',
  };
}

/**
 * Descobre o Clássico Principal (maior rival histórico/regional) do clube atual da carreira!
 */
export function resolvePrimaryRivalForClub(homeClub: ClubData): PrimaryDerbyMatchup {
  const catalogMatches: NamedRivalrySpec[] = GLOBAL_RIVALRIES_CATALOG.filter(
    (r) => r.clubA === homeClub.id || r.clubB === homeClub.id,
  ).sort((a, b) => TIER_PRIORITY[b.tier] - TIER_PRIORITY[a.tier]);

  if (catalogMatches.length > 0) {
    const best = catalogMatches[0];
    const rivalId = best.clubA === homeClub.id ? best.clubB : best.clubA;
    const rivalClub = getClubById(rivalId);
    if (rivalClub && rivalClub.id !== homeClub.id) {
      return {
        homeClub,
        rivalClub,
        awayRenderClub: buildNonClashingAwayClub(homeClub, rivalClub),
        derbyName: best.name,
        tier: best.tier,
      };
    }
  }

  // Fallback inteligente p/ clubes ou seleções fora do catálogo explícito:
  // Prioriza mesma cidade / menor distância geográfica na mesma liga ou país, e OVR parelho!
  const pool = homeClub.isNationalTeam ? ALL_NATIONAL_TEAMS : ALL_CLUBS;
  const candidates = pool.filter((c) => c.id !== homeClub.id);

  const scored = candidates
    .map((c) => {
      let score = 0;
      if (c.country === homeClub.country) score += 500;
      if (c.leagueId === homeClub.leagueId) score += 260;
      const sameCity =
        Boolean(c.city && homeClub.city) &&
        c.city!.trim().toLowerCase() === homeClub.city!.trim().toLowerCase();
      const distKm = approxGeoDistKm(homeClub, c);
      if (sameCity) score += 400;
      else if (distKm < 45) score += 300;
      else if (distKm < 250) score += 140;

      score -= Math.abs(c.squadAvgOvr - homeClub.squadAvgOvr) * 6;
      return { club: c, score, sameCity, distKm };
    })
    .sort((a, b) => b.score - a.score);

  const chosen = scored[0]?.club ?? getClubById('palmeiras_2029');
  const topMeta = scored[0];
  const derbyName = topMeta?.sameCity && homeClub.city
    ? `DÉRBI DE ${homeClub.city.toUpperCase()}`
    : topMeta && topMeta.distKm < 90
      ? 'CLÁSSICO REGIONAL'
      : `CLÁSSICO • ${homeClub.shortName} × ${chosen.shortName}`;

  return {
    homeClub,
    rivalClub: chosen,
    awayRenderClub: buildNonClashingAwayClub(homeClub, chosen),
    derbyName,
    tier: topMeta?.sameCity ? 'HISTORICO' : 'LOCAL',
  };
}
