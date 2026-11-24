import { AttributeKey } from '../data/equipment/catalog';
import { AllLeagueTables } from '../domains/competition/leagueSimulator';
import { ActiveContract, TransferMarketOffer } from '../domains/contracts/contractEngine';
import { MatchPerformanceResult, TacticalMindset } from '../domains/match-sim/matchSimulator';
import { CreatePlayerInput } from '../domains/player/createInitialPlayer';
import { CareerPlayer } from '../domains/player/playerTypes';
import { YouthAcademyOffer } from '../domains/tryout/generateYouthOffers';
import { YouthAcademyState, YouthTransitionProposal } from '../domains/youth-academy/youthModel';
import { CalendarDate, StarRating } from '../shared/types/common';

export interface FeedEvent {
  id: string;
  week: number;
  title: string;
  detail: string;
  category: 'INFO' | 'TRAINING' | 'MATCH' | 'CONTRACT';
}

export interface CareerState {
  hasActiveSave: boolean;
  player: CareerPlayer | null;
  calendar: CalendarDate;
  bankBalance: number;
  agentId: string;
  ownedEquipmentIds: string[];
  focusedAttributes: AttributeKey[];
  trainedToday: boolean;

  // Fluxo Peneira
  tryoutStars: StarRating | null;
  tryoutOffers: YouthAcademyOffer[];

  // Carreira ativa
  contract: ActiveContract | null;
  youthState: YouthAcademyState | null;
  transitionProposals: YouthTransitionProposal[];
  marketOffers: TransferMarketOffer[];
  leagueTables: AllLeagueTables;
  nextOpponentId: string | null;
  lastMatchResult: MatchPerformanceResult | null;
  feed: FeedEvent[];

  // Actions
  beginCareerWithPlayer: (input: CreatePlayerInput) => void;
  finishTryout: (stars: StarRating) => void;
  signYouthOffer: (offer: YouthAcademyOffer) => void;
  toggleFocusAttribute: (key: AttributeKey) => void;
  completeActiveTraining: (stars: StarRating) => void;
  advanceDay: () => void;
  advanceToMatchDay: () => void;
  playCurrentMatch: (mindset: TacticalMindset) => MatchPerformanceResult | null;
  acceptYouthTransition: (proposal: YouthTransitionProposal) => void;
  acceptMarketProposal: (offer: TransferMarketOffer) => void;
  requestLoanOrOffersFromAgent: () => void;
  buyEquipmentItem: (equipmentId: string) => { ok: boolean; message: string };
  hireAgentById: (agentId: string) => { ok: boolean; message: string };
  resetCareer: () => void;
}
