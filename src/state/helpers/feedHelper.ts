import { getClubById, getClubsByLeague } from '../../data/clubs';
import { pickRandom } from '../../shared/utils/math';
import { FeedEvent } from '../careerTypes';

export function makeEvent(
  week: number,
  title: string,
  detail: string,
  category: FeedEvent['category'],
): FeedEvent {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    week,
    title,
    detail,
    category,
  };
}

export function pickNextOpponent(clubId: string): string {
  const club = getClubById(clubId);
  const peers = getClubsByLeague(club.leagueId).filter((c) => c.id !== clubId);
  return peers.length > 0 ? pickRandom(peers).id : clubId;
}
