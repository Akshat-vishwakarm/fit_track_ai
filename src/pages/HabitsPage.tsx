import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { habitService } from '../services/habitService';
import { HabitGrid } from '../components/habits/HabitGrid';
import { HabitAnalytics } from '../components/habits/HabitAnalytics';
import { HabitModal } from '../components/habits/HabitModal';
import type { Habit } from '../types';

export const HabitsPage: React.FC = () => {
  const { habits, completionsMap, streak, toggleHabit, refreshData } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveHabit = async (habitData: Omit<Habit, 'id' | 'created_at' | 'archived'>) => {
    await habitService.createHabit(habitData);
    await refreshData();
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (confirm('Are you sure you want to delete this habit and all its logged completions?')) {
      await habitService.deleteHabit(habitId);
      await refreshData();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-on-surface">Daily Disciplines</h1>
          <p className="text-xs text-on-surface-variant">Build consistency one day at a time with 21-day matrix cohorts.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-heading font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Habit</span>
        </button>
      </div>

      {/* 21-Day Spreadsheet Matrix */}
      <HabitGrid
        habits={habits}
        completionsMap={completionsMap}
        onToggleHabit={toggleHabit}
        onDeleteHabit={handleDeleteHabit}
        onAddHabitClick={() => setIsModalOpen(true)}
      />

      {/* Cadence Analytics & Density Histogram */}
      <HabitAnalytics habits={habits} completionsMap={completionsMap} streak={streak} />

      {/* Add Habit Modal */}
      {currentUser && (
        <HabitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveHabit}
          userId={currentUser.id}
        />
      )}
    </div>
  );
};
