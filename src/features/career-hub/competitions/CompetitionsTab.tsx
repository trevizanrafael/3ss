import React, { useState } from 'react';
import { Globe, Users } from 'lucide-react';
import { getClubById, getClubsByLeague } from '../../../data/clubs';
import { COUNTRIES } from '../../../data/countries/countries';
import { LeagueId, LEAGUES, PLAYABLE_LEAGUE_IDS } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { Panel } from '../../../shared/ui/Panel';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { getOvrBadgeStyle } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';

export const CompetitionsTab: React.FC = () => {
  const { contract, leagueTables } = useCareerStore();
  const playerClub = contract ? getClubById(contract.clubId) : null;

  const [selectedLeague, setSelectedLeague] = useState<LeagueId>(
    playerClub && playerClub.leagueId !== 'CONMEBOL_POOL' && playerClub.leagueId !== 'UEFA_POOL'
      ? playerClub.leagueId
      : 'BRA_1',
  );
  const [selectedClubId, setSelectedClubId] = useState<string>(
    playerClub?.id ?? 'inter_milao',
  );

  const standings = leagueTables[selectedLeague] ?? [];
  const leagueCfg = LEAGUES[selectedLeague];
  const inspectedClub = getClubById(selectedClubId);
  const continentalExtras = [
    ...getClubsByLeague('CONMEBOL_POOL'),
    ...getClubsByLeague('UEFA_POOL'),
  ];

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 space-y-6">
        <Panel
          title="Ligas Nacionais (1ª e 2ª Divisão) & MLS"
          subtitle="Clique em qualquer clube da tabela para inspecionar escudo oficial, força da base e estrelas reais do elenco."
          rightSlot={
            <select
              value={selectedLeague}
              onChange={(e) => {
                const nextLg = e.target.value as LeagueId;
                setSelectedLeague(nextLg);
                const first = leagueTables[nextLg]?.[0]?.clubId;
                if (first) setSelectedClubId(first);
              }}
              className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-xs font-semibold text-white outline-none"
            >
              {PLAYABLE_LEAGUE_IDS.map((id) => {
                const lg = LEAGUES[id];
                const flag = lg.country !== 'INT' ? COUNTRIES[lg.country].flag : '🌍';
                return (
                  <option key={id} value={id}>
                    {flag} {lg.name}
                  </option>
                );
              })}
            </select>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2">Clube</th>
                  <th className="py-2 text-center">OVR</th>
                  <th className="py-2 text-center">J</th>
                  <th className="py-2 text-center">V</th>
                  <th className="py-2 text-center">E</th>
                  <th className="py-2 text-center">D</th>
                  <th className="py-2 text-center">SG</th>
                  <th className="py-2 text-right font-bold text-white">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {standings.map((row, index) => {
                  const club = getClubById(row.clubId);
                  const isMine = club.id === contract?.clubId;
                  const isSelected = club.id === selectedClubId;
                  const isTopZone = index < 2;
                  const isDropZone = leagueCfg.hasRelegation && index >= standings.length - 2;

                  return (
                    <tr
                      key={row.clubId}
                      onClick={() => setSelectedClubId(club.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-emerald-500/15'
                          : isMine
                            ? 'bg-amber-500/10'
                            : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2.5 pr-2 font-bold tabular-nums">
                        <span
                          className={
                            isTopZone
                              ? 'text-emerald-400'
                              : isDropZone
                                ? 'text-rose-400'
                                : 'text-slate-400'
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
                          <span className={`font-semibold ${isMine ? 'text-amber-300' : 'text-slate-100'}`}>
                            {club.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center tabular-nums text-slate-300">{club.squadAvgOvr}</td>
                      <td className="py-2.5 text-center tabular-nums text-slate-400">{row.played}</td>
                      <td className="py-2.5 text-center tabular-nums text-slate-300">{row.won}</td>
                      <td className="py-2.5 text-center tabular-nums text-slate-400">{row.drawn}</td>
                      <td className="py-2.5 text-center tabular-nums text-slate-400">{row.lost}</td>
                      <td className="py-2.5 text-center tabular-nums text-slate-300">
                        {row.goalsFor - row.goalsAgainst}
                      </td>
                      <td className="py-2.5 text-right font-extrabold text-white tabular-nums">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-4 text-[11px] text-slate-400">
            {leagueCfg.continentalPrimary && (
              <span className="text-emerald-400">● Topo: Vaga {leagueCfg.continentalPrimary.replace('_', ' ')}</span>
            )}
            {leagueCfg.hasPromotion && <span className="text-emerald-400">● G-2: Acesso à 1ª Divisão</span>}
            {leagueCfg.hasRelegation && <span className="text-rose-400">● Z-2: Rebaixamento à 2ª Divisão</span>}
          </div>
        </Panel>

        <Panel
          title="Clubes Tradicionais Continentais (Libertadores / Sul-Americana / Champions / Europa League)"
          rightSlot={<Globe size={16} className="text-sky-400" />}
        >
          <div className="flex flex-wrap gap-2">
            {continentalExtras.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClubId(c.id)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 cursor-pointer"
              >
                <ClubCrest
                  clubId={c.id}
                  shortName={c.shortName}
                  primaryColor={c.primaryColor}
                  secondaryColor={c.secondaryColor}
                  pattern={c.pattern}
                  size="sm"
                />
                {c.name}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* Painel de Inspeção de Clube e Elenco Real */}
      <div className="lg:col-span-4 sticky top-28">
        <Panel title="Raio-X do Clube & Elenco">
          <div className="flex items-center gap-4 mb-4">
            <ClubCrest
              clubId={inspectedClub.id}
              shortName={inspectedClub.shortName}
              primaryColor={inspectedClub.primaryColor}
              secondaryColor={inspectedClub.secondaryColor}
              pattern={inspectedClub.pattern}
              size="xl"
            />
            <div>
              <h3 className="text-2xl font-bold text-white">{inspectedClub.name}</h3>
              <p className="text-xs text-emerald-400 font-medium">{inspectedClub.youthAcademyName}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <StarRatingBadge stars={inspectedClub.reputationStars} size="sm" />
                <span className="text-xs text-slate-400">Elenco {inspectedClub.squadAvgOvr} OVR</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2.5 flex items-center gap-1.5">
              <Users size={14} className="text-emerald-400" />
              Destaques Reais do Elenco
            </h4>
            <div className="space-y-2">
              {inspectedClub.keyPlayers.map((star) => (
                <div
                  key={star.name}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{star.name}</span>
                    <span className="ml-2 text-slate-400">{star.pos}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded border font-bold ${getOvrBadgeStyle(star.ovr)}`}>
                    {star.ovr}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};
