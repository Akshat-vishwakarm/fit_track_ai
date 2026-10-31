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

  // Calculate current completion rate for current week
  const configuredDaysCount = workoutPlans.length;
  const loggedWorkoutsCount = workoutLogs.length;
  const completionRate = configuredDaysCount > 0
    ? Math.min(100, Math.round((loggedWorkoutsCount / configuredDaysCount) * 100))
    : 0;

  // Date range for current week
  const now = new Date();
  const currentDayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon, 6=Sun
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDayOfWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const cycleStr = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Top Utility Context Bar matching Stitch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 border border-outline-variant rounded-lg bg-surface-container-lowest">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="font-medium text-primary uppercase tracking-wider">MODULE / 03</span>
          </div>
          <span className="text-secondary font-mono text-xs">/</span>
          <h2 className="font-heading text-sm text-primary font-semibold tracking-tight">
            Weekly Schedule &amp; Routine
          </h2>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-secondary">CYCLE:</span>
          <span className="px-2 py-0.5 bg-surface text-primary font-medium rounded border border-outline-variant">
            {cycleStr}
          </span>
          <span className="text-secondary">|</span>
          <span className="text-secondary">COMPLETION:</span>
          <span className="text-primary font-medium">{completionRate}%</span>
        </div>
      </div>

      {/* Empty State Hero Banner when no plans configured */}
      {!hasAnyPlans && (
        <section className="border border-outline-variant rounded-lg bg-surface-container-lowest p-8 sm:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded border border-outline-variant bg-surface flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-[28px]">fitness_center</span>
          </div>
          <h2 className="font-heading text-xl text-primary tracking-tight font-semibold mb-1">
            No training split created
          </h2>
          <p className="text-xs text-secondary max-w-md leading-relaxed mb-6">
            Create your weekly training split (Monday – Sunday) to organize your workouts and track strength progress across all core muscle groups.
          </p>
          <button
            onClick={() => onConfigurePlan(0)}
            className="h-9 px-4 bg-primary text-on-primary text-xs font-medium rounded border border-primary hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>+ Create Workout Plan</span>
          </button>
        </section>
      )}

      {/* Sub-header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <h3 className="font-heading text-sm text-primary tracking-tight font-semibold">
            Weekly Split (7 Days)
          </h3>
          <span className="px-2 py-0.5 font-mono text-[11px] border border-outline-variant rounded text-secondary bg-surface">
            {configuredDaysCount} DAYS CONFIGURED
          </span>
        </div>

        <div className="font-mono text-xs text-secondary">
          CYCLE HORIZON: 7 DAYS
        </div>
      </div>

      {/* Weekly Split Grid (7 Days) matching Stitch */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {DAYS.map((dayName, dayIndex) => {
          const plan = plansByDay[dayIndex];
          const isToday = currentDayOfWeek === dayIndex;

          // Day date of this week
          const dayDate = new Date(startOfWeek);
          dayDate.setDate(startOfWeek.getDate() + dayIndex);
          const dayNum = dayDate.getDate();

          return (
            <div
              key={dayName}
              className={`rounded-lg bg-surface-container-lowest flex flex-col justify-between p-4 min-h-[220px] transition-colors ${
                isToday
                  ? 'border-2 border-primary shadow-xs'
                  : 'border border-outline-variant hover:border-neutral-400'
              }`}
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant">
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading text-xs font-semibold text-primary tracking-wider uppercase">
                      {dayName.substring(0, 3)}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary border border-primary rounded uppercase">
                        TODAY
                      </span>
                    )}
                  </div>
                  <span className={`font-mono text-xs ${isToday ? 'font-bold text-primary' : 'text-secondary'}`}>
                    {dayNum}
                  </span>
                </div>

                {/* Plan Content */}
                {plan ? (
                  <div className="space-y-2 py-2">
                    <div className="font-heading text-sm font-semibold text-primary leading-tight">
                      {plan.workout_name}
                    </div>
                    <div className="font-mono text-[11px] text-secondary">
                      Target: {plan.muscle_group}
                    </div>
                    <div className="text-[11px] text-secondary">
                      {plan.exercises?.length || 0} exercises planned
                    </div>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-secondary text-[24px] mb-1">bed</span>
                    <span className="text-xs text-secondary font-medium">Rest Day / Unconfigured</span>
                  </div>
                )}
              </div>

              {/* Bottom Card Actions */}
              <div className="pt-3 border-t border-outline-variant flex items-center gap-1.5">
                {plan ? (
                  <>
                    <button
                      onClick={() => onLogWorkoutClick(plan)}
                      className="flex-1 h-8 px-2 bg-primary text-on-primary text-xs font-medium rounded hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      <span>Log</span>
                    </button>
                    <button
                      onClick={() => onConfigurePlan(dayIndex, plan)}
                      title="Edit Split"
                      className="h-8 w-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                    </button>
                    <button
                      onClick={() => onDeletePlan(plan.id, plan.day_of_week)}
                      title="Clear Split"
                      className="h-8 w-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface text-secondary hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onConfigurePlan(dayIndex)}
                    className="w-full h-8 px-2 bg-surface-container-lowest text-primary text-xs font-medium rounded border border-outline-variant hover:bg-surface transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Set Workout Plan</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
