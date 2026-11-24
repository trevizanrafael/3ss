import { getNationalClubsByCountry } from '../../data/clubs';
import { ClubData, RealSquadStar } from '../../data/clubs/types';
import { LEAGUES } from '../../data/leagues/leagues';
import { PositionCode, SquadRole, StarRating } from '../../shared/types/common';
import { shuffleArray } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';

export interface YouthAcademyOffer {
  clubId: string;
  youthTeamName: string;
  role: Extract<SquadRole, 'BASE_RESERVA' | 'BASE_TITULAR'>;
  monthlyAllowance: number;
  pathwayDifficulty: 'ACESSIVEL' | 'COMPETITIVO' | 'MUITO_DIFICIL';
  seniorCompetitor: RealSquadStar;
  scoutNote: string;
}

function findDirectCompetitor(club: ClubData, pos: PositionCode): RealSquadStar {
  const exact = club.keyPlayers.find((p) => p.pos === pos);
  if (exact) return exact;

  const sector = getPositionSector(pos);
  const sameSector = club.keyPlayers.find(
    (p) => p.pos !== 'GK' && getPositionSector(p.pos) === sector,
  );
  if (sameSector) return sameSector;

  return {
    name: `Titular (${pos})`,
    pos,
    ovr: club.squadAvgOvr,
  };
}

export function generateYouthOffersFromTryout(
  player: CareerPlayer,
  tryoutStars: StarRating,
): YouthAcademyOffer[] {
  const countryClubs = getNationalClubsByCountry(player.nationality);
  const div1Giants = shuffleArray(countryClubs.filter((c) => c.squadAvgOvr >= 80));
  const div1Mid = shuffleArray(
    countryClubs.filter((c) => LEAGUES[c.leagueId].division === 1 && c.squadAvgOvr < 80),
  );
  const div2Clubs = shuffleArray(
    countryClubs.filter((c) => LEAGUES[c.leagueId].division === 2),
  );

  const selected: ClubData[] = [];

  if (tryoutStars === 3) {
    if (div1Giants[0]) selected.push(div1Giants[0]);
    if (div1Giants[1]) selected.push(div1Giants[1]);
    if (div1Mid[0]) selected.push(div1Mid[0]);
    if (div2Clubs[0]) selected.push(div2Clubs[0]);
  } else if (tryoutStars === 2) {
    if (div1Mid[0]) selected.push(div1Mid[0]);
    if (div1Mid[1]) selected.push(div1Mid[1]);
    if (div2Clubs[0]) selected.push(div2Clubs[0]);
    if (div2Clubs[1]) selected.push(div2Clubs[1]);
  } else {
    if (div2Clubs[0]) selected.push(div2Clubs[0]);
    if (div2Clubs[1]) selected.push(div2Clubs[1]);
    if (div2Clubs[2]) selected.push(div2Clubs[2]);
    if (div1Mid[0]) selected.push(div1Mid[0]);
  }

  // Fallback para países sem 2ª divisão (ex: MLS)
  if (selected.length < 3) {
    for (const club of shuffleArray(countryClubs)) {
      if (!selected.some((s) => s.id === club.id)) {
        selected.push(club);
      }
      if (selected.length >= 4) break;
    }
  }

  return selected.slice(0, 4).map((club) => {
    const isGiant = club.squadAvgOvr >= 80;
    const isSecondDiv = LEAGUES[club.leagueId].division === 2;
    const role: 'BASE_RESERVA' | 'BASE_TITULAR' =
      tryoutStars >= 2 && !isGiant ? 'BASE_TITULAR' : tryoutStars === 3 && !isGiant ? 'BASE_TITULAR' : isSecondDiv && tryoutStars >= 1 ? 'BASE_TITULAR' : 'BASE_RESERVA';

    const monthlyAllowance = isGiant
      ? 4200
      : isSecondDiv
        ? 1400
        : 2500;

    const pathwayDifficulty = isGiant
      ? 'MUITO_DIFICIL'
      : isSecondDiv
        ? 'ACESSIVEL'
        : 'COMPETITIVO';

    const scoutNote = isGiant
      ? `Estrutura de elite (${club.youthQuality}/99), mas a concorrência pra subir ao profissional é pesada.`
      : isSecondDiv
        ? 'Bolsa humilde, porém caminho muito mais curto para subir rápido e jogar como profissional.'
        : 'Equilíbrio excelente entre boa categoria de base e espaço para jovens no time de cima.';

    return {
      clubId: club.id,
      youthTeamName: club.youthAcademyName,
      role,
      monthlyAllowance,
      pathwayDifficulty,
      seniorCompetitor: findDirectCompetitor(club, player.position),
      scoutNote,
    };
  });
}
