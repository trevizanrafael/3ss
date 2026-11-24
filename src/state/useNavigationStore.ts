import { create } from 'zustand';

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
  setScreen: (screen: AppScreen) => void;
  setActiveTab: (tab: HubTab) => void;
  cycleTab: (direction: -1 | 1) => void;
  setMatchModalOpen: (open: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  screen: 'MAIN_MENU',
  activeTab: 'CENTRAL',
  matchModalOpen: false,
  setScreen: (screen) => set({ screen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  cycleTab: (direction) => {
    const idx = HUB_TAB_ORDER.indexOf(get().activeTab);
    const next = (idx + direction + HUB_TAB_ORDER.length) % HUB_TAB_ORDER.length;
    set({ activeTab: HUB_TAB_ORDER[next] });
  },
  setMatchModalOpen: (matchModalOpen) => set({ matchModalOpen }),
}));
