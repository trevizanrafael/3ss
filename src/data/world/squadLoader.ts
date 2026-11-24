import { getClubById } from '../clubs';
import { FullSquadPlayer } from '../clubs/types';
import { LeagueId } from '../leagues/leagues';

const SQUAD_CACHE = new Map<LeagueId | 'NATIONAL_TEAMS', Record<string, FullSquadPlayer[]>>();

export async function loadClubFullSquad(clubId: string): Promise<FullSquadPlayer[]> {
  const club = getClubById(clubId);
  const cacheKey: LeagueId | 'NATIONAL_TEAMS' = club.isNationalTeam
    ? 'NATIONAL_TEAMS'
    : club.leagueId;
  const jsonFile = club.isNationalTeam ? 'national_teams' : club.leagueId.toLowerCase();

  if (!SQUAD_CACHE.has(cacheKey)) {
    try {
      const resp = await fetch(`/data/squads/${jsonFile}.json`);
      if (resp.ok) {
        const json = (await resp.json()) as Record<string, FullSquadPlayer[]>;
        SQUAD_CACHE.set(cacheKey, json);
      }
    } catch {
      // Fallback para os destaques caso offline
    }
  }

  const leagueMap = SQUAD_CACHE.get(cacheKey);
  if (leagueMap && leagueMap[clubId]) {
    return leagueMap[clubId];
  }

  return club.keyPlayers.map((kp, i) => ({
    id: `fallback_${clubId}_${i}`,
    name: kp.name,
    pos: kp.pos,
    age: 25,
    ovr: kp.ovr,
    jersey: i + 7,
    nationality: club.nationalCode ?? club.country,
  }));
}
