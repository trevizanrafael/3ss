import React from 'react';
import { getClubById } from '../../../data/clubs';
import { getCompetitionTheme, getQualifierCompId } from '../../../data/world/competitionThemes';
import { QualifierGroupData } from '../../../domains/international/internationalTypes';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';

interface InternationalQualifiersViewProps {
  group: QualifierGroupData;
  userNatTeamId: string;
  selectedTeamId: string;
  onSelectTeam: (id: string) => void;
}

export const InternationalQualifiersView: React.FC<InternationalQualifiersViewProps> = ({
  group,
  userNatTeamId,
  selectedTeamId,
  onSelectTeam,
}) => {
  const qualCompId = getQualifierCompId(group.confederation);
  const theme = getCompetitionTheme(qualCompId);
  const nationsSpots = group.nationsLeagueSpots ?? 0;

  return (
    <div
      className="lg:col-span-8 console-tile border-t-[3px] p-5 flex flex-col min-h-0"
      style={{ borderTopColor: theme.accentPrimary }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-[#242730] shrink-0">
        <CompetitionBadge
          competitionId={qualCompId}
          size="md"
          stageSubtitle={group.label}
        />
        <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest">
          {nationsSpots > 0 && (
            <span className="text-[#C8A45D]">
              ★ G-{nationsSpots} COPA + LIGA DAS NAÇÕES (UEFA+CONMEBOL)
            </span>
          )}
          <span className="text-[#2DBE60]">● G-{group.directSpots} VAGA COPA DO MUNDO</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#121316] border-b border-[#242730] text-[#565A65] font-condensed uppercase text-sm">
            <tr>
              <th className="py-2 w-8">#</th>
              <th className="py-2">SELEÇÃO NACIONAL</th>
              <th className="py-2 text-center">OVR</th>
              <th className="py-2 text-center">J</th>
              <th className="py-2 text-center">V</th>
              <th className="py-2 text-center">E</th>
              <th className="py-2 text-center">D</th>
              <th className="py-2 text-center">GP:GC</th>
              <th className="py-2 text-center">SG</th>
              <th className="py-2 text-right text-[#F5F5F7]">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C1F26]">
            {group.standings.map((row, idx) => {
              const team = getClubById(row.clubId);
              const selected = team.id === selectedTeamId;
              const isMine = team.id === userNatTeamId;
              const isNationsZone = nationsSpots > 0 && idx < nationsSpots;
              const isWcZone = idx < group.directSpots;

              return (
                <tr
                  key={row.clubId}
                  tabIndex={0}
                  data-focusable="true"
                  onFocus={() => onSelectTeam(team.id)}
                  onClick={() => onSelectTeam(team.id)}
                  className={`cursor-pointer transition-colors outline-none ${
                    selected
                      ? 'bg-[#F5F5F7] text-[#0B0B0D]'
                      : isMine
                        ? 'bg-[#1C1A14] text-[#C8A45D]'
                        : 'hover:bg-[#191B20] text-[#F5F5F7]'
                  }`}
                >
                  <td className="py-2 pl-2 font-condensed font-bold text-base">
                    <span
                      className={
                        selected
                          ? 'text-[#0B0B0D]'
                          : isNationsZone
                            ? 'text-[#C8A45D]'
                            : isWcZone
                              ? 'text-[#2DBE60]'
                              : 'text-[#9498A3]'
                      }
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2.5">
                      <ClubCrest clubId={team.id} size="sm" />
                      <span className="font-condensed uppercase font-bold text-base tracking-wide">
                        {team.name}
                      </span>
                      {isMine && !selected && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed font-extrabold">
                          SEU PAÍS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 text-center opacity-75">{team.squadAvgOvr}</td>
                  <td className="py-2 text-center">{row.played}</td>
                  <td className="py-2 text-center">{row.won}</td>
                  <td className="py-2 text-center">{row.drawn}</td>
                  <td className="py-2 text-center">{row.lost}</td>
                  <td className="py-2 text-center opacity-75">
                    {row.goalsFor}:{row.goalsAgainst}
                  </td>
                  <td className="py-2 text-center">{row.goalsFor - row.goalsAgainst}</td>
                  <td className="py-2 pr-2 text-right font-condensed font-extrabold text-lg">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
