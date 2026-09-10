export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  created_at: string;
}

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
  date: string;
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
  day_of_week: number;
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

export interface NutritionAnalysisResult {
  mealType: MealType;
  originalDescription: string;
  amount?: number;
  unit?: string;
  foodItems: FoodItemAnalysis[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  estimationNote: string;
  isAmbiguous?: boolean;
  clarificationQuestion?: string;
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

export interface MLConfig {
  id: string;
  user_id: string;
  endpoint_url: string;
  provider: 'local' | 'python_fastapi' | 'rest_api' | 'custom';
  connected: boolean;
  api_key?: string;
  last_synced_at?: string;
}

export interface MLFeatureVector {
  timestamp: string;
  user_id: string;
  habits_summary: {
    total_active_habits: number;
    completion_rate_7d: number;
    completion_rate_21d: number;
    current_streak: number;
    best_streak: number;
  };
  workout_summary: {
    workouts_logged_7d: number;
    total_volume_kg_7d: number;
    avg_workout_duration_mins: number;
  };
  nutrition_summary: {
    avg_calories_7d: number;
    avg_protein_7d: number;
    avg_carbs_7d: number;
    avg_fats_7d: number;
    target_calorie_adherence_pct: number;
  };
  progress_summary: {
    latest_weight: number | null;
    weight_change_30d: number | null;
    logs_count: number;
  };
}

export interface MLPredictionResult {
  connected: boolean;
  status_message: string;
  insights: Array<{
    id: string;
    title: string;
    description: string;
    confidence: number;
    type: 'positive' | 'warning' | 'info';
  }>;
}
