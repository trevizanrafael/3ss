import React from 'react';
import { ClubData } from '../../../data/clubs/types';
import {
  PenaltyCorner,
  UserPenaltyShootoutSummary,
} from '../../../domains/match-sim/penaltyShootoutEngine';
import { CareerPlayer } from '../../../domains/player/playerTypes';
import { ClubCrest } from '../../../shared/ui/ClubCrest';

interface PenaltyChoiceStageProps {
  player: CareerPlayer;
  myClub: ClubData;
  opponentClub: ClubData;
  isHome: boolean;
  clubGoals: number;
  opponentGoals: number;
  aggregateLabel?: string;
  accentColor: string;
  onSelectCorner: (corner: PenaltyCorner) => void;
}

export const PenaltyChoiceStage: React.FC<PenaltyChoiceStageProps> = ({
  player,
  myClub,
  opponentClub,
  isHome,
  clubGoals,
  opponentGoals,
  aggregateLabel,
  accentColor,
  onSelectCorner,
}) => {
  const homeClub = isHome ? myClub : opponentClub;
  const awayClub = isHome ? opponentClub : myClub;
  const homeGoals = isHome ? clubGoals : opponentGoals;
  const awayGoals = isHome ? opponentGoals : clubGoals;

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-6 flex flex-col justify-center gap-5">
      <div
        className="console-tile border-t-[4px] p-8"
        style={{ borderTopColor: accentColor }}
      >
        <div className="text-center">
          <span
            className="px-3 py-1 font-condensed uppercase font-extrabold text-xs tracking-[0.22em]"
            style={{ backgroundColor: accentColor, color: '#0B0B0D' }}
          >
            DECISÃO POR PÊNALTIS • MATA-MATA EMPATADO
          </span>
          {aggregateLabel && (
            <div className="text-xs uppercase tracking-widest text-[#C8A45D] mt-2 font-bold">
              {aggregateLabel}
            </div>
          )}
        </div>

        <div className="flex items-center justify-around py-5 my-4 border-y border-[#242730]">
          <div className="flex flex-col items-center w-40 text-center">
            <ClubCrest clubId={homeClub.id} size="lg" />
            <span className="font-condensed uppercase font-extrabold text-xl mt-2">
              {homeClub.name}
            </span>
          </div>

          <div className="text-center">
            <div className="text-[10px] uppercase tracking-widest text-[#9498A3] mb-1">
              TEMPO REGULAMENTAR
            </div>
            <div className="font-condensed font-extrabold text-6xl text-[#F5F5F7]">
              {homeGoals} : {awayGoals}
            </div>
          </div>

          <div className="flex flex-col items-center w-40 text-center">
            <ClubCrest clubId={awayClub.id} size="lg" />
            <span className="font-condensed uppercase font-extrabold text-xl mt-2">
              {awayClub.name}
            </span>
          </div>
        </div>

        <div className="bg-[#0E0F12] border border-[#242730] p-5 text-center space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#C8A45D] font-bold">
              VOCÊ ABRE A SÉRIE PELO {myClub.name.toUpperCase()} ({player.shirtName} #{player.shirtNumber})
            </div>
            <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] mt-1">
              ESCOLHA O CANTO DA SUA COBRANÇA
            </div>
            <p className="text-xs text-[#9498A3] mt-0.5">
              Finalização {player.attributes.finishing} • Força do Chute {player.attributes.shotPower}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3.5 pt-1">
            {(
              [
                ['ESQUERDA', '◄ CANTO ESQUERDO', 'Bater cruzado / rasteiro'],
                ['MEIO', '▲ MEIO / FIRME', 'Bater no centro do gol'],
                ['DIREITA', 'CANTO DIREITO ►', 'Bater colocado / ângulo'],
              ] as const
            ).map(([corner, label, sub], idx) => (
              <button
                key={corner}
                type="button"
                data-focusable="true"
                data-autofocus={idx === 0 ? 'true' : undefined}
                onClick={() => onSelectCorner(corner)}
                className="bg-[#151821] hover:bg-[#F5F5F7] hover:text-[#0B0B0D] border-2 border-[#2A2E39] hover:border-[#F5F5F7] p-4 transition-colors cursor-pointer group text-center"
              >
                <div className="font-condensed uppercase font-extrabold text-xl tracking-wider">
                  {label}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#9498A3] group-hover:text-[#242730] mt-1">
                  {sub}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

interface PenaltyScoreboardStripProps {
  shootout: UserPenaltyShootoutSummary;
  myClubShort: string;
  oppClubShort: string;
}

export const PenaltyScoreboardStrip: React.FC<PenaltyScoreboardStripProps> = ({
  shootout,
  myClubShort,
  oppClubShort,
}) => {
  return (
    <div className="mt-4 bg-[#0E0F12] border border-[#242730] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#242730]">
        <span
          className={`font-condensed uppercase font-extrabold text-base tracking-wider ${
            shootout.won ? 'text-[#2DBE60]' : 'text-[#EF4444]'
          }`}
        >
          {shootout.won
            ? `★ CLASSIFICADO NOS PÊNALTIS (${shootout.myPenGoals} : ${shootout.oppPenGoals})`
            : `✕ ELIMINADO NOS PÊNALTIS (${shootout.myPenGoals} : ${shootout.oppPenGoals})`}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-[#9498A3]">
          SUA COBRANÇA ({shootout.chosenCorner}):{' '}
          <strong className={shootout.userConverted ? 'text-[#2DBE60]' : 'text-[#EF4444]'}>
            {shootout.userConverted ? 'GOL CONVERTIDO!' : 'DEFENDIDO / FORA'}
          </strong>
        </span>
      </div>

      <div className="space-y-2 text-xs font-condensed uppercase">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-[#F5F5F7] w-16">{myClubShort}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {shootout.kicks.map((k) => (
              <span
                key={`my_${k.round}`}
                title={k.isUserKick ? 'Sua cobrança' : `${k.round}ª cobrança`}
                className={`w-6 h-6 inline-flex items-center justify-center font-extrabold text-xs border ${
                  k.myScored
                    ? 'bg-[#132A1C] border-[#2DBE60] text-[#2DBE60]'
                    : 'bg-[#2A1414] border-[#EF4444] text-[#EF4444]'
                } ${k.isUserKick ? 'ring-1 ring-[#C8A45D]' : ''}`}
              >
                {k.myScored ? '●' : '✕'}
              </span>
            ))}
          </div>
          <span className="font-extrabold text-lg text-[#F5F5F7] w-8 text-right tabular-nums">
            {shootout.myPenGoals}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-[#9498A3] w-16">{oppClubShort}</span>
          <div className="flex items-center gap-2 flex-wrap">
            {shootout.kicks.map((k) => (
              <span
                key={`opp_${k.round}`}
                className={`w-6 h-6 inline-flex items-center justify-center font-extrabold text-xs border ${
                  k.oppScored === null
                    ? 'bg-[#14161B] border-[#242730] text-[#565A65]'
                    : k.oppScored
                      ? 'bg-[#132A1C] border-[#2DBE60] text-[#2DBE60]'
                      : 'bg-[#2A1414] border-[#EF4444] text-[#EF4444]'
                }`}
              >
                {k.oppScored === null ? '—' : k.oppScored ? '●' : '✕'}
              </span>
            ))}
          </div>
          <span className="font-extrabold text-lg text-[#9498A3] w-8 text-right tabular-nums">
            {shootout.oppPenGoals}
          </span>
        </div>
      </div>
    </div>
  );
};
