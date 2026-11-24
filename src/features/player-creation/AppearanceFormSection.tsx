import React from 'react';
import { PlayerAppearance } from '../../domains/player/playerTypes';
import { ConsoleStepper } from '../../shared/ui/ConsoleStepper';

const SKIN_OPTIONS = [
  { value: '#FADCC4', label: 'PELE MUITO CLARA', colorSwatch: '#FADCC4' },
  { value: '#F1C29B', label: 'PELE CLARA', colorSwatch: '#F1C29B' },
  { value: '#E0AC69', label: 'MORENA CLARA', colorSwatch: '#E0AC69' },
  { value: '#C68642', label: 'PARDA / BRONZE', colorSwatch: '#C68642' },
  { value: '#9F6334', label: 'MORENA ESCURA', colorSwatch: '#9F6334' },
  { value: '#6F3F1D', label: 'NEGRA MÉDIA', colorSwatch: '#6F3F1D' },
  { value: '#3F220F', label: 'NEGRA RETINTA', colorSwatch: '#3F220F' },
];

const HAIR_COLOR_OPTIONS = [
  { value: '#111827', label: 'PRETO NATURAL', colorSwatch: '#111827' },
  { value: '#3B1E08', label: 'CASTANHO ESCURO', colorSwatch: '#3B1E08' },
  { value: '#783F12', label: 'CASTANHO CLARO', colorSwatch: '#783F12' },
  { value: '#D4A017', label: 'LOIRO DOURADO', colorSwatch: '#D4A017' },
  { value: '#9A3412', label: 'RUIVO COBRE', colorSwatch: '#9A3412' },
  { value: '#E2E8F0', label: 'PLATINADO / NEVADO', colorSwatch: '#E2E8F0' },
];

const EYE_COLOR_OPTIONS = [
  { value: '#3B2F2F', label: 'CASTANHO ESCURO', colorSwatch: '#3B2F2F' },
  { value: '#7C5329', label: 'MEL / ÂMBAR', colorSwatch: '#7C5329' },
  { value: '#2E6F40', label: 'VERDE ESMERALDA', colorSwatch: '#2E6F40' },
  { value: '#2563EB', label: 'AZUL CLARO', colorSwatch: '#2563EB' },
  { value: '#64748B', label: 'CINZA ACOBREADO', colorSwatch: '#64748B' },
];

const BOOT_COLOR_OPTIONS = [
  { value: '#C8A45D', label: 'OURO ELITE', colorSwatch: '#C8A45D' },
  { value: '#F5F5F7', label: 'BRANCO GELO', colorSwatch: '#F5F5F7' },
  { value: '#14161C', label: 'PRETO CLÁSSICO', colorSwatch: '#14161C' },
  { value: '#2DBE60', label: 'VERDE VELOCIDADE', colorSwatch: '#2DBE60' },
  { value: '#C94040', label: 'VERMELHO PREDATOR', colorSwatch: '#C94040' },
  { value: '#38BDF8', label: 'AZUL TURQUESA', colorSwatch: '#38BDF8' },
  { value: '#F97316', label: 'LARANJA SOLAR', colorSwatch: '#F97316' },
];

interface AppearanceFormSectionProps {
  mode: 'CABECA' | 'UNIFORME';
  appearance: PlayerAppearance;
  onChange: (next: PlayerAppearance) => void;
}

