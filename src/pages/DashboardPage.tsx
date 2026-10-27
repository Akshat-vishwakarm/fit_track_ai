import React from 'react';
import { useData } from '../context/DataContext';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { formatLocalDate } from '../utils/dateUtils';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const {
    habits,
    completionsMap,
    streak,
    workoutPlans,
    nutritionGoal,
    todayConsumed,
    latestWeight,
    goals,
    mlConfig,
  } = useData();

  const todayStr = formatLocalDate();
  const activeHabitsCount = habits.length;

  // Calculate today's completed habits count
  let todayCompletedHabits = 0;
  habits.forEach((h) => {
    if (completionsMap[h.id] && completionsMap[h.id][todayStr]) {
      todayCompletedHabits++;
    }
  });

  const habitsRatioPct = activeHabitsCount > 0 ? Math.round((todayCompletedHabits / activeHabitsCount) * 100) : 0;
  const targetCalories = nutritionGoal?.calories || 0;
  const calPct = targetCalories > 0 ? Math.min(100, Math.round((todayConsumed.calories / targetCalories) * 100)) : 0;

  // Today's scheduled workout plan
  const dayIndexToday = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1; // 0 = Mon ... 6 = Sun
  const todaysWorkoutPlan = workoutPlans.find((p) => p.day_of_week === dayIndexToday);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-on-surface">Fitness Command Center</h1>
          <p className="text-xs text-on-surface-variant">Dynamic summary of your persisted activities</p>
        </div>
      </div>

      {/* KPI Quad Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Current Streak"
          value={`${streak.currentStreak} Days`}
          subtext={`Best: ${streak.bestStreak}D`}
          icon="local_fire_department"
          colorClass="text-flame"
          progressPct={streak.bestStreak > 0 ? (streak.currentStreak / streak.bestStreak) * 100 : 0}
        />
        <StatCard
          title="Today's Habits"
          value={`${todayCompletedHabits} / ${activeHabitsCount}`}
          subtext={`${habitsRatioPct}% Done`}
          icon="check_circle"
          colorClass="text-primary-container"
          progressPct={habitsRatioPct}
        />
        <StatCard
          title="Calories Logged"
          value={`${todayConsumed.calories} kcal`}
          subtext={targetCalories > 0 ? `Target: ${targetCalories}` : 'No target set'}
          icon="restaurant"
          colorClass="text-secondary"
          progressPct={calPct}
        />
        <StatCard
          title="Body Weight"
          value={latestWeight ? `${latestWeight} kg` : '0 Logged'}
          subtext={latestWeight ? 'Latest Record' : 'No logs yet'}
          icon="monitoring"
          colorClass="text-tertiary-container"
        />
      </div>

      {/* Main Grid: Today's Focus & Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Habits & Workout */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Habits Summary Card */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[20px]">check_box</span>
                <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
                  Today's Habits ({todayCompletedHabits}/{activeHabitsCount})
                </span>
              </div>
              <button
                onClick={() => setActiveTab('habits')}
                className="text-xs text-primary-container font-heading font-bold hover:underline"
              >
                Open Matrix →
              </button>
            </div>

            {activeHabitsCount === 0 ? (
              <EmptyState
                icon="event_repeat"
                title="No habits created"
                description="Create your daily habits to start tracking your routine consistency."
                actionLabel="Add Habit"
                onAction={() => setActiveTab('habits')}
              />
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {habits.map((habit) => {
                  const isChecked = !!(completionsMap[habit.id] && completionsMap[habit.id][todayStr]);
                  return (
                    <div key={habit.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${habit.color}20`, color: habit.color }}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {habit.icon || 'check_circle'}
                          </span>
                        </div>
                        <div>
                          <div className="font-heading text-xs font-bold text-on-surface">{habit.name}</div>
                          <div className="text-[10px] text-on-surface-variant capitalize">{habit.category}</div>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-heading font-bold ${
                          isChecked
                            ? 'bg-secondary-container/20 text-secondary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {isChecked ? 'Completed ✓' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's Workout Summary Card */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">fitness_center</span>
                <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
                  Today's Training Schedule
                </span>
              </div>
              <button
                onClick={() => setActiveTab('workout')}
                className="text-xs text-secondary font-heading font-bold hover:underline"
              >
                View Split →
              </button>
            </div>

            {todaysWorkoutPlan ? (
              <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 flex items-center justify-between">
                <div>
                  <div className="font-heading font-bold text-sm text-on-surface">
                    {todaysWorkoutPlan.workout_name}
                  </div>
                  <div className="text-xs text-secondary font-medium">
                    Target: {todaysWorkoutPlan.muscle_group} ({todaysWorkoutPlan.exercises?.length || 0} exercises)
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('workout')}
                  className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-fixed font-heading font-bold text-xs shadow-[0_0_10px_rgba(0,229,153,0.3)]"
                >
                  Log Workout
                </button>
              </div>
            ) : (
              <EmptyState
                icon="bed"
                title="No workout scheduled today"
                description="Enjoy rest day or set up your weekly training split."
                actionLabel="Create Split"
                onAction={() => setActiveTab('workout')}
              />
            )}
          </div>
        </div>

        {/* Right Column: AI Insights Status & Goals */}
        <div className="space-y-6">
          {/* AI Insights Widget */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary-container text-[20px]">smart_toy</span>
                <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
                  AI Model Status
                </span>
              </div>
              <button
                onClick={() => setActiveTab('ai')}
                className="text-xs text-tertiary-container font-heading font-bold hover:underline"
              >
                Configure →
              </button>
            </div>

            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-[20px]">
                  {mlConfig?.connected ? 'smart_toy' : 'power_off'}
                </span>
              </div>
              <h4 className="font-heading font-bold text-xs text-on-surface">
                {mlConfig?.connected ? 'AI Model Connected' : 'AI Model Not Connected'}
              </h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                {mlConfig?.connected
                  ? 'Your ML endpoint is actively analyzing your fitness telemetry.'
                  : 'Connect your ML model to unlock personalized insights.'}
              </p>
            </div>
          </div>

          {/* Active Goals Overview */}
          <div className="bg-surface-container-low border border-outline-variant/20 rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-flame text-[20px]">flag</span>
                <span className="font-heading text-xs font-bold text-on-surface uppercase tracking-wider">
                  Active Goals ({goals.length})
                </span>
              </div>
              <button
                onClick={() => setActiveTab('goals')}
                className="text-xs text-flame font-heading font-bold hover:underline"
              >
                Manage →
              </button>
            </div>

            {goals.length === 0 ? (
              <EmptyState
                icon="flag"
                title="No active goals"
                description="Set target milestones for weight, habits, or workouts."
                actionLabel="Set Goal"
                onAction={() => setActiveTab('goals')}
              />
            ) : (
              <div className="space-y-2">
                {goals.slice(0, 3).map((g) => {
                  const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
                  return (
                    <div key={g.id} className="bg-surface-container p-3 rounded-xl border border-outline-variant/10 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-heading font-bold text-on-surface truncate">{g.title}</span>
                        <span className="font-bold text-primary-container">{pct}%</span>
                      </div>
                      <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary-container h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
