import React from 'react';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { SeasonHistoryRecord } from '../../../domains/season/seasonTypes';
import { ClubCrest } from '../../../shared/ui/ClubCrest';

interface SeasonHistoryViewProps {
  history: SeasonHistoryRecord[];
  onSelectClub: (clubId: string) => void;
}

export const SeasonHistoryView: React.FC<SeasonHistoryViewProps> = ({
  history,
  onSelectClub,
}) => {
  return (
    <div className="lg:col-span-8 console-tile border-t-[3px] border-t-[#C8A45D] p-5 flex flex-col min-h-0">
      <div className="font-condensed uppercase font-extrabold text-lg tracking-wider text-[#C8A45D] pb-3 mb-3 border-b border-[#242730]">
        HISTÓRICO DE TEMPORADAS & CAMPEÕES MUNDIAIS
      </div>

      {history.length === 0 ? (
        <div className="my-auto text-center">
          <div className="font-condensed uppercase font-bold text-2xl text-[#565A65]">
            PRIMEIRA TEMPORADA EM ANDAMENTO
          </div>
          <p className="text-xs uppercase tracking-wider text-[#565A65] mt-1">
            AO CONCLUIR O ANO (40 SEMANAS), OS CAMPEÕES E SUA COLOCAÇÃO FICAM REGISTRADOS AQUI
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
          {history.map((h) => {
            const myClub = getClubById(h.playerClubId);
            const lgChamp = getClubById(h.leagueChampionId);
            const uclChamp = h.championsLeagueWinnerId ? getClubById(h.championsLeagueWinnerId) : null;
            const libChamp = h.libertadoresWinnerId ? getClubById(h.libertadoresWinnerId) : null;

            return (
              <div key={h.season} className="bg-[#0E0F12] border border-[#242730] p-4 grid sm:grid-cols-4 gap-4 items-center text-xs">
                <div>
                  <div className="font-condensed font-extrabold text-2xl text-[#C8A45D]">
                    {h.season}/{String(h.season + 1).slice(-2)}
                  </div>
                  <div
                    onClick={() => onSelectClub(myClub.id)}
                    className="flex items-center gap-2 mt-1 cursor-pointer"
                  >
                    <ClubCrest clubId={myClub.id} size="sm" />
                    <span className="font-condensed uppercase font-bold text-sm text-[#F5F5F7]">
                      {h.leaguePosition}º • {LEAGUES[h.leagueId].name}
                    </span>
                  </div>
                </div>

                <div onClick={() => onSelectClub(lgChamp.id)} className="cursor-pointer">
                  <span className="text-[10px] uppercase text-[#565A65] block">CAMPEÃO DA SUA LIGA</span>
                  <span className="font-condensed uppercase font-bold text-base text-[#F5F5F7]">
                    {lgChamp.name}
                  </span>
                </div>

                <div
                  onClick={() => uclChamp && onSelectClub(uclChamp.id)}
                  className="cursor-pointer"
                >
                  <span className="text-[10px] uppercase text-[#565A65] block">CHAMPIONS LEAGUE</span>
                  <span className="font-condensed uppercase font-bold text-base text-[#3B82F6]">
                    {uclChamp?.name ?? '—'}
                  </span>
                </div>

                <div
                  onClick={() => libChamp && onSelectClub(libChamp.id)}
                  className="cursor-pointer"
                >
                  <span className="text-[10px] uppercase text-[#565A65] block">LIBERTADORES</span>
                  <span className="font-condensed uppercase font-bold text-base text-[#C8A45D]">
                    {libChamp?.name ?? '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
