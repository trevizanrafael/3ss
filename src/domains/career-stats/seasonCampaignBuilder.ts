import { COUNTRIES } from '../../data/countries/countries';
import { ContinentalCupId, LeagueId, LEAGUES } from '../../data/leagues/leagues';
import { AnyCompetitionId, getQualifierCompId } from '../../data/world/competitionThemes';
import { CountryCode } from '../../shared/types/common';
import { NationalCupTournament } from '../international/internationalTypes';
import { getWorldCupEditionInfo } from '../international/worldCupHostVenues';
import { sortStandings } from '../season/poissonMatchMath';
import { ContinentalCupData, WorldSeasonState } from '../season/seasonTypes';
import {
  ClubSeasonStint,
  PlayerSeasonCareerLog,
  SeasonCompetitionCampaignEntry,
  UserCompetitionStatLine,
  UserCompetitionStatsMap,
} from './careerHistoryTypes';

const ALL_CONTINENTAL_CUPS: ContinentalCupId[] = [
  'CHAMPIONS_LEAGUE',
  'EUROPA_LEAGUE',
  'LIBERTADORES',
  'SUL_AMERICANA',
];

function getCompetitionPriority(compId: AnyCompetitionId): number {
  if (compId in LEAGUES) return 10;
  if (
    compId === 'CHAMPIONS_LEAGUE' ||
    compId === 'LIBERTADORES' ||
    compId === 'EUROPA_LEAGUE' ||
    compId === 'SUL_AMERICANA'
  ) {
    return 20;
  }
  if (compId === 'WORLD_CUP') return 30;
  if (compId === 'COPA_AMERICA' || compId === 'EURO_CUP') return 32;
  if (compId === 'NATIONS_LEAGUE') return 34;
  if (compId === 'WC_QUALIFIERS' || compId.startsWith('WCQ_')) return 40;
  return 50;
}

function resolveContinentalClubOutcome(
  cup: ContinentalCupData,
  clubId: string,
  isFinished: boolean,
): { outcomeLabel: string; isChampion?: boolean; isRunnerUp?: boolean } {
  if (cup.championClubId === clubId) {
    return { outcomeLabel: 'CAMPEÃO', isChampion: true };
  }

  if (
    cup.finalMatch &&
    (cup.finalMatch.homeClubId === clubId || cup.finalMatch.awayClubId === clubId)
  ) {
    if (cup.finalMatch.played || isFinished) {
      return { outcomeLabel: 'VICE-CAMPEÃO (FINAL)', isRunnerUp: true };
    }
    return { outcomeLabel: 'NA GRANDE FINAL' };
  }

  const sfTie = cup.semiFinals.find((t) => t.homeClubId === clubId || t.awayClubId === clubId);
  if (sfTie) {
    if ((sfTie.winnerClubId && sfTie.winnerClubId !== clubId) || isFinished) {
      return { outcomeLabel: 'SEMIFINAL' };
    }
    return { outcomeLabel: 'NA SEMIFINAL' };
  }

  const qfTie = cup.quarterFinals.find((t) => t.homeClubId === clubId || t.awayClubId === clubId);
  if (qfTie) {
    if ((qfTie.winnerClubId && qfTie.winnerClubId !== clubId) || isFinished) {
      return { outcomeLabel: 'QUARTAS DE FINAL' };
    }
    return { outcomeLabel: 'NAS QUARTAS DE FINAL' };
  }

  const r16Tie = cup.roundOf16.find((t) => t.homeClubId === clubId || t.awayClubId === clubId);
  if (r16Tie) {
    if ((r16Tie.winnerClubId && r16Tie.winnerClubId !== clubId) || isFinished) {
      return { outcomeLabel: 'OITAVAS DE FINAL' };
    }
    return { outcomeLabel: 'NAS OITAVAS DE FINAL' };
  }

  const grp = cup.groups.find((g) => g.standings.some((r) => r.clubId === clubId));
  if (grp) {
    const sorted = sortStandings(grp.standings);
    const pos = sorted.findIndex((r) => r.clubId === clubId) + 1;
    const row = sorted[pos - 1];
    if (cup.roundOf16.length > 0 || isFinished) {
      return { outcomeLabel: `FASE DE GRUPOS (${pos}º • ${grp.groupName})` };
    }
    if (!row || row.played === 0) {
      return { outcomeLabel: `${grp.groupName} • FASE DE GRUPOS` };
    }
    return { outcomeLabel: `${grp.groupName} • ${pos}º LUGAR (${row.points} PTS)` };
  }

  return { outcomeLabel: 'PARTICIPANTE' };
}

