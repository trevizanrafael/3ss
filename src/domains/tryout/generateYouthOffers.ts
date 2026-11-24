import { getNationalClubsByCountry } from '../../data/clubs';
import { ClubData, RealSquadStar } from '../../data/clubs/types';
import { LEAGUES } from '../../data/leagues/leagues';
import { PositionCode, SquadRole, StarRating } from '../../shared/types/common';
import { shuffleArray } from '../../shared/utils/math';
import { getPositionSector } from '../attributes/overallCalculator';
import { CareerPlayer } from '../player/playerTypes';

export interface YouthAcademyOffer {
  clubId: string;
  youthTeamName: string; // Exibido como divisão/elenco profissional
  role: Extract<SquadRole, 'PROMESSA' | 'RESERVA' | 'TITULAR'>;
  monthlyAllowance: number; // Salário mensal profissional inicial
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
  const targetCountry = player.startingLeagueCountry ?? 'BRA';
  const countryClubs = getNationalClubsByCountry(targetCountry);
  const div1Giants = shuffleArray(countryClubs.filter((c) => c.squadAvgOvr >= 79));
  const div1Mid = shuffleArray(
    countryClubs.filter((c) => LEAGUES[c.leagueId].division === 1 && c.squadAvgOvr < 79),
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

  if (selected.length < 4) {
    for (const club of shuffleArray(countryClubs)) {
      if (!selected.some((s) => s.id === club.id)) {
        selected.push(club);
      }
      if (selected.length >= 4) break;
    }
  }

  return selected.slice(0, 4).map((club) => {
    const isGiant = club.squadAvgOvr >= 79;
    const isSecondDiv = LEAGUES[club.leagueId].division === 2;
    const isEuro = LEAGUES[club.leagueId].continentalPrimary === 'CHAMPIONS_LEAGUE';

    const role: 'PROMESSA' | 'RESERVA' | 'TITULAR' = isGiant
      ? tryoutStars === 3
        ? 'RESERVA'
        : 'PROMESSA'
      : isSecondDiv
        ? tryoutStars >= 2
          ? 'TITULAR'
          : 'RESERVA'
        : tryoutStars === 3
          ? 'TITULAR'
          : 'RESERVA';

    const baseSal = isGiant ? 28000 : isSecondDiv ? 11500 : 18500;
    const monthlyAllowance = isEuro ? Math.round(baseSal * 1.45) : baseSal;

    const pathwayDifficulty = isGiant
      ? 'MUITO_DIFICIL'
      : isSecondDiv
        ? 'ACESSIVEL'
        : 'COMPETITIVO';

    const scoutNote = isGiant
      ? 'Elenco principal de elite com calendário continental; minutos iniciais vêm do banco.'
      : isSecondDiv
        ? 'Titularidade rápida no time profissional para somar 90 minutos, gols e subir de Overall.'
        : 'Espaço real de rotação e titularidade já na 1ª divisão nacional.';

    return {
      clubId: club.id,
      youthTeamName: 'ELENCO PROFISSIONAL PRINCIPAL',
      role,
      monthlyAllowance,
      pathwayDifficulty,
      seniorCompetitor: findDirectCompetitor(club, player.position),
      scoutNote,
    };
  });
}
