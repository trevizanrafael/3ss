import React from 'react';
import { ArrowUpRight, Sparkles, Swords, TrendingUp } from 'lucide-react';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { Panel } from '../../../shared/ui/Panel';
import { formatMoney, formatSquadRole } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

export const DashboardTab: React.FC = () => {
  const {
    player,
    contract,
    youthState,
    nextOpponentId,
    calendar,
    transitionProposals,
    feed,
    advanceToMatchDay,
  } = useCareerStore();
  const { setActiveTab, setMatchModalOpen } = useNavigationStore();

  if (!player || !contract) return null;
  const club = getClubById(contract.clubId);
  const opponent = nextOpponentId ? getClubById(nextOpponentId) : club;
  const league = LEAGUES[club.leagueId];

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* Coluna Principal */}
      <div className="lg:col-span-8 space-y-6">
        {transitionProposals.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/10 to-slate-900 border border-amber-400/50 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="text-amber-400 shrink-0" size={22} />
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  Propostas Oficiais de Subida ao Profissional / Empréstimo na Mesa!
                </h3>
                <p className="text-xs text-slate-300">
                  A diretoria quer definir seu próximo passo na carreira.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('CONTRACTS')}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold shrink-0 cursor-pointer"
            >
              Ver Propostas
            </button>
          </div>
        )}

        {/* Próximo Jogo */}
        <Panel
          title="Próximo Compromisso"
          subtitle={
            contract.stage === 'YOUTH'
              ? `${club.youthAcademyName} • Campeonato de Base`
              : `${league.name} • 2 tempos de 2:30 min`
          }
          rightSlot={
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
              {formatSquadRole(contract.role)}
            </span>
          }
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
            <div className="flex items-center gap-3">
              <ClubCrest
                clubId={club.id}
                shortName={club.shortName}
                primaryColor={club.primaryColor}
                secondaryColor={club.secondaryColor}
                pattern={club.pattern}
                size="lg"
              />
              <div>
                <div className="font-bold text-white text-lg">{club.name}</div>
                <div className="text-xs text-slate-400">Força base: {club.squadAvgOvr} OVR</div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <Swords size={22} className="text-slate-500 mb-1" />
              <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
                Sábado • Semana {calendar.week}
              </span>
            </div>

            <div className="flex items-center gap-3 sm:flex-row-reverse sm:text-right">
              <ClubCrest
                clubId={opponent.id}
                shortName={opponent.shortName}
                primaryColor={opponent.primaryColor}
                secondaryColor={opponent.secondaryColor}
                pattern={opponent.pattern}
                size="lg"
              />
              <div>
                <div className="font-bold text-white text-lg">{opponent.name}</div>
                <div className="text-xs text-slate-400">Força base: {opponent.squadAvgOvr} OVR</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              {contract.role.includes('RESERVA') || contract.role === 'PROMESSA'
                ? 'Você começa no banco e deve entrar no 2º tempo.'
                : 'Você está escalado entre os 11 titulares desde o apito inicial.'}
            </p>
            <button
              onClick={() => {
                if (calendar.day !== 6) advanceToMatchDay();
                setMatchModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
            >
              {calendar.day === 6 ? 'Entrar em Campo Agora' : 'Avançar Semana & Jogar'}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </Panel>

        {/* Modelo de Negócio da Base OU Meta Profissional */}
        {contract.stage === 'YOUTH' && youthState ? (
          <Panel
            title="Termômetro da Categoria de Base"
            subtitle="Destaque-se na base para virar titular e ser chamado pelo elenco profissional (ou sair emprestado)."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-semibold">Confiança do Técnico Sub-20</span>
                  <span className="text-emerald-400 font-bold">{youthState.coachTrust}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${youthState.coachTrust}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {youthState.coachTrust >= 55
                    ? '✓ Titularidade conquistada na Base!'
                    : 'Atinja 55% para assumir a camisa titular da Base.'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4 border border-slate-800">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-semibold">Olheiro do Elenco Profissional</span>
                  <span className="text-amber-400 font-bold">{youthState.seniorScoutProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${youthState.seniorScoutProgress}%` }} />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Em 100% (ou no fim da temporada), o Diretor propõe Subida ou Empréstimo.
                </p>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title="Meta Contratual da Temporada" subtitle="Cumpra sua meta em campo para destravar a premiação em dinheiro.">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold text-white">{contract.seasonGoal.label}</span>
              <span className="text-emerald-400 font-bold">
                {contract.seasonGoal.current} / {contract.seasonGoal.target} (Prêmio: {formatMoney(contract.seasonGoal.rewardAmount)})
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${Math.min(100, (contract.seasonGoal.current / contract.seasonGoal.target) * 100)}%` }}
              />
            </div>
          </Panel>
        )}
      </div>

      {/* Coluna Lateral: Números & Feed */}
      <div className="lg:col-span-4 space-y-6">
        <Panel title="Números da Carreira">
          <div className="grid grid-cols-2 gap-3">
            {[
              { lbl: 'Partidas', val: player.careerTotals.matches },
              { lbl: 'Gols', val: player.careerTotals.goals },
              { lbl: 'Assistências', val: player.careerTotals.assists },
              { lbl: 'Jogos 3★', val: player.careerTotals.threeStarMatches },
            ].map((item) => (
              <div key={item.lbl} className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                <span className="text-xs text-slate-400 block">{item.lbl}</span>
                <span className="text-2xl font-bold text-white tabular-nums">{item.val}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Diário da Carreira" rightSlot={<TrendingUp size={16} className="text-emerald-400" />}>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {feed.map((ev) => (
              <div key={ev.id} className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
                  <span>Semana {ev.week}</span>
                  <span className="text-emerald-400 font-semibold">{ev.category}</span>
                </div>
                <div className="text-xs font-bold text-slate-200">{ev.title}</div>
                <p className="text-xs text-slate-400 mt-0.5">{ev.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};
