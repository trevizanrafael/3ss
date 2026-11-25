import { getClubById } from '../../data/clubs';
import { COUNTRIES } from '../../data/countries/countries';
import { INITIAL_PERIOD_STATS } from '../../domains/awards/awardTypes';
import { evaluateMonthlyPotm } from '../../domains/awards/evaluateMonthlyPotm';
import { evaluateEndOfSeasonAwards } from '../../domains/awards/evaluateSeasonAwards';
import { buildSeasonCompetitionCampaigns } from '../../domains/career-stats/seasonCampaignBuilder';
import {
  createSeasonContractGoal,
  generateWindowTransferOffers,
} from '../../domains/contracts/contractEngine';
import {
  computePlayerMarketValue,
  evaluateManagerMetaStanding,
  isTransferWindowOpen,
} from '../../domains/contracts/transferWindowAndValue';
import { getOwnedEquipmentBonuses } from '../../domains/economy/economyActions';
import { evaluateNationalCallUp } from '../../domains/international/callUpEvaluator';
import { findNationalTeamFixtureOnDay } from '../../domains/international/internationalCalendar';
import {
  findClubLeagueIdInWorld,
  getClubFixtureOnExactDay,
  rolloverSeasonWithPromotionAndQualification,
  simulateWorldCompetitionsOnDay,
  TOTAL_SEASON_WEEKS,
} from '../../domains/season/worldSeasonEngine';
import { applyFiveSlotsTraining } from '../../domains/training/trainingEngine';
import { SquadRole, StarRating } from '../../shared/types/common';
import { formatCompactMoney, formatMoney, formatSquadRole } from '../../shared/utils/formatters';
import { clamp } from '../../shared/utils/math';
import { CareerState } from '../careerTypes';
import { makeEvent } from '../helpers/feedHelper';

