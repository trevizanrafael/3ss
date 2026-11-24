import React from 'react';
import { CheckCircle2, Dumbbell, Zap } from 'lucide-react';
import { getClubById } from '../../../data/clubs';
import { ATTRIBUTE_DEFINITIONS } from '../../../domains/attributes/attributeDefinitions';
import { getOwnedEquipmentBonuses } from '../../../domains/economy/economyActions';
import { Panel } from '../../../shared/ui/Panel';
import { StatProgressBar } from '../../../shared/ui/StatProgressBar';
import { StarRating } from '../../../shared/types/common';
import { useCareerStore } from '../../../state/useCareerStore';

export const TrainingTab: React.FC = () => {
  const {
    player,
    contract,
    calendar,
    focusedAttributes,
    ownedEquipmentIds,
    trainedToday,
    toggleFocusAttribute,
    completeActiveTraining,
    advanceDay,
  } = useCareerStore();

  if (!player || !contract) return null;
  const club = getClubById(contract.clubId);
  const bonuses = getOwnedEquipmentBonuses(ownedEquipmentIds);
  const isTrainingDay = calendar.day === 2 || calendar.day === 4;

  const handlePlaySession = (intensity: 'NORMAL' | 'INTENSO') => {
    const roll = Math.random();
    const stars: StarRating =
      intensity === 'INTENSO'
        ? roll < 0.55
          ? 3
          : roll < 0.88
            ? 2
            : 1
        : roll < 0.3
          ? 3
          : 2;
    completeActiveTraining(stars);
  };

  return (
    <div className="space-y-6">
      {/* Explicação e Ação do Sistema 50% Automático vs 100% Jogado */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              50% Automático • 100% Jogando
            </span>
            <span className="text-xs text-slate-400">
              Estrutura do {club.name}: <strong className="text-white">{club.youthQuality}/99</strong> •
              Bônus de Equipamentos: <strong className="text-emerald-400">+{bonuses.trainingXpBonusPct}% XP</strong>
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">Centro de Treinamento & Atributos (0–99)</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Selecione até <strong>3 atributos em foco</strong> clicando nos cards abaixo. Toda Terça e Quinta,
            se você só avançar os dias, ganha <strong>50% do progresso automaticamente</strong> sem precisar clicar em simular.
            Se quiser treinar hoje em campo, ganha até <strong>100%</strong>!
          </p>
        </div>

        <div className="shrink-0">
          {isTrainingDay && !trainedToday ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePlaySession('NORMAL')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white cursor-pointer"
              >
                <Dumbbell size={16} className="text-emerald-400" />
                Fazer Treino Técnico (100% Seguro)
              </button>
              <button
                onClick={() => handlePlaySession('INTENSO')}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold cursor-pointer"
              >
                <Zap size={16} />
                Treino Intenso 3★ (Bônus Máximo)
              </button>
            </div>
          ) : trainedToday ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <CheckCircle2 size={16} /> Sessão de 100% concluída hoje!
            </div>
          ) : (
            <button
              onClick={advanceDay}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Hoje não é Terça/Quinta • Avançar +1 Dia
            </button>
          )}
        </div>
      </div>

      {/* Grupos de Atributos 0-99 */}
      {(
        [
          { key: 'FISICO', title: 'Atributos Físicos & Explosão' },
          { key: 'TECNICO', title: 'Atributos Técnicos & Finalização' },
          { key: 'DEF_TATICO', title: 'Atributos Defensivos & Leitura Tática' },
        ] as const
      ).map((grp) => (
        <Panel
          key={grp.key}
          title={grp.title}
          subtitle="Clique em um atributo para colocá-lo entre seus 3 focos semanais."
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ATTRIBUTE_DEFINITIONS.filter((a) => a.group === grp.key).map((attr) => (
              <StatProgressBar
                key={attr.key}
                label={attr.label}
                value={player.attributes[attr.key]}
                progressPct={player.attributeXp[attr.key]}
                isFocused={focusedAttributes.includes(attr.key)}
                onToggleFocus={() => toggleFocusAttribute(attr.key)}
              />
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
};
