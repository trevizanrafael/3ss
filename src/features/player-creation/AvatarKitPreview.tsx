import React from 'react';
import { COUNTRIES } from '../../data/countries/countries';
import { POSITION_LABELS } from '../../domains/attributes/overallCalculator';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { getOvrBadgeStyle } from '../../shared/utils/formatters';

interface AvatarKitPreviewProps {
  previewPlayer: CareerPlayer;
}

export const AvatarKitPreview: React.FC<AvatarKitPreviewProps> = ({ previewPlayer }) => {
  const { appearance } = previewPlayer;
  const country = COUNTRIES[previewPlayer.nationality];

  return (
    <div className="rounded-2xl bg-gradient-to-b from-emerald-950/60 via-slate-900 to-slate-900 border border-slate-800 p-5 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
          Ficha de Peneira • {country.flag} {country.name}
        </span>
        <span className={`px-2.5 py-1 rounded-lg border text-sm font-bold ${getOvrBadgeStyle(previewPlayer.overall)}`}>
          {previewPlayer.overall} OVR
        </span>
      </div>

      {/* Estilização limpa do Atleta + Camisa de costas */}
      <div className="relative w-48 h-52 flex items-center justify-center my-2">
        <svg viewBox="0 0 180 200" className="w-full h-full drop-shadow-xl">
          {/* Cabeça e Cabelo */}
          <circle cx="90" cy="40" r="20" fill={appearance.skinTone} />
          {appearance.hairStyle !== 'RASPADO' && (
            <path
              d={
                appearance.hairStyle === 'LONGO'
                  ? 'M68 42 C68 15 112 15 112 42 L115 54 L65 54 Z'
                  : 'M70 36 C70 16 110 16 110 36 Z'
              }
              fill={appearance.hairColor}
            />
          )}
          {appearance.accessory === 'FAIXA_CABECA' && (
            <rect x="70" y="28" width="40" height="5" rx="2" fill="#f8fafc" />
          )}

          {/* Mangas */}
          <rect
            x={appearance.sleeveStyle === 'LONGA' ? '36' : '46'}
            y="64"
            width={appearance.sleeveStyle === 'LONGA' ? '26' : '16'}
            height="18"
            rx="6"
            fill="#10b981"
          />
          <rect
            x="118"
            y="64"
            width={appearance.sleeveStyle === 'LONGA' ? '26' : '16'}
            height="18"
            rx="6"
            fill="#10b981"
          />

          {/* Tronco / Camisa */}
          <rect x="58" y="60" width="64" height="68" rx="10" fill="#059669" stroke="#34d399" strokeWidth="2" />

          {/* Nome e Número nas costas */}
          <text x="90" y="80" textAnchor="middle" fill="#ecfdf5" fontSize="10" fontWeight="700">
            {(previewPlayer.shirtName || 'CRAQUE').slice(0, 11).toUpperCase()}
          </text>
          <text x="90" y="113" textAnchor="middle" fill="#ffffff" fontSize="30" fontWeight="800" fontFamily="Rajdhani, sans-serif">
            {previewPlayer.shirtNumber}
          </text>

          {/* Calção */}
          <rect x="61" y="126" width="27" height="30" rx="4" fill="#0f172a" />
          <rect x="92" y="126" width="27" height="30" rx="4" fill="#0f172a" />

          {/* Pernas e Chuteiras */}
          <rect x="66" y="156" width="16" height="26" fill={appearance.skinTone} />
          <rect x="98" y="156" width="16" height="26" fill={appearance.skinTone} />
          <rect x="63" y="180" width="22" height="10" rx="4" fill={appearance.bootColor} />
          <rect x="95" y="180" width="22" height="10" rx="4" fill={appearance.bootColor} />
        </svg>
      </div>

      <div className="text-center mt-1">
        <h3 className="text-lg font-bold text-white">{previewPlayer.fullName || 'Novo Atleta'}</h3>
        <p className="text-xs text-slate-400">
          {POSITION_LABELS[previewPlayer.position]} • {previewPlayer.age} anos • {previewPlayer.heightCm}cm / {previewPlayer.weightKg}kg
        </p>
      </div>

      <div className="w-full grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800 text-center">
        {[
          { lbl: 'EXP', val: previewPlayer.attributes.acceleration },
          { lbl: 'FIN', val: previewPlayer.attributes.finishing },
          { lbl: 'PAS', val: previewPlayer.attributes.shortPass },
          { lbl: 'DES', val: previewPlayer.attributes.tackling },
        ].map((st) => (
          <div key={st.lbl} className="rounded-lg bg-slate-950/70 p-2 border border-slate-800">
            <div className="text-[10px] text-slate-400">{st.lbl}</div>
            <div className="text-sm font-bold text-white tabular-nums">{st.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
