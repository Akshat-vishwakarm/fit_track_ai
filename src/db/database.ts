import Dexie, { type Table } from 'dexie';
import type {
  User,
  Habit,
  HabitCompletion,
  WorkoutPlan,
  WorkoutLog,
  NutritionGoal,
  MealEntry,
  ProgressEntry,
  Goal,
  MLConfig,
} from '../types';

export class FitTrackDatabase extends Dexie {
  users!: Table<User, string>;
  habits!: Table<Habit, string>;
  habitCompletions!: Table<HabitCompletion, string>;
  workoutPlans!: Table<WorkoutPlan, string>;
  workoutLogs!: Table<WorkoutLog, string>;
  nutritionGoals!: Table<NutritionGoal, string>;
  mealEntries!: Table<MealEntry, string>;
  progressEntries!: Table<ProgressEntry, string>;
  goals!: Table<Goal, string>;
  mlConfigs!: Table<MLConfig, string>;

  constructor() {
    super('FitTrackAIDB');
    
    // Schema definitions: Primary key, then indexed fields
    this.version(1).stores({
      users: 'id, email',
      habits: 'id, user_id, category, archived',
      habitCompletions: 'id, user_id, habit_id, date, [user_id+habit_id+date]',
      workoutPlans: 'id, user_id, day_of_week',
      workoutLogs: 'id, user_id, date',
      nutritionGoals: 'id, user_id',
      mealEntries: 'id, user_id, date, meal_type',
      progressEntries: 'id, user_id, date',
      goals: 'id, user_id, category, status',
      mlConfigs: 'id, user_id',
    });
  }
}

export const db = new FitTrackDatabase();