export const AppearanceFormSection: React.FC<AppearanceFormSectionProps> = ({
  mode,
  appearance,
  onChange,
}) => {
  if (mode === 'CABECA') {
    return (
      <div className="space-y-3.5">
        <ConsoleStepper
          autoFocus
          label="TOM DE PELE"
          value={appearance.skinTone}
          onChange={(v) => onChange({ ...appearance, skinTone: v })}
          options={SKIN_OPTIONS}
        />

        <ConsoleStepper
          label="ESTILO DE CABELO"
          value={appearance.hairStyle}
          onChange={(v) => onChange({ ...appearance, hairStyle: v })}
          options={[
            { value: 'DEGRADE', label: 'DEGRADÊ / FADE' },
            { value: 'CURTO', label: 'CURTO CLÁSSICO' },
            { value: 'TOPETE', label: 'TOPETE / POMPADOUR' },
            { value: 'TRANCA', label: 'TRANÇAS / BRAIDS' },
            { value: 'AFRO', label: 'BLACK POWER / AFRO' },
            { value: 'LONGO', label: 'LONGO SOLTO' },
            { value: 'RASPADO', label: 'RASPADO / BUZZ' },
          ]}
        />

        <ConsoleStepper
          label="COR DO CABELO"
          value={appearance.hairColor}
          onChange={(v) => onChange({ ...appearance, hairColor: v })}
          options={HAIR_COLOR_OPTIONS}
        />

        <ConsoleStepper
          label="BARBA & PELOS FACIAIS"
          value={appearance.facialHair ?? 'LIMPO'}
          onChange={(v) => onChange({ ...appearance, facialHair: v })}
          options={[
            { value: 'LIMPO', label: 'ROSTO LIMPO (SEM BARBA)' },
            { value: 'CAVANHAQUE', label: 'BIGODE & CAVANHAQUE' },
            { value: 'BARBA_BAIXA', label: 'BARBA BAIXA DESENHADA' },
            { value: 'BARBA_CHEIA', label: 'BARBA CHEIA FECHADA' },
          ]}
        />

        <ConsoleStepper
          label="COR DOS OLHOS"
          value={appearance.eyeColor}
          onChange={(v) => onChange({ ...appearance, eyeColor: v })}
          options={EYE_COLOR_OPTIONS}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <ConsoleStepper
        autoFocus
        label="CAIMENTO DA CAMISA"
        value={appearance.shirtTuck}
        onChange={(v) => onChange({ ...appearance, shirtTuck: v })}
        options={[
          { value: 'SOLTA', label: 'CAMISA SOLTA (POR FORA)' },
          { value: 'DENTRO_CALCAO', label: 'POR DENTRO DO CALÇÃO (CLÁSSICO)' },
        ]}
      />

      <ConsoleStepper
        label="COMPRIMENTO DA MANGA"
        value={appearance.sleeveStyle}
        onChange={(v) => onChange({ ...appearance, sleeveStyle: v })}
        options={[
          { value: 'CURTA', label: 'MANGA CURTA' },
          { value: 'LONGA', label: 'MANGA LONGA DO UNIFORME' },
          { value: 'TERMICA', label: 'MANGA CURTA + TÉRMICA PRETA' },
        ]}
      />

      <ConsoleStepper
        label="ALTURA DO MEIÃO"
        value={appearance.sockHeight ?? 'PADRAO'}
        onChange={(v) => onChange({ ...appearance, sockHeight: v })}
        options={[
          { value: 'PADRAO', label: 'MEIÃO PADRÃO' },
          { value: 'ALTO', label: 'MEIÃO ALTO (ACIMA DO JOELHO)' },
          { value: 'BAIXO', label: 'MEIÃO BAIXO (ESTILO MEIA-CANELA)' },
        ]}
      />

      <ConsoleStepper
        label="ACESSÓRIO DE CAMPO"
        value={appearance.accessory}
        onChange={(v) => onChange({ ...appearance, accessory: v })}
        options={[
          { value: 'NENHUM', label: 'NENHUM ACESSÓRIO' },
          { value: 'MUNHEQUEIRA', label: 'MUNHEQUEIRA BRANCA DUPLA' },
          { value: 'TORNOZELEIRA', label: 'ESPARADRAPO NO TORNOZELO' },
          { value: 'LUVAS', label: 'LUVAS TÉRMICAS DE INVERNO' },
          { value: 'FAIXA_CABECA', label: 'FAIXA NA CABEÇA' },
        ]}
      />

      <ConsoleStepper
        label="CHUTEIRA"
        value={appearance.bootColor}
        onChange={(v) => onChange({ ...appearance, bootColor: v })}
        options={BOOT_COLOR_OPTIONS}
      />
    </div>
  );
};
