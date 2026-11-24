import { getClubById } from '../../data/clubs';
import { getCompetitionTheme } from '../../data/world/competitionThemes';
import { evaluateNationalCallUp } from '../../domains/international/callUpEvaluator';
import {
  MatchPerformanceResult,
  resolveMatchSimulation,
  TacticalMindset,
} from '../../domains/match-sim/matchSimulator';
import {
  findClubLeagueIdInWorld,
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
  precomputedResult?: MatchPerformanceResult,
): { patch: Partial<CareerState>; result: MatchPerformanceResult } | null {
  const { player, contract, calendar, worldSeason, periodStats } = state;
  if (!player || !contract) return null;

  const callUp = evaluateNationalCallUp(player, contract.stage, periodStats);
  const fixture = getClubFixtureOnExactDay(
    worldSeason,
    contract.clubId,
    contract.stage,
    calendar.week,
    calendar.day,
    callUp,
  );
  if (!fixture) return null;

  const isNatGame = Boolean(fixture.isNationalTeam && fixture.myTeamId);
  const activeTeamId = isNatGame ? fixture.myTeamId! : contract.clubId;
  const activeRole = isNatGame ? (fixture.nationalRole ?? 'RESERVA') : contract.role;
  const activeStage = isNatGame ? 'PRO' : contract.stage;

  const myTeam = getClubById(activeTeamId);
  const result =
    precomputedResult ??
    resolveMatchSimulation(
      player,
      activeTeamId,
      fixture.opponentId,
      fixture.isHome,
      fixture.competitionId,
      fixture.stageLabel,
      activeRole,
      activeStage,
      mindset,
    );

  const pen = result.penaltyShootout;
  const nextWorld = simulateWorldCompetitionsOnDay(
    worldSeason,
    calendar.week,
    calendar.day,
    {
      clubId: activeTeamId,
      clubGoals: result.clubGoals,
      oppGoals: result.opponentGoals,
      clubPenGoals: pen?.myPenGoals,
      oppPenGoals: pen?.oppPenGoals,
    },
  );

  let nextRole = contract.role;
  let nextYouth = state.youthState;
  let nextProposals = state.transitionProposals;
  let nextFeed = [...state.feed];
  let bonusEarned = 0;
  const goal = { ...contract.seasonGoal };

  if (isNatGame) {
    // Bônus oficial da Confederação por partida e gols pela Seleção!
    bonusEarned = 4500 + (result.playerGoals + result.playerAssists) * 3000;
  } else {
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
        nextFeed = [
          makeEvent(calendar.week, 'Destaque na Base', youthUpdate.eventNote, 'CONTRACT'),
          ...nextFeed,
        ];
      }
      if (nextYouth.transitionReady && nextProposals.length === 0) {
        nextProposals = generateYouthTransitionProposals(player, contract.clubId);
      }
    }

    const contributions = result.playerGoals + result.playerAssists;
    const derbyMult = result.rivalry ? result.rivalry.bonusMultiplier : 1;
    const wonDerbyBonus =
      result.rivalry &&
      (result.clubGoals > result.opponentGoals || Boolean(result.penaltyShootout?.won))
        ? result.rivalry.tier === 'FEROZ'
          ? 7500
          : result.rivalry.tier === 'HISTORICO'
            ? 4500
            : 2500
        : 0;
    bonusEarned =
      Math.round(contributions * contract.goalBonusPerContribution * derbyMult) + wonDerbyBonus;
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
        makeEvent(
          calendar.week,
          'Meta Contratual Batida!',
          `Bônus de ${formatMoney(goal.rewardAmount)} liberado!`,
          'CONTRACT',
        ),
        ...nextFeed,
      ];
    }
  }

  const updatedTotals = {
    matches: player.careerTotals.matches + 1,
    goals: player.careerTotals.goals + result.playerGoals,
    assists: player.careerTotals.assists + result.playerAssists,
    threeStarMatches: player.careerTotals.threeStarMatches + (result.stars === 3 ? 1 : 0),
    trophies: player.careerTotals.trophies,
    nationalCaps: (player.careerTotals.nationalCaps ?? 0) + (isNatGame ? 1 : 0),
    nationalGoals: (player.careerTotals.nationalGoals ?? 0) + (isNatGame ? result.playerGoals : 0),
  };

  const repStars: StarRating =
    player.overall >= 82 || updatedTotals.threeStarMatches >= 12 || updatedTotals.nationalCaps >= 5
      ? 3
      : player.overall >= 71 || updatedTotals.threeStarMatches >= 5 || isNatGame
        ? 2
        : updatedTotals.matches >= 3
          ? 1
          : 0;

  const opponent = getClubById(fixture.opponentId);
  const compTheme = getCompetitionTheme(fixture.competitionId);
  const tls = result.twoLegSummary;
  const aggSuffix = tls
    ? ` • AGREG. ${tls.aggMyGoals}x${tls.aggOppGoals} (${tls.qualified ? 'CLASSIFICADO' : 'ELIMINADO'})`
    : '';
  const penSuffix = pen ? ` • PÊN ${pen.myPenGoals}x${pen.oppPenGoals}` : '';
  const derbyPrefix = result.rivalry ? `${result.rivalry.derbyName} • ` : '';
  nextFeed = [
    {
      ...makeEvent(
        calendar.week,
        `[${compTheme.shortLabel}] ${myTeam.shortName} ${result.clubGoals} x ${result.opponentGoals} ${opponent.shortName}${aggSuffix}${penSuffix} (${result.stars}★)`,
        `${derbyPrefix}${fixture.stageLabel} • ${result.minutesPlayed} min • ${result.playerGoals}G ${result.playerAssists}A`,
        'MATCH',
      ),
      clubId: activeTeamId,
    },
    ...nextFeed,
  ];

  const nextPeriod = {
    monthMatches: periodStats.monthMatches + (isNatGame ? 0 : 1),
    monthGoals: periodStats.monthGoals + (isNatGame ? 0 : result.playerGoals),
    monthAssists: periodStats.monthAssists + (isNatGame ? 0 : result.playerAssists),
    monthStarPoints: periodStats.monthStarPoints + (isNatGame ? 0 : result.stars),
    seasonMatches: periodStats.seasonMatches + 1,
    seasonGoals: periodStats.seasonGoals + result.playerGoals,
    seasonAssists: periodStats.seasonAssists + result.playerAssists,
    seasonStarPoints: periodStats.seasonStarPoints + result.stars,
    seasonThreeStarMatches:
      (periodStats.seasonThreeStarMatches ?? 0) + (result.stars === 3 ? 1 : 0),
    continentalMatches: periodStats.continentalMatches + (fixture.isContinental ? 1 : 0),
    continentalGoals:
      periodStats.continentalGoals + (fixture.isContinental ? result.playerGoals : 0),
    continentalAssists:
      periodStats.continentalAssists + (fixture.isContinental ? result.playerAssists : 0),
    internationalMatches: periodStats.internationalMatches + (isNatGame ? 1 : 0),
    internationalGoals:
      periodStats.internationalGoals + (isNatGame ? result.playerGoals : 0),
    internationalAssists:
      periodStats.internationalAssists + (isNatGame ? result.playerAssists : 0),
  };

  const prevCompLine = state.userCompStats[fixture.competitionId];
  const nextUserCompStats = {
    ...state.userCompStats,
    [fixture.competitionId]: {
      clubId: activeTeamId,
      matches: (prevCompLine?.matches ?? 0) + 1,
      goals: (prevCompLine?.goals ?? 0) + result.playerGoals,
      assists: (prevCompLine?.assists ?? 0) + result.playerAssists,
      threeStarMatches: (prevCompLine?.threeStarMatches ?? 0) + (result.stars === 3 ? 1 : 0),
    },
  };

  let nextSeasonStints = [...state.currentSeasonStints];
  if (!isNatGame) {
    const clubLg = findClubLeagueIdInWorld(nextWorld, contract.clubId);
    const stintIdx = nextSeasonStints.findIndex(
      (s) => s.clubId === contract.clubId && s.stage === contract.stage,
    );
    if (stintIdx !== -1) {
      const curr = nextSeasonStints[stintIdx];
      nextSeasonStints[stintIdx] = {
        ...curr,
        leagueId: clubLg,
        matches: curr.matches + 1,
        goals: curr.goals + result.playerGoals,
        assists: curr.assists + result.playerAssists,
        threeStarMatches: curr.threeStarMatches + (result.stars === 3 ? 1 : 0),
      };
    } else {
      nextSeasonStints.push({
        clubId: contract.clubId,
        leagueId: clubLg,
        stage: contract.stage,
        matches: 1,
        goals: result.playerGoals,
        assists: result.playerAssists,
        threeStarMatches: result.stars === 3 ? 1 : 0,
      });
    }
  }

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
      currentSeasonStints: nextSeasonStints,
      userCompStats: nextUserCompStats,
      awardPrestigeBoost:
        state.awardPrestigeBoost +
        ((isNatGame || (result.rivalry && result.rivalry.tier !== 'LOCAL')) && result.stars === 3
          ? 1
          : 0),
      lastMatchResult: result,
      feed: nextFeed.slice(0, 30),
    },
  };
}
