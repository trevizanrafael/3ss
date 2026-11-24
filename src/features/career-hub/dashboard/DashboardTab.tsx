import React, { useState } from 'react';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';
import { NextMatchCompetitionTile } from './NextMatchCompetitionTile';
import { ProSummarySideCard } from './ProSummarySideCard';
import { RollingWeekCalendarTile } from './RollingWeekCalendarTile';

export const DashboardTab: React.FC = () => {
  const {
    player,
    contract,
    calendar,
    periodStats,
    userCompStats,
    youthState,
    transitionProposals,
    marketOffers,
    feed,
  } = useCareerStore();
  const { setActiveTab } = useNavigationStore();
  const [msgIdx, setMsgIdx] = useState(0);

  if (!player || !contract) return null;
  const hasOffers = transitionProposals.length + marketOffers.length > 0;
  const clampedIdx = Math.min(msgIdx, Math.max(0, feed.length - 1));
  const currentMsg = feed[clampedIdx];
  const isAwardMsg = currentMsg?.category === 'AWARD';

  return (
    <div className="h-full grid lg:grid-cols-12 lg:grid-rows-6 gap-5 min-h-0">
      {/* BLOCO 01: QUADRADO INTERATIVO DE SEMANA / SIMULAÇÃO ESTILO FIFA */}
      <RollingWeekCalendarTile />

      {/* BLOCO 02: CARD MEU PRO (COLUNA DIREITA INTEIRA) */}
      <ProSummarySideCard
        player={player}
        contract={contract}
        seasonYear={calendar.season}
        periodStats={periodStats}
        userCompStats={userCompStats}
        youthState={youthState}
        onOpenMyPro={() => setActiveTab('MEU_PRO')}
      />

      {/* BLOCO 03 (METADE ESQUERDA): CAIXA DE ENTRADA ENXUTA */}
      <section
        className={`lg:col-span-4 lg:row-span-2 console-tile px-4 py-3 flex flex-col justify-between min-h-0 ${
          isAwardMsg ? 'border-l-[3px] border-l-[#C8A45D]' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#242730] pb-1.5 shrink-0">
          <span className="font-condensed uppercase font-extrabold text-xs tracking-[0.16em] text-[#9498A3]">
            CAIXA DE ENTRADA ({feed.length})
          </span>

          <div className="flex items-center gap-2">
            {hasOffers && (
              <button
                type="button"
                data-focusable="true"
                onClick={() => setActiveTab('ESCRITORIO')}
                className="px-2 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-[10px] tracking-wider cursor-pointer"
              >
                PROPOSTAS ›
              </button>
            )}

            {feed.length > 1 && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#9498A3] font-condensed">
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => setMsgIdx((i) => Math.max(0, i - 1))}
                  className="px-1.5 py-0.5 bg-[#16181D] hover:text-[#F5F5F7] cursor-pointer"
                >
                  ‹
                </button>
                <span className="tabular-nums">
                  {clampedIdx + 1}/{feed.length}
                </span>
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => setMsgIdx((i) => Math.min(feed.length - 1, i + 1))}
                  className="px-1.5 py-0.5 bg-[#16181D] hover:text-[#F5F5F7] cursor-pointer"
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="my-auto pt-1 min-w-0">
          {currentMsg ? (
            <div className="flex items-center gap-3 min-w-0">
              {currentMsg.clubId && <ClubCrest clubId={currentMsg.clubId} size="sm" />}
              <div className="min-w-0 flex-1">
                <span className="text-[9px] uppercase tracking-[0.18em] text-[#565A65] font-bold block">
                  SEMANA {currentMsg.week}
                </span>
                <div className="font-condensed uppercase font-bold text-base leading-tight text-[#F5F5F7] line-clamp-2">
                  {currentMsg.title}
                </div>
                <p className="text-[11px] text-[#9498A3] mt-0.5 leading-snug line-clamp-2">
                  {currentMsg.detail}
                </p>
              </div>
            </div>
          ) : (
            <span className="text-xs text-[#565A65] uppercase">
              Nenhuma mensagem registrada.
            </span>
          )}
        </div>
      </section>

      {/* BLOCO 04 (METADE DIREITA): TABELA OU MATA-MATA DO PRÓXIMO JOGO */}
      <NextMatchCompetitionTile />
    </div>
  );
};
