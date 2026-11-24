import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import { getClubById } from '../../data/clubs';
import { COUNTRIES } from '../../data/countries/countries';
import { LEAGUES } from '../../data/leagues/leagues';
import { ClubCrest } from '../../shared/ui/ClubCrest';
import { Panel } from '../../shared/ui/Panel';
import { StarRatingBadge } from '../../shared/ui/StarRatingBadge';
import { StarRating } from '../../shared/types/common';
import { formatMoney, formatSquadRole } from '../../shared/utils/formatters';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';

interface DrillQuestion {
  title: string;
  situation: string;
  options: { label: string; desc: string; scoreBonus: number; risk: number }[];
}

const TRYOUT_DRILLS: DrillQuestion[] = [
  {
    title: '1ª Bateria — Explosão & Arrancada Curta',
    situation: 'Os preparadores físicos da base cronometram tiros de 20 metros com mudança de direção.',
    options: [
      { label: 'Explosão máxima no limite', desc: 'Arrisca tudo desde o primeiro cone para bater o melhor tempo.', scoreBonus: 38, risk: 0.25 },
      { label: 'Cadência progressiva firme', desc: 'Passadas limpas sem escorregar nas curvas.', scoreBonus: 28, risk: 0.05 },
    ],
  },
  {
    title: '2ª Bateria — Fundamento Técnico sob Pressão',
    situation: 'Roda de domínio orientado + passe/finalização rápida com marcação dobrada.',
    options: [
      { label: 'Tentar jogada de efeito e batida colocada', desc: 'Chama a atenção dos olheiros de clubes gigantes se acertar!', scoreBonus: 40, risk: 0.28 },
      { label: 'Domínio curto e execução de manual', desc: 'Mostra maturidade tática e zero erro bobo.', scoreBonus: 29, risk: 0.06 },
    ],
  },
  {
    title: '3ª Bateria — Coletivo Final de 20 Minutos',
    situation: 'Últimos minutos do jogo-treino empatado diante dos olheiros do seu país.',
    options: [
      { label: 'Chamar a responsabilidade da jogada decisiva', desc: 'Vai pra cima decidir o lance na frente da comissão.', scoreBonus: 42, risk: 0.25 },
      { label: 'Organizar o setor e servir o companheiro livre', desc: 'Garante nota coletiva consistente.', scoreBonus: 30, risk: 0.05 },
    ],
  },
];

