import React, { useEffect, useState } from 'react';
import { LEAGUES } from '../../../data/leagues/leagues';
import { AwardCode } from '../../../domains/awards/awardTypes';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { formatMoney } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { GalaPodiumCards, GalaTotsGrid } from './GalaPodiumCards';

const SHORT_TAB_LABELS: Partial<Record<AwardCode, string>> = {
  BALLON_DOR: 'BOLA DE OURO',
  GOLDEN_BOY: 'GOLDEN BOY',
  GOLDEN_BOOT: 'CHUTEIRA',
  GOLDEN_PLAYMAKER: 'GARÇOM',
  UCL_BEST: 'CHAMPIONS',
  REI_DA_AMERICA: 'LIBERTADORES',
  LEAGUE_MVP: 'CRAQUE LIGA',
  LEAGUE_YOUNG_PLAYER: 'JOVEM LIGA',
};

export const SeasonAwardsGalaModal: React.FC = () => {
  const { galaModalOpen, latestGalaReport, setGalaModalOpen } = useCareerStore();
  const [tabIdx, setTabIdx] = useState(0);

  useEffect(() => {
    if (galaModalOpen) {
      setTabIdx(0);
    }
  }, [galaModalOpen]);

  useEffect(() => {
    if (!galaModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setGalaModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [galaModalOpen, setGalaModalOpen]);

  if (!galaModalOpen || !latestGalaReport) return null;

  const totalTabs = latestGalaReport.majorAwards.length + 1; // +1 para 11 Ideais (TOTS)
  const safeIdx = Math.min(tabIdx, totalTabs - 1);
  const isTotsTab = safeIdx === latestGalaReport.majorAwards.length;
  const activeAward = !isTotsTab ? latestGalaReport.majorAwards[safeIdx] : null;
  const leagueName = LEAGUES[latestGalaReport.leagueId]?.name.toUpperCase() ?? 'LIGA NACIONAL';

  const stepTab = (delta: number) => {
    setTabIdx((curr) => (curr + delta + totalTabs) % totalTabs);
  };

  return (
    <div
      data-modal-scope="true"
      className="fixed inset-0 z-50 w-screen h-screen bg-[#0B0B0D] text-[#F5F5F7] flex flex-col overflow-hidden"
    >
      {/* Brilho sutil dourado de Cerimônia da Bola de Ouro */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-25"
        style={{
          background:
            'radial-gradient(ellipse 65% 90% at 50% 0%, rgba(200,164,93,0.55), transparent 72%)',
        }}
      />

      {/* Cabeçalho da Cerimônia */}
      <header className="h-16 shrink-0 border-b border-[#C8A45D]/45 bg-[#0B0B0D]/95 px-6 md:px-10 flex items-center justify-between relative z-10">
        <div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-[#C8A45D] font-semibold">
            CERIMÔNIA OFICIAL DE ENCERRAMENTO • FIFA / THREE STARS GALA
          </div>
          <h1 className="font-condensed uppercase font-extrabold text-2xl md:text-3xl text-[#F5F5F7] leading-none">
            GALA DE PREMIAÇÃO DA TEMPORADA {latestGalaReport.season}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {latestGalaReport.totalCashWon > 0 && (
            <div className="hidden md:block text-right pr-3 border-r border-[#242730]">
              <span className="text-[10px] uppercase tracking-widest text-[#9498A3] block">
                PREMIAÇÃO TOTAL GANHA
              </span>
              <span className="font-condensed font-extrabold text-lg text-[#C8A45D]">
                +{formatMoney(latestGalaReport.totalCashWon)}
              </span>
            </div>
          )}

          <button
            type="button"
            data-focusable="true"
            data-autofocus="true"
            data-pad-back="true"
            data-pad-y="true"
            onClick={() => setGalaModalOpen(false)}
            className="console-btn-primary px-6 py-2.5 text-base inline-flex items-center gap-2.5 cursor-pointer"
          >
            <GamepadBadge action="BACK" darkText />
            <span>CONCLUIR CERIMÔNIA ›</span>
          </button>
        </div>
      </header>

      {/* Barra de Categorias navegável com LT / RT */}
      <div className="shrink-0 border-b border-[#242730] bg-[#101216] px-6 md:px-10 py-2.5 flex items-center justify-between gap-2 relative z-10 overflow-x-auto">
        <button
          type="button"
          data-pad-lt="true"
          data-nav-ignore="true"
          onClick={() => stepTab(-1)}
          className="px-2 py-1 cursor-pointer shrink-0"
        >
          <GamepadBadge action="LT" />
        </button>

        <div className="flex items-center gap-1.5 flex-1 justify-center flex-wrap">
          {latestGalaReport.majorAwards.map((aw, i) => {
            const active = safeIdx === i;
            const label = SHORT_TAB_LABELS[aw.code] ?? aw.title;
            return (
              <button
                key={aw.code}
                type="button"
                data-focusable="true"
                onClick={() => setTabIdx(i)}
                className={`px-3 py-1.5 font-condensed uppercase font-extrabold text-xs tracking-wider border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C8A45D] text-[#0B0B0D] border-[#C8A45D]'
                    : 'bg-[#14161B] text-[#9498A3] border-[#242730] hover:text-[#F5F5F7]'
                }`}
              >
                {aw.userRank === 1 ? '★ ' : ''}
                {label}
              </button>
            );
          })}

          <button
            type="button"
            data-focusable="true"
            onClick={() => setTabIdx(latestGalaReport.majorAwards.length)}
            className={`px-3 py-1.5 font-condensed uppercase font-extrabold text-xs tracking-wider border transition-colors cursor-pointer ${
              isTotsTab
                ? 'bg-[#C8A45D] text-[#0B0B0D] border-[#C8A45D]'
                : 'bg-[#14161B] text-[#9498A3] border-[#242730] hover:text-[#F5F5F7]'
            }`}
          >
            {latestGalaReport.userInTots ? '★ ' : ''}11 IDEAIS
          </button>
        </div>

        <button
          type="button"
          data-pad-rt="true"
          data-nav-ignore="true"
          onClick={() => stepTab(1)}
          className="px-2 py-1 cursor-pointer shrink-0"
        >
          <GamepadBadge action="RT" />
        </button>
      </div>

      {/* Palco Principal dos Pódios Top 3 ou 11 Ideais */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 md:px-10 py-6 flex flex-col min-h-0 relative z-10">
        {activeAward ? (
          <GalaPodiumCards award={activeAward} />
        ) : (
          <GalaTotsGrid
            slots={latestGalaReport.leagueTots}
            leagueTitle={leagueName}
            userInTots={latestGalaReport.userInTots}
          />
        )}
      </main>

      {/* Rodapé de Comandos do Controle */}
      <footer className="h-10 shrink-0 border-t border-[#242730] bg-[#0B0B0D] px-6 md:px-10 flex items-center justify-between text-[11px] uppercase tracking-widest text-[#565A65] relative z-10">
        <div className="flex items-center gap-5">
          <GamepadBadge action="LT" label="PRÊMIO ANTERIOR" />
          <GamepadBadge action="RT" label="PRÓXIMO PRÊMIO" />
          <GamepadBadge action="BACK" label="FECHAR GALA" />
        </div>
        <span>
          CATEGORIA {safeIdx + 1} DE {totalTabs}
        </span>
      </footer>
    </div>
  );
};
