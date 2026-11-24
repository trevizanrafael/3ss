import React from 'react';
import { useNavigationStore } from '../../state/useNavigationStore';
import { CompetitionsTab } from './competitions/CompetitionsTab';
import { ContractsTab } from './contracts/ContractsTab';
import { DashboardTab } from './dashboard/DashboardTab';
import { EquipmentTab } from './equipment/EquipmentTab';
import { HubHeaderAndNav } from './layout/HubHeaderAndNav';
import { MatchDayModal } from './match-day/MatchDayModal';
import { TrainingTab } from './training/TrainingTab';

export const CareerHubScreen: React.FC = () => {
  const { activeTab } = useNavigationStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <HubHeaderAndNav />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        {activeTab === 'DASHBOARD' && <DashboardTab />}
        {activeTab === 'TRAINING' && <TrainingTab />}
        {activeTab === 'CONTRACTS' && <ContractsTab />}
        {activeTab === 'EQUIPMENT' && <EquipmentTab />}
        {activeTab === 'COMPETITIONS' && <CompetitionsTab />}
      </main>

      <MatchDayModal />
    </div>
  );
};
