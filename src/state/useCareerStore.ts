import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getClubById } from '../data/clubs';
import { INITIAL_PERIOD_STATS } from '../domains/awards/awardTypes';
import { generateWindowTransferOffers } from '../domains/contracts/contractEngine';
import {
  getOwnedEquipmentBonuses,
  hireCareerAgent,
  purchaseTrainingEquipment,
} from '../domains/economy/economyActions';
import { createInitialPlayer } from '../domains/player/createInitialPlayer';
import { createInitialWorldSeason } from '../domains/season/worldSeasonEngine';
import {
  applyFiveSlotsTraining,
  DEFAULT_FIVE_DRILL_SLOTS,
} from '../domains/training/trainingEngine';
import { generateYouthOffersFromTryout } from '../domains/tryout/generateYouthOffers';
import { clamp } from '../shared/utils/math';
import { computeNextDayState } from './actions/calendarActions';
import {
  buildMarketSignPatch,
  buildSignYouthPatch,
  buildYouthTransitionPatch,
} from './actions/contractAndShopActions';
import { computePlayedMatchState } from './actions/matchDayActions';
import { CareerState } from './careerTypes';
import { makeEvent } from './helpers/feedHelper';
import {
  migratePersistedCareerState,
  rescueLegacySaveIfNeeded,
} from './helpers/saveMigration';

const STORAGE_KEY = 'three-stars-soccer-career-v4';
rescueLegacySaveIfNeeded(STORAGE_KEY);

