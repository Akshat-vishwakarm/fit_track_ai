import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { goalService } from '../services/goalService';
import { GoalModal } from '../components/goals/GoalModal';
import { EmptyState } from '../components/common/EmptyState';
import type { Goal } from '../types';

export const GoalsPage: React.FC = () => {
  const { goals, refreshData } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveGoal = async (goalData: Omit<Goal, 'id' | 'created_at' | 'status'>) => {
    await goalService.addGoal(goalData);
    await refreshData();
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Delete this goal?')) {
      await goalService.deleteGoal(id);
      await refreshData();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-on-surface">Target Goals</h1>
          <p className="text-xs text-on-surface-variant">Manage fitness milestones, weight goals, habit targets, and workout goals.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-heading font-bold text-xs shadow-[0_0_15px_rgba(0,210,255,0.3)] hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Set Goal</span>
        </button>
      </div>

      {/* Zero State if 0 goals */}
      {goals.length === 0 ? (
        <EmptyState
          icon="flag"
          title="No goals set yet"
          description="Create your target milestones for weight loss, muscle gain, daily habits, or workout frequency."
          actionLabel="Create First Goal"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const pct = goal.target_value > 0
              ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
              : 0;

            return (
              <div key={goal.id} className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-3 shadow-lg relative">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-heading font-bold uppercase bg-surface-container-high text-primary-container">
                    {goal.category}
                  </span>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-on-surface-variant hover:text-error p-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>

                <div>
                  <h3 className="font-heading font-bold text-base text-on-surface">{goal.title}</h3>
                  <div className="text-xs text-on-surface-variant mt-0.5">
                    Target: {goal.target_value} {goal.unit} | Current: {goal.current_value} {goal.unit}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold font-heading">
                    <span className="text-on-surface-variant">Progress</span>
                    <span className="text-primary-container">{pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-container h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {currentUser && (
        <GoalModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSaveGoal={handleSaveGoal}
          userId={currentUser.id}
        />
      )}
    </div>
  );
};
