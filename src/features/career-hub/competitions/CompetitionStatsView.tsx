import React, { useEffect, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { AnyCompetitionId, getCompetitionTheme } from '../../../data/world/competitionThemes';
import {
  buildCompetitionLeaderboards,
  CompetitionLeaderboards,
  CompetitionPlayerStatRow,
} from '../../../domains/career-stats/competitionStatsEngine';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { FifaStatBadge } from '../../../shared/ui/FifaStatBadge';
import { useCareerStore } from '../../../state/useCareerStore';

type StatTabId = 'GOALS' | 'ASSISTS' | 'PARTICIPATIONS' | 'CLEAN_SHEETS' | 'CARDS';

interface CompetitionStatsViewProps {
  compId: AnyCompetitionId;
  qualifierGroupId?: string;
  stageSubtitle?: string;
  selectedClubId: string;
  onSelectClub: (clubId: string) => void;
}

const STAT_TABS: { id: StatTabId; label: string }[] = [
  { id: 'GOALS', label: 'ARTILHARIA' },
  { id: 'ASSISTS', label: 'ASSISTÊNCIAS' },
  { id: 'PARTICIPATIONS', label: 'GOLS + ASSIST' },
  { id: 'CLEAN_SHEETS', label: 'GOLEIROS (SG)' },
  { id: 'CARDS', label: 'CARTÕES' },
];

export const CompetitionStatsView: React.FC<CompetitionStatsViewProps> = ({
  compId,
  qualifierGroupId,
  stageSubtitle,
  selectedClubId,
  onSelectClub,
}) => {
  const { player, contract, worldSeason, userCompStats } = useCareerStore();
  const [statTab, setStatTab] = useState<StatTabId>('GOALS');
  const [boards, setBoards] = useState<CompetitionLeaderboards | null>(null);
  const theme = getCompetitionTheme(compId);

  useEffect(() => {
    let active = true;
    buildCompetitionLeaderboards(
      compId,
      worldSeason,
      player,
      contract?.clubId ?? null,
      userCompStats,
      qualifierGroupId,
    ).then((res) => {
      if (active) setBoards(res);
    });
    return () => {
      active = false;
    };
  }, [compId, qualifierGroupId, worldSeason, player, contract?.clubId, userCompStats]);

  const activeRows: CompetitionPlayerStatRow[] = !boards
    ? []
    : statTab === 'GOALS'
      ? boards.topScorers
      : statTab === 'ASSISTS'
        ? boards.topAssisters
        : statTab === 'PARTICIPATIONS'
          ? boards.topParticipations
          : boards.topCleanSheets;

  const avgGoalsPerGame =
    boards && boards.totalMatchesPlayed > 0
      ? (boards.totalGoalsScored / boards.totalMatchesPlayed).toFixed(2)
      : '0.00';

  const mainHeader =
    statTab === 'GOALS'
      ? 'GOLS'
      : statTab === 'ASSISTS'
        ? 'ASSIST'
        : statTab === 'PARTICIPATIONS'
          ? 'G+A'
          : 'SG';

  const secHeader =
    statTab === 'GOALS'
      ? 'ASSIST'
      : statTab === 'ASSISTS'
        ? 'GOLS'
        : statTab === 'PARTICIPATIONS'
          ? 'G / A'
          : 'MÉDIA';

  return (
    <div
      className="lg:col-span-8 console-tile border-t-[3px] p-5 flex flex-col min-h-0"
      style={{ borderTopColor: theme.accentPrimary }}
    >
      {/* Cabeçalho com Emblema da Competição + Sub-abas de Estatísticas */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-[#242730] shrink-0">
        <CompetitionBadge
          competitionId={compId}
          size="md"
          stageSubtitle={
            stageSubtitle ??
            (boards
              ? `${boards.totalMatchesPlayed} JOGOS • ${boards.totalGoalsScored} GOLS (${avgGoalsPerGame}/J)`
              : 'CENTRAL DE ESTATÍSTICAS')
          }
        />

        <div className="flex flex-wrap gap-1">
          {STAT_TABS.map((t) => {
            const active = statTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-focusable="true"
                onClick={() => setStatTab(t.id)}
                style={
                  active
                    ? { backgroundColor: theme.accentPrimary, color: theme.textOnAccent }
                    : undefined
                }
                className={`px-3 py-1.5 font-condensed uppercase font-extrabold text-xs tracking-wider cursor-pointer transition-colors ${
                  active ? '' : 'bg-[#0E0F12] text-[#9498A3] hover:text-[#F5F5F7]'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {statTab === 'CARDS' ? (
        <div className="flex-1 flex flex-col justify-between min-h-0">
          <div className="border border-[#242730] bg-[#0E0F12]">
            <div className="grid grid-cols-12 px-4 py-2 border-b border-[#242730] font-condensed uppercase text-xs text-[#565A65]">
              <span className="col-span-1">#</span>
              <span className="col-span-5">ATLETA</span>
              <span className="col-span-3">EQUIPE</span>
              <span className="col-span-1 text-center">J</span>
              <span className="col-span-1 text-center text-[#EAB308]">CA</span>
              <span className="col-span-1 text-right text-[#C94040]">CV</span>
            </div>
          </div>

          <div className="my-auto text-center max-w-md mx-auto py-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="inline-block w-3.5 h-5 bg-[#EAB308]" />
              <span className="inline-block w-3.5 h-5 bg-[#C94040]" />
            </div>
            <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7]">
              CONTROLE DISCIPLINAR PREPARADO PARA O MÓDULO 3D
            </div>
            <p className="text-xs text-[#9498A3] mt-2 leading-relaxed">
              A estrutura de cartões amarelos, expulsões e suspensão automática já está integrada a
              esta aba e passará a contabilizar faltas reais assim que a arbitragem em campo 3D for
              ativada.
            </p>
          </div>

          <div className="text-[10px] uppercase tracking-widest text-[#565A65] border-t border-[#242730] pt-2.5 flex justify-between">
            <span>REGRA PADRÃO: 3 CARTÕES AMARELOS = 1 JOGO DE SUSPENSÃO</span>
            <span>STATUS: AGUARDANDO GAMEPLAY 3D</span>
          </div>
        </div>
      ) : (
        <div data-rs-scroll="true" className="flex-1 overflow-y-auto pr-1 min-h-0">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#121316] border-b border-[#242730] text-[#565A65] font-condensed uppercase text-sm">
              <tr>
                <th className="py-2 w-8">#</th>
                <th className="py-2">JOGADOR</th>
                <th className="py-2">EQUIPE</th>
                <th className="py-2 text-center">POS</th>
                <th className="py-2 text-center">OVR</th>
                <th className="py-2 text-center">J</th>
                <th className="py-2 text-center">{secHeader}</th>
                <th
                  className="py-2 pr-2 text-right"
                  style={{ color: theme.accentPrimary }}
                >
                  {mainHeader}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1F26]">
              {activeRows.map((row, idx) => {
                const club = getClubById(row.clubId);
                const selected = club.id === selectedClubId;
                const mainVal =
                  statTab === 'GOALS'
                    ? row.goals
                    : statTab === 'ASSISTS'
                      ? row.assists
                      : statTab === 'PARTICIPATIONS'
                        ? row.goalContributions
                        : row.cleanSheets;

                const secVal =
                  statTab === 'GOALS'
                    ? row.assists
                    : statTab === 'ASSISTS'
                      ? row.goals
                      : statTab === 'PARTICIPATIONS'
                        ? `${row.goals}G/${row.assists}A`
                        : row.matches > 0
                          ? `${Math.round((row.cleanSheets / row.matches) * 100)}%`
                          : '0%';

                return (
                  <tr
                    key={`${row.playerId}_${idx}`}
                    tabIndex={0}
                    data-focusable="true"
                    onFocus={() => onSelectClub(club.id)}
                    onClick={() => onSelectClub(club.id)}
                    className={`cursor-pointer transition-colors outline-none ${
                      row.isUser
                        ? 'bg-[#211D12] text-[#C8A45D]'
                        : selected
                          ? 'bg-[#1D2028] text-[#F5F5F7]'
                          : 'hover:bg-[#16181D] text-[#F5F5F7]'
                    }`}
                  >
                    <td className="py-2 pl-2 font-condensed font-extrabold text-base">
                      <span
                        className={
                          idx === 0
                            ? 'text-[#C8A45D]'
                            : idx === 1
                              ? 'text-[#9498A3]'
                              : idx === 2
                                ? 'text-[#8C5E3C]'
                                : 'text-[#565A65]'
                        }
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2.5">
                        {row.faceUrl ? (
                          <img
                            src={row.faceUrl}
                            alt={row.playerName}
                            className="w-7 h-7 object-cover bg-[#0E0F12] shrink-0"
                            loading="lazy"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="w-7 h-7 bg-[#0E0F12] border border-[#242730] flex items-center justify-center font-condensed font-bold text-[10px] text-[#9498A3] shrink-0">
                            {row.pos}
                          </span>
                        )}
                        <span className="font-condensed uppercase font-bold text-base truncate">
                          {row.playerName}
                        </span>
                        {row.isUser && (
                          <span className="px-1.5 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed font-extrabold text-[9px]">
                            SEU PRO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <ClubCrest clubId={club.id} size="sm" />
                        <span className="font-condensed uppercase font-semibold text-sm text-[#9498A3] truncate">
                          {club.shortName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-center font-condensed font-bold text-xs text-[#9498A3]">
                      {row.pos}
                    </td>
                    <td className="py-2 text-center">
                      <FifaStatBadge value={row.ovr} size="sm" />
                    </td>
                    <td className="py-2 text-center tabular-nums text-[#9498A3]">
                      {row.matches}
                    </td>
                    <td className="py-2 text-center tabular-nums text-[#9498A3]">
                      {secVal}
                    </td>
                    <td
                      className="py-2 pr-2 text-right font-condensed font-extrabold text-xl tabular-nums"
                      style={{ color: row.isUser ? '#C8A45D' : theme.accentPrimary }}
                    >
                      {mainVal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
