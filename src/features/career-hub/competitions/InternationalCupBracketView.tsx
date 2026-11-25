import React, { useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { COUNTRIES } from '../../../data/countries/countries';
import { InternationalCompId, getCompetitionTheme } from '../../../data/world/competitionThemes';
import {
  InternationalCycleState,
  NationalCupTournament,
} from '../../../domains/international/internationalTypes';
import {
  getHostCountryWorldCupVenues,
  getWorldCupEditionInfo,
  resolveWorldCupMatchVenue,
} from '../../../domains/international/worldCupHostVenues';
import { FixtureMatch } from '../../../domains/season/seasonTypes';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { CountryFlag } from '../../../shared/ui/CountryFlag';

interface InternationalCupBracketViewProps {
  compId: Extract<
    InternationalCompId,
    'WORLD_CUP' | 'NATIONS_LEAGUE' | 'COPA_AMERICA' | 'EURO_CUP'
  >;
  intl: InternationalCycleState;
  seasonYear: number;
  userNatTeamId: string;
  selectedTeamId: string;
  onSelectTeam: (id: string) => void;
}

export const InternationalCupBracketView: React.FC<InternationalCupBracketViewProps> = ({
  compId,
  intl,
  seasonYear,
  userNatTeamId,
  selectedTeamId,
  onSelectTeam,
}) => {
  const [subView, setSubView] = useState<'GROUPS' | 'KNOCKOUT'>('GROUPS');
  const theme = getCompetitionTheme(compId);

  const cup: NationalCupTournament | null =
    compId === 'WORLD_CUP'
      ? intl.worldCup
      : compId === 'NATIONS_LEAGUE'
        ? intl.nationsLeague
        : compId === 'COPA_AMERICA'
          ? intl.copaAmerica
          : intl.euroCup;

  if (!cup) {
    const nextYearsAway =
      compId === 'WORLD_CUP'
        ? (3 - intl.cycleIndex + 4) % 4
        : (1 - intl.cycleIndex + 4) % 4;
    const targetSeason = seasonYear + nextYearsAway;
    const wcInfo = compId === 'WORLD_CUP' ? getWorldCupEditionInfo(seasonYear, intl) : null;
    const hostVenues = wcInfo ? getHostCountryWorldCupVenues(wcInfo.hostCountry) : [];
    const lastChamp = intl.pastChampions.find((c) => c.compId === compId);

    return (
      <div
        className="lg:col-span-8 console-tile border-t-[3px] p-6 flex flex-col justify-between min-h-0 overflow-y-auto"
        style={{ borderTopColor: theme.accentPrimary }}
      >
        <CompetitionBadge
          competitionId={compId}
          size="lg"
          labelOverride={wcInfo?.shortLabel}
          stageSubtitle={
            wcInfo
              ? `CALENDÁRIO OFICIAL DO CICLO FIFA • PAÍS-SEDE: ${wcInfo.hostCountryName.toUpperCase()}`
              : `CALENDÁRIO OFICIAL DO CICLO FIFA • PRÓXIMA EDIÇÃO EM ${targetSeason}/${String(targetSeason + 1).slice(-2)}`
          }
        />

        <div className="my-auto max-w-2xl space-y-4 py-3">
          <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7]">
            {wcInfo
              ? `TORNEIO PROGRAMADO PARA JUNHO DE ${wcInfo.editionYear}`
              : `TORNEIO PROGRAMADO PARA A TEMPORADA ${targetSeason}`}
          </div>
          <p className="text-xs text-[#9498A3] leading-relaxed">
            {compId === 'NATIONS_LEAGUE'
              ? 'Disputada no Ano 2 do ciclo FIFA reunindo as potências da UEFA + as 2 primeiras colocadas das Eliminatórias da CONMEBOL na Liga A.'
              : wcInfo
                ? `A Copa do Mundo ${wcInfo.editionYear} será disputada integralmente em sede única (${wcInfo.hostCountryName}), sem vantagem de casa ou fora, nas Semanas 39 a 42 (Junho) com 32 Seleções.`
                : 'Disputada no verão da Temporada 2 do ciclo FIFA (Semanas 39 a 42) logo após o término das ligas de clubes.'}
          </p>

          {wcInfo && (
            <div className="bg-[#0E0F12] border border-[#242730] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 border-b border-[#1C1F26] pb-2.5">
                <div className="flex items-center gap-2.5">
                  <CountryFlag code={wcInfo.hostCountry} size="md" />
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[#C8A45D] font-bold">
                      PAÍS-SEDE OFICIAL • VAGA DIRETA GARANTIDA
                    </div>
                    <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7]">
                      {wcInfo.hostCountryName} ({wcInfo.editionYear})
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-[#16181D] border border-[#242730] font-condensed uppercase font-bold text-[11px] tracking-wider text-[#9498A3]">
                  CAMPO NEUTRO • {hostVenues.length} ESTÁDIOS-SEDE
                </span>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#9498A3] mb-1.5">
                  PRINCIPAIS ESTÁDIOS CADASTRADOS DA SEDE
                </div>
                <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
                  {hostVenues.slice(0, 6).map((v, idx) => (
                    <div
                      key={v.stadiumName}
                      className="bg-[#14161B] border border-[#242730] px-2.5 py-1.5 flex items-center justify-between gap-2"
                    >
                      <span className="font-condensed uppercase font-bold text-[#F5F5F7] truncate">
                        {idx === 0 ? `★ ${v.stadiumName}` : v.stadiumName}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[#9498A3] shrink-0">
                        {idx === 0 ? `${v.city} • FINAL` : v.city}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {compId === 'NATIONS_LEAGUE' && intl.conmebolNationsSpots.length > 0 && (
            <div className="bg-[#0E0F12] border border-[#242730] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#C8A45D] mb-2">
                ATUAIS LÍDERES CONMEBOL RUMO À LIGA DAS NAÇÕES (TOP 2)
              </div>
              <div className="flex items-center gap-5">
                {intl.conmebolNationsSpots.map((id) => {
                  const t = getClubById(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      data-focusable="true"
                      onClick={() => onSelectTeam(id)}
                      className="flex items-center gap-2 font-condensed uppercase font-bold text-base text-[#F5F5F7] cursor-pointer"
                    >
                      <ClubCrest clubId={id} size="sm" />
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {lastChamp && (
            <div className="bg-[#0E0F12] border-l-4 border-l-[#C8A45D] p-4 flex items-center gap-3">
              <ClubCrest clubId={lastChamp.championTeamId} size="md" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#C8A45D]">
                  ÚLTIMO CAMPEÃO (
                  {compId === 'WORLD_CUP'
                    ? (lastChamp.editionYear ?? lastChamp.season + 1)
                    : lastChamp.season}
                  )
                </div>
                <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7]">
                  {getClubById(lastChamp.championTeamId).name}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] uppercase tracking-widest text-[#565A65] border-t border-[#242730] pt-3">
          ACOMPANHE AS ELIMINATÓRIAS EM TEMPO REAL PARA VER QUEM GARANTE VAGA
        </div>
      </div>
    );
  }

  const guestSet = new Set(cup.conmebolGuestIds ?? []);
  const allGroups = [...cup.groups, ...(cup.leagueBGroups ?? [])];
  const cupEditionYear = cup.editionYear ?? cup.seasonYear + 1;
  const cupHostCountry = cup.hostCountry;
  const cupHostName = cupHostCountry ? (COUNTRIES[cupHostCountry]?.name ?? cupHostCountry) : null;
  const cupHostFlagshipVenue =
    compId === 'WORLD_CUP' && cupHostCountry
      ? getHostCountryWorldCupVenues(cupHostCountry)[0]
      : null;

  const renderSingleMatch = (m: FixtureMatch, stageName: string) => {
    const h = getClubById(m.homeClubId);
    const a = getClubById(m.awayClubId);
    const hasPen =
      m.penHome !== undefined && m.penHome !== null && m.penAway !== undefined && m.penAway !== null;
    const matchVenue =
      compId === 'WORLD_CUP' && cupHostCountry
        ? resolveWorldCupMatchVenue(cupHostCountry, m.id, stageName)
        : null;

    return (
      <div key={m.id} className="bg-[#0E0F12] border border-[#242730] p-3 text-xs space-y-1.5">
        {[
          { team: h, goals: m.homeGoals, pen: m.penHome },
          { team: a, goals: m.awayGoals, pen: m.penAway },
        ].map(({ team, goals, pen }) => (
          <div
            key={team.id}
            tabIndex={0}
            data-focusable="true"
            data-focus-label="INSPECIONAR SELEÇÃO"
            onFocus={() => onSelectTeam(team.id)}
            onClick={() => onSelectTeam(team.id)}
            className={`flex items-center justify-between px-2 py-1 cursor-pointer outline-none ${
              m.winnerId === team.id ? 'bg-[#191C24] text-[#F5F5F7]' : 'text-[#9498A3]'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <ClubCrest clubId={team.id} size="sm" />
              <span className="font-condensed uppercase font-bold text-sm truncate">
                {team.name}
              </span>
            </div>
            <span className="font-condensed font-extrabold text-sm tabular-nums shrink-0">
              {m.played ? `${goals ?? 0}${hasPen ? ` (PÊN ${pen})` : ''}` : '—'}
            </span>
          </div>
        ))}
        {matchVenue && (
          <div className="pt-1.5 border-t border-[#191B20] flex items-center justify-between text-[10px] uppercase tracking-wider text-[#565A65] px-1">
            <span>ESTÁDIO-SEDE</span>
            <span className="truncate ml-2 text-[#9498A3]">
              {matchVenue.stadiumName} • {matchVenue.city}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="lg:col-span-8 console-tile p-5 flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-[#242730] shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <CompetitionBadge
            competitionId={compId}
            size="md"
            labelOverride={
              compId === 'WORLD_CUP' ? `COPA DO MUNDO ${cupEditionYear}` : undefined
            }
          />
          {compId === 'WORLD_CUP' && cupHostCountry && (
            <span className="px-2.5 py-1 bg-[#14161B] border border-[#242730] inline-flex items-center gap-1.5 font-condensed uppercase font-bold text-xs tracking-wider text-[#F5F5F7]">
              <CountryFlag code={cupHostCountry} size="xs" />
              <span>
                SEDE: {cupHostName?.toUpperCase()}
                {cupHostFlagshipVenue ? ` • FINAL NO ${cupHostFlagshipVenue.stadiumName.toUpperCase()}` : ''}
              </span>
            </span>
          )}
          {cup.championTeamId && (
            <span
              className="px-2.5 py-0.5 font-condensed uppercase font-extrabold text-xs"
              style={{ backgroundColor: theme.accentPrimary, color: theme.textOnAccent }}
            >
              CAMPEÃO: {getClubById(cup.championTeamId).name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-pad-y="true"
            data-nav-ignore="true"
            onClick={() => setSubView((v) => (v === 'GROUPS' ? 'KNOCKOUT' : 'GROUPS'))}
            className="mr-1 cursor-pointer"
          >
            <GamepadBadge action="ALT_Y" />
          </button>
          {(
            [
              ['GROUPS', 'FASE DE GRUPOS'],
              ['KNOCKOUT', 'MATA-MATA & FINAL'],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              type="button"
              data-focusable="true"
              onClick={() => setSubView(id)}
              className={`px-4 py-1.5 font-condensed uppercase font-bold text-xs tracking-wider cursor-pointer ${
                subView === id ? 'bg-[#F5F5F7] text-[#0B0B0D]' : 'bg-[#0E0F12] text-[#9498A3] hover:text-[#F5F5F7]'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {subView === 'GROUPS' ? (
        <div className="flex-1 grid sm:grid-cols-2 gap-4 overflow-y-auto pr-1 min-h-0">
          {allGroups.map((grp, gIdx) => {
            const isLeagueB = gIdx >= cup.groups.length;
            return (
              <div key={`${grp.groupName}_${gIdx}`} className="bg-[#0E0F12] border border-[#242730] p-3">
                <div
                  className="font-condensed uppercase font-extrabold text-xs tracking-widest mb-2 pb-1 border-b border-[#242730]"
                  style={{ color: isLeagueB ? '#9498A3' : theme.accentPrimary }}
                >
                  {isLeagueB ? `LIGA B • ${grp.groupName}` : grp.groupName}
                </div>
                <table className="w-full text-[11px]">
                  <tbody className="divide-y divide-[#191B20]">
                    {grp.standings.map((r, i) => {
                      const t = getClubById(r.clubId);
                      const active = t.id === selectedTeamId || t.id === userNatTeamId;
                      return (
                        <tr
                          key={r.clubId}
                          tabIndex={0}
                          data-focusable="true"
                          onFocus={() => onSelectTeam(t.id)}
                          onClick={() => onSelectTeam(t.id)}
                          className={`cursor-pointer outline-none ${
                            active ? 'bg-[#1C1F26] text-[#F5F5F7]' : 'hover:bg-[#16181D]'
                          }`}
                        >
                          <td className={`py-1.5 w-5 font-bold ${i < 2 && !isLeagueB ? 'text-[#2DBE60]' : 'text-[#565A65]'}`}>
                            {i + 1}
                          </td>
                          <td className="py-1.5">
                            <div className="flex items-center gap-2">
                              <ClubCrest clubId={t.id} size="sm" />
                              <span className="font-condensed uppercase font-bold text-sm truncate">
                                {t.name}
                              </span>
                              {guestSet.has(t.id) && (
                                <span className="text-[9px] px-1 bg-[#C8A45D] text-[#0B0B0D] font-condensed font-extrabold">
                                  CONMEBOL
                                </span>
                              )}
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
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 min-h-0">
          {cup.finalMatch && (
            <div>
              <div className="font-condensed uppercase font-bold text-xs tracking-widest text-[#C8A45D] mb-2">
                GRANDE FINAL
              </div>
              {renderSingleMatch(cup.finalMatch, 'GRANDE FINAL')}
            </div>
          )}

          {[
            ['SEMIFINAIS', cup.semiFinals],
            ['QUARTAS DE FINAL', cup.quarterFinals],
            ['OITAVAS DE FINAL', cup.roundOf16],
          ].map(([lbl, list]) => {
            const arr = list as FixtureMatch[];
            if (arr.length === 0) return null;
            const stageTitle = lbl as string;
            return (
              <div key={stageTitle}>
                <div className="font-condensed uppercase font-bold text-xs tracking-widest text-[#9498A3] mb-2">
                  {stageTitle}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {arr.map((m) => renderSingleMatch(m, stageTitle))}
                </div>
              </div>
            );
          })}

          {cup.quarterFinals.length === 0 && cup.roundOf16.length === 0 && (
            <div className="py-12 text-center font-condensed uppercase text-xl text-[#565A65]">
              MATA-MATA DEFINIDO AO ENCERRAR A FASE DE GRUPOS
            </div>
          )}
        </div>
      )}
    </div>
  );
};
