import React, { useEffect, useMemo, useState } from 'react';
import {
  COUNTRY_LIST,
  isLeagueCountryCode,
  TRYOUT_LEAGUE_COUNTRY_LIST,
} from '../../data/countries/countries';
import { POSITION_LABELS } from '../../domains/attributes/overallCalculator';
import {
  calculateAgeFromBirthDate,
  createInitialPlayer,
  CreatePlayerInput,
} from '../../domains/player/createInitialPlayer';
import { PlayerAppearance } from '../../domains/player/playerTypes';
import { GamepadBadge } from '../../shared/gamepad/GamepadBadge';
import { focusInitialElementInScope } from '../../shared/gamepad/spatialNavigator';
import { ConsoleStepper } from '../../shared/ui/ConsoleStepper';
import { CountryFlag } from '../../shared/ui/CountryFlag';
import {
  CountryCode,
  LeagueCountryCode,
  PositionCode,
  PreferredFoot,
} from '../../shared/types/common';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';
import { AppearanceFormSection } from './AppearanceFormSection';
import { rollRealisticNameForCountry } from './countryPresetNames';
import { Pro3DShowcasePanel, ShowcaseCameraPreset } from './Pro3DShowcasePanel';
import { VirtualNameModal } from './VirtualNameModal';

type CreationTab = 'INFO' | 'ATLETICO' | 'CABECA' | 'UNIFORME';

const TABS: { id: CreationTab; label: string }[] = [
  { id: 'INFO', label: '01 INFORMAÇÕES' },
  { id: 'ATLETICO', label: '02 ATLÉTICO' },
  { id: 'CABECA', label: '03 CABEÇA' },
  { id: 'UNIFORME', label: '04 UNIFORME' },
];

const MONTHS_OPTIONS = [
  { value: 1, label: 'JAN' },
  { value: 2, label: 'FEV' },
  { value: 3, label: 'MAR' },
  { value: 4, label: 'ABR' },
  { value: 5, label: 'MAI' },
  { value: 6, label: 'JUN' },
  { value: 7, label: 'JUL' },
  { value: 8, label: 'AGO' },
  { value: 9, label: 'SET' },
  { value: 10, label: 'OUT' },
  { value: 11, label: 'NOV' },
  { value: 12, label: 'DEZ' },
];

