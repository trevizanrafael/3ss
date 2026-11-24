import React, { useState } from 'react';
import { ATTRIBUTE_DEFINITIONS } from '../../../domains/attributes/attributeDefinitions';
import {
  DrillCategory,
  TRAINING_DRILLS_CATALOG,
} from '../../../domains/training/trainingDrillsCatalog';

const CATEGORIES: { id: DrillCategory; label: string }[] = [
  { id: 'RITMO_FISICO', label: 'RITMO & FÍSICO' },
  { id: 'FINALIZACAO', label: 'FINALIZAÇÃO' },
  { id: 'PASSE_CRIACAO', label: 'PASSE & VISÃO' },
  { id: 'DRIBLE', label: 'CONDUÇÃO & DRIBLE' },
  { id: 'DEFESA', label: 'DEFESA & BOTE' },
];

interface DrillPickerModalProps {
  slotIndex: number;
  currentDrillId: string | null;
  onSelect: (drillId: string | null) => void;
  onClose: () => void;
}

export const DrillPickerModal: React.FC<DrillPickerModalProps> = ({
  slotIndex,
  currentDrillId,
  onSelect,
  onClose,
}) => {
  const [cat, setCat] = useState<DrillCategory>('RITMO_FISICO');
  const drills = TRAINING_DRILLS_CATALOG.filter((d) => d.category === cat);

  const attrName = (key: string) =>
    ATTRIBUTE_DEFINITIONS.find((a) => a.key === key)?.label.toUpperCase() ?? key;

  return (
    <div
      data-modal-scope="true"
      className="fixed inset-0 z-50 bg-[#0B0B0D]/90 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-4xl console-tile border-t-[3px] border-t-[#C8A45D] p-6">
        <div className="flex items-center justify-between border-b border-[#242730] pb-3 mb-5">
          <div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-[#C8A45D] font-bold">
              SELECIONAR EXERCÍCIO • SLOT 0{slotIndex + 1}
            </span>
            <h3 className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7]">
              FUNDAMENTOS DE TREINO
            </h3>
          </div>
          <div className="flex items-center gap-4">
            {currentDrillId && (
              <button
                type="button"
                data-pad-x="true"
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                className="px-4 py-2 bg-[#191B20] border border-[#242730] font-condensed uppercase font-bold text-xs tracking-widest text-[#C94040] cursor-pointer"
              >
                ESVAZIAR SLOT
              </button>
            )}
            <button
              type="button"
              data-pad-back="true"
              onClick={onClose}
              className="font-condensed uppercase text-sm tracking-widest text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
            >
              FECHAR [B / ESC]
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-12 gap-6">
          {/* Categorias à Esquerda */}
          <div className="sm:col-span-4 space-y-1.5">
            {CATEGORIES.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                data-autofocus={idx === 0 ? 'true' : undefined}
                onClick={() => setCat(c.id)}
                className={`w-full text-left px-4 py-3 font-condensed uppercase font-bold text-base tracking-wider border-l-[3px] cursor-pointer ${
                  cat === c.id
                    ? 'bg-[#F5F5F7] text-[#0B0B0D] border-l-[#C8A45D]'
                    : 'bg-[#0E0F12] text-[#9498A3] border-l-transparent hover:text-[#F5F5F7]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Exercícios da Categoria à Direita */}
          <div className="sm:col-span-8 space-y-3">
            {drills.map((d) => {
              const selected = d.id === currentDrillId;
              return (
                <button
                  key={d.id}
                  onClick={() => {
                    onSelect(d.id);
                    onClose();
                  }}
                  className={`w-full text-left p-4 border transition-colors cursor-pointer flex items-center justify-between ${
                    selected
                      ? 'bg-[#1C1F26] border-[#C8A45D]'
                      : 'bg-[#0E0F12] border-[#242730] hover:border-[#C8A45D]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2 py-0.5 font-condensed font-extrabold text-xs uppercase ${
                          d.tier === 'OURO'
                            ? 'bg-[#C8A45D] text-[#0B0B0D]'
                            : d.tier === 'PRATA'
                              ? 'bg-[#9498A3] text-[#0B0B0D]'
                              : 'bg-[#8C5E3C] text-[#F5F5F7]'
                        }`}
                      >
                        {d.tier}
                      </span>
                      <span className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7]">
                        {d.name}
                      </span>
                    </div>
                    <div className="text-xs text-[#9498A3] uppercase tracking-wider mt-1.5">
                      EVOLUI: <strong className="text-[#F5F5F7]">{attrName(d.attributes[0])}</strong> +{' '}
                      <strong className="text-[#F5F5F7]">{attrName(d.attributes[1])}</strong>
                    </div>
                  </div>

                  <span className="font-condensed uppercase font-bold text-sm text-[#C8A45D]">
                    ALOCAR ›
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
