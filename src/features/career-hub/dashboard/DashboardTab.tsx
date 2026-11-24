import React, { useState } from 'react';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';
import { ProSummarySideCard } from './ProSummarySideCard';
import { RollingWeekCalendarTile } from './RollingWeekCalendarTile';

export const DashboardTab: React.FC = () => {
  const {
    player,
    contract,
    youthState,
    transitionProposals,
    marketOffers,
    feed,
    trophyCabinet,
    latestGalaReport,
    setGalaModalOpen,
  } = useCareerStore();
  const { setActiveTab } = useNavigationStore();
  const [filterMode, setFilterMode] = useState<'ALL' | 'AWARDS'>('ALL');
  const [msgIdx, setMsgIdx] = useState(0);

  if (!player || !contract) return null;
  const hasOffers = transitionProposals.length + marketOffers.length > 0;
  const awardEvents = feed.filter((f) => f.category === 'AWARD');
  const visibleFeed = filterMode === 'AWARDS' ? awardEvents : feed;
  const clampedIdx = Math.min(msgIdx, Math.max(0, visibleFeed.length - 1));
  const currentMsg = visibleFeed[clampedIdx];
  const isAwardMsg = currentMsg?.category === 'AWARD';

  return (
    <div className="h-full grid lg:grid-cols-12 lg:grid-rows-6 gap-5 min-h-0">
      {/* BLOCO 01: QUADRADO INTERATIVO DE SEMANA / SIMULAÇÃO ESTILO FIFA */}
      <RollingWeekCalendarTile />

      {/* BLOCO 02: CARD MEU PRO */}
      <ProSummarySideCard
        player={player}
        contract={contract}
        youthState={youthState}
        onOpenMyPro={() => setActiveTab('MEU_PRO')}
      />

      {/* BLOCO 03: ABA INFERIOR — CAIXA DE ENTRADA & PREMIAÇÕES */}
      <section
        className={`lg:col-span-8 lg:row-span-2 console-tile p-5 flex flex-col justify-between ${
          isAwardMsg ? 'border-l-[4px] border-l-[#C8A45D]' : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242730] pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-focusable="true"
              onClick={() => {
                setFilterMode('ALL');
                setMsgIdx(0);
              }}
              className={`px-2.5 py-0.5 font-condensed uppercase font-extrabold text-xs tracking-wider cursor-pointer ${
                filterMode === 'ALL'
                  ? 'bg-[#F5F5F7] text-[#0B0B0D]'
                  : 'bg-[#16181D] text-[#9498A3] hover:text-[#F5F5F7]'
              }`}
            >
              CAIXA DE ENTRADA ({feed.length})
            </button>

            <button
              type="button"
              data-focusable="true"
              onClick={() => {
                setFilterMode('AWARDS');
                setMsgIdx(0);
              }}
              className={`px-2.5 py-0.5 font-condensed uppercase font-extrabold text-xs tracking-wider cursor-pointer ${
                filterMode === 'AWARDS'
                  ? 'bg-[#C8A45D] text-[#0B0B0D]'
                  : 'bg-[#16181D] text-[#C8A45D] hover:bg-[#22252E]'
              }`}
            >
              ★ PRÊMIOS ({awardEvents.length})
            </button>

            {trophyCabinet.length > 0 && (
              <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-[#9498A3] ml-2">
                {trophyCabinet.length} TROFÉU(S) NA CARREIRA
              </span>
            )}
          </div>

          {visibleFeed.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-[#9498A3] font-condensed">
              <button
                type="button"
                data-focusable="true"
                onClick={() => setMsgIdx((i) => Math.max(0, i - 1))}
                className="px-2 py-0.5 bg-[#16181D] hover:text-[#F5F5F7] cursor-pointer"
              >
                ‹
              </button>
              <span className="tabular-nums">
                {clampedIdx + 1} / {visibleFeed.length}
              </span>
              <button
                type="button"
                data-focusable="true"
                onClick={() => setMsgIdx((i) => Math.min(visibleFeed.length - 1, i + 1))}
                className="px-2 py-0.5 bg-[#16181D] hover:text-[#F5F5F7] cursor-pointer"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-5 my-auto">
          {currentMsg ? (
            <div className="flex items-center gap-4 min-w-0">
              {currentMsg.clubId && <ClubCrest clubId={currentMsg.clubId} size="md" />}
              <div className="min-w-0">
                {isAwardMsg && (
                  <span className="text-[10px] uppercase tracking-[0.22em] text-[#C8A45D] font-bold block">
                    BOLETIM OFICIAL DE PREMIAÇÃO • SEMANA {currentMsg.week}
                  </span>
                )}
                <div className="font-condensed uppercase font-bold text-2xl text-[#F5F5F7] truncate">
                  {currentMsg.title}
                </div>
                <p className="text-xs text-[#9498A3] mt-0.5 truncate">{currentMsg.detail}</p>
              </div>
            </div>
          ) : (
            <span className="text-xs text-[#565A65] uppercase">
              {filterMode === 'AWARDS'
                ? 'Nenhum prêmio anunciado ainda — o Jogador do Mês sai a cada 4 semanas e a Bola de Ouro na Semana 39.'
                : 'Nenhuma mensagem registrada.'}
            </span>
          )}

          <div className="flex items-center gap-2.5 shrink-0">
            {latestGalaReport && (
              <button
                type="button"
                data-focusable="true"
                onClick={() => setGalaModalOpen(true)}
                className="px-4 py-2.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-sm tracking-wider cursor-pointer"
              >
                GALA {latestGalaReport.season} ›
              </button>
            )}

            {hasOffers && (
              <button
                type="button"
                data-focusable="true"
                onClick={() => setActiveTab('ESCRITORIO')}
                className="console-btn-primary px-5 py-2.5 text-sm cursor-pointer"
              >
                ABRIR ESCRITÓRIO ›
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
