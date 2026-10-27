/**
 * Date utility helpers for local date handling and avoiding timezone UTC drift.
 */

/**
 * Returns a date string formatted as YYYY-MM-DD in local time.
 */
export const formatLocalDate = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses YYYY-MM-DD string into a local Date object (at 00:00:00 local time).
 */
export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date(dateStr);
  const [year, month, day] = parts.map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Adds days to a Date or YYYY-MM-DD string and returns a new Date.
 */
export const addDays = (date: Date | string, days: number): Date => {
  const d = typeof date === 'string' ? parseLocalDate(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Checks if two date strings or dates are the same calendar day.
 */
export const isSameDay = (d1: Date | string, d2: Date | string): boolean => {
  const str1 = typeof d1 === 'string' ? d1 : formatLocalDate(d1);
  const str2 = typeof d2 === 'string' ? d2 : formatLocalDate(d2);
  return str1 === str2;
};

/**
 * Returns the Monday of the current week for a given date.
 */
export const getMondayOfWeek = (d: Date = new Date()): Date => {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun, 1 = Mon ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export interface MonthDateItem {
  dateStr: string;
  dayName: string;
  dayNum: number;
  monthName: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

/**
 * Generates all calendar dates for a specified year and month (0-11).
 * Always starts from Day 1 to the end of the month (28 - 31).
 */
export const getDaysInMonth = (year: number, month: number): MonthDateItem[] => {
  const dates: MonthDateItem[] = [];
  const daysCount = new Date(year, month + 1, 0).getDate();
  const todayStr = formatLocalDate();

  for (let day = 1; day <= daysCount; day++) {
    const d = new Date(year, month, day);
    const dateStr = formatLocalDate(d);
    dates.push({
      dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: day,
      monthName: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isFuture: dateStr > todayStr,
    });
  }

  return dates;
};

/**
 * Formats Month and Year label (e.g., "October 2026")
 */
export const formatMonthYear = (year: number, month: number): string => {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/**
 * Helper to get previous month { year, month }
 */
export const getPrevMonth = (year: number, month: number): { year: number; month: number } => {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
};

/**
 * Helper to get next month { year, month }
 */
export const getNextMonth = (year: number, month: number): { year: number; month: number } => {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
};
