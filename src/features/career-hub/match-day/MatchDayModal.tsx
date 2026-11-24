import React, { useEffect, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { LeagueId } from '../../../data/leagues/leagues';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import { evaluateNationalCallUp } from '../../../domains/international/callUpEvaluator';
import {
  MatchPerformanceResult,
  resolveMatchSimulation,
  TacticalMindset,
} from '../../../domains/match-sim/matchSimulator';
import {
  PenaltyCorner,
  resolveInteractiveShootout,
} from '../../../domains/match-sim/penaltyShootoutEngine';
import { getClubFixtureOnExactDay } from '../../../domains/season/worldSeasonEngine';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';
import { InteractiveTravelMap } from './InteractiveTravelMap';
import { KitChoice, MatchKitsAndInfoPanel } from './MatchKitsAndInfoPanel';
import { PenaltyChoiceStage, PenaltyScoreboardStrip } from './PenaltyShootoutPanel';
import { TacticalLineupPitch } from './TacticalLineupPitch';

export const MatchDayModal: React.FC = () => {
  const { player, contract, calendar, worldSeason, periodStats, playCurrentMatch } =
    useCareerStore();
  const { matchModalOpen, setMatchModalOpen } = useNavigationStore();

  const [mindset, setMindset] = useState<TacticalMindset>('EQUILIBRADO');
  const [homeKit, setHomeKit] = useState<KitChoice>('HOME');
  const [awayKit, setAwayKit] = useState<KitChoice>('AWAY');
  const [pendingPenMatch, setPendingPenMatch] = useState<{
    sim90: MatchPerformanceResult;
    aggLabel?: string;
  } | null>(null);
  const [result, setResult] = useState<MatchPerformanceResult | null>(null);

  useEffect(() => {
    if (!matchModalOpen) return;
    setHomeKit('HOME');
    setAwayKit('AWAY');
    setPendingPenMatch(null);
  }, [matchModalOpen]);

  if (!matchModalOpen || !player || !contract) return null;

  const callUp = evaluateNationalCallUp(player, contract.stage, periodStats);
  const liveFixture = getClubFixtureOnExactDay(
    worldSeason,
    contract.clubId,
    contract.stage,
    calendar.week,
    calendar.day,
    callUp,
  );

  const refMatch = result ?? pendingPenMatch?.sim90;
  const compId = refMatch?.competitionId ?? liveFixture?.competitionId;
  const opponentId = refMatch?.opponentId ?? liveFixture?.opponentId;
  const isHome = refMatch ? refMatch.isHome : (liveFixture?.isHome ?? true);
  const stageLabel = refMatch?.stageLabel ?? liveFixture?.stageLabel ?? 'PARTIDA OFICIAL';
  const isContinental = Boolean(liveFixture?.isContinental || liveFixture?.isNationalTeam);
  const activeMyTeamId = refMatch?.clubId ?? liveFixture?.myTeamId ?? contract.clubId;
  const activeUserRole = liveFixture?.nationalRole ?? contract.role;
  const activeStage = liveFixture?.isNationalTeam ? 'PRO' : contract.stage;

  if (!compId || !opponentId) return null;

  const theme = getCompetitionTheme(compId);
  const myClub = getClubById(activeMyTeamId);
  const opponentClub = getClubById(opponentId);
  const homeClub = isHome ? myClub : opponentClub;
  const awayClub = isHome ? opponentClub : myClub;

  let homeRank: number | null = null;
  let awayRank: number | null = null;
  if (!isContinental && worldSeason.leagues[compId as LeagueId]) {
    const rows = worldSeason.leagues[compId as LeagueId].standings;
    const hIdx = rows.findIndex((r) => r.clubId === homeClub.id);
    const aIdx = rows.findIndex((r) => r.clubId === awayClub.id);
    if (hIdx !== -1) homeRank = hIdx + 1;
    if (aIdx !== -1) awayRank = aIdx + 1;
  }

  const leg1Info =
    liveFixture?.prevLegMyGoals !== undefined && liveFixture?.prevLegOppGoals !== undefined
      ? {
          myShort: myClub.shortName,
          oppShort: opponentClub.shortName,
          myGoals: liveFixture.prevLegMyGoals,
          oppGoals: liveFixture.prevLegOppGoals,
        }
      : undefined;

  const prevLegSubtitle = leg1Info
    ? ` • IDA: ${leg1Info.myShort} ${leg1Info.myGoals}x${leg1Info.oppGoals} ${leg1Info.oppShort}`
    : '';

  const handleStartMatch = () => {
    if (!liveFixture) return;
    const sim90 = resolveMatchSimulation(
      player,
      activeMyTeamId,
      liveFixture.opponentId,
      liveFixture.isHome,
      liveFixture.competitionId,
      liveFixture.stageLabel,
      activeUserRole,
      activeStage,
      mindset,
    );

    const hasPrevLeg =
      liveFixture.prevLegMyGoals !== undefined && liveFixture.prevLegOppGoals !== undefined;
    const aggMy = (liveFixture.prevLegMyGoals ?? 0) + sim90.clubGoals;
    const aggOpp = (liveFixture.prevLegOppGoals ?? 0) + sim90.opponentGoals;

    const aggregateNote = hasPrevLeg
      ? `AGREGADO: ${myClub.shortName} ${aggMy} x ${aggOpp} ${opponentClub.shortName} (IDA ${liveFixture.prevLegMyGoals}x${liveFixture.prevLegOppGoals})`
      : undefined;

    const simWithAgg: MatchPerformanceResult = {
      ...sim90,
      aggregateNote,
      twoLegSummary: hasPrevLeg
        ? {
            leg1MyGoals: liveFixture.prevLegMyGoals!,
            leg1OppGoals: liveFixture.prevLegOppGoals!,
            aggMyGoals: aggMy,
            aggOppGoals: aggOpp,
            qualified: aggMy > aggOpp,
          }
        : undefined,
    };

    if (liveFixture.decidesKnockout && aggMy === aggOpp) {
      setPendingPenMatch({ sim90: simWithAgg, aggLabel: aggregateNote });
      return;
    }

    const committed = playCurrentMatch(mindset, simWithAgg);
    if (committed) setResult(committed);
  };

  const handleSelectPenaltyCorner = (corner: PenaltyCorner) => {
    if (!pendingPenMatch) return;
    const shootout = resolveInteractiveShootout(
      player,
      pendingPenMatch.sim90.clubId,
      pendingPenMatch.sim90.opponentId,
      corner,
    );

    const penNarrative = shootout.userConverted
      ? `Pênaltis: Você converteu sua cobrança (${corner})! Placar final nos pênaltis: ${shootout.myPenGoals}x${shootout.oppPenGoals}.`
      : `Pênaltis: Goleiro levou a melhor na sua batida (${corner}). Placar final nos pênaltis: ${shootout.myPenGoals}x${shootout.oppPenGoals}.`;

    const fullResult: MatchPerformanceResult = {
      ...pendingPenMatch.sim90,
      penaltyShootout: shootout,
      twoLegSummary: pendingPenMatch.sim90.twoLegSummary
        ? {
            ...pendingPenMatch.sim90.twoLegSummary,
            qualified: shootout.won,
          }
        : undefined,
      matchNarrative: [...pendingPenMatch.sim90.matchNarrative, penNarrative],
    };

    setPendingPenMatch(null);
    const committed = playCurrentMatch(mindset, fullResult);
    if (committed) setResult(committed);
  };

  const handleClose = () => {
    setPendingPenMatch(null);
    setResult(null);
    setMatchModalOpen(false);
  };

  return (
    <div
      data-modal-scope="true"
      className="fixed inset-0 z-50 w-screen h-screen bg-[#0B0B0D] text-[#F5F5F7] flex flex-col overflow-hidden"
    >
      {/* Cabeçalho Oficial de Transmissão da Competição */}
      <header
        className="h-16 shrink-0 border-b px-6 md:px-10 flex items-center justify-between"
        style={{
          borderBottomColor: `${theme.accentPrimary}66`,
          background: `linear-gradient(90deg, ${theme.bannerBg} 0%, #0B0B0D 65%)`,
        }}
      >
        <CompetitionBadge
          competitionId={compId}
          size="lg"
          stageSubtitle={`${stageLabel} • ${isHome ? 'EM CASA' : 'FORA DE CASA'}${prevLegSubtitle}`}
        />

        <div className="flex items-center gap-4">
          {!result && !pendingPenMatch && (
            <button
              type="button"
              data-pad-back="true"
              onClick={handleClose}
              className="px-4 py-2 bg-[#16181D] hover:bg-[#22252E] border border-[#242730] inline-flex items-center gap-2 font-condensed uppercase font-bold text-xs tracking-widest text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
            >
              <GamepadBadge action="BACK" />
              <span>VOLTAR</span>
            </button>
          )}

          {!result && !pendingPenMatch ? (
            <button
              type="button"
              data-autofocus="true"
              data-pad-y="true"
              onClick={handleStartMatch}
              style={{ borderLeftColor: theme.accentPrimary }}
              className="console-btn-primary px-7 py-2.5 text-lg inline-flex items-center gap-2.5 cursor-pointer"
            >
              <GamepadBadge action="ALT_Y" darkText />
              <span>IR PARA O CAMPO / INICIAR ›</span>
            </button>
          ) : result ? (
            <button
              type="button"
              data-autofocus="true"
              data-pad-y="true"
              data-pad-back="true"
              onClick={handleClose}
              style={{ borderLeftColor: theme.accentPrimary }}
              className="console-btn-primary px-7 py-2.5 text-lg inline-flex items-center gap-2.5 cursor-pointer"
            >
              <GamepadBadge action="CONFIRM" darkText />
              <span>ENCERRAR E VOLTAR À CENTRAL ›</span>
            </button>
          ) : null}
        </div>
      </header>

      {/* CORPO: CENTRAL PRÉ-JOGO | DISPUTA DE PÊNALTIS | APITO FINAL */}
      {pendingPenMatch ? (
        <PenaltyChoiceStage
          player={player}
          myClub={myClub}
          opponentClub={opponentClub}
          isHome={isHome}
          clubGoals={pendingPenMatch.sim90.clubGoals}
          opponentGoals={pendingPenMatch.sim90.opponentGoals}
          aggregateLabel={pendingPenMatch.aggLabel}
          accentColor={theme.accentPrimary}
          onSelectCorner={handleSelectPenaltyCorner}
        />
      ) : !result ? (
        <main className="flex-1 max-w-[1480px] w-full mx-auto px-6 md:px-10 py-5 grid lg:grid-cols-12 gap-5 min-h-0">
          <div className="lg:col-span-4 min-h-0">
            <MatchKitsAndInfoPanel
              homeClub={homeClub}
              awayClub={awayClub}
              isPlayerHome={isHome}
              homeRank={homeRank}
              awayRank={awayRank}
              homeKit={homeKit}
              awayKit={awayKit}
              onChangeHomeKit={setHomeKit}
              onChangeAwayKit={setAwayKit}
              userRole={activeUserRole}
              mindset={mindset}
              onChangeMindset={setMindset}
              isContinentalNight={isContinental}
              accentColor={theme.accentPrimary}
              leg1Info={leg1Info}
            />
          </div>

          <div className="lg:col-span-4 min-h-0">
            <InteractiveTravelMap
              myClub={myClub}
              opponentClub={opponentClub}
              isHome={isHome}
              accentColor={theme.accentPrimary}
            />
          </div>

          <div className="lg:col-span-4 min-h-0">
            <TacticalLineupPitch
              myClub={myClub}
              opponentClub={opponentClub}
              userPlayer={player}
              userRole={activeUserRole}
              accentColor={theme.accentPrimary}
            />
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-3xl w-full mx-auto px-6 flex flex-col justify-center gap-5 overflow-y-auto py-4">
          <div
            className="console-tile border-t-[4px] p-7"
            style={{ borderTopColor: theme.accentPrimary }}
          >
            <div className="text-center text-xs uppercase tracking-[0.25em] text-[#9498A3] mb-3">
              APITO FINAL • {homeClub.stadiumName ?? homeClub.name}
              {result.aggregateNote ? ` • ${result.aggregateNote}` : ''}
            </div>

            <div className="flex items-center justify-around py-4 border-y border-[#242730]">
              <div className="flex flex-col items-center w-44 text-center">
                <ClubCrest clubId={homeClub.id} size="xl" />
                <span className="font-condensed uppercase font-extrabold text-2xl mt-2">
                  {homeClub.name}
                </span>
              </div>

              <div className="text-center">
                {result.twoLegSummary && (
                  <div className="text-[10px] uppercase tracking-widest text-[#9498A3] mb-1">
                    PLACAR DA VOLTA (HOJE)
                  </div>
                )}
                <div className="font-condensed font-extrabold text-7xl text-[#F5F5F7] tabular-nums">
                  {isHome ? result.clubGoals : result.opponentGoals} :{' '}
                  {isHome ? result.opponentGoals : result.clubGoals}
                </div>
                {result.penaltyShootout && (
                  <div className="font-condensed uppercase font-extrabold text-base text-[#C8A45D] mt-1">
                    PÊNALTIS:{' '}
                    {isHome
                      ? `${result.penaltyShootout.myPenGoals} : ${result.penaltyShootout.oppPenGoals}`
                      : `${result.penaltyShootout.oppPenGoals} : ${result.penaltyShootout.myPenGoals}`}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center w-44 text-center">
                <ClubCrest clubId={awayClub.id} size="xl" />
                <span className="font-condensed uppercase font-extrabold text-2xl mt-2">
                  {awayClub.name}
                </span>
              </div>
            </div>

            {/* Faixa Oficial de PLACAR AGREGADO & QUEM PASSOU no Jogo de Volta! */}
            {result.twoLegSummary && (() => {
              const tls = result.twoLegSummary;
              const homeAgg = isHome ? tls.aggMyGoals : tls.aggOppGoals;
              const awayAgg = isHome ? tls.aggOppGoals : tls.aggMyGoals;
              const homeLeg1 = isHome ? tls.leg1MyGoals : tls.leg1OppGoals;
              const awayLeg1 = isHome ? tls.leg1OppGoals : tls.leg1MyGoals;
              const advancingClub = tls.qualified ? myClub : opponentClub;

              return (
                <div
                  className={`mt-4 border p-4 flex flex-wrap items-center justify-between gap-4 ${
                    tls.qualified
                      ? 'bg-[#102117] border-[#2DBE60]'
                      : 'bg-[#221214] border-[#EF4444]'
                  }`}
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#9498A3]">
                      IDA ({homeClub.shortName} {homeLeg1} : {awayLeg1} {awayClub.shortName}) + VOLTA
                    </div>
                    <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] tabular-nums mt-0.5">
                      PLACAR AGREGADO: {homeClub.shortName}{' '}
                      <span className="text-[#C8A45D]">{homeAgg} : {awayAgg}</span>{' '}
                      {awayClub.shortName}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ClubCrest clubId={advancingClub.id} size="md" />
                    <div className="text-right">
                      <span
                        className={`px-2.5 py-0.5 font-condensed uppercase font-extrabold text-xs tracking-widest inline-block ${
                          tls.qualified
                            ? 'bg-[#2DBE60] text-[#0B0B0D]'
                            : 'bg-[#EF4444] text-[#F5F5F7]'
                        }`}
                      >
                        {tls.qualified ? '★ VOCÊ AVANÇOU!' : '✕ ELIMINADO'}
                      </span>
                      <div className="font-condensed uppercase font-bold text-base text-[#F5F5F7] mt-1">
                        CLASSIFICADO: {advancingClub.name}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {!result.twoLegSummary && result.stageLabel.includes('(IDA)') && (
              <div className="mt-4 bg-[#12151E] border border-[#242730] px-4 py-2.5 text-center font-condensed uppercase font-bold text-sm tracking-wider text-[#C8A45D]">
                FIM DO JOGO DE IDA ({myClub.shortName} {result.clubGoals} : {result.opponentGoals} {opponentClub.shortName}) • VAGA DECIDIDA NO JOGO DE VOLTA!
              </div>
            )}

            {result.penaltyShootout && (
              <PenaltyScoreboardStrip
                shootout={result.penaltyShootout}
                myClubShort={myClub.shortName}
                oppClubShort={opponentClub.shortName}
              />
            )}

            <div
              className="mt-5 bg-[#0E0F12] border-l-4 p-4 flex items-center justify-between"
              style={{ borderLeftColor: theme.accentPrimary }}
            >
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#9498A3]">
                  SUA ATUAÇÃO ({player.shirtName} #{player.shirtNumber})
                </div>
                <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7]">
                  {result.minutesPlayed} MIN ({result.minuteEntered}'–{result.minuteExited}') •{' '}
                  {result.playerGoals} GOLS • {result.playerAssists} ASSIST
                </div>
              </div>
              <StarRatingBadge stars={result.stars} size="lg" showLabel />
            </div>

            <div className="mt-4 space-y-1 text-xs text-[#9498A3]">
              {result.matchNarrative.map((line, idx) => (
                <div key={idx}>— {line}</div>
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
