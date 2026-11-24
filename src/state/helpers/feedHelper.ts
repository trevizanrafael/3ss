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
