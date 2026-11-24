import React from 'react';
import { AttributeKey } from '../../../data/equipment/catalog';
import { POSITION_LABELS } from '../../../domains/attributes/overallCalculator';
import {
  computeFifaMacroStats,
  getDrillById,
} from '../../../domains/training/trainingDrillsCatalog';
import { getFifaStatColor } from '../../../shared/ui/FifaStatBadge';
import { useCareerStore } from '../../../state/useCareerStore';

interface StatColumnConfig {
  title: string;
  macroScore: number;
  items: { key: AttributeKey; label: string }[];
}

export const MyProTab: React.FC = () => {
  const { player, drillSlots, recentLeveledKeys } = useCareerStore();
  if (!player) return null;

  const macros = computeFifaMacroStats(player.attributes);
  const activeTrainingKeys = new Set<AttributeKey>();
  for (const slotId of drillSlots) {
    const drill = getDrillById(slotId);
    if (drill) {
      activeTrainingKeys.add(drill.attributes[0]);
      activeTrainingKeys.add(drill.attributes[1]);
    }
  }

  const columns: StatColumnConfig[] = [
    {
      title: 'RITMO',
      macroScore: macros.ritmo,
      items: [
        { key: 'acceleration', label: 'EXPLOSÃO' },
        { key: 'sprintSpeed', label: 'VELOCIDADE FINAL' },
      ],
    },
    {
      title: 'FINALIZAÇÃO',
      macroScore: macros.finalizacao,
      items: [
        { key: 'finishing', label: 'FINALIZAÇÃO' },
        { key: 'shotPower', label: 'FORÇA DO CHUTE' },
        { key: 'longShots', label: 'CHUTE DE LONGE' },
        { key: 'positioning', label: 'POSICIONAMENTO' },
      ],
    },
    {
      title: 'PASSE',
      macroScore: macros.passe,
      items: [
        { key: 'shortPass', label: 'PASSE CURTO' },
        { key: 'longPass', label: 'PASSE LONGO' },
      ],
    },
    {
      title: 'DRIBLE',
      macroScore: macros.drible,
      items: [
        { key: 'dribbling', label: 'CONDUÇÃO' },
        { key: 'ballControl', label: 'CONTROLE DE BOLA' },
        { key: 'agility', label: 'AGILIDADE' },
        { key: 'balance', label: 'EQUILÍBRIO' },
      ],
    },
    {
      title: 'DEFESA',
      macroScore: macros.defesa,
      items: [
        { key: 'tackling', label: 'DESARME' },
        { key: 'interceptions', label: 'INTERCEPTAÇÃO' },
      ],
    },
    {
      title: 'FÍSICO',
      macroScore: macros.fisico,
      items: [
        { key: 'strength', label: 'FORÇA FÍSICA' },
        { key: 'stamina', label: 'FÔLEGO' },
      ],
    },
  ];

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      {/* Faixa Superior Resumo do Atleta */}
      <div className="console-tile border-l-4 border-l-[#C8A45D] px-6 py-4 flex flex-wrap items-center justify-between gap-6 shrink-0">
        <div className="flex items-center gap-6">
          <div
            className="font-condensed font-extrabold text-6xl leading-none"
            style={{ color: getFifaStatColor(player.overall) }}
          >
            {player.overall}
          </div>
          <div>
            <h2 className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
              {player.fullName}
            </h2>
            <p className="text-xs uppercase tracking-widest text-[#9498A3] mt-1">
              {POSITION_LABELS[player.position]} • PERNA {player.preferredFoot} • {player.heightCm}CM /{' '}
              {player.weightKg}KG
            </p>
          </div>
        </div>

        {/* Legenda Semafórica FIFA 18 */}
        <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest text-[#9498A3]">
          <span>
            <i className="inline-block w-2.5 h-2.5 bg-[#2DBE60] mr-1.5 align-middle" />
            80–99 ELITE
          </span>
          <span>
            <i className="inline-block w-2.5 h-2.5 bg-[#B8C93A] mr-1.5 align-middle" />
            65–79 BOM
          </span>
          <span>
            <i className="inline-block w-2.5 h-2.5 bg-[#D9822B] mr-1.5 align-middle" />
            50–64 MÉDIO
          </span>
          <span>
            <i className="inline-block w-2.5 h-2.5 bg-[#C94040] mr-1.5 align-middle" />
            0–49 FRACO
          </span>
        </div>
      </div>

      {/* 6 Colunas Verticais de Habilidades estilo FIFA 18 */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 min-h-0">
        {columns.map((col) => {
          const macroColor = getFifaStatColor(col.macroScore);
          return (
            <div key={col.title} className="console-tile p-4 flex flex-col">
              {/* Topo da Coluna: Macro-Atributo */}
              <div className="pb-3 mb-4 border-b border-[#242730]">
                <div className="flex items-baseline justify-between">
                  <span className="font-condensed uppercase font-bold text-base tracking-wider text-[#9498A3]">
                    {col.title}
                  </span>
                  <span
                    className="font-condensed font-extrabold text-3xl leading-none"
                    style={{ color: macroColor }}
                  >
                    {col.macroScore}
                  </span>
                </div>
                <div className="w-full h-1 bg-[#0E0F12] mt-2">
                  <div
                    className="h-full"
                    style={{ width: `${col.macroScore}%`, backgroundColor: macroColor }}
                  />
                </div>
              </div>

              {/* Lista Alinhada dos Sub-Atributos 0-99 */}
              <div className="space-y-4">
                {col.items.map((item) => {
                  const val = player.attributes[item.key];
                  const xp = player.attributeXp[item.key];
                  const color = getFifaStatColor(val);
                  const leveled = recentLeveledKeys.includes(item.key);
                  const inSlot = activeTrainingKeys.has(item.key);

                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-condensed uppercase font-semibold text-sm tracking-wide text-[#F5F5F7] truncate pr-1">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(leveled || inSlot) && (
                            <span
                              className={`text-[10px] font-bold ${
                                leveled ? 'text-[#2DBE60]' : 'text-[#C8A45D]'
                              }`}
                              title={leveled ? 'Subiu recentemente!' : 'Alocado no Treino'}
                            >
                              ▲
                            </span>
                          )}
                          <span
                            className="font-condensed font-extrabold text-xl leading-none tabular-nums"
                            style={{ color }}
                          >
                            {val}
                          </span>
                        </div>
                      </div>

                      {/* Barra fina de % até o próximo ponto */}
                      <div className="w-full h-[3px] bg-[#0E0F12]">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${xp}%`,
                            backgroundColor: inSlot ? '#C8A45D' : '#323640',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
