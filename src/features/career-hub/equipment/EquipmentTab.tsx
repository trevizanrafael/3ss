import React, { useState } from 'react';
import { CheckCircle2, ShoppingBag, Sparkles } from 'lucide-react';
import { EQUIPMENT_CATALOG } from '../../../data/equipment/catalog';
import { ATTRIBUTE_DEFINITIONS } from '../../../domains/attributes/attributeDefinitions';
import { getOwnedEquipmentBonuses } from '../../../domains/economy/economyActions';
import { Panel } from '../../../shared/ui/Panel';
import { formatMoney } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';

export const EquipmentTab: React.FC = () => {
  const { bankBalance, ownedEquipmentIds, buyEquipmentItem } = useCareerStore();
  const [notice, setNotice] = useState<string | null>(null);

  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);

  const getAttrLabel = (key: string) =>
    ATTRIBUTE_DEFINITIONS.find((a) => a.key === key)?.label ?? key;

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/40 px-4 py-3 text-xs font-semibold text-emerald-300">
          {notice}
        </div>
      )}

      <Panel
        title="Estrutura Pessoal de Alto Rendimento"
        subtitle="Zero gastos fúteis: aqui seu salário vira equipamentos reais que sobem seus atributos 0–99 e aceleram seus treinos."
        rightSlot={
          <div className="text-right text-xs">
            <span className="text-slate-400 block">Bônus Acumulado</span>
            <span className="font-bold text-emerald-400">
              +{bonuses.trainingXpBonusPct}% XP Treino • +{bonuses.staminaRecoveryBonus} Recup.
            </span>
          </div>
        }
      >
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {EQUIPMENT_CATALOG.map((item) => {
            const owned = ownedEquipmentIds.includes(item.id);
            const canAfford = bankBalance >= item.price;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
                  owned
                    ? 'bg-emerald-950/20 border-emerald-500/50'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-white text-base">{item.name}</h3>
                    <Sparkles size={16} className={owned ? 'text-emerald-400' : 'text-amber-400'} />
                  </div>
                  <p className="text-xs text-slate-400 mb-3">{item.description}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(item.instantBoosts).map(([key, val]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                      >
                        +{val} {getAttrLabel(key)}
                      </span>
                    ))}
                    <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-semibold">
                      +{item.trainingXpBonusPct}% XP nos Treinos
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-white tabular-nums">
                    {formatMoney(item.price)}
                  </span>

                  {owned ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                      <CheckCircle2 size={15} /> Instalado
                    </span>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => {
                        const res = buyEquipmentItem(item.id);
                        setNotice(res.message);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ShoppingBag size={14} />
                      Comprar
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
