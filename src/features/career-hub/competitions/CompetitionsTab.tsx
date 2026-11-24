import React, { useMemo, useState } from 'react';
import { getClubById, getNationalTeamByCountry } from '../../../data/clubs';
import { COUNTRIES } from '../../../data/countries/countries';
import { ContinentalCupId, LeagueId, LEAGUES } from '../../../data/leagues/leagues';
import { getCompetitionTheme, InternationalCompId } from '../../../data/world/competitionThemes';
import { findClubLeagueIdInWorld } from '../../../domains/season/worldSeasonEngine';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { ConsoleStepper } from '../../../shared/ui/ConsoleStepper';
import { useCareerStore } from '../../../state/useCareerStore';
import { ClubSquadInspector } from './ClubSquadInspector';
import { CompetitionStatsView } from './CompetitionStatsView';
import { ContinentalBracketView } from './ContinentalBracketView';
import { InternationalCupBracketView } from './InternationalCupBracketView';
import { InternationalQualifiersView } from './InternationalQualifiersView';
import { SeasonHistoryView } from './SeasonHistoryView';

type CompMode =
  | 'SUL_LIGAS'
  | 'EURO_LIGAS'
  | 'MLS'
  | 'CONMEBOL_CUPS'
  | 'UEFA_CUPS'
  | 'SELECOES_ELIM'
  | 'SELECOES_COPAS'
  | 'HISTORICO';

type IntlCupOption = Extract<
  InternationalCompId,
  'WORLD_CUP' | 'NATIONS_LEAGUE' | 'COPA_AMERICA' | 'EURO_CUP'
>;

const LEAGUES_MAP: Record<'SUL_LIGAS' | 'EURO_LIGAS' | 'MLS', LeagueId[]> = {
  SUL_LIGAS: ['BRA_1', 'BRA_2', 'ARG_1', 'ARG_2'],
  EURO_LIGAS: [
    'ENG_1', 'ENG_2', 'ESP_1', 'ESP_2', 'ITA_1', 'ITA_2',
    'GER_1', 'GER_2', 'FRA_1', 'FRA_2', 'POR_1', 'POR_2',
  ],
  MLS: ['USA_1'],
};

const INTL_CUPS: IntlCupOption[] = ['WORLD_CUP', 'NATIONS_LEAGUE', 'COPA_AMERICA', 'EURO_CUP'];

