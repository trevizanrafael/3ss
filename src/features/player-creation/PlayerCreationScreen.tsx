import React, { useEffect, useMemo, useState } from 'react';
import { COUNTRY_LIST } from '../../data/countries/countries';
import { POSITION_LABELS } from '../../domains/attributes/overallCalculator';
import { createInitialPlayer, CreatePlayerInput } from '../../domains/player/createInitialPlayer';
import { PlayerAppearance } from '../../domains/player/playerTypes';
import { GamepadBadge } from '../../shared/gamepad/GamepadBadge';
import { ConsoleStepper } from '../../shared/ui/ConsoleStepper';
import { CountryCode, PositionCode, PreferredFoot } from '../../shared/types/common';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';
import { AppearanceFormSection } from './AppearanceFormSection';
import { AvatarKitPreview } from './AvatarKitPreview';

type CreationTab = 'IDENTIDADE' | 'FISICO' | 'ESTILO';
const TABS: CreationTab[] = ['IDENTIDADE', 'FISICO', 'ESTILO'];

export const PlayerCreationScreen: React.FC = () => {
  const { beginCareerWithPlayer } = useCareerStore();
  const { setScreen } = useNavigationStore();

  const [tab, setTab] = useState<CreationTab>('IDENTIDADE');
  const [fullName, setFullName] = useState('Rafael Silva');
  const [shirtName, setShirtName] = useState('RAFAEL');
  const [shirtNumber, setShirtNumber] = useState(10);
  const [age, setAge] = useState<16 | 17 | 18>(16);
  const [nationality, setNationality] = useState<CountryCode>('BRA');
  const [position, setPosition] = useState<PositionCode>('ATA');
  const [preferredFoot, setPreferredFoot] = useState<PreferredFoot>('DIREITA');
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(72);

  const [appearance, setAppearance] = useState<PlayerAppearance>({
    skinTone: '#E0AC69',
    hairStyle: 'DEGRADE',
    hairColor: '#111827',
    eyeColor: '#3B2F2F',
    shirtTuck: 'SOLTA',
    sleeveStyle: 'CURTA',
    accessory: 'MUNHEQUEIRA',
    bootColor: '#C8A45D',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'q' || e.key === 'Q') {
        setTab((prev) => TABS[(TABS.indexOf(prev) - 1 + TABS.length) % TABS.length]);
      } else if (e.key === 'e' || e.key === 'E') {
        setTab((prev) => TABS[(TABS.indexOf(prev) + 1) % TABS.length]);
      } else if (e.key === 'Escape') {
        setScreen('MAIN_MENU');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setScreen]);

  const inputPayload: CreatePlayerInput = useMemo(
    () => ({
      fullName: fullName.trim() || 'Jovem Promessa',
      shirtName: shirtName.trim() || 'PROMESSA',
      shirtNumber,
      age,
      nationality,
      position,
      preferredFoot,
      heightCm,
      weightKg,
      appearance,
    }),
    [fullName, shirtName, shirtNumber, age, nationality, position, preferredFoot, heightCm, weightKg, appearance],
  );

  const previewPlayer = useMemo(() => createInitialPlayer(inputPayload), [inputPayload]);

  return (
    <div className="w-screen h-screen bg-[#0B0B0D] flex flex-col justify-between px-8 md:px-14 py-6 overflow-hidden">
      <header className="flex items-center justify-between border-b border-[#242730] pb-3">
        <div className="flex items-center gap-5">
          <span className="font-condensed uppercase font-extrabold text-2xl tracking-wider text-[#F5F5F7]">
            CRIAR MEU PRO
          </span>
          <div className="flex items-center gap-1.5">
            <GamepadBadge action="LB" />
            {TABS.map((t, i) => (
              <button
                key={t}
                type="button"
                data-nav-ignore="true"
                onClick={() => setTab(t)}
                className={`px-5 py-2 font-condensed uppercase font-bold text-base tracking-wider cursor-pointer border-b-2 transition-colors ${
                  tab === t
                    ? 'border-[#C8A45D] text-[#F5F5F7] bg-[#16181D]'
                    : 'border-transparent text-[#565A65] hover:text-[#9498A3]'
                }`}
              >
                0{i + 1} {t}
              </button>
            ))}
            <GamepadBadge action="RB" />
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

      {/* Fluxo Vertical Otimizado para Controle (D-Pad Cima/Baixo move linha, Esq/Dir gira ‹ Opção ›) */}
      <main className="flex-1 grid lg:grid-cols-12 gap-8 py-5 min-h-0">
        <div className="lg:col-span-8 console-tile p-7 flex flex-col justify-between">
          {tab === 'IDENTIDADE' && (
            <div className="max-w-xl space-y-4">
              <ConsoleStepper
                autoFocus
                label="NACIONALIDADE (DEFINE AS BASES DA PENEIRA)"
                value={nationality}
                onChange={setNationality}
                options={COUNTRY_LIST.map((c) => ({
                  value: c.code,
                  label: `${c.flag} ${c.name}`,
                }))}
              />

              <ConsoleStepper
                label="IDADE INICIAL NA BASE"
                value={age}
                onChange={(v) => setAge(v as 16 | 17 | 18)}
                options={[
                  { value: 16, label: '16 ANOS', subLabel: 'SUB-17' },
                  { value: 17, label: '17 ANOS', subLabel: 'SUB-20' },
                  { value: 18, label: '18 ANOS', subLabel: 'SUB-20' },
                ]}
              />

              <ConsoleStepper
                label="NÚMERO DA CAMISA"
                value={shirtNumber}
                onChange={setShirtNumber}
                options={[7, 8, 9, 10, 11, 14, 17, 19, 20, 23, 99].map((n) => ({
                  value: n,
                  label: `CAMISA ${n}`,
                }))}
              />

              <div className="grid sm:grid-cols-2 gap-4 pt-1">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-[#9498A3] block mb-1">
                    NOME DO ATLETA
                  </span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-10 bg-[#0E0F12] border border-[#242730] focus:border-[#C8A45D] px-3.5 font-condensed uppercase font-bold text-base text-[#F5F5F7] outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-[11px] uppercase tracking-widest text-[#9498A3] block mb-1">
                    NOME NAS COSTAS
                  </span>
                  <input
                    value={shirtName}
                    maxLength={12}
                    onChange={(e) => setShirtName(e.target.value.toUpperCase())}
                    className="w-full h-10 bg-[#0E0F12] border border-[#242730] focus:border-[#C8A45D] px-3.5 font-condensed uppercase font-bold text-base text-[#F5F5F7] outline-none"
                  />
                </label>
              </div>
            </div>
          )}

          {tab === 'FISICO' && (
            <div className="max-w-xl space-y-4">
              <ConsoleStepper
                autoFocus
                label="POSIÇÃO DE LINHA"
                value={position}
                onChange={setPosition}
                options={(Object.keys(POSITION_LABELS) as PositionCode[]).map((pos) => ({
                  value: pos,
                  label: POSITION_LABELS[pos],
                }))}
              />

              <ConsoleStepper
                label="PERNA PREFERIDA"
                value={preferredFoot}
                onChange={setPreferredFoot}
                options={[
                  { value: 'DIREITA', label: 'DESTRO (DIREITA)' },
                  { value: 'ESQUERDA', label: 'CANHOTO (ESQUERDA)' },
                  { value: 'AMBAS', label: 'AMBIDESTRO' },
                ]}
              />

              <ConsoleStepper
                label="ALTURA"
                value={heightCm}
                onChange={setHeightCm}
                options={[166, 170, 174, 178, 182, 186, 190, 194].map((h) => ({
                  value: h,
                  label: `${h} CM`,
                }))}
              />

              <ConsoleStepper
                label="PESO"
                value={weightKg}
                onChange={setWeightKg}
                options={[62, 66, 70, 72, 76, 80, 84, 88].map((w) => ({
                  value: w,
                  label: `${w} KG`,
                }))}
              />
            </div>
          )}

          {tab === 'ESTILO' && (
            <AppearanceFormSection appearance={appearance} onChange={setAppearance} />
          )}

          <div className="border-t border-[#242730] pt-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-[#9498A3]">
              D-PAD ↑↓ NAVEGAR • D-PAD ←→ ALTERAR ‹ OPÇÃO ›
            </span>

            <button
              type="button"
              data-pad-y="true"
              onClick={() => {
                beginCareerWithPlayer(inputPayload);
                setScreen('TRYOUT');
              }}
              className="console-btn-primary px-7 py-3 text-lg inline-flex items-center gap-3 cursor-pointer"
            >
              <GamepadBadge action="ALT_Y" darkText />
              <span>INICIAR PENEIRA NACIONAL ›</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 h-full">
          <AvatarKitPreview previewPlayer={previewPlayer} />
        </div>
      </main>

      <footer className="border-t border-[#242730] pt-3 flex justify-between text-[11px] uppercase tracking-widest text-[#565A65]">
        <div className="flex items-center gap-6">
          <GamepadBadge action="LB" label="ABA ANTERIOR" />
          <GamepadBadge action="RB" label="PRÓXIMA ABA" />
          <GamepadBadge action="ALT_Y" label="AVANÇAR PARA A PENEIRA" />
        </div>
        <span>TODAS AS POSIÇÕES DE LINHA</span>
      </footer>
    </div>
  );
};
