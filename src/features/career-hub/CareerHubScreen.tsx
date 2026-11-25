import React from 'react';
import { getClubById } from '../../data/clubs';
import { getCompetitionTheme } from '../../data/world/competitionThemes';
import { evaluateNationalCallUp } from '../../domains/international/callUpEvaluator';
import {
  findClubLeagueIdInWorld,
  findUpcomingFixtureForClub,
  getClubFixtureOnExactDay,
} from '../../domains/season/worldSeasonEngine';
import { GamepadBadge } from '../../shared/gamepad/GamepadBadge';
import { useGamepadStore } from '../../shared/gamepad/gamepadStore';
import { CompetitionBackdrop } from '../../shared/ui/CompetitionBackdrop';
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
  const { activeTab, previewedSeasonCompId, setScreen } = useNavigationStore();
  const { player, contract, calendar, worldSeason, periodStats } = useCareerStore();
  const { focusedHint } = useGamepadStore();

  const club = contract ? getClubById(contract.clubId) : null;
  const callUp =
    player && contract ? evaluateNationalCallUp(player, contract.stage, periodStats) : null;

  const activeLeagueId = contract
    ? findClubLeagueIdInWorld(worldSeason, contract.clubId)
    : 'BRA_1';

  const todayFx = contract
    ? getClubFixtureOnExactDay(
        worldSeason,
        contract.clubId,
        contract.stage,
        calendar.week,
        calendar.day,
        callUp,
      )
    : null;

  const nextFx =
    todayFx ??
    (contract
      ? findUpcomingFixtureForClub(
          worldSeason,
          contract.clubId,
          contract.stage,
          calendar.week,
          calendar.day,
          callUp,
        )
      : null);

  // Tematização Dinâmica Estilo FIFA 23: muda pela liga atual, pelo próximo torneio continental/seleção ou pela liga inspecionada em TEMPORADA!
  const themeCompId =
    activeTab === 'TEMPORADA' && previewedSeasonCompId
      ? previewedSeasonCompId
      : todayFx?.competitionId ??
        (nextFx && (nextFx.isContinental || nextFx.isNationalTeam) && activeTab === 'CENTRAL'
          ? nextFx.competitionId
          : activeLeagueId);
  const compTheme = getCompetitionTheme(themeCompId);

  return (
    <div
      style={
        {
          '--comp-primary': compTheme.accentPrimary,
          '--comp-secondary': compTheme.accentSecondary,
        } as React.CSSProperties
      }
      className="w-screen h-screen bg-[#0B0B0D] text-[#F5F5F7] flex flex-col overflow-hidden relative"
    >
      {/* Fundo Atmosférico Dinâmico do Campeonato + Clube (Bundesliga, Premier League, Brasileirão, UCL, Libertadores...) */}
      <CompetitionBackdrop theme={compTheme} clubPrimaryColor={club?.primaryColor} />

      <HubHeaderAndNav />

      <main
        key={activeTab}
        className="console-tab-stage flex-1 max-w-[92rem] w-full mx-auto px-6 md:px-10 py-5 min-h-0 relative z-10"
      >
        {activeTab === 'CENTRAL' && <DashboardTab />}
        {activeTab === 'MEU_PRO' && <MyProTab />}
        {activeTab === 'TREINO' && <TrainingTab />}
        {activeTab === 'ESCRITORIO' && <ContractsTab />}
        {activeTab === 'TEMPORADA' && <CompetitionsTab />}
      </main>

      {/* Barra Inferior Contextual Dinâmica do Controle */}
      <footer className="h-10 shrink-0 border-t border-white/10 bg-[#08090C]/92 backdrop-blur-md px-6 md:px-10 flex items-center justify-between text-[11px] uppercase tracking-widest text-[#9498A3] relative z-10">
        <div className="flex flex-wrap items-center gap-5">
          <GamepadBadge
            action="CONFIRM"
            label={focusedHint ?? 'CONFIRMAR'}
          />

          {activeTab === 'CENTRAL' && (
            <>
              <GamepadBadge action="LT" label="MENSAGENS" />
              <GamepadBadge action="RT" />
            </>
          )}

          {activeTab === 'MEU_PRO' && (
            <>
              <GamepadBadge action="LT" label="SEÇÃO" />
              <GamepadBadge action="RT" />
              <GamepadBadge action="RS" label="ROLAR" />
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
              <GamepadBadge action="LT" label="TORNEIO" />
              <GamepadBadge action="RT" />
              <GamepadBadge action="ALT_X" label="ESTATÍSTICAS" />
              <GamepadBadge action="ALT_Y" label="GRUPOS / MATA-MATA" />
              <GamepadBadge action="RS" label="ROLAR" />
            </>
          )}

          <GamepadBadge
            action="BACK"
            label={activeTab === 'CENTRAL' ? 'MENU PRINCIPAL' : 'VOLTAR À CENTRAL'}
          />
        </div>

        <button
          type="button"
          data-nav-ignore="true"
          onClick={() => setScreen('MAIN_MENU')}
          className="hover:text-[#F5F5F7] uppercase tracking-widest cursor-pointer font-condensed font-bold text-xs"
        >
          SAIR PARA O MENU
        </button>
      </footer>

      <MatchDayModal />
      <SeasonAwardsGalaModal />
    </div>
  );
};
