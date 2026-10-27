import React from 'react';
import type { WorkoutPlan, WorkoutLog } from '../../types';

interface WeeklySplitViewProps {
  workoutPlans: WorkoutPlan[];
  workoutLogs: WorkoutLog[];
  onConfigurePlan: (dayIndex: number, plan?: WorkoutPlan) => void;
  onLogWorkoutClick: (plan: WorkoutPlan) => void;
  onDeletePlan: (planId: string, dayOfWeek: number) => Promise<void>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WeeklySplitView: React.FC<WeeklySplitViewProps> = ({
  workoutPlans,
  workoutLogs,
  onConfigurePlan,
  onLogWorkoutClick,
  onDeletePlan,
}) => {
  const plansByDay: Record<number, WorkoutPlan | undefined> = {};
  workoutPlans.forEach((p) => {
    plansByDay[p.day_of_week] = p;
  });

  const hasAnyPlans = workoutPlans.length > 0;

  return (
    <div className="space-y-6">
      {/* Zero State Banner if no plans exist */}
      {!hasAnyPlans && (
        <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/20 shadow-lg text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-secondary mb-4">
            <span className="material-symbols-outlined text-[36px]">fitness_center</span>
          </div>
          <h3 className="font-heading text-lg font-bold text-on-surface mb-1">No training split created</h3>
          <p className="text-sm text-on-surface-variant max-w-sm mb-6">
            Create your weekly training split (Monday - Sunday) to organize your workouts and track strength progress.
          </p>
          <button
            onClick={() => onConfigurePlan(0)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary-container text-on-secondary-fixed font-heading font-bold text-sm shadow-[0_0_12px_rgba(0,229,153,0.3)] hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Workout Plan</span>
          </button>
        </div>
      )}

      {/* Grid of 7 Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((dayName, dayIndex) => {
          const plan = plansByDay[dayIndex];
          const isToday = new Date().getDay() === (dayIndex === 6 ? 0 : dayIndex + 1);

          return (
            <div
              key={dayName}
              className={`bg-surface-container-low rounded-2xl p-5 border flex flex-col justify-between shadow-md transition-all ${
                isToday
                  ? 'border-primary-container/50 ring-1 ring-primary-container/20 shadow-[0_0_15px_rgba(0,210,255,0.1)]'
                  : 'border-outline-variant/20 hover:border-outline-variant/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
                      {dayName}
                    </span>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary-container text-[10px] font-heading font-extrabold uppercase">
                        Today
                      </span>
                    )}
                  </div>

                  {plan && (
                    <button
                      onClick={() => onDeletePlan(plan.id, dayIndex)}
                      className="text-on-surface-variant hover:text-error p-1"
                      title="Delete Plan"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  )}
                </div>

                {plan ? (
                  <div className="space-y-3">
                    <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/10">
                      <div className="font-heading font-bold text-sm text-on-surface">
                        {plan.workout_name}
                      </div>
                      <div className="text-xs text-secondary font-medium">
                        Target: {plan.muscle_group}
                      </div>
                    </div>

                    {/* Exercises bullet list */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-heading font-bold text-on-surface-variant uppercase">
                        Exercises ({plan.exercises?.length || 0})
                      </div>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {plan.exercises?.map((ex) => (
                          <div
                            key={ex.id}
                            className="flex items-center justify-between text-xs text-on-surface bg-surface-container-high/40 px-2.5 py-1 rounded-lg"
                          >
                            <span className="truncate">{ex.name}</span>
                            <span className="text-[10px] font-heading font-semibold text-on-surface-variant shrink-0 ml-2">
                              {ex.target_sets}x{ex.target_reps} @ {ex.target_weight}kg
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[24px] opacity-40 mb-1">
                      bed
                    </span>
                    <div className="text-xs font-semibold">Rest Day / Unconfigured</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-outline-variant/10 flex gap-2">
                {plan ? (
                  <>
                    <button
                      onClick={() => onLogWorkoutClick(plan)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary-container text-on-secondary-fixed font-heading font-bold text-xs shadow-[0_0_10px_rgba(0,229,153,0.3)] hover:scale-[1.02] transition-transform"
                    >
                      <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      <span>Log Session</span>
                    </button>
                    <button
                      onClick={() => onConfigurePlan(dayIndex, plan)}
                      className="px-3 py-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-on-surface font-heading font-bold text-xs"
                      title="Edit Split"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onConfigurePlan(dayIndex)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-heading font-bold text-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Set Workout Plan</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Workout History Table */}
      {workoutLogs.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
            Completed Workout Log History
          </div>
          <div className="divide-y divide-outline-variant/10">
            {workoutLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-heading font-bold text-on-surface">{log.workout_name}</span>
                  <span className="text-on-surface-variant ml-2 font-medium">({log.date})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-primary-container font-heading font-semibold">
                    ⏱️ {log.duration_minutes} mins
                  </span>
                  <span className="text-secondary font-heading font-semibold">
                    🏋️ {log.exercise_logs?.length || 0} exercises
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
