import React from 'react';
import { PlayerPeriodStats } from '../../../domains/awards/awardTypes';
import { UserCompetitionStatsMap } from '../../../domains/career-stats/careerHistoryTypes';
import { ActiveContract } from '../../../domains/contracts/contractEngine';
import { formatBirthDatePt } from '../../../domains/player/createInitialPlayer';
import { CareerPlayer } from '../../../domains/player/playerTypes';
import { YouthAcademyState } from '../../../domains/youth-academy/youthModel';
import { getFifaStatColor } from '../../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { formatSquadRole } from '../../../shared/utils/formatters';

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
  const birthStr = formatBirthDatePt(
    player.birthDay ?? 15,
    player.birthMonth ?? 5,
    player.birthYear ?? 2008,
  );
  const seasonThreeStars =
    periodStats.seasonThreeStarMatches ??
    Object.values(userCompStats).reduce((acc, s) => acc + (s.threeStarMatches ?? 0), 0);

  return (
    <section
      tabIndex={0}
      data-focusable="true"
      onClick={onOpenMyPro}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenMyPro();
        }
      }}
      className="lg:col-span-4 lg:row-span-6 console-tile console-tile-interactive p-6 flex flex-col justify-between cursor-pointer outline-none"
    >
      <div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#9498A3] pb-4 border-b border-[#242730]">
          <span>MEU PRO</span>
          <span>HABILIDADES, TROFÉUS & CARREIRA ›</span>
        </div>

        <div className="flex items-end justify-between py-5 border-b border-[#242730]">
          <div>
            <div
              className="font-condensed font-extrabold text-7xl leading-none"
              style={{ color: getFifaStatColor(player.overall) }}
            >
              {player.overall}
            </div>
            <div className="font-condensed uppercase font-bold text-lg text-[#9498A3] tracking-widest mt-1">
              OVERALL • {player.position}
            </div>
          </div>
          <div className="text-right">
            <StarRatingBadge stars={player.reputationStars} size="md" />
            <div className="text-[11px] uppercase tracking-widest text-[#F5F5F7] mt-2">
              {player.age} ANOS • #{player.shirtNumber}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-[#9498A3] mt-0.5 tabular-nums">
              NASC: {birthStr}
            </div>
          </div>
        </div>

        <div className="py-4 border-b border-[#242730] space-y-3">
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
            <div className="w-full h-1.5 bg-[#0E0F12]">
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

        <div className="py-4">
          <div className="flex justify-between text-xs uppercase tracking-wider mb-1.5">
            <span className="text-[#9498A3]">META DE CONTRATO PROFISSIONAL</span>
            <span className="font-condensed font-bold text-base text-[#C8A45D]">
              {contract.seasonGoal.current} / {contract.seasonGoal.target}
            </span>
          </div>
          <div className="text-xs text-[#F5F5F7] mb-2 uppercase">{contract.seasonGoal.label}</div>
          <div className="w-full h-1.5 bg-[#0E0F12]">
            <div
              className="h-full bg-[#C8A45D]"
              style={{
                width: `${Math.min(100, (contract.seasonGoal.current / Math.max(1, contract.seasonGoal.target)) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[#242730] pt-3.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#9498A3] mb-2.5">
          <span>
            TEMPORADA {seasonYear}/{String(seasonYear + 1).slice(-2)}
          </span>
          <span className="text-[#C8A45D]">TOTAIS EM MEU PRO ›</span>
        </div>
        <div className="grid grid-cols-4 text-center">
          {[
            ['JOGOS', periodStats.seasonMatches],
            ['GOLS', periodStats.seasonGoals],
            ['ASSIST', periodStats.seasonAssists],
            ['3★', seasonThreeStars],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div className="font-condensed font-extrabold text-3xl text-[#F5F5F7] tabular-nums">
                {val}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-[#565A65]">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
