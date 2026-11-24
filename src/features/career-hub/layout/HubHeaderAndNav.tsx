import React, { useEffect } from 'react';
import { getClubById } from '../../../data/clubs';
import { COUNTRIES } from '../../../data/countries/countries';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import { evaluateNationalCallUp } from '../../../domains/international/callUpEvaluator';
import {
  findClubLeagueIdInWorld,
  findUpcomingFixtureForClub,
  TOTAL_SEASON_WEEKS,
} from '../../../domains/season/worldSeasonEngine';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { useUiSoundStore } from '../../../shared/audio/uiSoundEngine';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { CountryFlag } from '../../../shared/ui/CountryFlag';
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
  const {
    player,
    contract,
    calendar,
    bankBalance,
    worldSeason,
    periodStats,
    transitionProposals,
    marketOffers,
    galaModalOpen,
  } = useCareerStore();
  const { activeTab, matchModalOpen, setActiveTab, cycleTab, setScreen } =
    useNavigationStore();
  const { muted, toggleMuted } = useUiSoundStore();

  // LB / RB do controle já disparam 'q' e 'e' via useGlobalGamepadController
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (matchModalOpen || galaModalOpen) return;
      if (e.key === 'q' || e.key === 'Q') cycleTab(-1);
      if (e.key === 'e' || e.key === 'E') cycleTab(1);
      if (e.key === 'Escape') {
        if (activeTab !== 'CENTRAL') {
          setActiveTab('CENTRAL');
        } else {
          setScreen('MAIN_MENU');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, cycleTab, matchModalOpen, setActiveTab, setScreen]);

  if (!player || !contract) return null;
  const club = getClubById(contract.clubId);
  const natMeta = COUNTRIES[player.nationality] ?? COUNTRIES.BRA;
  const callUp = evaluateNationalCallUp(player, contract.stage, periodStats);
  const currentLeagueId = findClubLeagueIdInWorld(worldSeason, contract.clubId);
  const nextFx = findUpcomingFixtureForClub(
    worldSeason,
    contract.clubId,
    contract.stage,
    calendar.week,
    calendar.day,
    callUp,
  );
  const activeCompId = nextFx ? nextFx.competitionId : currentLeagueId;
  const theme = getCompetitionTheme(activeCompId);
  const hasAlert = transitionProposals.length + marketOffers.length > 0;

  return (
    <header
      className="h-16 shrink-0 border-b border-[#242730] bg-[#0B0B0D]/92 px-6 md:px-10 flex items-center justify-between relative z-10"
      style={{ borderBottomColor: `${theme.accentPrimary}55` }}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <ClubCrest clubId={club.id} size="md" />
        <div className="hidden sm:block leading-tight">
          <div className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] tracking-wide">
            {player.shirtName}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[#9498A3] flex items-center gap-1.5 mt-0.5">
            <CountryFlag code={natMeta.code} size="xs" />
            <span>
              {club.shortName} • {player.position}
              {callUp.calledUp ? ' • ★ SELEÇÃO' : ''}
            </span>
          </div>
        </div>
        <FifaStatBadge value={player.overall} size="md" />
        <div className="hidden xl:block pl-3 ml-1 border-l border-[#242730]">
          <CompetitionBadge competitionId={activeCompId} size="sm" />
        </div>
      </div>

      {/* Abas Superiores (Ignoradas pelo D-Pad espacial pois são trocadas por LB / RB!) */}
      <nav className="flex items-center gap-1.5 h-full">
        <button
          type="button"
          data-nav-ignore="true"
          onClick={() => cycleTab(-1)}
          className="mr-1 cursor-pointer"
        >
          <GamepadBadge action="LB" />
        </button>

        {TOP_TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-nav-ignore="true"
              onClick={() => setActiveTab(t.id)}
              style={active ? { borderBottomColor: theme.accentPrimary } : undefined}
              className={`h-full px-4 md:px-6 font-condensed uppercase font-extrabold text-base md:text-lg tracking-wider border-b-[3px] transition-colors relative cursor-pointer ${
                active
                  ? 'text-[#F5F5F7] bg-[#16181D]'
                  : 'border-transparent text-[#565A65] hover:text-[#9498A3]'
              }`}
            >
              {t.label}
              {t.id === 'ESCRITORIO' && hasAlert && (
                <span
                  className="ml-1.5 inline-block w-2 h-2 align-middle"
                  style={{ backgroundColor: theme.accentPrimary }}
                />
              )}
            </button>
          );
        })}

        <button
          type="button"
          data-nav-ignore="true"
          onClick={() => cycleTab(1)}
          className="ml-1 cursor-pointer"
        >
          <GamepadBadge action="RB" />
        </button>
      </nav>

      <div className="hidden md:flex items-center gap-5 text-right">
        <button
          type="button"
          data-nav-ignore="true"
          onClick={toggleMuted}
          title="Alternar sons sutis de menu"
          className="px-2.5 py-1 bg-[#141720] border border-white/10 hover:border-[#C8A45D] font-condensed uppercase font-bold text-[11px] tracking-wider text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
        >
          SOM {muted ? 'OFF' : 'ON'}
        </button>
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#9498A3] block">SALDO</span>
          <span className="font-condensed font-bold text-base text-[#C8A45D]">
            {formatMoney(bankBalance)}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#9498A3] block">
            TEMP {calendar.season}/{(calendar.season + 1).toString().slice(-2)}
          </span>
          <span className="font-condensed font-bold text-base text-[#F5F5F7]">
            SEM {String(calendar.week).padStart(2, '0')}/{TOTAL_SEASON_WEEKS}
          </span>
        </div>
      </div>
    </header>
  );
};
