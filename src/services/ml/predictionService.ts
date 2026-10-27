import { habitService } from '../habitService';
import { workoutService } from '../workoutService';
import { nutritionService } from '../nutritionService';
import { progressService } from '../progressService';
import { goalService } from '../goalService';
import { formatLocalDate } from '../../utils/dateUtils';
import type { MLFeatureVector, FullTelemetryContext } from '../../types';

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

  async buildFullTelemetry(
    userId: string,
    userProfile?: { name?: string; email?: string }
  ): Promise<FullTelemetryContext> {
    const today = new Date();
    const todayStr = formatLocalDate(today);

    // 1. Habits
    const activeHabits = await habitService.getActiveHabits(userId);
    const completionsMap = await habitService.getCompletionsMap(userId);
    const streakInfo = await habitService.calculateStreak(userId);

    const last7Days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7Days.push(formatLocalDate(d));
    }

    const last30Days: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last30Days.push(formatLocalDate(d));
    }

    const last14Days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last14Days.push(formatLocalDate(d));
    }

    let totalCompleted7d = 0;
    let totalCompleted30d = 0;

    const habitsList = activeHabits.map((h) => {
      const habitMap = completionsMap[h.id] || {};
      const todayStatus: 'completed' | 'pending' = habitMap[todayStr] ? 'completed' : 'pending';

      const completedIn7d = last7Days.filter((dateStr) => habitMap[dateStr]).length;
      const completedIn30d = last30Days.filter((dateStr) => habitMap[dateStr]).length;

      totalCompleted7d += completedIn7d;
      totalCompleted30d += completedIn30d;

      const recentDates = Object.keys(habitMap)
        .filter((d) => habitMap[d])
        .sort()
        .reverse()
        .slice(0, 10);

      return {
        id: h.id,
        name: h.name,
        category: h.category,
        daily_target: h.goal_target,
        unit: h.unit,
        today_status: todayStatus,
        completions_last_7d: completedIn7d,
        completion_rate_7d_pct: Math.round((completedIn7d / 7) * 100),
        completions_last_30d: completedIn30d,
        completion_rate_30d_pct: Math.round((completedIn30d / 30) * 100),
        recent_completed_dates: recentDates,
      };
    });

    const totalPossible7d = activeHabits.length * 7;
    const totalPossible30d = activeHabits.length * 30;

    const overallRate7d = totalPossible7d > 0 ? Number(((totalCompleted7d / totalPossible7d) * 100).toFixed(1)) : 0;
    const overallRate30d = totalPossible30d > 0 ? Number(((totalCompleted30d / totalPossible30d) * 100).toFixed(1)) : 0;

    const dailyTimeline14d = last14Days.map((dStr) => {
      const completed: string[] = [];
      const missed: string[] = [];

      for (const h of activeHabits) {
        if (completionsMap[h.id]?.[dStr]) {
          completed.push(h.name);
        } else {
          missed.push(h.name);
        }
      }

      const pct = activeHabits.length > 0 ? Math.round((completed.length / activeHabits.length) * 100) : 0;
      return {
        date: dStr,
        completed_habits: completed,
        missed_habits: missed,
        completion_pct: pct,
      };
    });

    // 2. Workout & Split
    const workoutPlans = await workoutService.getWorkoutPlans(userId);
    const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const weeklyTrainingSplit = [1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
      const plan = workoutPlans.find((p) => p.day_of_week === dayNum);
      const dayName = DAY_NAMES[dayNum - 1];

      if (plan && plan.exercises && plan.exercises.length > 0) {
        return {
          day_of_week: dayNum,
          day_name: dayName,
          workout_name: plan.workout_name,
          muscle_group: plan.muscle_group,
          is_rest_day: false,
          exercises: plan.exercises.map((ex) => ({
            name: ex.name,
            target_muscle: ex.target_muscle,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
            target_weight_kg: ex.target_weight,
            notes: ex.notes,
          })),
        };
      }

      return {
        day_of_week: dayNum,
        day_name: dayName,
        workout_name: plan?.workout_name || 'Rest & Recovery',
        muscle_group: plan?.muscle_group || 'Rest',
        is_rest_day: !plan || plan.exercises.length === 0,
        exercises: plan?.exercises?.map((ex) => ({
          name: ex.name,
          target_muscle: ex.target_muscle,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
          target_weight_kg: ex.target_weight,
          notes: ex.notes,
        })) || [],
      };
    });

    const workoutLogs = await workoutService.getWorkoutLogs(userId);
    const date7DaysAgoStr = last7Days[last7Days.length - 1];
    const logs7d = workoutLogs.filter((l) => l.date >= date7DaysAgoStr);

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

    const recentWorkoutSessions = workoutLogs.slice(0, 10).map((l) => {
      let sessionVolume = 0;
      const exercisesPerformed = (l.exercise_logs || []).map((ex) => {
        const completedSets = (ex.sets || []).map((s) => {
          if (s.completed) {
            sessionVolume += (s.weight || 0) * (s.reps || 0);
          }
          return {
            set_number: s.set_number,
            weight_kg: s.weight,
            reps: s.reps,
            completed: s.completed,
          };
        });
        return {
          exercise_name: ex.exercise_name,
          target_muscle: ex.target_muscle,
          completed_sets: completedSets,
        };
      });

      return {
        id: l.id,
        date: l.date,
        workout_name: l.workout_name,
        duration_minutes: l.duration_minutes,
        total_volume_kg: sessionVolume,
        exercises_performed: exercisesPerformed,
      };
    });

    // 3. Nutrition
    const nutritionGoal = await nutritionService.getNutritionGoal(userId);
    const allMeals = await nutritionService.getMealEntries(userId);

    const todayMeals = allMeals.filter((m) => m.date === todayStr);
    let todayCalories = 0;
    let todayProtein = 0;
    let todayCarbs = 0;
    let todayFats = 0;

    for (const m of todayMeals) {
      todayCalories += m.calories || 0;
      todayProtein += m.protein || 0;
      todayCarbs += m.carbs || 0;
      todayFats += m.fats || 0;
    }

    const calorieAdherence = nutritionGoal && nutritionGoal.calories > 0
      ? Math.min(100, Math.round((todayCalories / nutritionGoal.calories) * 100))
      : 0;
    const proteinAdherence = nutritionGoal && nutritionGoal.protein > 0
      ? Math.min(100, Math.round((todayProtein / nutritionGoal.protein) * 100))
      : 0;

    const meals7d = allMeals.filter((m) => m.date >= date7DaysAgoStr);
    let totalCals7d = 0;
    let totalProt7d = 0;
    let totalCarbs7d = 0;
    let totalFats7d = 0;

    for (const m of meals7d) {
      totalCals7d += m.calories || 0;
      totalProt7d += m.protein || 0;
      totalCarbs7d += m.carbs || 0;
      totalFats7d += m.fats || 0;
    }

    const recentMealsHistory = allMeals
      .slice()
      .sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')))
      .slice(0, 15)
      .map((m) => ({
        date: m.date,
        time: m.time,
        meal_type: m.meal_type,
        food_name: m.food_name,
        calories: m.calories,
        protein_g: m.protein,
        carbs_g: m.carbs,
        fats_g: m.fats,
      }));

    // 4. Progress and Goals
    const progressLogs = await progressService.getProgressEntries(userId);
    const latestWeight = await progressService.getLatestWeight(userId);

    let weightChange30d: number | null = null;
    if (progressLogs.length >= 2) {
      const firstWithWeight = progressLogs.find((p) => p.weight !== undefined && p.weight !== null);
      if (firstWithWeight && latestWeight !== null) {
        weightChange30d = Number((latestWeight - firstWithWeight.weight!).toFixed(1));
      }
    }

    const latestEntry = progressLogs.length > 0 ? progressLogs[progressLogs.length - 1] : null;
    const latestMeasurements = latestEntry
      ? {
          waist: latestEntry.waist,
          chest: latestEntry.chest,
          arms: latestEntry.arms,
          body_fat: latestEntry.body_fat,
        }
      : null;

    const goals = await goalService.getGoals(userId);
    const activeGoals = goals.map((g) => ({
      id: g.id,
      title: g.title,
      category: g.category,
      target_value: g.target_value,
      current_value: g.current_value,
      unit: g.unit,
      progress_pct: g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0,
      deadline: g.deadline,
      status: g.status,
    }));

    return {
      _instruction_for_llm:
        "This is real-time live telemetry data exported directly from the user's FitTrack AI web application. It includes their daily habits with completion tracking, full weekly gym workout training split with exercises/sets/reps, nutrition macros and meal logs, weight history, and active fitness goals. Act as their elite AI Sports Scientist, Personal Trainer, and Sports Nutritionist to evaluate their routine and give precise, actionable advice.",
      metadata: {
        platform: 'FitTrack AI',
        version: '2.0.0-live',
        exported_at: new Date().toISOString(),
        current_local_date: todayStr,
        user_id: userId,
        user_name: userProfile?.name,
        user_email: userProfile?.email,
      },
      habits: {
        active_habits_count: activeHabits.length,
        current_streak_days: streakInfo.currentStreak,
        best_streak_days: streakInfo.bestStreak,
        overall_completion_rate_7d_pct: overallRate7d,
        overall_completion_rate_30d_pct: overallRate30d,
        habits_list: habitsList,
        daily_timeline_last_14d: dailyTimeline14d,
      },
      gym_and_workout: {
        weekly_training_split: weeklyTrainingSplit,
        metrics_7d: {
          workouts_logged_7d: logs7d.length,
          total_volume_kg_7d: totalVolume7d,
          avg_workout_duration_mins: logs7d.length > 0 ? Math.round(totalDurationMins / logs7d.length) : 0,
        },
        recent_workout_sessions: recentWorkoutSessions,
      },
      nutrition: {
        daily_targets: nutritionGoal
          ? {
              calories: nutritionGoal.calories,
              protein_g: nutritionGoal.protein,
              carbs_g: nutritionGoal.carbs,
              fats_g: nutritionGoal.fats,
            }
          : null,
        today_summary: {
          date: todayStr,
          total_calories: todayCalories,
          total_protein_g: todayProtein,
          total_carbs_g: todayCarbs,
          total_fats_g: todayFats,
          calorie_adherence_pct: calorieAdherence,
          protein_adherence_pct: proteinAdherence,
          logged_meals_count: todayMeals.length,
          logged_meals: todayMeals.map((m) => ({
            id: m.id,
            time: m.time,
            meal_type: m.meal_type,
            food_name: m.food_name,
            amount: m.amount,
            unit: m.unit,
            calories: m.calories,
            protein_g: m.protein,
            carbs_g: m.carbs,
            fats_g: m.fats,
            food_items: m.food_items,
            estimation_note: m.estimation_note,
          })),
        },
        weekly_averages_7d: {
          avg_daily_calories: Math.round(totalCals7d / 7),
          avg_daily_protein_g: Math.round(totalProt7d / 7),
          avg_daily_carbs_g: Math.round(totalCarbs7d / 7),
          avg_daily_fats_g: Math.round(totalFats7d / 7),
          total_meals_logged_7d: meals7d.length,
        },
        recent_meal_history: recentMealsHistory,
      },
      body_progress_and_goals: {
        latest_weight_kg: latestWeight,
        weight_change_30d_kg: weightChange30d,
        weight_history: progressLogs.slice(-10).map((p) => ({
          date: p.date,
          weight_kg: p.weight,
          body_fat_pct: p.body_fat,
        })),
        latest_measurements: latestMeasurements,
        active_goals: activeGoals,
      },
    };
  },

  buildLLMPrompt(telemetry: FullTelemetryContext): string {
    return `# 🏋️ FitTrack AI Live Profile & Telemetry Analysis Prompt

Act as my Elite Personal Trainer, Sports Scientist, and Certified Sports Nutritionist.
Below is my real-time, verified live fitness telemetry exported directly from my FitTrack AI dashboard. It contains all my active habits, daily completions, weekly workout split (with exercises, sets, reps, and weights), nutrition and meal logs, weight metrics, and active goals.

---

## 📊 Live Fitness Data:
\`\`\`json
${JSON.stringify(telemetry, null, 2)}
\`\`\`

---

## 🎯 My Request & Coaching Analysis:
Based strictly on my live data above, please provide a comprehensive breakdown:
1. **Weekly Training Split & Gym Routine Audit**:
   - Critique my weekly split distribution, exercise choices, target volume (sets x reps), and rest days.
   - Are there any muscle imbalances or neglected movement patterns?
   - What progressive overload adjustments should I make next?
2. **Habit Consistency & Discipline Audit**:
   - Analyze my completion rates (7d & 30d) and current streaks.
   - Highlight the habits I am most consistent with, and the specific ones where adherence drops.
3. **Nutrition & Macro Adherence Assessment**:
   - Evaluate today's logged meals and my 7-day daily averages against my targets (calories, protein, carbs, fats).
   - Assess my meal timing, protein distribution, and caloric surplus/deficit alignment with my goals.
4. **Actionable 7-Day Game Plan**:
   - Give me 3 concrete, high-priority action steps to implement over the next 7 days to maximize progress.
`;
  },
};

