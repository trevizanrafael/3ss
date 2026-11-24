import React, { useState } from 'react';
import { ATTRIBUTE_DEFINITIONS } from '../../../domains/attributes/attributeDefinitions';
import { getOwnedEquipmentBonuses } from '../../../domains/economy/economyActions';
import { getDrillById } from '../../../domains/training/trainingDrillsCatalog';
import { getFifaStatColor } from '../../../shared/ui/FifaStatBadge';
import { StarRating } from '../../../shared/types/common';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';
import { DrillPickerModal } from './DrillPickerModal';

export const TrainingTab: React.FC = () => {
  const {
    player,
    contract,
    calendar,
    drillSlots,
    lastSlotGrades,
    ownedEquipmentIds,
    trainedToday,
    setDrillSlot,
    completeActiveTraining,
  } = useCareerStore();
  const { setActiveTab } = useNavigationStore();

  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  if (!player || !contract) return null;
  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);
  const isTrainingDay = calendar.day === 2 || calendar.day === 4;

  const getAttrLabel = (key: string) =>
    ATTRIBUTE_DEFINITIONS.find((a) => a.key === key)?.label.toUpperCase() ?? key;

  const handleRunActiveSession = () => {
    const roll = Math.random();
    const stars: StarRating = roll < 0.55 ? 3 : roll < 0.88 ? 2 : 1;
    completeActiveTraining(stars);
  };

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      {/* Barra Superior dos 5 Slots (NUNCA avança dias aqui dentro!) */}
      <div className="console-tile px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#C8A45D] font-bold">
            PLANEJAMENTO DE SESSÃO • 5 SLOTS DE TREINO
          </div>
          <div className="text-xs uppercase tracking-wider text-[#9498A3] mt-0.5">
            SIMULAR SEMANA = <strong className="text-[#F5F5F7]">50% AUTOMÁTICO</strong> • JOGAR TREINO ={' '}
            <strong className="text-[#C8A45D]">100% RENDIMENTO</strong> • BÔNUS ESTRUTURA{' '}
            <strong className="text-[#2DBE60]">+{bonuses.trainingXpBonusPct}%</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isTrainingDay && !trainedToday ? (
            <button
              onClick={handleRunActiveSession}
              className="console-btn-primary px-7 py-3 text-base cursor-pointer"
            >
              EXECUTAR SESSÃO DE HOJE (100%) ›
            </button>
          ) : trainedToday ? (
            <button
              onClick={() => setActiveTab('CENTRAL')}
              className="console-btn-primary px-6 py-3 text-base cursor-pointer"
            >
              CONCLUIR E VOLTAR À CENTRAL ›
            </button>
          ) : (
            <span className="px-4 py-2.5 bg-[#0E0F12] border border-[#242730] font-condensed uppercase font-bold text-xs tracking-widest text-[#9498A3]">
              DISPONÍVEL NA TERÇA E QUINTA • CONFIGURE OS SLOTS ABAIXO
            </span>
          )}
        </div>
      </div>

      {/* OS 5 SLOTS VERTICAIS SEPARADOS LADO A LADO */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-4 min-h-0">
        {[0, 1, 2, 3, 4].map((slotIdx) => {
          const drill = getDrillById(drillSlots[slotIdx]);
          const grade = lastSlotGrades[slotIdx];

          if (!drill) {
            return (
              <button
                key={slotIdx}
                onClick={() => setEditingSlot(slotIdx)}
                className="console-tile console-tile-interactive p-5 flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <span className="text-[11px] uppercase tracking-[0.24em] text-[#565A65] mb-3">
                  SLOT 0{slotIdx + 1}
                </span>
                <div className="w-12 h-12 border border-[#323640] group-hover:border-[#C8A45D] flex items-center justify-center font-condensed text-3xl text-[#9498A3] group-hover:text-[#C8A45D]">
                  +
                </div>
                <span className="font-condensed uppercase font-bold text-base tracking-wider text-[#9498A3] group-hover:text-[#F5F5F7] mt-3">
                  ALOCAR TREINO
                </span>
              </button>
            );
          }

          return (
            <div
              key={slotIdx}
              onClick={() => setEditingSlot(slotIdx)}
              className="console-tile console-tile-interactive border-t-[3px] border-t-[#C8A45D] p-5 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#565A65] font-bold">
                    SLOT 0{slotIdx + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {grade && trainedToday && (
                      <span className="px-2 py-0.5 bg-[#2DBE60] text-[#0B0B0D] font-condensed font-extrabold text-xs">
                        NOTA {grade}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 font-condensed font-extrabold text-xs uppercase ${
                        drill.tier === 'OURO'
                          ? 'bg-[#C8A45D] text-[#0B0B0D]'
                          : drill.tier === 'PRATA'
                            ? 'bg-[#9498A3] text-[#0B0B0D]'
                            : 'bg-[#8C5E3C] text-[#F5F5F7]'
                      }`}
                    >
                      {drill.tier}
                    </span>
                  </div>
                </div>

                <h3 className="font-condensed uppercase font-extrabold text-2xl leading-tight text-[#F5F5F7]">
                  {drill.name}
                </h3>
              </div>

              <div className="space-y-4 my-auto py-4 border-y border-[#242730]">
                {drill.attributes.map((attrKey) => {
                  const val = player.attributes[attrKey];
                  const xp = player.attributeXp[attrKey];
                  const color = getFifaStatColor(val);
                  return (
                    <div key={attrKey}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-condensed uppercase font-semibold text-sm text-[#9498A3]">
                          {getAttrLabel(attrKey)}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#2DBE60] font-bold">▲</span>
                          <span
                            className="font-condensed font-extrabold text-2xl leading-none"
                            style={{ color }}
                          >
                            {val}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#0E0F12]">
                        <div className="h-full bg-[#C8A45D]" style={{ width: `${xp}%` }} />
                      </div>
                      <div className="text-[10px] text-right text-[#565A65] mt-0.5">{xp}%</div>
                    </div>
                  );
                })}
              </div>

              <div className="font-condensed uppercase text-xs tracking-widest text-[#9498A3] text-center">
                TROCAR EXERCÍCIO ›
              </div>
            </div>
          );
        })}
      </div>

      {editingSlot !== null && (
        <DrillPickerModal
          slotIndex={editingSlot}
          currentDrillId={drillSlots[editingSlot]}
          onSelect={(id) => setDrillSlot(editingSlot, id)}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  );
};
