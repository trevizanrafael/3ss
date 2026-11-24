import { create } from 'zustand';

export type AppScreen = 'MAIN_MENU' | 'CREATE_PLAYER' | 'TRYOUT' | 'CAREER_HUB';

export type HubTab =
  | 'DASHBOARD'
  | 'TRAINING'
  | 'CONTRACTS'
  | 'EQUIPMENT'
  | 'COMPETITIONS';

interface NavigationState {
  screen: AppScreen;
  activeTab: HubTab;
  matchModalOpen: boolean;
  setScreen: (screen: AppScreen) => void;
  setActiveTab: (tab: HubTab) => void;
  setMatchModalOpen: (open: boolean) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  screen: 'MAIN_MENU',
  activeTab: 'DASHBOARD',
  matchModalOpen: false,
  setScreen: (screen) => set({ screen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setMatchModalOpen: (matchModalOpen) => set({ matchModalOpen }),
}));
