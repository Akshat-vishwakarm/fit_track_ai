import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { LoginScreen } from './components/auth/LoginScreen';

import { DashboardPage } from './pages/DashboardPage';
import { HabitsPage } from './pages/HabitsPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { NutritionPage } from './pages/NutritionPage';
import { ProgressPage } from './pages/ProgressPage';
import { GoalsPage } from './pages/GoalsPage';
import { AIPage } from './pages/AIPage';
import { SettingsPage } from './pages/SettingsPage';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const { loading: dataLoading } = useData();

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-container border-t-transparent rounded-full animate-spin" />
          <div className="font-heading font-bold text-xs text-on-surface-variant uppercase tracking-wider">
            Loading Fitness Data...
          </div>
        </div>
      </div>
    );
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage setActiveTab={setActiveTab} />;
      case 'habits':
        return <HabitsPage />;
      case 'workout':
        return <WorkoutPage />;
      case 'nutrition':
        return <NutritionPage />;
      case 'progress':
        return <ProgressPage />;
      case 'goals':
        return <GoalsPage />;
      case 'ai':
        return <AIPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col antialiased selection:bg-primary-container selection:text-on-primary-fixed">
      {/* Header Bar */}
      <Header activeTab={activeTab} />

      {/* Desktop Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 pt-20 pb-24 md:pb-12 px-4 md:px-8 max-w-7xl w-full mx-auto">
        {renderActivePage()}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

const AuthGuard: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-container border-t-transparent rounded-full animate-spin" />
          <div className="font-heading font-bold text-xs text-on-surface-variant uppercase tracking-wider">
            Verifying Credentials...
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return (
    <DataProvider>
      <MainLayout />
    </DataProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}

