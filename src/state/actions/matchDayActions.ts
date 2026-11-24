import { getClubById } from '../../data/clubs';
import { getCompetitionTheme } from '../../data/world/competitionThemes';
import {
  MatchPerformanceResult,
  resolveMatchSimulation,
  TacticalMindset,
} from '../../domains/match-sim/matchSimulator';
import {
  getClubFixtureOnExactDay,
  simulateWorldCompetitionsOnDay,
} from '../../domains/season/worldSeasonEngine';
import {
  generateYouthTransitionProposals,
  updateYouthAfterMatch,
} from '../../domains/youth-academy/youthModel';
import { StarRating } from '../../shared/types/common';
import { formatMoney } from '../../shared/utils/formatters';
import { clamp } from '../../shared/utils/math';
import { CareerState } from '../careerTypes';
import { makeEvent } from '../helpers/feedHelper';

export function computePlayedMatchState(
  state: CareerState,
  mindset: TacticalMindset,
): { patch: Partial<CareerState>; result: MatchPerformanceResult } | null {
  const { player, contract, calendar, worldSeason } = state;
  if (!player || !contract) return null;

  const fixture = getClubFixtureOnExactDay(
    worldSeason,
    contract.clubId,
    contract.stage,
    calendar.week,
    calendar.day,
  );
  if (!fixture) return null;

  const club = getClubById(contract.clubId);
  const result = resolveMatchSimulation(
    player,
    contract.clubId,
    fixture.opponentId,
    fixture.isHome,
    fixture.competitionId,
    fixture.stageLabel,
    contract.role,
    contract.stage,
    mindset,
  );

  // Simula simultaneamente todos os outros jogos da mesma rodada (Liga ou Continental)!
  const nextWorld = simulateWorldCompetitionsOnDay(
    worldSeason,
    calendar.week,
    calendar.day,
    {
      clubId: contract.clubId,
      clubGoals: result.clubGoals,
      oppGoals: result.opponentGoals,
    },
  );

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
      nextFeed = [makeEvent(calendar.week, 'Destaque na Base', youthUpdate.eventNote, 'CONTRACT'), ...nextFeed];
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

  const opponent = getClubById(fixture.opponentId);
  const compTheme = getCompetitionTheme(fixture.competitionId);
  nextFeed = [
    makeEvent(
      calendar.week,
      `[${compTheme.shortLabel}] ${club.shortName} ${result.clubGoals} x ${result.opponentGoals} ${opponent.shortName} (${result.stars}★)`,
      `${fixture.stageLabel} • ${result.minutesPlayed} min • ${result.playerGoals}G ${result.playerAssists}A`,
      'MATCH',
    ),
    ...nextFeed,
  ];

  const nextPeriod = {
    monthMatches: state.periodStats.monthMatches + 1,
    monthGoals: state.periodStats.monthGoals + result.playerGoals,
    monthAssists: state.periodStats.monthAssists + result.playerAssists,
    monthStarPoints: state.periodStats.monthStarPoints + result.stars,
    seasonMatches: state.periodStats.seasonMatches + 1,
    seasonGoals: state.periodStats.seasonGoals + result.playerGoals,
    seasonAssists: state.periodStats.seasonAssists + result.playerAssists,
    seasonStarPoints: state.periodStats.seasonStarPoints + result.stars,
    continentalMatches:
      state.periodStats.continentalMatches + (fixture.isContinental ? 1 : 0),
    continentalGoals:
      state.periodStats.continentalGoals + (fixture.isContinental ? result.playerGoals : 0),
    continentalAssists:
      state.periodStats.continentalAssists + (fixture.isContinental ? result.playerAssists : 0),
  };

  return {
    result,
    patch: {
      player: {
        ...player,
        stamina: clamp(player.stamina - result.staminaSpent, 15, 100),
        reputationStars: Math.max(player.reputationStars, repStars) as StarRating,
        careerTotals: updatedTotals,
      },
      contract: { ...contract, role: nextRole, seasonGoal: goal },
      bankBalance: state.bankBalance + bonusEarned,
      youthState: nextYouth,
      transitionProposals: nextProposals,
      worldSeason: nextWorld,
      periodStats: nextPeriod,
      lastMatchResult: result,
      feed: nextFeed.slice(0, 30),
    },
  };
}
