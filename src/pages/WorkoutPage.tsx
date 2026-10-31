import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { workoutService } from '../services/workoutService';
import { WeeklySplitView } from '../components/workout/WeeklySplitView';
import { WorkoutPlanModal } from '../components/workout/WorkoutPlanModal';
import { WorkoutLogModal } from '../components/workout/WorkoutLogModal';
import type { WorkoutPlan, WorkoutLog, WorkoutExercise } from '../types';

export const WorkoutPage: React.FC = () => {
  const { workoutPlans, workoutLogs, refreshData } = useData();
  const { currentUser } = useAuth();

  const [isConfigureOpen, setIsConfigureOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeLoggingPlan, setActiveLoggingPlan] = useState<WorkoutPlan | null>(null);

  const handleOpenConfigure = (dayIndex: number, plan?: WorkoutPlan) => {
    setSelectedDay(dayIndex);
    setEditingPlan(plan || null);
    setIsConfigureOpen(true);
  };

  const handleSavePlan = async (
    dayOfWeek: number,
    workoutName: string,
    muscleGroup: string,
    exercises: WorkoutExercise[]
  ) => {
    if (!currentUser) return;
    await workoutService.saveWorkoutPlan(
      currentUser.id,
      dayOfWeek,
      workoutName,
      muscleGroup,
      exercises
    );
    await refreshData();
  };

  const handleDeletePlan = async (planId: string, dayOfWeek: number) => {
    if (confirm('Delete this workout plan from your split?')) {
      await workoutService.deleteWorkoutPlan(planId, currentUser?.id, dayOfWeek);
      await refreshData();
    }
  };

  const handleOpenLogModal = (plan: WorkoutPlan) => {
    setActiveLoggingPlan(plan);
    setIsLogModalOpen(true);
  };

  const handleSaveLog = async (logData: Omit<WorkoutLog, 'id' | 'created_at'>) => {
    await workoutService.logWorkout(logData);
    await refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-primary tracking-tight">
            Gym &amp; Workout Routine
          </h1>
          <p className="text-xs text-secondary mt-0.5">
            Configure your weekly training split (Mon – Sun) and log training sessions.
          </p>
        </div>

        <button
          onClick={() => handleOpenConfigure(0)}
          className="h-9 px-4 bg-primary text-on-primary text-xs font-medium rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>+ Create Workout Plan</span>
        </button>
      </div>

      {/* 7-Day Weekly Training Split */}
      <WeeklySplitView
        workoutPlans={workoutPlans}
        workoutLogs={workoutLogs}
        onConfigurePlan={handleOpenConfigure}
        onLogWorkoutClick={handleOpenLogModal}
        onDeletePlan={handleDeletePlan}
      />

      {/* Configure Split Modal */}
      <WorkoutPlanModal
        isOpen={isConfigureOpen}
        onClose={() => setIsConfigureOpen(false)}
        onSave={handleSavePlan}
        initialPlan={editingPlan}
        selectedDay={selectedDay}
      />

      {/* Active Session Workout Logger Modal */}
      {isLogModalOpen && activeLoggingPlan && currentUser && (
        <WorkoutLogModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          onSaveLog={handleSaveLog}
          userId={currentUser.id}
          initialPlan={activeLoggingPlan}
        />
      )}
    </div>
  );
};
