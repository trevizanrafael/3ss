import React, { useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import {
  MatchPerformanceResult,
  TacticalMindset,
} from '../../../domains/match-sim/matchSimulator';
import { getClubFixtureOnExactDay } from '../../../domains/season/worldSeasonEngine';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { formatSquadRole } from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';

export const MatchDayModal: React.FC = () => {
  const { player, contract, calendar, worldSeason, playCurrentMatch } = useCareerStore();
  const { matchModalOpen, setMatchModalOpen } = useNavigationStore();

  const [mindset, setMindset] = useState<TacticalMindset>('EQUILIBRADO');
  const [result, setResult] = useState<MatchPerformanceResult | null>(null);

  if (!matchModalOpen || !player || !contract) return null;

  const liveFixture = getClubFixtureOnExactDay(
    worldSeason,
    contract.clubId,
    contract.stage,
    calendar.week,
    calendar.day,
  );

  const compId = result?.competitionId ?? liveFixture?.competitionId;
  const opponentId = result?.opponentId ?? liveFixture?.opponentId;
  const isHome = result ? result.isHome : (liveFixture?.isHome ?? true);
  const stageLabel = result?.stageLabel ?? liveFixture?.stageLabel ?? 'PARTIDA OFICIAL';

  if (!compId || !opponentId) return null;

  const theme = getCompetitionTheme(compId);
  const club = getClubById(contract.clubId);
  const opponent = getClubById(opponentId);
  const homeClub = isHome ? club : opponent;
  const awayClub = isHome ? opponent : club;
  const homeGoals = result ? (isHome ? result.clubGoals : result.opponentGoals) : null;
  const awayGoals = result ? (isHome ? result.opponentGoals : result.clubGoals) : null;

  const handleClose = () => {
    setResult(null);
    setMatchModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0B0D]/92 backdrop-blur-sm flex items-center justify-center p-6">
      <div
        className="w-full max-w-2xl console-tile border-t-[4px] p-7"
        style={{
          borderTopColor: theme.accentPrimary,
          background: `linear-gradient(180deg, ${theme.bannerBg} 0%, #121316 42%)`,
        }}
      >
        <div className="flex items-center justify-between border-b border-[#242730] pb-4">
          <CompetitionBadge
            competitionId={compId}
            size="lg"
            stageSubtitle={`${stageLabel} • 2 TEMPOS DE 2:30 MIN`}
          />
          <button
            onClick={handleClose}
            className="font-condensed uppercase text-sm tracking-widest text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
          >
            FECHAR
          </button>
        </div>

        {/* Placar de Transmissão Oficial da Competição */}
        <div className="my-6 bg-[#0B0B0D]/80 border border-[#242730] p-6 flex items-center justify-around">
          <div className="flex flex-col items-center text-center w-40">
            <ClubCrest clubId={homeClub.id} size="lg" />
            <span className="font-condensed uppercase font-bold text-xl text-[#F5F5F7] mt-2 leading-tight">
              {homeClub.name}
            </span>
          </div>

          <div className="text-center px-4">
            {result ? (
              <div className="font-condensed font-extrabold text-6xl text-[#F5F5F7] leading-none">
                {homeGoals} : {awayGoals}
              </div>
            ) : (
              <div
                className="font-condensed font-extrabold text-3xl px-4 py-1"
                style={{ backgroundColor: theme.accentPrimary, color: theme.textOnAccent }}
              >
                VS
              </div>
            )}
            <div className="text-[11px] uppercase tracking-widest text-[#9498A3] mt-2">
              {formatSquadRole(contract.role)}
            </div>
          </div>

          <div className="flex flex-col items-center text-center w-40">
            <ClubCrest clubId={awayClub.id} size="lg" />
            <span className="font-condensed uppercase font-bold text-xl text-[#F5F5F7] mt-2 leading-tight">
              {awayClub.name}
            </span>
          </div>
        </div>

        {!result ? (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-3">
              {(
                [
                  ['AGRESSIVO_GOL', 'BUSCAR O GOL', 'MAIS FINALIZAÇÃO E DRIBLE'],
                  ['EQUILIBRADO', 'EQUILIBRADO', 'FUNÇÃO TÁTICA PADRÃO'],
                  ['COLETIVO_SEGURO', 'JOGO COLETIVO', 'FOCO EM PASSES E APOIO'],
                ] as const
              ).map(([id, title, sub]) => (
                <button
                  key={id}
                  onClick={() => setMindset(id)}
                  className={`p-4 border text-left cursor-pointer ${
                    mindset === id
                      ? 'bg-[#F5F5F7] text-[#0B0B0D] border-[#F5F5F7]'
                      : 'bg-[#0E0F12] text-[#F5F5F7] border-[#242730]'
                  }`}
                >
                  <div className="font-condensed uppercase font-extrabold text-lg">{title}</div>
                  <div className={`text-[10px] uppercase mt-0.5 ${mindset === id ? 'text-[#0B0B0D]' : 'text-[#9498A3]'}`}>
                    {sub}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const r = playCurrentMatch(mindset);
                if (r) setResult(r);
              }}
              style={{ borderLeftColor: theme.accentPrimary }}
              className="console-btn-primary w-full py-3.5 text-lg cursor-pointer"
            >
              APITAR INÍCIO ›
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="bg-[#0E0F12] border-l-4 p-4 flex items-center justify-between"
              style={{ borderLeftColor: theme.accentPrimary }}
            >
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">
                  DESEMPENHO INDIVIDUAL
                </div>
                <div className="font-condensed uppercase font-bold text-xl text-[#F5F5F7]">
                  {result.minutesPlayed} MIN ({result.minuteEntered}'–{result.minuteExited}') •{' '}
                  {result.playerGoals} GOLS • {result.playerAssists} ASSIST
                </div>
              </div>
              <StarRatingBadge stars={result.stars} size="lg" />
            </div>

            <div className="text-xs text-[#9498A3] space-y-1">
              {result.matchNarrative.map((line, i) => (
                <div key={i}>— {line}</div>
              ))}
            </div>

            <button
              onClick={handleClose}
              className="console-btn-primary w-full py-3.5 text-base cursor-pointer"
            >
              CONTINUAR TEMPORADA ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
