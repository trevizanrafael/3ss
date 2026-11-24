import React, { useEffect, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';
import { ProSummarySideCard } from './ProSummarySideCard';

const SHORT_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export const DashboardTab: React.FC = () => {
  const {
    player,
    contract,
    youthState,
    nextOpponentId,
    calendar,
    trainedToday,
    transitionProposals,
    marketOffers,
    feed,
    advanceDay,
  } = useCareerStore();
  const { setActiveTab, setMatchModalOpen } = useNavigationStore();

  const [isSimulating, setIsSimulating] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);

  const isMatchDay = calendar.day === 6;
  const isTrainingDay = calendar.day === 2 || calendar.day === 4;
  const canTrainNow = isTrainingDay && !trainedToday;

  // Avanço automático estilo FIFA: anda dia a dia e PARA sozinho em Dia de Treino ou Dia de Jogo
  useEffect(() => {
    if (!isSimulating) return;

    const prevOfferTotal =
      useCareerStore.getState().transitionProposals.length +
      useCareerStore.getState().marketOffers.length;

    const timer = window.setTimeout(() => {
      advanceDay();
      const st = useCareerStore.getState();
      const nextDay = st.calendar.day;
      const hitTrainingStop = (nextDay === 2 || nextDay === 4) && !st.trainedToday;
      const hitMatchStop = nextDay === 6;
      const hitNewOffer =
        st.transitionProposals.length + st.marketOffers.length > prevOfferTotal;

      if (hitTrainingStop || hitMatchStop || hitNewOffer) {
        setIsSimulating(false);
      }
    }, 420);

    return () => window.clearTimeout(timer);
  }, [isSimulating, calendar.day, calendar.week, advanceDay]);

  if (!player || !contract) return null;
  const club = getClubById(contract.clubId);
  const opponent = nextOpponentId ? getClubById(nextOpponentId) : club;
  const league = LEAGUES[club.leagueId];
  const hasOffers = transitionProposals.length + marketOffers.length > 0;
  const currentMsg = feed[Math.min(msgIdx, Math.max(0, feed.length - 1))];

  const handleStepOneDay = () => {
    setIsSimulating(false);
    if (!isMatchDay) advanceDay();
  };

  const handleToggleAutoAdvance = () => {
    if (isMatchDay) {
      setMatchModalOpen(true);
      return;
    }
    setIsSimulating((prev) => !prev);
  };

  return (
    <div className="h-full grid lg:grid-cols-12 lg:grid-rows-6 gap-5 min-h-0">
      {/* BLOCO 01: SEMANA & PRÓXIMO CONFRONTO */}
      <section className="lg:col-span-8 lg:row-span-4 console-tile border-t-[3px] border-t-[#C8A45D] p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#9498A3] mb-2.5">
            <span>
              CRONOGRAMA • SEMANA {String(calendar.week).padStart(2, '0')}
              {isSimulating && (
                <strong className="ml-3 text-[#C8A45D]">● SIMULANDO...</strong>
              )}
              {!isSimulating && canTrainNow && (
                <strong className="ml-3 text-[#C8A45D]">● DIA DE TREINO</strong>
              )}
            </span>
            <span>{contract.stage === 'YOUTH' ? club.youthAcademyName : league.name}</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {SHORT_DAYS.map((d, idx) => {
              const dayNum = idx + 1;
              const isToday = calendar.day === dayNum;
              const isTrain = dayNum === 2 || dayNum === 4;
              const isGame = dayNum === 6;
              return (
                <div
                  key={d}
                  className={`py-2 px-2.5 border transition-colors duration-150 ${
                    isToday
                      ? 'bg-[#F5F5F7] text-[#0B0B0D] border-[#F5F5F7]'
                      : 'bg-[#0E0F12] text-[#9498A3] border-[#242730]'
                  }`}
                >
                  <div className="font-condensed font-extrabold text-sm tracking-wider">{d}</div>
                  <div
                    className={`text-[9px] uppercase tracking-wider font-bold mt-0.5 ${
                      isToday
                        ? 'text-[#0B0B0D]'
                        : isGame
                          ? 'text-[#C8A45D]'
                          : isTrain
                            ? 'text-[#9498A3]'
                            : 'text-[#323640]'
                    }`}
                  >
                    {isGame ? 'PARTIDA' : isTrain ? 'TREINO' : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confronto Limpo */}
        <div className="flex items-center justify-between px-4 md:px-10 my-auto">
          <div className="flex items-center gap-4">
            <ClubCrest
              clubId={club.id}
              shortName={club.shortName}
              primaryColor={club.primaryColor}
              secondaryColor={club.secondaryColor}
              pattern={club.pattern}
              size="xl"
            />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">MANDANTE</div>
              <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
                {club.name}
              </div>
              <div className="font-condensed text-sm text-[#C8A45D] uppercase font-bold mt-1">
                {club.squadAvgOvr} OVR
              </div>
            </div>
          </div>

          <div className="font-condensed font-extrabold text-3xl text-[#565A65] tracking-widest">
            VS
          </div>

          <div className="flex items-center gap-4 flex-row-reverse text-right">
            <ClubCrest
              clubId={opponent.id}
              shortName={opponent.shortName}
              primaryColor={opponent.primaryColor}
              secondaryColor={opponent.secondaryColor}
              pattern={opponent.pattern}
              size="xl"
            />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">VISITANTE</div>
              <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
                {opponent.name}
              </div>
              <div className="font-condensed text-sm text-[#9498A3] uppercase font-bold mt-1">
                {opponent.squadAvgOvr} OVR
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé com EXATAMENTE os 3 Botões */}
        <div className="border-t border-[#242730] pt-4 grid grid-cols-3 gap-3">
          <button
            disabled={isMatchDay || isSimulating}
            onClick={handleStepOneDay}
            className="py-3 bg-[#16181D] hover:bg-[#22252E] disabled:opacity-40 border border-[#242730] font-condensed uppercase font-bold text-base tracking-wider text-[#F5F5F7] cursor-pointer disabled:cursor-not-allowed"
          >
            PULAR 1 DIA
          </button>

          <button
            onClick={() => {
              setIsSimulating(false);
              setActiveTab('TREINO');
            }}
            className={`py-3 font-condensed uppercase font-extrabold text-base tracking-wider border cursor-pointer transition-colors ${
              canTrainNow
                ? 'bg-[#C8A45D] text-[#0B0B0D] border-[#C8A45D]'
                : 'bg-[#16181D] hover:bg-[#22252E] text-[#F5F5F7] border-[#242730]'
            }`}
          >
            {canTrainNow ? 'IR PARA O TREINO ›' : 'IR PARA O TREINO'}
          </button>

          <button
            onClick={handleToggleAutoAdvance}
            className={`py-3 font-condensed uppercase font-extrabold text-base tracking-wider cursor-pointer ${
              isSimulating
                ? 'bg-[#C94040] text-[#F5F5F7] border-l-4 border-l-[#F5F5F7]'
                : 'console-btn-primary'
            }`}
          >
            {isMatchDay
              ? 'JOGAR PARTIDA ›'
              : isSimulating
                ? '■ PARAR SIMULAÇÃO'
                : 'PULAR PARA O JOGO ›'}
          </button>
        </div>
      </section>

      {/* BLOCO 02: CARD MEU PRO */}
      <ProSummarySideCard
        player={player}
        contract={contract}
        youthState={youthState}
        onOpenMyPro={() => setActiveTab('MEU_PRO')}
      />

      {/* BLOCO 03: CAIXA DE ENTRADA */}
      <section className="lg:col-span-8 lg:row-span-2 console-tile p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-[#242730] pb-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#C8A45D] font-semibold">
            {hasOffers ? 'PROPOSTA OFICIAL NA MESA' : 'CAIXA DE ENTRADA'}
          </span>

          {feed.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-[#9498A3] font-condensed">
              <button
                onClick={() => setMsgIdx((i) => Math.max(0, i - 1))}
                className="px-2 hover:text-[#F5F5F7] cursor-pointer"
              >
                ‹
              </button>
              <span>
                {msgIdx + 1} / {feed.length}
              </span>
              <button
                onClick={() => setMsgIdx((i) => Math.min(feed.length - 1, i + 1))}
                className="px-2 hover:text-[#F5F5F7] cursor-pointer"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-6 my-auto">
          {currentMsg ? (
            <div>
              <div className="font-condensed uppercase font-bold text-2xl text-[#F5F5F7]">
                {currentMsg.title}
              </div>
              <p className="text-xs text-[#9498A3] mt-0.5">{currentMsg.detail}</p>
            </div>
          ) : (
            <span className="text-xs text-[#565A65] uppercase">Nenhuma mensagem registrada.</span>
          )}

          {hasOffers && (
            <button
              onClick={() => setActiveTab('ESCRITORIO')}
              className="console-btn-primary px-5 py-2.5 text-sm shrink-0 cursor-pointer"
            >
              ABRIR ESCRITÓRIO ›
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
