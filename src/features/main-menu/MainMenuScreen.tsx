import React from 'react';
import { Play, PlusCircle, RotateCcw, Star, Trophy } from 'lucide-react';
import { getClubById } from '../../data/clubs';
import { ClubCrest } from '../../shared/ui/ClubCrest';
import { StarRatingBadge } from '../../shared/ui/StarRatingBadge';
import { formatSquadRole } from '../../shared/utils/formatters';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';

export const MainMenuScreen: React.FC = () => {
  const { hasActiveSave, player, contract, calendar, resetCareer } = useCareerStore();
  const { setScreen } = useNavigationStore();

  const currentClub = contract ? getClubById(contract.clubId) : null;

  const handleStartNew = () => {
    if (hasActiveSave) {
      resetCareer();
    }
    setScreen('CREATE_PLAYER');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/50 via-slate-950 to-slate-950">
      {/* Subtle pitch lines decorative backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 w-full max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 mb-5">
            <Star size={16} className="fill-amber-400 text-amber-400" />
            <Star size={18} className="fill-amber-400 text-amber-400" />
            <Star size={16} className="fill-amber-400 text-amber-400" />
            <span className="ml-1 text-xs font-semibold uppercase tracking-widest text-amber-300">
              Modo Carreira de Jogador
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white uppercase">
            Three Stars <span className="text-emerald-400">Soccer</span>
          </h1>
          <p className="mt-3 text-slate-400 max-w-xl mx-auto text-sm md:text-base">
            Da peneira aos 16 anos e categorias de base até os gigantes da América e da Europa.
            Evolua seus atributos 0–99, negocie contratos e conquiste as 3 Estrelas.
          </p>
        </div>

        <div className="grid gap-4">
          {hasActiveSave && player && contract && currentClub && (
            <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/40 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.12)]">
              <div className="flex items-center gap-4">
                <ClubCrest
                  clubId={currentClub.id}
                  shortName={currentClub.shortName}
                  primaryColor={currentClub.primaryColor}
                  secondaryColor={currentClub.secondaryColor}
                  pattern={currentClub.pattern}
                  size="lg"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-white">{player.fullName}</span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      {player.overall} OVR • {player.position}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {currentClub.name} • {formatSquadRole(contract.role)} • Temp. {calendar.season} (Sem. {calendar.week})
                  </p>
                  <div className="mt-1.5">
                    <StarRatingBadge stars={player.reputationStars} size="sm" showLabel />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setScreen('CAREER_HUB')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition cursor-pointer"
              >
                <Play size={18} className="fill-slate-950" />
                Continuar Carreira
              </button>
            </div>
          )}

          <button
            onClick={handleStartNew}
            className="w-full rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-700 hover:border-emerald-400/60 p-5 flex items-center justify-between transition group cursor-pointer"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                {hasActiveSave ? <RotateCcw size={22} /> : <PlusCircle size={24} />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {hasActiveSave ? 'Começar Nova Carreira' : 'Criar Meu Jogador (16–18 anos)'}
                </h2>
                <p className="text-xs text-slate-400">
                  Personalize seu atleta, faça o teste na Peneira e receba convites de Base do seu país
                </p>
              </div>
            </div>
            <Trophy size={22} className="text-amber-400 opacity-70 group-hover:opacity-100 transition" />
          </button>
        </div>
      </div>
    </div>
  );
};
