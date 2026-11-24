import React, { useState } from 'react';
import { AGENTS_CATALOG } from '../../../data/agents/catalog';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { formatMoney, formatSquadRole } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { EquipmentTab } from '../equipment/EquipmentTab';

type OfficeSection = 'CONTRATOS' | 'EMPRESARIO' | 'ESTRUTURA';

export const ContractsTab: React.FC = () => {
  const {
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

  const [section, setSection] = useState<OfficeSection>('CONTRATOS');
  const [notice, setNotice] = useState<string | null>(null);

  if (!contract) return null;
  const currentClub = getClubById(contract.clubId);

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      {/* Sub-Menu Seco do Escritório (Sem empilhar seções na mesma tela) */}
      <div className="console-tile px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          {(
            [
              ['CONTRATOS', '01 VÍNCULO & PROPOSTAS'],
              ['EMPRESARIO', '02 EMPRESÁRIOS'],
              ['ESTRUTURA', '03 ESTRUTURA DE TREINO'],
            ] as const
          ).map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => {
                setSection(id);
                setNotice(null);
              }}
              className={`px-5 py-2 font-condensed uppercase font-extrabold text-base tracking-wider cursor-pointer ${
                section === id
                  ? 'bg-[#F5F5F7] text-[#0B0B0D]'
                  : 'bg-[#0E0F12] text-[#9498A3] hover:text-[#F5F5F7]'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {notice ? (
          <span className="font-condensed uppercase text-sm text-[#C8A45D] font-bold">{notice}</span>
        ) : (
          <button
            onClick={requestLoanOrOffersFromAgent}
            className="px-4 py-2 bg-[#191B20] hover:bg-[#242730] border border-[#C8A45D] font-condensed uppercase font-bold text-xs tracking-widest text-[#C8A45D] cursor-pointer"
          >
            {contract.stage === 'YOUTH' ? 'PEDIR REUNIÃO NA BASE ›' : 'SONDAR MERCADO ›'}
          </button>
        )}
      </div>

      {/* VISÃO 01: CONTRATO ATUAL & PROPOSTAS */}
      {section === 'CONTRATOS' && (
        <div className="flex-1 grid lg:grid-cols-12 gap-5 min-h-0">
          <div className="lg:col-span-4 console-tile border-t-[3px] border-t-[#C8A45D] p-6 flex flex-col justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#9498A3]">VÍNCULO ATUAL</span>
              <div className="flex items-center gap-4 mt-4 pb-4 border-b border-[#242730]">
                <ClubCrest
                  clubId={currentClub.id}
                  shortName={currentClub.shortName}
                  primaryColor={currentClub.primaryColor}
                  secondaryColor={currentClub.secondaryColor}
                  pattern={currentClub.pattern}
                  size="lg"
                />
                <div>
                  <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
                    {currentClub.name}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-[#C8A45D] mt-1">
                    {formatSquadRole(contract.role)}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 text-xs uppercase">
                <div className="flex justify-between">
                  <span className="text-[#9498A3]">SALÁRIO MENSAL</span>
                  <span className="font-condensed font-bold text-base text-[#F5F5F7]">
                    {formatMoney(contract.monthlySalary)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9498A3]">BÔNUS POR GOL / ASSIST</span>
                  <span className="font-condensed font-bold text-base text-[#C8A45D]">
                    {formatMoney(contract.goalBonusPerContribution)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9498A3]">DURAÇÃO RESTANTE</span>
                  <span className="font-condensed font-bold text-base text-[#F5F5F7]">
                    {contract.seasonsRemaining} TEMPORADA(S)
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#242730] pt-4">
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">META ATIVA</div>
              <div className="font-condensed uppercase font-bold text-lg text-[#F5F5F7]">
                {contract.seasonGoal.label} ({contract.seasonGoal.current}/{contract.seasonGoal.target})
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 console-tile p-6 flex flex-col overflow-y-auto min-h-0">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#9498A3] pb-3 border-b border-[#242730] mb-4">
              PROPOSTAS OFICIAIS NA MESA
            </div>

            {transitionProposals.length === 0 && marketOffers.length === 0 ? (
              <div className="my-auto text-center">
                <div className="font-condensed uppercase font-bold text-2xl text-[#565A65]">
                  NENHUMA PROPOSTA PENDENTE
                </div>
                <p className="text-xs uppercase tracking-wider text-[#565A65] mt-1">
                  JOGUE A TEMPORADA OU ACIONE O BOTÃO SUPERIOR PARA SONDAR OPÇÕES
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {transitionProposals.map((p) => {
                  const target = getClubById(p.targetClubId);
                  return (
                    <div key={p.id} className="bg-[#0E0F12] border border-[#242730] p-4 flex flex-col justify-between">
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
                            <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7]">
                              {target.name}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-[#C8A45D]">
                              {p.type === 'LOAN_STARTER' ? 'EMPRÉSTIMO 1 ANO' : 'SUBIDA AO PROFISSIONAL'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-[#9498A3] my-2">
                          {formatSquadRole(p.offeredRole)} • <strong className="text-[#F5F5F7]">{formatMoney(p.monthlySalary)}/MÊS</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => acceptYouthTransition(p)}
                        className="console-btn-primary w-full py-2.5 text-sm cursor-pointer mt-2"
                      >
                        ASSINAR ›
                      </button>
                    </div>
                  );
                })}

                {marketOffers.map((o) => {
                  const c = getClubById(o.clubId);
                  return (
                    <div key={o.id} className="bg-[#0E0F12] border border-[#242730] p-4 flex flex-col justify-between">
                      <div className="flex items-center gap-3 mb-3">
                        <ClubCrest
                          clubId={c.id}
                          shortName={c.shortName}
                          primaryColor={c.primaryColor}
                          secondaryColor={c.secondaryColor}
                          pattern={c.pattern}
                          size="md"
                        />
                        <div>
                          <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7]">
                            {c.name}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider text-[#9498A3]">
                            {LEAGUES[c.leagueId].name} • {formatSquadRole(o.role)}
                          </div>
                          <div className="font-condensed font-bold text-sm text-[#C8A45D]">
                            {formatMoney(o.monthlySalary)}/MÊS
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => acceptMarketProposal(o)}
                        className="console-btn-primary w-full py-2.5 text-sm cursor-pointer"
                      >
                        ACEITAR PROPOSTA ›
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISÃO 02: EMPRESÁRIOS */}
      {section === 'EMPRESARIO' && (
        <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-0">
          {AGENTS_CATALOG.map((ag) => {
            const active = ag.id === agentId;
            return (
              <div
                key={ag.id}
                className={`console-tile p-5 flex flex-col justify-between ${
                  active ? 'border-t-[3px] border-t-[#C8A45D]' : ''
                }`}
              >
                <div>
                  <StarRatingBadge stars={ag.stars} size="sm" />
                  <h3 className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] mt-3">
                    {ag.name}
                  </h3>
                  <div className="text-[11px] uppercase tracking-wider text-[#9498A3]">
                    {ag.agencyName}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#242730] space-y-2 text-xs uppercase">
                    <div className="text-[#2DBE60] font-condensed font-bold text-base">
                      +{ag.salaryBonusPct}% EM SALÁRIOS
                    </div>
                    <div className="text-[#9498A3]">
                      {ag.unlocksForeignOffers ? 'PROPOSTAS DO EXTERIOR LIBERADAS' : 'MERCADO NACIONAL'}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#242730] flex items-center justify-between">
                  <span className="font-condensed font-bold text-lg text-[#F5F5F7]">
                    {ag.signingFee === 0 ? 'GRÁTIS' : formatMoney(ag.signingFee)}
                  </span>
                  {active ? (
                    <span className="font-condensed uppercase font-bold text-xs tracking-widest text-[#C8A45D]">
                      ATUAL
                    </span>
                  ) : (
                    <button
                      disabled={bankBalance < ag.signingFee}
                      onClick={() => setNotice(hireAgentById(ag.id).message)}
                      className="console-btn-primary px-4 py-2 text-sm cursor-pointer"
                    >
                      CONTRATAR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISÃO 03: ESTRUTURA DE TREINO */}
      {section === 'ESTRUTURA' && <EquipmentTab onFeedback={setNotice} />}
    </div>
  );
};