function resolveNationalCupOutcome(
  cup: NationalCupTournament,
  teamId: string,
  isFinished: boolean,
): { outcomeLabel: string; isChampion?: boolean; isRunnerUp?: boolean } {
  if (cup.championTeamId === teamId) {
    return { outcomeLabel: 'CAMPEÃO', isChampion: true };
  }

  if (
    cup.finalMatch &&
    (cup.finalMatch.homeClubId === teamId || cup.finalMatch.awayClubId === teamId)
  ) {
    if (cup.finalMatch.played || isFinished) {
      return { outcomeLabel: 'VICE-CAMPEÃO (FINAL)', isRunnerUp: true };
    }
    return { outcomeLabel: 'NA GRANDE FINAL' };
  }

  const inSemi = cup.semiFinals.find((m) => m.homeClubId === teamId || m.awayClubId === teamId);
  if (inSemi) {
    if ((inSemi.played && inSemi.winnerId !== teamId) || isFinished) {
      return { outcomeLabel: 'SEMIFINAL' };
    }
    return { outcomeLabel: 'NA SEMIFINAL' };
  }

  const inQf = cup.quarterFinals.find((m) => m.homeClubId === teamId || m.awayClubId === teamId);
  if (inQf) {
    if ((inQf.played && inQf.winnerId !== teamId) || isFinished) {
      return { outcomeLabel: 'QUARTAS DE FINAL' };
    }
    return { outcomeLabel: 'NAS QUARTAS DE FINAL' };
  }

  const inR16 = cup.roundOf16.find((m) => m.homeClubId === teamId || m.awayClubId === teamId);
  if (inR16) {
    if ((inR16.played && inR16.winnerId !== teamId) || isFinished) {
      return { outcomeLabel: 'OITAVAS DE FINAL' };
    }
    return { outcomeLabel: 'NAS OITAVAS DE FINAL' };
  }

  const grpA = cup.groups.find((g) => g.standings.some((r) => r.clubId === teamId));
  if (grpA) {
    const sorted = sortStandings(grpA.standings);
    const pos = sorted.findIndex((r) => r.clubId === teamId) + 1;
    const row = sorted[pos - 1];
    const knockoutStarted = cup.roundOf16.length > 0 || cup.quarterFinals.length > 0;
    if (knockoutStarted || isFinished) {
      return { outcomeLabel: `FASE DE GRUPOS (${pos}º • ${grpA.groupName})` };
    }
    if (!row || row.played === 0) {
      return { outcomeLabel: `${grpA.groupName} • FASE DE GRUPOS` };
    }
    return { outcomeLabel: `${grpA.groupName} • ${pos}º LUGAR (${row.points} PTS)` };
  }

  const grpB = cup.leagueBGroups?.find((g) => g.standings.some((r) => r.clubId === teamId));
  if (grpB) {
    const sorted = sortStandings(grpB.standings);
    const pos = sorted.findIndex((r) => r.clubId === teamId) + 1;
    const row = sorted[pos - 1];
    return {
      outcomeLabel: `LIGA B • ${pos}º NO ${grpB.groupName} (${row?.points ?? 0} PTS)`,
    };
  }

  return { outcomeLabel: 'CONVOCADO' };
}

