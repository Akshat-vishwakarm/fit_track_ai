import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import type {
  Habit,
  WorkoutPlan,
  WorkoutLog,
  NutritionGoal,
  MealEntry,
  ProgressEntry,
  Goal,
  MLConfig,
  MLPredictionResult,
} from '../types';
import { habitService } from '../services/habitService';
import { workoutService } from '../services/workoutService';
import { nutritionService } from '../services/nutritionService';
import { progressService } from '../services/progressService';
import { goalService } from '../services/goalService';
import { mlService } from '../services/ml/mlService';
import { formatLocalDate } from '../utils/dateUtils';

interface DataContextType {
  loading: boolean;
  habits: Habit[];
  completionsMap: Record<string, Record<string, boolean>>;
  streak: { currentStreak: number; bestStreak: number };
  workoutPlans: WorkoutPlan[];
  workoutLogs: WorkoutLog[];
  nutritionGoal: NutritionGoal | null;
  todayMeals: MealEntry[];
  allMeals: MealEntry[];
  todayConsumed: { calories: number; protein: number; carbs: number; fats: number };
  progressEntries: ProgressEntry[];
  latestWeight: number | null;
  goals: Goal[];
  mlConfig: MLConfig | null;
  mlPrediction: MLPredictionResult | null;
  refreshData: () => Promise<void>;
  toggleHabit: (habitId: string, dateStr: string) => Promise<boolean>;
  clearAllCompletions: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completionsMap, setCompletionsMap] = useState<Record<string, Record<string, boolean>>>({});
  const [streak, setStreak] = useState<{ currentStreak: number; bestStreak: number }>({
    currentStreak: 0,
    bestStreak: 0,
  });
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [nutritionGoal, setNutritionGoal] = useState<NutritionGoal | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealEntry[]>([]);
  const [allMeals, setAllMeals] = useState<MealEntry[]>([]);
  const [todayConsumed, setTodayConsumed] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [mlConfig, setMlConfig] = useState<MLConfig | null>(null);
  const [mlPrediction, setMlPrediction] = useState<MLPredictionResult | null>(null);

  const refreshData = useCallback(async () => {
    if (!currentUser) {
      setHabits([]);
      setCompletionsMap({});
      setStreak({ currentStreak: 0, bestStreak: 0 });
      setWorkoutPlans([]);
      setWorkoutLogs([]);
      setNutritionGoal(null);
      setTodayMeals([]);
      setAllMeals([]);
      setTodayConsumed({ calories: 0, protein: 0, carbs: 0, fats: 0 });
      setProgressEntries([]);
      setLatestWeight(null);
      setGoals([]);
      setMlConfig(null);
      setMlPrediction(null);
      setLoading(false);
      return;
    }

    const userId = currentUser.id;
    const todayStr = formatLocalDate();

    // Auto-clean past completions once so all checkboxes start empty as requested
    const hasCleaned = localStorage.getItem('fittrack_completions_cleaned_v1');
    if (!hasCleaned) {
      localStorage.setItem('fittrack_completions_cleaned_v1', 'true');
      await habitService.clearAllCompletions(userId);
    }

    try {
      const [
        fetchedHabits,
        fetchedCompletionsMap,
        fetchedStreak,
        fetchedPlans,
        fetchedLogs,
        fetchedNutrGoal,
        dailyNutrSummary,
        fetchedAllMeals,
        fetchedProgress,
        fetchedWeight,
        fetchedGoals,
        fetchedMLConfig,
        fetchedMLPrediction,
      ] = await Promise.all([
        habitService.getHabits(userId),
        habitService.getCompletionsMap(userId),
        habitService.calculateStreak(userId),
        workoutService.getWorkoutPlans(userId),
        workoutService.getWorkoutLogs(userId),
        nutritionService.getNutritionGoal(userId),
        nutritionService.getDailySummary(userId, todayStr),
        nutritionService.getMealEntries(userId),
        progressService.getProgressEntries(userId),
        progressService.getLatestWeight(userId),
        goalService.getGoals(userId),
        mlService.getMLConfig(userId),
        mlService.getInsights(userId),
      ]);

      // Auto-split any habit with goal_target > 1 into separate numbered rows (e.g. "gym 1", "gym 2")
      let activeHabits = fetchedHabits;
      const multiHabits = fetchedHabits.filter((h) => h.goal_target > 1);
      if (multiHabits.length > 0) {
        for (const mh of multiHabits) {
          await habitService.deleteHabit(mh.id, userId);
          for (let i = 1; i <= mh.goal_target; i++) {
            await habitService.createHabit({
              user_id: userId,
              name: `${mh.name} ${i}`,
              icon: mh.icon,
              category: mh.category,
              frequency: mh.frequency,
              goal_target: 1,
              unit: mh.unit,
              color: mh.color,
              start_date: mh.start_date,
            });
          }
        }
        activeHabits = await habitService.getHabits(userId);
      }

      setHabits(activeHabits);
      setCompletionsMap(fetchedCompletionsMap);
      setStreak(fetchedStreak);
      setWorkoutPlans(fetchedPlans);
      setWorkoutLogs(fetchedLogs);
      setNutritionGoal(fetchedNutrGoal);
      setTodayMeals(dailyNutrSummary.entries);
      setAllMeals(fetchedAllMeals);
      setTodayConsumed(dailyNutrSummary.consumed);
      setProgressEntries(fetchedProgress);
      setLatestWeight(fetchedWeight);
      setGoals(fetchedGoals);
      setMlConfig(fetchedMLConfig);
      setMlPrediction(fetchedMLPrediction);
    } catch (err) {
      console.error('Error refreshing DataContext:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const toggleHabit = async (habitId: string, dateStr: string): Promise<boolean> => {
    if (!currentUser) return false;
    const newStatus = await habitService.toggleCompletion(currentUser.id, habitId, dateStr);
    await refreshData();
    return newStatus;
  };

  const clearAllCompletions = async (): Promise<void> => {
    if (!currentUser) return;
    await habitService.clearAllCompletions(currentUser.id);
    await refreshData();
  };

  return (
    <DataContext.Provider
      value={{
        loading,
        habits,
        completionsMap,
        streak,
        workoutPlans,
        workoutLogs,
        nutritionGoal,
        todayMeals,
        allMeals,
        todayConsumed,
        progressEntries,
        latestWeight,
        goals,
        mlConfig,
        mlPrediction,
        refreshData,
        toggleHabit,
        clearAllCompletions,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
