import React, { useEffect, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { LeagueId } from '../../../data/leagues/leagues';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import {
  MatchPerformanceResult,
  TacticalMindset,
} from '../../../domains/match-sim/matchSimulator';
import { getClubFixtureOnExactDay } from '../../../domains/season/worldSeasonEngine';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import { useCareerStore } from '../../../state/useCareerStore';
import { useNavigationStore } from '../../../state/useNavigationStore';
import { InteractiveTravelMap } from './InteractiveTravelMap';
import { KitChoice, MatchKitsAndInfoPanel } from './MatchKitsAndInfoPanel';
import { TacticalLineupPitch } from './TacticalLineupPitch';

export const MatchDayModal: React.FC = () => {
  const { player, contract, calendar, worldSeason, playCurrentMatch } = useCareerStore();
  const { matchModalOpen, setMatchModalOpen } = useNavigationStore();

  const [mindset, setMindset] = useState<TacticalMindset>('EQUILIBRADO');
  const [homeKit, setHomeKit] = useState<KitChoice>('HOME');
  const [awayKit, setAwayKit] = useState<KitChoice>('AWAY');
  const [result, setResult] = useState<MatchPerformanceResult | null>(null);

  useEffect(() => {
    if (!matchModalOpen) return;
    setHomeKit('HOME');
    setAwayKit('AWAY');
  }, [matchModalOpen]);

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
  const isContinental = Boolean(liveFixture?.isContinental);

  if (!compId || !opponentId) return null;

  const theme = getCompetitionTheme(compId);
  const myClub = getClubById(contract.clubId);
  const opponentClub = getClubById(opponentId);
  const homeClub = isHome ? myClub : opponentClub;
  const awayClub = isHome ? opponentClub : myClub;

  // Buscar posição na tabela quando for jogo de Liga Nacional
  let homeRank: number | null = null;
  let awayRank: number | null = null;
  if (!isContinental && worldSeason.leagues[compId as LeagueId]) {
    const rows = worldSeason.leagues[compId as LeagueId].standings;
    const hIdx = rows.findIndex((r) => r.clubId === homeClub.id);
    const aIdx = rows.findIndex((r) => r.clubId === awayClub.id);
    if (hIdx !== -1) homeRank = hIdx + 1;
    if (aIdx !== -1) awayRank = aIdx + 1;
  }

  const handleClose = () => {
    setResult(null);
    setMatchModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-[#0B0B0D] text-[#F5F5F7] flex flex-col overflow-hidden">
      {/* Cabeçalho Oficial de Transmissão da Competição */}
      <header
        className="h-16 shrink-0 border-b px-6 md:px-10 flex items-center justify-between"
        style={{
          borderBottomColor: `${theme.accentPrimary}66`,
          background: `linear-gradient(90deg, ${theme.bannerBg} 0%, #0B0B0D 65%)`,
        }}
      >
        <CompetitionBadge
          competitionId={compId}
          size="lg"
          stageSubtitle={`${stageLabel} • ${isHome ? 'EM CASA' : 'FORA DE CASA'} • 2 TEMPOS DE 2:30 MIN`}
        />

        <div className="flex items-center gap-4">
          {!result && (
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-[#16181D] hover:bg-[#22252E] border border-[#242730] font-condensed uppercase font-bold text-xs tracking-widest text-[#9498A3] hover:text-[#F5F5F7] cursor-pointer"
            >
              VOLTAR À CENTRAL
            </button>
          )}

          {!result ? (
            <button
              type="button"
              onClick={() => {
                const r = playCurrentMatch(mindset);
                if (r) setResult(r);
              }}
              style={{ borderLeftColor: theme.accentPrimary }}
              className="console-btn-primary px-8 py-2.5 text-lg cursor-pointer"
            >
              IR PARA O CAMPO / INICIAR ›
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClose}
              style={{ borderLeftColor: theme.accentPrimary }}
              className="console-btn-primary px-8 py-2.5 text-lg cursor-pointer"
            >
              ENCERRAR E VOLTAR À CENTRAL ›
            </button>
          )}
        </div>
      </header>

      {/* CORPO: CENTRAL PRÉ-JOGO DE 3 COLUNAS (OU TELA DE APITO FINAL) */}
      {!result ? (
        <main className="flex-1 max-w-[1480px] w-full mx-auto px-6 md:px-10 py-5 grid lg:grid-cols-12 gap-5 min-h-0">
          {/* Coluna 1: Escudos, Uniformes 1/2/3 e Dados do Jogo */}
          <div className="lg:col-span-4 min-h-0">
            <MatchKitsAndInfoPanel
              homeClub={homeClub}
              awayClub={awayClub}
              isPlayerHome={isHome}
              homeRank={homeRank}
              awayRank={awayRank}
              homeKit={homeKit}
              awayKit={awayKit}
              onChangeHomeKit={setHomeKit}
              onChangeAwayKit={setAwayKit}
              userRole={contract.role}
              mindset={mindset}
              onChangeMindset={setMindset}
              isContinentalNight={isContinental}
              accentColor={theme.accentPrimary}
            />
          </div>

          {/* Coluna 2: Mapa Interativo de Viagem Casa / Fora */}
          <div className="lg:col-span-4 min-h-0">
            <InteractiveTravelMap
              myClub={myClub}
              opponentClub={opponentClub}
              isHome={isHome}
              accentColor={theme.accentPrimary}
            />
          </div>

          {/* Coluna 3: Campinho de Escalação com Seu Nome e Posição */}
          <div className="lg:col-span-4 min-h-0">
            <TacticalLineupPitch
              myClub={myClub}
              opponentClub={opponentClub}
              userPlayer={player}
              userRole={contract.role}
              accentColor={theme.accentPrimary}
            />
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-3xl w-full mx-auto px-6 flex flex-col justify-center gap-6">
          <div
            className="console-tile border-t-[4px] p-8"
            style={{ borderTopColor: theme.accentPrimary }}
          >
            <div className="text-center text-xs uppercase tracking-[0.25em] text-[#9498A3] mb-4">
              APITO FINAL • {homeClub.stadiumName ?? homeClub.name}
            </div>

            <div className="flex items-center justify-around py-4 border-y border-[#242730]">
              <div className="flex flex-col items-center w-44 text-center">
                <ClubCrest clubId={homeClub.id} size="xl" />
                <span className="font-condensed uppercase font-extrabold text-2xl mt-2">
                  {homeClub.name}
                </span>
              </div>

              <div className="font-condensed font-extrabold text-7xl text-[#F5F5F7]">
                {isHome ? result.clubGoals : result.opponentGoals} :{' '}
                {isHome ? result.opponentGoals : result.clubGoals}
              </div>

              <div className="flex flex-col items-center w-44 text-center">
                <ClubCrest clubId={awayClub.id} size="xl" />
                <span className="font-condensed uppercase font-extrabold text-2xl mt-2">
                  {awayClub.name}
                </span>
              </div>
            </div>

            <div
              className="mt-6 bg-[#0E0F12] border-l-4 p-5 flex items-center justify-between"
              style={{ borderLeftColor: theme.accentPrimary }}
            >
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#9498A3]">
                  SUA ATUAÇÃO ({player.shirtName} #{player.shirtNumber})
                </div>
                <div className="font-condensed uppercase font-extrabold text-2xl text-[#F5F5F7]">
                  {result.minutesPlayed} MIN ({result.minuteEntered}'–{result.minuteExited}') •{' '}
                  {result.playerGoals} GOLS • {result.playerAssists} ASSIST
                </div>
              </div>
              <StarRatingBadge stars={result.stars} size="lg" showLabel />
            </div>

            <div className="mt-4 space-y-1 text-xs text-[#9498A3]">
              {result.matchNarrative.map((line, idx) => (
                <div key={idx}>— {line}</div>
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
};
