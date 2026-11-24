import React, { useEffect, useRef, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { getRollingWeekWindow } from '../../../shared/utils/calendarDates';
import { CareerState } from '../../../state/careerTypes';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

type StepCurve = 'SINGLE' | 'ACCEL' | 'CRUISE' | 'BRAKE';

function applyCurve(t: number, curve: StepCurve): number {
  if (curve === 'ACCEL') return t * t; // v_0 = 0 -> v_1 = 2/T
  if (curve === 'CRUISE') return t;    // v = 1/T constante
  if (curve === 'BRAKE') {
    const inv = 1 - t;
    return 1 - inv * inv * inv;        // v_0 = 3/T -> v_1 = 0
  }
  // SINGLE (1 único dia): S-curve suave
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Durações casadas matematicamente (2/320 == 1/160 == 3/480 = 0.00625 dias/ms) para velocidade C1 contínua sem tranco!
function getCurveDurationMs(curve: StepCurve): number {
  if (curve === 'ACCEL') return 320;
  if (curve === 'CRUISE') return 160;
  if (curve === 'BRAKE') return 480;
  return 440;
}

function shouldStopAfterAdvancingOneDay(st: CareerState, manualStopRequested: boolean): boolean {
  if (manualStopRequested) return true;
  const nextDay = st.calendar.day === 7 ? 1 : st.calendar.day + 1;
  const nextWeek = st.calendar.day === 7 ? st.calendar.week + 1 : st.calendar.week;
  if (nextDay === 2 || nextDay === 4) return true; // Dia de Treino
  if (nextDay === 6) return true;                  // Dia de Partida
  if (st.calendar.day === 7 && (nextWeek === 10 || nextWeek > 20)) return true; // Janela / Virada
  return false;
}

export const RollingWeekCalendarTile: React.FC = () => {
  const { player, contract, nextOpponentId, calendar, trainedToday, advanceDay } =
    useCareerStore();
  const { setActiveTab, setMatchModalOpen } = useNavigationStore();

  const [isSimulating, setIsSimulating] = useState(false);
  const [slideFrac, setSlideFrac] = useState(0); // 0..1 contínuo a 60/144fps
  const stopRequestedRef = useRef(false);

  const isMatchDay = calendar.day === 6;
  const isTrainingDay = calendar.day === 2 || calendar.day === 4;
  const stopForTraining = isTrainingDay && !trainedToday;

  // Motor 60/144fps contínuo: desliza fisicamente antes de virar o dia (zero pulo/flicker)
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
      const willStop = shouldStopAfterAdvancingOneDay(
        useCareerStore.getState(),
        stopRequestedRef.current,
      );
      if (first && willStop) return 'SINGLE';
      if (first && !willStop) return 'ACCEL';
      if (!first && !willStop) return 'CRUISE';
      return 'BRAKE';
    };

    let currentCurve = pickCurve(true);
    let currentDuration = getCurveDurationMs(currentCurve);

    const tick = (now: number) => {
      // Se o usuário pediu pra parar no meio de um passo CRUISE/ACCEL, troca suavemente pra BRAKE
      if (stopRequestedRef.current && (currentCurve === 'CRUISE' || currentCurve === 'ACCEL')) {
        const elapsedRatio = Math.min(0.95, (now - stepStartMs) / currentDuration);
        currentCurve = 'BRAKE';
        currentDuration = 340;
        stepStartMs = now - elapsedRatio * currentDuration;
      }

      const rawT = (now - stepStartMs) / currentDuration;

      if (rawT < 1) {
        setSlideFrac(applyCurve(Math.max(0, rawT), currentCurve));
        rafId = requestAnimationFrame(tick);
        return;
      }

      // Passo de 1 dia completou 100% do deslizamento: vira o estado exatamente na emenda invisível!
      const prevOffers =
        useCareerStore.getState().transitionProposals.length +
        useCareerStore.getState().marketOffers.length;

      advanceDay();

      const afterState = useCareerStore.getState();
      const d = afterState.calendar.day;
      const hitTrain = (d === 2 || d === 4) && !afterState.trainedToday;
      const hitMatch = d === 6;
      const hitNewOffer =
        afterState.transitionProposals.length + afterState.marketOffers.length > prevOffers;

      if (stopRequestedRef.current || hitTrain || hitMatch || hitNewOffer) {
        setSlideFrac(0);
        setIsSimulating(false);
        return;
      }

      // Continua fluindo pro próximo dia carregando os milissegundos excedentes sem perder 1 frame!
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
  const club = getClubById(contract.clubId);
  const opponent = nextOpponentId ? getClubById(nextOpponentId) : club;
  const league = LEAGUES[club.leagueId];
  const { currentMonthLabel, days } = getRollingWeekWindow(calendar);

  const handleTileClick = () => {
    if (isSimulating) {
      stopRequestedRef.current = true;
      return;
    }
    if (isMatchDay) {
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
    : isMatchDay
      ? 'IR PARA O JOGO ›'
      : stopForTraining
        ? 'IR PARA O TREINO ›'
        : 'AVANÇAR CALENDÁRIO ›';

  return (
    <>
      {isSimulating && (
        <div
          onClick={() => {
            stopRequestedRef.current = true;
          }}
          className="fixed inset-0 z-30 bg-[#0B0B0D]/75 backdrop-blur-md transition-opacity duration-200 cursor-pointer"
        />
      )}

      <section
        onClick={handleTileClick}
        className={`lg:col-span-8 lg:row-span-4 console-tile border-t-[3px] p-6 flex flex-col justify-between cursor-pointer select-none transition-colors ${
          isSimulating
            ? 'relative z-40 border-t-[#F5F5F7] bg-[#14161B] shadow-[0_0_80px_rgba(0,0,0,0.95)]'
            : 'border-t-[#C8A45D] console-tile-interactive'
        }`}
      >
        {/* Cabeçalho: Campeonato na esquerda + MÊS na direita */}
        <div className="flex items-baseline justify-between border-b border-[#242730] pb-3">
          <div className="text-xs uppercase tracking-[0.22em] text-[#9498A3] font-semibold">
            {contract.stage === 'YOUTH' ? club.youthAcademyName : league.name}
          </div>
          <div className="font-condensed uppercase font-extrabold text-2xl tracking-wider text-[#F5F5F7]">
            {currentMonthLabel}
          </div>
        </div>

        {/* JANELA DO CALENDÁRIO FIFA 18: Moldura fixa na 2ª posição + Fita contínua de 8 dias */}
        <div className="relative my-auto py-3">
          {/* Moldura física saliente paralisada na 2ª posição (HOJE) */}
          <div
            className="pointer-events-none absolute top-1 bottom-1 z-20 border-2 border-[#C8A45D] shadow-[0_0_24px_rgba(0,0,0,0.75)]"
            style={{ left: '14.2857%', width: '14.2857%' }}
          >
            <div className="bg-[#C8A45D] text-[#0B0B0D] font-condensed font-extrabold text-[10px] uppercase tracking-[0.2em] text-center py-0.5">
              HOJE
            </div>
          </div>

          {/* Viewport cortada exibindo exatamente 7 larguras de célula */}
          <div className="overflow-hidden border border-[#242730] bg-[#0D0E12]">
            {/* Fita de 8 células (8/7 da largura); deslizar 1 dia = -12.5% da fita */}
            <div
              className="flex will-change-transform"
              style={{
                width: `${(8 / 7) * 100}%`,
                transform: `translate3d(-${slideFrac * 12.5}%, 0, 0)`,
              }}
            >
              {days.map((cell) => {
                // Posição contínua relativa ao slot HOJE (0 = dentro do HOJE, -1 = Ontem, +1 = Amanhã)
                const relPos = cell.offset - slideFrac;
                const focusWeight = Math.max(0, 1 - Math.abs(relPos)); // 1.0 quando está exatamente no HOJE
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
                        style={{ color: focusWeight > 0.5 ? '#C8A45D' : '#9498A3' }}
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
                      {cell.isMatchDay ? (
                        <ClubCrest
                          clubId={opponent.id}
                          shortName={opponent.shortName}
                          primaryColor={opponent.primaryColor}
                          secondaryColor={opponent.secondaryColor}
                          pattern={opponent.pattern}
                          size="sm"
                        />
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
            <ClubCrest
              clubId={club.id}
              shortName={club.shortName}
              primaryColor={club.primaryColor}
              secondaryColor={club.secondaryColor}
              pattern={club.pattern}
              size="sm"
            />
            <span className="font-condensed uppercase font-bold text-base text-[#9498A3] truncate">
              PRÓXIMO JOGO: <strong className="text-[#F5F5F7]">{club.shortName}</strong> VS{' '}
              <strong className="text-[#F5F5F7]">{opponent.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {stopForTraining && !isSimulating && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSimulating(true);
                }}
                className="px-4 py-2.5 bg-[#16181D] hover:bg-[#22252E] border border-[#242730] font-condensed uppercase font-bold text-xs tracking-widest text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
              >
                SIMULAR 50% ›
              </button>
            )}

            <div
              className={`px-7 py-2.5 font-condensed uppercase font-extrabold text-lg tracking-wider ${
                isSimulating
                  ? 'bg-[#C94040] text-[#F5F5F7]'
                  : stopForTraining
                    ? 'bg-[#C8A45D] text-[#0B0B0D]'
                    : 'bg-[#F5F5F7] text-[#0B0B0D] border-l-4 border-l-[#C8A45D]'
              }`}
            >
              {actionHeadline}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
