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
  const currentMonth = today.getMonth(); // 0-indexed (0=Jan, 9=Oct)

  // Current selected month
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  // Calculate default week containing today if in current month, else Week 1
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

  // Auto-dismiss notice toast
  useEffect(() => {
    if (noticeMessage) {
      const timer = setTimeout(() => setNoticeMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [noticeMessage]);

  // Month navigation
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

  const handleCurrentMonth = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    const day = today.getDate();
    if (day <= 7) setActiveWeek(1);
    else if (day <= 14) setActiveWeek(2);
    else if (day <= 21) setActiveWeek(3);
    else setActiveWeek(4);
  };

  // Generate all calendar dates for selected month starting from Day 1
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
      dates.push({ dateStr: isoStr, dayName, dayNum: day, monthName, isToday, isPast, isFuture });
    }
    return dates;
  }, [selectedYear, selectedMonth, todayStr]);

  const monthName = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 1).toLocaleDateString('en-US', { month: 'long' });
  }, [selectedYear, selectedMonth]);

  const daysInMonth = allMonthDates.length;

  // Filter dates based on active week
  let displayedDates = allMonthDates;
  let bannerText = `${monthName} ${selectedYear} • Days 1 – ${daysInMonth}`;

  if (activeWeek === 1) {
    displayedDates = allMonthDates.slice(0, 7);
    bannerText = `${monthName} ${selectedYear} • Week 1 (Days 1 – 7)`;
  } else if (activeWeek === 2) {
    displayedDates = allMonthDates.slice(7, 14);
    bannerText = `${monthName} ${selectedYear} • Week 2 (Days 8 – 14)`;
  } else if (activeWeek === 3) {
    displayedDates = allMonthDates.slice(14, 21);
    bannerText = `${monthName} ${selectedYear} • Week 3 (Days 15 – 21)`;
  } else if (activeWeek === 4) {
    displayedDates = allMonthDates.slice(21);
    bannerText = `${monthName} ${selectedYear} • Week 4 (Days 22 – ${daysInMonth})`;
  }

  // Cell click handler enforcing freeze rule
  const handleCellClick = async (habitId: string, dateStr: string, isToday: boolean, isPast: boolean, isFuture: boolean) => {
    if (isFuture) {
      setNoticeMessage('⏳ Upcoming date: Checkbox is locked. Opens at 12:00 AM on that day.');
      return;
    }

    if (isPast) {
      setNoticeMessage('🔒 Frozen: Past days lock permanently at 11:59 PM. Only today is open.');
      return;
    }

    // Only today is open until 11:59 PM
    if (isToday) {
      const isCompletedNow = await onToggleHabit(habitId, dateStr);
      if (isCompletedNow) {
        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#00d2ff', '#00e599', '#dab1ff'],
        });
      }
    }
  };

  const handleMakeAllEmpty = async () => {
    if (confirm('Make all checkboxes empty and start completely fresh?')) {
      if (onClearAllCompletions) {
        await onClearAllCompletions();
        setNoticeMessage('🧹 All checkboxes have been cleared to empty.');
      }
    }
  };

  // Formatted date string for criteria (e.g. "27/10")
  const todayCriteriaLabel = `${today.getDate()}/${today.getMonth() + 1}`;

  if (habits.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/20 shadow-lg text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary-container mb-4">
          <span className="material-symbols-outlined text-[36px]">event_repeat</span>
        </div>
        <h3 className="font-heading text-lg font-bold text-on-surface mb-1">No habits created yet</h3>
        <p className="text-sm text-on-surface-variant max-w-sm mb-6">
          Create your daily routines. Checkboxes open daily and freeze at 11:59 PM.
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
      {/* Criteria & Rule Banner */}
      <div className="bg-surface-container-low border border-primary-container/30 rounded-xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container text-[20px] animate-pulse">
            schedule
          </span>
          <div className="text-xs font-heading font-bold text-on-surface">
            <span className="text-primary-container uppercase">Criteria:</span> Checkbox of{' '}
            <span className="underline font-extrabold text-primary-container">{todayCriteriaLabel}</span> is{' '}
            <span className="text-secondary uppercase">OPEN</span> till 11:59 PM tonight — then it{' '}
            <span className="text-error uppercase">FREEZES 🔒</span>
          </div>
        </div>

        {/* Action: Make All Empty */}
        <button
          onClick={handleMakeAllEmpty}
          title="Reset all habit checkboxes to empty"
          className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high hover:bg-error/20 hover:text-error text-on-surface-variant border border-outline-variant/30 text-xs font-heading font-bold transition-all"
        >
          <span className="material-symbols-outlined text-[15px]">cleaning_services</span>
          <span>Make All Empty</span>
        </button>
      </div>

      {/* Toast Notification Alert */}
      {noticeMessage && (
        <div className="bg-surface-container-high border border-primary-container/50 px-4 py-2 rounded-xl text-xs font-heading font-bold text-on-surface flex items-center justify-between shadow-lg animate-fade-in">
          <span>{noticeMessage}</span>
          <button onClick={() => setNoticeMessage(null)} className="text-on-surface-variant hover:text-on-surface ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Month Navigator & Week Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Month Navigation Pill */}
        <div className="flex items-center justify-between sm:justify-start gap-1 bg-surface-container-low p-1.5 rounded-xl shadow-inner border border-outline-variant/20">
          <button
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Previous Month"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="font-heading font-bold text-xs px-2 text-on-surface whitespace-nowrap">
            {monthName} {selectedYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Next Month"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
          {!isCurrentMonth && (
            <button
              onClick={handleCurrentMonth}
              className="text-[10px] font-heading font-bold text-primary-container hover:underline px-1.5 ml-1"
            >
              Today
            </button>
          )}
        </div>

        {/* Week Selector Tabs */}
        <div className="flex items-center justify-between bg-surface-container-low p-1.5 rounded-xl shadow-inner border border-outline-variant/20 flex-1">
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
            onClick={() => setActiveWeek(4)}
            className={`flex-1 py-1.5 rounded-lg text-center font-heading font-bold text-xs transition-all ${
              activeWeek === 4
                ? 'bg-primary-container text-on-primary-fixed shadow-[0_0_12px_rgba(0,210,255,0.4)]'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            WEEK 4
          </button>
          <button
            onClick={() => setActiveWeek('all')}
            className={`px-3 py-1.5 rounded-lg text-center font-heading font-bold text-xs uppercase transition-all ${
              activeWeek === 'all'
                ? 'bg-surface-container-highest text-on-surface shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            ALL
          </button>
        </div>
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
              <div className="w-44 shrink-0 px-4 font-heading text-[11px] font-bold text-on-surface-variant uppercase tracking-wider sticky left-0 bg-[#161a1d] z-30 shadow-[2px_0_6px_rgba(0,0,0,0.5)]">
                Habit Routine
              </div>
              <div className="flex flex-1 items-center justify-around pr-2">
                {displayedDates.map((d) => (
                  <div
                    key={d.dateStr}
                    className={`flex flex-col items-center min-w-[38px] text-center rounded py-0.5 transition-all ${
                      d.isToday
                        ? 'text-primary-container font-extrabold bg-primary-container/15 border-2 border-primary-container shadow-[0_0_10px_rgba(0,210,255,0.3)]'
                        : d.isPast
                        ? 'text-on-surface-variant/60'
                        : 'text-on-surface-variant/35'
                    }`}
                  >
                    <span className="text-[10px] font-heading uppercase">{d.dayName}</span>
                    <span className="text-xs font-bold">{d.dayNum}</span>
                    {d.isToday ? (
                      <span className="text-[7px] font-extrabold uppercase text-secondary px-1 rounded bg-secondary/10">
                        OPEN
                      </span>
                    ) : d.isPast ? (
                      <span className="text-[7px] font-bold uppercase text-on-surface-variant/50">
                        FROZEN
                      </span>
                    ) : null}
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
                    <div className="w-44 shrink-0 px-4 flex items-center justify-between sticky left-0 bg-[#161a1d] group-hover:bg-surface-container-high z-20 shadow-[2px_0_6px_rgba(0,0,0,0.5)]">
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
                        const isToday = d.isToday;
                        const isPast = d.isPast;
                        const isFuture = d.isFuture;

                        return (
                          <button
                            key={d.dateStr}
                            onClick={() => handleCellClick(habit.id, d.dateStr, isToday, isPast, isFuture)}
                            title={
                              isToday
                                ? `Today (${todayCriteriaLabel}): OPEN until 11:59 PM • Click to ${checked ? 'uncheck' : 'complete'}`
                                : isPast
                                ? `Frozen at 11:59 PM on ${d.dayName} ${d.dayNum}`
                                : `Upcoming day ${d.dayName} ${d.dayNum} • Locked`
                            }
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              isToday
                                ? checked
                                  ? 'bg-secondary-container text-on-secondary-fixed shadow-[0_0_12px_rgba(0,229,153,0.5)] scale-110 ring-2 ring-primary-container cursor-pointer'
                                  : 'bg-surface-container-high border-2 border-primary-container text-transparent hover:scale-105 shadow-[0_0_8px_rgba(0,210,255,0.4)] cursor-pointer'
                                : isPast
                                ? checked
                                  ? 'bg-secondary-container/40 text-on-secondary-fixed/70 border border-secondary/30 cursor-not-allowed opacity-75'
                                  : 'bg-surface-container-high/40 border border-outline-variant/15 text-on-surface-variant/20 cursor-not-allowed opacity-50'
                                : 'bg-surface-container-high/20 border border-dashed border-outline-variant/15 text-transparent cursor-not-allowed opacity-30'
                            }`}
                          >
                            {isToday ? (
                              <span className={`material-symbols-outlined text-[16px] font-bold ${checked ? 'text-on-secondary-fixed' : 'text-transparent'}`}>
                                check
                              </span>
                            ) : isPast ? (
                              checked ? (
                                <span className="material-symbols-outlined text-[14px] font-bold text-secondary">
                                  check
                                </span>
                              ) : (
                                <span className="material-symbols-outlined text-[12px] text-on-surface-variant/40">
                                  lock
                                </span>
                              )
                            ) : (
                              <span className="material-symbols-outlined text-[11px] text-on-surface-variant/20">
                                lock_clock
                              </span>
                            )}
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
