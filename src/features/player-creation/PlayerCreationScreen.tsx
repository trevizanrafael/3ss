import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { COUNTRY_LIST } from '../../data/countries/countries';
import { POSITION_LABELS } from '../../domains/attributes/overallCalculator';
import { createInitialPlayer, CreatePlayerInput } from '../../domains/player/createInitialPlayer';
import { PlayerAppearance } from '../../domains/player/playerTypes';
import { Panel } from '../../shared/ui/Panel';
import { CountryCode, PositionCode, PreferredFoot } from '../../shared/types/common';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';
import { AppearanceFormSection } from './AppearanceFormSection';
import { AvatarKitPreview } from './AvatarKitPreview';

export const PlayerCreationScreen: React.FC = () => {
  const { beginCareerWithPlayer } = useCareerStore();
  const { setScreen } = useNavigationStore();

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
    bootColor: '#10B981',
  });

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

  const handleContinue = () => {
    beginCareerWithPlayer(inputPayload);
    setScreen('TRYOUT');
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setScreen('MAIN_MENU')}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar ao Menu
          </button>
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
            Passo 1 de 2 • Registro de Atleta da Base
          </span>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 grid gap-6">
            <Panel title="Identidade & Posição de Linha" subtitle="Você iniciará fazendo uma Peneira no país da sua nacionalidade.">
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs text-slate-400">Nome Completo</span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                  />
                </label>

                <div className="grid grid-cols-3 gap-3">
                  <label className="col-span-2 block">
                    <span className="text-xs text-slate-400">Nome na Camisa</span>
                    <input
                      value={shirtName}
                      maxLength={12}
                      onChange={(e) => setShirtName(e.target.value.toUpperCase())}
                      className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white uppercase focus:border-emerald-500 outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-400">Número</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={shirtNumber}
                      onChange={(e) => setShirtNumber(Number(e.target.value) || 9)}
                      className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-slate-400">Nacionalidade (Define as Bases da Peneira)</span>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value as CountryCode)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                  >
                    {COUNTRY_LIST.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.youthLeagueLabel})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400">Posição em Campo (Sem Goleiro)</span>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as PositionCode)}
                    className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 outline-none"
                  >
                    {(Object.keys(POSITION_LABELS) as PositionCode[]).map((pos) => (
                      <option key={pos} value={pos}>
                        {POSITION_LABELS[pos]}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">Idade Inicial na Base</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([16, 17, 18] as const).map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setAge(yr)}
                        className={`py-2 rounded-xl text-sm font-semibold border cursor-pointer ${
                          age === yr
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {yr} anos
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 block mb-1">Perna Preferida</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['DIREITA', 'ESQUERDA', 'AMBAS'] as PreferredFoot[]).map((ft) => (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => setPreferredFoot(ft)}
                        className={`py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                          preferredFoot === ft
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {ft}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs text-slate-400">Altura: {heightCm} cm</span>
                  <input
                    type="range"
                    min={164}
                    max={198}
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-slate-400">Peso: {weightKg} kg</span>
                  <input
                    type="range"
                    min={58}
                    max={94}
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="mt-2 w-full accent-emerald-500"
                  />
                </label>
              </div>
            </Panel>

            <AppearanceFormSection appearance={appearance} onChange={setAppearance} />
          </div>

          <div className="lg:col-span-4 sticky top-6 grid gap-4">
            <AvatarKitPreview previewPlayer={previewPlayer} />
            <button
              onClick={handleContinue}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              Ir para a Peneira Oficial
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
