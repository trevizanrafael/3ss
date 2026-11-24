import React, { useState } from 'react';
import { CheckCircle2, Flame, Shield, Sparkles, X } from 'lucide-react';
import { getClubById } from '../../../data/clubs';
import {
  MatchPerformanceResult,
  TacticalMindset,
} from '../../../domains/match-sim/matchSimulator';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { formatSquadRole } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

export const MatchDayModal: React.FC = () => {
  const { player, contract, nextOpponentId, playCurrentMatch } = useCareerStore();
  const { matchModalOpen, setMatchModalOpen } = useNavigationStore();

  const [mindset, setMindset] = useState<TacticalMindset>('EQUILIBRADO');
  const [result, setResult] = useState<MatchPerformanceResult | null>(null);

  if (!matchModalOpen || !player || !contract || !nextOpponentId) return null;

  const club = getClubById(contract.clubId);
  const opponent = getClubById(nextOpponentId ?? result?.opponentId ?? contract.clubId);
  const displayOpponent = result ? getClubById(result.opponentId) : opponent;

  const handleClose = () => {
    setResult(null);
    setMatchModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Dia de Partida • 2 Tempos de 2:30 min
            </span>
            <h2 className="text-2xl font-bold text-white">
              {result ? 'Apito Final — Avaliação da Partida' : 'Preleção no Vestiário'}
            </h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Placar / Confronto */}
        <div className="my-6 rounded-2xl bg-slate-950 border border-slate-800 p-5 flex items-center justify-around">
          <div className="flex flex-col items-center text-center">
            <ClubCrest
              clubId={club.id}
              shortName={club.shortName}
              primaryColor={club.primaryColor}
              secondaryColor={club.secondaryColor}
              pattern={club.pattern}
              size="lg"
            />
            <span className="mt-2 font-bold text-white text-sm">{club.name}</span>
          </div>

          <div className="text-center">
            {result ? (
              <div className="text-4xl font-extrabold text-white tabular-nums tracking-wider">
                {result.clubGoals} <span className="text-slate-600">x</span> {result.opponentGoals}
              </div>
            ) : (
              <div className="text-xl font-bold text-slate-500">VS</div>
            )}
            <span className="text-[11px] text-slate-400 block mt-1">
              {formatSquadRole(contract.role)} • Fôlego {player.stamina}%
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <ClubCrest
              clubId={displayOpponent.id}
              shortName={displayOpponent.shortName}
              primaryColor={displayOpponent.primaryColor}
              secondaryColor={displayOpponent.secondaryColor}
              pattern={displayOpponent.pattern}
              size="lg"
            />
            <span className="mt-2 font-bold text-white text-sm">{displayOpponent.name}</span>
          </div>
        </div>

        {!result ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Escolha sua postura individual em campo *(na Fase 3 este botão abrirá direto o estádio 3D em 3ª pessoa!)*:
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { id: 'AGRESSIVO_GOL' as const, title: 'Chamar o Jogo', desc: 'Arrisca mais finalizações e dribles (+gasto de fôlego)', icon: <Flame size={16} className="text-amber-400" /> },
                { id: 'EQUILIBRADO' as const, title: 'Equilibrado', desc: 'Cumpre a função tática e ataca nos espaços certos', icon: <Sparkles size={16} className="text-emerald-400" /> },
                { id: 'COLETIVO_SEGURO' as const, title: 'Coletivo Seguro', desc: 'Prioriza passes certos, tabelas e recomposição', icon: <Shield size={16} className="text-sky-400" /> },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMindset(m.id)}
                  className={`text-left rounded-2xl border p-3.5 transition cursor-pointer ${
                    mindset === m.id
                      ? 'bg-emerald-950/40 border-emerald-400'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{m.title}</span>
                    {m.icon}
                  </div>
                  <p className="text-[11px] text-slate-400">{m.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const res = playCurrentMatch(mindset);
                if (res) setResult(res);
              }}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm cursor-pointer"
            >
              Apitar Início da Partida
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-300 font-semibold block">Sua Nota Three Stars</span>
                <span className="text-sm text-white font-bold">
                  {result.minutesPlayed} min jogados ({result.minuteEntered}' até {result.minuteExited}') •{' '}
                  {result.playerGoals} Gol(s) • {result.playerAssists} Assist.
                </span>
              </div>
              <StarRatingBadge stars={result.stars} size="lg" />
            </div>

            <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950 rounded-xl p-3.5 border border-slate-800">
              {result.matchNarrative.map((line, idx) => (
                <p key={idx}>• {line}</p>
              ))}
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={17} />
              Continuar Semana
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
