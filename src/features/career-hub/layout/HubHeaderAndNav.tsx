import React from 'react';
import {
  Briefcase,
  Calendar,
  Dumbbell,
  FastForward,
  Home,
  LogOut,
  Play,
  ShoppingBag,
  Trophy,
  Wallet,
} from 'lucide-react';
import { getClubById } from '../../../data/clubs';
import { DAYS_OF_WEEK } from '../../../shared/types/common';
import { ClubCrest } from '../../../shared/ui/ClubCrest';
import { StarRatingBadge } from '../../../shared/ui/StarRatingBadge';
import {
  formatCalendarDate,
  formatMoney,
  formatSquadRole,
  getOvrBadgeStyle,
} from '../../../shared/utils/formatters';
import { useCareerStore } from '../../../state/useCareerStore';
import { HubTab, useNavigationStore } from '../../../state/useNavigationStore';

const NAV_ITEMS: { id: HubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'DASHBOARD', label: 'Visão Geral', icon: <Home size={16} /> },
  { id: 'TRAINING', label: 'Treinos (0–99)', icon: <Dumbbell size={16} /> },
  { id: 'CONTRACTS', label: 'Contratos & Base', icon: <Briefcase size={16} /> },
  { id: 'EQUIPMENT', label: 'Estrutura & Loja', icon: <ShoppingBag size={16} /> },
  { id: 'COMPETITIONS', label: 'Ligas & Elencos', icon: <Trophy size={16} /> },
];

export const HubHeaderAndNav: React.FC = () => {
  const {
    player,
    contract,
    calendar,
    bankBalance,
    transitionProposals,
    marketOffers,
    advanceDay,
    advanceToMatchDay,
  } = useCareerStore();
  const { activeTab, setActiveTab, setMatchModalOpen, setScreen } = useNavigationStore();

  if (!player || !contract) return null;
  const club = getClubById(contract.clubId);
  const isMatchDay = calendar.day === 6;
  const isTrainingDay = calendar.day === 2 || calendar.day === 4;
  const pendingOffersCount = transitionProposals.length + marketOffers.length;

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Identidade do Atleta e Clube */}
        <div className="flex items-center gap-3.5">
          <ClubCrest
            clubId={club.id}
            shortName={club.shortName}
            primaryColor={club.primaryColor}
            secondaryColor={club.secondaryColor}
            pattern={club.pattern}
            size="lg"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">{player.fullName}</h1>
              <span className={`px-2 py-0.5 text-xs font-bold rounded border ${getOvrBadgeStyle(player.overall)}`}>
                {player.overall} OVR • {player.position}
              </span>
              <StarRatingBadge stars={player.reputationStars} size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="text-slate-200 font-semibold">{club.name}</span> •{' '}
              {formatSquadRole(contract.role)} • {player.age} anos
            </p>
          </div>
        </div>

        {/* Status Rápido + Ações de Calendário */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs">
            <span className="text-slate-400 block">Fôlego</span>
            <span className="font-bold text-emerald-400 tabular-nums">{player.stamina}%</span>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs flex items-center gap-2">
            <Wallet size={15} className="text-amber-400" />
            <div>
              <span className="text-slate-400 block">Saldo Pessoal</span>
              <span className="font-bold text-white tabular-nums">{formatMoney(bankBalance)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Calendar size={12} /> {formatCalendarDate(calendar)}
            </span>
            <span className="font-semibold text-amber-300">
              {isMatchDay
                ? '⚽ Dia de Partida Oficial!'
                : isTrainingDay
                  ? '🏋️ Dia de Treino (50% Auto ou 100% Ativo)'
                  : `Rotina (${DAYS_OF_WEEK[calendar.day - 1]})`}
            </span>
          </div>

          {!isMatchDay ? (
            <div className="flex items-center gap-2">
              <button
                onClick={advanceDay}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 transition cursor-pointer"
              >
                +1 Dia
              </button>
              <button
                onClick={advanceToMatchDay}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
              >
                <FastForward size={15} />
                Ir pro Jogo (Sáb)
              </button>
            </div>
          ) : (
            <button
              onClick={() => setMatchModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-sm font-extrabold shadow-[0_0_20px_rgba(251,191,36,0.35)] transition cursor-pointer"
            >
              <Play size={16} className="fill-slate-950" />
              ENTRAR PRO JOGO
            </button>
          )}
        </div>
      </div>

      {/* Abas de Navegação */}
      <nav className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            const showBadge = item.id === 'CONTRACTS' && pendingOffersCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition cursor-pointer ${
                  active
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                {item.label}
                {showBadge && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold">
                    {pendingOffersCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setScreen('MAIN_MENU')}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 py-2 pl-4 cursor-pointer"
        >
          <LogOut size={14} /> Menu
        </button>
      </nav>
    </header>
  );
};
