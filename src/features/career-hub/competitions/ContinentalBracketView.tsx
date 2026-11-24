import React, { useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import { ContinentalCupData, KnockoutTie } from '../../../domains/season/seasonTypes';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';

interface ContinentalBracketViewProps {
  cup: ContinentalCupData;
  playerClubId?: string;
  selectedClubId: string;
  onSelectClub: (clubId: string) => void;
}

export const ContinentalBracketView: React.FC<ContinentalBracketViewProps> = ({
  cup,
  playerClubId,
  selectedClubId,
  onSelectClub,
}) => {
  const [subView, setSubView] = useState<'GROUPS' | 'KNOCKOUT'>('GROUPS');
  const theme = getCompetitionTheme(cup.cupId);

  const renderTie = (tie: KnockoutTie) => {
    const home = getClubById(tie.homeClubId);
    const away = getClubById(tie.awayClubId);
    const leg1Done = tie.leg1Home !== null;
    const leg2Done = tie.leg2Home !== null;
    const aggH = (tie.leg1Home ?? 0) + (tie.leg2Away ?? 0);
    const aggA = (tie.leg1Away ?? 0) + (tie.leg2Home ?? 0);
    const hasPen =
      tie.penHome !== undefined &&
      tie.penHome !== null &&
      tie.penAway !== undefined &&
      tie.penAway !== null;
    const winnerClub = tie.winnerClubId ? getClubById(tie.winnerClubId) : null;

    return (
      <div key={tie.id} className="bg-[#0E0F12] border border-[#242730] p-3 text-xs space-y-2">
        {/* Cabeçalho do Confronto: Quem Passou + Colunas IDA | VOLTA | AGREGADO */}
        <div className="flex items-center justify-between border-b border-[#1C1F26] pb-1.5 text-[10px] uppercase tracking-wider">
          <div className="truncate pr-2">
            {winnerClub ? (
              <span className="text-[#2DBE60] font-condensed font-extrabold tracking-widest">
                ★ CLASSIFICADO: {winnerClub.shortName}
                {hasPen ? ` (PÊN ${tie.penHome}:${tie.penAway})` : ` (AGREG. ${Math.max(aggH, aggA)}:${Math.min(aggH, aggA)})`}
              </span>
            ) : leg1Done ? (
              <span className="text-[#C8A45D] font-condensed font-bold">
                IDA ENCERRADA • FALTA VOLTA
              </span>
            ) : (
              <span className="text-[#565A65] font-condensed font-bold">CONFRONTO DEFINIDO</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 w-28 text-center font-condensed font-bold text-[#9498A3] shrink-0">
            <span>IDA</span>
            <span>VOLTA</span>
            <span className="text-[#C8A45D]">AGREG.</span>
          </div>
        </div>

        {[
          { club: home, leg1: tie.leg1Home, leg2: tie.leg2Away, agg: aggH, pen: tie.penHome },
          { club: away, leg1: tie.leg1Away, leg2: tie.leg2Home, agg: aggA, pen: tie.penAway },
        ].map(({ club, leg1, leg2, agg, pen }) => {
          const isWin = tie.winnerClubId === club.id;
          const isEliminated = Boolean(tie.winnerClubId && !isWin);
          return (
            <div
              key={club.id}
              onClick={() => onSelectClub(club.id)}
              className={`flex items-center justify-between px-2 py-1.5 cursor-pointer border-l-2 ${
                isWin
                  ? 'bg-[#15221B] border-l-[#2DBE60] text-[#F5F5F7]'
                  : isEliminated
                    ? 'border-l-transparent text-[#686D7A] hover:text-[#F5F5F7]'
                    : 'border-l-transparent text-[#D4D7E0] hover:text-[#F5F5F7]'
              }`}
            >
              <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                <ClubCrest clubId={club.id} size="sm" />
                <span className="font-condensed uppercase font-bold text-sm truncate">
                  {club.name}
                </span>
                {isWin && (
                  <span className="px-1.5 py-0.5 bg-[#2DBE60] text-[#0B0B0D] font-condensed font-extrabold text-[9px] tracking-wider shrink-0">
                    PASSOU
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5 w-28 text-center font-condensed font-bold text-sm tabular-nums shrink-0 items-center">
                <span className="text-[#9498A3]">{leg1Done ? leg1 : '—'}</span>
                <span className="text-[#9498A3]">{leg2Done ? leg2 : '—'}</span>
                <span
                  className={`py-0.5 font-extrabold ${
                    isWin
                      ? 'bg-[#2DBE60]/20 text-[#2DBE60]'
                      : leg1Done
                        ? 'bg-[#191C24] text-[#F5F5F7]'
                        : 'text-[#565A65]'
                  }`}
                >
                  {leg1Done ? `${agg}${hasPen ? ` (${pen})` : ''}` : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="lg:col-span-8 console-tile p-5 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#242730] shrink-0">
        <div className="flex items-center gap-4">
          <CompetitionBadge competitionId={cup.cupId} size="md" />
          {cup.championClubId && (
            <span
              className="px-2.5 py-0.5 font-condensed uppercase font-extrabold text-xs"
              style={{ backgroundColor: theme.accentPrimary, color: theme.textOnAccent }}
            >
              CAMPEÃO: {getClubById(cup.championClubId).name}
            </span>
          )}
        </div>

        <div className="flex gap-1.5">
          {(
            [
              ['GROUPS', 'GRUPOS A–H'],
              ['KNOCKOUT', 'MATA-MATA & FINAL'],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setSubView(id)}
              className={`px-4 py-1.5 font-condensed uppercase font-bold text-xs tracking-wider cursor-pointer ${
                subView === id
                  ? 'bg-[#F5F5F7] text-[#0B0B0D]'
                  : 'bg-[#0E0F12] text-[#9498A3]'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {subView === 'GROUPS' ? (
        <div className="flex-1 grid sm:grid-cols-2 gap-4 overflow-y-auto pr-1 min-h-0">
          {cup.groups.map((grp) => (
            <div key={grp.groupName} className="bg-[#0E0F12] border border-[#242730] p-3">
              <div
                className="font-condensed uppercase font-extrabold text-xs tracking-widest mb-2 pb-1 border-b border-[#242730]"
                style={{ color: theme.accentPrimary }}
              >
                {grp.groupName}
              </div>
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-[#191B20]">
                  {grp.standings.map((r, i) => {
                    const c = getClubById(r.clubId);
                    const qualified = i < 2;
                    const active = c.id === selectedClubId || c.id === playerClubId;
                    return (
                      <tr
                        key={r.clubId}
                        tabIndex={0}
                        data-focusable="true"
                        onFocus={() => onSelectClub(c.id)}
                        onClick={() => onSelectClub(c.id)}
                        className={`cursor-pointer outline-none ${
                          active ? 'bg-[#1C1F26] text-[#F5F5F7]' : 'hover:bg-[#16181D]'
                        }`}
                      >
                        <td className={`py-1.5 w-5 font-bold ${qualified ? 'text-[#2DBE60]' : 'text-[#565A65]'}`}>
                          {i + 1}
                        </td>
                        <td className="py-1.5">
                          <div className="flex items-center gap-2">
                            <ClubCrest clubId={c.id} size="sm" />
                            <span className="font-condensed uppercase font-bold text-sm truncate">
                              {c.shortName} • {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 text-center text-[#9498A3]">{r.played}J</td>
                        <td className="py-1.5 text-right font-condensed font-extrabold text-sm text-[#F5F5F7]">
                          {r.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 min-h-0">
          {cup.finalMatch && (
            <div>
              <div className="font-condensed uppercase font-bold text-xs tracking-widest text-[#C8A45D] mb-2">
                GRANDE FINAL (SEMANA 36)
              </div>
              <div className="bg-[#0E0F12] border border-[#C8A45D] p-4 flex items-center justify-around">
                <span className="font-condensed uppercase font-bold text-lg">
                  {getClubById(cup.finalMatch.homeClubId).name}
                </span>
                <span className="font-condensed font-extrabold text-2xl text-[#C8A45D]">
                  {cup.finalMatch.played
                    ? `${cup.finalMatch.homeGoals} : ${cup.finalMatch.awayGoals}${
                        cup.finalMatch.penHome !== undefined && cup.finalMatch.penHome !== null
                          ? ` (PÊN ${cup.finalMatch.penHome}:${cup.finalMatch.penAway})`
                          : ''
                      }`
                    : 'VS'}
                </span>
                <span className="font-condensed uppercase font-bold text-lg">
                  {getClubById(cup.finalMatch.awayClubId).name}
                </span>
              </div>
            </div>
          )}

          {[
            ['SEMIFINAIS (SEM 31 E 33)', cup.semiFinals],
            ['QUARTAS DE FINAL (SEM 26 E 28)', cup.quarterFinals],
            ['OITAVAS DE FINAL (SEM 21 E 23)', cup.roundOf16],
          ].map(([title, list]) => {
            const ties = list as KnockoutTie[];
            if (ties.length === 0) return null;
            return (
              <div key={title as string}>
                <div className="font-condensed uppercase font-bold text-xs tracking-widest text-[#9498A3] mb-2">
                  {title as string}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">{ties.map(renderTie)}</div>
              </div>
            );
          })}

          {cup.roundOf16.length === 0 && (
            <div className="py-12 text-center font-condensed uppercase text-xl text-[#565A65]">
              OITAVAS DE FINAL DEFINIDAS APÓS A 6ª RODADA DOS GRUPOS (SEMANA 15)
            </div>
          )}
        </div>
      )}
    </div>
  );
};
