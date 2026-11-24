import React from 'react';
import { getClubById } from '../../data/clubs';
import { getCompetitionTheme } from '../../data/world/competitionThemes';
import {
  findClubLeagueIdInWorld,
  findUpcomingFixtureForClub,
} from '../../domains/season/worldSeasonEngine';
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
  const { contract, calendar, worldSeason } = useCareerStore();
  const club = contract ? getClubById(contract.clubId) : null;

  const activeLeagueId = contract
    ? findClubLeagueIdInWorld(worldSeason, contract.clubId)
    : 'BRA_1';
  const nextFx = contract
    ? findUpcomingFixtureForClub(
        worldSeason,
        contract.clubId,
        contract.stage,
        calendar.week,
        calendar.day,
      )
    : null;
  const compTheme = getCompetitionTheme(nextFx ? nextFx.competitionId : activeLeagueId);

  return (
    <div className="w-screen h-screen bg-[#0B0B0D] text-[#F5F5F7] flex flex-col overflow-hidden relative">
      {/* Atmosfera Dinâmica: mistura o Tema Oficial da Competição (esquerda) + Clube (direita) */}
      {club && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-[0.22] transition-all duration-500"
          style={{
            background: `radial-gradient(ellipse 65% 95% at 15% 0%, ${compTheme.accentPrimary}66, transparent 70%), radial-gradient(ellipse 65% 95% at 88% 0%, ${club.primaryColor}88, transparent 72%)`,
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

      <footer className="h-9 shrink-0 border-t border-[#242730] bg-[#0B0B0D] px-6 md:px-10 flex items-center justify-between text-[11px] uppercase tracking-widest text-[#565A65] relative z-10">
        <div className="flex items-center gap-6">
          <span>[Q / E] OU [LB / RB] NAVEGAR ABAS</span>
          <span>TEMA ATIVO: {compTheme.shortLabel}</span>
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