export const useCareerStore = create<CareerState>()(
  persist(
    (set, get) => ({
      hasActiveSave: false,
      player: null,
      calendar: { season: 2026, week: 1, day: 1 },
      bankBalance: 1200,
      agentId: 'agent_family',
      ownedEquipmentIds: [],
      drillSlots: [...DEFAULT_FIVE_DRILL_SLOTS],
      lastSlotGrades: [null, null, null, null, null],
      recentLeveledKeys: [],
      trainedToday: false,
      tryoutStars: null,
      tryoutOffers: [],
      contract: null,
      youthState: null,
      transitionProposals: [],
      marketOffers: [],
      worldSeason: createInitialWorldSeason(2026),
      periodStats: { ...INITIAL_PERIOD_STATS },
      currentSeasonStints: [],
      careerSeasonLogs: [],
      userCompStats: {},
      trophyCabinet: [],
      awardPrestigeBoost: 0,
      latestGalaReport: null,
      galaModalOpen: false,
      lastMatchResult: null,
      feed: [],

      beginCareerWithPlayer: (input) =>
        set({
          player: createInitialPlayer(input),
          tryoutStars: null,
          tryoutOffers: [],
          hasActiveSave: false,
        }),

      finishTryout: (stars) => {
        const { player, tryoutOffers } = get();
        if (!player) return;
        const prevIds = tryoutOffers.map((o) => o.clubId);
        set({
          tryoutStars: stars,
          tryoutOffers: generateYouthOffersFromTryout(player, stars, prevIds),
        });
      },

      resetTryoutSession: () => set({ tryoutStars: null, tryoutOffers: [] }),

      rerollTryoutClubs: () => {
        const { player, tryoutStars, tryoutOffers } = get();
        if (!player || tryoutStars === null) return;
        const prevIds = tryoutOffers.map((o) => o.clubId);
        set({
          tryoutOffers: generateYouthOffersFromTryout(player, tryoutStars, prevIds),
        });
      },

      signYouthOffer: (offer) =>
        set({
          ...buildSignYouthPatch(get(), offer),
          drillSlots: [...DEFAULT_FIVE_DRILL_SLOTS],
          lastSlotGrades: [null, null, null, null, null],
          recentLeveledKeys: [],
        }),

      setDrillSlot: (slotIndex, drillId) => {
        const next = [...get().drillSlots];
        next[slotIndex] = drillId;
        set({ drillSlots: next });
      },

      completeActiveTraining: (stars) => {
        const { player, contract, drillSlots, ownedEquipmentIds, trainedToday, calendar, feed } = get();
        if (!player || !contract || trainedToday) return;
        const club = getClubById(contract.clubId);
        const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);
        const { updatedPlayer, report } = applyFiveSlotsTraining(
          player, drillSlots, 'ACTIVE_100', club.youthQuality, bonuses.trainingXpBonusPct, stars,
        );
        set({
          player: { ...updatedPlayer, stamina: clamp(updatedPlayer.stamina - 8, 35, 100) },
          trainedToday: true,
          lastSlotGrades: report.slotGrades,
          recentLeveledKeys:
            report.leveledUpKeys.length > 0 ? report.leveledUpKeys : get().recentLeveledKeys,
          feed: [
            makeEvent(
              calendar.week,
              `Sessão 100% Concluída (${stars}★)`,
              report.leveledUpKeys.length > 0
                ? `+1 ponto conquistado em ${report.leveledUpKeys.length} atributo(s)!`
                : 'Barras dos 5 slots avançaram em velocidade máxima.',
              'TRAINING',
            ),
            ...feed.slice(0, 29),
          ],
        });
      },

      advanceDay: () => set(computeNextDayState(get(), false)),

      playCurrentMatch: (mindset) => {
        const outcome = computePlayedMatchState(get(), mindset);
        if (!outcome) return null;
        set(outcome.patch);
        set(computeNextDayState(get(), true));
        return outcome.result;
      },

      acceptYouthTransition: (proposal) => set(buildYouthTransitionPatch(get(), proposal)),

      acceptMarketProposal: (offer) => set(buildMarketSignPatch(get(), offer)),

      requestLoanOrOffersFromAgent: () => {
        const { player, contract, agentId, awardPrestigeBoost, calendar, feed } = get();
        if (!player || !contract) return;
        const offers = generateWindowTransferOffers(
          player,
          contract,
          agentId,
          awardPrestigeBoost,
        );
        set({
          transitionProposals: [],
          marketOffers: offers,
          feed: [
            makeEvent(
              calendar.week,
              'Sondagem de Mercado Concluída',
              `${offers.length} proposta(s) profissional(is) e empréstimo na mesa.`,
              'CONTRACT',
            ),
            ...feed,
          ],
        });
      },

      buyEquipmentItem: (equipmentId) => {
        const { player, bankBalance, ownedEquipmentIds, calendar, feed } = get();
        if (!player) return { ok: false, message: 'Sem jogador ativo.' };
        const res = purchaseTrainingEquipment(player, bankBalance, ownedEquipmentIds, equipmentId);
        if (res.ok) {
          set({
            player: res.updatedPlayer,
            bankBalance: res.updatedBalance,
            ownedEquipmentIds: res.updatedOwnedIds,
            recentLeveledKeys: Object.keys(res.updatedPlayer.attributes).filter(
              (k) =>
                res.updatedPlayer.attributes[k as keyof typeof player.attributes] >
                player.attributes[k as keyof typeof player.attributes],
            ) as CareerState['recentLeveledKeys'],
            feed: [makeEvent(calendar.week, 'Estrutura Instalada', res.message, 'TRAINING'), ...feed],
          });
        }
        return { ok: res.ok, message: res.message };
      },

      hireAgentById: (targetAgentId) => {
        const { bankBalance, agentId, calendar, feed } = get();
        const res = hireCareerAgent(bankBalance, agentId, targetAgentId);
        if (res.ok) {
          set({
            bankBalance: res.updatedBalance,
            agentId: res.updatedAgentId,
            feed: [makeEvent(calendar.week, 'Novo Empresário', res.message, 'CONTRACT'), ...feed],
          });
        }
        return { ok: res.ok, message: res.message };
      },

      setGalaModalOpen: (galaModalOpen) => set({ galaModalOpen }),

      resetCareer: () =>
        set({
          hasActiveSave: false,
          player: null,
          contract: null,
          youthState: null,
          transitionProposals: [],
          marketOffers: [],
          periodStats: { ...INITIAL_PERIOD_STATS },
          currentSeasonStints: [],
          careerSeasonLogs: [],
          userCompStats: {},
          trophyCabinet: [],
          awardPrestigeBoost: 0,
          latestGalaReport: null,
          galaModalOpen: false,
          lastMatchResult: null,
          feed: [],
        }),
    }),
    {
      name: STORAGE_KEY,
      merge: (persistedState, currentState) =>
        migratePersistedCareerState(persistedState, currentState),
    },
  ),
);
