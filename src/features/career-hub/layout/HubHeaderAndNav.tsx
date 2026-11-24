import React, { useEffect } from 'react';
import { getClubById } from '../../../data/clubs';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { FifaStatBadge } from '../../../shared/ui/FifaStatBadge';
import { formatMoney } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { HubTab, useNavigationStore } from '../../../state/useNavigationStore';

const TOP_TABS: { id: HubTab; label: string }[] = [
  { id: 'CENTRAL', label: 'CENTRAL' },
  { id: 'MEU_PRO', label: 'MEU PRO' },
  { id: 'TREINO', label: 'TREINO' },
  { id: 'ESCRITORIO', label: 'ESCRITÓRIO' },
  { id: 'TEMPORADA', label: 'TEMPORADA' },
];

export const HubHeaderAndNav: React.FC = () => {
  const { player, contract, calendar, bankBalance, transitionProposals, marketOffers } =
    useCareerStore();
  const { activeTab, matchModalOpen, setActiveTab, cycleTab, setScreen } =
    useNavigationStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (matchModalOpen) return;
      if (e.key === 'q' || e.key === 'Q') cycleTab(-1);
      if (e.key === 'e' || e.key === 'E') cycleTab(1);
      if (e.key === 'Escape') setScreen('MAIN_MENU');
    };
    window.addEventListener('keydown', onKeyDown);

    // Suporte nativo a LB (botão 4) / RB (botão 5) no Controle Gamepad
    let prevLb = false;
    let prevRb = false;
    const poll = window.setInterval(() => {
      const gp = navigator.getGamepads?.()[0];
      if (!gp || matchModalOpen) return;
      const lb = Boolean(gp.buttons[4]?.pressed);
      const rb = Boolean(gp.buttons[5]?.pressed);
      if (lb && !prevLb) cycleTab(-1);
      if (rb && !prevRb) cycleTab(1);
      prevLb = lb;
      prevRb = rb;
    }, 80);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearInterval(poll);
    };
  }, [cycleTab, matchModalOpen, setScreen]);

  if (!player || !contract) return null;
  const club = getClubById(contract.clubId);
  const hasAlert = transitionProposals.length + marketOffers.length > 0;

  return (
    <header className="h-16 shrink-0 border-b border-[#242730] bg-[#0B0B0D]/90 px-6 md:px-10 flex items-center justify-between relative z-10">
      {/* Esquerda: Clube + Jogador + OVR */}
      <div className="flex items-center gap-3.5 min-w-0">
        <ClubCrest
          clubId={club.id}
          shortName={club.shortName}
          primaryColor={club.primaryColor}
          secondaryColor={club.secondaryColor}
          pattern={club.pattern}
          size="md"
        />
        <div className="hidden sm:block leading-tight">
          <div className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] tracking-wide">
            {player.shirtName}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">
            {club.shortName} • {player.position}
          </div>
        </div>
        <FifaStatBadge value={player.overall} size="md" />
      </div>

      {/* Centro: Abas Estilo Console FIFA 18 */}
      <nav className="flex items-center gap-1 h-full">
        <button
          onClick={() => cycleTab(-1)}
          className="px-2 py-0.5 bg-[#191B20] border border-[#242730] text-[10px] font-bold text-[#9498A3] hover:text-[#F5F5F7] mr-2 cursor-pointer"
        >
          Q / LB
        </button>

        {TOP_TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`h-full px-4 md:px-6 font-condensed uppercase font-extrabold text-base md:text-lg tracking-wider border-b-[3px] transition-colors relative cursor-pointer ${
                active
                  ? 'border-[#C8A45D] text-[#F5F5F7] bg-[#16181D]'
                  : 'border-transparent text-[#565A65] hover:text-[#9498A3]'
              }`}
            >
              {t.label}
              {t.id === 'ESCRITORIO' && hasAlert && (
                <span className="ml-1.5 inline-block w-2 h-2 bg-[#C8A45D] align-middle" />
              )}
            </button>
          );
        })}

        <button
          onClick={() => cycleTab(1)}
          className="px-2 py-0.5 bg-[#191B20] border border-[#242730] text-[10px] font-bold text-[#9498A3] hover:text-[#F5F5F7] ml-2 cursor-pointer"
        >
          E / RB
        </button>
      </nav>

      {/* Direita: Saldo + Semana */}
      <div className="hidden md:flex items-center gap-6 text-right">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#565A65] block">SALDO</span>
          <span className="font-condensed font-bold text-base text-[#C8A45D]">
            {formatMoney(bankBalance)}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#565A65] block">
            TEMP {calendar.season}
          </span>
          <span className="font-condensed font-bold text-base text-[#F5F5F7]">
            SEMANA {String(calendar.week).padStart(2, '0')}
          </span>
        </div>
      </div>
    </header>
  );
};
