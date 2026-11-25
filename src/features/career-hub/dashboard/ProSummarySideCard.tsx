import React from 'react';
import { getClubById } from '../../../data/clubs';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import { PlayerPeriodStats } from '../../../domains/awards/awardTypes';
import { UserCompetitionStatsMap } from '../../../domains/career-stats/careerHistoryTypes';
import { ActiveContract } from '../../../domains/contracts/contractEngine';
import { computePlayerMarketValue } from '../../../domains/contracts/transferWindowAndValue';
import { formatBirthDatePt } from '../../../domains/player/createInitialPlayer';
import { CareerPlayer } from '../../../domains/player/playerTypes';
import { findClubLeagueIdInWorld } from '../../../domains/season/worldSeasonEngine';
import { YouthAcademyState } from '../../../domains/youth-academy/youthModel';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { ClubPlayer3DViewport } from '../../../shared/ui/ClubPlayer3DViewport';
import { getFifaStatColor } from '../../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { formatCompactMoney, formatSquadRole } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

interface ProSummarySideCardProps {
  player: CareerPlayer;
  contract: ActiveContract;
  seasonYear: number;
  periodStats: PlayerPeriodStats;
  userCompStats: UserCompetitionStatsMap;
  youthState?: YouthAcademyState | null;
  onOpenMyPro: () => void;
}

