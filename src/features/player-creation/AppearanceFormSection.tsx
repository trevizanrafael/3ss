import React from 'react';
import { PlayerAppearance } from '../../domains/player/playerTypes';
import { Panel } from '../../shared/ui/Panel';

const SKIN_TONES = ['#F6D5B8', '#E0AC69', '#C68642', '#8D5524', '#4B2811'];
const HAIR_COLORS = ['#111827', '#451A03', '#92400E', '#EAB308', '#E2E8F0'];
const BOOT_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#38BDF8', '#F8FAFC', '#111827'];

interface AppearanceFormSectionProps {
  appearance: PlayerAppearance;
  onChange: (next: PlayerAppearance) => void;
}

export const AppearanceFormSection: React.FC<AppearanceFormSectionProps> = ({
  appearance,
  onChange,
}) => {
  return (
    <Panel title="Aparência, Camisa & Acessórios" subtitle="Personalização limpa para identificar seu jogador em campo.">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <span className="text-xs text-slate-400 block mb-2">Tom de Pele</span>
          <div className="flex gap-2">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => onChange({ ...appearance, skinTone: tone })}
                className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                  appearance.skinTone === tone ? 'border-emerald-400 scale-110' : 'border-slate-700'
                }`}
                style={{ backgroundColor: tone }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-2">Cor do Cabelo</span>
          <div className="flex gap-2">
            {HAIR_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => onChange({ ...appearance, hairColor: col })}
                className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                  appearance.hairColor === col ? 'border-emerald-400 scale-110' : 'border-slate-700'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-2">Cor da Chuteira</span>
          <div className="flex gap-2">
            {BOOT_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => onChange({ ...appearance, bootColor: col })}
                className={`w-7 h-7 rounded-full border-2 cursor-pointer ${
                  appearance.bootColor === col ? 'border-white scale-110' : 'border-slate-700'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs text-slate-400">Corte de Cabelo</span>
          <select
            value={appearance.hairStyle}
            onChange={(e) => onChange({ ...appearance, hairStyle: e.target.value as PlayerAppearance['hairStyle'] })}
            className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="DEGRADE">Degradê Moderno</option>
            <option value="CURTO">Curto Clássico</option>
            <option value="TRANCA">Tranças / Dreads</option>
            <option value="LONGO">Cabelo Longo</option>
            <option value="RASPADO">Raspado</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Manga da Camisa</span>
          <select
            value={appearance.sleeveStyle}
            onChange={(e) => onChange({ ...appearance, sleeveStyle: e.target.value as PlayerAppearance['sleeveStyle'] })}
            className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="CURTA">Manga Curta</option>
            <option value="LONGA">Manga Longa / Térmica</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-slate-400">Acessório</span>
          <select
            value={appearance.accessory}
            onChange={(e) => onChange({ ...appearance, accessory: e.target.value as PlayerAppearance['accessory'] })}
            className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="NENHUM">Nenhum</option>
            <option value="MUNHEQUEIRA">Munhequeira Branca</option>
            <option value="FAIXA_CABECA">Faixa de Cabeça</option>
            <option value="TORNOZELEIRA">Fita no Tornozelo</option>
            <option value="LUVAS">Luvas de Frio</option>
          </select>
        </label>
      </div>
    </Panel>
  );
};
