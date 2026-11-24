import React, { useState } from 'react';
import { Briefcase, Check, RefreshCw, UserCheck } from 'lucide-react';
import { AGENTS_CATALOG } from '../../../data/agents/catalog';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { Panel } from '../../../shared/ui/Panel';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { formatMoney, formatSquadRole } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';

export const ContractsTab: React.FC = () => {
  const {
    player,
    contract,
    agentId,
    bankBalance,
    transitionProposals,
    marketOffers,
    acceptYouthTransition,
    acceptMarketProposal,
    requestLoanOrOffersFromAgent,
    hireAgentById,
  } = useCareerStore();

  const [feedback, setFeedback] = useState<string | null>(null);

  if (!player || !contract) return null;
  const currentClub = getClubById(contract.clubId);
  const parentClub = contract.parentClubId ? getClubById(contract.parentClubId) : null;

  return (
    <div className="space-y-6">
      {feedback && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 text-xs font-semibold text-emerald-300">
          {feedback}
        </div>
      )}

      {/* Vínculo Atual */}
      <Panel
        title="Contrato Vigente"
        subtitle={
          parentClub
            ? `Atuando por empréstimo (Pertence ao ${parentClub.name})`
            : 'Detalhes do seu vínculo, salário e bônus de desempenho.'
        }
        rightSlot={
          <button
            onClick={requestLoanOrOffersFromAgent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-slate-700 cursor-pointer"
          >
            <RefreshCw size={14} />
            {contract.stage === 'YOUTH' ? 'Pedir Reunião (Subida / Empréstimo)' : 'Sondar Mercado via Empresário'}
          </button>
        }
      >
        <div className="grid sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <span className="text-slate-400 block">Clube Atual</span>
            <span className="text-base font-bold text-white">{currentClub.name}</span>
          </div>
          <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <span className="text-slate-400 block">Papel no Elenco</span>
            <span className="text-base font-bold text-emerald-400">{formatSquadRole(contract.role)}</span>
          </div>
          <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <span className="text-slate-400 block">Salário / Bolsa Mensal</span>
            <span className="text-base font-bold text-white">{formatMoney(contract.monthlySalary)}</span>
          </div>
          <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800">
            <span className="text-slate-400 block">Bônus por Gol/Assist.</span>
            <span className="text-base font-bold text-amber-300">{formatMoney(contract.goalBonusPerContribution)}</span>
          </div>
        </div>
      </Panel>

      {/* Propostas de Transição da Base (Subir ou Empréstimo) */}
      {transitionProposals.length > 0 && (
        <Panel
          title="Transição da Base para o Futebol Profissional"
          subtitle="Escolha entre buscar espaço direto no time de cima ou sair emprestado por 1 temporada como Titular!"
        >
          <div className="grid md:grid-cols-3 gap-4">
            {transitionProposals.map((prop) => {
              const target = getClubById(prop.targetClubId);
              return (
                <div key={prop.id} className="rounded-2xl bg-slate-950 border border-amber-400/40 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <ClubCrest
                        clubId={target.id}
                        shortName={target.shortName}
                        primaryColor={target.primaryColor}
                        secondaryColor={target.secondaryColor}
                        pattern={target.pattern}
                        size="md"
                      />
                      <div>
                        <h4 className="font-bold text-white">{target.name}</h4>
                        <span className="text-[11px] text-amber-300 font-semibold">
                          {prop.type === 'LOAN_STARTER' ? 'Empréstimo de 1 Ano' : 'Promoção ao Profissional'}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 my-2">{prop.summary}</p>
                    <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800">
                      <div>Papel: <strong className="text-white">{formatSquadRole(prop.offeredRole)}</strong></div>
                      <div>Salário: <strong className="text-emerald-400">{formatMoney(prop.monthlySalary)}/mês</strong></div>
                    </div>
                  </div>
                  <button
                    onClick={() => acceptYouthTransition(prop)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Assinar Vínculo
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Propostas de Mercado / Renovação */}
      {marketOffers.length > 0 && (
        <Panel title="Propostas Oficiais na Mesa" subtitle="Propostas obtidas na janela de transferências.">
          <div className="grid md:grid-cols-2 gap-4">
            {marketOffers.map((off) => {
              const club = getClubById(off.clubId);
              return (
                <div key={off.id} className="rounded-2xl bg-slate-950 border border-slate-800 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ClubCrest
                      clubId={club.id}
                      shortName={club.shortName}
                      primaryColor={club.primaryColor}
                      secondaryColor={club.secondaryColor}
                      pattern={club.pattern}
                      size="md"
                    />
                    <div>
                      <h4 className="font-bold text-white">{club.name}</h4>
                      <p className="text-[11px] text-slate-400">{LEAGUES[club.leagueId].name} • {formatSquadRole(off.role)}</p>
                      <p className="text-xs text-emerald-400 font-bold mt-0.5">
                        {formatMoney(off.monthlySalary)}/mês • {off.years} anos
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => acceptMarketProposal(off)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                  >
                    Aceitar
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Catálogo de Empresários */}
      <Panel
        title="Empresários de Carreira"
        subtitle="Empresários mais estrelados negociam salários maiores e abrem portas no exterior (Europa, MLS e Libertadores)."
      >
        <div className="grid md:grid-cols-2 gap-4">
          {AGENTS_CATALOG.map((ag) => {
            const isCurrent = ag.id === agentId;
            return (
              <div
                key={ag.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between ${
                  isCurrent ? 'bg-emerald-950/25 border-emerald-500/60' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h4 className="font-bold text-white flex items-center gap-2">
                        <Briefcase size={14} className="text-amber-400" />
                        {ag.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">{ag.agencyName}</p>
                    </div>
                    <StarRatingBadge stars={ag.stars} size="sm" />
                  </div>
                  <p className="text-xs text-slate-300 mt-2">{ag.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-slate-800">
                      +{ag.salaryBonusPct}% nos Salários
                    </span>
                    {ag.unlocksForeignOffers && (
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-slate-800">
                        Mercado Internacional Liberado
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {ag.signingFee === 0 ? 'Gratuito' : `Taxa: ${formatMoney(ag.signingFee)}`}
                  </span>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <UserCheck size={14} /> Atual
                    </span>
                  ) : (
                    <button
                      disabled={bankBalance < ag.signingFee}
                      onClick={() => {
                        const res = hireAgentById(ag.id);
                        setFeedback(res.message);
                      }}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Check size={14} /> Contratar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
};