export const TryoutScreen: React.FC = () => {
  const { player, tryoutStars, tryoutOffers, finishTryout, signYouthOffer } = useCareerStore();
  const { setScreen } = useNavigationStore();

  const [stepIdx, setStepIdx] = useState(0);
  const [accumulatedPoints, setAccumulatedPoints] = useState(0);
  const [drillLog, setDrillLog] = useState<string[]>([]);

  if (!player) return null;
  const country = COUNTRIES[player.nationality];

  const handlePickOption = (opt: DrillQuestion['options'][number]) => {
    const stumbled = Math.random() < opt.risk;
    const gained = stumbled ? Math.round(opt.scoreBonus * 0.4) : opt.scoreBonus;
    const nextTotal = accumulatedPoints + gained;
    const feedback = stumbled
      ? `${TRYOUT_DRILLS[stepIdx].title}: Sentiu um pouco o nervosismo (+${gained} pts).`
      : `${TRYOUT_DRILLS[stepIdx].title}: Execução excelente diante dos olheiros! (+${gained} pts).`;

    const nextLogs = [...drillLog, feedback];
    setDrillLog(nextLogs);
    setAccumulatedPoints(nextTotal);

    if (stepIdx + 1 < TRYOUT_DRILLS.length) {
      setStepIdx(stepIdx + 1);
    } else {
      const stars: StarRating =
        nextTotal >= 92 ? 3 : nextTotal >= 68 ? 2 : nextTotal >= 45 ? 1 : 0;
      finishTryout(stars);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Peneira Nacional • {country.flag} {country.name}
            </span>
            <h1 className="text-3xl font-bold text-white mt-1">
              Avaliação de Categorias de Base ({player.age} anos)
            </h1>
          </div>
          {tryoutStars !== null && <StarRatingBadge stars={tryoutStars} size="lg" showLabel />}
        </div>

        {tryoutStars === null ? (
          <Panel
            title={TRYOUT_DRILLS[stepIdx].title}
            subtitle={`Etapa ${stepIdx + 1} de ${TRYOUT_DRILLS.length} • Seu desempenho define quais clubes do país abrirão as portas.`}
          >
            <p className="text-slate-200 text-base mb-5">{TRYOUT_DRILLS[stepIdx].situation}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {TRYOUT_DRILLS[stepIdx].options.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handlePickOption(opt)}
                  className="text-left rounded-2xl bg-slate-950 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/60 p-5 transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white group-hover:text-emerald-300">
                      {opt.label}
                    </span>
                    <Zap size={16} className="text-amber-400" />
                  </div>
                  <p className="text-xs text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>

            {drillLog.length > 0 && (
              <div className="mt-5 pt-4 border-t border-slate-800 space-y-1.5">
                {drillLog.map((log, i) => (
                  <p key={i} className="text-xs text-emerald-300">• {log}</p>
                ))}
              </div>
            )}
          </Panel>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-slate-900 border border-amber-400/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-300 font-bold text-lg">
                  <Sparkles size={18} />
                  Resultado Oficial na Peneira: {tryoutStars} de 3 Estrelas!
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  {tryoutStars === 3
                    ? 'Atuação espetacular! Até gigantes da 1ª divisão abriram vaga na base — mas lembre-se: em clubes menores você sobe pro profissional mais rápido!'
                    : tryoutStars === 2
                      ? 'Ótimo teste! Boas categorias de base do seu país enviaram convite oficial.'
                      : 'Teste suado! Clubes formadores de acesso abriram espaço pra você mostrar serviço no campo.'}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {tryoutOffers.map((offer) => {
                const club = getClubById(offer.clubId);
                const league = LEAGUES[club.leagueId];
                return (
                  <div
                    key={offer.clubId}
                    className="rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 p-5 flex flex-col justify-between transition"
                  >
                    <div>
                      <div className="flex items-center gap-3.5 mb-3">
                        <ClubCrest
                          clubId={club.id}
                          shortName={club.shortName}
                          primaryColor={club.primaryColor}
                          secondaryColor={club.secondaryColor}
                          pattern={club.pattern}
                          size="lg"
                        />
                        <div>
                          <h3 className="text-xl font-bold text-white">{club.name}</h3>
                          <p className="text-xs text-emerald-400 font-medium">{offer.youthTeamName}</p>
                          <p className="text-[11px] text-slate-400">
                            Time Principal: {league.name} ({club.squadAvgOvr} OVR médio)
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                          <span className="text-slate-400 block">Status Inicial</span>
                          <span className="font-bold text-white">{formatSquadRole(offer.role)}</span>
                        </div>
                        <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                          <span className="text-slate-400 block">Bolsa Formação</span>
                          <span className="font-bold text-emerald-400">{formatMoney(offer.monthlyAllowance)}/mês</span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-950/70 border border-slate-800/80 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            <ShieldAlert size={13} className="text-amber-400" />
                            Sombra no Profissional ({offer.seniorCompetitor.pos}):
                          </span>
                          <span className="font-semibold text-slate-200">
                            {offer.seniorCompetitor.name} ({offer.seniorCompetitor.ovr} OVR)
                          </span>
                        </div>
                        <p className="text-slate-400 pt-1">{offer.scoutNote}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        signYouthOffer(offer);
                        setScreen('CAREER_HUB');
                      }}
                      className="mt-4 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <CheckCircle2 size={17} />
                      Assinar Base com {club.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
