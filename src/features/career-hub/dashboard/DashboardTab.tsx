import React, { useState } from 'react';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';
import { ProSummarySideCard } from './ProSummarySideCard';
import { RollingWeekCalendarTile } from './RollingWeekCalendarTile';

export const DashboardTab: React.FC = () => {
  const { player, contract, youthState, transitionProposals, marketOffers, feed } =
    useCareerStore();
  const { setActiveTab } = useNavigationStore();
  const [msgIdx, setMsgIdx] = useState(0);

  if (!player || !contract) return null;
  const hasOffers = transitionProposals.length + marketOffers.length > 0;
  const currentMsg = feed[Math.min(msgIdx, Math.max(0, feed.length - 1))];

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
