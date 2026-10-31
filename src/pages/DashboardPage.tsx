import React from 'react';
import { useData } from '../context/DataContext';
import { StatCard } from '../components/common/StatCard';
import { FocusDeadlineTimer } from '../components/focus/FocusDeadlineTimer';
import { formatLocalDate } from '../utils/dateUtils';

interface DashboardPageProps {
  setActiveTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ setActiveTab }) => {
  const {
    habits,
    completionsMap,
    toggleHabit,
    streak,
    workoutPlans,
    nutritionGoal,
    todayConsumed,
    latestWeight,
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

  // Today's scheduled workout plan (0 = Mon ... 6 = Sun)
  const dayIndexToday = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todaysWorkoutPlan = workoutPlans.find((p) => p.day_of_week === dayIndexToday);

  return (
    <div className="space-y-6">
      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Streak */}
        <StatCard
          title="Streak"
          value={`${streak.currentStreak} Days`}
          subtext={`Best record: ${streak.bestStreak}D`}
          icon="local_fire_department"
          progressPct={streak.bestStreak > 0 ? (streak.currentStreak / streak.bestStreak) * 100 : 0}
        />

        {/* Card 2: Habit Completion */}
        <StatCard
          title="Habit Completion"
          value={`${todayCompletedHabits} / ${activeHabitsCount}`}
          subtext={`${habitsRatioPct}% completed today`}
          icon="check_circle"
          progressPct={habitsRatioPct}
        />

        {/* Card 3: Caloric Intake */}
        <StatCard
          title="Caloric Intake"
          value={`${todayConsumed.calories} kcal`}
          subtext={targetCalories > 0 ? `Target: ${targetCalories} kcal` : 'No daily target set'}
          icon="restaurant"
          progressPct={calPct}
        />

        {/* Card 4: Current Weight */}
        <StatCard
          title="Current Weight"
          value={latestWeight ? `${latestWeight} kg` : '0 kg'}
          subtext={latestWeight ? 'Latest entry logged' : 'No weight entry logged'}
          icon="fitness_center"
        />
      </div>

      {/* High-Focus Target Countdown Section */}
      <FocusDeadlineTimer />

      {/* Bottom Functional Grid (Habits & Calendar/Training) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Habits Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">task_alt</span>
              <h3 className="font-heading text-base text-primary font-semibold">Today&apos;s Habits</h3>
              <span className="font-mono text-xs text-secondary bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
                {todayCompletedHabits}/{activeHabitsCount}
              </span>
            </div>

            <button
              onClick={() => setActiveTab('habits')}
              className="text-xs text-primary hover:text-secondary flex items-center gap-1 font-medium transition-colors"
            >
              <span>Open Matrix</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>

          {/* Habit Checklist */}
          {activeHabitsCount === 0 ? (
            <div className="py-8 text-center border border-outline-variant rounded flex flex-col items-center justify-center p-4">
              <span className="material-symbols-outlined text-secondary text-[28px] mb-2">check_circle</span>
              <div className="text-sm font-medium text-primary">No habits created yet</div>
              <p className="text-xs text-secondary mt-0.5">Start daily streaks for hydration, reading, training or meditation.</p>
              <button
                onClick={() => setActiveTab('habits')}
                className="mt-3 px-3 py-1.5 bg-primary text-on-primary text-xs font-medium rounded hover:bg-neutral-800 transition-colors"
              >
                + Add First Habit
              </button>
            </div>
          ) : (
            <div className="flex flex-col border border-outline-variant rounded divide-y divide-outline-variant">
              {habits.map((habit) => {
                const isChecked = !!(completionsMap[habit.id] && completionsMap[habit.id][todayStr]);
                return (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-3 hover:bg-surface-container-low transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleHabit(habit.id, todayStr)}
                        className={`w-5 h-5 rounded-sm border border-outline flex items-center justify-center transition-colors cursor-pointer ${
                          isChecked ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-lowest hover:border-primary'
                        }`}
                      >
                        {isChecked && (
                          <span className="material-symbols-outlined text-[14px] leading-none">check</span>
                        )}
                      </button>

                      <div className="flex flex-col">
                        <span className="text-sm text-primary font-medium leading-none">{habit.name}</span>
                        <span className="text-[11px] text-secondary mt-1 leading-none capitalize">
                          {habit.category} • {habit.frequency || 'daily'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded border border-outline-variant font-mono text-[11px] ${
                          isChecked
                            ? 'bg-surface-container-highest text-primary font-medium'
                            : 'bg-surface-container text-secondary'
                        }`}
                      >
                        {isChecked ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Autologger Bar */}
          <div className="flex items-center justify-between pt-1 text-secondary">
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span>Persistent Dexie + Cloud sync active</span>
            </div>
            <button
              onClick={() => setActiveTab('habits')}
              className="h-7 px-2.5 border border-outline-variant rounded bg-surface-container-lowest hover:bg-surface text-secondary hover:text-primary transition-colors text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              <span>New Habit</span>
            </button>
          </div>
        </div>

        {/* Right Column: Calendar & Scheduled Protocols (5 Cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-lg p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-outline-variant pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">edit_calendar</span>
              <h3 className="font-heading text-base text-primary font-semibold">Calendar &amp; Notes</h3>
            </div>
            <span className="font-mono text-xs text-secondary">TODAY</span>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-secondary font-medium">
                Daily Athletic Journal
              </span>
              <span className="font-mono text-xs text-secondary">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-secondary italic leading-relaxed">
              &ldquo;Log daily metric notes (e.g. &apos;weight 85 run 3 km&apos;) and attach qualitative reflections to any date.&rdquo;
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                onClick={() => setActiveTab('calendar')}
                className="h-8 px-3 bg-primary text-on-primary text-xs font-medium rounded border border-primary hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                <span>Open Calendar &amp; Add Note</span>
              </button>
            </div>
          </div>

          {/* Today's Scheduled Training Split Section */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-secondary font-medium">
              Scheduled Protocol
            </span>
            <div className="border border-outline-variant rounded p-3 flex items-center justify-between hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-primary font-medium">TODAY</span>
                <span className="h-3 w-px bg-outline-variant" />
                <span className="text-xs text-primary font-medium">
                  {todaysWorkoutPlan ? todaysWorkoutPlan.workout_name : 'Rest Day / Unconfigured'}
                </span>
              </div>
              <button
                onClick={() => setActiveTab('workout')}
                className="font-mono text-xs text-secondary hover:text-primary transition-colors underline"
              >
                {todaysWorkoutPlan ? 'LOG WORKOUT' : 'SET SPLIT'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
