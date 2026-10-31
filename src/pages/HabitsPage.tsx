import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { habitService } from '../services/habitService';
import { HabitGrid } from '../components/habits/HabitGrid';
import { HabitAnalytics } from '../components/habits/HabitAnalytics';
import { HabitModal } from '../components/habits/HabitModal';
import type { Habit } from '../types';

export const HabitsPage: React.FC = () => {
  const { habits, completionsMap, streak, toggleHabit, clearAllCompletions, refreshData } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveHabit = async (habitData: Omit<Habit, 'id' | 'created_at' | 'archived'>) => {
    await habitService.createHabit(habitData);
    await refreshData();
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (confirm('Are you sure you want to delete this habit and all its logged completions?')) {
      await habitService.deleteHabit(habitId, currentUser?.id);
      await refreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary tracking-tight">
            Daily Disciplines
          </h1>
          <p className="text-xs text-secondary mt-0.5">
            Build consistency one day at a time with 21-day matrix cohorts.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="h-9 px-4 bg-primary text-on-primary font-medium text-xs rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Add Habit</span>
        </button>
      </div>

      {/* Spreadsheet Matrix Table */}
      <HabitGrid
        habits={habits}
        completionsMap={completionsMap}
        onToggleHabit={toggleHabit}
        onDeleteHabit={handleDeleteHabit}
        onAddHabitClick={() => setIsModalOpen(true)}
        onClearAllCompletions={clearAllCompletions}
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
