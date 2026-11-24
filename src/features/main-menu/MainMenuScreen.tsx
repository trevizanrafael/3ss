import React from 'react';
import { getClubById } from '../../data/clubs';
import { getCompetitionTheme } from '../../data/world/competitionThemes';
import { findClubLeagueIdInWorld } from '../../domains/season/worldSeasonEngine';
import { useUiSoundStore } from '../../shared/audio/uiSoundEngine';
import { GamepadBadge } from '../../shared/gamepad/GamepadBadge';
import { useGamepadStore } from '../../shared/gamepad/gamepadStore';
import { ClubCrest } from '../../shared/ui/ClubCrest';
import { ClubPlayer3DViewport } from '../../shared/ui/ClubPlayer3DViewport';
import { CompetitionBackdrop } from '../../shared/ui/CompetitionBackdrop';
import { CompetitionBadge } from '../../shared/ui/CompetitionBadge';
import { FifaStatBadge } from '../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../shared/ui/StarRatingBadge';
import { formatSquadRole } from '../../shared/utils/formatters';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';

export const MainMenuScreen: React.FC = () => {
  const { hasActiveSave, player, contract, calendar, worldSeason, resetCareer } =
    useCareerStore();
  const { setScreen } = useNavigationStore();
  const { padConnected, brand } = useGamepadStore();
  const { muted, toggleMuted } = useUiSoundStore();

  const currentClub = contract ? getClubById(contract.clubId) : null;
  const canContinue = Boolean(hasActiveSave && player && contract && currentClub);

  const activeLeagueId =
    canContinue && contract ? findClubLeagueIdInWorld(worldSeason, contract.clubId) : 'LIBERTADORES';
  const theme = getCompetitionTheme(activeLeagueId);

  const handleNewCareer = () => {
    if (hasActiveSave) resetCareer();
    setScreen('CREATE_PLAYER');
  };

  return (
    <div
      style={
        {
          '--comp-primary': theme.accentPrimary,
          '--comp-secondary': theme.accentSecondary,
        } as React.CSSProperties
      }
      className="w-screen h-screen bg-[#0B0B0D] relative flex flex-col justify-between px-8 md:px-16 py-9 overflow-hidden"
    >
      <CompetitionBackdrop theme={theme} clubPrimaryColor={currentClub?.primaryColor} />

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-4">
          <StarRatingBadge stars={3} size="md" />
          <span className="text-[11px] uppercase tracking-[0.28em] text-[#9498A3] font-semibold">
            THREE STARS SOCCER • BROADCAST EDITION
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            data-nav-ignore="true"
            onClick={toggleMuted}
            className="px-3 py-1 bg-[#12141B]/90 border border-white/12 hover:border-[#C8A45D] font-condensed uppercase font-bold text-xs tracking-wider text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
          >
            SOM DE MENU: {muted ? 'OFF' : 'ON'}
          </button>

          <span
            className="text-[11px] uppercase tracking-widest font-bold"
            style={{ color: theme.accentPrimary }}
          >
            {padConnected ? `CONTROLE ATIVO (${brand})` : 'CONTROLE & TECLADO NATIVOS'}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 grid lg:grid-cols-12 gap-8 items-center min-h-0 py-4">
        {/* Coluna Esquerda: Marca Monumental + Vitrine da Liga Atual */}
        <div className={canContinue ? 'lg:col-span-4' : 'lg:col-span-7'}>
          <div
            className="text-xs uppercase tracking-[0.26em] font-bold mb-2.5"
            style={{ color: theme.accentPrimary }}
          >
            MODO CARREIRA DE ATLETA PROFISSIONAL
          </div>
          <h1 className="font-condensed font-extrabold uppercase text-6xl xl:text-8xl leading-[0.86] text-[#F5F5F7] tracking-tight">
            THREE STARS
            <br />
            <span style={{ color: theme.accentPrimary }}>SOCCER</span>
          </h1>
          <div
            className="w-24 h-[3px] mt-5 mb-4"
            style={{ backgroundColor: theme.accentPrimary }}
          />
          <p className="text-xs uppercase tracking-[0.18em] text-[#D4D7E0]">
            410 CLUBES REAIS • 64 SELEÇÕES FIFA • GALA DA BOLA DE OURO
          </p>

          {canContinue && currentClub && (
            <div className="mt-6 inline-flex items-center gap-3 bg-[#0E1016]/85 border border-white/10 px-4 py-2.5">
              <CompetitionBadge competitionId={activeLeagueId} size="sm" />
            </div>
          )}
        </div>

        {/* Coluna Central (Quando há Carreira Salva): Seu Craque 3D com a Camisa do Clube! */}
        {canContinue && player && currentClub && (
          <div className="hidden lg:flex lg:col-span-4 h-full max-h-[500px] flex-col relative">
            <div className="pointer-events-none absolute inset-x-0 top-2 text-center z-10">
              <span className="font-condensed font-extrabold text-[110px] leading-none text-white/[0.06] select-none">
                #{player.shirtNumber}
              </span>
            </div>
            <ClubPlayer3DViewport
              player={player}
              club={currentClub}
              accentColor={theme.accentPrimary}
              framing="HERO"
              allowDragSpin
              className="flex-1 w-full"
            />
            <div className="text-center text-[10px] uppercase tracking-[0.22em] text-[#9498A3] -mt-2">
              ARRASTE PARA GIRAR • UNIFORME OFICIAL {currentClub.shortName}
            </div>
          </div>
        )}

        {/* Coluna Direita: Cards de Ação do Console */}
        <div className={`${canContinue ? 'lg:col-span-4' : 'lg:col-span-5'} flex flex-col gap-4`}>
          {canContinue && player && contract && currentClub && (
            <button
              id="menu-continue"
              data-autofocus="true"
              data-nav-down="menu-new"
              data-focus-label="ENTRAR NA CARREIRA"
              onClick={() => setScreen('CAREER_HUB')}
              style={{ borderLeftColor: theme.accentPrimary }}
              className="console-tile console-tile-interactive text-left p-6 border-l-4 cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className="font-condensed uppercase text-xs tracking-[0.22em] font-bold"
                  style={{ color: theme.accentPrimary }}
                >
                  01 // CONTINUAR CARREIRA
                </span>
                <GamepadBadge action="CONFIRM" label="JOGAR" />
              </div>

              <div className="flex items-center gap-4">
                <ClubCrest clubId={currentClub.id} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] truncate leading-none">
                    {player.fullName}
                  </div>
                  <div className="text-xs text-[#9498A3] mt-1 uppercase tracking-wider truncate">
                    {currentClub.name} • {formatSquadRole(contract.role)} • TEMP {calendar.season}
                  </div>
                </div>
                <FifaStatBadge value={player.overall} size="lg" />
              </div>
            </button>
          )}

          <button
            id="menu-new"
            data-autofocus={!canContinue ? 'true' : undefined}
            data-nav-up={canContinue ? 'menu-continue' : undefined}
            data-focus-label="CRIAR NOVO ATLETA"
            onClick={handleNewCareer}
            className="console-tile console-tile-interactive text-left p-6 border-l-4 border-l-[#565A65] cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-condensed uppercase text-xs tracking-[0.22em] text-[#9498A3] group-hover:text-[#F5F5F7] font-bold">
                {canContinue ? '02 // NOVO SAVE' : '01 // INICIAR CARREIRA'}
              </span>
              <GamepadBadge action="CONFIRM" label="CRIAR PRO" />
            </div>
            <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
              NOVA CARREIRA DE JOGADOR
            </div>
            <div className="text-xs text-[#9498A3] mt-2 uppercase tracking-wider">
              ESTREIA AOS 18 ANOS • SELETIVA PROFISSIONAL • 19 LIGAS & COPAS
            </div>
          </button>
        </div>
      </main>

      <footer className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3.5 text-[11px] uppercase tracking-widest text-[#9498A3] shrink-0">
        <div className="flex items-center gap-6">
          <GamepadBadge action="CONFIRM" label="CONFIRMAR" />
          <span>D-PAD / ANALÓGICO ESQUERDO PARA NAVEGAR</span>
        </div>
        <span>THREE STARS SOCCER</span>
      </footer>
    </div>
  );
};
