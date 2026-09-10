import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { progressService } from '../services/progressService';
import { ProgressCharts } from '../components/progress/ProgressCharts';
import { LogProgressModal } from '../components/progress/LogProgressModal';
import type { ProgressEntry } from '../types';

export const ProgressPage: React.FC = () => {
  const { progressEntries, refreshData } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveProgress = async (entry: Omit<ProgressEntry, 'id' | 'created_at'>) => {
    await progressService.addProgressEntry(entry);
    await refreshData();
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Delete progress entry?')) {
      await progressService.deleteProgressEntry(id);
      await refreshData();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-on-surface">Body Progress & Analytics</h1>
          <p className="text-xs text-on-surface-variant">Log weight and body measurements to plot real progress trajectory over time.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-heading font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Log Measurements</span>
        </button>
      </div>

      {/* Trajectory Charts */}
      <ProgressCharts
        entries={progressEntries}
        onLogClick={() => setIsModalOpen(true)}
        onDeleteEntry={handleDeleteEntry}
      />

      {/* Modal */}
      {currentUser && (
        <LogProgressModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaveProgress={handleSaveProgress}
          userId={currentUser.id}
        />
      )}
    </div>
  );
};
