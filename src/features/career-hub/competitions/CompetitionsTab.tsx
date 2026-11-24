import React, { useMemo, useState } from 'react';
import { getClubById, getClubsByLeague } from '../../../data/clubs';
import { COUNTRIES } from '../../../data/countries/countries';
import { LeagueId, LEAGUES } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { ConsoleStepper } from '../../../shared/ui/ConsoleStepper';
import { FifaStatBadge } from '../../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { useCareerStore } from '../../../state/useCareerStore';

type RegionFilter = 'SUL_AMERICA' | 'EUROPA' | 'MLS' | 'CONTINENTAIS';

const LEAGUES_BY_REGION: Record<Exclude<RegionFilter, 'CONTINENTAIS'>, LeagueId[]> = {
  SUL_AMERICA: ['BRA_1', 'BRA_2', 'ARG_1', 'ARG_2'],
  EUROPA: ['ENG_1', 'ENG_2', 'ESP_1', 'ESP_2', 'ITA_1', 'ITA_2', 'GER_1', 'GER_2', 'FRA_1', 'FRA_2', 'POR_1', 'POR_2'],
  MLS: ['USA_1'],
};

export const CompetitionsTab: React.FC = () => {
  const { contract, leagueTables } = useCareerStore();
  const playerClub = contract ? getClubById(contract.clubId) : null;

  const [region, setRegion] = useState<RegionFilter>('SUL_AMERICA');
  const [leagueId, setLeagueId] = useState<LeagueId>(
    playerClub && playerClub.leagueId !== 'CONMEBOL_POOL' && playerClub.leagueId !== 'UEFA_POOL'
      ? playerClub.leagueId
      : 'BRA_1',
  );
  const [selectedClubId, setSelectedClubId] = useState<string>(playerClub?.id ?? 'inter_milao');

  const regionLeagues = useMemo(() => {
    if (region === 'CONTINENTAIS') return [];
    return LEAGUES_BY_REGION[region];
  }, [region]);

  const handleRegionChange = (nextReg: RegionFilter) => {
    setRegion(nextReg);
    if (nextReg !== 'CONTINENTAIS') {
      const firstLg = LEAGUES_BY_REGION[nextReg][0];
      setLeagueId(firstLg);
      const firstClub = leagueTables[firstLg]?.[0]?.clubId;
      if (firstClub) setSelectedClubId(firstClub);
    } else {
      setSelectedClubId('penarol');
    }
  };

  const standings = leagueTables[leagueId] ?? [];
  const leagueCfg = LEAGUES[leagueId];
  const inspectedClub = getClubById(selectedClubId);
  const continentalClubs = [
    ...getClubsByLeague('CONMEBOL_POOL'),
    ...getClubsByLeague('UEFA_POOL'),
  ];

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      {/* Barra de Filtro sem <select> do Windows */}
      <div className="grid sm:grid-cols-2 gap-4 shrink-0">
        <ConsoleStepper
          compact
          value={region}
          onChange={handleRegionChange}
          options={[
            { value: 'SUL_AMERICA', label: 'AMÉRICA DO SUL (1ª E 2ª DIV)' },
            { value: 'EUROPA', label: 'EUROPA (6 LIGAS • 1ª E 2ª DIV)' },
            { value: 'MLS', label: 'MLS (AMÉRICA DO NORTE)' },
            { value: 'CONTINENTAIS', label: 'COPAS CONTINENTAIS (EXTRAS)' },
          ]}
        />

        {region !== 'CONTINENTAIS' && (
          <ConsoleStepper
            compact
            value={leagueId}
            onChange={(nextLg) => {
              setLeagueId(nextLg);
              const first = leagueTables[nextLg]?.[0]?.clubId;
              if (first) setSelectedClubId(first);
            }}
            options={regionLeagues.map((id) => {
              const lg = LEAGUES[id];
              const flag = lg.country !== 'INT' ? COUNTRIES[lg.country].flag : '';
              return { value: id, label: `${flag} ${lg.name}` };
            })}
          />
        )}
      </div>

      {/* Corpo: Tabela à Esquerda + Raio-X do Clube à Direita */}
      <div className="flex-1 grid lg:grid-cols-12 gap-5 min-h-0">
        <div className="lg:col-span-8 console-tile p-5 flex flex-col min-h-0">
          {region === 'CONTINENTAIS' ? (
            <div className="grid sm:grid-cols-3 gap-3 overflow-y-auto">
              {continentalClubs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedClubId(c.id)}
                  className={`p-4 border text-left flex items-center gap-3 cursor-pointer ${
                    c.id === selectedClubId
                      ? 'bg-[#1C1F26] border-[#C8A45D]'
                      : 'bg-[#0E0F12] border-[#242730]'
                  }`}
                >
                  <ClubCrest
                    clubId={c.id}
                    shortName={c.shortName}
                    primaryColor={c.primaryColor}
                    secondaryColor={c.secondaryColor}
                    pattern={c.pattern}
                    size="md"
                  />
                  <span className="font-condensed uppercase font-bold text-lg text-[#F5F5F7]">
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#121316] border-b border-[#242730] text-[#565A65] font-condensed uppercase text-sm">
                  <tr>
                    <th className="py-2 w-8">#</th>
                    <th className="py-2">CLUBE</th>
                    <th className="py-2 text-center">J</th>
                    <th className="py-2 text-center">V</th>
                    <th className="py-2 text-center">E</th>
                    <th className="py-2 text-center">D</th>
                    <th className="py-2 text-center">SG</th>
                    <th className="py-2 text-right text-[#F5F5F7]">PTS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1F26]">
                  {standings.map((row, index) => {
                    const club = getClubById(row.clubId);
                    const selected = club.id === selectedClubId;
                    const isMine = club.id === contract?.clubId;
                    const topZone = index < 2;
                    const dropZone = leagueCfg.hasRelegation && index >= standings.length - 2;

                    return (
                      <tr
                        key={row.clubId}
                        onClick={() => setSelectedClubId(club.id)}
                        className={`cursor-pointer transition-colors ${
                          selected
                            ? 'bg-[#F5F5F7] text-[#0B0B0D]'
                            : isMine
                              ? 'bg-[#1C1A14] text-[#C8A45D]'
                              : 'hover:bg-[#191B20] text-[#F5F5F7]'
                        }`}
                      >
                        <td className="py-2.5 pl-2 font-condensed font-bold text-base">
                          <span
                            className={
                              selected
                                ? 'text-[#0B0B0D]'
                                : topZone
                                  ? 'text-[#2DBE60]'
                                  : dropZone
                                    ? 'text-[#C94040]'
                                    : 'text-[#9498A3]'
                            }
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <ClubCrest
                              clubId={club.id}
                              shortName={club.shortName}
                              primaryColor={club.primaryColor}
                              secondaryColor={club.secondaryColor}
                              pattern={club.pattern}
                              size="sm"
                            />
                            <span className="font-condensed uppercase font-bold text-base tracking-wide">
                              {club.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">{row.played}</td>
                        <td className="py-2.5 text-center">{row.won}</td>
                        <td className="py-2.5 text-center">{row.drawn}</td>
                        <td className="py-2.5 text-center">{row.lost}</td>
                        <td className="py-2.5 text-center">{row.goalsFor - row.goalsAgainst}</td>
                        <td className="py-2.5 pr-2 text-right font-condensed font-extrabold text-lg">
                          {row.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Coluna Direita: Ficha Limpa do Clube Selecionado */}
        <div className="lg:col-span-4 console-tile border-t-[3px] border-t-[#C8A45D] p-6 flex flex-col min-h-0">
          <div className="flex items-center gap-4 pb-4 border-b border-[#242730]">
            <ClubCrest
              clubId={inspectedClub.id}
              shortName={inspectedClub.shortName}
              primaryColor={inspectedClub.primaryColor}
              secondaryColor={inspectedClub.secondaryColor}
              pattern={inspectedClub.pattern}
              size="lg"
            />
            <div>
              <h3 className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
                {inspectedClub.name}
              </h3>
              <div className="text-[11px] uppercase tracking-wider text-[#C8A45D] mt-1">
                {inspectedClub.youthAcademyName}
              </div>
              <div className="mt-1.5">
                <StarRatingBadge stars={inspectedClub.reputationStars} size="sm" />
              </div>
            </div>
          </div>

          <div className="text-[11px] uppercase tracking-[0.2em] text-[#9498A3] mt-4 mb-2.5">
            DESTAQUES DO ELENCO (AMOSTRA INICIAL)
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto">
            {inspectedClub.keyPlayers.map((star) => (
              <div
                key={star.name}
                className="bg-[#0E0F12] border border-[#242730] px-3.5 py-2 flex items-center justify-between"
              >
                <div>
                  <span className="font-condensed uppercase font-bold text-base text-[#F5F5F7]">
                    {star.name}
                  </span>
                  <span className="ml-2 text-[11px] text-[#9498A3]">{star.pos}</span>
                </div>
                <FifaStatBadge value={star.ovr} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
