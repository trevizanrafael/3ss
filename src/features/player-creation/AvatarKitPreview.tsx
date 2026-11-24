import React from 'react';
import { COUNTRIES } from '../../data/countries/countries';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { computeFifaMacroStats } from '../../domains/training/trainingDrillsCatalog';
import { getFifaStatColor } from '../../shared/ui/FifaStatBadge';

interface AvatarKitPreviewProps {
  previewPlayer: CareerPlayer;
}

export const AvatarKitPreview: React.FC<AvatarKitPreviewProps> = ({ previewPlayer }) => {
  const { appearance } = previewPlayer;
  const country = COUNTRIES[previewPlayer.nationality];
  const macros = computeFifaMacroStats(previewPlayer.attributes);

  const macroRows: [string, number][] = [
    ['RIT', macros.ritmo],
    ['DRI', macros.drible],
    ['FIN', macros.finalizacao],
    ['DEF', macros.defesa],
    ['PAS', macros.passe],
    ['FIS', macros.fisico],
  ];

  return (
    <div className="console-tile border-t-[3px] border-t-[#C8A45D] p-6 flex flex-col justify-between h-full">
      {/* Topo da Carta Meu Pro */}
      <div className="flex items-start justify-between border-b border-[#242730] pb-4">
        <div>
          <div
            className="font-condensed font-extrabold text-6xl leading-none"
            style={{ color: getFifaStatColor(previewPlayer.overall) }}
          >
            {previewPlayer.overall}
          </div>
          <div className="font-condensed font-bold text-xl uppercase text-[#F5F5F7] tracking-wider mt-0.5">
            {previewPlayer.position}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl">{country.flag}</div>
          <div className="font-condensed uppercase text-xs tracking-widest text-[#9498A3] mt-1">
            {country.name} • {previewPlayer.age} ANOS
          </div>
          <div className="text-[11px] text-[#565A65] mt-0.5">
            {previewPlayer.heightCm} CM • {previewPlayer.weightKg} KG
          </div>
        </div>
      </div>

      {/* Camisa Técnica Dorsal Limpa (Sem boneco 2D feio — o modelo 3D real entra na Fase 3!) */}
      <div className="my-auto py-3 flex flex-col items-center">
        <svg viewBox="0 0 200 155" className="w-44 h-36">
          {/* Molde Técnico de Camisa de Jogo (Costas) */}
          <path
            d={
              appearance.sleeveStyle === 'LONGA'
                ? 'M68 16 L84 12 L116 12 L132 16 L176 48 L164 70 L140 54 L140 142 L60 142 L60 54 L36 70 L24 48 Z'
                : 'M68 16 L84 12 L116 12 L132 16 L162 38 L148 60 L138 52 L138 142 L62 142 L62 52 L52 60 L38 38 Z'
            }
            fill="#16181D"
            stroke="#C8A45D"
            strokeWidth="2"
          />
          {/* Gola */}
          <path d="M84 12 Q100 22 116 12" fill="none" stroke="#C8A45D" strokeWidth="2" />

          {/* Nome e Número Oficial nas Costas */}
          <text
            x="100"
            y="46"
            textAnchor="middle"
            fill="#9498A3"
            fontSize="11"
            fontWeight="700"
            fontFamily="Barlow Condensed, sans-serif"
            letterSpacing="2"
          >
            {(previewPlayer.shirtName || 'PRO').slice(0, 11).toUpperCase()}
          </text>
          <text
            x="100"
            y="108"
            textAnchor="middle"
            fill="#F5F5F7"
            fontSize="54"
            fontWeight="800"
            fontFamily="Barlow Condensed, sans-serif"
          >
            {previewPlayer.shirtNumber}
          </text>
        </svg>

        <div className="font-condensed uppercase font-extrabold text-2xl tracking-wider text-[#F5F5F7] mt-1">
          {previewPlayer.fullName || 'NOVO ATLETA'}
        </div>
        <div className="flex items-center gap-2 mt-1.5 text-[10px] uppercase tracking-widest text-[#565A65]">
          <span className="inline-block w-3 h-3 border border-[#323640]" style={{ backgroundColor: appearance.skinTone }} />
          <span className="inline-block w-3 h-3 border border-[#323640]" style={{ backgroundColor: appearance.hairColor }} />
          <span className="inline-block w-3 h-3 border border-[#323640]" style={{ backgroundColor: appearance.bootColor }} />
          <span>MODELO 3D RENDERIZADO EM CAMPO</span>
        </div>
      </div>

      {/* 6 Macro-Atributos FIFA */}
      <div className="border-t border-[#242730] pt-4 grid grid-cols-2 gap-x-8 gap-y-2">
        {macroRows.map(([lbl, val]) => (
          <div key={lbl} className="flex items-center justify-between border-b border-[#191B20] pb-1">
            <span className="font-condensed uppercase font-semibold text-sm tracking-widest text-[#9498A3]">
              {lbl}
            </span>
            <span
              className="font-condensed font-extrabold text-xl tabular-nums"
              style={{ color: getFifaStatColor(val) }}
            >
              {val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
