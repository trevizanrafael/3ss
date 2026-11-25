import React, { useEffect, useRef, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import { evaluateNationalCallUp } from '../../../domains/international/callUpEvaluator';
import {
  findClubLeagueIdInWorld,
  findUpcomingFixtureForClub,
  getClubFixtureOnExactDay,
  TOTAL_SEASON_WEEKS,
} from '../../../domains/season/worldSeasonEngine';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { getRollingWeekWindow } from '../../../shared/utils/calendarDates';
import { CareerState } from '../../../state/careerTypes';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

type StepCurve = 'SINGLE' | 'ACCEL' | 'CRUISE' | 'BRAKE';

function applyCurve(t: number, curve: StepCurve): number {
  if (curve === 'ACCEL') return t * t;
  if (curve === 'CRUISE') return t;
  if (curve === 'BRAKE') {
    const inv = 1 - t;
    return 1 - inv * inv * inv;
  }
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getCurveDurationMs(curve: StepCurve): number {
  if (curve === 'ACCEL') return 320;
  if (curve === 'CRUISE') return 160;
  if (curve === 'BRAKE') return 480;
  return 440;
}

function shouldStopAfterNextDay(st: CareerState, manualStop: boolean): boolean {
  if (manualStop || !st.contract || !st.player) return true;
  const nextDay = st.calendar.day === 7 ? 1 : st.calendar.day + 1;
  const nextWeek = st.calendar.day === 7 ? st.calendar.week + 1 : st.calendar.week;
  if (nextWeek > TOTAL_SEASON_WEEKS) return true;

  const callUp = evaluateNationalCallUp(st.player, st.contract.stage, st.periodStats);
  const fx = getClubFixtureOnExactDay(
    st.worldSeason,
    st.contract.clubId,
    st.contract.stage,
    nextWeek,
    nextDay,
    callUp,
  );
  if (fx) return true; // Para em Quarta Continental, Sábado de Liga OU Data FIFA da Seleção!
  if (nextWeek <= 38 && (nextDay === 2 || nextDay === 4)) return true; // Para em Dia de Treino!
  if (st.calendar.day === 7 && (nextWeek === 20 || nextWeek === TOTAL_SEASON_WEEKS)) return true;
  return false;
}

export const RollingWeekCalendarTile: React.FC = () => {
  const { player, contract, calendar, worldSeason, periodStats, trainedToday, advanceDay } =
    useCareerStore();
  const { setActiveTab, setMatchModalOpen } = useNavigationStore();

  const [isSimulating, setIsSimulating] = useState(false);
  const [slideFrac, setSlideFrac] = useState(0);
  const stopRequestedRef = useRef(false);

  const callUp =
    player && contract ? evaluateNationalCallUp(player, contract.stage, periodStats) : null;
  const todayFixture = contract
    ? getClubFixtureOnExactDay(
        worldSeason,
        contract.clubId,
        contract.stage,
        calendar.week,
        calendar.day,
        callUp,
      )
    : null;
  const isMatchToday = Boolean(todayFixture);
  const isTrainingDay =
    calendar.week <= 38 && (calendar.day === 2 || calendar.day === 4) && !isMatchToday;
  const stopForTraining = isTrainingDay && !trainedToday;

  useEffect(() => {
    if (!isSimulating) {
      setSlideFrac(0);
      return;
    }

    stopRequestedRef.current = false;
    let rafId = 0;
    let stepStartMs = performance.now();
    let isFirstStep = true;

    const pickCurve = (first: boolean): StepCurve => {
      const willStop = shouldStopAfterNextDay(useCareerStore.getState(), stopRequestedRef.current);
      if (first && willStop) return 'SINGLE';
      if (first && !willStop) return 'ACCEL';
      if (!first && !willStop) return 'CRUISE';
      return 'BRAKE';
    };

    let currentCurve = pickCurve(true);
    let currentDuration = getCurveDurationMs(currentCurve);

    const tick = (now: number) => {
      if (stopRequestedRef.current && (currentCurve === 'CRUISE' || currentCurve === 'ACCEL')) {
        const ratio = Math.min(0.95, (now - stepStartMs) / currentDuration);
        currentCurve = 'BRAKE';
        currentDuration = 340;
        stepStartMs = now - ratio * currentDuration;
      }

      const rawT = (now - stepStartMs) / currentDuration;
      if (rawT < 1) {
        setSlideFrac(applyCurve(Math.max(0, rawT), currentCurve));
        rafId = requestAnimationFrame(tick);
        return;
      }

      const prevOffers =
        useCareerStore.getState().transitionProposals.length +
        useCareerStore.getState().marketOffers.length;

      advanceDay();

      const after = useCareerStore.getState();
      const afterCallUp =
        after.player && after.contract
          ? evaluateNationalCallUp(after.player, after.contract.stage, after.periodStats)
          : null;
      const fxToday = after.contract
        ? getClubFixtureOnExactDay(
            after.worldSeason,
            after.contract.clubId,
            after.contract.stage,
            after.calendar.week,
            after.calendar.day,
            afterCallUp,
          )
        : null;
      const hitTrain =
        after.calendar.week <= 38 &&
        (after.calendar.day === 2 || after.calendar.day === 4) &&
        !fxToday &&
        !after.trainedToday;
      const hitOffer =
        after.transitionProposals.length + after.marketOffers.length > prevOffers;

      if (
        stopRequestedRef.current ||
        Boolean(fxToday) ||
        hitTrain ||
        hitOffer ||
        after.galaModalOpen
      ) {
        setSlideFrac(0);
        setIsSimulating(false);
        return;
      }

      const overtimeMs = Math.min(40, now - (stepStartMs + currentDuration));
      isFirstStep = false;
      currentCurve = pickCurve(isFirstStep);
      currentDuration = getCurveDurationMs(currentCurve);
      stepStartMs = now - overtimeMs;
      setSlideFrac(applyCurve(overtimeMs / currentDuration, currentCurve));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isSimulating, advanceDay]);

  if (!player || !contract) return null;
  const clubLeagueId = findClubLeagueIdInWorld(worldSeason, contract.clubId);
  const upcomingFx = findUpcomingFixtureForClub(
    worldSeason,
    contract.clubId,
    contract.stage,
    calendar.week,
    calendar.day,
    callUp,
  );
  const activeCompId = todayFixture?.competitionId ?? upcomingFx?.competitionId ?? clubLeagueId;
  const compTheme = getCompetitionTheme(activeCompId);

  const { currentMonthLabel, days } = getRollingWeekWindow(
    calendar,
    worldSeason,
    contract.clubId,
    contract.stage,
    callUp,
  );

  const handleTileClick = () => {
    if (isSimulating) {
      stopRequestedRef.current = true;
      return;
    }
    if (isMatchToday) {
      setMatchModalOpen(true);
      return;
    }
    if (stopForTraining) {
      setActiveTab('TREINO');
      return;
    }
    setIsSimulating(true);
  };

  const actionHeadline = isSimulating
    ? 'SIMULANDO — CLIQUE PARA FREAR'
    : isMatchToday
      ? 'IR PARA O JOGO ›'
      : stopForTraining
        ? 'IR PARA O TREINO ›'
        : 'AVANÇAR CALENDÁRIO ›';

  return (
    <>
      {isSimulating && (
        <button
          type="button"
          data-pad-back="true"
          onClick={() => {
            stopRequestedRef.current = true;
          }}
          className="fixed inset-0 z-30 bg-[#0B0B0D]/75 backdrop-blur-md transition-opacity duration-200 cursor-pointer"
          aria-label="Parar simulação"
        />
      )}

      <section
        id="central-calendar"
        tabIndex={0}
        data-focusable="true"
        data-autofocus="true"
        data-nav-down="central-inbox"
        data-nav-right="central-pro"
        data-focus-label={actionHeadline.replace(' ›', '')}
        data-simulating={isSimulating ? 'true' : undefined}
        onClick={handleTileClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTileClick();
          }
        }}
        style={{ borderTopColor: isSimulating ? '#F5F5F7' : compTheme.accentPrimary }}
        className={`lg:col-span-8 lg:row-span-4 console-tile border-t-[3px] p-6 flex flex-col justify-between cursor-pointer select-none transition-colors outline-none ${
          isSimulating
            ? 'relative z-50 bg-[#14161B] shadow-[0_0_80px_rgba(0,0,0,0.95)]'
            : 'console-tile-interactive'
        }`}
      >
        {/* Cabeçalho com Tema e Logo Oficial da Competição na Esquerda + MÊS na Direita */}
        <div className="flex items-center justify-between border-b border-[#242730] pb-3">
          <CompetitionBadge
            competitionId={activeCompId}
            size="md"
            stageSubtitle={
              todayFixture?.stageLabel ?? upcomingFx?.stageLabel ?? 'PÓS-TEMPORADA'
            }
          />
          <div className="font-condensed uppercase font-extrabold text-2xl tracking-wider text-[#F5F5F7]">
            {currentMonthLabel}
          </div>
        </div>

        {/* Fita Contínua de 8 Dias com HOJE travado na 2ª posição */}
        <div className="relative my-auto py-3">
          <div
            className="pointer-events-none absolute top-1 bottom-1 z-20 border-2 shadow-[0_0_24px_rgba(0,0,0,0.75)]"
            style={{
              left: '14.2857%',
              width: '14.2857%',
              borderColor: compTheme.accentPrimary,
            }}
          >
            <div
              className="font-condensed font-extrabold text-[10px] uppercase tracking-[0.2em] text-center py-0.5"
              style={{
                backgroundColor: compTheme.accentPrimary,
                color: compTheme.textOnAccent,
              }}
            >
              HOJE
            </div>
          </div>

          <div className="overflow-hidden border border-[#242730] bg-[#0D0E12]">
            <div
              className="flex will-change-transform"
              style={{
                width: `${(8 / 7) * 100}%`,
                transform: `translate3d(-${slideFrac * 12.5}%, 0, 0)`,
              }}
            >
              {days.map((cell) => {
                const relPos = cell.offset - slideFrac;
                const focusWeight = Math.max(0, 1 - Math.abs(relPos));
                const pastDim = relPos < 0 ? Math.max(0.38, 1 + relPos * 0.58) : 1;

                return (
                  <div
                    key={cell.offset}
                    style={{
                      width: '12.5%',
                      opacity: pastDim,
                      backgroundColor:
                        focusWeight > 0.05
                          ? `rgba(32, 36, 46, ${0.35 + focusWeight * 0.65})`
                          : '#101216',
                    }}
                    className="h-36 px-2 pt-6 pb-3 border-r border-[#242730] flex flex-col items-center justify-between shrink-0"
                  >
                    <div className="text-center">
                      <div
                        className="font-condensed uppercase font-bold text-xs tracking-[0.2em]"
                        style={{ color: focusWeight > 0.5 ? compTheme.accentPrimary : '#9498A3' }}
                      >
                        {cell.weekday3}
                      </div>
                      <div
                        className="font-condensed font-extrabold text-4xl leading-none mt-0.5"
                        style={{ color: focusWeight > 0.4 ? '#F5F5F7' : '#9498A3' }}
                      >
                        {cell.dayNumber}
                      </div>
                    </div>

                    <div className="h-9 flex items-center justify-center">
                      {cell.fixture ? (
                        <div className="flex items-center gap-1">
                          <ClubCrest clubId={cell.fixture.opponentId} size="sm" />
                          {(cell.fixture.isContinental || cell.fixture.isNationalTeam) && (
                            <CompetitionBadge
                              competitionId={cell.fixture.competitionId}
                              size="sm"
                              showName={false}
                            />
                          )}
                        </div>
                      ) : cell.isTrainingDay ? (
                        <span
                          className={`px-2 py-0.5 font-condensed uppercase font-extrabold text-[10px] tracking-widest ${
                            focusWeight > 0.5 && stopForTraining
                              ? 'bg-[#C8A45D] text-[#0B0B0D]'
                              : 'bg-[#1E2129] text-[#C8A45D]'
                          }`}
                        >
                          TREINO
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 bg-[#242730]" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé Contextual */}
        <div className="border-t border-[#242730] pt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {upcomingFx ? (
              <>
                <ClubCrest clubId={upcomingFx.opponentId} size="sm" />
                <span className="font-condensed uppercase font-bold text-base text-[#9498A3] truncate">
                  {upcomingFx.neutralVenue
                    ? upcomingFx.venueCity
                      ? `SEDE (${upcomingFx.venueCity.toUpperCase()}) VS`
                      : 'SEDE NEUTRA VS'
                    : upcomingFx.isHome
                      ? 'EM CASA VS'
                      : 'FORA VS'}{' '}
                  <strong className="text-[#F5F5F7]">
                    {getClubById(upcomingFx.opponentId).name}
                  </strong>{' '}
                  • {upcomingFx.stageLabel}
                </span>
              </>
            ) : (
              <span className="font-condensed uppercase font-bold text-base text-[#9498A3]">
                FÉRIAS & JANELA DE FIM DE TEMPORADA
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {stopForTraining && !isSimulating && (
              <button
                type="button"
                data-pad-x="true"
                data-nav-ignore="true"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSimulating(true);
                }}
                className="px-3.5 py-2.5 bg-[#16181D] hover:bg-[#22252E] border border-[#242730] inline-flex items-center gap-2 font-condensed uppercase font-bold text-xs tracking-widest text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
              >
                <GamepadBadge action="ALT_X" />
                <span>SIMULAR 50%</span>
              </button>
            )}

            <div
              style={
                !isSimulating && !stopForTraining
                  ? { borderLeftColor: compTheme.accentPrimary }
                  : undefined
              }
              className={`px-6 py-2.5 font-condensed uppercase font-extrabold text-lg tracking-wider inline-flex items-center gap-2.5 ${
                isSimulating
                  ? 'bg-[#C94040] text-[#F5F5F7]'
                  : stopForTraining
                    ? 'bg-[#C8A45D] text-[#0B0B0D]'
                    : 'bg-[#F5F5F7] text-[#0B0B0D] border-l-4'
              }`}
            >
              <GamepadBadge action={isSimulating ? 'BACK' : 'CONFIRM'} darkText={!isSimulating} />
              <span>{actionHeadline}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
