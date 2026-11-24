import React, { useState } from 'react';
import { AttributeKey } from '../../../data/equipment/catalog';
import { POSITION_LABELS } from '../../../domains/attributes/overallCalculator';
import {
  computeFifaMacroStats,
  getDrillById,
} from '../../../domains/training/trainingDrillsCatalog';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { getFifaStatColor } from '../../../shared/ui/FifaStatBadge';
import { useCareerStore } from '../../../state/useCareerStore';
import { TrophyCabinetView } from './TrophyCabinetView';

interface StatColumnConfig {
  title: string;
  macroScore: number;
  items: { key: AttributeKey; label: string }[];
}

export const MyProTab: React.FC = () => {
  const { player, drillSlots, recentLeveledKeys, trophyCabinet } = useCareerStore();
  const [subView, setSubView] = useState<'STATS' | 'TROPHIES'>('STATS');

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

  const toggleSubView = () =>
    setSubView((curr) => (curr === 'STATS' ? 'TROPHIES' : 'STATS'));

  return (
    <div className="h-full flex flex-col gap-5 min-h-0">
      {/* Faixa Superior Resumo do Atleta + Seletor LT/RT Sala de Troféus */}
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

        {/* Sub-Abas Console: 01 HABILIDADES | 02 SALA DE TROFÉUS (LT / RT) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-pad-lt="true"
            data-nav-ignore="true"
            onClick={toggleSubView}
            className="cursor-pointer mr-1"
          >
            <GamepadBadge action="LT" />
          </button>

          <button
            type="button"
            data-focusable="true"
            data-autofocus="true"
            onClick={() => setSubView('STATS')}
            className={`px-4 py-2 font-condensed uppercase font-extrabold text-sm tracking-wider border transition-colors cursor-pointer ${
              subView === 'STATS'
                ? 'bg-[#F5F5F7] text-[#0B0B0D] border-[#F5F5F7]'
                : 'bg-[#14161B] text-[#9498A3] border-[#242730] hover:text-[#F5F5F7]'
            }`}
          >
            01 HABILIDADES 0–99
          </button>

          <button
            type="button"
            data-focusable="true"
            onClick={() => setSubView('TROPHIES')}
            className={`px-4 py-2 font-condensed uppercase font-extrabold text-sm tracking-wider border transition-colors cursor-pointer ${
              subView === 'TROPHIES'
                ? 'bg-[#C8A45D] text-[#0B0B0D] border-[#C8A45D]'
                : 'bg-[#14161B] text-[#9498A3] border-[#242730] hover:text-[#F5F5F7]'
            }`}
          >
            02 SALA DE TROFÉUS ({trophyCabinet.length})
          </button>

          <button
            type="button"
            data-pad-rt="true"
            data-nav-ignore="true"
            onClick={toggleSubView}
            className="cursor-pointer ml-1"
          >
            <GamepadBadge action="RT" />
          </button>
        </div>
      </div>

      {/* Visão 01: 6 Colunas Verticais de Habilidades estilo FIFA 18 | Visão 02: Sala de Troféus */}
      {subView === 'TROPHIES' ? (
        <TrophyCabinetView />
      ) : (
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 min-h-0">
          {columns.map((col) => {
            const macroColor = getFifaStatColor(col.macroScore);
            return (
              <div key={col.title} className="console-tile p-4 flex flex-col">
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
      )}
    </div>
  );
};
