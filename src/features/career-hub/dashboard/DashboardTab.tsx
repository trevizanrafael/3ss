import React, { useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { LEAGUES } from '../../../data/leagues/leagues';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { getFifaStatColor } from '../../../shared/ui/FifaStatBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { formatSquadRole } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

const SHORT_DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export const DashboardTab: React.FC = () => {
  const {
    player,
    contract,
    youthState,
    nextOpponentId,
    calendar,
    transitionProposals,
    marketOffers,
    feed,
    advanceDay,
    advanceToMatchDay,
  } = useCareerStore();
  const { setActiveTab, setMatchModalOpen } = useNavigationStore();
  const [msgIdx, setMsgIdx] = useState(0);

  if (!player || !contract) return null;
  const club = getClubById(contract.clubId);
  const opponent = nextOpponentId ? getClubById(nextOpponentId) : club;
  const league = LEAGUES[club.leagueId];
  const isMatchDay = calendar.day === 6;
  const hasOffers = transitionProposals.length + marketOffers.length > 0;
  const currentMsg = feed[Math.min(msgIdx, Math.max(0, feed.length - 1))];

  return (
    <div className="h-full grid lg:grid-cols-12 lg:grid-rows-6 gap-5 min-h-0">
      {/* BLOCO 01: SEMANA & PRÓXIMO CONFRONTO (8 cols, 4 rows) */}
      <section className="lg:col-span-8 lg:row-span-4 console-tile border-t-[3px] border-t-[#C8A45D] p-6 flex flex-col justify-between">
        {/* Faixa Linear dos 7 Dias estilo FIFA 18 */}
        <div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#9498A3] mb-2.5">
            <span>CRONOGRAMA • SEMANA {String(calendar.week).padStart(2, '0')}</span>
            <span>
              {contract.stage === 'YOUTH' ? club.youthAcademyName : league.name}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {SHORT_DAYS.map((d, idx) => {
              const dayNum = idx + 1;
              const isToday = calendar.day === dayNum;
              const isTrain = dayNum === 2 || dayNum === 4;
              const isGame = dayNum === 6;
              return (
                <div
                  key={d}
                  className={`py-2 px-2.5 border transition-colors ${
                    isToday
                      ? 'bg-[#F5F5F7] text-[#0B0B0D] border-[#F5F5F7]'
                      : 'bg-[#0E0F12] text-[#9498A3] border-[#242730]'
                  }`}
                >
                  <div className="font-condensed font-extrabold text-sm tracking-wider">{d}</div>
                  <div
                    className={`text-[9px] uppercase tracking-wider font-bold mt-0.5 ${
                      isToday
                        ? 'text-[#0B0B0D]'
                        : isGame
                          ? 'text-[#C8A45D]'
                          : isTrain
                            ? 'text-[#9498A3]'
                            : 'text-[#323640]'
                    }`}
                  >
                    {isGame ? 'PARTIDA' : isTrain ? 'TREINO' : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confronto Limpo no Centro */}
        <div className="flex items-center justify-between px-4 md:px-10 my-auto">
          <div className="flex items-center gap-4">
            <ClubCrest
              clubId={club.id}
              shortName={club.shortName}
              primaryColor={club.primaryColor}
              secondaryColor={club.secondaryColor}
              pattern={club.pattern}
              size="xl"
            />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">MANDANTE</div>
              <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
                {club.name}
              </div>
              <div className="font-condensed text-sm text-[#C8A45D] uppercase font-bold mt-1">
                {club.squadAvgOvr} OVR
              </div>
            </div>
          </div>

          <div className="font-condensed font-extrabold text-3xl text-[#565A65] tracking-widest">
            VS
          </div>

          <div className="flex items-center gap-4 flex-row-reverse text-right">
            <ClubCrest
              clubId={opponent.id}
              shortName={opponent.shortName}
              primaryColor={opponent.primaryColor}
              secondaryColor={opponent.secondaryColor}
              pattern={opponent.pattern}
              size="xl"
            />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">VISITANTE</div>
              <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] leading-none">
                {opponent.name}
              </div>
              <div className="font-condensed text-sm text-[#9498A3] uppercase font-bold mt-1">
                {opponent.squadAvgOvr} OVR
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé de Ação de Avanço */}
        <div className="border-t border-[#242730] pt-4 flex items-center justify-between gap-4">
          <div className="text-xs uppercase tracking-wider text-[#9498A3]">
            ESCALAÇÃO: <strong className="text-[#F5F5F7]">{formatSquadRole(contract.role)}</strong> • FÔLEGO{' '}
            <strong className="text-[#C8A45D]">{player.stamina}%</strong>
          </div>

          <div className="flex items-center gap-3">
            {!isMatchDay && (
              <button
                onClick={advanceDay}
                className="px-4 py-3 bg-[#191B20] hover:bg-[#242730] border border-[#242730] font-condensed uppercase font-bold text-sm tracking-wider text-[#F5F5F7] cursor-pointer"
              >
                +1 DIA
              </button>
            )}
            <button
              onClick={() => {
                if (!isMatchDay) advanceToMatchDay();
                setMatchModalOpen(true);
              }}
              className="console-btn-primary px-8 py-3 text-lg cursor-pointer"
            >
              {isMatchDay ? 'JOGAR PARTIDA ›' : 'AVANÇAR ATÉ O JOGO ›'}
            </button>
          </div>
        </div>
      </section>

      {/* BLOCO 02: CARD MEU PRO (4 cols, 6 rows — Coluna Direita Inteira) */}
      <section
        onClick={() => setActiveTab('MEU_PRO')}
        className="lg:col-span-4 lg:row-span-6 console-tile console-tile-interactive p-6 flex flex-col justify-between cursor-pointer"
      >
        <div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#9498A3] pb-4 border-b border-[#242730]">
            <span>MEU PRO</span>
            <span>VER HABILIDADES ›</span>
          </div>

          <div className="flex items-end justify-between py-6 border-b border-[#242730]">
            <div>
              <div
                className="font-condensed font-extrabold text-7xl leading-none"
                style={{ color: getFifaStatColor(player.overall) }}
              >
                {player.overall}
              </div>
              <div className="font-condensed uppercase font-bold text-lg text-[#9498A3] tracking-widest mt-1">
                OVERALL • {player.position}
              </div>
            </div>
            <div className="text-right">
              <StarRatingBadge stars={player.reputationStars} size="md" />
              <div className="text-[11px] uppercase tracking-widest text-[#9498A3] mt-2">
                {player.age} ANOS • #{player.shirtNumber}
              </div>
            </div>
          </div>

          {/* Barras de Base OU Meta Contratual */}
          {contract.stage === 'YOUTH' && youthState ? (
            <div className="py-5 space-y-5">
              <div>
                <div className="flex justify-between text-xs uppercase tracking-wider mb-1.5">
                  <span className="text-[#9498A3]">CONFIANÇA SUB-20</span>
                  <span className="font-condensed font-bold text-base text-[#F5F5F7]">
                    {youthState.coachTrust}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0E0F12]">
                  <div className="h-full bg-[#F5F5F7]" style={{ width: `${youthState.coachTrust}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs uppercase tracking-wider mb-1.5">
                  <span className="text-[#9498A3]">OLHEIRO DO PROFISSIONAL</span>
                  <span className="font-condensed font-bold text-base text-[#C8A45D]">
                    {youthState.seniorScoutProgress}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#0E0F12]">
                  <div className="h-full bg-[#C8A45D]" style={{ width: `${youthState.seniorScoutProgress}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-5">
              <div className="flex justify-between text-xs uppercase tracking-wider mb-2">
                <span className="text-[#9498A3]">META DE CONTRATO</span>
                <span className="font-condensed font-bold text-base text-[#C8A45D]">
                  {contract.seasonGoal.current} / {contract.seasonGoal.target}
                </span>
              </div>
              <div className="text-xs text-[#F5F5F7] mb-2 uppercase">{contract.seasonGoal.label}</div>
              <div className="w-full h-1.5 bg-[#0E0F12]">
                <div
                  className="h-full bg-[#C8A45D]"
                  style={{
                    width: `${Math.min(100, (contract.seasonGoal.current / contract.seasonGoal.target) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4 Números Secos no Rodapé do Card */}
        <div className="grid grid-cols-4 border-t border-[#242730] pt-4 text-center">
          {[
            ['JOGOS', player.careerTotals.matches],
            ['GOLS', player.careerTotals.goals],
            ['ASSIST', player.careerTotals.assists],
            ['3★', player.careerTotals.threeStarMatches],
          ].map(([lbl, val]) => (
            <div key={lbl}>
              <div className="font-condensed font-extrabold text-3xl text-[#F5F5F7]">{val}</div>
              <div className="text-[10px] uppercase tracking-widest text-[#565A65]">{lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BLOCO 03: MENSAGEM ÚNICA DO TÉCNICO / EMPRESÁRIO (8 cols, 2 rows) */}
      <section className="lg:col-span-8 lg:row-span-2 console-tile p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-[#242730] pb-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#C8A45D] font-semibold">
            {hasOffers ? 'PROPOSTA OFICIAL NA MESA' : 'CAIXA DE ENTRADA'}
          </span>

          {feed.length > 1 && (
            <div className="flex items-center gap-2 text-xs text-[#9498A3] font-condensed">
              <button
                onClick={() => setMsgIdx((i) => Math.max(0, i - 1))}
                className="px-2 hover:text-[#F5F5F7] cursor-pointer"
              >
                ‹
              </button>
              <span>
                {msgIdx + 1} / {feed.length}
              </span>
              <button
                onClick={() => setMsgIdx((i) => Math.min(feed.length - 1, i + 1))}
                className="px-2 hover:text-[#F5F5F7] cursor-pointer"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-6 my-auto">
          {currentMsg ? (
            <div>
              <div className="font-condensed uppercase font-bold text-2xl text-[#F5F5F7]">
                {currentMsg.title}
              </div>
              <p className="text-xs text-[#9498A3] mt-0.5">{currentMsg.detail}</p>
            </div>
          ) : (
            <span className="text-xs text-[#565A65] uppercase">Nenhuma mensagem registrada.</span>
          )}

          {hasOffers && (
            <button
              onClick={() => setActiveTab('ESCRITORIO')}
              className="console-btn-primary px-5 py-2.5 text-sm shrink-0 cursor-pointer"
            >
              ABRIR ESCRITÓRIO ›
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
