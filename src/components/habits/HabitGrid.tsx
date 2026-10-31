import React, { useState, useMemo, useEffect } from 'react';
import type { Habit } from '../../types';
import confetti from 'canvas-confetti';
import { formatLocalDate } from '../../utils/dateUtils';

interface HabitGridProps {
  habits: Habit[];
  completionsMap: Record<string, Record<string, boolean>>;
  onToggleHabit: (habitId: string, dateStr: string) => Promise<boolean>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onAddHabitClick: () => void;
  onClearAllCompletions?: () => Promise<void>;
}

export const HabitGrid: React.FC<HabitGridProps> = ({
  habits,
  completionsMap,
  onToggleHabit,
  onDeleteHabit,
  onAddHabitClick,
  onClearAllCompletions,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatLocalDate(today), [today]);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  const defaultWeek = useMemo<1 | 2 | 3 | 4 | 'all'>(() => {
    if (isCurrentMonth) {
      const day = today.getDate();
      if (day <= 7) return 1;
      if (day <= 14) return 2;
      if (day <= 21) return 3;
      return 4;
    }
    return 1;
  }, [isCurrentMonth, today]);

  const [activeWeek, setActiveWeek] = useState<1 | 2 | 3 | 4 | 'all'>(defaultWeek);

  useEffect(() => {
    if (noticeMessage) {
      const timer = setTimeout(() => setNoticeMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [noticeMessage]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(11);
    } else {
      setSelectedMonth((m) => m - 1);
    }
    setActiveWeek(1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(0);
    } else {
      setSelectedMonth((m) => m + 1);
    }
    setActiveWeek(1);
  };

  const allMonthDates = useMemo(() => {
    const dates = [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(selectedYear, selectedMonth, day);
      const isoStr = formatLocalDate(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const isToday = isoStr === todayStr;
      const isPast = isoStr < todayStr;
      const isFuture = isoStr > todayStr;

      dates.push({
        date: d,
        dateStr: isoStr,
        dayNum: day,
        dayName,
        monthName,
        isToday,
        isPast,
        isFuture,
      });
    }
    return dates;
  }, [selectedYear, selectedMonth, todayStr]);

  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleDateString('en-US', { month: 'long' });

  const displayedDates = useMemo(() => {
    if (activeWeek === 'all') return allMonthDates;
    const startIdx = (activeWeek - 1) * 7;
    let endIdx = activeWeek * 7;
    if (activeWeek === 4) endIdx = allMonthDates.length;
    return allMonthDates.slice(startIdx, endIdx);
  }, [allMonthDates, activeWeek]);

  const handleCellClick = async (
    habitId: string,
    dateStr: string,
    isToday: boolean,
    isPast: boolean,
    isFuture: boolean
  ) => {
    if (isFuture) {
      setNoticeMessage(`🔒 Future date (${dateStr}) is not open yet.`);
      return;
    }

    if (isPast) {
      setNoticeMessage(`🔒 Checkbox frozen at 11:59 PM on ${dateStr}. Past days cannot be edited.`);
      return;
    }

    if (isToday) {
      const wasCompleted = await onToggleHabit(habitId, dateStr);
      if (wasCompleted) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#000000', '#555555', '#aaaaaa'],
        });
      }
    }
  };

  const handleMakeAllEmpty = async () => {
    if (confirm('Clear all habit checkboxes to empty state?')) {
      if (onClearAllCompletions) {
        await onClearAllCompletions();
        setNoticeMessage('All checkboxes have been cleared to empty.');
      }
    }
  };

  if (habits.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-8 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded border border-outline-variant bg-surface flex items-center justify-center text-primary mb-3">
          <span className="material-symbols-outlined text-[24px]">event_repeat</span>
        </div>
        <h3 className="font-heading text-base font-semibold text-primary mb-1">No habits created yet</h3>
        <p className="text-xs text-secondary max-w-sm mb-4 leading-relaxed">
          Create daily routines to begin tracking consistency. Checkboxes open daily and freeze at midnight.
        </p>
        <button
          onClick={onAddHabitClick}
          className="h-9 px-4 bg-primary text-on-primary text-xs font-medium rounded hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Add Custom Routine</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast Notice */}
      {noticeMessage && (
        <div className="bg-surface-container-lowest border border-primary px-4 py-2.5 rounded text-xs font-mono text-primary flex items-center justify-between shadow-sm animate-fade-in">
          <span>{noticeMessage}</span>
          <button onClick={() => setNoticeMessage(null)} className="text-secondary hover:text-primary ml-2 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Top Navigation & Temporal Controls matching Stitch */}
      <div className="flex flex-col gap-3 border border-outline-variant bg-surface-container-lowest p-3 sm:p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="h-8 w-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface transition-colors text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <div className="px-3 py-1 border border-outline-variant rounded bg-surface font-heading text-sm text-primary tracking-tight font-medium">
              {monthName} {selectedYear}
            </div>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="h-8 w-8 flex items-center justify-center border border-outline-variant rounded hover:bg-surface transition-colors text-primary"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>

          {/* Week Scope Tabs */}
          <div className="flex items-center gap-1 border border-outline-variant p-1 rounded bg-surface">
            {([1, 2, 3, 4, 'all'] as const).map((w) => {
              const label = w === 'all' ? 'All' : `Week ${w}`;
              const isActive = activeWeek === w;
              return (
                <button
                  key={w}
                  onClick={() => setActiveWeek(w)}
                  className={`px-3 h-7 rounded text-xs transition-colors font-medium ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-none'
                      : 'text-secondary hover:text-primary'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Metric Pill & Clear Action */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-outline-variant px-3 py-1 rounded bg-surface-container-lowest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-mono text-xs text-secondary">Target:</span>
              <span className="font-mono text-xs text-primary font-medium">1.0 / day</span>
            </div>

            <button
              onClick={handleMakeAllEmpty}
              title="Reset all habit completions"
              className="h-7 px-2.5 text-xs text-secondary hover:text-primary border border-outline-variant rounded bg-surface transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Scope Sub-bar */}
        <div className="flex items-center justify-between border-t border-outline-variant pt-2">
          <div className="flex items-center gap-2 text-xs text-secondary">
            <span className="material-symbols-outlined text-[16px] text-primary">calendar_view_week</span>
            <span className="text-primary font-medium">{monthName} {selectedYear}</span>
            <span>•</span>
            <span>
              {activeWeek === 'all' ? 'All Month Days' : `Week ${activeWeek} (Days ${displayedDates[0]?.dayNum || 1} – ${displayedDates[displayedDates.length - 1]?.dayNum || 7})`}
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs text-secondary">
            <span className="font-medium text-primary">{displayedDates.length}</span> Days Horizon
          </div>
        </div>
      </div>

      {/* Habit Matrix Table matching Stitch */}
      <div className="border border-outline-variant rounded-lg bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface">
                <th className="py-3 px-4 font-mono text-[11px] uppercase tracking-wider text-secondary font-medium min-w-[200px] border-r border-outline-variant">
                  Habit Routine
                </th>

                {displayedDates.map((d) => (
                  <th
                    key={d.dateStr}
                    className={`py-3 px-1 text-center border-r border-outline-variant min-w-[52px] ${
                      d.isToday ? 'bg-surface-container w-20' : ''
                    }`}
                  >
                    <div className="font-sans text-[11px] text-secondary uppercase font-medium">
                      {d.dayName}
                    </div>
                    {d.isToday ? (
                      <div className="flex flex-col items-center justify-center mt-0.5">
                        <span className="inline-block px-1.5 py-0.2 border border-primary rounded text-[9px] uppercase font-bold text-primary tracking-tight bg-surface-container-lowest">
                          Today
                        </span>
                        <div className="font-mono text-xs text-primary font-semibold mt-0.5">{d.dayNum}</div>
                      </div>
                    ) : (
                      <div className="font-mono text-xs text-primary font-medium mt-0.5">{d.dayNum}</div>
                    )}
                  </th>
                ))}

                <th className="py-3 px-4 text-right font-mono text-[11px] uppercase tracking-wider text-secondary font-medium w-24">
                  Progress
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant text-xs font-sans">
              {habits.map((habit) => {
                const habitCompletions = completionsMap[habit.id] || {};
                let completedCount = 0;
                displayedDates.forEach((d) => {
                  if (habitCompletions[d.dateStr]) completedCount++;
                });

                return (
                  <tr key={habit.id} className="hover:bg-surface transition-colors group">
                    {/* Routine column */}
                    <td className="py-3 px-4 border-r border-outline-variant">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-primary rounded-none" />
                          <span className="font-medium text-primary">{habit.name}</span>
                          <span className="font-mono text-[11px] text-secondary hidden sm:inline capitalize">
                            {habit.category}
                          </span>
                        </div>

                        <button
                          onClick={() => onDeleteHabit(habit.id)}
                          className="text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                          title="Delete habit"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </td>

                    {/* Date cells */}
                    {displayedDates.map((d) => {
                      const checked = !!habitCompletions[d.dateStr];
                      const isToday = d.isToday;
                      const isPast = d.isPast;
                      const isFuture = d.isFuture;

                      return (
                        <td
                          key={d.dateStr}
                          className={`py-3 px-1 text-center border-r border-outline-variant ${
                            isToday ? 'bg-surface-container' : isPast ? 'bg-surface/50' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(habit.id, d.dateStr, isToday, isPast, isFuture)}
                            title={
                              isToday
                                ? `Today: Click to ${checked ? 'uncheck' : 'complete'}`
                                : isPast
                                ? `Frozen on ${d.dayName} ${d.dayNum}`
                                : `Future date ${d.dayName} ${d.dayNum}`
                            }
                            className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${
                              isToday
                                ? checked
                                  ? 'border border-primary bg-primary text-on-primary cursor-pointer'
                                  : 'border-2 border-primary bg-surface-container-lowest hover:bg-surface cursor-pointer'
                                : checked
                                ? 'border border-primary bg-primary text-on-primary opacity-80 cursor-not-allowed'
                                : isPast
                                ? 'text-secondary/60 cursor-not-allowed'
                                : 'text-secondary/30 cursor-not-allowed'
                            }`}
                          >
                            {checked ? (
                              <span className="material-symbols-outlined text-[15px]">check</span>
                            ) : isPast ? (
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                            ) : null}
                          </button>
                        </td>
                      );
                    })}

                    {/* Progress Column */}
                    <td className="py-3 px-4 text-right font-mono text-xs text-primary font-medium">
                      {completedCount} / {displayedDates.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Add Habit Inline Footer */}
        <div className="p-3 border-t border-outline-variant bg-surface flex items-center justify-between">
          <button
            onClick={onAddHabitClick}
            className="flex items-center gap-1.5 px-3 py-1 border border-outline-variant rounded bg-surface-container-lowest hover:bg-surface text-secondary hover:text-primary transition-colors text-xs font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Custom Routine</span>
          </button>
          <span className="font-mono text-xs text-secondary">{habits.length} Routines Active</span>
        </div>
      </div>
    </div>
  );
};
