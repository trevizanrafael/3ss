import React, { useEffect, useState } from 'react';
import { ClubData, FullSquadPlayer } from '../../../data/clubs/types';
import { loadClubFullSquad } from '../../../data/world/squadLoader';
import { CareerPlayer } from '../../../domains/player/playerTypes';
import { FifaStatBadge, getFifaStatColor } from '../../../shared/ui/FifaStatBadge';
import { SquadRole } from '../../../shared/types/common';
import { buildTeamMatchLineup } from './buildMatchLineup';

interface TacticalLineupPitchProps {
  myClub: ClubData;
  opponentClub: ClubData;
  userPlayer: CareerPlayer;
  userRole: SquadRole;
  accentColor: string;
}

export const TacticalLineupPitch: React.FC<TacticalLineupPitchProps> = ({
  myClub,
  opponentClub,
  userPlayer,
  userRole,
  accentColor,
}) => {
  const [viewingSide, setViewingSide] = useState<'MINE' | 'OPP'>('MINE');
  const [mySquad, setMySquad] = useState<FullSquadPlayer[]>([]);
  const [oppSquad, setOppSquad] = useState<FullSquadPlayer[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadClubFullSquad(myClub.id), loadClubFullSquad(opponentClub.id)]).then(
      ([ms, os]) => {
        if (mounted) {
          setMySquad(ms);
          setOppSquad(os);
        }
      },
    );
    return () => {
      mounted = false;
    };
  }, [myClub.id, opponentClub.id]);

  const isMine = viewingSide === 'MINE';
  const activeClub = isMine ? myClub : opponentClub;
  const { starters, bench } = buildTeamMatchLineup(
    isMine ? mySquad : oppSquad,
    userPlayer,
    userRole,
    isMine,
  );

  return (
    <div className="console-tile p-4 flex flex-col justify-between h-full min-h-0">
      {/* Alternador Meu Time vs Adversário */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#242730] shrink-0">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#9498A3] block">
            ESCALAÇÃO TÁTICA (4-3-3)
          </span>
          <span className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7]">
            {activeClub.name}
          </span>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewingSide('MINE')}
            className={`px-3 py-1 font-condensed uppercase font-bold text-xs tracking-wider cursor-pointer ${
              isMine ? 'bg-[#F5F5F7] text-[#0B0B0D]' : 'bg-[#0E0F12] text-[#9498A3]'
            }`}
          >
            {myClub.shortName} (VOCÊ)
          </button>
          <button
            type="button"
            onClick={() => setViewingSide('OPP')}
            className={`px-3 py-1 font-condensed uppercase font-bold text-xs tracking-wider cursor-pointer ${
              !isMine ? 'bg-[#F5F5F7] text-[#0B0B0D]' : 'bg-[#0E0F12] text-[#9498A3]'
            }`}
          >
            {opponentClub.shortName}
          </button>
        </div>
      </div>

      {/* Campinho Tático com os 11 Titulares */}
      <div className="relative flex-1 my-2.5 bg-[#0D1311] border border-[#23312B] overflow-hidden min-h-[235px]">
        {/* Marcações Vetoriais do Gramado */}
        <svg
          viewBox="0 0 200 260"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
          fill="none"
          stroke="#9498A3"
          strokeWidth="1.2"
        >
          <rect x="8" y="8" width="184" height="244" />
          <line x1="8" y1="130" x2="192" y2="130" />
          <circle cx="100" cy="130" r="26" />
          <rect x="48" y="8" width="104" height="36" />
          <rect x="48" y="216" width="104" height="36" />
        </svg>

        {starters.map((p) => (
          <div
            key={`${p.slotLabel}_${p.xPct}_${p.yPct}`}
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center"
          >
            <div
              style={{
                backgroundColor: p.isUserPro ? '#C8A45D' : '#121316',
                borderColor: p.isUserPro ? '#F5F5F7' : accentColor,
                color: p.isUserPro ? '#0B0B0D' : '#F5F5F7',
              }}
              className="w-7 h-7 border-2 flex items-center justify-center font-condensed font-extrabold text-xs shadow-md"
            >
              {p.jersey}
            </div>
            <div
              className={`px-1.5 py-0.2 mt-0.5 font-condensed uppercase font-bold text-[11px] leading-tight whitespace-nowrap ${
                p.isUserPro
                  ? 'bg-[#C8A45D] text-[#0B0B0D]'
                  : 'bg-[#0B0B0D]/90 text-[#F5F5F7]'
              }`}
            >
              {p.displayName.slice(0, 11)}
              <span
                className="ml-1 font-extrabold"
                style={{ color: p.isUserPro ? '#0B0B0D' : getFifaStatColor(p.ovr) }}
              >
                {p.ovr}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Banco de Reservas Relacionado */}
      <div className="border-t border-[#242730] pt-2 shrink-0">
        <div className="text-[10px] uppercase tracking-widest text-[#9498A3] mb-1.5">
          BANCO DE RESERVAS RELACIONADO
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
          {bench.slice(0, 6).map((b) => (
            <div
              key={b.id}
              className={`px-2 py-1 border flex items-center justify-between text-[11px] ${
                b.isUserPro
                  ? 'bg-[#2A2212] border-[#C8A45D] text-[#F5F5F7]'
                  : 'bg-[#0E0F12] border-[#242730] text-[#9498A3]'
              }`}
            >
              <span className="font-condensed uppercase font-bold truncate pr-1">
                {b.isUserPro ? `★ ${b.displayName} (VOCÊ)` : `${b.pos} ${b.displayName}`}
              </span>
              <FifaStatBadge value={b.ovr} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
