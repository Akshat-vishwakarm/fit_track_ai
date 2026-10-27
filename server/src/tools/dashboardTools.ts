import { z } from 'zod';
import { firestoreClient } from '../db/firestoreClient.js';
import type { ToolDefinition, UserContext } from '../types.js';

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

export const dashboardTools: ToolDefinition[] = [
  {
    name: 'get_dashboard_summary',
    description:
      'Retrieve high-level overview of the user fitness dashboard including habit streaks, today habit completion ratio, scheduled training split for today, calorie target vs consumed, latest weight, and active goals count.',
    category: 'dashboard',
    parameters: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { date?: string }, user: UserContext) => {
      const targetDate = args.date || getLocalDateStr();
      const userId = user.userId;

      const [habits, completions, workoutPlans, workoutLogs, nutritionGoal, meals, progressLogs, goals] =
        await Promise.all([
          firestoreClient.getHabits(userId),
          firestoreClient.getHabitCompletions(userId, undefined, addDays(targetDate, -30), targetDate, 200),
          firestoreClient.getWorkoutPlans(userId),
          firestoreClient.getWorkoutLogs(userId, 5),
          firestoreClient.getNutritionGoal(userId),
          firestoreClient.getMealEntries(userId, targetDate),
          firestoreClient.getProgressEntries(userId, 5),
          firestoreClient.getGoals(userId, 'active'),
        ]);

      // Calculate today's completed habits
      const completedToday = habits.filter((h) =>
        completions.some((c) => c.habit_id === h.id && c.date === targetDate && c.completed)
      );

      // Current streak calculation
      const dateSet = new Set<string>();
      completions.filter((c) => c.completed).forEach((c) => dateSet.add(c.date));
      let currentStreak = 0;
      let checkDate = targetDate;
      while (dateSet.has(checkDate)) {
        currentStreak++;
        checkDate = addDays(checkDate, -1);
      }

      // Today's scheduled workout
      const dayOfWeek = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Mon ... 7=Sun
      const scheduledPlan =
        workoutPlans.find((p) => p.day_of_week === dayOfWeek || p.day_of_week === dayOfWeek - 1) || null;
      const workoutLoggedToday = workoutLogs.some((l) => l.date === targetDate);

      // Nutrition consumed today
      const nutritionConsumed = meals.reduce(
        (acc, m) => {
          acc.calories += m.calories || 0;
          acc.protein += m.protein || 0;
          acc.carbs += m.carbs || 0;
          acc.fats += m.fats || 0;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      // Latest weight
      const latestWeight = progressLogs.length > 0 ? progressLogs[0].weight || null : null;

      return {
        date: targetDate,
        user_id: userId,
        habits: {
          total_active: habits.length,
          completed_today_count: completedToday.length,
          completion_ratio_pct:
            habits.length > 0 ? Math.round((completedToday.length / habits.length) * 100) : 0,
          current_streak_days: currentStreak,
        },
        workout: {
          is_scheduled_today: !!scheduledPlan,
          workout_name: scheduledPlan?.workout_name || 'Rest Day',
          muscle_group: scheduledPlan?.muscle_group || 'Rest',
          workout_completed_today: workoutLoggedToday,
          planned_exercises_count: scheduledPlan?.exercises?.length || 0,
        },
        nutrition: {
          target_calories: nutritionGoal?.calories || 0,
          consumed_calories: nutritionConsumed.calories,
          remaining_calories: Math.max(0, (nutritionGoal?.calories || 0) - nutritionConsumed.calories),
          consumed_protein_g: nutritionConsumed.protein,
          target_protein_g: nutritionGoal?.protein || 0,
          consumed_carbs_g: nutritionConsumed.carbs,
          consumed_fats_g: nutritionConsumed.fats,
          meals_logged_today: meals.length,
        },
        body_progress: {
          latest_weight_kg: latestWeight,
          active_goals_count: goals.length,
        },
      };
    },
  },
  {
    name: 'get_daily_activity_summary',
    description:
      'Retrieve a comprehensive breakdown of all activities on a specific calendar date: which habits were completed vs missed, meals logged with macros, workout performed with volume, and body weight.',
    category: 'dashboard',
    parameters: z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
    }),
    execute: async (args: { date: string }, user: UserContext) => {
      const date = args.date;
      const userId = user.userId;

      const [habits, completions, meals, logs, progress] = await Promise.all([
        firestoreClient.getHabits(userId),
        firestoreClient.getHabitCompletions(userId, undefined, date, date),
        firestoreClient.getMealEntries(userId, date),
        firestoreClient.getWorkoutLogs(userId, 10, date, date),
        firestoreClient.getProgressEntries(userId, 1, date, date),
      ]);

      const completedHabitIds = new Set(completions.filter((c) => c.completed).map((c) => c.habit_id));
      const completedHabits = habits.filter((h) => completedHabitIds.has(h.id));
      const missedHabits = habits.filter((h) => !completedHabitIds.has(h.id));

      const totalNutrition = meals.reduce(
        (acc, m) => {
          acc.calories += m.calories || 0;
          acc.protein += m.protein || 0;
          acc.carbs += m.carbs || 0;
          acc.fats += m.fats || 0;
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      let totalWorkoutVolume = 0;
      logs.forEach((l) => {
        l.exercise_logs?.forEach((ex) => {
          ex.sets?.forEach((s) => {
            if (s.completed) totalWorkoutVolume += (s.weight || 0) * (s.reps || 0);
          });
        });
      });

      return {
        date,
        habits: {
          completed: completedHabits.map((h) => ({ id: h.id, name: h.name, category: h.category })),
          missed: missedHabits.map((h) => ({ id: h.id, name: h.name, category: h.category })),
          completion_pct:
            habits.length > 0 ? Math.round((completedHabits.length / habits.length) * 100) : 0,
        },
        nutrition: {
          total_calories: totalNutrition.calories,
          total_protein_g: totalNutrition.protein,
          total_carbs_g: totalNutrition.carbs,
          total_fats_g: totalNutrition.fats,
          meals_logged: meals.map((m) => ({
            id: m.id,
            time: m.time,
            meal_type: m.meal_type,
            food_name: m.food_name,
            calories: m.calories,
            protein: m.protein,
          })),
        },
        workouts: logs.map((l) => ({
          workout_name: l.workout_name,
          duration_minutes: l.duration_minutes,
          exercises_count: l.exercise_logs?.length || 0,
        })),
        total_lifting_volume_kg: totalWorkoutVolume,
        weight_entry: progress.length > 0 ? progress[0].weight : null,
      };
    },
  },
  {
    name: 'get_weekly_fitness_summary',
    description:
      'Retrieve a 7-day adherence summary: overall habit consistency %, total workout sessions, total lifting volume kg, daily average calories & protein, and net weight change delta.',
    category: 'dashboard',
    parameters: z.object({
      end_date: z.string().optional().describe('End date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { end_date?: string }, user: UserContext) => {
      const endDate = args.end_date || getLocalDateStr();
      const startDate = addDays(endDate, -6);
      const userId = user.userId;

      const [habits, completions, meals, logs, progress, goal] = await Promise.all([
        firestoreClient.getHabits(userId),
        firestoreClient.getHabitCompletions(userId, undefined, startDate, endDate, 200),
        firestoreClient.getMealEntries(userId, undefined, startDate, endDate, undefined, 100),
        firestoreClient.getWorkoutLogs(userId, 50, startDate, endDate),
        firestoreClient.getProgressEntries(userId, 50, startDate, endDate),
        firestoreClient.getNutritionGoal(userId),
      ]);

      const totalHabitPossible = habits.length * 7;
      const completedCompletions = completions.filter((c) => c.completed).length;
      const habitConsistencyPct =
        totalHabitPossible > 0 ? Math.round((completedCompletions / totalHabitPossible) * 100) : 0;

      let totalVolume = 0;
      let totalDuration = 0;
      logs.forEach((l) => {
        totalDuration += l.duration_minutes || 0;
        l.exercise_logs?.forEach((ex) => {
          ex.sets?.forEach((s) => {
            if (s.completed) totalVolume += (s.weight || 0) * (s.reps || 0);
          });
        });
      });

      const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
      const totalProtein = meals.reduce((acc, m) => acc + (m.protein || 0), 0);

      const weights = progress.filter((p) => p.weight !== undefined && p.weight !== null);
      let weightDelta: number | null = null;
      if (weights.length >= 2) {
        weightDelta = Number((weights[0].weight! - weights[weights.length - 1].weight!).toFixed(1));
      }

      return {
        timeframe: { start_date: startDate, end_date: endDate },
        habits: {
          active_habits_count: habits.length,
          total_completions: completedCompletions,
          consistency_rate_pct: habitConsistencyPct,
        },
        workouts: {
          sessions_count: logs.length,
          total_volume_kg: totalVolume,
          total_duration_minutes: totalDuration,
          avg_duration_minutes: logs.length > 0 ? Math.round(totalDuration / logs.length) : 0,
        },
        nutrition: {
          daily_avg_calories: Math.round(totalCalories / 7),
          target_calories: goal?.calories || 0,
          daily_avg_protein_g: Math.round(totalProtein / 7),
          target_protein_g: goal?.protein || 0,
          total_meals_logged: meals.length,
        },
        weight: {
          latest_weight_kg: weights.length > 0 ? weights[0].weight : null,
          change_7d_kg: weightDelta,
        },
      };
    },
  },
  {
    name: 'get_monthly_progress_summary',
    description:
      'Retrieve a 30-day macro overview of habit trends, workout progression, average calorie and macro intake, weight trajectory, and milestone goals.',
    category: 'dashboard',
    parameters: z.object({
      end_date: z.string().optional().describe('End date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { end_date?: string }, user: UserContext) => {
      const endDate = args.end_date || getLocalDateStr();
      const startDate = addDays(endDate, -29);
      const userId = user.userId;

      const [habits, completions, meals, logs, progress, goals] = await Promise.all([
        firestoreClient.getHabits(userId),
        firestoreClient.getHabitCompletions(userId, undefined, startDate, endDate, 500),
        firestoreClient.getMealEntries(userId, undefined, startDate, endDate, undefined, 200),
        firestoreClient.getWorkoutLogs(userId, 100, startDate, endDate),
        firestoreClient.getProgressEntries(userId, 50, startDate, endDate),
        firestoreClient.getGoals(userId),
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

      const weights = progress.filter((p) => p.weight !== undefined && p.weight !== null);
      let weightDelta30d: number | null = null;
      if (weights.length >= 2) {
        weightDelta30d = Number((weights[0].weight! - weights[weights.length - 1].weight!).toFixed(1));
      }

      return {
        timeframe: { start_date: startDate, end_date: endDate, days_count: 30 },
        habits: {
          active_habits: habits.length,
          total_completions_30d: completions.filter((c) => c.completed).length,
          completion_rate_pct:
            habits.length > 0
              ? Math.round((completions.filter((c) => c.completed).length / (habits.length * 30)) * 100)
              : 0,
        },
        workouts: {
          total_sessions: logs.length,
          total_volume_kg: totalVolume,
          weekly_session_average: Number((logs.length / 4.28).toFixed(1)),
        },
        nutrition: {
          daily_avg_calories: Math.round(totalCalories / 30),
          daily_avg_protein_g: Math.round(totalProtein / 30),
          total_meals_logged: meals.length,
        },
        weight_progression: {
          start_weight_kg: weights.length > 0 ? weights[weights.length - 1].weight : null,
          current_weight_kg: weights.length > 0 ? weights[0].weight : null,
          change_30d_kg: weightDelta30d,
        },
        goals_status: {
          active_goals: goals.filter((g) => g.status === 'active').length,
          completed_goals: goals.filter((g) => g.status === 'completed').length,
        },
      };
    },
  },
];
