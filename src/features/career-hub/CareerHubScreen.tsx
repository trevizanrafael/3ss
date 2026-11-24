import React from 'react';
import { getClubById } from '../../data/clubs';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';
import { CompetitionsTab } from './competitions/CompetitionsTab';
import { ContractsTab } from './contracts/ContractsTab';
import { DashboardTab } from './dashboard/DashboardTab';
import { HubHeaderAndNav } from './layout/HubHeaderAndNav';
import { MatchDayModal } from './match-day/MatchDayModal';
import { MyProTab } from './my-pro/MyProTab';
import { TrainingTab } from './training/TrainingTab';

export const CareerHubScreen: React.FC = () => {
  const { activeTab, setScreen } = useNavigationStore();
  const { contract } = useCareerStore();
  const club = contract ? getClubById(contract.clubId) : null;

  return (
    <div className="w-screen h-screen bg-[#0B0B0D] text-[#F5F5F7] flex flex-col overflow-hidden relative">
      {/* Atmosfera Dinâmica nas Cores Reais do Clube Atual (Sutil e Sofisticada) */}
      {club && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-[0.16] transition-colors duration-500"
          style={{
            background: `radial-gradient(ellipse 80% 100% at 85% 0%, ${club.primaryColor}, transparent 72%)`,
          }}
        />
      )}

      <HubHeaderAndNav />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 md:px-10 py-5 min-h-0 relative">
        {activeTab === 'CENTRAL' && <DashboardTab />}
        {activeTab === 'MEU_PRO' && <MyProTab />}
        {activeTab === 'TREINO' && <TrainingTab />}
        {activeTab === 'ESCRITORIO' && <ContractsTab />}
        {activeTab === 'TEMPORADA' && <CompetitionsTab />}
      </main>

      {/* Rodapé Minimalista de Console */}
      <footer className="h-9 shrink-0 border-t border-[#242730] bg-[#0B0B0D] px-6 md:px-10 flex items-center justify-between text-[11px] uppercase tracking-widest text-[#565A65] relative z-10">
        <div className="flex items-center gap-6">
          <span>[Q / E] OU [LB / RB] NAVEGAR ABAS</span>
          <span>[ESC] MENU PRINCIPAL</span>
        </div>
        <button
          onClick={() => setScreen('MAIN_MENU')}
          className="hover:text-[#F5F5F7] uppercase tracking-widest cursor-pointer"
        >
          SAIR PARA O MENU
        </button>
      </footer>

      <MatchDayModal />
    </div>
  );
};
