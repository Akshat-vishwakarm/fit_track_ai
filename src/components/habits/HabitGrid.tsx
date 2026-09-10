import React, { useState } from 'react';
import type { Habit } from '../../types';
import confetti from 'canvas-confetti';

interface HabitGridProps {
  habits: Habit[];
  completionsMap: Record<string, Record<string, boolean>>;
  onToggleHabit: (habitId: string, dateStr: string) => Promise<boolean>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onAddHabitClick: () => void;
}

export const HabitGrid: React.FC<HabitGridProps> = ({
  habits,
  completionsMap,
  onToggleHabit,
  onDeleteHabit,
  onAddHabitClick,
}) => {
  const [activeWeek, setActiveWeek] = useState<1 | 2 | 3 | 'all'>(1);

  // Generate 21 days sequence ending today
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    // 21 days ending today
    for (let i = 20; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      dates.push({ dateStr: isoStr, dayName, dayNum, monthName, isToday: i === 0 });
    }
    return dates;
  };

  const allDates = generateDates();

  // Filter dates based on active cohort tab
  let displayedDates = allDates;
  let bannerText = 'Active Cohort: Days 1 – 21';

  if (activeWeek === 1) {
    displayedDates = allDates.slice(0, 7);
    bannerText = 'Active Cohort: Week 1 (Days 1 – 7)';
  } else if (activeWeek === 2) {
    displayedDates = allDates.slice(7, 14);
    bannerText = 'Active Cohort: Week 2 (Days 8 – 14)';
  } else if (activeWeek === 3) {
    displayedDates = allDates.slice(14, 21);
    bannerText = 'Active Cohort: Week 3 (Days 15 – 21)';
  }

  const handleCellClick = async (habitId: string, dateStr: string) => {
    const isCompletedNow = await onToggleHabit(habitId, dateStr);
    if (isCompletedNow) {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#00d2ff', '#00e599', '#dab1ff'],
      });
    }
  };

  if (habits.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/20 shadow-lg text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary-container mb-4">
          <span className="material-symbols-outlined text-[36px]">event_repeat</span>
        </div>
        <h3 className="font-heading text-lg font-bold text-on-surface mb-1">No habits created yet</h3>
        <p className="text-sm text-on-surface-variant max-w-sm mb-6">
          Create your daily routines to unlock the 21-day consistency matrix tracker.
        </p>
        <button
          onClick={onAddHabitClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-on-primary-fixed font-heading font-bold text-sm shadow-[0_0_12px_rgba(0,210,255,0.3)] hover:scale-105 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Your First Habit</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cohort Selector Tabs */}
      <div className="flex items-center justify-between bg-surface-container-low p-1.5 rounded-xl shadow-inner border border-outline-variant/20">
        <button
          onClick={() => setActiveWeek(1)}
          className={`flex-1 py-1.5 rounded-lg text-center font-heading font-bold text-xs transition-all ${
            activeWeek === 1
              ? 'bg-primary-container text-on-primary-fixed shadow-[0_0_12px_rgba(0,210,255,0.4)]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          WEEK 1
        </button>
        <button
          onClick={() => setActiveWeek(2)}
          className={`flex-1 py-1.5 rounded-lg text-center font-heading font-bold text-xs transition-all ${
            activeWeek === 2
              ? 'bg-secondary-container text-on-secondary-fixed shadow-[0_0_12px_rgba(0,229,153,0.4)]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          WEEK 2
        </button>
        <button
          onClick={() => setActiveWeek(3)}
          className={`flex-1 py-1.5 rounded-lg text-center font-heading font-bold text-xs transition-all ${
            activeWeek === 3
              ? 'bg-tertiary-container text-on-tertiary-fixed shadow-[0_0_12px_rgba(218,177,255,0.4)]'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          WEEK 3
        </button>
        <button
          onClick={() => setActiveWeek('all')}
          className={`px-3 py-1.5 rounded-lg text-center font-heading font-bold text-xs uppercase transition-all ${
            activeWeek === 'all'
              ? 'bg-surface-container-highest text-on-surface shadow-md'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          All 21D
        </button>
      </div>

      {/* Spreadsheet Matrix Module Card */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant/20 shadow-lg overflow-hidden flex flex-col">
        {/* Banner Indicator */}
        <div className="w-full bg-primary-container text-on-primary-fixed px-4 py-2 flex items-center justify-between font-heading text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">calendar_view_week</span>
            <span>{bannerText}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-black/20 text-[10px]">
            Target: 1.0 per day
          </span>
        </div>

        {/* Matrix Table Viewport */}
        <div className="w-full overflow-x-auto select-none">
          <div className="min-w-full flex flex-col">
            {/* Header Row */}
            <div className="flex items-center bg-surface-container-high py-2 border-b border-outline-variant/20 sticky top-0 z-20">
              <div className="w-44 shrink-0 px-4 font-heading text-[11px] font-bold text-on-surface-variant uppercase tracking-wider sticky left-0 bg-surface-container-high z-30 shadow-[2px_0_6px_rgba(0,0,0,0.3)]">
                Habit Routine
              </div>
              <div className="flex flex-1 items-center justify-around pr-2">
                {displayedDates.map((d) => (
                  <div
                    key={d.dateStr}
                    className={`flex flex-col items-center min-w-[38px] text-center ${
                      d.isToday ? 'text-primary-container font-extrabold' : 'text-on-surface-variant'
                    }`}
                  >
                    <span className="text-[10px] font-heading uppercase">{d.dayName}</span>
                    <span className="text-xs font-bold">{d.dayNum}</span>
                  </div>
                ))}
              </div>
              <div className="w-16 shrink-0 text-center font-heading text-[10px] font-bold text-on-surface-variant uppercase pr-2">
                Progress
              </div>
            </div>

            {/* Habits Row List */}
            <div className="flex flex-col divide-y divide-outline-variant/10">
              {habits.map((habit) => {
                const habitCompletions = completionsMap[habit.id] || {};
                let completedCount = 0;
                displayedDates.forEach((d) => {
                  if (habitCompletions[d.dateStr]) completedCount++;
                });

                return (
                  <div
                    key={habit.id}
                    className="flex items-center py-3 hover:bg-surface-container-high/30 transition-colors group"
                  >
                    {/* Habit Title Column */}
                    <div className="w-44 shrink-0 px-4 flex items-center justify-between sticky left-0 bg-surface-container-low group-hover:bg-surface-container-high/90 z-20 shadow-[2px_0_6px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${habit.color}20`, color: habit.color }}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {habit.icon || 'check_circle'}
                          </span>
                        </div>
                        <span className="font-heading text-xs font-bold text-on-surface truncate">
                          {habit.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteHabit(habit.id)}
                        className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error transition-opacity p-1"
                        title="Delete Habit"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>

                    {/* Date Checkbox Cells */}
                    <div className="flex flex-1 items-center justify-around pr-2">
                      {displayedDates.map((d) => {
                        const checked = !!habitCompletions[d.dateStr];
                        return (
                          <button
                            key={d.dateStr}
                            onClick={() => handleCellClick(habit.id, d.dateStr)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              checked
                                ? 'bg-secondary-container text-on-secondary-fixed shadow-[0_0_8px_rgba(0,229,153,0.4)] scale-105'
                                : 'bg-surface-container-high border border-outline-variant/30 text-transparent hover:border-primary-container/50'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px] font-bold">
                              check
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Completion Count */}
                    <div className="w-16 shrink-0 text-center pr-2">
                      <span className="font-heading text-xs font-bold text-primary-container">
                        {completedCount}/{displayedDates.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