export function buildSeasonCompetitionCampaigns(
  world: WorldSeasonState,
  stints: ClubSeasonStint[],
  userCompStats: UserCompetitionStatsMap,
  nationality: CountryCode,
  isFinished: boolean,
  currentWeek: number,
): SeasonCompetitionCampaignEntry[] {
  const natTeamId = `nt_${nationality.toLowerCase()}`;
  const collected = new Map<AnyCompetitionId, UserCompetitionStatLine>();

  // 1. Todas as competições em que o jogador entrou em campo na temporada
  for (const [rawId, line] of Object.entries(userCompStats) as [
    AnyCompetitionId,
    UserCompetitionStatLine | undefined,
  ][]) {
    if (line && line.matches > 0) {
      collected.set(rawId, { ...line });
    }
  }

  // 2. Garante a(s) liga(s) nacional(is) do(s) clube(s) defendido(s) + copas continentais ativas do clube atual
  for (let i = 0; i < stints.length; i++) {
    const st = stints[i];
    const isLatestClub = i === stints.length - 1;

    if (!collected.has(st.leagueId) && (!isFinished || st.matches > 0 || stints.length === 1)) {
      collected.set(st.leagueId, {
        clubId: st.clubId,
        matches: 0,
        goals: 0,
        assists: 0,
        threeStarMatches: 0,
      });
    }

    if (!isFinished && isLatestClub && st.stage !== 'YOUTH') {
      for (const cupId of ALL_CONTINENTAL_CUPS) {
        const cup = world.continentals[cupId];
        if (cup && cup.participantIds.includes(st.clubId) && !collected.has(cupId)) {
          collected.set(cupId, {
            clubId: st.clubId,
            matches: 0,
            goals: 0,
            assists: 0,
            threeStarMatches: 0,
          });
        }
      }
    }
  }

  const entries: SeasonCompetitionCampaignEntry[] = [];

  for (const [compId, line] of collected.entries()) {
    const teamId = line.clubId || (compId in LEAGUES ? stints[0]?.clubId ?? '' : natTeamId);

    // A) LIGA NACIONAL DE PONTOS CORRIDOS
    if (compId in world.leagues) {
      const lg = world.leagues[compId as LeagueId];
      const sorted = sortStandings(lg.standings);
      const idx = sorted.findIndex((r) => r.clubId === teamId);
      const row = idx !== -1 ? sorted[idx] : null;
      const pos = idx !== -1 ? idx + 1 : undefined;
      const leagueConcluded = isFinished || currentWeek > 38;

      let outcomeLabel = 'DISPUTANDO';
      let isChampion = false;
      let isRunnerUp = false;

      if (pos !== undefined && row) {
        if (leagueConcluded) {
          if (pos === 1) {
            isChampion = true;
            outcomeLabel = `CAMPEÃO • 1º LUGAR (${row.points} PTS)`;
          } else if (pos === 2) {
            isRunnerUp = true;
            outcomeLabel = `VICE-CAMPEÃO • 2º LUGAR (${row.points} PTS)`;
          } else {
            outcomeLabel = `${pos}º COLOCADO (${row.points} PTS)`;
          }
        } else if (row.played === 0) {
          outcomeLabel = '1ª RODADA A INICIAR';
        } else {
          outcomeLabel = `${pos}º LUGAR (${row.points} PTS • ${row.played}J)`;
        }
      }

      entries.push({
        competitionId: compId,
        teamId,
        stageType: 'LEAGUE',
        outcomeLabel,
        isChampion,
        isRunnerUp,
        matches: line.matches,
        goals: line.goals,
        assists: line.assists,
        threeStarMatches: line.threeStarMatches,
      });
      continue;
    }

    // B) COPAS CONTINENTAIS DE CLUBES (CHAMPIONS, LIBERTADORES, EUROPA LEAGUE, SUL-AMERICANA)
    if (compId in world.continentals) {
      const cup = world.continentals[compId as ContinentalCupId];
      const clubCupDone = isFinished || currentWeek > 36;
      const res = resolveContinentalClubOutcome(cup, teamId, clubCupDone);
      entries.push({
        competitionId: compId,
        teamId,
        stageType: 'KNOCKOUT',
        outcomeLabel: res.outcomeLabel,
        isChampion: res.isChampion,
        isRunnerUp: res.isRunnerUp,
        matches: line.matches,
        goals: line.goals,
        assists: line.assists,
        threeStarMatches: line.threeStarMatches,
      });
      continue;
    }

    // C) ELIMINATÓRIAS DA COPA DO MUNDO
    if (compId === 'WC_QUALIFIERS' || compId.startsWith('WCQ_')) {
      const grp = world.international?.qualifiers.find((q) =>
        q.standings.some((r) => r.clubId === teamId),
      );
      let outcomeLabel = 'ELIMINATÓRIAS FIFA';
      if (grp) {
        const sorted = sortStandings(grp.standings);
        const pos = sorted.findIndex((r) => r.clubId === teamId) + 1;
        const row = sorted[pos - 1];
        if (pos > 0 && row) {
          const inZone = pos <= grp.directSpots;
          outcomeLabel = `${pos}º NAS ELIMINATÓRIAS (${row.points} PTS${inZone ? ' • ZONA DA COPA' : ''})`;
        }
      }

      entries.push({
        competitionId: compId,
        teamId,
        stageType: 'QUALIFIERS',
        outcomeLabel,
        matches: line.matches,
        goals: line.goals,
        assists: line.assists,
        threeStarMatches: line.threeStarMatches,
      });
      continue;
    }

    // D) TORNEIOS DE SELEÇÕES (COPA DO MUNDO, COPA AMÉRICA, EUROCOPA, LIGA DAS NAÇÕES)
    const intl = world.international;
    const ntCup =
      compId === 'WORLD_CUP'
        ? intl?.worldCup
        : compId === 'COPA_AMERICA'
          ? intl?.copaAmerica
          : compId === 'EURO_CUP'
            ? intl?.euroCup
            : compId === 'NATIONS_LEAGUE'
              ? intl?.nationsLeague
              : null;

    if (ntCup) {
      const ntDone = isFinished || (compId === 'NATIONS_LEAGUE' ? currentWeek > 36 : currentWeek > 42);
      const res = resolveNationalCupOutcome(ntCup, teamId, ntDone);
      const wcEditionLabel =
        compId === 'WORLD_CUP'
          ? ntCup.title || getWorldCupEditionInfo(world.seasonYear, intl).shortLabel
          : undefined;

      entries.push({
        competitionId: compId,
        competitionLabel: wcEditionLabel,
        teamId,
        stageType: 'KNOCKOUT',
        outcomeLabel: res.outcomeLabel,
        isChampion: res.isChampion,
        isRunnerUp: res.isRunnerUp,
        matches: line.matches,
        goals: line.goals,
        assists: line.assists,
        threeStarMatches: line.threeStarMatches,
      });
      continue;
    }

    // E) AMISTOSOS DATA FIFA
    entries.push({
      competitionId: compId,
      teamId,
      stageType: 'FRIENDLY',
      outcomeLabel: 'AMISTOSOS DATA FIFA',
      matches: line.matches,
      goals: line.goals,
      assists: line.assists,
      threeStarMatches: line.threeStarMatches,
    });
  }

  return entries.sort(
    (a, b) =>
      getCompetitionPriority(a.competitionId) - getCompetitionPriority(b.competitionId) ||
      b.matches - a.matches,
  );
}

