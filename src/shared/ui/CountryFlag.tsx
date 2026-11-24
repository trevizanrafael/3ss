import React, { useState } from 'react';
import { CountryCode } from '../../shared/types/common';

const FLAG_ISO_MAP: Record<CountryCode, string> = {
  // CONMEBOL
  BRA: 'br',
  ARG: 'ar',
  URU: 'uy',
  COL: 'co',
  ECU: 'ec',
  PAR: 'py',
  VEN: 've',
  CHI: 'cl',
  PER: 'pe',
  BOL: 'bo',
  // UEFA (incluindo subdivisões oficiais Reino Unido: Inglaterra, Escócia e País de Gales!)
  FRA: 'fr',
  ESP: 'es',
  ENG: 'gb-eng',
  POR: 'pt',
  GER: 'de',
  ITA: 'it',
  NED: 'nl',
  BEL: 'be',
  CRO: 'hr',
  SUI: 'ch',
  DEN: 'dk',
  AUT: 'at',
  TUR: 'tr',
  SRB: 'rs',
  UKR: 'ua',
  POL: 'pl',
  SWE: 'se',
  NOR: 'no',
  SCO: 'gb-sct',
  CZE: 'cz',
  GRE: 'gr',
  HUN: 'hu',
  ROU: 'ro',
  WAL: 'gb-wls',
  // CONCACAF
  USA: 'us',
  MEX: 'mx',
  CAN: 'ca',
  PAN: 'pa',
  CRC: 'cr',
  JAM: 'jm',
  HON: 'hn',
  SLV: 'sv',
  // CAF
  MAR: 'ma',
  SEN: 'sn',
  NGA: 'ng',
  EGY: 'eg',
  CIV: 'ci',
  ALG: 'dz',
  CMR: 'cm',
  MLI: 'ml',
  TUN: 'tn',
  GHA: 'gh',
  RSA: 'za',
  COD: 'cd',
  // AFC & OFC
  JPN: 'jp',
  KOR: 'kr',
  IRN: 'ir',
  AUS: 'au',
  KSA: 'sa',
  QAT: 'qa',
  UZB: 'uz',
  IRQ: 'iq',
  UAE: 'ae',
  NZL: 'nz',
};

interface CountryFlagProps {
  code: CountryCode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-4 h-3',
  sm: 'w-5 h-[14px]',
  md: 'w-6 h-4',
  lg: 'w-8 h-5',
};

export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  size = 'sm',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);
  const iso = FLAG_ISO_MAP[code] ?? 'br';
  const dim = SIZE_CLASSES[size];

  if (failed) {
    return (
      <span
        className={`${dim} ${className} inline-flex items-center justify-center bg-[#181B22] border border-[#323640] font-condensed font-extrabold text-[8px] text-[#F5F5F7] shrink-0 select-none align-middle`}
      >
        {code}
      </span>
    );
  }

  return (
    <span
      className={`${dim} ${className} inline-block overflow-hidden border border-[#2C303B] bg-[#0E0F12] shrink-0 select-none align-middle shadow-xs`}
    >
      <img
        src={`https://flagcdn.com/${iso}.svg`}
        alt={code}
        className="w-full h-full object-cover block"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </span>
  );
};
