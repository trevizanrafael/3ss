import React, { useState } from 'react';
import { AGENTS_CATALOG } from '../../../data/agents/catalog';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import {
  computePlayerMarketValue,
  evaluateManagerMetaStanding,
  getTransferWindowStatus,
} from '../../../domains/contracts/transferWindowAndValue';
import { findClubLeagueIdInWorld } from '../../../domains/season/worldSeasonEngine';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import {
  formatCompactMoney,
  formatMoney,
  formatSquadRole,
} from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { EquipmentTab } from '../equipment/EquipmentTab';

type OfficeSection = 'CONTRATOS' | 'EMPRESARIO' | 'ESTRUTURA';

export const ContractsTab: React.FC = () => {
  const {
    player,
    contract,
    calendar,
    worldSeason,
    agentId,
    bankBalance,
    awardPrestigeBoost,
    transitionProposals,
    marketOffers,
    acceptYouthTransition,
    acceptMarketProposal,
    requestTransferFromManager,
    requestLoanFromManager,
    withdrawTransferOrLoanRequest,
    hireAgentById,
  } = useCareerStore();

  const [section, setSection] = useState<OfficeSection>('CONTRATOS');
  const [notice, setNotice] = useState<string | null>(null);

  if (!contract || !player) return null;

  const currentClub = getClubById(contract.clubId);
  const parentClub = contract.parentClubId ? getClubById(contract.parentClubId) : null;
  const activeLg = findClubLeagueIdInWorld(worldSeason, contract.clubId);
  const marketValue = computePlayerMarketValue(
    player,
    activeLg,
    contract.seasonGoal,
    calendar.week,
    awardPrestigeBoost,
  );
  const metaStanding = evaluateManagerMetaStanding(contract, calendar.week);
  const windowStatus = getTransferWindowStatus(calendar.week);
  const listStatus = contract.transferStatus ?? 'UNLISTED';

  const SEC_ORDER: OfficeSection[] = ['CONTRATOS', 'EMPRESARIO', 'ESTRUTURA'];
  const cycleSec = (dir: -1 | 1) => {
    const next = SEC_ORDER[(SEC_ORDER.indexOf(section) + dir + SEC_ORDER.length) % SEC_ORDER.length];
    setSection(next);
    setNotice(null);
  };

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      {/* Sub-Menu do Escritório (Navegável via LT / RT) + Status da Janela */}
      <div className="console-tile px-5 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-pad-lt="true"
            data-nav-ignore="true"
            onClick={() => cycleSec(-1)}
            className="cursor-pointer"
          >
            <GamepadBadge action="LT" />
          </button>

          {(
            [
              ['CONTRATOS', '01 VÍNCULO, METAS & JANELA'],
              ['EMPRESARIO', '02 EMPRESÁRIOS'],
              ['ESTRUTURA', '03 ESTRUTURA DE TREINO'],
            ] as const
          ).map(([id, lbl], idx) => (
            <button
              key={id}
              type="button"
              data-autofocus={idx === 0 ? 'true' : undefined}
              onClick={() => {
                setSection(id);
                setNotice(null);
              }}
              className={`px-4 py-2 font-condensed uppercase font-extrabold text-sm md:text-base tracking-wider cursor-pointer ${
                section === id
                  ? 'bg-[#F5F5F7] text-[#0B0B0D]'
                  : 'bg-[#0E0F12] text-[#9498A3] hover:text-[#F5F5F7]'
              }`}
            >
              {lbl}
            </button>
          ))}

          <button
            type="button"
            data-pad-rt="true"
            data-nav-ignore="true"
            onClick={() => cycleSec(1)}
            className="cursor-pointer"
          >
            <GamepadBadge action="RT" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {notice && (
            <span className="font-condensed uppercase text-xs md:text-sm text-[#C8A45D] font-bold">
              {notice}
            </span>
          )}
          <span
            className={`px-3 py-1 border font-condensed uppercase font-extrabold text-xs tracking-widest ${
              windowStatus.isOpen
                ? 'bg-[#092236] border-[#38BDF8] text-[#38BDF8]'
                : 'bg-[#13151C] border-[#242730] text-[#9498A3]'
            }`}
          >
            {windowStatus.isOpen
              ? `● ${windowStatus.windowLabel}`
              : `🔒 JANELA FECHADA • ${windowStatus.nextWindowLabel.toUpperCase()}`}
          </span>
        </div>
      </div>

      {/* VISÃO 01: CONTRATO ATUAL, VALOR DE MERCADO, META DO TÉCNICO & PROPOSTAS DA JANELA */}
      {section === 'CONTRATOS' && (
        <div className="flex-1 grid lg:grid-cols-12 gap-5 min-h-0">
          {/* Coluna Esquerda (5/12): Vínculo, Valor de Mercado, Avaliação da Meta e Ações FIFA 18 */}
          <div className="lg:col-span-5 console-tile border-t-[3px] border-t-[#C8A45D] p-5 flex flex-col justify-between min-h-0 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#9498A3]">
                  {contract.stage === 'LOAN' ? 'ATUAÇÃO POR EMPRÉSTIMO' : 'VÍNCULO PROFISSIONAL ATIVO'}
                </span>
                {listStatus !== 'UNLISTED' && (
                  <span
                    className={`px-2 py-0.5 font-condensed uppercase font-extrabold text-[10px] tracking-widest ${
                      listStatus === 'LOAN_LISTED'
                        ? 'bg-[#D9822B] text-[#0B0B0D]'
                        : 'bg-[#38BDF8] text-[#0B0B0D]'
                    }`}
                  >
                    {listStatus === 'LOAN_LISTED'
                      ? 'NA LISTA DE EMPRÉSTIMOS'
                      : 'NA LISTA DE TRANSFERÊNCIAS'}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#242730]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <ClubCrest clubId={currentClub.id} size="lg" />
                  <div className="min-w-0">
                    <div className="font-condensed uppercase font-extrabold text-2xl md:text-3xl text-[#F5F5F7] leading-none truncate">
                      {currentClub.name}
                    </div>
                    <div className="text-xs uppercase tracking-wider text-[#C8A45D] mt-1">
                      {formatSquadRole(contract.role)}
                      {parentClub ? ` • VINCULADO AO ${parentClub.shortName}` : ''}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 bg-[#0D0F14] border border-[#242730] px-3 py-1.5">
                  <span className="text-[9px] uppercase tracking-widest text-[#9498A3] block">
                    VALOR DE MERCADO
                  </span>
                  <span className="font-condensed font-extrabold text-xl text-[#2DBE60] tabular-nums">
                    {formatCompactMoney(marketValue)}
                  </span>
                </div>
              </div>

              {/* Termos Financeiros */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-[#0E1015] border border-[#242730] p-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#9498A3] block">
                    SALÁRIO / MÊS
                  </span>
                  <span className="font-condensed font-extrabold text-base text-[#F5F5F7] mt-0.5 block">
                    {formatMoney(contract.monthlySalary)}
                  </span>
                </div>
                <div className="bg-[#0E1015] border border-[#242730] p-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#9498A3] block">
                    BÔNUS GOL/ASSIST
                  </span>
                  <span className="font-condensed font-extrabold text-base text-[#C8A45D] mt-0.5 block">
                    {formatMoney(contract.goalBonusPerContribution)}
                  </span>
                </div>
                <div className="bg-[#0E1015] border border-[#242730] p-2.5">
                  <span className="text-[9px] uppercase tracking-wider text-[#9498A3] block">
                    TEMPO RESTANTE
                  </span>
                  <span className="font-condensed font-extrabold text-base text-[#F5F5F7] mt-0.5 block">
                    {contract.stage === 'LOAN' ? 'FIM DA TEMP.' : `${contract.seasonsRemaining} ANO(S)`}
                  </span>
                </div>
              </div>

              {/* Avaliação da Meta & Confiança do Treinador (Estilo FIFA 18) */}
              <div className="bg-[#0E1015] border border-[#242730] p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#9498A3] font-bold">
                    META DO TREINADOR
                  </span>
                  <span
                    className="font-condensed uppercase font-extrabold text-xs tracking-wider"
                    style={{ color: metaStanding.color }}
                  >
                    {metaStanding.statusLabel}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="font-condensed uppercase font-bold text-base text-[#F5F5F7]">
                    {contract.seasonGoal.label}
                  </span>
                  <span
                    className="font-condensed font-extrabold text-lg tabular-nums"
                    style={{ color: metaStanding.color }}
                  >
                    {contract.seasonGoal.current} / {contract.seasonGoal.target}
                  </span>
                </div>

                <div className="w-full h-1.5 bg-[#090A0D]">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (contract.seasonGoal.current / Math.max(1, contract.seasonGoal.target)) * 100,
                      )}%`,
                      backgroundColor: metaStanding.color,
                    }}
                  />
                </div>

                <p className="text-[11px] text-[#9498A3] leading-snug pt-0.5">
                  {metaStanding.managerNote}
                </p>
              </div>
            </div>

            {/* Ações de Carreira junto ao Treinador (FIFA 18 Actions) */}
            <div className="border-t border-[#242730] pt-3.5 mt-3 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3] font-bold">
                MINHAS AÇÕES COM A DIRETORIA (ESTILO FIFA 18)
              </div>

              {contract.stage === 'LOAN' ? (
                <div className="px-3 py-2 bg-[#141720] border border-[#242730] text-xs text-[#9498A3] uppercase">
                  Em empréstimo de 1 temporada. Ao final da temporada você retorna ao{' '}
                  <strong className="text-[#F5F5F7]">{parentClub?.name ?? 'clube de origem'}</strong>.
                </div>
              ) : listStatus !== 'UNLISTED' ? (
                <button
                  type="button"
                  data-focusable="true"
                  onClick={() => setNotice(withdrawTransferOrLoanRequest().message)}
                  className="w-full py-2.5 bg-[#181B24] hover:bg-[#222734] border border-[#9498A3] font-condensed uppercase font-extrabold text-sm tracking-wider text-[#F5F5F7] cursor-pointer"
                >
                  RETIRAR PEDIDO DE SAÍDA (PERMANECER NO CLUBE)
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    data-focusable="true"
                    onClick={() => setNotice(requestLoanFromManager().message)}
                    className="py-2.5 px-3 bg-[#151821] hover:bg-[#1E2330] border border-[#D9822B]/80 font-condensed uppercase font-extrabold text-xs tracking-wider text-[#F5F5F7] cursor-pointer"
                  >
                    PEDIR EMPRÉSTIMO (1 ANO)
                  </button>
                  <button
                    type="button"
                    data-focusable="true"
                    onClick={() => setNotice(requestTransferFromManager().message)}
                    className="py-2.5 px-3 bg-[#121A26] hover:bg-[#182638] border border-[#38BDF8]/80 font-condensed uppercase font-extrabold text-xs tracking-wider text-[#38BDF8] cursor-pointer"
                  >
                    PEDIR TRANSFERÊNCIA
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita (7/12): Mesa da Janela de Transferências */}
          <div className="lg:col-span-7 console-tile p-5 flex flex-col overflow-y-auto min-h-0">
            <div className="flex items-center justify-between pb-3 border-b border-[#242730] mb-4 shrink-0">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#9498A3] font-bold">
                PROPOSTAS OFICIAIS NA MESA ({transitionProposals.length + marketOffers.length})
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#38BDF8] font-condensed font-bold">
                JANELAS: SEM 1–8 • SEM 20–23 • SEM 39–43
              </span>
            </div>

            {transitionProposals.length === 0 && marketOffers.length === 0 ? (
              <div className="my-auto text-center max-w-md mx-auto space-y-2 py-6">
                <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7]">
                  {windowStatus.isOpen
                    ? 'NENHUMA PROPOSTA NA MESA AINDA'
                    : 'JANELA DE TRANSFERÊNCIAS FECHADA'}
                </div>
                <p className="text-xs text-[#9498A3] leading-relaxed">
                  {windowStatus.isOpen
                    ? 'Superar sua meta contratual atrai propostas de compra de clubes maiores automaticamente durante a janela aberta (dias com barra azul). Você também pode pedir Empréstimo ou Transferência ao treinador.'
                    : `Negociações entre clubes só ocorrem durante a Janela Aberta (indicada pela barra azul nos dias do calendário). ${windowStatus.nextWindowLabel}.`}
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {transitionProposals.map((p) => {
                  const target = getClubById(p.targetClubId);
                  return (
                    <div
                      key={p.id}
                      className="bg-[#0E0F12] border border-[#242730] p-4 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <ClubCrest clubId={target.id} size="md" />
                          <div>
                            <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7]">
                              {target.name}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-[#C8A45D]">
                              {p.type === 'LOAN_STARTER'
                                ? 'EMPRÉSTIMO 1 ANO'
                                : 'SUBIDA AO PROFISSIONAL'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-[#9498A3] my-2">
                          {formatSquadRole(p.offeredRole)} •{' '}
                          <strong className="text-[#F5F5F7]">
                            {formatMoney(p.monthlySalary)}/MÊS
                          </strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        data-focusable="true"
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
                  const isExternal = o.offerType === 'TRANSFER' || o.offerType === 'LOAN';
                  const canAccept = !isExternal || windowStatus.isOpen;
                  const typeBadge =
                    o.offerType === 'RENEWAL'
                      ? { label: 'RENOVAÇÃO DE CONTRATO', color: '#C8A45D' }
                      : o.offerType === 'LOAN'
                        ? { label: 'EMPRÉSTIMO (1 TEMPORADA)', color: '#D9822B' }
                        : { label: 'COMPRA DEFINITIVA', color: '#38BDF8' };

                  return (
                    <div
                      key={o.id}
                      style={{ borderLeftColor: typeBadge.color }}
                      className="bg-[#0E0F12] border border-[#242730] border-l-[3px] p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className="font-condensed uppercase font-extrabold text-[10px] tracking-widest"
                            style={{ color: typeBadge.color }}
                          >
                            {typeBadge.label}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-[#9498A3]">
                            {o.years} ANO(S)
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <ClubCrest clubId={c.id} size="md" />
                          <div className="min-w-0">
                            <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7] leading-tight truncate">
                              {c.name}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-[#9498A3] truncate">
                              {LEAGUES[c.leagueId].name} • {formatSquadRole(o.role)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#1D2029] space-y-1 text-xs uppercase">
                          {o.offerType === 'TRANSFER' && o.transferFee !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-[#9498A3]">VALOR DA COMPRA</span>
                              <strong className="font-condensed text-sm text-[#38BDF8]">
                                {formatCompactMoney(o.transferFee)}
                              </strong>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-[#9498A3]">SALÁRIO OFERECIDO</span>
                            <strong className="font-condensed text-sm text-[#2DBE60]">
                              {formatMoney(o.monthlySalary)}/MÊS
                            </strong>
                          </div>
                          {Boolean(o.signingBonus && o.signingBonus > 0) && (
                            <div className="flex justify-between">
                              <span className="text-[#9498A3]">LUVAS NA ASSINATURA</span>
                              <strong className="font-condensed text-sm text-[#C8A45D]">
                                +{formatMoney(o.signingBonus!)}
                              </strong>
                            </div>
                          )}
                        </div>

                        {o.reasonTag && (
                          <div className="mt-2 text-[10px] uppercase tracking-wider text-[#565A65] truncate">
                            {o.reasonTag}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        data-focusable="true"
                        disabled={!canAccept}
                        onClick={() => acceptMarketProposal(o)}
                        className="console-btn-primary w-full py-2 text-sm cursor-pointer"
                      >
                        {o.offerType === 'RENEWAL'
                          ? 'RENOVAR VÍNCULO ›'
                          : o.offerType === 'LOAN'
                            ? 'ACEITAR EMPRÉSTIMO ›'
                            : 'ACEITAR TRANSFERÊNCIA ›'}
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
                      type="button"
                      data-focusable="true"
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
