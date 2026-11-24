import React from 'react';
import { CareerHubScreen } from './features/career-hub/CareerHubScreen';
import { MainMenuScreen } from './features/main-menu/MainMenuScreen';
import { PlayerCreationScreen } from './features/player-creation/PlayerCreationScreen';
import { TryoutScreen } from './features/tryout/TryoutScreen';
import { useNavigationStore } from './state/useNavigationStore';

export const App: React.FC = () => {
  const { screen } = useNavigationStore();

  if (screen === 'CREATE_PLAYER') return <PlayerCreationScreen />;
  if (screen === 'TRYOUT') return <TryoutScreen />;
  if (screen === 'CAREER_HUB') return <CareerHubScreen />;
  return <MainMenuScreen />;
};

export default App;
