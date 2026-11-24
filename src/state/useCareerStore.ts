import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getClubById } from '../data/clubs';
import { createInitialLeagueTables } from '../domains/competition/leagueSimulator';
import { generateWindowTransferOffers } from '../domains/contracts/contractEngine';
import {
  getOwnedEquipmentBonuses,
  hireCareerAgent,
  purchaseTrainingEquipment,
} from '../domains/economy/economyActions';
import { createInitialPlayer } from '../domains/player/createInitialPlayer';
import { applyTrainingProgress } from '../domains/training/trainingEngine';
import { generateYouthOffersFromTryout } from '../domains/tryout/generateYouthOffers';
import { generateYouthTransitionProposals } from '../domains/youth-academy/youthModel';
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

export const useCareerStore = create<CareerState>()(
  persist(
    (set, get) => ({
      hasActiveSave: false,
      player: null,
      calendar: { season: 2026, week: 1, day: 1 },
      bankBalance: 1200,
      agentId: 'agent_family',
      ownedEquipmentIds: [],
      focusedAttributes: ['acceleration', 'finishing', 'shortPass'],
      trainedToday: false,
      tryoutStars: null,
      tryoutOffers: [],
      contract: null,
      youthState: null,
      transitionProposals: [],
      marketOffers: [],
      leagueTables: createInitialLeagueTables(),
      nextOpponentId: null,
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
        const { player } = get();
        if (!player) return;
        set({ tryoutStars: stars, tryoutOffers: generateYouthOffersFromTryout(player, stars) });
      },

      signYouthOffer: (offer) => set(buildSignYouthPatch(get(), offer)),

      toggleFocusAttribute: (key) => {
        const { focusedAttributes } = get();
        if (focusedAttributes.includes(key)) {
          if (focusedAttributes.length <= 1) return;
          set({ focusedAttributes: focusedAttributes.filter((k) => k !== key) });
        } else if (focusedAttributes.length < 3) {
          set({ focusedAttributes: [...focusedAttributes, key] });
        } else {
          set({ focusedAttributes: [...focusedAttributes.slice(1), key] });
        }
      },

      completeActiveTraining: (stars) => {
        const { player, contract, focusedAttributes, ownedEquipmentIds, trainedToday, calendar, feed } = get();
        if (!player || !contract || trainedToday) return;
        const club = getClubById(contract.clubId);
        const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);
        const { updatedPlayer, report } = applyTrainingProgress(
          player, focusedAttributes, 'ACTIVE_100', club.youthQuality, bonuses.trainingXpBonusPct, stars,
        );
        const levelMsg = report.leveledUpAttributes.length > 0 ? ` Subiu ${report.leveledUpAttributes.length} atributo(s)!` : '';
        set({
          player: { ...updatedPlayer, stamina: clamp(updatedPlayer.stamina - 8, 35, 100) },
          trainedToday: true,
          feed: [
            makeEvent(calendar.week, `Treino Concluído (${stars}★ — 100% XP)`, `+${report.xpGainedPerAttribute}% nos focos.${levelMsg}`, 'TRAINING'),
            ...feed.slice(0, 24),
          ],
        });
      },

      advanceDay: () => set(computeNextDayState(get())),

      advanceToMatchDay: () => {
        let guard = 0;
        while (get().calendar.day !== 6 && guard < 8) {
          set(computeNextDayState(get()));
          guard++;
        }
      },

      playCurrentMatch: (mindset) => {
        const outcome = computePlayedMatchState(get(), mindset);
        if (!outcome) return null;
        set(outcome.patch);
        set(computeNextDayState(get()));
        return outcome.result;
      },

      acceptYouthTransition: (proposal) => set(buildYouthTransitionPatch(get(), proposal)),

      acceptMarketProposal: (offer) => set(buildMarketSignPatch(get(), offer)),

      requestLoanOrOffersFromAgent: () => {
        const { player, contract, agentId, calendar, feed } = get();
        if (!player || !contract) return;
        if (contract.stage === 'YOUTH') {
          set({
            transitionProposals: generateYouthTransitionProposals(player, contract.clubId),
            feed: [makeEvent(calendar.week, 'Reunião Solicitada na Base', 'Opções de empréstimo/subida atualizadas.', 'CONTRACT'), ...feed],
          });
        } else {
          const offers = generateWindowTransferOffers(player, contract, agentId);
          set({
            marketOffers: offers,
            feed: [makeEvent(calendar.week, 'Empresário Sondou o Mercado', `${offers.length} proposta(s) na mesa!`, 'CONTRACT'), ...feed],
          });
        }
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
            feed: [makeEvent(calendar.week, 'Novo Equipamento!', res.message, 'TRAINING'), ...feed],
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
            feed: [makeEvent(calendar.week, 'Novo Empresário!', res.message, 'CONTRACT'), ...feed],
          });
        }
        return { ok: res.ok, message: res.message };
      },

      resetCareer: () =>
        set({
          hasActiveSave: false,
          player: null,
          contract: null,
          youthState: null,
          transitionProposals: [],
          marketOffers: [],
          lastMatchResult: null,
          feed: [],
        }),
    }),
    { name: 'three-stars-soccer-career-v1' },
  ),
);
