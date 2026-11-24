import React from 'react';
import { ActiveContract } from '../../../domains/contracts/contractEngine';
import { CareerPlayer } from '../../../domains/player/playerTypes';
import { YouthAcademyState } from '../../../domains/youth-academy/youthModel';
import { getFifaStatColor } from '../../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { formatSquadRole } from '../../../shared/utils/formatters';

interface ProSummarySideCardProps {
  player: CareerPlayer;
  contract: ActiveContract;
  youthState: YouthAcademyState | null;
  onOpenMyPro: () => void;
}

export const ProSummarySideCard: React.FC<ProSummarySideCardProps> = ({
  player,
  contract,
  youthState,
  onOpenMyPro,
}) => {
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
          <span>
            HABILIDADES & TROFÉUS ({player.careerTotals.trophies}) ›
          </span>
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
            <div className="text-[11px] uppercase tracking-widest text-[#9498A3] mt-2">
              {player.age} ANOS • #{player.shirtNumber}
            </div>
          </div>
        </div>

        {/* Escalação e Fôlego posicionados fora da barra de avanço */}
        <div className="py-4 border-b border-[#242730] space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider">
            <span className="text-[#9498A3]">ESCALAÇÃO</span>
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

        {/* Progresso na Base OU Meta Contratual */}
        {contract.stage === 'YOUTH' && youthState ? (
          <div className="py-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs uppercase tracking-wider mb-1">
                <span className="text-[#9498A3]">CONFIANÇA SUB-20</span>
                <span className="font-condensed font-bold text-base text-[#F5F5F7]">
                  {youthState.coachTrust}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#0E0F12]">
                <div className="h-full bg-[#F5F5F7]" style={{ width: `${youthState.coachTrust}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs uppercase tracking-wider mb-1">
                <span className="text-[#9498A3]">OLHEIRO DO PROFISSIONAL</span>
                <span className="font-condensed font-bold text-base text-[#C8A45D]">
                  {youthState.seniorScoutProgress}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#0E0F12]">
                <div className="h-full bg-[#C8A45D]" style={{ width: `${youthState.seniorScoutProgress}%` }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <div className="flex justify-between text-xs uppercase tracking-wider mb-1.5">
              <span className="text-[#9498A3]">META DE CONTRATO</span>
              <span className="font-condensed font-bold text-base text-[#C8A45D]">
                {contract.seasonGoal.current} / {contract.seasonGoal.target}
              </span>
            </div>
            <div className="text-xs text-[#F5F5F7] mb-2 uppercase">{contract.seasonGoal.label}</div>
            <div className="w-full h-1.5 bg-[#0E0F12]">
              <div
                className="h-full bg-[#C8A45D]"
                style={{
                  width: `${Math.min(100, (contract.seasonGoal.current / contract.seasonGoal.target) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 border-t border-[#242730] pt-4 text-center">
        {[
          ['JOGOS', player.careerTotals.matches],
          ['GOLS', player.careerTotals.goals],
          ['ASSIST', player.careerTotals.assists],
          ['3★', player.careerTotals.threeStarMatches],
        ].map(([lbl, val]) => (
          <div key={lbl}>
            <div className="font-condensed font-extrabold text-3xl text-[#F5F5F7]">{val}</div>
            <div className="text-[10px] uppercase tracking-widest text-[#565A65]">{lbl}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
