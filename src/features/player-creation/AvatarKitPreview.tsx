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
      {/* Cabeçalho estilo Carta Meu Pro FIFA 18 */}
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

      {/* Silhueta Técnica Limpa do Uniforme */}
      <div className="my-auto py-4 flex flex-col items-center">
        <svg viewBox="0 0 180 175" className="w-40 h-40">
          <circle cx="90" cy="30" r="17" fill={appearance.skinTone} />
          {appearance.hairStyle !== 'RASPADO' && (
            <path
              d={
                appearance.hairStyle === 'LONGO'
                  ? 'M71 32 C71 10 109 10 109 32 L112 43 L68 43 Z'
                  : 'M73 27 C73 11 107 11 107 27 Z'
              }
              fill={appearance.hairColor}
            />
          )}
          {appearance.accessory === 'FAIXA_CABECA' && (
            <rect x="73" y="21" width="34" height="4" fill="#F5F5F7" />
          )}

          {/* Mangas */}
          <rect
            x={appearance.sleeveStyle === 'LONGA' ? '38' : '48'}
            y="52"
            width={appearance.sleeveStyle === 'LONGA' ? '24' : '14'}
            height="16"
            fill="#1C1F26"
            stroke="#C8A45D"
            strokeWidth="1"
          />
          <rect
            x="118"
            y="52"
            width={appearance.sleeveStyle === 'LONGA' ? '24' : '14'}
            height="16"
            fill="#1C1F26"
            stroke="#C8A45D"
            strokeWidth="1"
          />

          {/* Camisa */}
          <rect x="60" y="48" width="60" height="62" fill="#16181D" stroke="#C8A45D" strokeWidth="1.5" />
          <text x="90" y="66" textAnchor="middle" fill="#9498A3" fontSize="9" fontWeight="700">
            {(previewPlayer.shirtName || 'PRO').slice(0, 11).toUpperCase()}
          </text>
          <text
            x="90"
            y="98"
            textAnchor="middle"
            fill="#F5F5F7"
            fontSize="30"
            fontWeight="800"
            fontFamily="Barlow Condensed, sans-serif"
          >
            {previewPlayer.shirtNumber}
          </text>

          {/* Calção e Chuteira */}
          <rect x="62" y="110" width="26" height="26" fill="#0B0B0D" stroke="#242730" />
          <rect x="92" y="110" width="26" height="26" fill="#0B0B0D" stroke="#242730" />
          <rect x="67" y="136" width="15" height="22" fill={appearance.skinTone} />
          <rect x="98" y="136" width="15" height="22" fill={appearance.skinTone} />
          <rect x="64" y="158" width="21" height="8" fill={appearance.bootColor} />
          <rect x="95" y="158" width="21" height="8" fill={appearance.bootColor} />
        </svg>

        <div className="font-condensed uppercase font-extrabold text-2xl tracking-wider text-[#F5F5F7] mt-1">
          {previewPlayer.fullName || 'NOVO ATLETA'}
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
