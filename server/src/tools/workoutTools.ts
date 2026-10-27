import { z } from 'zod';
import { firestoreClient } from '../db/firestoreClient.js';
import type { ToolDefinition, UserContext, WorkoutPlan } from '../types.js';

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

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const workoutTools: ToolDefinition[] = [
  {
    name: 'get_training_split',
    description:
      'Retrieve the full weekly gym training split (Monday through Sunday) with planned workouts, target muscle groups, rest days, and assigned exercises with target sets, reps, and weights.',
    category: 'workouts',
    parameters: z.object({}),
    execute: async (_args: {}, user: UserContext) => {
      const plans = await firestoreClient.getWorkoutPlans(user.userId);

      const split = [1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
        const plan = plans.find((p) => p.day_of_week === dayNum || p.day_of_week === dayNum - 1);
        const dayName = DAY_NAMES[dayNum - 1];
        const isRest = !plan || !plan.exercises || plan.exercises.length === 0;

        return {
          day_of_week: dayNum,
          day_name: dayName,
          is_rest_day: isRest,
          workout_name: isRest ? 'Rest & Recovery' : plan.workout_name,
          muscle_group: isRest ? 'Rest' : plan.muscle_group,
          exercises_count: plan?.exercises?.length || 0,
          exercises:
            plan?.exercises?.map((ex) => ({
              id: ex.id,
              name: ex.name,
              target_muscle: ex.target_muscle,
              target_sets: ex.target_sets,
              target_reps: ex.target_reps,
              target_weight_kg: ex.target_weight,
              notes: ex.notes,
            })) || [],
        };
      });

      return {
        weekly_training_split: split,
        total_training_days: split.filter((s) => !s.is_rest_day).length,
        total_rest_days: split.filter((s) => s.is_rest_day).length,
      };
    },
  },
  {
    name: 'get_todays_workout',
    description:
      'Retrieve the scheduled workout for today (or a specific date) based on the training split, including planned exercises, target weights, sets, reps, and completion status.',
    category: 'workouts',
    parameters: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { date?: string }, user: UserContext) => {
      const targetDate = args.date || getLocalDateStr();
      const parts = targetDate.split('-').map(Number);
      const targetDayObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayNum = targetDayObj.getDay() === 0 ? 7 : targetDayObj.getDay(); // 1=Mon ... 7=Sun
      const dayName = DAY_NAMES[dayNum - 1];

      const [plans, logs] = await Promise.all([
        firestoreClient.getWorkoutPlans(user.userId),
        firestoreClient.getWorkoutLogs(user.userId, 10, targetDate, targetDate),
      ]);

      const plan = plans.find((p) => p.day_of_week === dayNum || p.day_of_week === dayNum - 1);
      const isRest = !plan || !plan.exercises || plan.exercises.length === 0;
      const completedLog = logs.length > 0 ? logs[0] : null;

      return {
        date: targetDate,
        day_of_week: dayNum,
        day_name: dayName,
        is_rest_day: isRest,
        workout_name: isRest ? 'Rest & Recovery' : plan.workout_name,
        muscle_group: isRest ? 'Rest' : plan.muscle_group,
        is_completed_today: !!completedLog,
        completed_workout_log: completedLog
          ? {
              id: completedLog.id,
              workout_name: completedLog.workout_name,
              duration_minutes: completedLog.duration_minutes,
              exercises_logged: completedLog.exercise_logs?.length || 0,
            }
          : null,
        planned_exercises:
          plan?.exercises?.map((ex) => ({
            name: ex.name,
            target_muscle: ex.target_muscle,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
            target_weight_kg: ex.target_weight,
            notes: ex.notes,
          })) || [],
      };
    },
  },
  {
    name: 'get_exercises_for_workout',
    description:
      'Retrieve the full list of exercises for a specific day of the week or workout plan.',
    category: 'workouts',
    parameters: z.object({
      day_of_week: z.number().min(1).max(7).optional().describe('Day of week (1=Monday, 7=Sunday)'),
      workout_plan_id: z.string().optional().describe('Specific workout plan ID'),
    }),
    execute: async (args: { day_of_week?: number; workout_plan_id?: string }, user: UserContext) => {
      const plans = await firestoreClient.getWorkoutPlans(user.userId);
      let plan: WorkoutPlan | undefined;

      if (args.workout_plan_id) {
        plan = plans.find((p) => p.id === args.workout_plan_id);
      } else if (args.day_of_week) {
        plan = plans.find((p) => p.day_of_week === args.day_of_week || p.day_of_week === args.day_of_week - 1);
      } else {
        const todayDay = new Date().getDay() === 0 ? 7 : new Date().getDay();
        plan = plans.find((p) => p.day_of_week === todayDay || p.day_of_week === todayDay - 1);
      }

      if (!plan) {
        return {
          found: false,
          message: 'No workout plan found for the requested day or ID (likely a Rest Day).',
          exercises: [],
        };
      }

      return {
        found: true,
        workout_name: plan.workout_name,
        muscle_group: plan.muscle_group,
        day_of_week: plan.day_of_week,
        exercises: plan.exercises || [],
      };
    },
  },
  {
    name: 'get_workout_history',
    description:
      'Retrieve past logged workout sessions with duration, exercises performed, sets, weights, reps, and total lifting volume in kg.',
    category: 'workouts',
    parameters: z.object({
      limit: z.number().min(1).max(50).optional().default(10),
      start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
    }),
    execute: async (args: { limit?: number; start_date?: string; end_date?: string }, user: UserContext) => {
      const logs = await firestoreClient.getWorkoutLogs(
        user.userId,
        args.limit || 10,
        args.start_date,
        args.end_date
      );

      const formatted = logs.map((l) => {
        let volume = 0;
        l.exercise_logs?.forEach((ex) => {
          ex.sets?.forEach((s) => {
            if (s.completed) volume += (s.weight || 0) * (s.reps || 0);
          });
        });

        return {
          id: l.id,
          date: l.date,
          workout_name: l.workout_name,
          duration_minutes: l.duration_minutes,
          total_volume_kg: volume,
          exercises_performed:
            l.exercise_logs?.map((ex) => ({
              exercise_name: ex.exercise_name,
              target_muscle: ex.target_muscle,
              sets: ex.sets || [],
            })) || [],
        };
      });

      return {
        count: formatted.length,
        workout_logs: formatted,
      };
    },
  },
  {
    name: 'get_exercise_sets_and_reps',
    description:
      'Retrieve historical set, rep, and weight progression for a specific exercise across past workouts to analyze progressive overload.',
    category: 'workouts',
    parameters: z.object({
      exercise_name: z.string().describe('Name of the exercise (e.g. "Bench Press", "Squat", "Deadlift")'),
      limit: z.number().min(1).max(20).optional().default(10),
    }),
    execute: async (args: { exercise_name: string; limit?: number }, user: UserContext) => {
      const logs = await firestoreClient.getWorkoutLogs(user.userId, 50);
      const queryName = args.exercise_name.toLowerCase().trim();

      const history: Array<{
        date: string;
        workout_name: string;
        sets: Array<{ set_number: number; weight: number; reps: number; completed: boolean }>;
        best_set: { weight: number; reps: number } | null;
        total_exercise_volume_kg: number;
      }> = [];

      for (const l of logs) {
        const matchingEx = l.exercise_logs?.find((ex) =>
          ex.exercise_name.toLowerCase().includes(queryName)
        );
        if (matchingEx && matchingEx.sets && matchingEx.sets.length > 0) {
          let vol = 0;
          let best: { weight: number; reps: number } | null = null;

          matchingEx.sets.forEach((s) => {
            if (s.completed) {
              vol += (s.weight || 0) * (s.reps || 0);
              if (!best || (s.weight || 0) > best.weight) {
                best = { weight: s.weight, reps: s.reps };
              }
            }
          });

          history.push({
            date: l.date,
            workout_name: l.workout_name,
            sets: matchingEx.sets,
            best_set: best,
            total_exercise_volume_kg: vol,
          });

          if (history.length >= (args.limit || 10)) break;
        }
      }

      return {
        exercise_searched: args.exercise_name,
        sessions_found: history.length,
        progression_history: history,
      };
    },
  },
  {
    name: 'get_workout_completion_status',
    description:
      'Check whether the scheduled workout for today (or a specified date) was completed, including duration and exercise counts.',
    category: 'workouts',
    parameters: z.object({
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
    }),
    execute: async (args: { date?: string }, user: UserContext) => {
      const targetDate = args.date || getLocalDateStr();
      const logs = await firestoreClient.getWorkoutLogs(user.userId, 5, targetDate, targetDate);

      const completed = logs.length > 0;
      return {
        date: targetDate,
        completed,
        workout_log: completed
          ? {
              id: logs[0].id,
              workout_name: logs[0].workout_name,
              duration_minutes: logs[0].duration_minutes,
              exercises_count: logs[0].exercise_logs?.length || 0,
            }
          : null,
      };
    },
  },
  {
    name: 'get_training_volume',
    description:
      'Calculate total training volume (weight x reps) aggregated over 7 days, 30 days, or all time, with muscle group breakdown.',
    category: 'workouts',
    parameters: z.object({
      timeframe: z.enum(['7d', '30d', 'all']).optional().default('7d'),
    }),
    execute: async (args: { timeframe?: '7d' | '30d' | 'all' }, user: UserContext) => {
      const tf = args.timeframe || '7d';
      const today = getLocalDateStr();
      const startDate = tf === '7d' ? addDays(today, -6) : tf === '30d' ? addDays(today, -29) : undefined;

      const logs = await firestoreClient.getWorkoutLogs(user.userId, 100, startDate, today);

      let totalVolumeKg = 0;
      const volumeByMuscle: Record<string, number> = {};

      logs.forEach((l) => {
        l.exercise_logs?.forEach((ex) => {
          const muscle = ex.target_muscle || 'General';
          let exVol = 0;
          ex.sets?.forEach((s) => {
            if (s.completed) {
              const v = (s.weight || 0) * (s.reps || 0);
              exVol += v;
              totalVolumeKg += v;
            }
          });
          volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + exVol;
        });
      });

      return {
        timeframe: tf,
        total_sessions_count: logs.length,
        total_volume_kg: totalVolumeKg,
        avg_volume_per_session_kg: logs.length > 0 ? Math.round(totalVolumeKg / logs.length) : 0,
        volume_by_muscle_group: volumeByMuscle,
      };
    },
  },
  {
    name: 'get_cardio_and_activity_logs',
    description: 'Retrieve workout duration and activity frequency metrics.',
    category: 'workouts',
    parameters: z.object({
      limit: z.number().min(1).max(30).optional().default(15),
    }),
    execute: async (args: { limit?: number }, user: UserContext) => {
      const logs = await firestoreClient.getWorkoutLogs(user.userId, args.limit || 15);
      return {
        activity_logs: logs.map((l) => ({
          date: l.date,
          activity_name: l.workout_name,
          duration_minutes: l.duration_minutes,
        })),
      };
    },
  },
  {
    name: 'record_workout',
    description:
      'Record a completed workout session with exercises, sets, reps, and weights. Validates submission and confirms success.',
    category: 'workouts',
    isWrite: true,
    parameters: z.object({
      workout_name: z.string().describe('Name of the workout session (e.g., "Push Day", "Chest & Triceps")'),
      duration_minutes: z.number().min(1).describe('Workout duration in minutes'),
      date: z.string().optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
      exercises: z
        .array(
          z.object({
            exercise_name: z.string(),
            target_muscle: z.string(),
            sets: z.array(
              z.object({
                set_number: z.number(),
                weight: z.number(),
                reps: z.number(),
                completed: z.boolean().default(true),
              })
            ),
          })
        )
        .describe('List of exercises performed and completed sets'),
    }),
    execute: async (
      args: {
        workout_name: string;
        duration_minutes: number;
        date?: string;
        exercises: Array<{
          exercise_name: string;
          target_muscle: string;
          sets: Array<{ set_number: number; weight: number; reps: number; completed: boolean }>;
        }>;
      },
      user: UserContext
    ) => {
      if (user.readOnly) {
        throw new Error('Action rejected: read-only access token.');
      }
      const targetDate = args.date || getLocalDateStr();

      let sessionVolume = 0;
      const formattedExercises = args.exercises.map((ex, idx) => {
        ex.sets.forEach((s) => {
          if (s.completed) sessionVolume += (s.weight || 0) * (s.reps || 0);
        });
        return {
          exercise_id: 'ex_' + Date.now() + '_' + idx,
          exercise_name: ex.exercise_name,
          target_muscle: ex.target_muscle,
          sets: ex.sets,
        };
      });

      const log = await firestoreClient.addWorkoutLog(user.userId, {
        user_id: user.userId,
        workout_name: args.workout_name,
        date: targetDate,
        duration_minutes: args.duration_minutes,
        exercise_logs: formattedExercises,
      });

      return {
        success: true,
        message: 'Workout session recorded successfully.',
        workout_id: log.id,
        workout_name: log.workout_name,
        date: log.date,
        total_volume_kg: sessionVolume,
      };
    },
  },
];
