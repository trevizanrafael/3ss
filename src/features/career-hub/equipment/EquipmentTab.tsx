import React from 'react';
import { EQUIPMENT_CATALOG } from '../../../data/equipment/catalog';
import { ATTRIBUTE_DEFINITIONS } from '../../../domains/attributes/attributeDefinitions';
import { formatMoney } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';

interface EquipmentSubViewProps {
  onFeedback: (msg: string) => void;
}

export const EquipmentTab: React.FC<EquipmentSubViewProps> = ({ onFeedback }) => {
  const { bankBalance, ownedEquipmentIds, buyEquipmentItem } = useCareerStore();

  const getAttrLabel = (key: string) =>
    ATTRIBUTE_DEFINITIONS.find((a) => a.key === key)?.label.toUpperCase() ?? key;

  return (
    <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto pr-1 min-h-0">
      {EQUIPMENT_CATALOG.map((item) => {
        const owned = ownedEquipmentIds.includes(item.id);
        const canAfford = bankBalance >= item.price;

        return (
          <div
            key={item.id}
            className={`console-tile p-5 flex flex-col justify-between ${
              owned ? 'border-t-[3px] border-t-[#2DBE60]' : 'border-t-[3px] border-t-[#242730]'
            }`}
          >
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#565A65] mb-1">
                ESTRUTURA PESSOAL
              </div>
              <h4 className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7] leading-tight">
                {item.name}
              </h4>

              <div className="space-y-1 mt-3 pt-3 border-t border-[#242730] text-xs uppercase">
                {Object.entries(item.instantBoosts).map(([k, v]) => (
                  <div key={k} className="text-[#2DBE60] font-condensed font-bold text-sm">
                    +{v} {getAttrLabel(k)}
                  </div>
                ))}
                <div className="text-[#C8A45D] font-condensed font-bold text-sm">
                  +{item.trainingXpBonusPct}% XP NOS SLOTS DE TREINO
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#242730] flex items-center justify-between">
              <span className="font-condensed font-extrabold text-lg text-[#F5F5F7]">
                {formatMoney(item.price)}
              </span>

              {owned ? (
                <span className="font-condensed uppercase font-bold text-xs tracking-widest text-[#2DBE60]">
                  INSTALADO
                </span>
              ) : (
                <button
                  disabled={!canAfford}
                  onClick={() => onFeedback(buyEquipmentItem(item.id).message)}
                  className="console-btn-primary px-4 py-2 text-sm cursor-pointer"
                >
                  ADQUIRIR
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