/**
 * Reconstrói campanhas por competição para temporadas antigas já salvas antes da introdução de `season.competitions`.
 */
export function resolveSeasonCompetitionsForDisplay(
  season: PlayerSeasonCareerLog,
  nationality: CountryCode,
): SeasonCompetitionCampaignEntry[] {
  if (season.competitions && season.competitions.length > 0) {
    return season.competitions;
  }

  const synthesized: SeasonCompetitionCampaignEntry[] = [];
  const titlesUpper = season.trophyTitles.map((t) => t.toUpperCase());

  for (const st of season.stints) {
    const pos = st.leagueFinishPosition;
    const wonLg = pos === 1;
    const outcomeLabel =
      pos === 1
        ? 'CAMPEÃO • 1º LUGAR'
        : pos === 2
          ? 'VICE-CAMPEÃO • 2º LUGAR'
          : pos
            ? `${pos}º COLOCADO`
            : 'TEMPORADA ENCERRADA';

    synthesized.push({
      competitionId: st.leagueId,
      teamId: st.clubId,
      stageType: 'LEAGUE',
      outcomeLabel,
      isChampion: wonLg,
      isRunnerUp: pos === 2,
      matches: st.matches,
      goals: st.goals,
      assists: st.assists,
      threeStarMatches: st.threeStarMatches ?? 0,
    });
  }

  // Se ganhou título continental na temporada antiga e ainda não estava separado
  const primaryClubId = season.stints[season.stints.length - 1]?.clubId ?? '';
  for (const [kw, cupId] of [
    ['CHAMPIONS LEAGUE', 'CHAMPIONS_LEAGUE'],
    ['EUROPA LEAGUE', 'EUROPA_LEAGUE'],
    ['LIBERTADORES', 'LIBERTADORES'],
    ['SUL-AMERICANA', 'SUL_AMERICANA'],
  ] as const) {
    if (titlesUpper.some((t) => t.includes(kw))) {
      synthesized.push({
        competitionId: cupId,
        teamId: primaryClubId,
        stageType: 'KNOCKOUT',
        outcomeLabel: 'CAMPEÃO',
        isChampion: true,
        matches: 0,
        goals: 0,
        assists: 0,
        threeStarMatches: 0,
      });
    }
  }

  if (season.nationalMatches > 0) {
    const conf = COUNTRIES[nationality]?.confederation ?? 'CONMEBOL';
    const wonWc = titlesUpper.find((t) => t.includes('COPA DO MUNDO'));
    const wonCopaAm = titlesUpper.some((t) => t.includes('COPA AMÉRICA'));
    const wonEuro = titlesUpper.some((t) => t.includes('EUROCOPA'));
    const wonNations = titlesUpper.some((t) => t.includes('LIGA DAS NAÇÕES'));

    let ntCompId: AnyCompetitionId = getQualifierCompId(conf);
    let ntLabel: string | undefined;
    let ntOutcome = 'PARTICIPAÇÃO PELA SELEÇÃO';
    let ntChamp = false;

    if (wonWc) {
      ntCompId = 'WORLD_CUP';
      ntLabel = wonWc.replace(/^CAMPEÃO\s*•\s*/i, '');
      ntOutcome = 'CAMPEÃO';
      ntChamp = true;
    } else if (wonCopaAm) {
      ntCompId = 'COPA_AMERICA';
      ntOutcome = 'CAMPEÃO';
      ntChamp = true;
    } else if (wonEuro) {
      ntCompId = 'EURO_CUP';
      ntOutcome = 'CAMPEÃO';
      ntChamp = true;
    } else if (wonNations) {
      ntCompId = 'NATIONS_LEAGUE';
      ntOutcome = 'CAMPEÃO';
      ntChamp = true;
    }

    synthesized.push({
      competitionId: ntCompId,
      competitionLabel: ntLabel,
      teamId: season.nationalTeamId,
      stageType: ntChamp ? 'KNOCKOUT' : 'QUALIFIERS',
      outcomeLabel: ntOutcome,
      isChampion: ntChamp,
      matches: season.nationalMatches,
      goals: season.nationalGoals,
      assists: season.nationalAssists,
      threeStarMatches: 0,
    });
  }

  return synthesized;
}
