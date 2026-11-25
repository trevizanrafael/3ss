import React, { useMemo, useState } from 'react';
import { getClubById } from '../../../data/clubs';
import { getCompetitionTheme } from '../../../data/world/competitionThemes';
import { getTransferWindowStatus } from '../../../domains/contracts/transferWindowAndValue';
import { evaluateNationalCallUp } from '../../../domains/international/callUpEvaluator';
import { GamepadBadge } from '../../../shared/gamepad/GamepadBadge';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { CompetitionBadge } from '../../../shared/ui/CompetitionBadge';
import {
  buildFullMonthCalendarGrid,
  getCurrentCalendarMonthKey,
  getSeasonMonthsCatalog,
  MonthlyCalendarCell,
} from '../../../shared/utils/calendarDates';
import { useCareerStore } from '../../../state/useCareerStore';
import { MatchDayTileThemeArt } from '../dashboard/MatchDayTileThemeArt';

const WEEKDAY_HEADERS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const;

interface MonthlyCalendarViewProps {
  onBackToCompetitions: () => void;
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  onBackToCompetitions,
}) => {
  const { player, contract, calendar, worldSeason, periodStats, currentSeasonStints } =
    useCareerStore();

  const months = useMemo(() => getSeasonMonthsCatalog(calendar.season), [calendar.season]);
  const todayMonthKey = useMemo(() => getCurrentCalendarMonthKey(calendar), [calendar]);

  const initialIdx = useMemo(() => {
    const found = months.findIndex((m) => m.key === todayMonthKey);
    return found !== -1 ? found : 0;
  }, [months, todayMonthKey]);

  const [monthIdx, setMonthIdx] = useState<number>(initialIdx);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  if (!player || !contract || months.length === 0) return null;

  const safeIdx = Math.max(0, Math.min(months.length - 1, monthIdx));
  const currentMonth = months[safeIdx];
  const callUp = evaluateNationalCallUp(player, contract.stage, periodStats);

  const cells = buildFullMonthCalendarGrid(
    currentMonth,
    calendar,
    worldSeason,
    contract.clubId,
    contract.stage,
    callUp,
    currentSeasonStints,
  );

  const inMonthMatches = cells.filter((c) => c.inCurrentMonth && c.matchOverview);
  const wins = inMonthMatches.filter((c) => c.matchOverview?.outcome === 'W').length;
  const draws = inMonthMatches.filter((c) => c.matchOverview?.outcome === 'D').length;
  const losses = inMonthMatches.filter((c) => c.matchOverview?.outcome === 'L').length;
  const hasOpenWindowDays = cells.some((c) => c.inCurrentMonth && c.isTransferWindowOpen);
  const liveWindowStatus = getTransferWindowStatus(calendar.week);

  const activeCell: MonthlyCalendarCell | undefined =
    cells.find((c) => c.isoKey === selectedIso) ??
    cells.find((c) => c.isToday) ??
    inMonthMatches[0] ??
    cells.find((c) => c.inCurrentMonth);

  const rowCount = Math.max(4, Math.round(cells.length / 7));

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      {/* Atalhos invisíveis LT / RT para avançar e voltar meses no controle */}
      <button
        type="button"
        data-pad-lt="true"
        data-nav-ignore="true"
        className="hidden"
        onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
      />
      <button
        type="button"
        data-pad-rt="true"
        data-nav-ignore="true"
        className="hidden"
        onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
      />

      {/* Barra Superior do Calendário Mensal */}
      <div className="console-tile px-5 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-focusable="true"
            disabled={safeIdx <= 0}
            onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
            className="px-3 py-1.5 bg-[#12141B] hover:bg-[#1E222D] disabled:opacity-35 border border-[#242730] inline-flex items-center gap-2 font-condensed uppercase font-bold text-xs tracking-wider text-[#F5F5F7] cursor-pointer"
          >
            <GamepadBadge action="LT" />
            <span>◄ MÊS ANTERIOR</span>
          </button>

          <div className="px-4 py-1 bg-[#0E1015] border border-[#242730] min-w-[13rem] text-center">
            <span className="font-condensed uppercase font-extrabold text-2xl tracking-wider text-[#F5F5F7]">
              {currentMonth.label}
            </span>
          </div>

          <button
            type="button"
            data-focusable="true"
            disabled={safeIdx >= months.length - 1}
            onClick={() => setMonthIdx((i) => Math.min(months.length - 1, i + 1))}
            className="px-3 py-1.5 bg-[#12141B] hover:bg-[#1E222D] disabled:opacity-35 border border-[#242730] inline-flex items-center gap-2 font-condensed uppercase font-bold text-xs tracking-wider text-[#F5F5F7] cursor-pointer"
          >
            <span>PRÓXIMO MÊS ►</span>
            <GamepadBadge action="RT" />
          </button>

          {currentMonth.key !== todayMonthKey && (
            <button
              type="button"
              data-focusable="true"
              onClick={() => setMonthIdx(initialIdx)}
              className="px-3 py-1.5 bg-[#1B1810] border border-[#C8A45D] font-condensed uppercase font-extrabold text-xs tracking-wider text-[#C8A45D] cursor-pointer"
            >
              IR PARA HOJE
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-condensed uppercase tracking-wider">
            <span className="inline-block w-5 h-[4px] bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
            <span className={hasOpenWindowDays ? 'text-[#38BDF8] font-bold' : 'text-[#9498A3]'}>
              {hasOpenWindowDays ? 'JANELA DE TRANSFERÊNCIAS ABERTA NO MÊS' : 'JANELA FECHADA NESTE MÊS'}
            </span>
          </div>

          <button
            type="button"
            data-focusable="true"
            onClick={onBackToCompetitions}
            className="px-4 py-1.5 bg-[#F5F5F7] text-[#0B0B0D] font-condensed uppercase font-extrabold text-xs tracking-widest inline-flex items-center gap-2 cursor-pointer"
          >
            <GamepadBadge action="ALT_Y" darkText />
            <span>VER TABELAS & COMPETIÇÕES</span>
          </button>
        </div>
      </div>

      {/* Grade Principal de 7 Colunas + Painel Lateral de Resumo do Mês / Jogo */}
      <div className="flex-1 grid lg:grid-cols-12 gap-4 min-h-0">
        {/* Grade do Mês Inteiro (9 colunas) */}
        <div className="lg:col-span-9 console-tile p-3 flex flex-col min-h-0">
          <div className="grid grid-cols-7 border-b border-[#242730] pb-1.5 mb-1.5 shrink-0">
            {WEEKDAY_HEADERS.map((wd) => (
              <div
                key={wd}
                className="text-center font-condensed uppercase font-extrabold text-xs tracking-[0.2em] text-[#9498A3]"
              >
                {wd}
              </div>
            ))}
          </div>

          <div
            className="flex-1 grid grid-cols-7 gap-1.5 min-h-0"
            style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
          >
            {cells.map((cell) => {
              const match = cell.matchOverview;
              const isSelected = activeCell?.isoKey === cell.isoKey;
              const dimCls = !cell.inCurrentMonth
                ? 'opacity-25'
                : cell.isPast && !cell.isToday
                  ? 'opacity-85'
                  : '';

              if (match) {
                const fxTheme = getCompetitionTheme(match.competitionId);
                const oppClub = getClubById(match.opponentId);
                const venueMicro = match.neutralVenue
                  ? 'SEDE'
                  : match.isHome
                    ? 'CASA'
                    : 'FORA';
                const resColor =
                  match.outcome === 'W'
                    ? '#2DBE60'
                    : match.outcome === 'L'
                      ? '#EF4444'
                      : '#EAB308';
                const resLetter =
                  match.outcome === 'W' ? 'V' : match.outcome === 'L' ? 'D' : 'E';

                return (
                  <button
                    key={cell.isoKey}
                    type="button"
                    data-focusable={cell.inCurrentMonth ? 'true' : undefined}
                    data-autofocus={cell.isToday ? 'true' : undefined}
                    onFocus={() => setSelectedIso(cell.isoKey)}
                    onClick={() => setSelectedIso(cell.isoKey)}
                    className={`relative overflow-hidden border p-1.5 flex flex-col justify-between text-left cursor-pointer outline-none transition-transform ${dimCls} ${
                      cell.isToday
                        ? 'border-2 border-[#C8A45D] shadow-[0_0_16px_rgba(200,164,93,0.45)]'
                        : isSelected
                          ? 'border-[#F5F5F7]'
                          : 'border-[#242730]'
                    }`}
                  >
                    <MatchDayTileThemeArt competitionId={match.competitionId} />

                    {/* Tracinho Azul Superior da Janela de Transferências Aberta */}
                    {cell.isTransferWindowOpen && (
                      <div
                        className="pointer-events-none absolute top-0 inset-x-0 h-[4px] bg-[#38BDF8] z-20"
                        style={{ boxShadow: '0 0 8px rgba(56,189,248,0.9)' }}
                      />
                    )}

                    {/* Topo: Logo da Competição + Data Compacta no Canto Superior Direito */}
                    <div className="relative z-10 flex items-start justify-between w-full gap-1 pt-0.5">
                      <CompetitionBadge
                        competitionId={match.competitionId}
                        size="sm"
                        showName={false}
                      />
                      <div className="flex items-center gap-1 bg-[#07090E]/75 px-1.5 py-0.5 border border-white/10">
                        {cell.isToday && (
                          <span className="font-condensed font-extrabold text-[8px] tracking-wider text-[#C8A45D]">
                            HOJE
                          </span>
                        )}
                        <span
                          className="font-condensed font-extrabold text-xs leading-none tabular-nums"
                          style={{ color: cell.isToday ? '#C8A45D' : fxTheme.accentPrimary }}
                        >
                          {cell.dayNumber}
                        </span>
                      </div>
                    </div>

                    {/* Centro: Escudo do Adversário */}
                    <div className="relative z-10 my-auto flex items-center justify-center">
                      <div style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.7))' }}>
                        <ClubCrest clubId={match.opponentId} size="md" />
                      </div>
                    </div>

                    {/* Base: Resultado (V/E/D + Placar) se já jogou, ou Mando + Adversário se futuro */}
                    {match.played ? (
                      <div
                        className="relative z-10 w-full px-1.5 py-0.5 bg-[#07090F]/92 border-l-2 flex items-center justify-between gap-1"
                        style={{ borderLeftColor: resColor }}
                      >
                        <span
                          className="px-1 font-condensed font-extrabold text-[10px] leading-tight text-[#0B0B0D]"
                          style={{ backgroundColor: resColor }}
                        >
                          {resLetter}
                        </span>
                        <span className="font-condensed font-extrabold text-xs text-[#F5F5F7] tabular-nums">
                          {match.myGoals} - {match.oppGoals}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="relative z-10 w-full px-1.5 py-0.5 bg-[#07090F]/85 border-l-2 flex items-center justify-between gap-1"
                        style={{ borderLeftColor: fxTheme.accentPrimary }}
                      >
                        <span className="font-condensed uppercase font-bold text-[9px] tracking-wider text-[#D4D7E0]">
                          {venueMicro}
                        </span>
                        <span className="font-condensed uppercase font-extrabold text-xs text-[#F5F5F7] truncate">
                          {oppClub.shortName}
                        </span>
                      </div>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={cell.isoKey}
                  type="button"
                  data-focusable={cell.inCurrentMonth ? 'true' : undefined}
                  data-autofocus={cell.isToday ? 'true' : undefined}
                  onFocus={() => setSelectedIso(cell.isoKey)}
                  onClick={() => setSelectedIso(cell.isoKey)}
                  className={`relative p-2 bg-[#0F1117] border flex flex-col justify-between text-left cursor-pointer outline-none ${dimCls} ${
                    cell.isToday
                      ? 'border-2 border-[#C8A45D] bg-[#181A22]'
                      : isSelected
                        ? 'border-[#9498A3] bg-[#151821]'
                        : 'border-[#1E212B]'
                  }`}
                >
                  {/* Tracinho Azul Superior da Janela de Transferências Aberta */}
                  {cell.isTransferWindowOpen && (
                    <div
                      className="pointer-events-none absolute top-0 inset-x-0 h-[4px] bg-[#38BDF8] z-10"
                      style={{ boxShadow: '0 0 8px rgba(56,189,248,0.75)' }}
                    />
                  )}

                  <div className="flex items-center justify-between w-full pt-0.5">
                    {cell.isToday ? (
                      <span className="px-1.5 py-0.5 bg-[#C8A45D] text-[#0B0B0D] font-condensed uppercase font-extrabold text-[9px] tracking-widest">
                        HOJE
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`font-condensed font-extrabold text-base leading-none tabular-nums ${
                        cell.isToday ? 'text-[#F5F5F7]' : 'text-[#9498A3]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    {cell.isTrainingDay ? (
                      <span className="px-1.5 py-0.5 bg-[#191C24] text-[#C8A45D] font-condensed uppercase font-bold text-[9px] tracking-widest">
                        TREINO
                      </span>
                    ) : cell.gameWeek === null ? (
                      <span className="text-[9px] uppercase text-[#565A65] font-condensed">
                        FÉRIAS
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 bg-[#242730]" />
                    )}

                    {cell.isTransferWindowOpen && (
                      <span className="font-condensed uppercase font-bold text-[9px] tracking-wider text-[#38BDF8]">
                        JANELA
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Coluna Lateral Direita (3 colunas): Balanço do Mês + Inspecionar Partida do Dia */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          <div className="console-tile border-t-[3px] border-t-[#C8A45D] p-4 space-y-3 shrink-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#9498A3] font-bold">
              BALANÇO DE {currentMonth.label}
            </div>

            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              {[
                ['JOGOS', inMonthMatches.length, '#F5F5F7'],
                ['VIT', wins, '#2DBE60'],
                ['EMP', draws, '#EAB308'],
                ['DER', losses, '#EF4444'],
              ].map(([lbl, val, col]) => (
                <div key={lbl as string} className="bg-[#0D0F14] border border-[#242730] py-2">
                  <div
                    className="font-condensed font-extrabold text-2xl leading-none tabular-nums"
                    style={{ color: col as string }}
                  >
                    {val}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-[#9498A3] mt-1">
                    {lbl}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#242730]">
              <div className="text-[10px] uppercase tracking-widest text-[#9498A3]">
                JANELA DE TRANSFERÊNCIAS ATUAL
              </div>
              <div
                className={`font-condensed uppercase font-extrabold text-sm mt-0.5 ${
                  liveWindowStatus.isOpen ? 'text-[#38BDF8]' : 'text-[#9498A3]'
                }`}
              >
                {liveWindowStatus.windowLabel}
              </div>
              <div className="text-[11px] text-[#9498A3] mt-0.5">
                {liveWindowStatus.isOpen
                  ? `Faltam ${liveWindowStatus.weeksRemainingInWindow} semana(s) p/ fechar`
                  : liveWindowStatus.nextWindowLabel}
              </div>
            </div>
          </div>

          {/* Detalhes do Dia Selecionado */}
          <div className="flex-1 console-tile p-4 flex flex-col justify-between min-h-0">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#9498A3] font-bold pb-2 border-b border-[#242730]">
                INSPEÇÃO DO DIA {activeCell?.dayNumber ?? '--'}
                {activeCell?.gameWeek ? ` • SEMANA ${activeCell.gameWeek}` : ''}
              </div>

              {activeCell?.matchOverview ? (
                <div className="pt-3 space-y-3">
                  <CompetitionBadge
                    competitionId={activeCell.matchOverview.competitionId}
                    size="md"
                    stageSubtitle={activeCell.matchOverview.stageLabel}
                  />

                  <div className="bg-[#0D0F14] border border-[#242730] p-3 flex items-center justify-between gap-2">
                    <div className="flex flex-col items-center text-center flex-1 min-w-0">
                      <ClubCrest clubId={activeCell.matchOverview.myTeamId} size="md" />
                      <span className="font-condensed uppercase font-bold text-xs text-[#F5F5F7] mt-1 truncate w-full">
                        {getClubById(activeCell.matchOverview.myTeamId).shortName}
                      </span>
                    </div>

                    <div className="text-center px-2 shrink-0">
                      {activeCell.matchOverview.played ? (
                        <>
                          <div className="font-condensed font-extrabold text-2xl text-[#F5F5F7] tabular-nums leading-none">
                            {activeCell.matchOverview.myGoals} - {activeCell.matchOverview.oppGoals}
                          </div>
                          <span
                            className="inline-block mt-1 px-2 py-0.5 font-condensed uppercase font-extrabold text-[10px] text-[#0B0B0D]"
                            style={{
                              backgroundColor:
                                activeCell.matchOverview.outcome === 'W'
                                  ? '#2DBE60'
                                  : activeCell.matchOverview.outcome === 'L'
                                    ? '#EF4444'
                                    : '#EAB308',
                            }}
                          >
                            {activeCell.matchOverview.outcome === 'W'
                              ? 'VITÓRIA'
                              : activeCell.matchOverview.outcome === 'L'
                                ? 'DERROTA'
                                : 'EMPATE'}
                          </span>
                        </>
                      ) : (
                        <span className="px-2.5 py-1 bg-[#1A1D26] font-condensed uppercase font-extrabold text-xs text-[#C8A45D]">
                          VS
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-center text-center flex-1 min-w-0">
                      <ClubCrest clubId={activeCell.matchOverview.opponentId} size="md" />
                      <span className="font-condensed uppercase font-bold text-xs text-[#F5F5F7] mt-1 truncate w-full">
                        {getClubById(activeCell.matchOverview.opponentId).shortName}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs uppercase tracking-wider text-[#9498A3]">
                    MANDO:{' '}
                    <strong className="text-[#F5F5F7]">
                      {activeCell.matchOverview.neutralVenue
                        ? 'SEDE ÚNICA / NEUTRA'
                        : activeCell.matchOverview.isHome
                          ? 'EM CASA'
                          : 'FORA DE CASA'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-xs uppercase tracking-wider text-[#9498A3] space-y-2">
                  <div className="font-condensed font-bold text-lg text-[#F5F5F7]">
                    {activeCell?.isTrainingDay
                      ? 'DIA DE TREINO NO CT'
                      : 'SEM PARTIDA AGENDADA'}
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    {activeCell?.isTransferWindowOpen
                      ? 'A Janela de Transferências está aberta neste dia (indicada pela barra azul no topo).'
                      : 'Dia livre de recuperação física e preparação tática do elenco.'}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#242730] text-[10px] uppercase tracking-widest text-[#565A65]">
              USE LT / RT OU OS BOTÕES SUPERIORES PARA NAVEGAR ENTRE OS MESES
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
