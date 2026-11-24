import React from 'react';
import { getClubById } from '../../data/clubs';
import { ClubCrest } from '../../shared/ui/ClubCrest';
import { FifaStatBadge } from '../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../shared/ui/StarRatingBadge';
import { formatSquadRole } from '../../shared/utils/formatters';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';

export const MainMenuScreen: React.FC = () => {
  const { hasActiveSave, player, contract, calendar, resetCareer } = useCareerStore();
  const { setScreen } = useNavigationStore();

  const currentClub = contract ? getClubById(contract.clubId) : null;

  const handleNewCareer = () => {
    if (hasActiveSave) resetCareer();
    setScreen('CREATE_PLAYER');
  };

  return (
    <div className="w-screen h-screen bg-[#0B0B0D] relative flex flex-col justify-between px-10 md:px-20 py-12 overflow-hidden">
      {/* Marca d'água arquitetônica ultra-sutil da grande área */}
      <svg
        viewBox="0 0 800 600"
        className="pointer-events-none absolute right-0 top-0 h-full w-auto opacity-[0.04]"
        fill="none"
        stroke="#F5F5F7"
        strokeWidth="2"
      >
        <rect x="260" y="40" width="520" height="520" />
        <rect x="520" y="150" width="260" height="300" />
        <rect x="680" y="230" width="100" height="140" />
        <path d="M520 220 A90 90 0 0 0 520 380" />
      </svg>

      {/* Topo da Marca */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#242730] pb-5">
        <div className="flex items-center gap-4">
          <StarRatingBadge stars={3} size="md" />
          <span className="text-[11px] uppercase tracking-[0.28em] text-[#9498A3] font-medium">
            THREE STARS SOCCER • EDIÇÃO CARREIRA
          </span>
        </div>
        <span className="text-[11px] uppercase tracking-widest text-[#565A65]">
          BUILD 0.2 • PC
        </span>
      </header>

      {/* Corpo Assimétrico Estilo Console */}
      <main className="relative z-10 grid lg:grid-cols-12 gap-12 items-end my-auto">
        <div className="lg:col-span-7">
          <div className="text-xs uppercase tracking-[0.24em] text-[#C8A45D] font-semibold mb-3">
            MODO CARREIRA DE ATLETA
          </div>
          <h1 className="font-condensed font-extrabold uppercase text-7xl md:text-8xl leading-[0.88] text-[#F5F5F7] tracking-tight">
            THREE STARS
            <br />
            <span className="text-[#C8A45D]">SOCCER</span>
          </h1>
          <div className="w-20 h-[3px] bg-[#C8A45D] mt-6 mb-4" />
          <p className="text-xs uppercase tracking-[0.18em] text-[#9498A3]">
            BASE • EVOLUÇÃO 0–99 • CONTRATOS • CAMPO
          </p>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-4">
          {hasActiveSave && player && contract && currentClub && (
            <button
              onClick={() => setScreen('CAREER_HUB')}
              className="console-tile console-tile-interactive text-left p-6 border-l-4 border-l-[#C8A45D] cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-condensed uppercase text-xs tracking-[0.22em] text-[#C8A45D] font-bold">
                  01 // CONTINUAR CARREIRA
                </span>
                <span className="font-condensed uppercase text-xs tracking-widest text-[#9498A3] group-hover:text-[#F5F5F7]">
                  ENTRAR ›
                </span>
              </div>

              <div className="flex items-center gap-4">
                <ClubCrest
                  clubId={currentClub.id}
                  shortName={currentClub.shortName}
                  primaryColor={currentClub.primaryColor}
                  secondaryColor={currentClub.secondaryColor}
                  pattern={currentClub.pattern}
                  size="lg"
                />
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
            onClick={handleNewCareer}
            className="console-tile console-tile-interactive text-left p-6 border-l-4 border-l-[#565A65] hover:border-l-[#C8A45D] cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-condensed uppercase text-xs tracking-[0.22em] text-[#9498A3] group-hover:text-[#C8A45D] font-bold">
                {hasActiveSave ? '02 // NOVO JOGO' : '01 // INICIAR'}
              </span>
              <span className="font-condensed uppercase text-xs tracking-widest text-[#9498A3] group-hover:text-[#F5F5F7]">
                CRIAR PRO ›
              </span>
            </div>
            <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
              NOVA CARREIRA DE JOGADOR
            </div>
            <div className="text-xs text-[#9498A3] mt-2 uppercase tracking-wider">
              16 A 18 ANOS • PENEIRA NACIONAL • CATEGORIAS DE BASE
            </div>
          </button>
        </div>
      </main>

      {/* Barra Inferior de Console */}
      <footer className="relative z-10 flex items-center justify-between border-t border-[#242730] pt-4 text-[11px] uppercase tracking-widest text-[#565A65]">
        <span>NAVEGAÇÃO POR MOUSE, TECLADO [Q / E] E CONTROLE</span>
        <span>THREE STARS SOCCER</span>
      </footer>
    </div>
  );
};
