import React, { useEffect, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { getRollingWeekWindow } from '../../../shared/utils/calendarDates';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

export const RollingWeekCalendarTile: React.FC = () => {
  const { player, contract, nextOpponentId, calendar, trainedToday, advanceDay } =
    useCareerStore();
  const { setActiveTab, setMatchModalOpen } = useNavigationStore();

  const [isSimulating, setIsSimulating] = useState(false);

  const isMatchDay = calendar.day === 6;
  const isTrainingDay = calendar.day === 2 || calendar.day === 4;
  const stopForTraining = isTrainingDay && !trainedToday;

  // Motor de rolagem contínua: avança dia a dia e freia sozinho em Treino, Jogo ou Nova Proposta
  useEffect(() => {
    if (!isSimulating) return;

    const prevOffers =
      useCareerStore.getState().transitionProposals.length +
      useCareerStore.getState().marketOffers.length;

    const timer = window.setTimeout(() => {
      advanceDay();
      const st = useCareerStore.getState();
      const d = st.calendar.day;
      const hitTrain = (d === 2 || d === 4) && !st.trainedToday;
      const hitMatch = d === 6;
      const hitOffer = st.transitionProposals.length + st.marketOffers.length > prevOffers;

      if (hitTrain || hitMatch || hitOffer) {
        setIsSimulating(false);
      }
    }, 360);

    return () => window.clearTimeout(timer);
  }, [isSimulating, calendar.season, calendar.week, calendar.day, advanceDay]);

  if (!player || !contract) return null;
  const club = getClubById(contract.clubId);
  const opponent = nextOpponentId ? getClubById(nextOpponentId) : club;
  const league = LEAGUES[club.leagueId];
  const { currentMonthLabel, absoluteStepKey, days } = getRollingWeekWindow(calendar);

  // O clique no próprio quadrado controla toda a ação contextual!
  const handleMainTileClick = () => {
    if (isSimulating) {
      setIsSimulating(false);
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
    ? 'SIMULANDO SEMANA — CLIQUE PARA PARAR'
    : isMatchDay
      ? 'DIA DE PARTIDA — IR PARA O JOGO ›'
      : stopForTraining
        ? 'DIA DE TREINO — IR PARA O TREINO ›'
        : 'AVANÇAR CALENDÁRIO ›';

  return (
    <>
      {/* Camada de Desfoque de Fundo quando está simulando (foca 100% só na semana!) */}
      {isSimulating && (
        <div
          onClick={() => setIsSimulating(false)}
          className="fixed inset-0 z-30 bg-[#0B0B0D]/72 backdrop-blur-md transition-opacity duration-200 cursor-pointer"
        />
      )}

      <section
        onClick={handleMainTileClick}
        className={`lg:col-span-8 lg:row-span-4 console-tile border-t-[3px] p-6 flex flex-col justify-between cursor-pointer select-none transition-all ${
          isSimulating
            ? 'relative z-40 border-t-[#F5F5F7] bg-[#14161B] shadow-[0_0_80px_rgba(0,0,0,0.95)]'
            : stopForTraining || isMatchDay
              ? 'border-t-[#C8A45D] hover:bg-[#181A20]'
              : 'border-t-[#C8A45D] console-tile-interactive'
        }`}
      >
        {/* Topo do Quadrado: Status na esquerda + MÊS na direita */}
        <div className="flex items-baseline justify-between border-b border-[#242730] pb-3">
          <div className="text-xs uppercase tracking-[0.22em] text-[#9498A3] font-semibold">
            {contract.stage === 'YOUTH' ? club.youthAcademyName : league.name}
          </div>
          <div className="font-condensed uppercase font-extrabold text-2xl tracking-wider text-[#F5F5F7]">
            {currentMonthLabel}
          </div>
        </div>

        {/* ESTEIRA ROLANTE DE 7 DIAS (Ontem na pos 1 | HOJE fixo na pos 2 | +5 dias) */}
        <div className="relative overflow-hidden my-auto py-3">
          {/* Moldura Fixa Paralisada na 2ª Posição (HOJE) */}
          <div
            className="pointer-events-none absolute top-1 bottom-1 z-20 border-2 border-[#C8A45D]"
            style={{ left: '14.2857%', width: '14.2857%' }}
          >
            <div className="bg-[#C8A45D] text-[#0B0B0D] font-condensed font-extrabold text-[10px] uppercase tracking-widest text-center py-0.5">
              HOJE
            </div>
          </div>

          {/* Faixa dos Dias que desliza para a esquerda a cada dia avançado */}
          <div
            key={absoluteStepKey}
            className={`grid grid-cols-7 ${isSimulating ? 'animate-conveyor-tick' : ''}`}
          >
            {days.map((cell) => {
              const isYesterday = cell.offset === -1;
              const isToday = cell.offset === 0;

              return (
                <div
                  key={cell.offset}
                  className={`h-36 px-2 pt-6 pb-3 border-r border-y border-[#242730] first:border-l flex flex-col items-center justify-between ${
                    isToday
                      ? 'bg-[#1B1E25] text-[#F5F5F7]'
                      : isYesterday
                        ? 'bg-[#0D0E11] text-[#565A65] opacity-45'
                        : 'bg-[#101216] text-[#9498A3]'
                  }`}
                >
                  {/* 3 Letras do Dia da Semana em Cima + Número Grande Embaixo */}
                  <div className="text-center">
                    <div className="font-condensed uppercase font-bold text-xs tracking-[0.2em]">
                      {cell.weekday3}
                    </div>
                    <div
                      className={`font-condensed font-extrabold text-4xl leading-none mt-0.5 ${
                        isToday ? 'text-[#F5F5F7]' : ''
                      }`}
                    >
                      {cell.dayNumber}
                    </div>
                  </div>

                  {/* Indicador de Evento do Dia (Jogo com Escudo ou Treino) */}
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
                          isToday && stopForTraining
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

        {/* Barra Inferior Contextual do Quadrado */}
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
