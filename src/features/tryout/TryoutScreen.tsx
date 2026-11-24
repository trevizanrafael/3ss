import React, { useState } from 'react';
import { getClubById } from '../../data/clubs';
import { COUNTRIES } from '../../data/countries/countries';
import { LEAGUES } from '../../data/leagues/leagues';
import { ClubCrest } from '../../shared/ui/ClubCrest';
import { FifaStatBadge } from '../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../shared/ui/StarRatingBadge';
import { StarRating } from '../../shared/types/common';
import { formatMoney, formatSquadRole } from '../../shared/utils/formatters';
import { useCareerStore } from '../../state/useCareerStore';
import { useNavigationStore } from '../../state/useNavigationStore';

const TRYOUT_STAGES = [
  {
    code: '01 / 03',
    title: 'TIRO FÍSICO DE 20 METROS',
    options: [
      { code: 'A', label: 'EXPLOSÃO NO LIMITE', sub: 'ALTO TETO DE NOTA • RISCO DE ESCORREGAR', bonus: 38, risk: 0.25 },
      { code: 'B', label: 'RITMO CONTROLADO', sub: 'EXECUÇÃO FIRME • BAIXO RISCO', bonus: 29, risk: 0.05 },
    ],
  },
  {
    code: '02 / 03',
    title: 'FUNDAMENTO SOB MARCAÇÃO',
    options: [
      { code: 'A', label: 'JOGADA VERTICAL AGRESSIVA', sub: 'IMPRESSIONA OLHEIROS DA 1ª DIVISÃO', bonus: 40, risk: 0.28 },
      { code: 'B', label: 'DOMÍNIO E PASSE LIMPO', sub: 'GARANTE AVALIAÇÃO TÉCNICA SÓLIDA', bonus: 29, risk: 0.05 },
    ],
  },
  {
    code: '03 / 03',
    title: 'COLETIVO SUB-20 DECISIVO',
    options: [
      { code: 'A', label: 'CHAMAR A RESPONSABILIDADE', sub: 'BUSCA AS 3 ESTRELAS NA FRENTE DA COMISSÃO', bonus: 42, risk: 0.25 },
      { code: 'B', label: 'ORGANIZAR O SETOR TÁTICO', sub: 'NOTA COLETIVA CONSISTENTE', bonus: 30, risk: 0.05 },
    ],
  },
];

export const TryoutScreen: React.FC = () => {
  const { player, tryoutStars, tryoutOffers, finishTryout, signYouthOffer } = useCareerStore();
  const { setScreen } = useNavigationStore();

  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);

  if (!player) return null;
  const country = COUNTRIES[player.nationality];

  const handleChoice = (bonus: number, risk: number) => {
    const failed = Math.random() < risk;
    const nextScore = score + (failed ? Math.round(bonus * 0.4) : bonus);
    setScore(nextScore);

    if (step + 1 < TRYOUT_STAGES.length) {
      setStep(step + 1);
    } else {
      const stars: StarRating = nextScore >= 92 ? 3 : nextScore >= 68 ? 2 : nextScore >= 45 ? 1 : 0;
      finishTryout(stars);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#0B0B0D] flex flex-col justify-between px-8 md:px-14 py-6 overflow-hidden">
      <header className="flex items-center justify-between border-b border-[#242730] pb-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.24em] text-[#C8A45D] font-semibold">
            PENEIRA NACIONAL • {country.flag} {country.name}
          </span>
          <h1 className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none mt-1">
            {tryoutStars === null ? 'AVALIAÇÃO DE CATEGORIAS DE BASE' : 'CONVITES OFICIAIS DE BASE'}
          </h1>
        </div>
        {tryoutStars !== null && <StarRatingBadge stars={tryoutStars} size="lg" showLabel />}
      </header>

      {tryoutStars === null ? (
        <main className="my-auto max-w-4xl w-full mx-auto">
          <div className="font-condensed uppercase text-sm tracking-[0.25em] text-[#9498A3] mb-2">
            BATERIA {TRYOUT_STAGES[step].code}
          </div>
          <h2 className="font-condensed uppercase font-extrabold text-5xl text-[#F5F5F7] mb-8">
            {TRYOUT_STAGES[step].title}
          </h2>

          <div className="grid sm:grid-cols-2 gap-6">
            {TRYOUT_STAGES[step].options.map((opt, idx) => (
              <button
                key={opt.code}
                data-autofocus={idx === 0 ? 'true' : undefined}
                onClick={() => handleChoice(opt.bonus, opt.risk)}
                className="console-tile console-tile-interactive text-left p-8 border-l-4 border-l-[#565A65] hover:border-l-[#C8A45D] cursor-pointer"
              >
                <span className="font-condensed text-xs tracking-[0.24em] text-[#C8A45D] font-bold">
                  OPÇÃO {opt.code}
                </span>
                <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] mt-2">
                  {opt.label}
                </div>
                <div className="text-xs uppercase tracking-wider text-[#9498A3] mt-3">
                  {opt.sub}
                </div>
              </button>
            ))}
          </div>
        </main>
      ) : (
        <main className="flex-1 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 py-6 min-h-0">
          {tryoutOffers.map((offer, idx) => {
            const club = getClubById(offer.clubId);
            const league = LEAGUES[club.leagueId];
            return (
              <div
                key={offer.clubId}
                className="console-tile border-t-[3px] border-t-[#C8A45D] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#565A65] uppercase tracking-widest mb-4">
                    <span>PROPOSTA 0{idx + 1}</span>
                    <span>{league.name}</span>
                  </div>

                  <div className="flex flex-col items-center text-center pb-4 border-b border-[#242730]">
                    <ClubCrest
                      clubId={club.id}
                      shortName={club.shortName}
                      primaryColor={club.primaryColor}
                      secondaryColor={club.secondaryColor}
                      pattern={club.pattern}
                      size="lg"
                    />
                    <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7] mt-3 leading-none">
                      {club.name}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider text-[#C8A45D] mt-1">
                      {offer.youthTeamName}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#9498A3] uppercase">PAPEL</span>
                      <span className="font-condensed uppercase font-bold text-sm text-[#F5F5F7]">
                        {formatSquadRole(offer.role)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9498A3] uppercase">BOLSA</span>
                      <span className="font-condensed font-bold text-sm text-[#C8A45D]">
                        {formatMoney(offer.monthlyAllowance)}/MÊS
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#191B20]">
                      <div>
                        <span className="text-[10px] text-[#565A65] uppercase block">
                          TITULAR NO PROFISSIONAL
                        </span>
                        <span className="text-xs text-[#F5F5F7] font-medium">
                          {offer.seniorCompetitor.name}
                        </span>
                      </div>
                      <FifaStatBadge value={offer.seniorCompetitor.ovr} size="sm" />
                    </div>
                  </div>
                </div>

                <button
                  data-autofocus={idx === 0 ? 'true' : undefined}
                  onClick={() => {
                    signYouthOffer(offer);
                    setScreen('CAREER_HUB');
                  }}
                  className="console-btn-primary w-full py-3 text-base cursor-pointer mt-4"
                >
                  ASSINAR BASE ›
                </button>
              </div>
            );
          })}
        </main>
      )}

      <footer className="border-t border-[#242730] pt-3 flex justify-between text-[11px] uppercase tracking-widest text-[#565A65]">
        <span>{player.fullName} • {player.position} • {player.overall} OVR</span>
        <span>CLUBES MENORES DÃO SUBIDA MAIS RÁPIDA AO PROFISSIONAL</span>
      </footer>
    </div>
  );
};
