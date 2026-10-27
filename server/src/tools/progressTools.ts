import { z } from 'zod';
import { firestoreClient } from '../db/firestoreClient.js';
import type { ToolDefinition, UserContext, GoalCategory } from '../types.js';

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

export const progressTools: ToolDefinition[] = [
  {
    name: 'get_weight_history',
    description:
      'Retrieve body weight history with dates, delta calculations, and trend analysis. Never invents missing values.',
    category: 'progress',
    parameters: z.object({
      limit: z.number().min(1).max(100).optional().default(30),
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
    }),
    execute: async (args: { limit?: number; start_date?: string; end_date?: string }, user: UserContext) => {
      const logs = await firestoreClient.getProgressEntries(
        user.userId,
        args.limit || 30,
        args.start_date,
        args.end_date
      );

      const withWeight = logs.filter((p) => p.weight !== undefined && p.weight !== null);
      let weightDelta: number | null = null;
      if (withWeight.length >= 2) {
        weightDelta = Number((withWeight[0].weight! - withWeight[withWeight.length - 1].weight!).toFixed(1));
      }

      return {
        total_records: withWeight.length,
        latest_weight_kg: withWeight.length > 0 ? withWeight[0].weight : null,
        period_weight_change_kg: weightDelta,
        history: withWeight.map((p) => ({
          date: p.date,
          weight_kg: p.weight,
          body_fat_pct: p.body_fat,
        })),
      };
    },
  },
  {
    name: 'get_body_measurements',
    description:
      'Retrieve recorded body measurements (waist, chest, arms, body fat percentage) across dates.',
    category: 'progress',
    parameters: z.object({}),
    execute: async (_args: {}, user: UserContext) => {
      const logs = await firestoreClient.getProgressEntries(user.userId, 30);
      const withMeasurements = logs.filter(
        (p) => p.waist || p.chest || p.arms || p.body_fat
      );

      return {
        records_count: withMeasurements.length,
        latest_measurements:
          withMeasurements.length > 0
            ? {
                date: withMeasurements[0].date,
                waist_cm: withMeasurements[0].waist,
                chest_cm: withMeasurements[0].chest,
                arms_cm: withMeasurements[0].arms,
                body_fat_pct: withMeasurements[0].body_fat,
              }
            : null,
        measurement_history: withMeasurements.map((p) => ({
          date: p.date,
          waist: p.waist,
          chest: p.chest,
          arms: p.arms,
          body_fat: p.body_fat,
        })),
      };
    },
  },
  {
    name: 'get_progress_photos_metadata',
    description: 'Retrieve metadata and notes from progress check-ins.',
    category: 'progress',
    parameters: z.object({}),
    execute: async (_args: {}, user: UserContext) => {
      const logs = await firestoreClient.getProgressEntries(user.userId, 20);
      return {
        entries: logs.map((p) => ({
          id: p.id,
          date: p.date,
          has_weight: !!p.weight,
          has_measurements: !!(p.waist || p.chest || p.arms),
          notes: p.notes,
        })),
      };
    },
  },
  {
    name: 'get_fitness_goals',
    description:
      'Retrieve fitness goals with target values, current values, units, category, deadlines, and status.',
    category: 'progress',
    parameters: z.object({
      status: z.enum(['active', 'completed', 'paused']).optional().describe('Filter by goal status'),
    }),
    execute: async (args: { status?: 'active' | 'completed' | 'paused' }, user: UserContext) => {
      const goals = await firestoreClient.getGoals(user.userId, args.status);
      return {
        count: goals.length,
        goals: goals.map((g) => {
          const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
          return {
            id: g.id,
            title: g.title,
            category: g.category,
            current_value: g.current_value,
            target_value: g.target_value,
            unit: g.unit,
            progress_pct: pct,
            status: g.status,
            start_date: g.start_date,
            deadline: g.deadline,
          };
        }),
      };
    },
  },
  {
    name: 'get_goal_progress',
    description:
      'Calculate detailed progress metrics for a specific fitness goal including completion percentage, remaining delta, and timeline.',
    category: 'progress',
    parameters: z.object({
      goal_id: z.string().describe('ID of the fitness goal'),
    }),
    execute: async (args: { goal_id: string }, user: UserContext) => {
      const goal = await firestoreClient.getGoalById(user.userId, args.goal_id);
      if (!goal) {
        throw new Error(`Goal with ID '${args.goal_id}' not found.`);
      }

      const pct = goal.target_value > 0 ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)) : 0;
      const remaining = Math.max(0, goal.target_value - goal.current_value);

      return {
        id: goal.id,
        title: goal.title,
        category: goal.category,
        current_value: goal.current_value,
        target_value: goal.target_value,
        remaining_to_target: remaining,
        unit: goal.unit,
        progress_percentage: pct,
        is_completed: goal.status === 'completed' || pct >= 100,
        deadline: goal.deadline || null,
      };
    },
  },
  {
    name: 'get_progress_trends',
    description:
      'Correlate body weight changes, weekly lifting volume, habit consistency, and calorie intake to explain what is driving or stalling progress.',
    category: 'progress',
    parameters: z.object({}),
    execute: async (_args: {}, user: UserContext) => {
      const today = getLocalDateStr();
      const startDate = addDays(today, -27); // 4 weeks

      const [progress, logs, meals, habits, completions, nutritionGoal] = await Promise.all([
        firestoreClient.getProgressEntries(user.userId, 30, startDate, today),
        firestoreClient.getWorkoutLogs(user.userId, 50, startDate, today),
        firestoreClient.getMealEntries(user.userId, undefined, startDate, today, undefined, 200),
        firestoreClient.getHabits(user.userId),
        firestoreClient.getHabitCompletions(user.userId, undefined, startDate, today, 400),
        firestoreClient.getNutritionGoal(user.userId),
      ]);

      const totalVolume = logs.reduce((sum, l) => {
        let v = 0;
        l.exercise_logs?.forEach((ex) => {
          ex.sets?.forEach((s) => {
            if (s.completed) v += (s.weight || 0) * (s.reps || 0);
          });
        });
        return sum + v;
      }, 0);

      const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
      const totalProtein = meals.reduce((acc, m) => acc + (m.protein || 0), 0);
      const avgCalories = Math.round(totalCalories / 28);
      const avgProtein = Math.round(totalProtein / 28);

      const weights = progress.filter((p) => p.weight !== undefined && p.weight !== null);
      let weightChange: number | null = null;
      if (weights.length >= 2) {
        weightChange = Number((weights[0].weight! - weights[weights.length - 1].weight!).toFixed(1));
      }

      const totalHabitsPossible = habits.length * 28;
      const completedCompletions = completions.filter((c) => c.completed).length;
      const habitRate =
        totalHabitsPossible > 0 ? Math.round((completedCompletions / totalHabitsPossible) * 100) : 0;

      return {
        timeframe: '4_weeks',
        weight: {
          latest_kg: weights.length > 0 ? weights[0].weight : null,
          change_28d_kg: weightChange,
        },
        training: {
          total_sessions: logs.length,
          avg_sessions_per_week: Number((logs.length / 4).toFixed(1)),
          total_volume_kg: totalVolume,
        },
        nutrition: {
          daily_avg_calories: avgCalories,
          target_calories: nutritionGoal?.calories || 0,
          daily_avg_protein_g: avgProtein,
          target_protein_g: nutritionGoal?.protein || 0,
        },
        habit_discipline: {
          overall_consistency_pct: habitRate,
        },
      };
    },
  },
  {
    name: 'update_goal',
    description:
      'Update progress on an existing fitness goal (e.g. increase current value or change status).',
    category: 'progress',
    isWrite: true,
    parameters: z.object({
      goal_id: z.string().describe('ID of the goal to update'),
      current_value: z.number().optional().describe('New current numeric progress value'),
      status: z.enum(['active', 'completed', 'paused']).optional().describe('New status'),
    }),
    execute: async (
      args: { goal_id: string; current_value?: number; status?: 'active' | 'completed' | 'paused' },
      user: UserContext
    ) => {
      if (user.readOnly) {
        throw new Error('Action rejected: read-only access token.');
      }
      const updates: any = {};
      if (args.current_value !== undefined) updates.current_value = args.current_value;
      if (args.status !== undefined) updates.status = args.status;

      const updated = await firestoreClient.updateGoal(user.userId, args.goal_id, updates);
      return {
        success: true,
        goal: updated,
      };
    },
  },
  {
    name: 'log_weight_entry',
    description:
      'Log body weight and optional body measurements for today (or a specific date).',
    category: 'progress',
    isWrite: true,
    parameters: z.object({
      weight: z.number().min(20).max(350).describe('Body weight in kg'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
      body_fat: z.number().min(1).max(70).optional().describe('Body fat percentage'),
      waist: z.number().optional().describe('Waist circumference in cm'),
      chest: z.number().optional().describe('Chest circumference in cm'),
      arms: z.number().optional().describe('Arms circumference in cm'),
      notes: z.string().optional().describe('Notes'),
    }),
    execute: async (
      args: {
        weight: number;
        date?: string;
        body_fat?: number;
        waist?: number;
        chest?: number;
        arms?: number;
        notes?: string;
      },
      user: UserContext
    ) => {
      if (user.readOnly) {
        throw new Error('Action rejected: read-only access token.');
      }
      const targetDate = args.date || getLocalDateStr();

      const created = await firestoreClient.addProgressEntry(user.userId, {
        user_id: user.userId,
        date: targetDate,
        weight: args.weight,
        body_fat: args.body_fat,
        waist: args.waist,
        chest: args.chest,
        arms: args.arms,
        notes: args.notes,
      });

      return {
        success: true,
        message: 'Weight entry recorded successfully.',
        entry_id: created.id,
        date: created.date,
        weight_kg: created.weight,
      };
    },
  },
];
