import { create } from 'zustand';
import { AnyCompetitionId } from '../data/world/competitionThemes';

export type AppScreen = 'MAIN_MENU' | 'CREATE_PLAYER' | 'TRYOUT' | 'CAREER_HUB';

export type HubTab =
  | 'CENTRAL'
  | 'MEU_PRO'
  | 'TREINO'
  | 'ESCRITORIO'
  | 'TEMPORADA';

export const HUB_TAB_ORDER: HubTab[] = [
  'CENTRAL',
  'MEU_PRO',
  'TREINO',
  'ESCRITORIO',
  'TEMPORADA',
];

interface NavigationState {
  screen: AppScreen;
  activeTab: HubTab;
  matchModalOpen: boolean;
  requestedCompId: AnyCompetitionId | null;
  setScreen: (screen: AppScreen) => void;
  setActiveTab: (tab: HubTab) => void;
  openSeasonCompetition: (compId: AnyCompetitionId) => void;
  clearRequestedComp: () => void;
  cycleTab: (direction: -1 | 1) => void;
  setMatchModalOpen: (open: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  screen: 'MAIN_MENU',
  activeTab: 'CENTRAL',
  matchModalOpen: false,
  requestedCompId: null,
  setScreen: (screen) => set({ screen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  openSeasonCompetition: (compId) =>
    set({ activeTab: 'TEMPORADA', requestedCompId: compId }),
  clearRequestedComp: () => set({ requestedCompId: null }),
  cycleTab: (direction) => {
    const idx = HUB_TAB_ORDER.indexOf(get().activeTab);
    const next = (idx + direction + HUB_TAB_ORDER.length) % HUB_TAB_ORDER.length;
    set({ activeTab: HUB_TAB_ORDER[next] });
  },
  setMatchModalOpen: (matchModalOpen) => set({ matchModalOpen }),
}));
