import React from 'react';
import { PlayerAppearance } from '../../domains/player/playerTypes';
import { ConsoleStepper } from '../../shared/ui/ConsoleStepper';

const SKIN_TONES = ['#F6D5B8', '#E0AC69', '#C68642', '#8D5524', '#4B2811'];
const HAIR_COLORS = ['#111827', '#451A03', '#92400E', '#EAB308', '#E2E8F0'];
const BOOT_COLORS = ['#C8A45D', '#F5F5F7', '#2DBE60', '#C94040', '#38BDF8', '#181A20'];

interface AppearanceFormSectionProps {
  appearance: PlayerAppearance;
  onChange: (next: PlayerAppearance) => void;
}

export const AppearanceFormSection: React.FC<AppearanceFormSectionProps> = ({
  appearance,
  onChange,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-6">
        <ConsoleStepper
          label="CORTE DE CABELO"
          value={appearance.hairStyle}
          onChange={(v) => onChange({ ...appearance, hairStyle: v })}
          options={[
            { value: 'DEGRADE', label: 'DEGRADÊ' },
            { value: 'CURTO', label: 'CURTO CLÁSSICO' },
            { value: 'TRANCA', label: 'TRANÇAS' },
            { value: 'LONGO', label: 'LONGO' },
            { value: 'RASPADO', label: 'RASPADO' },
          ]}
        />

        <ConsoleStepper
          label="MANGA DO UNIFORME"
          value={appearance.sleeveStyle}
          onChange={(v) => onChange({ ...appearance, sleeveStyle: v })}
          options={[
            { value: 'CURTA', label: 'MANGA CURTA' },
            { value: 'LONGA', label: 'MANGA LONGA' },
          ]}
        />

        <ConsoleStepper
          label="ACESSÓRIO EM CAMPO"
          value={appearance.accessory}
          onChange={(v) => onChange({ ...appearance, accessory: v })}
          options={[
            { value: 'NENHUM', label: 'NENHUM' },
            { value: 'MUNHEQUEIRA', label: 'MUNHEQUEIRA' },
            { value: 'FAIXA_CABECA', label: 'FAIXA' },
            { value: 'TORNOZELEIRA', label: 'FITA TORNOZELO' },
            { value: 'LUVAS', label: 'LUVAS' },
          ]}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-6 pt-2">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-[#9498A3] mb-2">TOM DE PELE</div>
          <div className="flex gap-2">
            {SKIN_TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => onChange({ ...appearance, skinTone: tone })}
                className={`w-9 h-9 border-2 cursor-pointer ${
                  appearance.skinTone === tone ? 'border-[#C8A45D]' : 'border-[#242730]'
                }`}
                style={{ backgroundColor: tone }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-[#9498A3] mb-2">COR DO CABELO</div>
          <div className="flex gap-2">
            {HAIR_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => onChange({ ...appearance, hairColor: col })}
                className={`w-9 h-9 border-2 cursor-pointer ${
                  appearance.hairColor === col ? 'border-[#C8A45D]' : 'border-[#242730]'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-widest text-[#9498A3] mb-2">CHUTEIRA</div>
          <div className="flex gap-2">
            {BOOT_COLORS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => onChange({ ...appearance, bootColor: col })}
                className={`w-9 h-9 border-2 cursor-pointer ${
                  appearance.bootColor === col ? 'border-[#C8A45D]' : 'border-[#242730]'
                }`}
                style={{ backgroundColor: col }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
