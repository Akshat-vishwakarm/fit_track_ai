import { habitService } from '../habitService';
import { workoutService } from '../workoutService';
import { nutritionService } from '../nutritionService';
import { progressService } from '../progressService';
import type { MLFeatureVector } from '../../types';

export const predictionService = {
  async buildFeatureVector(userId: string): Promise<MLFeatureVector> {
    const activeHabits = await habitService.getActiveHabits(userId);
    const completionsMap = await habitService.getCompletionsMap(userId);
    const streaks = await habitService.calculateStreak(userId);
    
    // Calculate 7d and 21d habit completion rate
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let totalPossible7d = 0;
    let totalCompleted7d = 0;
    let totalPossible21d = 0;
    let totalCompleted21d = 0;

    for (let i = 0; i < 21; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);

      for (const h of activeHabits) {
        totalPossible21d++;
        if (i < 7) totalPossible7d++;

        if (completionsMap[h.id] && completionsMap[h.id][dateStr]) {
          totalCompleted21d++;
          if (i < 7) totalCompleted7d++;
        }
      }
    }

    const completionRate7d = totalPossible7d > 0 ? (totalCompleted7d / totalPossible7d) * 100 : 0;
    const completionRate21d = totalPossible21d > 0 ? (totalCompleted21d / totalPossible21d) * 100 : 0;

    // Workouts 7d
    const logs = await workoutService.getWorkoutLogs(userId);
    const date7DaysAgo = new Date(now);
    date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);
    const date7DaysAgoStr = formatDate(date7DaysAgo);

    const logs7d = logs.filter((l) => l.date >= date7DaysAgoStr);
    let totalVolume7d = 0;
    let totalDurationMins = 0;

    for (const l of logs7d) {
      totalDurationMins += l.duration_minutes || 0;
      for (const ex of l.exercise_logs || []) {
        for (const set of ex.sets || []) {
          if (set.completed) {
            totalVolume7d += (set.weight || 0) * (set.reps || 0);
          }
        }
      }
    }

    const avgDurationMins = logs7d.length > 0 ? totalDurationMins / logs7d.length : 0;

    // Nutrition 7d summary
    const allMeals = await nutritionService.getMealEntries(userId);
    const meals7d = allMeals.filter((m) => m.date >= date7DaysAgoStr);
    
    let totalCalories7d = 0;
    let totalProtein7d = 0;
    let totalCarbs7d = 0;
    let totalFats7d = 0;

    for (const m of meals7d) {
      totalCalories7d += m.calories || 0;
      totalProtein7d += m.protein || 0;
      totalCarbs7d += m.carbs || 0;
      totalFats7d += m.fats || 0;
    }

    const nutritionGoal = await nutritionService.getNutritionGoal(userId);
    const avgCalories7d = meals7d.length > 0 ? totalCalories7d / 7 : 0;
    const targetAdherence = nutritionGoal && nutritionGoal.calories > 0
      ? Math.min(100, Math.round((avgCalories7d / nutritionGoal.calories) * 100))
      : 0;

    // Weight progress
    const progressLogs = await progressService.getProgressEntries(userId);
    const latestWeight = await progressService.getLatestWeight(userId);

    let weightChange30d: number | null = null;
    if (progressLogs.length >= 2) {
      const firstWithWeight = progressLogs.find((p) => p.weight !== undefined && p.weight !== null);
      if (firstWithWeight && latestWeight !== null) {
        weightChange30d = Number((latestWeight - firstWithWeight.weight!).toFixed(1));
      }
    }

    return {
      timestamp: new Date().toISOString(),
      user_id: userId,
      habits_summary: {
        total_active_habits: activeHabits.length,
        completion_rate_7d: Number(completionRate7d.toFixed(1)),
        completion_rate_21d: Number(completionRate21d.toFixed(1)),
        current_streak: streaks.currentStreak,
        best_streak: streaks.bestStreak,
      },
      workout_summary: {
        workouts_logged_7d: logs7d.length,
        total_volume_kg_7d: totalVolume7d,
        avg_workout_duration_mins: Math.round(avgDurationMins),
      },
      nutrition_summary: {
        avg_calories_7d: Math.round(avgCalories7d),
        avg_protein_7d: Math.round(meals7d.length > 0 ? totalProtein7d / 7 : 0),
        avg_carbs_7d: Math.round(meals7d.length > 0 ? totalCarbs7d / 7 : 0),
        avg_fats_7d: Math.round(meals7d.length > 0 ? totalFats7d / 7 : 0),
        target_calorie_adherence_pct: targetAdherence,
      },
      progress_summary: {
        latest_weight: latestWeight,
        weight_change_30d: weightChange30d,
        logs_count: progressLogs.length,
      },
    };
  },
};