export const CompetitionsTab: React.FC = () => {
  const { player, contract, worldSeason } = useCareerStore();
  const playerLeagueId = contract
    ? findClubLeagueIdInWorld(worldSeason, contract.clubId)
    : 'BRA_1';
  const userNatTeam = getNationalTeamByCountry(player?.nationality ?? 'BRA');

  const initialMode: CompMode =
    playerLeagueId === 'USA_1'
      ? 'MLS'
      : ['BRA_1', 'BRA_2', 'ARG_1', 'ARG_2'].includes(playerLeagueId)
        ? 'SUL_LIGAS'
        : 'EURO_LIGAS';

  const [mode, setMode] = useState<CompMode>(initialMode);
  const [topSubTab, setTopSubTab] = useState<'STANDINGS' | 'STATS'>('STANDINGS');
  const [leagueId, setLeagueId] = useState<LeagueId>(playerLeagueId);
  const [cupId, setCupId] = useState<ContinentalCupId>('CHAMPIONS_LEAGUE');
  const [wcqGroupId, setWcqGroupId] = useState<string>('WCQ_CONMEBOL');
  const [intlCupId, setIntlCupId] = useState<IntlCupOption>('WORLD_CUP');
  const [selectedClubId, setSelectedClubId] = useState<string>(
    contract?.clubId ?? worldSeason.leagues[playerLeagueId].standings[0]?.clubId,
  );

  const isClubCupMode = mode === 'CONMEBOL_CUPS' || mode === 'UEFA_CUPS';
  const activeCompId =
    mode === 'SELECOES_ELIM'
      ? 'WC_QUALIFIERS'
      : mode === 'SELECOES_COPAS'
        ? intlCupId
        : isClubCupMode
          ? cupId
          : leagueId;
  const theme = getCompetitionTheme(activeCompId);

  const availableLeagues = useMemo(
    () => (mode === 'SUL_LIGAS' || mode === 'EURO_LIGAS' || mode === 'MLS' ? LEAGUES_MAP[mode] : []),
    [mode],
  );

  const qualifiers = worldSeason.international?.qualifiers ?? [];
  const activeQualGroup =
    qualifiers.find((q) => q.id === wcqGroupId) ?? qualifiers[0];

  const handleModeChange = (next: CompMode) => {
    setMode(next);
    if (next === 'HISTORICO') return;
    if (next === 'SELECOES_ELIM') {
      const myGrp = qualifiers.find((q) =>
        q.standings.some((r) => r.clubId === userNatTeam.id),
      );
      if (myGrp) setWcqGroupId(myGrp.id);
      setSelectedClubId(userNatTeam.id);
    } else if (next === 'SELECOES_COPAS') {
      const cIdx = worldSeason.international?.cycleIndex ?? 0;
      setIntlCupId(cIdx === 1 ? 'NATIONS_LEAGUE' : 'WORLD_CUP');
      setSelectedClubId(userNatTeam.id);
    } else if (next === 'CONMEBOL_CUPS') {
      setCupId('LIBERTADORES');
    } else if (next === 'UEFA_CUPS') {
      setCupId('CHAMPIONS_LEAGUE');
    } else {
      const firstLg = LEAGUES_MAP[next][0];
      setLeagueId(firstLg);
      const firstClub = worldSeason.leagues[firstLg]?.standings[0]?.clubId;
      if (firstClub) setSelectedClubId(firstClub);
    }
  };

  const leagueData = worldSeason.leagues[leagueId];
  const leagueCfg = LEAGUES[leagueId];
  const dropCount = leagueCfg.hasRelegation ? (leagueId === 'BRA_1' ? 4 : 3) : 0;
  const promoCount = leagueCfg.hasPromotion ? (leagueId === 'BRA_2' ? 4 : 3) : 0;

  const cycleSubCompetition = (dir: -1 | 1) => {
    if (mode === 'SELECOES_ELIM' && qualifiers.length > 0) {
      const idx = qualifiers.findIndex((q) => q.id === wcqGroupId);
      const next = qualifiers[(idx + dir + qualifiers.length) % qualifiers.length];
      setWcqGroupId(next.id);
      if (next.standings[0]) setSelectedClubId(next.standings[0].clubId);
    } else if (mode === 'SELECOES_COPAS') {
      setIntlCupId(INTL_CUPS[(INTL_CUPS.indexOf(intlCupId) + dir + INTL_CUPS.length) % INTL_CUPS.length]);
    } else if (isClubCupMode) {
      const cups: ContinentalCupId[] =
        mode === 'CONMEBOL_CUPS'
          ? ['LIBERTADORES', 'SUL_AMERICANA']
          : ['CHAMPIONS_LEAGUE', 'EUROPA_LEAGUE'];
      setCupId(cups[(cups.indexOf(cupId) + dir + cups.length) % cups.length]);
    } else if (availableLeagues.length > 1) {
      const nextLg =
        availableLeagues[
          (availableLeagues.indexOf(leagueId) + dir + availableLeagues.length) % availableLeagues.length
        ];
      setLeagueId(nextLg);
      const first = worldSeason.leagues[nextLg]?.standings[0]?.clubId;
      if (first) setSelectedClubId(first);
    }
  };

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      <button type="button" data-pad-lt="true" data-nav-ignore="true" className="hidden" onClick={() => cycleSubCompetition(-1)} />
      <button type="button" data-pad-rt="true" data-nav-ignore="true" className="hidden" onClick={() => cycleSubCompetition(1)} />
      {mode !== 'HISTORICO' && (
        <button
          type="button"
          data-pad-x="true"
          data-nav-ignore="true"
          className="hidden"
          onClick={() => setTopSubTab((prev) => (prev === 'STANDINGS' ? 'STATS' : 'STANDINGS'))}
        />
      )}

      <div className="grid lg:grid-cols-12 gap-3 shrink-0 items-center">
        <div className="lg:col-span-5">
          <ConsoleStepper
            autoFocus
            compact
            value={mode}
            onChange={handleModeChange}
            options={[
              { value: 'SELECOES_ELIM', label: 'SELEÇÕES • ELIMINATÓRIAS DA COPA (FIFA)' },
              { value: 'SELECOES_COPAS', label: 'SELEÇÕES • COPA DO MUNDO, NATIONS & COPA AMÉRICA' },
              { value: 'SUL_LIGAS', label: 'AMÉRICA DO SUL • LIGAS (1ª E 2ª DIV)' },
              { value: 'EURO_LIGAS', label: 'EUROPA • 6 LIGAS (1ª E 2ª DIV)' },
              { value: 'MLS', label: 'MLS • ESTADOS UNIDOS & CANADÁ' },
              { value: 'CONMEBOL_CUPS', label: 'LIBERTADORES & SUL-AMERICANA' },
              { value: 'UEFA_CUPS', label: 'CHAMPIONS LEAGUE & EUROPA LEAGUE' },
              { value: 'HISTORICO', label: 'HISTÓRICO DE CAMPEÕES' },
            ]}
          />
        </div>

        <div className="lg:col-span-4">
          {mode === 'HISTORICO' ? (
            <div className="h-9 bg-[#0E0F12] border border-[#242730] flex items-center justify-center font-condensed uppercase font-bold text-sm tracking-widest text-[#9498A3]">
              REGISTRO ANUAL ({worldSeason.history.length} CONCLUÍDAS)
            </div>
          ) : mode === 'SELECOES_ELIM' ? (
            <ConsoleStepper
              compact
              value={wcqGroupId}
              onChange={(nextId) => {
                setWcqGroupId(nextId);
                const g = qualifiers.find((q) => q.id === nextId);
                if (g?.standings[0]) setSelectedClubId(g.standings[0].clubId);
              }}
              options={qualifiers.map((q) => ({ value: q.id, label: q.label }))}
            />
          ) : mode === 'SELECOES_COPAS' ? (
            <ConsoleStepper
              compact
              value={intlCupId}
              onChange={setIntlCupId}
              options={[
                { value: 'WORLD_CUP', label: 'COPA DO MUNDO FIFA (32 SELEÇÕES)' },
                { value: 'NATIONS_LEAGUE', label: 'LIGA DAS NAÇÕES (UEFA + TOP 2 CONMEBOL)' },
                { value: 'COPA_AMERICA', label: 'CONMEBOL COPA AMÉRICA (16 SELEÇÕES)' },
                { value: 'EURO_CUP', label: 'UEFA EUROCOPA (16 SELEÇÕES)' },
              ]}
            />
          ) : isClubCupMode ? (
            <ConsoleStepper
              compact
              value={cupId}
              onChange={setCupId}
              options={
                mode === 'CONMEBOL_CUPS'
                  ? [
                      { value: 'LIBERTADORES', label: 'CONMEBOL LIBERTADORES (32 CLUBES)' },
                      { value: 'SUL_AMERICANA', label: 'CONMEBOL SUL-AMERICANA (32 CLUBES)' },
                    ]
                  : [
                      { value: 'CHAMPIONS_LEAGUE', label: 'UEFA CHAMPIONS LEAGUE (32 CLUBES)' },
                      { value: 'EUROPA_LEAGUE', label: 'UEFA EUROPA LEAGUE (32 CLUBES)' },
                    ]
              }
            />
          ) : (
            <ConsoleStepper
              compact
              value={leagueId}
              onChange={(nextLg) => {
                setLeagueId(nextLg);
                const first = worldSeason.leagues[nextLg]?.standings[0]?.clubId;
                if (first) setSelectedClubId(first);
              }}
              options={availableLeagues.map((id) => {
                const lg = LEAGUES[id];
                const flag = lg.country !== 'INT' ? COUNTRIES[lg.country]?.flag ?? '' : '';
                return { value: id, label: `${flag} ${lg.name}` };
              })}
            />
          )}
        </div>

        {/* Aba Superior: Classificação/Chaves vs Estatísticas do Campeonato */}
        <div className="lg:col-span-3 flex items-center gap-1.5 justify-end">
          {mode !== 'HISTORICO' && (
            <>
              <GamepadBadge action="ALT_X" />
              <button
                type="button"
                data-focusable="true"
                onClick={() => setTopSubTab('STANDINGS')}
                className={`flex-1 h-9 px-3 font-condensed uppercase font-extrabold text-xs tracking-wider border cursor-pointer ${
                  topSubTab === 'STANDINGS'
                    ? 'bg-[#F5F5F7] text-[#0B0B0D] border-[#F5F5F7]'
                    : 'bg-[#0E0F12] text-[#9498A3] border-[#242730] hover:text-[#F5F5F7]'
                }`}
              >
                CLASSIFICAÇÃO
              </button>
              <button
                type="button"
                data-focusable="true"
                onClick={() => setTopSubTab('STATS')}
                style={
                  topSubTab === 'STATS'
                    ? {
                        backgroundColor: theme.accentPrimary,
                        color: theme.textOnAccent,
                        borderColor: theme.accentPrimary,
                      }
                    : undefined
                }
                className={`flex-1 h-9 px-3 font-condensed uppercase font-extrabold text-xs tracking-wider border cursor-pointer ${
                  topSubTab === 'STATS'
                    ? ''
                    : 'bg-[#0E0F12] text-[#9498A3] border-[#242730] hover:text-[#F5F5F7]'
                }`}
              >
                ESTATÍSTICAS
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-12 gap-5 min-h-0">
        {mode === 'HISTORICO' ? (
          <SeasonHistoryView history={worldSeason.history} onSelectClub={setSelectedClubId} />
        ) : topSubTab === 'STATS' ? (
          <CompetitionStatsView
            compId={activeCompId}
            qualifierGroupId={mode === 'SELECOES_ELIM' ? wcqGroupId : undefined}
            stageSubtitle={
              mode === 'SELECOES_ELIM' && activeQualGroup ? activeQualGroup.label : undefined
            }
            selectedClubId={selectedClubId}
            onSelectClub={setSelectedClubId}
          />
        ) : mode === 'SELECOES_ELIM' && activeQualGroup ? (
          <InternationalQualifiersView
            group={activeQualGroup}
            userNatTeamId={userNatTeam.id}
            selectedTeamId={selectedClubId}
            onSelectTeam={setSelectedClubId}
          />
        ) : mode === 'SELECOES_COPAS' && worldSeason.international ? (
          <InternationalCupBracketView
            compId={intlCupId}
            intl={worldSeason.international}
            seasonYear={worldSeason.seasonYear}
            userNatTeamId={userNatTeam.id}
            selectedTeamId={selectedClubId}
            onSelectTeam={setSelectedClubId}
          />
        ) : isClubCupMode ? (
          <ContinentalBracketView
            cup={worldSeason.continentals[cupId]}
            playerClubId={contract?.clubId}
            selectedClubId={selectedClubId}
            onSelectClub={setSelectedClubId}
          />
        ) : (
          <div
            className="lg:col-span-8 console-tile border-t-[3px] p-5 flex flex-col min-h-0"
            style={{ borderTopColor: theme.accentPrimary }}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#242730] shrink-0">
              <CompetitionBadge
                competitionId={leagueId}
                size="md"
                stageSubtitle={`${leagueData.standings.length} CLUBES • TURNO E RETURNO`}
              />
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-[#9498A3]">
                {leagueCfg.continentalPrimary && (
                  <span className="text-[#2DBE60]">● VAGA CONTINENTAL</span>
                )}
                {promoCount > 0 && <span className="text-[#2DBE60]">● G-{promoCount} ACESSO</span>}
                {dropCount > 0 && <span className="text-[#C94040]">● Z-{dropCount} REBAIXAMENTO</span>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 min-h-0">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#121316] border-b border-[#242730] text-[#565A65] font-condensed uppercase text-sm">
                  <tr>
                    <th className="py-2 w-8">#</th>
                    <th className="py-2">CLUBE</th>
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
                  {leagueData.standings.map((row, index) => {
                    const club = getClubById(row.clubId);
                    const selected = club.id === selectedClubId;
                    const isMine = club.id === contract?.clubId;
                    const isTopZone =
                      promoCount > 0
                        ? index < promoCount
                        : leagueCfg.continentalPrimary
                          ? index < 4
                          : index === 0;
                    const isDropZone =
                      dropCount > 0 && index >= leagueData.standings.length - dropCount;

                    return (
                      <tr
                        key={row.clubId}
                        tabIndex={0}
                        data-focusable="true"
                        onFocus={() => setSelectedClubId(club.id)}
                        onClick={() => setSelectedClubId(club.id)}
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
                                : isTopZone
                                  ? 'text-[#2DBE60]'
                                  : isDropZone
                                    ? 'text-[#C94040]'
                                    : 'text-[#9498A3]'
                            }
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-2.5">
                            <ClubCrest clubId={club.id} size="sm" />
                            <span className="font-condensed uppercase font-bold text-base tracking-wide">
                              {club.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-center opacity-75">{club.squadAvgOvr}</td>
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
        )}

        <ClubSquadInspector clubId={selectedClubId} accentColor={theme.accentPrimary} />
      </div>
    </div>
  );
};
