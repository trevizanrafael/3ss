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
  { value: '#14171F', label: 'PRETO NATURAL', colorSwatch: '#14171F' },
  { value: '#3B1E08', label: 'CASTANHO ESCURO', colorSwatch: '#3B1E08' },
  { value: '#783F12', label: 'CASTANHO CLARO', colorSwatch: '#783F12' },
  { value: '#E8A838', label: 'LOIRO DOURADO', colorSwatch: '#E8A838' },
  { value: '#F4D06F', label: 'LOIRO CLARO', colorSwatch: '#F4D06F' },
  { value: '#E2E8F0', label: 'NEVADO / PLATINADO', colorSwatch: '#E2E8F0' },
  { value: '#B44318', label: 'RUIVO COBRE', colorSwatch: '#B44318' },
  { value: '#64748B', label: 'GRISALHO', colorSwatch: '#64748B' },
];

const EYE_COLOR_OPTIONS = [
  { value: '#261C1A', label: 'PRETO / EXPRESSO', colorSwatch: '#261C1A' },
  { value: '#5C3A21', label: 'CASTANHO MEL', colorSwatch: '#5C3A21' },
  { value: '#2E6F40', label: 'VERDE ESMERALDA', colorSwatch: '#2E6F40' },
  { value: '#2563EB', label: 'AZUL CLARO', colorSwatch: '#2563EB' },
  { value: '#64748B', label: 'CINZA', colorSwatch: '#64748B' },
];

const BOOT_COLOR_OPTIONS = [
  { value: '#E5C687', label: 'DOURADO CHAMPAGNE', colorSwatch: '#E5C687' },
  { value: '#F5F5F7', label: 'BRANCO GELO', colorSwatch: '#F5F5F7' },
  { value: '#14161C', label: 'PRETO CLÁSSICO', colorSwatch: '#14161C' },
  { value: '#2DBE60', label: 'VERDE VELOCIDADE', colorSwatch: '#2DBE60' },
  { value: '#EC4899', label: 'ROSA / MAGENTA PRO', colorSwatch: '#EC4899' },
  { value: '#38BDF8', label: 'AZUL TURQUESA', colorSwatch: '#38BDF8' },
  { value: '#EF4444', label: 'VERMELHO PREDATOR', colorSwatch: '#EF4444' },
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
      <div className="space-y-3">
        <ConsoleStepper
          autoFocus
          label="TOM DE PELE"
          value={appearance.skinTone}
          onChange={(v) => onChange({ ...appearance, skinTone: v })}
          options={SKIN_OPTIONS}
        />

        <ConsoleStepper
          label="ESTILO DE CABELO (10 MODELOS)"
          value={appearance.hairStyle}
          onChange={(v) => onChange({ ...appearance, hairStyle: v })}
          options={[
            { value: 'DEGRADE', label: 'CORTE RETO / DEGRADÊ NA RÉGUA' },
            { value: 'ARREPIADO', label: 'ARREPIADO / FRANJA TEXTURIZADA' },
            { value: 'TOPETE', label: 'TOPETE ALTO / QUIFF' },
            { value: 'CURTO', label: 'SOCIAL CLÁSSICO DE LADO' },
            { value: 'AFRO', label: 'BLACK POWER / AFRO' },
            { value: 'TRANCA', label: 'TRANÇAS / DREADLOCKS' },
            { value: 'MOICANO', label: 'MOICANO / MULLET' },
            { value: 'COQUE', label: 'COQUE SAMURAI / TOP KNOT' },
            { value: 'LONGO', label: 'CABELO LONGO NOS OMBROS' },
            { value: 'RASPADO', label: 'RASPADO / MÁQUINA ZERO' },
          ]}
        />

        <ConsoleStepper
          label="COR DO CABELO"
          value={appearance.hairColor}
          onChange={(v) => onChange({ ...appearance, hairColor: v })}
          options={HAIR_COLOR_OPTIONS}
        />

        <div className="grid sm:grid-cols-2 gap-3">
          <ConsoleStepper
            label="EXPRESSÃO DO ROSTO"
            value={appearance.expression ?? 'CONFIANTE'}
            onChange={(v) => onChange({ ...appearance, expression: v })}
            options={[
              { value: 'CONFIANTE', label: 'SORRISO CONFIANTE' },
              { value: 'FOCADO', label: 'FOCADO / SÉRIO' },
              { value: 'ALEGRE', label: 'SORRISO ABERTO' },
              { value: 'MARRENTO', label: 'MARRENTO' },
            ]}
          />

          <ConsoleStepper
            label="BARBA & BIGODE"
            value={appearance.facialHair ?? 'LIMPO'}
            onChange={(v) => onChange({ ...appearance, facialHair: v })}
            options={[
              { value: 'LIMPO', label: 'ROSTO LIMPO' },
              { value: 'BIGODE', label: 'BIGODE' },
              { value: 'CAVANHAQUE', label: 'CAVANHAQUE' },
              { value: 'BARBA_BAIXA', label: 'BARBA BAIXA' },
              { value: 'BARBA_CHEIA', label: 'BARBA FECHADA' },
            ]}
          />
        </div>

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
          { value: 'DENTRO_CALCAO', label: 'POR DENTRO DO CALÇÃO' },
        ]}
      />

      <ConsoleStepper
        label="COMPRIMENTO DA MANGA"
        value={appearance.sleeveStyle}
        onChange={(v) => onChange({ ...appearance, sleeveStyle: v })}
        options={[
          { value: 'CURTA', label: 'MANGA CURTA COM 3 LISTRAS' },
          { value: 'LONGA', label: 'MANGA LONGA DO UNIFORME' },
          { value: 'TERMICA', label: 'MANGA CURTA + TÉRMICA PRETA' },
        ]}
      />

      <ConsoleStepper
        label="ALTURA DO MEIÃO LISTRADO"
        value={appearance.sockHeight ?? 'PADRAO'}
        onChange={(v) => onChange({ ...appearance, sockHeight: v })}
        options={[
          { value: 'PADRAO', label: 'MEIÃO PADRÃO' },
          { value: 'ALTO', label: 'MEIÃO ALTO' },
          { value: 'BAIXO', label: 'MEIÃO BAIXO (MEIA-CANELA)' },
        ]}
      />

      <ConsoleStepper
        label="ACESSÓRIO DE CAMPO"
        value={appearance.accessory}
        onChange={(v) => onChange({ ...appearance, accessory: v })}
        options={[
          { value: 'NENHUM', label: 'NENHUM ACESSÓRIO' },
          { value: 'MUNHEQUEIRA', label: 'MUNHEQUEIRA BRANCA' },
          { value: 'FAIXA_CABECA', label: 'FAIXA NA TESTA' },
          { value: 'TORNOZELEIRA', label: 'FITA NO TORNOZELO' },
          { value: 'LUVAS', label: 'LUVAS DE INVERNO' },
        ]}
      />

      <ConsoleStepper
        label="COR DA CHUTEIRA"
        value={appearance.bootColor}
        onChange={(v) => onChange({ ...appearance, bootColor: v })}
        options={BOOT_COLOR_OPTIONS}
      />
    </div>
  );
};