export const ProSummarySideCard: React.FC<ProSummarySideCardProps> = ({
  player,
  contract,
  seasonYear,
  periodStats,
  userCompStats,
  onOpenMyPro,
}) => {
  const { galaModalOpen, calendar, worldSeason, awardPrestigeBoost } = useCareerStore();
  const { matchModalOpen } = useNavigationStore();
  const club = getClubById(contract.clubId);
  const activeLg = findClubLeagueIdInWorld(worldSeason, contract.clubId);
  const leagueTheme = getCompetitionTheme(activeLg);
  const marketValue = computePlayerMarketValue(
    player,
    activeLg,
    contract.seasonGoal,
    calendar.week,
    awardPrestigeBoost,
  );

  const birthStr = formatBirthDatePt(
    player.birthDay ?? 15,
    player.birthMonth ?? 5,
    player.birthYear ?? 2008,
  );
  const seasonThreeStars =
    periodStats.seasonThreeStarMatches ??
    Object.values(userCompStats).reduce((acc, s) => acc + (s.threeStarMatches ?? 0), 0);

  const modalActive = matchModalOpen || galaModalOpen;

  return (
    <section
      id="central-pro"
      tabIndex={0}
      data-focusable="true"
      data-nav-left="central-calendar"
      data-nav-down="central-next-comp"
      data-focus-label="ABRIR MEU PRO (HABILIDADES, TROFÉUS & CARREIRA)"
      onClick={onOpenMyPro}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenMyPro();
        }
      }}
      style={{ borderTopColor: leagueTheme.accentPrimary }}
      className="lg:col-span-4 lg:row-span-6 console-tile console-tile-interactive border-t-[3px] p-5 flex flex-col justify-between cursor-pointer outline-none overflow-hidden relative"
    >
      {/* Brilho sutil da cor primária do seu clube atrás do boneco 3D */}
      <div
        className="pointer-events-none absolute -right-8 top-8 w-56 h-56 opacity-25 rounded-none"
        style={{
          background: `radial-gradient(circle, ${club.primaryColor}AA 0%, transparent 70%)`,
        }}
      />

      {/* Marca d'água gigante do número da camisa estilo vestiário FIFA */}
      <span className="pointer-events-none select-none absolute right-4 top-10 font-condensed font-extrabold text-[96px] leading-none text-white/[0.045]">
        #{player.shirtNumber}
      </span>

      <div className="relative z-10">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#9498A3] pb-3 border-b border-white/10">
          <span className="font-bold text-[#F5F5F7]">MEU PRO</span>
          <span style={{ color: leagueTheme.accentPrimary }} className="font-condensed font-bold text-xs tracking-wider">
            HABILIDADES, TROFÉUS & CARREIRA ›
          </span>
        </div>

        {/* Zona Hero: Overall + Dados à Esquerda | Boneco 3D com a Camisa do Clube à Direita! */}
        <div className="grid grid-cols-12 items-center gap-2 py-3 border-b border-white/10">
          <div className="col-span-7 space-y-2">
            <div className="flex items-baseline gap-2.5">
              <div
                className="font-condensed font-extrabold text-6xl leading-none"
                style={{ color: getFifaStatColor(player.overall) }}
              >
                {player.overall}
              </div>
              <div>
                <div className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] leading-none">
                  {player.position} • #{player.shirtNumber}
                </div>
                <div className="mt-1">
                  <StarRatingBadge stars={player.reputationStars} size="sm" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <ClubCrest clubId={club.id} size="sm" />
              <div className="min-w-0">
                <div className="font-condensed uppercase font-bold text-sm text-[#F5F5F7] truncate leading-none">
                  {club.name}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#9498A3] mt-0.5 tabular-nums">
                  {player.age} ANOS • {birthStr}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-5 h-40 relative">
            {!modalActive && (
              <ClubPlayer3DViewport
                player={player}
                club={club}
                accentColor={leagueTheme.accentPrimary}
                framing="BUST"
                allowDragSpin={false}
                className="w-full h-full"
              />
            )}
          </div>
        </div>

        <div className="py-3 border-b border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider">
            <span className="text-[#9498A3]">VALOR DE MERCADO</span>
            <span className="font-condensed font-extrabold text-base text-[#2DBE60]">
              {formatCompactMoney(marketValue)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs uppercase tracking-wider">
            <span className="text-[#9498A3]">STATUS NO ELENCO</span>
            <span className="font-condensed font-bold text-base text-[#F5F5F7]">
              {formatSquadRole(contract.role)}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs uppercase tracking-wider mb-1">
              <span className="text-[#9498A3]">FÔLEGO FÍSICO</span>
              <span
                className="font-condensed font-bold text-base"
                style={{ color: getFifaStatColor(player.stamina) }}
              >
                {player.stamina}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#0A0B0E]">
              <div
                className="h-full transition-all"
                style={{
                  width: `${player.stamina}%`,
                  backgroundColor: getFifaStatColor(player.stamina),
                }}
              />
            </div>
          </div>
        </div>

        <div className="py-3">
          <div className="flex justify-between text-xs uppercase tracking-wider mb-1">
            <span className="text-[#9498A3]">META DE CONTRATO</span>
            <span
              className="font-condensed font-bold text-base"
              style={{ color: leagueTheme.accentPrimary }}
            >
              {contract.seasonGoal.current} / {contract.seasonGoal.target}
            </span>
          </div>
          <div className="text-[11px] text-[#F5F5F7] mb-1.5 uppercase truncate">
            {contract.seasonGoal.label}
          </div>
          <div className="w-full h-1.5 bg-[#0A0B0E]">
            <div
              className="h-full transition-all"
              style={{
                backgroundColor: leagueTheme.accentPrimary,
                width: `${Math.min(100, (contract.seasonGoal.current / Math.max(1, contract.seasonGoal.target)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/10 pt-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#9498A3] mb-2">
          <span>
            TEMPORADA {seasonYear}/{String(seasonYear + 1).slice(-2)}
          </span>
          <span style={{ color: leagueTheme.accentPrimary }} className="font-bold">
            CARREIRA COMPLETA ›
          </span>
        </div>
        <div className="grid grid-cols-4 text-center">
          {[
            ['JOGOS', periodStats.seasonMatches],
            ['GOLS', periodStats.seasonGoals],
            ['ASSIST', periodStats.seasonAssists],
            ['3★', seasonThreeStars],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div className="font-condensed font-extrabold text-3xl text-[#F5F5F7] tabular-nums leading-none">
                {val}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3] mt-1">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