const BIRTH_YEARS = [2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000];
const JERSEY_NUMBERS = Array.from({ length: 99 }, (_, i) => i + 1);
const HEIGHT_OPTIONS = Array.from({ length: 17 }, (_, i) => 164 + i * 2);
const WEIGHT_OPTIONS = Array.from({ length: 17 }, (_, i) => 60 + i * 2);

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export const PlayerCreationScreen: React.FC = () => {
  const { beginCareerWithPlayer } = useCareerStore();
  const { setScreen } = useNavigationStore();

  const [tab, setTab] = useState<CreationTab>('INFO');
  const [firstName, setFirstName] = useState('Rafael');
  const [lastName, setLastName] = useState('Silva');
  const [shirtName, setShirtName] = useState('SILVA');
  const [shirtNumber, setShirtNumber] = useState(10);

  // Data de Nascimento (Padrão: 15/05/2008 = 18 anos completos em Ago/2026)
  const [birthDay, setBirthDay] = useState(15);
  const [birthMonth, setBirthMonth] = useState(5);
  const [birthYear, setBirthYear] = useState(2008);

  const [nationality, setNationality] = useState<CountryCode>('BRA');
  const [startingLeagueCountry, setStartingLeagueCountry] = useState<LeagueCountryCode>('BRA');
  const [position, setPosition] = useState<PositionCode>('ATA');
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot>('DIREITA');
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(73);

  const [editingField, setEditingField] = useState<'FIRST' | 'LAST' | 'SHIRT' | null>(null);
  const [focusBackJersey, setFocusBackJersey] = useState(false);

  const [appearance, setAppearance] = useState<PlayerAppearance>({
    skinTone: '#E0AC69',
    hairStyle: 'DEGRADE',
    hairColor: '#111827',
    facialHair: 'LIMPO',
    eyeColor: '#3B2F2F',
    shirtTuck: 'SOLTA',
    sleeveStyle: 'CURTA',
    sockHeight: 'PADRAO',
    accessory: 'MUNHEQUEIRA',
    bootColor: '#C8A45D',
  });

  useEffect(() => {
    setFocusBackJersey(false);
    const t = window.setTimeout(() => {
      if (document.documentElement.dataset.inputMode === 'gamepad') {
        focusInitialElementInScope();
      }
    }, 35);
    return () => window.clearTimeout(t);
  }, [tab, editingField]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingField !== null) return;
      if (e.key === 'q' || e.key === 'Q') {
        setTab((prev) => TABS[(TABS.findIndex((t) => t.id === prev) - 1 + TABS.length) % TABS.length].id);
      } else if (e.key === 'e' || e.key === 'E') {
        setTab((prev) => TABS[(TABS.findIndex((t) => t.id === prev) + 1) % TABS.length].id);
      } else if (e.key === 'Escape') {
        setScreen('MAIN_MENU');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingField, setScreen]);

  // Se ano for 2008, limita mês até Agosto (mês 8) para garantir 18 anos completos em 10/Ago/2026!
  const allowedMonths = birthYear === 2008 ? MONTHS_OPTIONS.slice(0, 8) : MONTHS_OPTIONS;
  const safeMonth = birthYear === 2008 && birthMonth > 8 ? 8 : birthMonth;
  const maxDay = birthYear === 2008 && safeMonth === 8 ? 10 : getDaysInMonth(safeMonth, birthYear);
  const safeDay = Math.min(birthDay, maxDay);
  const computedAge = calculateAgeFromBirthDate(safeDay, safeMonth, birthYear);

  const handleNationalityChange = (nextNat: CountryCode) => {
    setNationality(nextNat);
    if (isLeagueCountryCode(nextNat)) {
      setStartingLeagueCountry(nextNat);
    }
  };

  const handleRandomizeName = () => {
    const rolled = rollRealisticNameForCountry(nationality);
    setFirstName(rolled.firstName);
    setLastName(rolled.lastName);
    setShirtName(rolled.shirtName);
  };

  const fullNameCombined = `${firstName.trim()} ${lastName.trim()}`.trim() || 'Jovem Atleta';

  const inputPayload: CreatePlayerInput = useMemo(
    () => ({
      fullName: fullNameCombined,
      shirtName: shirtName.trim().toUpperCase() || 'ATLETA',
      shirtNumber,
      birthDay: safeDay,
      birthMonth: safeMonth,
      birthYear,
      nationality,
      startingLeagueCountry,
      position,
      preferredFoot,
      heightCm,
      weightKg,
      appearance,
    }),
    [
      fullNameCombined,
      shirtName,
      shirtNumber,
      safeDay,
      safeMonth,
      birthYear,
      nationality,
      startingLeagueCountry,
      position,
      preferredFoot,
      heightCm,
      weightKg,
      appearance,
    ],
  );

  const previewPlayer = useMemo(() => createInitialPlayer(inputPayload), [inputPayload]);

  const cameraPreset: ShowcaseCameraPreset =
    tab === 'CABECA' ? 'HEAD_CLOSEUP' : focusBackJersey ? 'FULL_BACK' : 'FULL_FRONT';

  return (
    <div className="w-screen h-screen bg-[#0B0B0D] flex flex-col justify-between px-6 md:px-12 py-5 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242730] pb-3 shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-condensed uppercase font-extrabold text-2xl tracking-wider text-[#F5F5F7] pr-3 border-r border-[#242730]">
            CRIAR MEU PRO
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-nav-ignore="true"
              onClick={() =>
                setTab((prev) => TABS[(TABS.findIndex((t) => t.id === prev) - 1 + TABS.length) % TABS.length].id)
              }
              className="mr-1 cursor-pointer"
            >
              <GamepadBadge action="LB" />
            </button>

            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-nav-ignore="true"
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 font-condensed uppercase font-extrabold text-sm md:text-base tracking-wider cursor-pointer border-b-[3px] transition-colors ${
                    active
                      ? 'border-[#C8A45D] text-[#F5F5F7] bg-[#16181D]'
                      : 'border-transparent text-[#565A65] hover:text-[#9498A3]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}

            <button
              type="button"
              data-nav-ignore="true"
              onClick={() =>
                setTab((prev) => TABS[(TABS.findIndex((t) => t.id === prev) + 1) % TABS.length].id)
              }
              className="ml-1 cursor-pointer"
            >
              <GamepadBadge action="RB" />
            </button>
          </div>
        </div>

        <button
          type="button"
          data-pad-back="true"
          data-nav-ignore="true"
          onClick={() => setScreen('MAIN_MENU')}
          className="cursor-pointer"
        >
          <GamepadBadge action="BACK" label="VOLTAR AO MENU" />
        </button>
      </header>

      <main className="flex-1 grid lg:grid-cols-12 gap-6 py-4 min-h-0">
        <div className="lg:col-span-7 console-tile p-6 flex flex-col justify-between min-h-0">
          {tab === 'INFO' && (
            <div className="space-y-3">
              <div className="border-b border-[#242730] pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-[#C8A45D] font-bold">
                    IDENTIDADE PROFISSIONAL
                  </span>
                  <button
                    type="button"
                    data-pad-x="true"
                    data-nav-ignore="true"
                    onClick={handleRandomizeName}
                    className="px-2.5 py-1 bg-[#14161D] hover:bg-[#1E222D] border border-[#242730] inline-flex items-center gap-1.5 font-condensed uppercase font-bold text-xs tracking-wider text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
                  >
                    <GamepadBadge action="ALT_X" />
                    <span>SORTEAR NOME</span>
                  </button>
                </div>

                <div className="grid sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    data-focusable="true"
                    data-autofocus="true"
                    onFocus={() => setFocusBackJersey(false)}
                    onClick={() => setEditingField('FIRST')}
                    className="text-left bg-[#0E0F12] border border-[#242730] hover:border-[#C8A45D] focus:border-[#C8A45D] focus:bg-[#151820] px-3.5 py-1.5 cursor-pointer outline-none"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-[#9498A3] block">
                      NOME
                    </span>
                    <span className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] truncate block">
                      {firstName || 'DEFINIR'}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-focusable="true"
                    onFocus={() => setFocusBackJersey(false)}
                    onClick={() => setEditingField('LAST')}
                    className="text-left bg-[#0E0F12] border border-[#242730] hover:border-[#C8A45D] focus:border-[#C8A45D] focus:bg-[#151820] px-3.5 py-1.5 cursor-pointer outline-none"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-[#9498A3] block">
                      SOBRENOME
                    </span>
                    <span className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] truncate block">
                      {lastName || 'DEFINIR'}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-focusable="true"
                    onFocus={() => setFocusBackJersey(true)}
                    onClick={() => setEditingField('SHIRT')}
                    className="text-left bg-[#0E0F12] border border-[#242730] hover:border-[#C8A45D] focus:border-[#C8A45D] focus:bg-[#151820] px-3.5 py-1.5 cursor-pointer outline-none"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-[#C8A45D] block">
                      NOME NA CAMISA
                    </span>
                    <span className="font-condensed uppercase font-extrabold text-lg text-[#F5F5F7] truncate block">
                      {shirtName || 'PRO'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Data de Nascimento estilo FIFA (Mínimo 18 anos) + Camisa */}
              <div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-[#9498A3] mb-1">
                  <span>DATA DE NASCIMENTO (MÍNIMO 18 ANOS)</span>
                  <span className="font-condensed font-extrabold text-sm text-[#C8A45D]">
                    {computedAge} ANOS
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  <ConsoleStepper
                    compact
                    value={safeDay}
                    onFocusRow={() => setFocusBackJersey(false)}
                    onChange={setBirthDay}
                    options={Array.from({ length: maxDay }, (_, i) => ({
                      value: i + 1,
                      label: String(i + 1).padStart(2, '0'),
                    }))}
                  />
                  <ConsoleStepper
                    compact
                    value={safeMonth}
                    onFocusRow={() => setFocusBackJersey(false)}
                    onChange={setBirthMonth}
                    options={allowedMonths}
                  />
                  <ConsoleStepper
                    compact
                    value={birthYear}
                    onFocusRow={() => setFocusBackJersey(false)}
                    onChange={setBirthYear}
                    options={BIRTH_YEARS.map((yr) => ({
                      value: yr,
                      label: String(yr),
                    }))}
                  />
                  <ConsoleStepper
                    compact
                    value={shirtNumber}
                    onFocusRow={() => setFocusBackJersey(true)}
                    onChange={(n) => {
                      setFocusBackJersey(true);
                      setShirtNumber(n);
                    }}
                    options={JERSEY_NUMBERS.map((n) => ({
                      value: n,
                      label: `#${n}`,
                    }))}
                  />
                </div>
              </div>

              <ConsoleStepper
                label="NACIONALIDADE LIVRE (SELEÇÃO NACIONAL • 64 PAÍSES)"
                value={nationality}
                onFocusRow={() => setFocusBackJersey(false)}
                onChange={handleNationalityChange}
                options={COUNTRY_LIST.map((c) => ({
                  value: c.code,
                  label: c.name,
                  subLabel: `${c.confederation} • ${c.ovr} OVR`,
                  leadingVisual: <CountryFlag code={c.code} size="md" />,
                }))}
              />

              <ConsoleStepper
                label="PAÍS / LIGA DE ESTREIA PROFISSIONAL"
                value={startingLeagueCountry}
                onFocusRow={() => setFocusBackJersey(false)}
                onChange={setStartingLeagueCountry}
                options={TRYOUT_LEAGUE_COUNTRY_LIST.map((lg) => ({
                  value: lg.code,
                  label: lg.name,
                  subLabel: lg.leaguesSummary,
                  leadingVisual: <CountryFlag code={lg.code} size="md" />,
                }))}
              />
            </div>
          )}

          {tab === 'ATLETICO' && (
            <div className="space-y-4">
              <ConsoleStepper
                autoFocus
                label="POSIÇÃO PRINCIPAL EM CAMPO"
                value={position}
                onChange={setPosition}
                options={(Object.keys(POSITION_LABELS) as PositionCode[]).map((pos) => ({
                  value: pos,
                  label: `${pos} — ${POSITION_LABELS[pos]}`,
                }))}
              />

              <ConsoleStepper
                label="PERNA PREFERIDA"
                value={preferredFoot}
                onChange={setPreferredFoot}
                options={[
                  { value: 'DIREITA', label: 'DESTRO (PERNA DIREITA)' },
                  { value: 'ESQUERDA', label: 'CANHOTO (PERNA ESQUERDA)' },
                  { value: 'AMBAS', label: 'AMBIDESTRO' },
                ]}
              />

              <ConsoleStepper
                label="ALTURA DO ATLETA"
                value={heightCm}
                onChange={setHeightCm}
                options={HEIGHT_OPTIONS.map((h) => ({
                  value: h,
                  label: `${h} CM`,
                  subLabel:
                    h >= 186 ? '+FORÇA / JOGO AÉREO' : h <= 172 ? '+AGILIDADE / EXPLOSÃO' : 'EQUILIBRADO',
                }))}
              />

              <ConsoleStepper
                label="PESO / PORTE FÍSICO"
                value={weightKg}
                onChange={setWeightKg}
                options={WEIGHT_OPTIONS.map((w) => ({
                  value: w,
                  label: `${w} KG`,
                  subLabel: w >= 82 ? 'PORTE FORTE' : w <= 68 ? 'LEVE & VELOZ' : 'ATLÉTICO',
                }))}
              />
            </div>
          )}

          {(tab === 'CABECA' || tab === 'UNIFORME') && (
            <AppearanceFormSection
              mode={tab}
              appearance={appearance}
              onChange={setAppearance}
            />
          )}

          <div className="border-t border-[#242730] pt-4 flex items-center justify-between gap-4">
            <div className="text-[11px] uppercase tracking-widest text-[#9498A3]">
              D-PAD ↑↓ SELECIONAR • D-PAD ←→ MUDAR OPÇÃO
            </div>

            <button
              type="button"
              data-focusable="true"
              data-pad-y="true"
              onClick={() => {
                beginCareerWithPlayer(inputPayload);
                setScreen('TRYOUT');
              }}
              className="console-btn-primary px-7 py-2.5 text-lg inline-flex items-center gap-2.5 cursor-pointer shrink-0"
            >
              <GamepadBadge action="ALT_Y" darkText />
              <span>IR PARA SELETIVA PRO ›</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 h-full min-h-0">
          <Pro3DShowcasePanel previewPlayer={previewPlayer} cameraPreset={cameraPreset} />
        </div>
      </main>

      <footer className="border-t border-[#242730] pt-2.5 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-widest text-[#565A65] shrink-0">
        <div className="flex flex-wrap items-center gap-5">
          <GamepadBadge action="CONFIRM" label="EDITAR CAMPO" />
          <GamepadBadge action="LB" label="SEÇÃO" />
          <GamepadBadge action="RB" />
          <GamepadBadge action="LT" label="GIRAR COSTAS" />
          <GamepadBadge action="RT" label="ZOOM ROSTO" />
          <GamepadBadge action="ALT_Y" label="INICIAR CARREIRA PRO" />
        </div>
        <span>CARREIRA PROFISSIONAL DIRETA • HUMANO 3D REAL</span>
      </footer>

      {editingField && (
        <VirtualNameModal
          title={
            editingField === 'FIRST'
              ? 'EDITAR PRIMEIRO NOME'
              : editingField === 'LAST'
                ? 'EDITAR SOBRENOME'
                : 'EDITAR NOME NAS COSTAS DA CAMISA'
          }
          initialValue={
            editingField === 'FIRST'
              ? firstName
              : editingField === 'LAST'
                ? lastName
                : shirtName
          }
          maxLength={editingField === 'SHIRT' ? 12 : 16}
          uppercaseOnly={editingField === 'SHIRT'}
          onConfirm={(val) => {
            if (editingField === 'FIRST') {
              setFirstName(val || 'Rafael');
            } else if (editingField === 'LAST') {
              const nextLast = val || 'Silva';
              setLastName(nextLast);
              setShirtName(nextLast.slice(0, 12).toUpperCase());
            } else {
              setShirtName((val || 'PRO').slice(0, 12).toUpperCase());
            }
          }}
          onClose={() => setEditingField(null)}
        />
      )}
    </div>
  );
};
