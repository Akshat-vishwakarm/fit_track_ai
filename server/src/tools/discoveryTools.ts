import { z } from 'zod';
import { firestoreClient } from '../db/firestoreClient.js';
import type { ToolDefinition, UserContext } from '../types.js';

export const discoveryTools: ToolDefinition[] = [
  {
    name: 'get_available_data_categories',
    description:
      'Discover all fitness data domains and records available in the FitTrack AI platform, including record counts and tools available for each.',
    category: 'discovery',
    parameters: z.object({}),
    execute: async (_args: {}, user: UserContext) => {
      const [habits, completions, workoutPlans, workoutLogs, nutritionGoal, meals, progress, goals] =
        await Promise.all([
          firestoreClient.getHabits(user.userId),
          firestoreClient.getHabitCompletions(user.userId, undefined, undefined, undefined, 50),
          firestoreClient.getWorkoutPlans(user.userId),
          firestoreClient.getWorkoutLogs(user.userId, 20),
          firestoreClient.getNutritionGoal(user.userId),
          firestoreClient.getMealEntries(user.userId, undefined, undefined, undefined, undefined, 20),
          firestoreClient.getProgressEntries(user.userId, 20),
          firestoreClient.getGoals(user.userId),
        ]);

      return {
        platform: 'FitTrack AI',
        user_id: user.userId,
        categories: [
          {
            category: 'habits',
            title: 'Habit Tracker & Daily Routines',
            records_count: habits.length,
            completions_tracked: completions.length,
            description: 'Custom habits, daily completion status, streaks, frequency, and discipline consistency.',
          },
          {
            category: 'workouts',
            title: 'Gym & Training Splits',
            split_days_configured: workoutPlans.length,
            logged_sessions: workoutLogs.length,
            description: 'Weekly training split (Monday-Sunday), exercise sets/reps/weights, workout logs, lifting volume.',
          },
          {
            category: 'nutrition',
            title: 'Nutrition & Macro Tracking',
            calorie_target_set: !!nutritionGoal,
            logged_meals_recent: meals.length,
            description: 'Daily calorie and macro targets (protein, carbs, fats), meal logs with ingredients and estimates.',
          },
          {
            category: 'progress',
            title: 'Body Progress & Metrics',
            weight_records: progress.length,
            description: 'Weight tracking, body measurements (waist, chest, arms, body fat %), and progress notes.',
          },
          {
            category: 'goals',
            title: 'Fitness Goals',
            goals_count: goals.length,
            description: 'Target goals with milestones, deadlines, and current completion percentages.',
          },
        ],
      };
    },
  },
  {
    name: 'get_user_data_schema',
    description:
      'Retrieve the database schema, field types, and descriptions for all FitTrack AI entities.',
    category: 'discovery',
    parameters: z.object({
      category: z
        .enum(['habits', 'workouts', 'nutrition', 'progress', 'goals'])
        .optional()
        .describe('Specific category to inspect'),
    }),
    execute: async (args: { category?: string }, _user: UserContext) => {
      const schemas: Record<string, any> = {
        habits: {
          collection: 'users/{userId}/habits',
          fields: {
            id: 'string (unique habit identifier)',
            name: 'string (habit title e.g. "Morning Gym", "Cold Shower")',
            category: 'health | fitness | mindset | nutrition | productivity | custom',
            frequency: 'daily | weekly',
            goal_target: 'number (daily target count/duration)',
            unit: 'string (e.g. "times", "liters", "mins")',
            color: 'string (hex color)',
            archived: 'boolean',
          },
        },
        habitCompletions: {
          collection: 'users/{userId}/habitCompletions',
          fields: {
            id: 'string',
            habit_id: 'string (references habits.id)',
            date: 'string (YYYY-MM-DD)',
            completed: 'boolean',
            value: 'number',
          },
        },
        workoutPlans: {
          collection: 'users/{userId}/workoutPlans',
          fields: {
            id: 'string',
            day_of_week: 'number (1=Monday ... 7=Sunday)',
            workout_name: 'string (e.g. "Push Hypertrophy", "Legs & Core")',
            muscle_group: 'string',
            exercises: 'Array<{ id, name, target_muscle, target_sets, target_reps, target_weight, notes }>',
          },
        },
        workoutLogs: {
          collection: 'users/{userId}/workoutLogs',
          fields: {
            id: 'string',
            workout_name: 'string',
            date: 'string (YYYY-MM-DD)',
            duration_minutes: 'number',
            exercise_logs: 'Array<{ exercise_name, target_muscle, sets: Array<{ set_number, weight, reps, completed }> }>',
          },
        },
        nutrition: {
          collection: 'users/{userId}/nutritionGoals & mealEntries',
          fields: {
            nutritionGoals: '{ calories: number, protein: number, carbs: number, fats: number }',
            mealEntries: '{ id, date, time, meal_type, food_name, calories, protein, carbs, fats, food_items }',
          },
        },
        progress: {
          collection: 'users/{userId}/progressEntries',
          fields: {
            id: 'string',
            date: 'string (YYYY-MM-DD)',
            weight: 'number (kg)',
            body_fat: 'number (%)',
            waist: 'number (cm)',
            chest: 'number (cm)',
            arms: 'number (cm)',
            notes: 'string',
          },
        },
        goals: {
          collection: 'users/{userId}/goals',
          fields: {
            id: 'string',
            title: 'string',
            category: 'habit | workout | nutrition | weight | custom',
            target_value: 'number',
            current_value: 'number',
            unit: 'string',
            deadline: 'string (YYYY-MM-DD)',
            status: 'active | completed | paused',
          },
        },
      };

      if (args.category && schemas[args.category]) {
        return { category: args.category, schema: schemas[args.category] };
      }
      return { all_schemas: schemas };
    },
  },
  {
    name: 'search_fitness_records',
    description:
      'Search across all fitness records (habits, exercises, meal food items, goals, and workout names) matching a text query.',
    category: 'discovery',
    parameters: z.object({
      query: z.string().describe('Search keyword or phrase (e.g. "protein", "bench", "water", "weight")'),
      categories: z
        .array(z.enum(['habits', 'workouts', 'nutrition', 'goals']))
        .optional()
        .describe('Optional categories to restrict search to'),
    }),
    execute: async (args: { query: string; categories?: string[] }, user: UserContext) => {
      const q = args.query.toLowerCase().trim();
      const cats = args.categories || ['habits', 'workouts', 'nutrition', 'goals'];

      const [habits, plans, logs, meals, goals] = await Promise.all([
        cats.includes('habits') ? firestoreClient.getHabits(user.userId, true) : [],
        cats.includes('workouts') ? firestoreClient.getWorkoutPlans(user.userId) : [],
        cats.includes('workouts') ? firestoreClient.getWorkoutLogs(user.userId, 20) : [],
        cats.includes('nutrition') ? firestoreClient.getMealEntries(user.userId, undefined, undefined, undefined, undefined, 50) : [],
        cats.includes('goals') ? firestoreClient.getGoals(user.userId) : [],
      ]);

      const matchingHabits = habits
        .filter((h) => h.name.toLowerCase().includes(q) || h.category.toLowerCase().includes(q))
        .map((h) => ({ type: 'habit', id: h.id, title: h.name, category: h.category }));

      const matchingWorkouts: any[] = [];
      plans.forEach((p) => {
        if (p.workout_name.toLowerCase().includes(q) || p.muscle_group.toLowerCase().includes(q)) {
          matchingWorkouts.push({ type: 'workout_plan', id: p.id, title: p.workout_name, day: p.day_of_week });
        }
        p.exercises?.forEach((ex) => {
          if (ex.name.toLowerCase().includes(q)) {
            matchingWorkouts.push({ type: 'plan_exercise', name: ex.name, workout: p.workout_name });
          }
        });
      });

      logs.forEach((l) => {
        if (l.workout_name.toLowerCase().includes(q)) {
          matchingWorkouts.push({ type: 'logged_workout', id: l.id, date: l.date, title: l.workout_name });
        }
        l.exercise_logs?.forEach((ex) => {
          if (ex.exercise_name.toLowerCase().includes(q)) {
            matchingWorkouts.push({ type: 'logged_exercise', date: l.date, name: ex.exercise_name });
          }
        });
      });

      const matchingMeals = meals
        .filter((m) => m.food_name.toLowerCase().includes(q) || m.meal_type.toLowerCase().includes(q))
        .map((m) => ({ type: 'meal', id: m.id, date: m.date, name: m.food_name, calories: m.calories }));

      const matchingGoals = goals
        .filter((g) => g.title.toLowerCase().includes(q))
        .map((g) => ({ type: 'goal', id: g.id, title: g.title, status: g.status }));

      return {
        query: args.query,
        total_matches:
          matchingHabits.length + matchingWorkouts.length + matchingMeals.length + matchingGoals.length,
        results: {
          habits: matchingHabits,
          workouts: matchingWorkouts.slice(0, 15),
          meals: matchingMeals.slice(0, 15),
          goals: matchingGoals,
        },
      };
    },
  },
];
