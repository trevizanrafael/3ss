import { getClubById } from '../clubs';
import { FullSquadPlayer } from '../clubs/types';
import { LeagueId } from '../leagues/leagues';

const SQUAD_CACHE = new Map<LeagueId, Record<string, FullSquadPlayer[]>>();

export async function loadClubFullSquad(clubId: string): Promise<FullSquadPlayer[]> {
  const club = getClubById(clubId);
  const baseLeague = club.leagueId;

  if (!SQUAD_CACHE.has(baseLeague)) {
    try {
      const resp = await fetch(`/data/squads/${baseLeague.toLowerCase()}.json`);
      if (resp.ok) {
        const json = (await resp.json()) as Record<string, FullSquadPlayer[]>;
        SQUAD_CACHE.set(baseLeague, json);
      }
    } catch {
      // Fallback para os destaques caso offline
    }
  }

  const leagueMap = SQUAD_CACHE.get(baseLeague);
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
    nationality: club.country,
  }));
}
