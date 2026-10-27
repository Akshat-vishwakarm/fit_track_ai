import { z } from 'zod';
import { firestoreClient } from '../db/firestoreClient.js';
import type { ToolDefinition, UserContext, HabitCategory } from '../types.js';

function getLocalDateStr(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return getLocalDateStr(d);
}

export const habitTools: ToolDefinition[] = [
  {
    name: 'get_all_tasks',
    description:
      'Retrieve all configured daily habits/tasks for the user, including habit name, category, daily target, unit, icon, and frequency.',
    category: 'habits',
    parameters: z.object({
      category: z
        .enum(['health', 'fitness', 'mindset', 'nutrition', 'productivity', 'custom'])
        .optional()
        .describe('Filter by habit category'),
      include_archived: z.boolean().optional().default(false).describe('Whether to include archived habits'),
    }),
    execute: async (args: { category?: HabitCategory; include_archived?: boolean }, user: UserContext) => {
      const habits = await firestoreClient.getHabits(user.userId, args.include_archived, args.category);
      return {
        count: habits.length,
        habits: habits.map((h) => ({
          id: h.id,
          name: h.name,
          category: h.category,
          frequency: h.frequency,
          daily_target: h.goal_target,
          unit: h.unit,
          color: h.color,
          icon: h.icon,
          archived: h.archived,
        })),
      };
    },
  },
  {
    name: 'get_completed_tasks',
    description:
      'Retrieve the list of habits/tasks that have been completed on a specific date (defaults to today).',
    category: 'habits',
    parameters: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { date?: string }, user: UserContext) => {
      const targetDate = args.date || getLocalDateStr();
      const [habits, completions] = await Promise.all([
        firestoreClient.getHabits(user.userId),
        firestoreClient.getHabitCompletions(user.userId, undefined, targetDate, targetDate),
      ]);

      const completedIds = new Set(completions.filter((c) => c.completed).map((c) => c.habit_id));
      const completed = habits.filter((h) => completedIds.has(h.id));

      return {
        date: targetDate,
        total_active_tasks: habits.length,
        completed_count: completed.length,
        completed_tasks: completed.map((h) => ({
          id: h.id,
          name: h.name,
          category: h.category,
          daily_target: h.goal_target,
          unit: h.unit,
          status: 'completed',
        })),
      };
    },
  },
  {
    name: 'get_incomplete_tasks',
    description:
      'Retrieve habits/tasks that are still pending / incomplete for today (or a specified date).',
    category: 'habits',
    parameters: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { date?: string }, user: UserContext) => {
      const targetDate = args.date || getLocalDateStr();
      const [habits, completions] = await Promise.all([
        firestoreClient.getHabits(user.userId),
        firestoreClient.getHabitCompletions(user.userId, undefined, targetDate, targetDate),
      ]);

      const completedIds = new Set(completions.filter((c) => c.completed).map((c) => c.habit_id));
      const incomplete = habits.filter((h) => !completedIds.has(h.id));

      return {
        date: targetDate,
        total_active_tasks: habits.length,
        incomplete_count: incomplete.length,
        incomplete_tasks: incomplete.map((h) => ({
          id: h.id,
          name: h.name,
          category: h.category,
          daily_target: h.goal_target,
          unit: h.unit,
          status: 'incomplete',
        })),
      };
    },
  },
  {
    name: 'get_overdue_tasks',
    description:
      'Identify missed/incomplete habits from past days over a specified lookback window.',
    category: 'habits',
    parameters: z.object({
      days_back: z.number().min(1).max(30).optional().default(7).describe('Lookback window in days (default: 7)'),
    }),
    execute: async (args: { days_back?: number }, user: UserContext) => {
      const daysBack = args.days_back || 7;
      const today = getLocalDateStr();
      const startDate = addDays(today, -daysBack);

      const [habits, completions] = await Promise.all([
        firestoreClient.getHabits(user.userId),
        firestoreClient.getHabitCompletions(user.userId, undefined, startDate, addDays(today, -1), 300),
      ]);

      const overdueByDate: Record<string, string[]> = {};
      let totalMissedSlots = 0;

      for (let i = daysBack; i >= 1; i--) {
        const dStr = addDays(today, -i);
        const dayCompletions = new Set(completions.filter((c) => c.date === dStr && c.completed).map((c) => c.habit_id));
        const missed = habits.filter((h) => !dayCompletions.has(h.id)).map((h) => h.name);
        if (missed.length > 0) {
          overdueByDate[dStr] = missed;
          totalMissedSlots += missed.length;
        }
      }

      return {
        lookback_days: daysBack,
        total_missed_slots: totalMissedSlots,
        missed_by_date: overdueByDate,
      };
    },
  },
  {
    name: 'get_habit_history',
    description:
      'Retrieve calendar completion records for a specific habit or all habits across a date range.',
    category: 'habits',
    parameters: z.object({
      habit_id: z.string().optional().describe('Specific habit ID to filter by'),
      start_date: z.string().optional().describe('Start date in YYYY-MM-DD format (default: 14 days ago)'),
      end_date: z.string().optional().describe('End date in YYYY-MM-DD format (default: today)'),
      limit: z.number().min(1).max(100).optional().default(50),
    }),
    execute: async (
      args: { habit_id?: string; start_date?: string; end_date?: string; limit?: number },
      user: UserContext
    ) => {
      const today = getLocalDateStr();
      const startDate = args.start_date || addDays(today, -13);
      const endDate = args.end_date || today;

      const [habits, completions] = await Promise.all([
        firestoreClient.getHabits(user.userId),
        firestoreClient.getHabitCompletions(user.userId, args.habit_id, startDate, endDate, args.limit || 50),
      ]);

      const habitMap = new Map(habits.map((h) => [h.id, h.name]));

      return {
        start_date: startDate,
        end_date: endDate,
        records_count: completions.length,
        history: completions.map((c) => ({
          date: c.date,
          habit_id: c.habit_id,
          habit_name: habitMap.get(c.habit_id) || 'Unknown Habit',
          completed: c.completed,
          created_at: c.created_at,
        })),
      };
    },
  },
  {
    name: 'get_habit_streaks',
    description:
      'Retrieve current and best consecutive daily streaks for all active habits.',
    category: 'habits',
    parameters: z.object({}),
    execute: async (_args: {}, user: UserContext) => {
      const today = getLocalDateStr();
      const startDate = addDays(today, -60);

      const [habits, completions] = await Promise.all([
        firestoreClient.getHabits(user.userId),
        firestoreClient.getHabitCompletions(user.userId, undefined, startDate, today, 500),
      ]);

      // Overall streak
      const overallDates = new Set(completions.filter((c) => c.completed).map((c) => c.date));
      let currentOverallStreak = 0;
      let checkDate = today;
      // Allow streak if completed today OR yesterday
      if (!overallDates.has(checkDate) && overallDates.has(addDays(today, -1))) {
        checkDate = addDays(today, -1);
      }
      while (overallDates.has(checkDate)) {
        currentOverallStreak++;
        checkDate = addDays(checkDate, -1);
      }

      // Per habit streaks
      const perHabit = habits.map((h) => {
        const hDates = new Set(completions.filter((c) => c.habit_id === h.id && c.completed).map((c) => c.date));
        let streak = 0;
        let d = today;
        if (!hDates.has(d) && hDates.has(addDays(today, -1))) {
          d = addDays(today, -1);
        }
        while (hDates.has(d)) {
          streak++;
          d = addDays(d, -1);
        }
        return {
          habit_id: h.id,
          name: h.name,
          current_streak_days: streak,
          completed_today: hDates.has(today),
        };
      });

      return {
        overall_current_streak_days: currentOverallStreak,
        active_habits_count: habits.length,
        habit_streaks: perHabit,
      };
    },
  },
  {
    name: 'get_habit_completion_rates',
    description:
      'Calculate habit completion percentage rates over 7-day, 14-day, and 30-day lookback periods for each habit.',
    category: 'habits',
    parameters: z.object({
      lookback_days: z.number().min(7).max(60).optional().default(30),
    }),
    execute: async (args: { lookback_days?: number }, user: UserContext) => {
      const days = args.lookback_days || 30;
      const today = getLocalDateStr();
      const startDate = addDays(today, -(days - 1));

      const [habits, completions] = await Promise.all([
        firestoreClient.getHabits(user.userId),
        firestoreClient.getHabitCompletions(user.userId, undefined, startDate, today, 600),
      ]);

      const last7Start = addDays(today, -6);
      const last14Start = addDays(today, -13);

      const rates = habits.map((h) => {
        const hComps = completions.filter((c) => c.habit_id === h.id && c.completed);
        const count7d = hComps.filter((c) => c.date >= last7Start).length;
        const count14d = hComps.filter((c) => c.date >= last14Start).length;
        const countTotal = hComps.length;

        return {
          id: h.id,
          name: h.name,
          category: h.category,
          rate_7d_pct: Math.round((count7d / 7) * 100),
          rate_14d_pct: Math.round((count14d / 14) * 100),
          rate_30d_pct: Math.round((countTotal / days) * 100),
          total_completed_days: countTotal,
        };
      });

      return {
        lookback_window_days: days,
        habits: rates,
      };
    },
  },
  {
    name: 'mark_task_complete',
    description:
      'Mark a habit/task as completed or incomplete for today or a specific date. Confirms success from backend.',
    category: 'habits',
    isWrite: true,
    parameters: z.object({
      habit_id: z.string().describe('ID of the habit to update'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
      completed: z.boolean().optional().default(true).describe('True to mark complete, false to unmark'),
    }),
    execute: async (args: { habit_id: string; date?: string; completed?: boolean }, user: UserContext) => {
      if (user.readOnly) {
        throw new Error('Action rejected: read-only access token.');
      }
      const targetDate = args.date || getLocalDateStr();
      const completed = args.completed !== undefined ? args.completed : true;

      const record = await firestoreClient.saveHabitCompletion(
        user.userId,
        args.habit_id,
        targetDate,
        completed
      );

      return {
        success: true,
        action: completed ? 'marked_completed' : 'unmarked_completed',
        habit_id: args.habit_id,
        date: targetDate,
        status: record.completed ? 'completed' : 'incomplete',
        updated_at: new Date().toISOString(),
      };
    },
  },
  {
    name: 'update_task_status',
    description:
      'Update habit settings such as name, daily target, or archive status.',
    category: 'habits',
    isWrite: true,
    parameters: z.object({
      habit_id: z.string().describe('ID of the habit to update'),
      name: z.string().optional().describe('New name for the habit'),
      goal_target: z.number().optional().describe('New daily target value'),
      archived: z.boolean().optional().describe('Set to true to archive, false to unarchive'),
    }),
    execute: async (
      args: { habit_id: string; name?: string; goal_target?: number; archived?: boolean },
      user: UserContext
    ) => {
      if (user.readOnly) {
        throw new Error('Action rejected: read-only access token.');
      }
      const updates: any = {};
      if (args.name !== undefined) updates.name = args.name;
      if (args.goal_target !== undefined) updates.goal_target = args.goal_target;
      if (args.archived !== undefined) updates.archived = args.archived;

      const updated = await firestoreClient.updateHabit(user.userId, args.habit_id, updates);
      return {
        success: true,
        habit: updated,
      };
    },
  },
];
