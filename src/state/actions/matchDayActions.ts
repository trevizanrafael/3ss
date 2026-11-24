import { getClubById } from '../../data/clubs';
import { simulateLeagueRound } from '../../domains/competition/leagueSimulator';
import {
  MatchPerformanceResult,
  resolveMatchSimulation,
  TacticalMindset,
} from '../../domains/match-sim/matchSimulator';
import {
  generateYouthTransitionProposals,
  updateYouthAfterMatch,
} from '../../domains/youth-academy/youthModel';
import { StarRating } from '../../shared/types/common';
import { formatMoney } from '../../shared/utils/formatters';
import { clamp } from '../../shared/utils/math';
import { CareerState } from '../careerTypes';
import { makeEvent, pickNextOpponent } from '../helpers/feedHelper';

export function computePlayedMatchState(
  state: CareerState,
  mindset: TacticalMindset,
): { patch: Partial<CareerState>; result: MatchPerformanceResult } | null {
  const { player, contract, nextOpponentId, calendar } = state;
  if (!player || !contract || !nextOpponentId) return null;

  const club = getClubById(contract.clubId);
  const result = resolveMatchSimulation(
    player,
    contract.clubId,
    nextOpponentId,
    contract.role,
    contract.stage,
    mindset,
  );

  const nextTables = simulateLeagueRound(state.leagueTables, {
    leagueId: club.leagueId,
    clubId: contract.clubId,
    opponentId: nextOpponentId,
    clubGoals: result.clubGoals,
    oppGoals: result.opponentGoals,
  });

  let nextRole = contract.role;
  let nextYouth = state.youthState;
  let nextProposals = state.transitionProposals;
  let nextFeed = [...state.feed];

  if (contract.stage === 'YOUTH' && nextYouth) {
    const youthUpdate = updateYouthAfterMatch(
      nextYouth,
      player,
      contract.clubId,
      result.stars,
      result.playerGoals,
      result.playerAssists,
    );
    nextYouth = youthUpdate.updatedYouth;
    if (youthUpdate.newRole) nextRole = youthUpdate.newRole;
    if (youthUpdate.eventNote) {
      nextFeed = [makeEvent(calendar.week, 'Destaque na Base!', youthUpdate.eventNote, 'CONTRACT'), ...nextFeed];
    }
    if (nextYouth.transitionReady && nextProposals.length === 0) {
      nextProposals = generateYouthTransitionProposals(player, contract.clubId);
    }
  }

  const contributions = result.playerGoals + result.playerAssists;
  let bonusEarned = contributions * contract.goalBonusPerContribution;
  const goal = { ...contract.seasonGoal };
  goal.current += goal.label.includes('gols')
    ? result.playerGoals
    : goal.label.includes('G+A')
      ? contributions
      : result.stars >= 2
        ? 1
        : 0;

  if (!goal.completed && goal.current >= goal.target) {
    goal.completed = true;
    bonusEarned += goal.rewardAmount;
    nextFeed = [
      makeEvent(calendar.week, 'Meta Contratual Batida!', `Bônus de ${formatMoney(goal.rewardAmount)} liberado!`, 'CONTRACT'),
      ...nextFeed,
    ];
  }

  const updatedTotals = {
    matches: player.careerTotals.matches + 1,
    goals: player.careerTotals.goals + result.playerGoals,
    assists: player.careerTotals.assists + result.playerAssists,
    threeStarMatches: player.careerTotals.threeStarMatches + (result.stars === 3 ? 1 : 0),
    trophies: player.careerTotals.trophies,
  };

  const repStars: StarRating =
    player.overall >= 82 || updatedTotals.threeStarMatches >= 12
      ? 3
      : player.overall >= 71 || updatedTotals.threeStarMatches >= 5
        ? 2
        : updatedTotals.matches >= 3
          ? 1
          : 0;

  const opponent = getClubById(nextOpponentId);
  nextFeed = [
    makeEvent(
      calendar.week,
      `${club.shortName} ${result.clubGoals} x ${result.opponentGoals} ${opponent.shortName} (${result.stars}★)`,
      `${result.minutesPlayed} min em campo • ${result.playerGoals}G ${result.playerAssists}A`,
      'MATCH',
    ),
    ...nextFeed,
  ];

  return {
    result,
    patch: {
      player: {
        ...player,
        stamina: clamp(player.stamina - result.staminaSpent, 15, 100),
        reputationStars: repStars,
        careerTotals: updatedTotals,
      },
      contract: { ...contract, role: nextRole, seasonGoal: goal },
      bankBalance: state.bankBalance + bonusEarned,
      youthState: nextYouth,
      transitionProposals: nextProposals,
      leagueTables: nextTables,
      lastMatchResult: result,
      nextOpponentId: pickNextOpponent(contract.clubId),
      feed: nextFeed.slice(0, 25),
    },
  };
}