export function computeNextDayState(
  state: CareerState,
  alreadySimulatedMatchToday = false,
): Partial<CareerState> {
  const { player, contract, calendar, drillSlots, ownedEquipmentIds, trainedToday } = state;
  if (!player || !contract) return {};

  let nextPlayer = { ...player };
  let nextContract = { ...contract };
  let nextFeed = [...state.feed];
  let nextBalance = state.bankBalance;
  let nextWorld = state.worldSeason;
  let nextProposals = state.transitionProposals;
  let nextMarket = state.marketOffers;
  let nextLeveled = state.recentLeveledKeys;
  let nextPeriod = { ...state.periodStats };
  let nextStints = [...state.currentSeasonStints];
  let nextSeasonLogs = [...state.careerSeasonLogs];
  let nextUserCompStats = state.userCompStats;
  let nextCabinet = [...state.trophyCabinet];
  let nextPrestige = state.awardPrestigeBoost;
  let nextGala = state.latestGalaReport;
  let nextGalaOpen = state.galaModalOpen;

  const club = getClubById(contract.clubId);
  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);
  const callUp = evaluateNationalCallUp(nextPlayer, contract.stage, nextPeriod);

  if (
    !alreadySimulatedMatchToday &&
    (calendar.day === 3 || calendar.day === 6 || calendar.day === 7)
  ) {
    const myFixture = getClubFixtureOnExactDay(
      nextWorld,
      contract.clubId,
      contract.stage,
      calendar.week,
      calendar.day,
      callUp,
    );
    if (!myFixture) {
      nextWorld = simulateWorldCompetitionsOnDay(nextWorld, calendar.week, calendar.day);
    }
  }

  const isTrainingDay = calendar.week <= 38 && (calendar.day === 2 || calendar.day === 4);
  if (isTrainingDay && !trainedToday) {
    const { updatedPlayer, report } = applyFiveSlotsTraining(
      nextPlayer,
      drillSlots,
      'PASSIVE_50',
      club.youthQuality,
      bonuses.trainingXpBonusPct,
    );
    nextPlayer = updatedPlayer;
    if (report.leveledUpKeys.length > 0) {
      nextLeveled = report.leveledUpKeys;
      nextFeed = [
        makeEvent(
          calendar.week,
          'Evolução nos Slots de Treino (50% Auto)',
          `Subiu +1 em ${report.leveledUpKeys.length} atributo(s) durante a rotina semanal.`,
          'TRAINING',
        ),
        ...nextFeed,
      ];
    }
  }

  nextPlayer = {
    ...nextPlayer,
    stamina: clamp(
      nextPlayer.stamina + 17 + Math.round(bonuses.staminaRecoveryBonus / 3),
      0,
      100,
    ),
  };

  let nextDay = calendar.day + 1;
  let nextWeek = calendar.week;
  let nextSeason = calendar.season;

  if (nextDay > 7) {
    nextDay = 1;
    nextWeek += 1;

    // 1. Prêmio de MELHOR JOGADOR DO MÊS a cada 4 semanas da temporada de clubes (Semanas 4..36)
    if (calendar.week % 4 === 0 && calendar.week <= 36) {
      const potm = evaluateMonthlyPotm(
        nextPlayer,
        contract.clubId,
        contract.stage,
        nextPeriod,
        nextWorld,
        calendar.season,
        calendar.week,
      );
      if (potm.userWon && potm.trophyEntry) {
        nextBalance += potm.cashReward;
        nextPrestige += 1;
        nextCabinet = [potm.trophyEntry, ...nextCabinet];
        nextPlayer = {
          ...nextPlayer,
          reputationStars: Math.min(3, Math.max(1, nextPlayer.reputationStars)) as StarRating,
        };
        nextFeed = [
          {
            ...makeEvent(
              calendar.week,
              `★ VOCÊ ELEITO ${potm.trophyEntry.title}!`,
              `${potm.winnerStatLine} • Bônus de ${formatMoney(potm.cashReward)} creditado!`,
              'AWARD',
            ),
            clubId: contract.clubId,
          },
          ...nextFeed,
        ];
      } else {
        const winClub = getClubById(potm.winnerClubId);
        nextFeed = [
          {
            ...makeEvent(
              calendar.week,
              `Jogador do Mês: ${potm.winnerName} (${winClub.shortName})`,
              `Desempenho no mês: ${potm.winnerStatLine}`,
              'AWARD',
            ),
            clubId: potm.winnerClubId,
          },
          ...nextFeed,
        ];
      }
      nextPeriod = {
        ...nextPeriod,
        monthMatches: 0,
        monthGoals: 0,
        monthAssists: 0,
        monthStarPoints: 0,
      };
    }

    // 2. Salário Mensal
    if (nextWeek % 4 === 1 && nextWeek <= 40) {
      nextBalance += nextContract.monthlySalary;
      nextFeed = [
        makeEvent(
          calendar.week,
          'Salário Mensal Depositado',
          `Recebido ${formatMoney(nextContract.monthlySalary)} do ${club.name}.`,
          'CONTRACT',
        ),
        ...nextFeed,
      ];
    }

    // 3. Boletim de CONVOCAÇÃO OFICIAL quando a nova semana tem jogo da Seleção
    const nextCallUp = evaluateNationalCallUp(nextPlayer, nextContract.stage, nextPeriod);
    if (nextCallUp.calledUp && nextWorld.international && nextWeek <= 42) {
      const hasNtGameThisWeek =
        Boolean(findNationalTeamFixtureOnDay(nextWorld.international, nextCallUp.nationalTeamId, nextWeek, 3)) ||
        Boolean(findNationalTeamFixtureOnDay(nextWorld.international, nextCallUp.nationalTeamId, nextWeek, 7));

      if (hasNtGameThisWeek) {
        const natMeta = COUNTRIES[nextPlayer.nationality] ?? COUNTRIES.BRA;
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `★ CONVOCADO PARA A SELEÇÃO (${natMeta.name.toUpperCase()})!`,
              `Você integra a lista oficial como ${formatSquadRole(nextCallUp.role)} nesta Data FIFA / Copa!`,
              'AWARD',
            ),
            clubId: nextCallUp.nationalTeamId,
          },
          ...nextFeed,
        ];
      }
    }

    // 4. AVALIAÇÃO DO TREINADOR BASEADA EM META (Estilo FIFA 18 — E-mails do Manager antes das Janelas!)
    if (nextWeek === 14 || nextWeek === 19 || nextWeek === 34) {
      const standing = evaluateManagerMetaStanding(nextContract, nextWeek);
      if (
        standing.tier === 'BELOW_META' &&
        nextContract.stage === 'PRO' &&
        nextContract.transferStatus !== 'LOAN_LISTED'
      ) {
        nextContract = {
          ...nextContract,
          transferStatus: 'LOAN_LISTED',
          lastManagerNoticeWeek: nextWeek,
        };
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `📩 Treinador do ${club.shortName}: Abaixo da Meta — Lista de Empréstimo`,
              `Você está com ${nextContract.seasonGoal.current}/${nextContract.seasonGoal.target} na meta. Coloquei seu nome para Empréstimo na próxima janela para ganhar rodagem.`,
              'CONTRACT',
            ),
            clubId: club.id,
          },
          ...nextFeed,
        ];
      } else if (standing.tier === 'WARNING' && nextWeek === 14) {
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `📩 Treinador do ${club.shortName}: Cobrança de Meta`,
              `Precisamos de reação (${nextContract.seasonGoal.current}/${nextContract.seasonGoal.target}) até a janela de janeiro para você não ser emprestado.`,
              'CONTRACT',
            ),
            clubId: club.id,
          },
          ...nextFeed,
        ];
      } else if (
        standing.tier === 'EXCEEDING' &&
        nextContract.lastManagerNoticeWeek !== nextWeek
      ) {
        nextContract = {
          ...nextContract,
          lastManagerNoticeWeek: nextWeek,
        };
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `📩 Treinador & Olheiros: Muito Acima da Meta!`,
              `Fase espetacular no ${club.shortName}! Clubes maiores monitoram você e devem enviar propostas quando a janela abrir.`,
              'CONTRACT',
            ),
            clubId: club.id,
          },
          ...nextFeed,
        ];
      }
    }

    // 5. CICLO ESTRITO DAS JANELAS DE TRANSFERÊNCIA (Semanas 1..8, 20..23 e 39..43)
    const wasWindowOpen = isTransferWindowOpen(calendar.week);
    const nowWindowOpen = nextWeek <= TOTAL_SEASON_WEEKS && isTransferWindowOpen(nextWeek);
    const activeClubLg = findClubLeagueIdInWorld(nextWorld, nextContract.clubId);

    // Fechamento da Janela (Semana 8 -> 9, ou Semana 23 -> 24): expira todas as propostas externas!
    if (wasWindowOpen && !nowWindowOpen && nextWeek <= TOTAL_SEASON_WEEKS) {
      const hadExternal = nextMarket.some((o) => o.offerType !== 'RENEWAL');
      nextMarket = [];
      nextFeed = [
        makeEvent(
          nextWeek,
          '🔒 Janela de Transferências Encerrada',
          hadExternal
            ? 'O prazo de inscrições fechou e as propostas em aberto expiraram.'
            : 'Transferências e empréstimos bloqueados até a próxima janela.',
          'CONTRACT',
        ),
        ...nextFeed,
      ];
    }

    // Abertura de Janela (Semana 20 Janeiro ou Semana 39 Fim de Temporada) OU segunda leva dentro da janela aberta!
    const isWindowOpeningWeek = nextWeek === 20 || nextWeek === 39;
    const isMidWindowRefreshWeek =
      nowWindowOpen &&
      nextMarket.length === 0 &&
      (nextWeek === 4 || nextWeek === 22 || nextWeek === 41);

    if (isWindowOpeningWeek || isMidWindowRefreshWeek) {
      const offers = generateWindowTransferOffers(
        nextPlayer,
        nextContract,
        state.agentId,
        nextPrestige,
        nextWeek,
        activeClubLg,
      );
      nextMarket = offers;
      if (isWindowOpeningWeek) {
        nextFeed = [
          makeEvent(
            nextWeek,
            nextWeek === 20
              ? '🟦 Janela de Transferências de Janeiro Aberta!'
              : '🟦 Janela de Fim de Temporada Aberta!',
            offers.length > 0
              ? `${offers.length} proposta(s) oficial(is) chegaram ao seu Escritório!`
              : 'Janela aberta (barra azul nos dias). Peça transferência/empréstimo ou bata sua meta para atrair clubes.',
            'CONTRACT',
          ),
          ...nextFeed,
        ];
      } else if (offers.length > 0) {
        nextFeed = [
          makeEvent(
            nextWeek,
            `📩 Novas Propostas na Janela (${offers.length})`,
            'Clubes enviaram ofertas oficiais ao seu Escritório durante a janela aberta.',
            'CONTRACT',
          ),
          ...nextFeed,
        ];
      }
    }

    // 6. Semana 43 (logo após as Finais de Copa do Mundo / Copa América / Eurocopa): GALA DA BOLA DE OURO!
    if (nextWeek === TOTAL_SEASON_WEEKS) {
      const { gala, newTrophies } = evaluateEndOfSeasonAwards(
        nextPlayer,
        nextContract.clubId,
        nextContract.stage,
        nextPeriod,
        nextWorld,
        nextUserCompStats,
      );
      nextGala = gala;
      nextGalaOpen = true;
      nextBalance += gala.totalCashWon;
      nextPrestige += gala.prestigeBoostEarned;

      if (newTrophies.length > 0) {
        nextCabinet = [...newTrophies, ...nextCabinet];
        const wonWorld = newTrophies.some(
          (t) => t.code === 'BALLON_DOR' || t.code === 'GOLDEN_BOY',
        );
        nextPlayer = {
          ...nextPlayer,
          reputationStars: (wonWorld
            ? 3
            : Math.min(3, nextPlayer.reputationStars + 1)) as StarRating,
          careerTotals: {
            ...nextPlayer.careerTotals,
            trophies: nextPlayer.careerTotals.trophies + newTrophies.length,
          },
        };
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `★ GALA ${calendar.season}: ${newTrophies.length} PRÊMIO(S) CONQUISTADO(S)!`,
              newTrophies.map((t) => t.title).join(' • '),
              'AWARD',
            ),
            clubId: nextContract.clubId,
          },
          ...nextFeed,
        ];
      } else {
        const bdWinner = gala.majorAwards[0]?.podium[0];
        nextFeed = [
          {
            ...makeEvent(
              nextWeek,
              `Gala da Temporada • Bola de Ouro: ${bdWinner?.playerName ?? 'Definido'}`,
              'Confira todos os pódios Top 3 e a Seleção do Campeonato!',
              'AWARD',
            ),
            clubId: bdWinner?.clubId,
          },
          ...nextFeed,
        ];
      }

      // Atualiza propostas na última semana da janela após o impacto da Gala!
      const galaOffers = generateWindowTransferOffers(
        nextPlayer,
        nextContract,
        state.agentId,
        nextPrestige,
        nextWeek,
        activeClubLg,
      );
      if (galaOffers.length > 0) {
        nextMarket = galaOffers;
      }
    }

    // 7. VIRADA DE TEMPORADA (Rollover -> Semana 1 da Nova Temporada, onde a Janela segue aberta nos 2 primeiros meses!)
    if (nextWeek > TOTAL_SEASON_WEEKS) {
      const finishedSeasonYear = calendar.season;
      const finishClubLg = findClubLeagueIdInWorld(nextWorld, nextContract.clubId);
      const endOfSeasonMarketValue = computePlayerMarketValue(
        nextPlayer,
        finishClubLg,
        nextContract.seasonGoal,
        TOTAL_SEASON_WEEKS,
        nextPrestige,
      );

      const stintsWithFinish = (
        nextStints.length > 0
          ? nextStints
          : [
              {
                clubId: nextContract.clubId,
                leagueId: finishClubLg,
                stage: nextContract.stage,
                matches: Math.max(0, nextPeriod.seasonMatches - nextPeriod.internationalMatches),
                goals: Math.max(0, nextPeriod.seasonGoals - nextPeriod.internationalGoals),
                assists: Math.max(0, nextPeriod.seasonAssists - nextPeriod.internationalAssists),
                threeStarMatches: 0,
              },
            ]
      ).map((st) => {
        const lgRows = nextWorld.leagues[st.leagueId]?.standings ?? [];
        const posIdx = lgRows.findIndex((r) => r.clubId === st.clubId);
        return {
          ...st,
          leagueFinishPosition: st.stage === 'YOUTH' || posIdx === -1 ? undefined : posIdx + 1,
        };
      });

      const seasonTrophies = nextCabinet
        .filter((t) => t.season === finishedSeasonYear && t.code !== 'POTM')
        .map((t) => t.title);

      const archivedCompetitions = buildSeasonCompetitionCampaigns(
        nextWorld,
        stintsWithFinish,
        nextUserCompStats,
        nextPlayer.nationality,
        true,
        TOTAL_SEASON_WEEKS,
      );

      nextSeasonLogs = [
        ...nextSeasonLogs,
        {
          seasonNumber: nextSeasonLogs.length + 1,
          seasonYear: finishedSeasonYear,
          age: nextPlayer.age,
          ovrEnd: nextPlayer.overall,
          marketValueEnd: endOfSeasonMarketValue,
          stints: stintsWithFinish,
          competitions: archivedCompetitions,
          nationalTeamId: `nt_${nextPlayer.nationality.toLowerCase()}`,
          nationalMatches: nextPeriod.internationalMatches,
          nationalGoals: nextPeriod.internationalGoals,
          nationalAssists: nextPeriod.internationalAssists,
          trophyTitles: seasonTrophies,
        },
      ];

      const hadCompletedLoanMeta = nextContract.seasonGoal.completed;
      const wasOnLoan = Boolean(nextContract.stage === 'LOAN' && nextContract.parentClubId);
      const activeClubForNextYear = wasOnLoan ? nextContract.parentClubId! : nextContract.clubId;

      nextWeek = 1;
      nextSeason += 1;
      nextPlayer = { ...nextPlayer, age: nextPlayer.age + 1 };

      nextWorld = rolloverSeasonWithPromotionAndQualification(
        nextWorld,
        activeClubForNextYear,
        nextPeriod.seasonGoals,
        nextPeriod.seasonAssists,
      );

      const nextClubObj = getClubById(activeClubForNextYear);
      const returnedRole: SquadRole = wasOnLoan
        ? nextPlayer.overall >= nextClubObj.squadAvgOvr - 1 || hadCompletedLoanMeta
          ? 'TITULAR'
          : 'RESERVA'
        : nextContract.role;

      nextContract = {
        clubId: activeClubForNextYear,
        parentClubId: undefined,
        stage: 'PRO',
        role: returnedRole,
        monthlySalary: nextContract.monthlySalary,
        seasonsRemaining: Math.max(1, nextContract.seasonsRemaining - 1),
        goalBonusPerContribution: nextContract.goalBonusPerContribution,
        seasonGoal: createSeasonContractGoal(
          nextPlayer,
          'PRO',
          nextContract.monthlySalary,
          returnedRole,
        ),
        transferStatus: wasOnLoan ? 'UNLISTED' : nextContract.transferStatus ?? 'UNLISTED',
        lastManagerNoticeWeek: 0,
      };

      nextPeriod = { ...INITIAL_PERIOD_STATS };
      const newClubLg = findClubLeagueIdInWorld(nextWorld, activeClubForNextYear);
      nextStints = [
        {
          clubId: activeClubForNextYear,
          leagueId: newClubLg,
          stage: 'PRO',
          matches: 0,
          goals: 0,
          assists: 0,
          threeStarMatches: 0,
        },
      ];
      nextUserCompStats = {};
      nextPrestige = Math.max(0, nextPrestige - 2);

      // Na Semana 1 a Janela de Início de Temporada (2 primeiros meses) está ABERTA!
      nextMarket = generateWindowTransferOffers(
        nextPlayer,
        nextContract,
        state.agentId,
        nextPrestige,
        1,
        newClubLg,
      );

      if (wasOnLoan) {
        nextFeed = [
          {
            ...makeEvent(
              1,
              `📩 Retorno de Empréstimo ao ${nextClubObj.name}!`,
              `Seu empréstimo terminou e você se reapresentou como ${formatSquadRole(returnedRole)}. Valor de mercado: ${formatCompactMoney(endOfSeasonMarketValue)}.`,
              'CONTRACT',
            ),
            clubId: nextClubObj.id,
          },
          ...nextFeed,
        ];
      }

      nextFeed = [
        makeEvent(
          1,
          `Nova Temporada ${nextSeason}! (${nextPlayer.age} anos) • Janela Aberta`,
          `Valor de Mercado: ${formatCompactMoney(endOfSeasonMarketValue)} • Janela aberta nas Semanas 1 a 8!`,
          'INFO',
        ),
        ...nextFeed,
      ];
    }
  }

  return {
    player: nextPlayer,
    contract: nextContract,
    calendar: { season: nextSeason, week: nextWeek, day: nextDay },
    trainedToday: false,
    recentLeveledKeys: nextLeveled,
    bankBalance: nextBalance,
    worldSeason: nextWorld,
    periodStats: nextPeriod,
    currentSeasonStints: nextStints,
    careerSeasonLogs: nextSeasonLogs,
    userCompStats: nextUserCompStats,
    trophyCabinet: nextCabinet,
    awardPrestigeBoost: nextPrestige,
    latestGalaReport: nextGala,
    galaModalOpen: nextGalaOpen,
    transitionProposals: nextProposals,
    marketOffers: nextMarket,
    feed: nextFeed.slice(0, 30),
  };
}
