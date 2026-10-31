export type HabitCategory = 'health' | 'fitness' | 'mindset' | 'nutrition' | 'productivity' | 'custom';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  category: HabitCategory;
  frequency: 'daily' | 'weekly';
  goal_target: number;
  unit: string;
  color: string;
  start_date: string;
  archived: boolean;
  created_at: string;
}

export interface HabitCompletion {
  id: string;
  user_id: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  target_muscle: string;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  notes?: string;
}

export interface WorkoutPlan {
  id: string;
  user_id: string;
  day_of_week: number; // 0 = Mon, ..., 6 = Sun or 1 = Mon, ..., 7 = Sun
  workout_name: string;
  muscle_group: string;
  exercises: WorkoutExercise[];
  created_at: string;
}

export interface CompletedSet {
  set_number: number;
  weight: number;
  reps: number;
  completed: boolean;
}

export interface LoggedExercise {
  exercise_id: string;
  exercise_name: string;
  target_muscle: string;
  sets: CompletedSet[];
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_plan_id?: string;
  workout_name: string;
  date: string;
  duration_minutes: number;
  exercise_logs: LoggedExercise[];
  created_at: string;
}

export interface NutritionGoal {
  id: string;
  user_id: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  updated_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export interface FoodItemAnalysis {
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  meal_type: MealType;
  food_name: string;
  amount?: number;
  unit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  food_items?: FoodItemAnalysis[];
  estimation_note?: string;
  created_at: string;
}

export interface ProgressEntry {
  id: string;
  user_id: string;
  date: string;
  weight?: number;
  body_fat?: number;
  waist?: number;
  chest?: number;
  arms?: number;
  notes?: string;
  created_at: string;
}

export type GoalCategory = 'habit' | 'workout' | 'nutrition' | 'weight' | 'custom';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: GoalCategory;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: string;
  deadline?: string;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
}

export interface WaterEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  amount_ml: number;
  created_at: string;
}

export interface WaterGoal {
  id: string;
  user_id: string;
  daily_target_ml: number;
  updated_at: string;
}

export interface UserContext {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  readOnly?: boolean;
  tokenRecord?: any;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: any; // Zod schema or JSON schema
  execute: (args: any, user: UserContext) => Promise<any>;
  category: 'dashboard' | 'habits' | 'nutrition' | 'workouts' | 'progress' | 'discovery';
  isWrite?: boolean;
}
