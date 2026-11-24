import React from 'react';
import { getClubById } from '../../data/clubs';
import { getCompetitionTheme } from '../../data/world/competitionThemes';
import { evaluateNationalCallUp } from '../../domains/international/callUpEvaluator';
import {
  findClubLeagueIdInWorld,
  findUpcomingFixtureForClub,
} from '../../domains/season/worldSeasonEngine';
import { GamepadBadge } from '../../shared/gamepad/GamepadBadge';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';
import { SeasonAwardsGalaModal } from './awards-gala/SeasonAwardsGalaModal';
import { CompetitionsTab } from './competitions/CompetitionsTab';
import { ContractsTab } from './contracts/ContractsTab';
import { DashboardTab } from './dashboard/DashboardTab';
import { HubHeaderAndNav } from './layout/HubHeaderAndNav';
import { MatchDayModal } from './match-day/MatchDayModal';
import { MyProTab } from './my-pro/MyProTab';
import { TrainingTab } from './training/TrainingTab';

export const CareerHubScreen: React.FC = () => {
  const { activeTab, setScreen } = useNavigationStore();
  const { player, contract, calendar, worldSeason, periodStats } = useCareerStore();
  const club = contract ? getClubById(contract.clubId) : null;
  const callUp =
    player && contract ? evaluateNationalCallUp(player, contract.stage, periodStats) : null;

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
        callUp,
      )
    : null;
  const compTheme = getCompetitionTheme(nextFx ? nextFx.competitionId : activeLeagueId);

  return (
    <div className="w-screen h-screen bg-[#0B0B0D] text-[#F5F5F7] flex flex-col overflow-hidden relative">
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

      {/* Barra Inferior de Comandos do Controle (Contextual igual ao FIFA 18) */}
      <footer className="h-10 shrink-0 border-t border-[#242730] bg-[#0B0B0D] px-6 md:px-10 flex items-center justify-between text-[11px] uppercase tracking-widest text-[#565A65] relative z-10">
        <div className="flex flex-wrap items-center gap-5">
          <GamepadBadge action="CONFIRM" label="CONFIRMAR" />
          {activeTab === 'MEU_PRO' && (
            <>
              <GamepadBadge action="LT" label="TROFÉUS" />
              <GamepadBadge action="RT" />
            </>
          )}
          {activeTab === 'TREINO' && <GamepadBadge action="ALT_Y" label="SESSÃO 100%" />}
          {activeTab === 'ESCRITORIO' && (
            <>
              <GamepadBadge action="LT" label="SEÇÃO" />
              <GamepadBadge action="RT" />
              <GamepadBadge action="ALT_Y" label="SONDAR" />
            </>
          )}
          {activeTab === 'TEMPORADA' && (
            <>
              <GamepadBadge action="LT" label="LIGA" />
              <GamepadBadge action="RT" />
              <GamepadBadge action="RS" label="ROLAR ELENCO" />
            </>
          )}
          <GamepadBadge
            action="BACK"
            label={activeTab === 'CENTRAL' ? 'MENU PRINCIPAL' : 'CENTRAL'}
          />
        </div>

        <button
          type="button"
          data-nav-ignore="true"
          onClick={() => setScreen('MAIN_MENU')}
          className="hover:text-[#F5F5F7] uppercase tracking-widest cursor-pointer"
        >
          SAIR PARA O MENU
        </button>
      </footer>

      <MatchDayModal />
      <SeasonAwardsGalaModal />
    </div>
  );
};
