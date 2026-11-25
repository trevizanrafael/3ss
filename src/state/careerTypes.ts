import { AttributeKey } from '../data/equipment/catalog';
import {
  PlayerPeriodStats,
  PlayerTrophyEntry,
  SeasonAwardsGalaReport,
} from '../domains/awards/awardTypes';
import {
  ClubSeasonStint,
  PlayerSeasonCareerLog,
  UserCompetitionStatsMap,
} from '../domains/career-stats/careerHistoryTypes';
import { ActiveContract, TransferMarketOffer } from '../domains/contracts/contractEngine';
import { MatchPerformanceResult, TacticalMindset } from '../domains/match-sim/matchSimulator';
import { CreatePlayerInput } from '../domains/player/createInitialPlayer';
import { CareerPlayer } from '../domains/player/playerTypes';
import { WorldSeasonState } from '../domains/season/seasonTypes';
import { DrillGrade } from '../domains/training/trainingEngine';
import { YouthAcademyOffer } from '../domains/tryout/generateYouthOffers';
import { YouthAcademyState, YouthTransitionProposal } from '../domains/youth-academy/youthModel';
import { CalendarDate, StarRating } from '../shared/types/common';

export interface FeedEvent {
  id: string;
  week: number;
  title: string;
  detail: string;
  category: 'INFO' | 'TRAINING' | 'MATCH' | 'CONTRACT' | 'AWARD';
  clubId?: string;
}

export interface CareerState {
  hasActiveSave: boolean;
  player: CareerPlayer | null;
  calendar: CalendarDate;
  bankBalance: number;
  agentId: string;
  ownedEquipmentIds: string[];

  drillSlots: (string | null)[];
  lastSlotGrades: (DrillGrade | null)[];
  recentLeveledKeys: AttributeKey[];
  trainedToday: boolean;

  tryoutStars: StarRating | null;
  tryoutOffers: YouthAcademyOffer[];

  contract: ActiveContract | null;
  youthState: YouthAcademyState | null;
  transitionProposals: YouthTransitionProposal[];
  marketOffers: TransferMarketOffer[];

  worldSeason: WorldSeasonState;
  periodStats: PlayerPeriodStats;
  currentSeasonStints: ClubSeasonStint[];
  careerSeasonLogs: PlayerSeasonCareerLog[];
  userCompStats: UserCompetitionStatsMap;
  trophyCabinet: PlayerTrophyEntry[];
  awardPrestigeBoost: number;
  latestGalaReport: SeasonAwardsGalaReport | null;
  galaModalOpen: boolean;

  lastMatchResult: MatchPerformanceResult | null;
  feed: FeedEvent[];

  beginCareerWithPlayer: (input: CreatePlayerInput) => void;
  finishTryout: (stars: StarRating) => void;
  resetTryoutSession: () => void;
  rerollTryoutClubs: () => void;
  signYouthOffer: (offer: YouthAcademyOffer) => void;
  setDrillSlot: (slotIndex: number, drillId: string | null) => void;
  completeActiveTraining: (stars: StarRating) => void;
  advanceDay: () => void;
  playCurrentMatch: (
    mindset: TacticalMindset,
    precomputedResult?: MatchPerformanceResult,
  ) => MatchPerformanceResult | null;
  acceptYouthTransition: (proposal: YouthTransitionProposal) => void;
  acceptMarketProposal: (offer: TransferMarketOffer) => void;
  requestLoanOrOffersFromAgent: () => void;
  requestTransferFromManager: () => { ok: boolean; message: string };
  requestLoanFromManager: () => { ok: boolean; message: string };
  withdrawTransferOrLoanRequest: () => { ok: boolean; message: string };
  buyEquipmentItem: (equipmentId: string) => { ok: boolean; message: string };
  hireAgentById: (agentId: string) => { ok: boolean; message: string };
  setGalaModalOpen: (open: boolean) => void;
  resetCareer: () => void;
}
